-- ============================================================================
-- Categorias e subcategorias na MESMA tabela, com `parent_id`
--
-- Antes: `groups` (as 9 pílulas da home) apontava para `categories`, que eram
-- as subcategorias. Duas tabelas para uma hierarquia de dois níveis.
--
-- Isso não sustenta um painel de arrasto. Mover um item de nível não é um UPDATE de
-- FK, é uma migração de linha entre duas tabelas — e na direção
-- subcategoria -> categoria principal ela apagaria os vínculos das empresas em
-- `business_categories`, que só apontam para `categories`. Ou seja: a operação
-- de arrastar justamente destruiria dados.
--
-- Com `parent_id`, subir e descer um nível é um UPDATE, o arrasto vira uma
-- reordenação de lista, e `business_categories` continua apontando para os
-- mesmos ids: nenhuma empresa perde a categoria. Também resolve a colisão de
-- slug que existia entre as duas tabelas (`groups.slug` e `categories.slug` eram
-- uniques independentes, e o seed tinha 'servicos' nas duas) — em
-- `/cidades/[cidade]/g/[grupo]`, o grupo sempre vencia e a categoria de mesmo
-- slug ficava inalcançável.
--
-- Nível: raiz (parent_id is null) = categoria principal; filho = subcategoria.
-- Hierarquia de no máximo 2 níveis, como antes.
-- ============================================================================

alter table public.categories
  add column if not exists parent_id bigint references public.categories(id) on delete restrict,
  add column if not exists image_url text;

create index if not exists categories_parent_idx on public.categories (parent_id);

-- A assinatura muda (entra `p_category_slugs`), então a função antiga precisa
-- sair antes: `create or replace` com argumentos diferentes criaria uma segunda
-- overload e o PostgREST não saberia qual chamar. Dropped aqui, e não na seção
-- que redefine a função, para que nenhuma janela exista entre o `drop table
-- groups` e a queda da função que ainda o referencia no corpo.
drop function if exists public.list_businesses(bigint, text[], integer, integer);

-- ---------------------------------------------------------------------------
-- Fusão dos dados
--
-- Roda uma vez só: o marcador é a própria existência de `public.groups`, que
-- é dropada no fim. Reaplicar o arquivo não faz nada.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.groups') is null then
    raise notice 'categorias já unificadas — pulando a fusão dos dados';
    return;
  end if;

  -- Mapa grupo -> categoria existente, por slug. Precisa existir ANTES do passo
  -- 2 renomear slugs em colisão.
  create temporary table legacy_groups on commit drop as
    select g.id as group_id, g.slug as group_slug
      from public.groups g;

  -- 2. Colisão de slug: o grupo vence. `/cidades/<cidade>/g/<slug>` é URL
  --    pública (o banner da home e a grade de categorias apontam para ela) e o
  --    grupo é a raiz da hierarquia. O filho homônimo é justamente o que
  --    nunca pôde ser acessado, então renomeá-lo não quebra nada que existisse.
  --    O sufixo é o id, que é único por construção.
  update public.categories c
     set slug = c.slug || '-' || c.id
   where exists (
     select 1 from legacy_groups lg where lg.group_slug = c.slug
   );

  -- 3. Cada grupo entra como categoria raiz, com a foto que a grade da home
  --    usa. `sort_order * 100` deixa as raízes em blocos, para uma categoria
  --    raiz que já existisse (parent_id antigo nulo) não se misturar no meio
  --    delas.
  insert into public.categories (name, slug, image_url, is_order_capable, sort_order, is_active)
  select g.name, g.slug, g.image_url, false, g.sort_order * 100, g.is_active
    from public.groups g;

  -- 4. As categorias que apontavam para um grupo passam a apontar para a raiz
  --    correspondente. `group_id` continua intacto até o passo 6.
  update public.categories c
     set parent_id = roots.id
    from public.categories roots
    join legacy_groups lg on lg.group_slug = roots.slug
   where c.group_id = lg.group_id
     and roots.parent_id is null;

  -- 5. As structs antigas saem. `groups` não é referenciada por nenhuma outra
  --    FK do schema (só por `categories.group_id`, que vai junto).
  alter table public.categories drop column group_id;
  drop table public.groups;
end $$;

-- ---------------------------------------------------------------------------
-- Busca: renomear slug muda o texto indexado da empresa
--
-- A fusão renomeou slugs e o trigger `businesses_search_text_biu` só dispara
-- em `businesses`. Sem isto, as empresas continuariam indexadas com o slug
-- antigo e a busca por "servicos" pararia de encontrar os serviços.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in select id from public.businesses loop
    perform public.refresh_business_search(r.id);
  end loop;
