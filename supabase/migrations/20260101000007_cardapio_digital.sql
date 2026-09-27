-- ============================================================================
-- Cardápio digital: promoção, destaque, categorias completas e fotos
--
-- O schema de 0001 já tinha `menu_categories` + `products` por empresa, mas
-- faltava o que um cardápio de delivery realmente mostra: o preço "de" riscado
-- ao lado do preço "por", o selo de destaque, e categorias que podem ser
-- ocultadas inteiras (temporada esgotada) sem apagar nada.
--
-- Junto vem o bucket de Storage, porque até aqui toda imagem era uma URL
-- colada à mão. O bucket é público na leitura e restrito na escrita ao
-- prefixo "cardapio/<business_id>/" de quem de fato gerencia aquela empresa.
-- O upload da UI passa por Server Action (valida sessão, vínculo e MIME), mas
-- a policy existe porque o limite de 5 MB e a lista de MIME já são aplicados
-- pelo bucket: mesmo escrevendo direto com a chave do lojista, ele não escapa
-- da própria empresa. Com a chave anônima (que está no bundle do navegador)
-- ninguém escreve nada — `manages_business` só é verdade para sessão logada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Produto: preço promocional e destaque
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists compare_at_cents bigint not null default 0
    constraint products_compare_at_non_negative check (compare_at_cents >= 0),
  add column if not exists is_featured boolean not null default false;

comment on column public.products.compare_at_cents is
  'Preço "de" (riscado). Só aparece na vitrine se for maior que price_cents. Zero = sem promoção.';
comment on column public.products.is_featured is
  'Aparece no bloco "Destaques" da página pública do cardápio.';

create index if not exists products_featured_idx
  on public.products (business_id, sort_order)
  where is_featured and is_available;

-- ---------------------------------------------------------------------------
-- Seção do cardápio: descrição, imagem e liga/desliga
-- ---------------------------------------------------------------------------

alter table public.menu_categories
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists is_active boolean not null default true;

comment on column public.menu_categories.is_active is
  'Seção desativada some da página pública sem apagar os itens.';

-- ===========================================================================
-- Storage: bucket público de imagens do cardápio
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cardapio',
  'cardapio',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública: o bucket é público, mas o PostgREST ainda consulta o RLS de
-- `storage.objects` quando o objeto é pedido por uma sessão (mesmo anônima).
create policy cardapio_public_read on storage.objects
  for select using (bucket_id = 'cardapio');

-- ---------------------------------------------------------------------------
-- Gravação: via Server Action (service role) ou admin, com o caminho no
-- formato "cardapio/<business_id>/<arquivo>". A business_id precisa ser
-- numérica, senão o cast estoura — daí o regex antes do cast.
-- ---------------------------------------------------------------------------

create or replace function public.manages_storage_path(p_bucket text, p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
begin
  if p_bucket <> 'cardapio' then
    return false;
  end if;

  v_parts := string_to_array(p_name, '/');
  if array_length(v_parts, 1) is null or v_parts[1] !~ '^[0-9]+$' then
    return false;
  end if;

  return public.manages_business(v_parts[1]::bigint);
end;
$$;

revoke all on function public.manages_storage_path(text, text) from public;
grant execute on function public.manages_storage_path(text, text) to authenticated;

create policy cardapio_manage on storage.objects
  for all to authenticated
  using (public.manages_storage_path(bucket_id, name))
  with check (public.manages_storage_path(bucket_id, name));

-- ===========================================================================
-- `get_business_menu` v3
--
-- Além das colunas novas, agora respeita `menu_categories.is_active`: uma
-- seção desativada não aparece nem no menu lateral. Os itens dela também
-- somem da listagem, senão apareceriam num "Outros" fantasma no fim da página.
-- ===========================================================================

-- Backfill antes de trocar a regra de opcoes (explicado na funcao, mais abaixo).
-- A 0005 dizia "produto sem elenco herda todos os grupos da empresa". Quem
-- dependia disso tem as linhas gravadas aqui, senao a nova regra deixaria esses
-- produtos sem nenhuma opcao.
insert into public.product_option_groups (product_id, option_group_id)
select p.id, g.id
from public.products p
join public.option_groups g on g.business_id = p.business_id
where not exists (
  select 1 from public.product_option_groups pog where pog.product_id = p.id
)
on conflict do nothing;

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
                'values', (
                  select coalesce(jsonb_agg(
                    jsonb_build_object(
                      'id', v.id, 'name', v.name, 'price_delta_cents', v.price_delta_cents
                    ) order by v.sort_order, v.name
                  ), '[]'::jsonb)
                  from public.option_values v
                  where v.option_group_id = g.id and v.is_available
                )
              ) order by g.sort_order, g.name
            ), '[]'::jsonb)
            from public.option_groups g
            where g.business_id = p_business_id
              -- Só entra o grupo que o próprio produto elt.
              --
              -- Antes (0005) valia o inverso: produto sem nenhuma linha em
              -- product_option_groups herdava TODOS os grupos da empresa. Isso
              -- não tem como desligar -- uma Coca-Cola de 6 reais acabava
              -- exigindo "Tamanho: Grande" e "Molho: Pesto", porque não havia
              -- como dizer "este item não tem opção". O elenco virou
              -- obrigatório e o backfill acima grava o que a heranca entregava.
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

-- ===========================================================================
-- Pedido
--
-- Nenhuma policy de INSERT é criada de propósito, e nenhuma nova policy de
-- SELECT também: `orders_business_read` (0003) já devolve os pedidos de quem
-- gerencia a empresa.
--
-- O pedido chega por Server Action com service role, que recalcula preço,
-- disponibilidade, grupos de opção e taxa a partir do banco. Aceitar o total
-- que vem do navegador seria dar o desconto de graça.
-- ===========================================================================
