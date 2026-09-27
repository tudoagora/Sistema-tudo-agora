"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Encerra a sessão.
 *
 * `signOut()` limpa os cookies pelo `setAll` do `createServerClient`. Se
 * falhar (token já expirado, por exemplo) o redirect acontece do mesmo jeito:
 * o usuário estava na tela de conta logado, e o que ele quer é sair.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar?saiu=1");
}
