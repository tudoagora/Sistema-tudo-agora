"use server";

import { z } from "zod";

import { revalidateMenu } from "@/lib/menu/revalidate";
import type {
  MenuActionResult,
  MenuState,
  UploadState,
} from "@/lib/menu/state";
import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type MenuCategoryUpdate = Database["public"]["Tables"]["menu_categories"]["Update"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

const NO_PERMISSION = "Você não gerencia esta empresa.";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/* ------------------------------------------------------------------ */
/* Leitura do FormData                                                 */
/* ------------------------------------------------------------------ */

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string, fallback = 0): number {
  const raw = formData.get(key);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function int(formData: FormData, key: string, fallback = 0): number {
  return Math.trunc(num(formData, key, fallback));
}

const toCents = (reais: number) => Math.max(0, Math.round(reais * 100));

/**
 * Próximo `sort_order` livre de uma lista.
 *
 * Não serve `lista.length + 1`: isso é a **contagem**, não o maior número. Depois
 * de excluir um item do meio, a contagem volta e o próximo nasce com um
 * `sort_order` que outro item já usa. O editor desempata por nome, então a
 * empatecia aparece como "a seta não funciona": `moveOptionGroup` trocava dois
 * `sort_order` iguais e nenhuma linha mudava de lugar.
 */
function nextSortOrder(sortOrders: number[]): number {
  return sortOrders.length === 0 ? 1 : Math.max(...sortOrders) + 1;
}

function friendly(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Já existe um item com esse nome.";
  if (error.code === "23503") return "Este registro não existe mais.";
  if (error.code === "23514") return "Valor fora do permitido.";
  if (error.code === "22001") return "O texto é longo demais.";
  return error.message;
}

/**
 * Devolve o cliente da sessão só para quem gerencia a empresa; `null` caso
 * contrário.
 *
 * A checagem deixa o RLS decidir: `businesses_manage_read` (migration 0003) só
 * devolve a linha para quem está em `business_members` ou tem perfil admin.
 * Linha vazia já é a resposta "não", sem nenhuma comparação de papel
 * duplicada aqui.
 */
async function clientFor(businessId: number) {
  if (!Number.isInteger(businessId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();

  return business ? supabase : null;
}

/**
 * Resultado de uma mutação do editor.
 *
 * Estas actions rodam em `<form action>` sem `useActionState`, então não há
 * estado de formulário para guardar a mensagem. Em vez de redirecionar (o que
 * rolava a página ao topo e fechava o painel de edição), elas DEVOLVEM o
 * resultado; o cliente lê e mostra um toast no lugar, mantendo scroll e painel.
 */
const failWith = (message: string): MenuActionResult => ({
  error: message,
  ok: null,
});
const okWith = (message: string): MenuActionResult => ({
  error: null,
  ok: message,
});
/** Operação que não fez nada (ex.: mover item já na borda) — sem toast. */
const noop: MenuActionResult = { error: null, ok: null };

/* ------------------------------------------------------------------ */
/* Seções do cardápio                                                  */
/* ------------------------------------------------------------------ */

/** Slug único por empresa — `unique (business_id, slug)`. */
async function uniqueSectionSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: number,
  name: string,
  ignoreId?: number,
): Promise<string> {
  const base = slugify(name) || "secao";
  const { data } = await supabase
    .from("menu_categories")
    .select("id, slug")
    .eq("business_id", businessId);

  const taken = new Set(
    (data ?? []).filter((row) => row.id !== ignoreId).map((row) => row.slug),
  );
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

const sectionSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à seção.").max(80),
  description: z.string().trim().max(300).optional(),
});

export async function createMenuSection(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return { error: NO_PERMISSION };

  const parsed = sectionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name } = parsed.data;
  const { data: existing } = await supabase
    .from("menu_categories")
    .select("sort_order")
    .eq("business_id", businessId);

  const { error } = await supabase.from("menu_categories").insert({
    business_id: businessId,
    name,
    description: parsed.data.description || null,
    slug: await uniqueSectionSlug(supabase, businessId, name),
    sort_order: nextSortOrder((existing ?? []).map((row) => row.sort_order)),
  });

  if (error) return { error: friendly(error) };
  revalidateMenu(businessId);
  return { error: null };
}

