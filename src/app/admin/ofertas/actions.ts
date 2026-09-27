"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function deleteOffer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  await supabase.from("offers").delete().eq("id", id);

  revalidatePath("/admin/ofertas");
  revalidatePath("/ofertas");
}
