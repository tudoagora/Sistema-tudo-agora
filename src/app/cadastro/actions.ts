"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNext } from "@/lib/next-redirect";
import { siteConfig } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  /** A conta foi criada mas o GoTrue exigiu confirmar o e-mail antes de entrar. */
  confirmationRequired: boolean;
};

const schema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    .max(72, "A senha precisa de no máximo 72 caracteres."),
});

/**
 * Cadastro público.
 *
 * Usa `signUp` do cliente da sessão, e não `auth.admin.createUser`: a conta
 * entra como `customer` (papel do trigger `handle_new_user`) e nunca passa por
 * `service_role`. Virar lojista é decisão do admin em /admin/usuarios — o
 * formulário público não aceita campo de papel, senão qualquer visitor se
 * autodeclaria lojista.
 */
export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      fieldErrors,
      confirmationRequired: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteConfig.url}/minha-conta`,
    },
  });

  if (error) {
    const mensagem = /already (been )?registered|already exists/i.test(
      error.message,
    )
      ? "Já existe uma conta com esse e-mail. Tente entrar."
      : error.message;
    return {
      error: mensagem,
      fieldErrors: { email: mensagem },
      confirmationRequired: false,
    };
  }

  // Sem sessão = o projeto está com "confirmar e-mail" ligado no GoTrue. A
  // conta existe, mas não há cookie: mandar para /minha-conta mostraria a tela
  // de login de novo sem explicar por quê.
  if (!data.session) {
    return { error: null, fieldErrors: {}, confirmationRequired: true };
  }

  redirect(safeNext(String(formData.get("next") ?? "")));
}