export async function updateMenuSection(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const name = text(formData, "name");
  if (!name) return failWith("A seção precisa de um nome.");

  const patch: MenuCategoryUpdate = {
    name,
    description: text(formData, "description") || null,
    image_url: text(formData, "imageUrl") || null,
    is_active: formData.get("isActive") === "on",
  };

  const { error } = await supabase
    .from("menu_categories")
    .update(patch)
    .eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Seção salva.");
}

/**
 * Ativa/desativa a seção inteira. Some da vitrine sem apagar item nenhum —
 * é o que a empresa usa quando um fornecedor acaba no meio da semana.
 */
export async function toggleMenuSection(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase
    .from("menu_categories")
    .update({ is_active: formData.get("value") === "true" })
    .eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith(
    formData.get("value") === "true"
      ? "Seção visível na vitrine."
      : "Seção oculta da vitrine.",
  );
}

/**
 * Reordena as seções do cardápio — a ordem em que o cliente percorre o cardápio.
 *
 * Substitui `moveMenuSection`, que trocava dois `sort_order` vizinhos e não se
 * mexia quando eles eram iguais.
 */
export async function reorderMenuSections(formData: FormData) {
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const reorderError = await applyOrder(
    supabase,
    { table: "menu_categories" },
    businessId,
    orderFromForm(formData),
  );
  if (reorderError) return reorderError;
  revalidateMenu(businessId);
  return okWith("Ordem das seções salva.");
}

/**
 * Excluir a seção não exclui os itens: `products.menu_category_id` é
 * `on delete set null`, então eles sobram sem categoria e o editor avisa para
 * mover antes. Apagar item a item seria pior para a empresa.
 */
export async function deleteMenuSection(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase.from("menu_categories").delete().eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Seção excluída.");
}

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */

const productSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao item.").max(120),
  description: z.string().trim().max(600).optional(),
  priceReais: z.coerce.number().min(0).max(100000),
  compareAtReais: z.coerce.number().min(0).max(100000),
});

/** Preço "de" só vale se for MAIOR que o preço "por", senão vira desconto ao contrário. */
function productPricePatch(
  parsed: z.infer<typeof productSchema>,
): Pick<ProductUpdate, "price_cents" | "compare_at_cents"> {
  const price = toCents(parsed.priceReais);
  const compareAt = toCents(parsed.compareAtReais);
  return {
    price_cents: price,
    compare_at_cents: compareAt > price ? compareAt : 0,
  };
}

export async function createProduct(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const businessId = int(formData, "businessId");
  const menuCategoryId = int(formData, "menuCategoryId");
  const supabase = await clientFor(businessId);
  if (!supabase) return { error: NO_PERMISSION };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    priceReais: formData.get("priceReais") || 0,
    compareAtReais: formData.get("compareAtReais") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!Number.isInteger(menuCategoryId)) {
    return { error: "Escolha a seção do item." };
  }

  const { data: last } = await supabase
    .from("products")
    .select("sort_order")
    .eq("menu_category_id", menuCategoryId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("products").insert({
    business_id: businessId,
    menu_category_id: menuCategoryId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    ...productPricePatch(parsed.data),
    image_url: text(formData, "imageUrl") || null,
    sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    source: "admin",
  });

  if (error) return { error: friendly(error) };
  revalidateMenu(businessId);
  return { error: null };
}

export async function updateProduct(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    priceReais: formData.get("priceReais") || 0,
    compareAtReais: formData.get("compareAtReais") || 0,
  });
  if (!parsed.success) {
    return failWith(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const patch: ProductUpdate = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    ...productPricePatch(parsed.data),
    image_url: text(formData, "imageUrl") || null,
    is_available: formData.get("isAvailable") === "on",
    is_featured: formData.get("isFeatured") === "on",
  };

  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Item salvo.");
}

/** Pausar/voltar um item sem abrir a edição — o clique que o garçom precisa. */
export async function toggleProductAvailability(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase
    .from("products")
    .update({ is_available: formData.get("value") === "true" })
    .eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith(
    formData.get("value") === "true" ? "Item disponível." : "Item pausado.",
  );
}

