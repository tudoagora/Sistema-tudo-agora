-- ============================================================
-- RPC dos destaques da home
--
-- A seção "Destaques em {cidade}" era montada no servidor com seis idas ao
-- banco: um select das empresas, uma contagem de produtos por empresa (N+1) e,
-- na pior das contas, mais uma para resolver o slug da vitrine do herói. Como
-- cada ida custa uma ida à rede, o caminho crítico da home eram três saltos
-- sequenciais (categorias -> destaques/publicidade -> slug do herói), e a espera
-- por isso é o que aparece quando se clica na logo para voltar para a home.
--
-- Este RPC junta as seis leituras numa só. Ele devolve, por linha:
--   - o card enxuto (mesmos campos de `list_businesses`/`search_businesses`),
--   - `category_name`, que era montado no JS a partir do embed de
--     `business_categories` (a principal manda; sem principal, a primeira),
--   - `has_menu`, com o MESMO filtro do `search_businesses` (só produto
--     disponível). Contar pelo embed `products(count)` do PostgREST seria mais
--     curto, mas contaria também o que está esgotado — errado para escolher o
--     herói, cujo CTA é "Ver cardápio" e aponta para uma vitrine que precisa
--     ter o que mostrar,
--   - `storefront_slug`, que é o `resolveStorefrontSlug` resolvido dentro do
--     banco, para a home não precisar de um terceiro salto só para montar o
--     "Ver cardápio" do herói.
--
-- A ordem é a mesma de antes: o corte de `p_limit` acontece pelo NOME (como
-- fazia o `order by name` do PostgREST) e só então as empresas com cardápio
-- entram na frente. Assim o herói continua sendo a empresa com vitrine, e o
-- `.sort` do JS (que era estável) deixa de decidir o que só o SQL precisa
-- decidir.
--
-- `security invoker` como nos outros RPCs de leitura: quem chama vê o que a RLS
-- deixa ver, e a home roda com a sessão anônima.
-- ============================================================

create or replace function public.list_featured_businesses(
  p_city_id bigint,
  p_limit integer default 4
)
returns table (
  id bigint,
  name text,
  slug text,
  custom_slug text,
  description text,
  logo_url text,
  city_slug text,
  category_name text,
  has_menu boolean,
  storefront_slug text
)
language sql stable
security invoker
set search_path = public
as $$
  with featured as (
    select
      b.id,
      b.name,
      b.slug,
      b.custom_slug,
      b.description,
      b.logo_url,
      c.slug as city_slug,
      -- Kicker do showcase: a categoria principal; sem ela, qualquer categoria.
      -- O embed do PostgREST não garante ordem, então o desempate é pelo nome
      -- — o valor exibido é o mesmo em qualquer caso, e assim a linha devolvida
      -- passa a ser sempre a mesma.
      coalesce(
        (
          select cat.name
          from public.business_categories bc
          join public.categories cat on cat.id = bc.category_id
          where bc.business_id = b.id and bc.is_primary
          order by cat.name asc
          limit 1
        ),
        (
          select cat.name
          from public.business_categories bc
          join public.categories cat on cat.id = bc.category_id
          where bc.business_id = b.id
          order by cat.name asc
          limit 1
        )
      ) as category_name,
      exists (
        select 1 from public.products p
        where p.business_id = b.id and p.is_available
      ) as has_menu,
      -- Mesma regra do `resolveStorefrontSlug`/`getMenuBySlug`: com
      -- `custom_slug` o caminho é certo (ele é unique no sistema); sem ele,
      -- sobra o `slug`, que só é aceito quando é único entre as empresas
      -- ativas — `unique (city_id, slug)` só garante unicidade na cidade.
      -- Devolver `null` aqui é o que impede a home de oferecer um CTA que
      -- responde 404.
      case
        when b.custom_slug is not null then b.custom_slug
        when 1 = (
          select count(*)
          from public.businesses other
          where other.status = 'active' and other.slug = b.slug
        ) then b.slug
        else null
      end as storefront_slug
    from public.businesses b
    join public.cities c on c.id = b.city_id
    where b.status = 'active'
      and b.city_id = p_city_id
      -- Só `is_featured`. O `or()` antigo era
      -- `is_featured.eq.true,and(featured_until.is.null,featured_until.gt.<agora>)`
      -- e esse `and` nunca era verdadeiro (`null > now` é NULL), ou seja, o
      -- filtro efetivo já era este. `featured_until` continua existindo para
      -- quando alguém expirationar destaque; mudá-lo aqui mudaria quem aparece
      -- na home, e isso não é uma correção de performance.
      and b.is_featured
    order by b.name asc
    limit greatest(coalesce(p_limit, 4), 1)
  )
  select f.id, f.name, f.slug, f.custom_slug, f.description, f.logo_url,
         f.city_slug, f.category_name, f.has_menu, f.storefront_slug
  from featured f
  order by f.has_menu desc, f.name asc;
$$;

comment on function public.list_featured_businesses(bigint, integer) is
  'Destaques da home: cards + categoria principal + has_menu + slug da vitrine, numa ida.';