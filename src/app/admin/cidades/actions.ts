"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type CityFormState = { error: string | null };

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da cidade.").max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Use a sigla do estado, ex.: MT"),
  timezone: z.string().trim().min(3).max(60).default("America/Sao_Paulo"),
});

export async function deleteCity(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  // `businesses.city_id` é on delete restrict: a cidade não some se houver
  // empresa ligada nela, e o banco devolve o erro em vez de apagar em cascade.
  await supabase.from("cities").delete().eq("id", id);
  revalidatePath("/admin/cidades");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/loja");
}

export async function createCity(
  _prev: CityFormState,
  formData: FormData,
): Promise<CityFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    name: formData.get("name"),
    state: formData.get("state"),
    timezone: formData.get("timezone") || "America/Sao_Paulo",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const slug = `${slugify(parsed.data.name)}-${parsed.data.state.toLowerCase()}`;

  const supabase = await createClient();
  const { error } = await supabase.from("cities").insert({
    name: parsed.data.name,
    state: parsed.data.state,
    slug,
    timezone: parsed.data.timezone,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma cidade com esse nome e estado."
          : error.message,
    };
  }

  revalidatePath("/admin/cidades");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin/cidades?criada=1");
}