end $$;

-- E o admin renomeando uma categoria passa a reindexar junto.
drop trigger if exists categories_slug_search on public.categories;

create or replace function public.categories_slug_search_sync()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.refresh_business_search(bc.business_id)
    from public.business_categories bc
   where bc.category_id = new.id;
  return null;
end;
$$;

create trigger categories_slug_search
  after update of slug on public.categories
  for each row execute function public.categories_slug_search_sync();

-- ============================================================================
-- Contagem de empresas por categoria e por raiz
--
-- Uma ida ao banco no lugar de uma listagem por categoria. A home já fazia N+1
-- (uma listagem por grupo) e precisaria de uma por subcategoria.
--
-- `groups` e `categories` são mapas slug -> total. Um grupo conta a empresa
-- marcada nele E a marcada em qualquer subcategoria dele, sem duplicar: é
-- `count(distinct business_id)` agrupado pelo slug da raiz. É exatamente a
-- mesma semântica do filtro em `list_businesses`, para o número da pílula e a
-- lista nunca discordarem.
--
-- `total` conta as empresas uma vez só. Somar os grupos não daria: quem está
-- em duas principais diferentes apareceria duas vezes.
-- ============================================================================

create or replace function public.list_category_counts(p_city_id bigint)
returns jsonb
language sql stable
security invoker
set search_path = public
as $$
  with links as (
    select c.id as category_id, c.parent_id, c.slug, b.id as business_id
      from public.business_categories bc
      join public.categories c on c.id = bc.category_id
      join public.businesses b on b.id = bc.business_id
     where b.status = 'active'
       and b.city_id = p_city_id
  ), grouped as (
    select coalesce(r.slug, l.slug) as slug, count(distinct l.business_id) as total
      from links l
      left join public.categories r on r.id = l.parent_id
     group by 1
  )
  select jsonb_build_object(
    'groups', coalesce(
      (select jsonb_object_agg(slug, total) from grouped),
      '{}'::jsonb
    ),
    'categories', coalesce(
      (select jsonb_object_agg(l.slug, count(distinct l.business_id))
         from links l),
      '{}'::jsonb
    ),
    'total', (select count(distinct business_id) from links)
  );
$$;

-- ============================================================================
-- Listagem com filtro de subcategoria
--
-- `p_category_slugs` é novo e opcional. `p_group_slugs` continua valendo: a
-- assinatura muda, então a função antiga é dropada primeiro — sem isso o
-- `create or replace` deixaria as duas overloads vivas e o PostgREST não
-- saberia qual chamar.
--
-- O casamento de grupo usa `coalesce(raiz.slug, cat.slug)`: uma empresa
-- marcada na própria raiz conta como estava na raiz, não some do filtro.
-- ============================================================================

create or replace function public.list_businesses(
  p_city_id bigint,
  p_group_slugs text[] default null,
  p_limit integer default null,
  p_offset integer default 0,
  p_category_slugs text[] default null
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
        select distinct coalesce(p.slug, c.slug)
        from public.business_categories bc
        join public.categories c on c.id = bc.category_id
        left join public.categories p on p.id = c.parent_id
        where bc.business_id = b.id
        order by coalesce(p.slug, c.slug)
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
        join public.categories c on c.id = bc.category_id
        left join public.categories p on p.id = c.parent_id
        where bc.business_id = b.id
          and coalesce(p.slug, c.slug) = any(p_group_slugs)
      )
    )
    and (
      p_category_slugs is null
      or cardinality(p_category_slugs) = 0
      or exists (
        select 1
        from public.business_categories bc
        join public.categories c on c.id = bc.category_id
        where bc.business_id = b.id
          and c.slug = any(p_category_slugs)
      )
    )
  order by b.is_featured desc, b.name asc
  limit case when p_limit is null then null else greatest(p_limit, 1) end
  offset greatest(p_offset, 0);
$$;

-- A busca também filtra por grupo: mesma semântica da listagem.
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
        select distinct coalesce(gp.slug, cat.slug)
        from public.business_categories bc
        join public.categories cat on cat.id = bc.category_id
        left join public.categories gp on gp.id = cat.parent_id
        where bc.business_id = b.id
        order by coalesce(gp.slug, cat.slug)
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
        left join public.categories gp on gp.id = cat.parent_id
        where bc.business_id = b.id
          and coalesce(gp.slug, cat.slug) = p_group_slug
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
