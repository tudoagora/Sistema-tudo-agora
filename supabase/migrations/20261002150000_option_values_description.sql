-- ===========================================================================
-- Descrição do valor de opção ("o que vem nesse item").
--
-- Mesmo caminho da foto (migration `20261002142250`): a coluna nova não basta,
-- porque `get_business_menu` monta o JSON do cardápio na mão. Sem o
-- `create or replace` abaixo o admin digita a descrição, ela aparece no editor
-- (que lê a tabela direto) e o cliente nunca vê — mesma opção, dois cardápios.
--
-- A assinatura `get_business_menu(bigint)` fica igual: quem chama (página
-- pública, vitrine, `placeOrder`) não muda a chamada, só passa a receber um
-- campo novo dentro de cada valor de opção.
-- ===========================================================================

alter table public.option_values
  add column if not exists description text;

comment on column public.option_values.description is
  'Texto do que o cliente recebe ao escolher este valor (sabor, borda, extra). Aparece abaixo do nome na vitrine.';

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
                      'price_delta_cents', v.price_delta_cents,
                      'image_url', v.image_url,
                      'description', v.description
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