"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.coerce.number().int().positive(),
  priceReais: z.coerce.number().min(0).max(100000),
  monthlyEquivalentReais: z.coerce.number().min(0).max(10000),
  isFeatured: z.boolean(),
});

/** A landing /planos vendia 3 planos que não existiam no banco. Aqui eles passam a existir. */
export async function updatePlan(formData: FormData) {
  await requireAdmin();

  const parsed = schema.safeParse({
    id: formData.get("id"),
    priceReais: formData.get("priceReais") || 0,
    monthlyEquivalentReais: formData.get("monthlyEquivalentReais") || 0,
    isFeatured: formData.get("isFeatured") === "on",
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  // Preço de plano é o número que o cliente vê na landing. A escrita devolvia
  // o erro para o vazio e a tela revalidava, então o admin via o valor novo,
  // saía da página e o preço antigo continuava no ar.
  const { error } = await supabase
    .from("plans")
    .update({
      price_cents: Math.round(parsed.data.priceReais * 100),
      monthly_equivalent_cents: Math.round(parsed.data.monthlyEquivalentReais * 100),
      is_featured: parsed.data.isFeatured,
    })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[updatePlan] falha ao salvar", { id: parsed.data.id, error });
    redirect("/admin/planos?erro=salvar-plano");
  }


  revalidatePath("/admin/planos");
  revalidatePath("/planos");
  revalidatePath("/admin");
}
