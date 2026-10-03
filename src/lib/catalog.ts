import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = Database["public"]["Tables"]["businesses"]["Row"];

export type City = {
  id: number;
  name: string;
  state: string;
  slug: string;
  timezone: string;
};

/** Categoria principal (as pílulas da home) — raiz da árvore, `parent_id is null`. */
export type Group = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  imageUrl: string | null;
  isOrderCapable: boolean;
  sortOrder: number;
  businessCount: number;
};

/** Projeção enxuta usada nos cards de empresa (home, busca, cidade, categoria). */
export type BusinessCard = {
  id: number;
  name: string;
  slug: string;
  customSlug: string | null;
  description: string | null;
  logoUrl: string | null;
  citySlug: string;
  groups: string[];
  hasMenu: boolean;
};

/** Card de destaque: o `BusinessCard` mais o kicker do showcase da home. */
export type FeaturedBusiness = BusinessCard & {
  /** Nome da categoria principal — vira o "kicker" acima do nome. */
  categoryName: string | null;
  /**
   * Slug da vitrine `/cardapio/{slug}` quando ela é alcançável (`custom_slug`
   * ou slug único entre as ativas), `null` quando não é. Vem pronto do banco
   * para a home não precisar de uma ida só para montar o CTA do herói.
   */
  storefrontSlug: string | null;
};

export type Business = Row & {
  citySlug: string;
  cityName: string;
  groups: string[];
  categories: { name: string; slug: string; isPrimary: boolean }[];
  hasMenu: boolean;
};

/** Grupo "Serviços" (`categories.slug`, raiz da árvore). */
export const SERVICOS_GROUP = "servicos";

/**
 * Empresa de serviço (autoescola, clínica, oficina...) em vez de loja com
 * cardápio.
 *
 * O teste é pelo GRUPO, não pela categoria nem pelo `source`: empresa marcada
 * numa subcategoria de serviços (`educacao`, `servicos-em-geral`...) também é
 * serviço, e `getBusinessBySlug` já devolve o slug do pai em `groups`. Sem
 * isso a página de uma autoescola anunciava "Taxa de entrega: grátis" e um
 * cardápio que nunca existiu, porque `delivery_fee_cents` tem `0` como padrão
 * e o cardápio vazio é o estado normal de quem não vende produto.
 */
export function isServiceBusiness(
  business: Pick<Business, "groups"> | null | undefined,
): boolean {
  return Boolean(business?.groups.includes(SERVICOS_GROUP));
}

export type MenuItemOptionValue = {
  id: number;
  name: string;
  /**
   * Acréscimo sobre o preço do produto — EXCETO nos valores de um grupo de
   * sabores (`is_flavor_group`), onde guarda o PREÇO CHEIO daquele sabor
   * naquele tamanho. A regra de combinar pelo mais caro mora em `pricing.ts`.
   */
  price_delta_cents: number;
  /** Foto do valor (sabor, borda, extra). `null` quando não cadastrada. */
  image_url: string | null;
  /** "O que vem neste item". `null`/vazio quando o lojista não escreveu nada. */
  description?: string | null;
};

export type MenuItemOptionGroup = {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  /**
   * `true` no grupo "Sabores" de uma pizza: os valores têm preço cheio e a
   * pizza cobra o mais caro entre os escolhidos. `false` nos grupos de
   * acréscimo (tamanho, borda, extras), somados normalmente.
   */
  is_flavor_group: boolean;
  values: MenuItemOptionValue[];
};

export type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  compare_at_cents: number;
  image_url: string | null;
  is_featured: boolean;
  menu_category_id: number | null;
  menu_category_slug: string | null;
  menu_category_name: string | null;
  sort_order: number;
  option_groups: MenuItemOptionGroup[];
};

export type MenuSection = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  item_count: number;
};

