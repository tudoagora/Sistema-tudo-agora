"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function deleteOffer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  // O resultado era engolido e a listagem revalidava como se a exclusão tivesse
  // dado certo — a oferta sumia da tela e voltava no próximo load. Como o
  // botão é um form sem `useActionState`, a falha volta pela query string.
  const { error, count } = await supabase
    .from("offers")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error("[deleteOffer] falha ao excluir", { id, error });
    redirect("/admin/ofertas?erro=excluir-oferta");
  }
  if (!count) {
    redirect("/admin/ofertas?erro=oferta-inexistente");
  }

  revalidatePath("/admin/ofertas");
  revalidatePath("/ofertas");
  redirect("/admin/ofertas?feito=oferta-excluida");
}
