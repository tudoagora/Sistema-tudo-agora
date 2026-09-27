"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAnyUser } from "@/lib/first-run";
import { createAdminClient } from "@/lib/supabase/admin";

export type FirstRunState = { error: string | null; ok: boolean };

const schema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres."),
});

/**
 * Cria a conta de administrador da instalação.
 *
 * Só funciona enquanto não existir nenhum usuário: a checagem acontece aqui,
 * no servidor, com `service_role` — nunca no formulário. Depois que a conta
 * existe, esta rota morre sozinha e o acesso passa a ser por `/entrar`.
 */
export async function createFirstAdmin(
  _prev: FirstRunState,
  formData: FormData,
): Promise<FirstRunState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", ok: false };
  }

  if (await hasAnyUser()) {
    return {
      error: "Já existe uma conta neste sistema. Entre pelo botão de acesso.",
      ok: false,
    };
  }

  const admin = await createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Não foi possível criar a conta.", ok: false };
  }

  // O trigger handle_new_user() cria o perfil como 'customer'.
  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", data.user.id);
  if (promoteError) {
    return { error: promoteError.message, ok: false };
  }

  redirect("/entrar?primeiroAcesso=1");
}
