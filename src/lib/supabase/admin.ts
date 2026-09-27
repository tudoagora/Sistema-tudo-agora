import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Cliente com service_role — ignora RLS.
 * Usar SOMENTE em Route Handlers / Server Actions de servidor
 * (criação de pedido, webhooks de pagamento, jobs).
 * Nunca importar em Client Components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente — defina em .env.local (apenas servidor).",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
