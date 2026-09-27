-- ============================================================
-- Busca real — substitui o JSON de 53 registros embutido no HTML
-- e o filtro client-side por substring do `ta2-search`
-- ============================================================

-- unaccent não é IMMUTABLE por padrão; wrapper é o padrão para indexar
create or replace function public.immutable_unaccent(text)
returns text language sql immutable parallel safe as $$
  select public.unaccent('public.unaccent'::regdictionary, $1)
$$;

alter table public.businesses
  add column search_text text not null default '';

-- Recalcula search_text de uma empresa. Chamado por trigger em
-- businesses e em business_categories (não é trigger: NEW/Old em DELETE).
create or replace function public.refresh_business_search(p_business_id bigint)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  slug_text text;
begin
  select string_agg(c.slug, ' ')
    into slug_text
    from public.business_categories bc
    join public.categories c on c.id = bc.category_id
   where bc.business_id = p_business_id;

  update public.businesses b
     set search_text = public.immutable_unaccent(
           lower(
             coalesce(b.name, '') || ' ' ||
             coalesce(b.description, '') || ' ' ||
             coalesce(b.neighborhood, '') || ' ' ||
             coalesce(slug_text, '')
           )
         )
   where b.id = p_business_id;
end;
$$;

-- BEFORE: escreve search_text no próprio tuple.
-- (não AFTER porque em AFTER o UPDATE em cascata dispararia novo trigger)
create or replace function public.set_business_search_text()
returns trigger language plpgsql as $$
declare
  slug_text text;
begin
  select string_agg(c.slug, ' ')
    into slug_text
    from public.business_categories bc
    join public.categories c on c.id = bc.category_id
   where bc.business_id = new.id;

  new.search_text := public.immutable_unaccent(
    lower(
      coalesce(new.name, '') || ' ' ||
      coalesce(new.description, '') || ' ' ||
      coalesce(new.neighborhood, '') || ' ' ||
      coalesce(slug_text, '')
    )
  );

  return new;
end;
$$;

create trigger businesses_search_text_biu
  before insert or update of name, description, neighborhood on public.businesses
  for each row execute function public.set_business_search_text();

-- AFTER: mudança de categoria reindexa a empresa
create or replace function public.business_categories_search_sync()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_business_search(old.business_id);
  else
    perform public.refresh_business_search(new.business_id);
  end if;
  return null;
end;
$$;

create trigger business_categories_search
  after insert or update or delete on public.business_categories
  for each row execute function public.business_categories_search_sync();

-- popular as existentes
do $$
declare r record;
begin
  for r in select id from public.businesses loop
    perform public.refresh_business_search(r.id);
  end loop;
end;
$$;

create index businesses_search_text_trgm_idx
  on public.businesses using gin (search_text gin_trgm_ops);

-- busca full-text em português
alter table public.businesses
  add column search_tsvector tsvector
  generated always as (to_tsvector('portuguese', search_text)) stored;

create index businesses_search_tsvector_idx
  on public.businesses using gin (search_tsvector);

-- public search function: < 2 caracteres não busca (igual ao endpoint atual)
create or replace function public.search_businesses(
  p_query text,
  p_city_id bigint default null,
  p_group_slug text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id bigint,
  name text,
  slug text,
  custom_slug text,
  description text,
  logo_url text,
  city_slug text,
  groups text[],
  has_menu boolean,
  rank real
)
language sql stable
security invoker
set search_path = public
as $$
  with q as (
    select public.immutable_unaccent(lower(trim(coalesce(p_query, '')))) as term
  )
  select
    b.id,
    b.name,
    b.slug,
    b.custom_slug,
    b.description,
    b.logo_url,
    c.slug,
    coalesce(
      array(
        select distinct g.slug
        from public.business_categories bc
        join public.categories cat on cat.id = bc.category_id
        join public.groups g on g.id = cat.group_id
        where bc.business_id = b.id
        order by g.slug
      ),
      '{}'
    ),
    exists (
      select 1 from public.products p
      where p.business_id = b.id and p.is_available
    ),
    -- ranking: nome começa com o termo > nome contém > full-text > trigram
    greatest(
      case when lower(b.name) like q.term || '%' then 1.0 else 0 end,
      case when lower(b.name) like '%' || q.term || '%' then 0.8 else 0 end,
      ts_rank(b.search_tsvector, websearch_to_tsquery('portuguese', q.term)),
      similarity(b.search_text, q.term) * 0.6
    ) as rank
  from public.businesses b
  join public.cities c on c.id = b.city_id
  cross join q
  where b.status = 'active'
    and c.is_active
    and char_length(q.term) >= 2
    and (p_city_id is null or b.city_id = p_city_id)
    and (
      p_group_slug is null
      or exists (
        select 1
        from public.business_categories bc
        join public.categories cat on cat.id = bc.category_id
        join public.groups g on g.id = cat.group_id
        where bc.business_id = b.id and g.slug = p_group_slug
      )
    )
    and (
      b.search_tsvector @@ websearch_to_tsquery('portuguese', q.term)
      or b.search_text like '%' || q.term || '%'
    )
  order by rank desc, b.name asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

