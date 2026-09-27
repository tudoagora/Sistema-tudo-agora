import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Já existe alguma conta neste sistema?
 *
 * A rota `/primeiro-acesso` se auto-destrói depois do primeiro cadastro, e
 * essa checagem precisa acontecer no servidor com `service_role` — se
 *dependesse da RLS, um anônimo veria zero linhas mesmo com usuários
 * cadastrados, e a página ficaria aberta para sempre.
 */
export async function hasAnyUser(): Promise<boolean> {
  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1, page: 1 });
  if (error) {
    throw new Error(`Falha ao consultar usuários: ${error.message}`);
  }
  return (data.users?.length ?? 0) > 0;
}