export type Menu = {
  business: Pick<
    Row,
    | "id"
    | "name"
    | "slug"
    | "custom_slug"
    | "description"
    | "logo_url"
    | "cover_url"
    | "whatsapp"
    | "phone"
    | "address"
    | "neighborhood"
    | "opening_hours"
    | "fulfillment"
    | "payment_methods"
    | "pix_key"
    | "delivery_fee_cents"
    | "min_order_cents"
  > | null;
  menu_categories: MenuSection[];
  items: MenuItem[];
};

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/**
 * O PostgREST devolve `1:1` como objeto e `1:N` como array, dependendo do
 * embed. `unwrap` normaliza os dois formatos.
 */
function unwrap<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

/** O outro lado de `unwrap`: normaliza uma relação 1:N para array. */
function unwrapAll<T>(value: unknown): T[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]) as T[];
}

/** Converte a linha achatada do PostgREST em `BusinessCard`. */
function toCard(
  row: Record<string, unknown>,
  citySlug: string,
): BusinessCard {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    customSlug: (row.custom_slug as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    citySlug: String(row.city_slug ?? citySlug),
    groups: Array.isArray(row.groups) ? (row.groups as string[]) : [],
    hasMenu: row.has_menu === true,
  };
}

/**
 * Busca full-text. O RPC já exige 2+ caracteres (mesma regra do
 * endpoint `ta-empresa/v1/buscar` do WordPress) e ordena por relevância.
 */
export const searchBusinesses = cache(
  async (query: string, cityId?: number, limit = 20): Promise<BusinessCard[]> => {
    const term = query.trim();
    if (term.length < 2) return [];

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_businesses", {
      p_query: term,
      // Args com DEFAULT no SQL viram opcionais nos tipos gerados: omitir é o
      // que faz o Postgres aplicar o default. Passar `null` não compila.
      ...(cityId ? { p_city_id: cityId } : {}),
      p_limit: limit,
    });
    if (error) throw new Error(`search_businesses: ${error.message}`);

    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.map((row) => toCard(row, String(row.city_slug ?? "")));
  },
);

/**
 * Listagem da seção "Descubra empresas". Sem `slugs` devolve tudo da
 * cidade; com `slugs` filtra por qualquer um dos grupos (multi-label).
 * `opts.categorySlugs` filtra por subcategoria (ou pela própria principal).
 */
export const listBusinesses = cache(
  async (
    cityId: number,
    slugs?: string[] | null,
    opts: {
      limit?: number;
      offset?: number;
      categorySlugs?: string[] | null;
    } = {},
  ): Promise<BusinessCard[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_businesses", {
      p_city_id: cityId,
      ...(slugs && slugs.length > 0 ? { p_group_slugs: slugs } : {}),
      ...(opts.categorySlugs && opts.categorySlugs.length > 0
        ? { p_category_slugs: opts.categorySlugs }
        : {}),
      ...(opts.limit ? { p_limit: opts.limit } : {}),
      p_offset: opts.offset ?? 0,
    });
    if (error) throw new Error(`list_businesses: ${error.message}`);

    return ((data ?? []) as Record<string, unknown>[]).map((row) =>
      toCard(row, ""),
    );
  },
);

/**
 * Destaques da home ("Destaques em {cidade}"). Além do card, o showcase usa
 * `categoryName` no kicker, `hasMenu` para escolher quem ocupa o herói e
 * `storefrontSlug` para o "Ver cardápio" apontar direto na vitrine.
 *
 * Tudo isso sai do RPC `list_featured_businesses` numa ida: a versão anterior
 * fazia um select, uma contagem de produtos por empresa (N+1) e ainda deixava
 * o slug da vitrine para a página resolver depois — três saltos sequenciais no
 * caminho crítico da home, que é exatamente o que se sente ao voltar para ela.
 */
export const listFeaturedBusinesses = cache(
  async (cityId: number, limit = 4): Promise<FeaturedBusiness[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_featured_businesses", {
      p_city_id: cityId,
      p_limit: limit,
    });
    if (error) throw new Error(`listFeaturedBusinesses: ${error.message}`);

    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...toCard(row, ""),
      categoryName: (row.category_name as string | null) ?? null,
      storefrontSlug: (row.storefront_slug as string | null) ?? null,
    }));
  },
);

