-- ===========================================================================
-- Sabores por tamanho (modelo "Yooga") — substitui o meio a meio
--
-- O modelo antigo (migration 0009) tratava cada SABOR como um produto e o
-- "meio a meio" como uma segunda linha na mesma seção, disparada por
-- `option_values.halves_count` num grupo "Quantidade de Sabores". Funcionava,
-- mas obrigava o lojista a configurar um número mágico ("Metades que exige")
-- em cada opção e partia de um sabor fixo em vez do tamanho — confuso tanto no
-- painel quanto na vitrine.
--
-- O modelo novo inverte o fluxo, como nas pizzarias de delivery:
--
--   • O PRODUTO é o tamanho/formato: "PIZZA GRANDE — 3 sabores",
--     "PIZZA MÉDIA — 2 sabores", "PIZZA DE METRO — 4 sabores".
--   • Os SABORES são um grupo de opções comum vinculado ao produto, com
--     `min_select = 1` e `max_select = N` (o N daquele tamanho).
--   • O preço da pizza é o do SABOR MAIS CARO entre os escolhidos, mais os
--     acréscimos dos outros grupos (borda, extras). É a regra clássica do
--     mercado: "meio a meio Margherita + Quatro Queijos" cobra o Quatro
--     Queijos, não a soma.
--
-- Para isso o grupo de sabores precisa de duas coisas que um grupo de acréscimo
-- não tem:
--
--   1. `is_flavor_group`: marca o grupo como "sabores". A precificação
--      (`src/lib/pricing.ts`) e o `placeOrder` tratam os valores desse grupo
--      como PREÇO CHEIO (não delta) e combinam pelo MAX (não pela soma).
--   2. Como o preço de cada sabor varia por tamanho, cada produto de tamanho
--      vincula o SEU grupo de sabores ("Sabores • Grande", "Sabores • Média"…),
--      e o `price_delta_cents` do valor guarda o preço cheio daquele sabor
--      naquele tamanho. O nome da coluna é histórico; o sentido, para valores
--      de grupo de sabor, é "preço do sabor".
--
-- Saem do banco: `option_values.halves_count` (o gatilho do meio a meio) e a
-- tabela `order_item_halves` (o snapshot das metades). No modelo novo os
-- sabores escolhidos são opções comuns e já cabem em `order_item_options`.
-- A produção nunca usou meio a meio (todos os `halves_count = 0`), então não
-- há histórico a preservar.
-- ===========================================================================

-- ---------- 1. grupo de sabores ----------

alter table public.option_groups
  add column is_flavor_group boolean not null default false;

comment on column public.option_groups.is_flavor_group is
  'True no grupo "Sabores": os valores têm preço cheio e a pizza cobra o mais caro entre os escolhidos. False nos grupos de acréscimo (tamanho, borda, extras), somados normalmente.';

-- ---------- 2. fim do meio a meio ----------

-- `halves_count` tinha check inline (between 0 and 3); drop column leva o
-- constraint junto. Sem ele, nenhum valor de opção dispara seletor de metades.
alter table public.option_values
  drop column if exists halves_count;

-- Snapshot das metades. `order_items` cascade já cuidava dos filhos; drop
-- direto é seguro porque a gravação era server-side e a produção não a usou.
drop table if exists public.order_item_halves;

-- ===========================================================================
-- 3. RPC: devolve `is_flavor_group` no grupo e não devolve mais `halves_count`
--    nos valores. `create or replace` mantém a assinatura — quem chama
--    `get_business_menu` (página pública, vitrine, `placeOrder`) não muda a
--    chamada, só passa a receber o campo novo no grupo.
-- ===========================================================================

create or replace function public.get_business_menu(p_business_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'business', (
      select jsonb_build_object(
        'id', b.id, 'name', b.name, 'slug', b.slug, 'custom_slug', b.custom_slug,
        'description', b.description, 'logo_url', b.logo_url, 'cover_url', b.cover_url,
        'whatsapp', b.whatsapp, 'phone', b.phone, 'address', b.address,
        'neighborhood', b.neighborhood, 'opening_hours', b.opening_hours,
        'fulfillment', b.fulfillment, 'payment_methods', b.payment_methods,
        'pix_key', b.pix_key, 'delivery_fee_cents', b.delivery_fee_cents,
        'min_order_cents', b.min_order_cents
      )
      from public.businesses b
      where b.id = p_business_id and b.status = 'active'
    ),
    'menu_categories', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', mc.id, 'name', mc.name, 'slug', mc.slug,
          'description', mc.description, 'image_url', mc.image_url,
          'item_count', (select count(*) from public.products p2
                          where p2.menu_category_id = mc.id and p2.is_available)
        ) order by mc.sort_order, mc.name
      ), '[]'::jsonb)
      from public.menu_categories mc
      where mc.business_id = p_business_id and mc.is_active
    ),
    'items', (
      -- O cast para int é obrigatório: `->>` devolve text, e ordenar text
      -- colocaria o sort_order 10 antes do 2 a partir do 10º item. A coluna
      -- é NOT NULL, então o cast nunca estoura.
      select coalesce(jsonb_agg(item order by (item ->> 'sort_order')::int, item ->> 'name'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', p.id, 'name', p.name, 'description', p.description,
          'price_cents', p.price_cents, 'compare_at_cents', p.compare_at_cents,
          'image_url', p.image_url, 'is_featured', p.is_featured,
          'menu_category_id', mc.id, 'menu_category_slug', mc.slug,
          'menu_category_name', mc.name, 'sort_order', p.sort_order,
          'option_groups', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', g.id, 'name', g.name,
                'min_select', g.min_select, 'max_select', g.max_select,
                'is_required', g.is_required,
                'is_flavor_group', g.is_flavor_group,
                'values', (
                  select coalesce(jsonb_agg(
                    jsonb_build_object(
                      'id', v.id, 'name', v.name,
                      'price_delta_cents', v.price_delta_cents
                    ) order by v.sort_order, v.name
                  ), '[]'::jsonb)
                  from public.option_values v
                  where v.option_group_id = g.id and v.is_available
                )
              ) order by g.sort_order, g.name
            ), '[]'::jsonb)
            from public.option_groups g
            where g.business_id = p_business_id
              -- Só entra o grupo que o próprio produto elenca (regra da 0005,
              -- endurecida na 0007): produto sem nenhuma linha em
              -- product_option_groups não herda grupo nenhum.
              and exists (
                select 1 from public.product_option_groups pog
                where pog.product_id = p.id and pog.option_group_id = g.id
              )
          )
        ) as item
        from public.products p
        left join public.menu_categories mc on mc.id = p.menu_category_id
        where p.business_id = p_business_id
          and p.is_available
          and (mc.id is null or mc.is_active)
      ) s
    )
  )
  where exists (select 1 from public.businesses b where b.id = p_business_id and b.status = 'active');
$$;