export async function toggleProductFeatured(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase
    .from("products")
    .update({ is_featured: formData.get("value") === "true" })
    .eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith(
    formData.get("value") === "true"
      ? "Item em destaque."
      : "Item fora dos destaques.",
  );
}

export async function deleteProduct(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Item excluído.");
}

export async function moveProduct(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const direction = text(formData, "direction");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { data: product } = await supabase
    .from("products")
    .select("id, menu_category_id, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!product?.menu_category_id) return noop;

  const { data: siblings } = await supabase
    .from("products")
    .select("id, sort_order")
    .eq("menu_category_id", product.menu_category_id)
    .order("sort_order", { ascending: true });

  const rows = siblings ?? [];
  const index = rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= rows.length) return noop;

  await supabase
    .from("products")
    .update({ sort_order: rows[target].sort_order })
    .eq("id", rows[index].id);
  await supabase
    .from("products")
    .update({ sort_order: rows[index].sort_order })
    .eq("id", rows[target].id);

  revalidateMenu(businessId);
  return okWith("Item movido.");
}

/* ------------------------------------------------------------------ */
/* Imagens                                                             */
/* ------------------------------------------------------------------ */

/**
 * Sobe a foto para o bucket `cardapio` e devolve a URL pública.
 *
 * O caminho é `cardapio/<business_id>/<uuid>.<ext>` — o `business_id` na
 * frente é o que a policy `cardapio_manage` usa para checar o vínculo, então
 * ele não pode ser omitido nem vir do cliente.
 */
export async function uploadImage(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return { url: null, error: NO_PERMISSION };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { url: null, error: "Escolha uma imagem." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { url: null, error: "A foto passa de 5 MB. Reduza e tente de novo." };
  }
  const ext = IMAGE_EXT[file.type];
  if (!ext) {
    return { url: null, error: "Formato não aceito. Use JPG, PNG, WebP ou AVIF." };
  }

  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from("cardapio").upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { url: null, error: `Falha no envio: ${error.message}` };

  return {
    url: admin.storage.from("cardapio").getPublicUrl(path).data.publicUrl,
    error: null,
  };
}

/* ------------------------------------------------------------------ */
/* Grupos de opção (tamanho, borda, sabores)                           */
/* ------------------------------------------------------------------ */

const optionGroupSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao grupo.").max(60),
  minSelect: z.coerce.number().int().min(0).max(10),
  maxSelect: z.coerce.number().int().min(1).max(10),
  isRequired: z.boolean(),
  isFlavorGroup: z.boolean(),
});

