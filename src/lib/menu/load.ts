import "server-only";

import { unwrapAll } from "@/lib/postgrest";
import type { Supabase } from "@/lib/catalog";
import type {
  MenuGroup,
  MenuLink,
  MenuProduct,
  MenuSection,
  MenuValue,
} from "@/lib/menu/types";

export type MenuEditorData = {
  sections: MenuSection[];
  products: MenuProduct[];
  groups: MenuGroup[];
  values: MenuValue[];
  links: MenuLink[];
};

/**
 * As cinco consultas do editor, em paralelo.
 *
 * Compartilhado por `/admin/empresas/[id]/cardapio` e
 * `/painel/[empresa]/cardapio` — as duas telas são o mesmo editor com guards
 * diferentes, então os dados não podem ter duas cópias.
 *
 * Traz itens pausados e seções ocultas de propósito: é o painel que precisa
 * ver o que está fora do ar. Quem filtra para o cliente é a vitrine.
 */
export async function loadMenuEditorData(
  supabase: Supabase,
  businessId: number,
): Promise<MenuEditorData> {
  const [sectionsRes, productsRes, groupsRes, valuesRes, linksRes] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, slug, description, image_url, is_active, sort_order")
        .eq("business_id", businessId)
        .order("sort_order"),
      supabase
        .from("products")
        .select(
          "id, menu_category_id, name, description, price_cents, compare_at_cents, image_url, is_available, is_featured, sort_order",
        )
        .eq("business_id", businessId)
        .order("sort_order"),
      supabase
        .from("option_groups")
        .select("id, name, min_select, max_select, is_required, is_flavor_group, sort_order")
        .eq("business_id", businessId)
        .order("sort_order"),
      supabase
        .from("option_values")
        .select(
          "id, option_group_id, name, price_delta_cents, is_available, sort_order",
        )
        .order("sort_order"),
      supabase
        .from("product_option_groups")
        .select("product_id, option_group_id"),
    ]);

  const groups = unwrapAll<MenuGroup>(groupsRes);
  const groupIds = new Set(groups.map((group) => group.id));

  return {
    sections: unwrapAll<MenuSection>(sectionsRes),
    products: unwrapAll<MenuProduct>(productsRes),
    groups,
    // `option_values` não tem `business_id` próprio — a empresa vem do grupo.
    values: unwrapAll<MenuValue>(valuesRes).filter((value) =>
      groupIds.has(value.option_group_id),
    ),
    links: unwrapAll<MenuLink>(linksRes),
  };
}
