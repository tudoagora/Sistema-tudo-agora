"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { AD_LIMIT_KEY, AD_PLACEMENT } from "@/lib/banners";
import { createClient } from "@/lib/supabase/server";
import { AD_LIMIT_OPTIONS } from "./state";

type Cliente = Awaited<ReturnType<typeof createClient>>;

function texto(valor: FormDataEntryValue | null) {
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Reordenar reescreve a sequência inteira em vez de trocar dois `sort_order`.
 * A troca funciona enquanto os números forem distintos, mas assim que dois
 * banners dividem o mesmo valor a troca deixa de mover alguém, e o sintoma é
 * "o botão não faz nada". Reescrever 1..n na ordem da lista nunca entra nesse
 * estado.
 *
 * São uma escrita por linha de propósito: a lista tem poucas peças e um
 * `upsert` exigiria mandar a linha inteira de cada banner (o `ON CONFLICT` do
 * PostgREST sobrescreve com o que veio, então `is_active` e `link_url` sem
 * valor aqui zerariam o cadastro).
 */
async function reordenar(supabase: Cliente, ordem: number[]) {
  for (const [indice, id] of ordem.entries()) {
    const { error } = await supabase
      .from("banners")
      .update({ sort_order: indice + 1 })
      .eq("id", id)
      .eq("placement", AD_PLACEMENT);
    if (error) throw error;
  }
}

/** Só o que a tela precisa ler: a fila inteira, sem o corte do carrossel. */
async function lerFila() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("id")
    .eq("placement", AD_PLACEMENT)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("[banners] falha ao ler a fila", { error });
    return null;
  }
  return { supabase, ids: (data ?? []).map((row) => Number(row.id)) };
}

/**
 * Cria ou atualiza um banner.
 *
 * O mesmo form serve para os dois casos e o que decide é o `id`: um segundo
 * conjunto de campos "criar" e "editar" para os mesmos dados desandaria junto
 * com a validação. `sort_order` não vem do form — um banner novo entra no fim
 * da fila, e mover de posição é o botão de cima/baixo.
 */
export async function saveBanner(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = Number(texto(formData.get("id")));
  const payload = {
    title: texto(formData.get("title")),
    image_url: texto(formData.get("imageUrl")),
    link_url: texto(formData.get("linkUrl")) || "/planos",
    is_active: formData.get("isActive") === "on",
  };

  // Sem imagem a peça não tem o que mostrar, então a faixa a ignora. Deixar
  // salvar deixaria um cadastro que some sozinho — e o admin culparia a home.
  if (!payload.image_url) redirect("/admin/banners?erro=salvar-banner");

  if (Number.isInteger(id) && id > 0) {
    const { error, count } = await supabase
      .from("banners")
      .update(payload, { count: "exact" })
      .eq("id", id)
      .eq("placement", AD_PLACEMENT);

    if (error) {
      console.error("[saveBanner] falha ao atualizar", { id, error });
      redirect("/admin/banners?erro=salvar-banner");
    }
    if (!count) redirect("/admin/banners?erro=banner-inexistente");

    revalidatePath("/admin/banners");
    revalidatePath("/");
    redirect("/admin/banners?feito=banner-salvo");
  }

  const fila = await lerFila();
  if (!fila) redirect("/admin/banners?erro=salvar-banner");

  const { error } = await supabase.from("banners").insert({
    ...payload,
    business_id: null,
    placement: AD_PLACEMENT,
    sort_order: fila.ids.length + 1,
  });

  if (error) {
    console.error("[saveBanner] falha ao criar", { error });
    redirect("/admin/banners?erro=salvar-banner");
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?feito=banner-criado");
}

/** Sobe ou desce um banner de uma posição. */
export async function moveBanner(formData: FormData) {
  await requireAdmin();

  const id = Number(texto(formData.get("id")));
  const direcao = texto(formData.get("direcao"));
  if (!Number.isInteger(id) || (direcao !== "up" && direcao !== "down")) {
    redirect("/admin/banners?erro=ordenar-banner");
  }

  const fila = await lerFila();
  if (!fila) redirect("/admin/banners?erro=ordenar-banner");

  const { supabase, ids } = fila;
  const atual = ids.indexOf(id);
  if (atual === -1) redirect("/admin/banners?erro=banner-inexistente");

  const vizinho = direcao === "up" ? atual - 1 : atual + 1;
  // Já está no topo (ou na base): não é erro, é o botão sem efeito. Redirecionar
  // com `feito` mantém a posição do scroll da lista.
  if (vizinho < 0 || vizinho >= ids.length) {
    redirect("/admin/banners?feito=banner-ordenado");
  }

  const nova = [...ids];
  nova[atual] = ids[vizinho];
  nova[vizinho] = ids[atual];

  try {
    await reordenar(supabase, nova);
  } catch (error) {
    console.error("[moveBanner] falha ao reordenar", { id, direcao, error });
    redirect("/admin/banners?erro=ordenar-banner");
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?feito=banner-ordenado");
}

export async function deleteBanner(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = Number(texto(formData.get("id")));
  if (!Number.isInteger(id)) redirect("/admin/banners?erro=excluir-banner");

  const { error, count } = await supabase
    .from("banners")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("placement", AD_PLACEMENT);

  if (error) {
    console.error("[deleteBanner] falha ao excluir", { id, error });
    redirect("/admin/banners?erro=excluir-banner");
  }
  if (!count) redirect("/admin/banners?erro=banner-inexistente");

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?feito=banner-excluido");
}

/**
 * Quantos banners a home mostra de uma vez.
 *
 * A faixa é uma peça só na tela, então o número é sempre um valor de lista
 * fechado: valida contra `AD_LIMIT_OPTIONS` em vez de confiar no texto — o
 * `<select>` valida no navegador, um POST direto não.
 */
export async function saveAdLimit(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const limite = Number(texto(formData.get("limite")));
  if (!AD_LIMIT_OPTIONS.includes(limite)) {
    redirect("/admin/banners?erro=salvar-limite-banner");
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: AD_LIMIT_KEY, value: String(limite) });

  if (error) {
    console.error("[saveAdLimit] falha ao salvar o limite", { limite, error });
    redirect("/admin/banners?erro=salvar-limite-banner");
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?feito=banner-limite-salvo");
}