export const getBusinessBySlug = cache(
  async (citySlug: string, slug: string): Promise<Business | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select(
        `*,
         cities!inner(slug, name),
         business_categories(
           is_primary,
           categories!inner(name, slug, parent_id)
         )`,
      )
      .eq("slug", slug)
      .eq("cities.slug", citySlug)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(`getBusinessBySlug: ${error.message}`);
    if (!data) return null;

    const raw = data as unknown as Record<string, unknown>;
    const row = raw as unknown as Row;
    const city = unwrap<{ slug: string; name: string }>(raw.cities);
    const links = unwrapAll<{
      is_primary: boolean;
      categories: unknown;
    }>(raw.business_categories);

    const categories: Business["categories"] = [];
    const linked: { slug: string; parentId: number | null }[] = [];
    for (const link of links) {
      const cat = unwrap<{
        name: string;
        slug: string;
        parent_id: number | null;
      }>(link.categories);
      if (!cat) continue;
      categories.push({
        name: cat.name,
        slug: cat.slug,
        isPrimary: link.is_primary,
      });
      linked.push({
        slug: cat.slug,
        parentId: cat.parent_id == null ? null : Number(cat.parent_id),
      });
    }
    categories.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

    // empresa marcada numa subcategoria também conta para a principal
    const groupSlugs = await resolveGroupSlugs(supabase, linked);
    const menuCount = await countMenuItems(supabase, row.id);

    return {
      ...row,
      citySlug: city?.slug ?? citySlug,
      cityName: city?.name ?? citySlug,
      categories,
      groups: groupSlugs,
      hasMenu: menuCount > 0,
    };
  },
);

/**
 * Slug da categoria PRINCIPAL de cada categoria em que a empresa está marcada.
 *
 * O pai vem de uma segunda leitura em vez do embed `parent:categories(...)`
 * porque o PostgREST não resolve a auto-relação de `categories`: a FK
 * `categories_parent_id_fkey` não entra no cache de schema e o embed volta
 * `[]` em vez de dar erro — o que fazia `groups` trazer o slug da
 * SUBCATEGORIA (`educacao`, `servicos-14`) e nenhuma página conseguir saber a
 * que grupo principal a empresa pertencia. A lista de empresas não era
 * afetada porque `list_businesses` faz o coalesce em SQL.
 *
 * São as raízes (`parent_id is null`) que interessam — poucas linhas — então a
 * consulta sai sem filtro e vale para todos os pais de uma vez.
 */
async function resolveGroupSlugs(
  supabase: Supabase,
  linked: { slug: string; parentId: number | null }[],
): Promise<string[]> {
  const parentIds = [
    ...new Set(
      linked.map((c) => c.parentId).filter((id): id is number => id != null),
    ),
  ];
  const rootById = new Map<number, string>();
  if (parentIds.length > 0) {
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug")
      .in("id", parentIds);
    if (error) throw new Error(`resolveGroupSlugs: ${error.message}`);
    for (const root of unwrapAll<{ id: number; slug: string }>(data)) {
      rootById.set(Number(root.id), root.slug);
    }
  }

  const groupSlugs = new Set<string>();
  for (const cat of linked) {
    // categoria marcada na própria raiz conta como estava na raiz
    const group = cat.parentId == null ? cat.slug : rootById.get(cat.parentId);
    // pai fora do alcance da leitura (categoria raiz desativada): a empresa
    // fica sem grupo, e não com um slug de subcategoria fingindo ser principal
    if (group) groupSlugs.add(group);
  }
  return [...groupSlugs].sort();
}

/**
 * `has_menu` na página de uma empresa só: uma linha, uma contagem. As listas
 * (home, busca, cidade) pegam o mesmo número dentro do próprio RPC.
 */
async function countMenuItems(
  supabase: Supabase,
  businessId: number,
): Promise<number> {
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("is_available", true);
  if (error) throw new Error(`countMenuItems: ${error.message}`);
  return count ?? 0;
}