-- listagem da seção "Descubra empresas" com filtro multi-grupo
create or replace function public.list_businesses(
  p_city_id bigint,
  p_group_slugs text[] default null,
  p_limit integer default null,
  p_offset integer default 0
)
returns table (
  id bigint,
  name text,
  slug text,
  custom_slug text,
  description text,
  logo_url text,
  groups text[]
)
language sql stable
security invoker
set search_path = public
as $$
  select
    b.id, b.name, b.slug, b.custom_slug, b.description, b.logo_url,
    coalesce(
      array(
        select distinct g.slug
        from public.business_categories bc
        join public.categories cat on cat.id = bc.category_id
        join public.groups g on g.id = cat.group_id
        where bc.business_id = b.id
        order by g.slug
      ),
      '{}'
    )
  from public.businesses b
  where b.status = 'active'
    and b.city_id = p_city_id
    and (
      p_group_slugs is null
      or cardinality(p_group_slugs) = 0
      or exists (
        select 1
        from public.business_categories bc
        join public.categories cat on cat.id = bc.category_id
        join public.groups g on g.id = cat.group_id
        where bc.business_id = b.id and g.slug = any(p_group_slugs)
      )
    )
  order by b.is_featured desc, b.name asc
  limit case when p_limit is null then null else greatest(p_limit, 1) end
  offset greatest(p_offset, 0);
$$;

-- cardápio de uma empresa, com categorias e grupos de opção
create or replace function public.get_business_menu(p_business_id bigint)
returns jsonb
language sql stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'business', (
      select jsonb_build_object(
        'id', b.id, 'name', b.name, 'slug', b.slug, 'custom_slug', b.custom_slug,
        'description', b.description, 'logo_url', b.logo_url, 'cover_url', b.cover_url,
        'whatsapp', b.whatsapp, 'phone', b.phone, 'address', b.address,
        'opening_hours', b.opening_hours, 'fulfillment', b.fulfillment,
        'payment_methods', b.payment_methods, 'pix_key', b.pix_key,
        'delivery_fee_cents', b.delivery_fee_cents, 'min_order_cents', b.min_order_cents
      )
      from public.businesses b where b.id = p_business_id and b.status = 'active'
    ),
    'menu_categories', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', mc.id, 'name', mc.name, 'slug', mc.slug,
          'item_count', (select count(*) from public.products p2
                          where p2.menu_category_id = mc.id and p2.is_available)
        ) order by mc.sort_order
      ), '[]'::jsonb)
      from public.menu_categories mc
      where mc.business_id = p_business_id
    ),
    'items', (
      select coalesce(jsonb_agg(item order by item ->> 'sort_order'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', p.id, 'name', p.name, 'description', p.description,
          'price_cents', p.price_cents, 'image_url', p.image_url,
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
                    ) order by v.sort_order
                  ), '[]'::jsonb)
                  from public.option_values v
                  where v.option_group_id = g.id and v.is_available
                )
              ) order by g.sort_order
            ), '[]'::jsonb)
            from public.option_groups g
            where g.business_id = p_business_id
          )
        ) as item
        from public.products p
        left join public.menu_categories mc on mc.id = p.menu_category_id
        where p.business_id = p_business_id and p.is_available
      ) s
    )
  )
  where exists (select 1 from public.businesses b where b.id = p_business_id and b.status = 'active');
$$;