export async function createOptionGroup(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return { error: NO_PERMISSION };

  const parsed = optionGroupSchema.safeParse({
    name: formData.get("name"),
    minSelect: formData.get("minSelect") || 0,
    maxSelect: formData.get("maxSelect") || 1,
    isRequired: formData.get("isRequired") === "on",
    isFlavorGroup: formData.get("isFlavorGroup") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  if (data.minSelect > data.maxSelect) {
    return { error: "O mínimo não pode ser maior que o máximo." };
  }

  const { data: existing } = await supabase
    .from("option_groups")
    .select("sort_order")
    .eq("business_id", businessId);

  const { error } = await supabase.from("option_groups").insert({
    business_id: businessId,
    name: data.name,
    min_select: data.minSelect,
    max_select: data.maxSelect,
    is_required: data.isRequired,
    is_flavor_group: data.isFlavorGroup,
    sort_order: nextSortOrder((existing ?? []).map((row) => row.sort_order)),
  });

  if (error) return { error: friendly(error) };
  revalidateMenu(businessId);
  return { error: null };
}

export async function updateOptionGroup(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const minSelect = int(formData, "minSelect");
  const maxSelect = int(formData, "maxSelect");
  if (minSelect > maxSelect) {
    return failWith("O mínimo não pode ser maior que o máximo.");
  }

  const { error } = await supabase
    .from("option_groups")
    .update({
      name: text(formData, "name"),
      min_select: Math.max(0, minSelect),
      max_select: Math.max(1, maxSelect),
      is_required: formData.get("isRequired") === "on",
      is_flavor_group: formData.get("isFlavorGroup") === "on",
    })
    .eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Grupo salvo.");
}

export async function createOptionValue(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const businessId = int(formData, "businessId");
  const optionGroupId = int(formData, "optionGroupId");
  const supabase = await clientFor(businessId);
  if (!supabase) return { error: NO_PERMISSION };

  const parsed = z
    .object({
      name: z.string().trim().min(1, "Informe o nome da opção.").max(60),
      deltaReais: z.coerce.number().min(-10000).max(10000),
    })
    .safeParse({
      name: formData.get("name"),
      deltaReais: formData.get("deltaReais") || 0,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!Number.isInteger(optionGroupId)) {
    return { error: "Grupo de opção inválido." };
  }

  const { data: existing } = await supabase
    .from("option_values")
    .select("sort_order")
    .eq("option_group_id", optionGroupId);

  const { error } = await supabase.from("option_values").insert({
    option_group_id: optionGroupId,
    name: parsed.data.name,
    // Em grupo comum é um acréscimo (negativo é legítimo: "sem borda" custa
    // menos). Em grupo de sabores (`is_flavor_group`) é o preço cheio do sabor;
    // a regra de cobrar o mais caro mora na vitrine e no `placeOrder`.
    price_delta_cents: Math.round(parsed.data.deltaReais * 100),
    sort_order: nextSortOrder((existing ?? []).map((row) => row.sort_order)),
  });

  if (error) return { error: friendly(error) };
  revalidateMenu(businessId);
  return { error: null };
}

export async function toggleOptionValue(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase
    .from("option_values")
    .update({ is_available: formData.get("value") === "true" })
    .eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith(
    formData.get("value") === "true" ? "Opção disponível." : "Opção pausada.",
  );
}

export async function deleteOptionValue(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase.from("option_values").delete().eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Opção excluída.");
}

/**
 * As três listas reordenáveis do editor (seções, grupos de opção e valores de
 * um grupo) e a coluna que diz de quem é cada linha.
 *
 * A coluna é derivada da tabela, não passada junto: `option_values` não tem
 * `business_id`, e a empresa vem do grupo — a action confere a cadeia antes de
 * chegar em `applyOrder`.
 */
type OrderScope = { table: "menu_categories" | "option_groups" | "option_values" };

type MenuClient = Awaited<ReturnType<typeof createClient>>;

/** Ids que a empresa (ou o grupo) pode reordenar. */
async function orderableIds(
  supabase: MenuClient,
  scope: OrderScope,
  value: number,
): Promise<{ id: number }[] | null> {
  if (scope.table === "option_values") {
    const { data } = await supabase
      .from("option_values")
      .select("id")
      .eq("option_group_id", value);
    return data;
  }
  if (scope.table === "menu_categories") {
    const { data } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("business_id", value);
    return data;
  }
  const { data } = await supabase
    .from("option_groups")
    .select("id")
    .eq("business_id", value);
  return data;
}

async function setSortOrder(
  supabase: MenuClient,
  scope: OrderScope,
  value: number,
  id: number,
  sortOrder: number,
): Promise<{ error: { code?: string; message: string } | null }> {
  if (scope.table === "option_values") {
    return supabase
      .from("option_values")
      .update({ sort_order: sortOrder })
      .eq("option_group_id", value)
      .eq("id", id);
  }
  if (scope.table === "menu_categories") {
    return supabase
      .from("menu_categories")
      .update({ sort_order: sortOrder })
      .eq("business_id", value)
      .eq("id", id);
  }
  return supabase
    .from("option_groups")
    .update({ sort_order: sortOrder })
    .eq("business_id", value)
    .eq("id", id);
}

/**
 * Grava a ordem vinda do editor, um `sort_order` por posição (1..N).
 *
 * Substitui a troca entre dois vizinhos porque essa troca depende de os dois
 * `sort_order` serem diferentes. Havia empate no dado legado (criado antes de
 * `nextSortOrder` existir) e o editor desempata por nome: a troca escrevia o
 * mesmo número nas duas linhas e a seta parecia quebrada. Reatribuir a lista
 * inteira também normaliza o dado legado na primeira movimentação.
 *
 * A lista vem inteira do editor, então a checagem é "todo id pertence a esta
 * empresa" — nunca "o cliente pediu exatamente este par".
 */
async function applyOrder(
  supabase: MenuClient,
  scope: OrderScope,
  owner: number,
  ids: number[],
): Promise<MenuActionResult | null> {
  if (ids.length === 0) return null;

  const owned = await orderableIds(supabase, scope, owner);
  const permitted = new Set((owned ?? []).map((row) => row.id));
  if (ids.length !== permitted.size || ids.some((id) => !permitted.has(id))) {
    return failWith(NO_PERMISSION);
  }

  // Um update por posição, todos em paralelo. `upsert` resolveria numa
  // requisição só, mas o tipo de inserção exige `name` e a coluna de dono, e
  // mandar dado que não mudou seria confiar no adiamento do NOT NULL do
  // Postgres — não vale a aposta por uma lista de meia dúzia.
  const results = await Promise.all(
    ids.map((id, index) => setSortOrder(supabase, scope, owner, id, index + 1)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return failWith(friendly(failed.error));
  return null;
}

/** Lê `ids` do form: lista de ids na nova ordem, separada por vírgula. */
function orderFromForm(formData: FormData): number[] {
  return text(formData, "ids")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

/**
 * Reordena os grupos de opção — é a ordem em que o cliente responde "Tamanho,
 * Borda, Molho, Extras" no pedido.
 */
export async function reorderOptionGroups(formData: FormData) {
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const reorderError = await applyOrder(
    supabase,
    { table: "option_groups" },
    businessId,
    orderFromForm(formData),
  );
  if (reorderError) return reorderError;
  revalidateMenu(businessId);
  return okWith("Ordem dos grupos salva.");
}

/**
 * Reordena as opções de um grupo.
 *
 * `option_values` não tem `business_id` — a empresa vem do grupo, então a
 * permissão é conferida (andando a cadeia) em vez de lida de uma coluna.
 */
export async function reorderOptionValues(formData: FormData) {
  const businessId = int(formData, "businessId");
  const optionGroupId = int(formData, "optionGroupId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);
  if (!Number.isInteger(optionGroupId)) return failWith("Grupo inválido.");

  const { data: group } = await supabase
    .from("option_groups")
    .select("id, business_id")
    .eq("id", optionGroupId)
    .maybeSingle();
  if (group?.business_id !== businessId) return failWith(NO_PERMISSION);

  const reorderError = await applyOrder(
    supabase,
    { table: "option_values" },
    optionGroupId,
    orderFromForm(formData),
  );
  if (reorderError) return reorderError;
  revalidateMenu(businessId);
  return okWith("Ordem das opções salva.");
}

export async function deleteOptionGroup(formData: FormData) {
  const id = int(formData, "id");
  const businessId = int(formData, "businessId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase.from("option_groups").delete().eq("id", id);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Grupo excluído.");
}

export async function linkProductToOptionGroup(formData: FormData) {
  const businessId = int(formData, "businessId");
  const optionGroupId = int(formData, "optionGroupId");
  const productId = int(formData, "productId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);
  if (!Number.isInteger(optionGroupId) || !Number.isInteger(productId)) {
    return failWith("Vínculo inválido.");
  }

  const { error } = await supabase
    .from("product_option_groups")
    .upsert({ product_id: productId, option_group_id: optionGroupId });
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Grupo vinculado ao item.");
}

export async function unlinkProductFromOptionGroup(formData: FormData) {
  const businessId = int(formData, "businessId");
  const optionGroupId = int(formData, "optionGroupId");
  const productId = int(formData, "productId");
  const supabase = await clientFor(businessId);
  if (!supabase) return failWith(NO_PERMISSION);

  const { error } = await supabase
    .from("product_option_groups")
    .delete()
    .eq("product_id", productId)
    .eq("option_group_id", optionGroupId);
  if (error) return failWith(friendly(error));

  revalidateMenu(businessId);
  return okWith("Grupo desvinculado do item.");
}
