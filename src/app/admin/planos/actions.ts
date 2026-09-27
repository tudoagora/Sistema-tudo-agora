"use server";

import { revalidatePath } from "next/cache";
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
  await supabase
    .from("plans")
    .update({
      price_cents: Math.round(parsed.data.priceReais * 100),
      monthly_equivalent_cents: Math.round(parsed.data.monthlyEquivalentReais * 100),
      is_featured: parsed.data.isFeatured,
    })
    .eq("id", parsed.data.id);

  revalidatePath("/admin/planos");
  revalidatePath("/planos");
  revalidatePath("/admin");
}
