/**
 * Tipos do editor de cardápio.
 *
 * Vivem aqui (e não no componente) porque as duas páginas que montam o editor —
 * `/admin/empresas/[id]/cardapio` e `/painel/[empresa]/cardapio` — precisam
 * dos mesmos nomes de campo, e o `MenuEditor` é compartilhado entre elas.
 */
export type MenuSection = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type MenuProduct = {
  id: number;
  menu_category_id: number | null;
  name: string;
  description: string | null;
  price_cents: number;
  compare_at_cents: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
};

export type MenuGroup = {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  /** Grupo "Sabores": valores com preço cheio, pizza cobra o mais caro. */
  is_flavor_group: boolean;
  sort_order: number;
};

export type MenuValue = {
  id: number;
  option_group_id: number;
  name: string;
  /**
   * Acréscimo sobre o preço do produto — ou o PREÇO CHEIO do sabor quando o
   * valor pertence a um grupo com `is_flavor_group`.
   */
  price_delta_cents: number;
  image_url?: string | null;
  /** "O que vem neste item" — aparece abaixo do nome na vitrine. */
  description?: string | null;
  is_available: boolean;
  sort_order: number;
};

export type MenuLink = { product_id: number; option_group_id: number };
