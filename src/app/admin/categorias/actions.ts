"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type CategoryFormState = { error: string | null };

const schema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(80),
  parentId: z.number().int().positive().nullable(),
  imageUrl: z.string().trim().max(300),
});

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Rotas que leem a árvore: filtro da home, diretório e páginas de categoria. */
function revalidateCategorias() {
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/empresas/[id]", "page");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath("/cidades/[cidade]", "page");
  revalidatePath("/cidades/[cidade]/g/[grupo]", "page");
}

function friendly(error: { code: string; message: string }): string {
  if (error.code === "23505") return "Já existe uma categoria com esse slug.";
  if (error.code === "23503")
    return "A categoria principal informada não existe mais.";
  return error.message;
}

/**
 * Slug único a partir do nome. O slug é o endereço público (`/g/<slug>`), então
 * ele só é gerado na criação: renomear uma categoria não pode quebrar o link
 * que já está indexado.
 */
async function slugUnico(
  supabase: Cliente,
  base: string,
): Promise<string | null> {
  const raiz = base || "categoria";
  for (let sufixo = 1; sufixo <= 20; sufixo++) {
    const candidato = sufixo === 1 ? raiz : `${raiz}-${sufixo}`;
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", candidato)
      .maybeSingle();
    if (error) return null;
    if (!data) return candidato;
  }
  return null;
}

/**
 * Só existem dois níveis: a subcategoria aponta para uma principal. Uma
 * principal que virasse filha perderia o papel de raiz, então a action recusa
 * em vez de gravar uma árvore de três níveis que a interface não sabe mostrar.
 */
async function parentValido(
  supabase: Cliente,
  parentId: number | null,
  id?: number,
): Promise<boolean> {
  if (parentId == null) return true;
  if (id != null && parentId === id) return false;
  const { data, error } = await supabase
    .from("categories")
    .select("parent_id")
    .eq("id", parentId)
    .maybeSingle();
  if (error || !data) return false;
  return data.parent_id == null;
}

function lerFormulario(formData: FormData) {
  return {
    name: formData.get("name"),
    parentId: formData.get("parentId")
      ? Number(formData.get("parentId"))
      : null,
    imageUrl: formData.get("imageUrl") ?? "",
  };
}

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const parsed = schema.safeParse(lerFormulario(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!(await parentValido(supabase, parsed.data.parentId))) {
    return {
      error: "Subcategoria só pode ficar dentro de uma categoria principal.",
    };
  }

  const slug = await slugUnico(supabase, slugify(parsed.data.name));
  if (!slug) return { error: "Não foi possível gerar o endereço da categoria." };

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    slug,
    parent_id: parsed.data.parentId,
    image_url: parsed.data.imageUrl || null,
    is_active: true,
  });
  if (error) return { error: friendly(error) };

  revalidateCategorias();
  redirect("/admin/categorias?criada=1");
}

export async function updateCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    id: Number(formData.get("id")),
    ...lerFormulario(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!parsed.data.id) return { error: "Categoria inválida." };

  const supabase = await createClient();
  if (!(await parentValido(supabase, parsed.data.parentId, parsed.data.id))) {
    return {
      error: "Subcategoria só pode ficar dentro de uma categoria principal.",
    };
  }

  // `slug` fica de fora de propósito: ele é o endereço público e a busca já
  // indexou o texto antigo.
  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      parent_id: parsed.data.parentId,
      image_url: parsed.data.imageUrl || null,
      is_active: formData.get("isActive") === "on",
    })
    .eq("id", parsed.data.id);
  if (error) return { error: friendly(error) };

  revalidateCategorias();
  return { error: null };
}

export async function deleteCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Categoria inválida." };

  const supabase = await createClient();

  const { data: filhos, error: erroFilhos } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", id)
    .limit(1);
  if (erroFilhos) return { error: friendly(erroFilhos) };
  if (filhos?.length) {
    return { error: "Exclua as subcategorias antes de excluir a principal." };
  }

  // `business_categories` é on delete cascade: apagar a categoria desliga a
  // empresa dela. Recusamos enquanto houver vínculo, que é o que o admin
  // precisa ver antes de soltar o botão.
  const { count, error: erroCount } = await supabase
    .from("business_categories")
    .select("business_id", { count: "exact", head: true })
    .eq("category_id", id);
  if (erroCount) return { error: friendly(erroCount) };
  if (count) {
    return {
      error: `${count} ${
        count === 1 ? "empresa usa" : "empresas usam"
      } esta categoria. Desligue o vínculo em cada empresa antes de excluir.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: friendly(error) };

  revalidateCategorias();
  return { error: null };
}

/**
 * Grava a árvore inteira a partir do editor de arrasto: `ids` é a ordem de
 * exibição e `pais` o `parent_id` de cada uma, na mesma posição.
 *
 * A ordem é global (um `sort_order` só) e não por nível: assim a lista que o
 * editor envia já é a ordem da tela, sem renumerar dois grupos diferentes, e
 * cada subcategoria nasce colada na sua principal porque o editor só permite
 * dois níveis.
 */
export async function reorderCategories(formData: FormData) {
  await requireAdmin();

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((parte) => Number(parte.trim()))
    .filter((valor) => Number.isInteger(valor) && valor > 0);
  const pais = String(formData.get("pais") ?? "")
    .split(",")
    .map((parte) =>
      parte.trim() === "" || parte.trim() === "null" ? null : Number(parte.trim()),
    );

  if (ids.length === 0 || pais.length !== ids.length) return;
  if (pais.some((pai) => pai !== null && !(Number.isInteger(pai) && pai > 0))) {
    return;
  }

  const supabase = await createClient();
  // A lista vem inteira do editor, então a checagem é "todo id pertence à
  // tabela" — nunca "o cliente pediu exatamente este par".
  const { data: existentes, error: erroLeitura } = await supabase
    .from("categories")
    .select("id");
  if (erroLeitura) return;

  const conhecidos = new Set((existentes ?? []).map((linha) => linha.id));
  if (ids.length !== conhecidos.size || ids.some((id) => !conhecidos.has(id))) {
    return;
  }

  // Um update por posição, todos em paralelo. `upsert` resolveria numa
  // requisição só, mas o tipo de inserção exigiria `name` e `slug` vindo do
  // cliente; mandar só `sort_order` e `parent_id` é a parte barata de errar.
  const resultados = await Promise.all(
    ids.map((id, indice) =>
      supabase
        .from("categories")
        .update({ parent_id: pais[indice], sort_order: indice + 1 })
        .eq("id", id),
    ),
  );
  if (resultados.some((resultado) => resultado.error)) return;

  revalidateCategorias();
}

/** Liga/desliga a categoria sem sair da tela — mesmo caso da edição. */
export async function toggleCategory(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  const { data: atual, error: erroLeitura } = await supabase
    .from("categories")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();
  if (erroLeitura || !atual) return;

  await supabase
    .from("categories")
    .update({ is_active: !atual.is_active })
    .eq("id", id);

  revalidateCategorias();
}