export const getBusinessMenu = cache(async (businessId: number): Promise<Menu | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_business_menu", {
    p_business_id: businessId,
  });
  if (error) throw new Error(`get_business_menu: ${error.message}`);
  if (!data) return null;
  return data as unknown as Menu;
});

/**
 * Mesma regra de formato que o check `businesses_custom_slug_format` aplica no
 * banco. O slug da rota entra num filtro `or()` do PostgREST — que é uma
 * string, não um parâmetro — então precisa ser validado antes, ou um
 * `slug` com vírgula reescreveria o filtro inteiro.
 */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Cardápio público em `/cardapio/[slug]`, resolvido pelo link próprio da
 * empresa (`custom_slug`) e, na falta dele, pelo `slug` — desde que esse
 * `slug` seja único no sistema, porque `unique (city_id, slug)` só garante
 * unicidade dentro da cidade.
 */
export const getMenuBySlug = cache(
  async (slug: string): Promise<{ menu: Menu; citySlug: string } | null> => {
    const key = slug.trim().toLowerCase();
    if (!SLUG_RE.test(key)) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("id, custom_slug, cities!inner(slug)")
      .eq("status", "active")
      .or(`custom_slug.eq.${key},slug.eq.${key}`)
      .limit(2);

    if (error) throw new Error(`getMenuBySlug: ${error.message}`);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const match =
      rows.find((row) => row.custom_slug === key) ??
      (rows.length === 1 ? rows[0] : null);
    if (!match) return null;

    const menu = await getBusinessMenu(Number(match.id));
    if (!menu?.business) return null;

    const city = unwrap<{ slug: string }>(match.cities);
    return { menu, citySlug: city?.slug ?? "" };
  },
);

/**
 * Slug que leva à vitrine `/cardapio/[slug]`, ou `null` quando a vitrine
 * não é alcançável.
 *
 * Com `custom_slug` o caminho é certo: `custom_slug` é unique no sistema e
 * o `getMenuBySlug` prefere o match por ele. Sem ele, sobra o `slug` — e
 * `unique (city_id, slug)` só garante unicidade dentro da cidade, então o
 * `getMenuBySlug` só aceita o `slug` quando ele é único entre as empresas
 * ativas. Devolver `null` nesse caso é o que impede a página de oferecer
 * um CTA que responde 404.
 */
export const resolveStorefrontSlug = cache(
  async (customSlug: string | null, slug: string): Promise<string | null> => {
    if (customSlug) return customSlug;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(2);

    if (error) throw new Error(`resolveStorefrontSlug: ${error.message}`);
    const rows = (data ?? []) as unknown as { id: number }[];
    return rows.length === 1 ? slug : null;
  },
);

/* ------------------------------------------------------------------ */
/* Taxonomias                                                          */
/* ------------------------------------------------------------------ */

export const listCities = cache(async (): Promise<City[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, state, slug, timezone")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`listCities: ${error.message}`);
  return (data ?? []) as City[];
});

export const getCityBySlug = cache(
  async (slug: string): Promise<City | null> => {
    const cities = await listCities();
    return cities.find((c) => c.slug === slug) ?? null;
  },
);

/** Categorias principais (raiz da árvore) — as pílulas da home. */
export const listGroups = cache(async (): Promise<Group[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, image_url, sort_order")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`listGroups: ${error.message}`);

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    imageUrl: (row.image_url as string | null) ?? null,
    sortOrder: Number(row.sort_order),
  }));
});

function toCategory(row: Record<string, unknown>): Category {
  const counts = row.business_categories as { count: number }[] | null;
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    parentId: row.parent_id == null ? null : Number(row.parent_id),
    imageUrl: (row.image_url as string | null) ?? null,
    isOrderCapable: row.is_order_capable === true,
    sortOrder: Number(row.sort_order),
    businessCount: counts?.[0]?.count ?? 0,
  };
}

const CATEGORY_COLUMNS =
  "id, name, slug, parent_id, image_url, is_order_capable, sort_order, business_categories!left(count)";

/** Árvore inteira (principais + subcategorias) com a contagem de empresas. */
export const listCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw new Error(`listCategories: ${error.message}`);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(toCategory);
});

/**
 * Subcategorias de uma principal — ou todas, quando `parentId` é omitido.
 * O filtro do home/diretório usa a lista completa para montar o drill-down
 * sem uma consulta por categoria.
 */
export const listSubcategories = cache(
  async (parentId?: number | null): Promise<Category[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .not("parent_id", "is", null)
      .eq("is_active", true)
      .order("sort_order");

    if (parentId != null) query = query.eq("parent_id", parentId);

    const { data, error } = await query;
    if (error) throw new Error(`listSubcategories: ${error.message}`);
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(toCategory);
  },
);

export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error(`getCategoryBySlug: ${error.message}`);
    return data ? toCategory(data as Record<string, unknown>) : null;
  },
);

export type CategoryCounts = {
  /** slug da categoria principal -> nº de empresas na cidade. */
  groups: Record<string, number>;
  /** slug da subcategoria -> nº de empresas na cidade. */
  categories: Record<string, number>;
  /** total de empresas da cidade. */
  total: number;
};

/**
 * Contagens de empresas por categoria numa cidade, em uma ida ao banco.
 * Substitui o N+1 que a home e o diretório faziam para montar os números
 * dos pills.
 */
export const listCategoryCounts = cache(
  async (cityId: number): Promise<CategoryCounts> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_category_counts", {
      p_city_id: cityId,
    });
    if (error) throw new Error(`listCategoryCounts: ${error.message}`);

    const payload = (data ?? {}) as {
      groups?: Record<string, number> | null;
      categories?: Record<string, number> | null;
      total?: number | null;
    };
    const groups = payload.groups ?? {};
    const categories = payload.categories ?? {};
    const total =
      payload.total ?? Object.values(groups).reduce((a, b) => a + b, 0);
    return { groups, categories, total };
  },
);

export type Offer = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  priceCents: number | null;
  compareAtCents: number | null;
  endsAt: string | null;
  businessName: string;
  businessSlug: string;
  businessLogoUrl: string | null;
};

export const listOffers = cache(
  async (cityId: number): Promise<Offer[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offers")
      .select(
        "id, title, description, image_url, link_url, price_cents, compare_at_cents, ends_at, businesses!inner(name, slug, logo_url, city_id)",
      )
      .eq("is_active", true)
      .eq("businesses.city_id", cityId)
      .order("sort_order");

    if (error) throw new Error(`listOffers: ${error.message}`);

    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map((row) => {
        const business = unwrap<Record<string, unknown>>(row.businesses);
        if (!business) return null;
        return {
          id: Number(row.id),
          title: String(row.title),
          description: (row.description as string | null) ?? null,
          imageUrl: (row.image_url as string | null) ?? null,
          linkUrl: (row.link_url as string | null) ?? null,
          priceCents: row.price_cents == null ? null : Number(row.price_cents),
          compareAtCents:
            row.compare_at_cents == null ? null : Number(row.compare_at_cents),
          endsAt: (row.ends_at as string | null) ?? null,
          businessName: String(business.name),
          businessSlug: String(business.slug),
          businessLogoUrl: (business.logo_url as string | null) ?? null,
        };
      })
      .filter((offer): offer is Offer => offer !== null);
  },
);

export type Plan = {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  priceCents: number;
  monthlyEquivalentCents: number | null;
  period: string;
  features: string[];
  isFeatured: boolean;
};

export const listPlans = cache(async (): Promise<Plan[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, slug, tagline, price_cents, monthly_equivalent_cents, period, features, is_featured")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`listPlans: ${error.message}`);

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    tagline: (row.tagline as string | null) ?? null,
    priceCents: Number(row.price_cents),
    monthlyEquivalentCents:
      row.monthly_equivalent_cents == null
        ? null
        : Number(row.monthly_equivalent_cents),
    period: String(row.period),
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    isFeatured: row.is_featured === true,
  }));
});

export type { Supabase };
