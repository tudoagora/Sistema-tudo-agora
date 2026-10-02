import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import type { Database } from "./database.types";

/**
 * Cliente do request, um só.
 *
 * `cache()` memoiza por renderização: a home chama `listCities`,
 * `listGroups`, `listBusinesses`... e cada uma delas abria o seu cliente — ou
 * seja, cada uma chamava `cookies()` e montava um `createServerClient`
 * separado. O `cookies()` é o mesmo, mas o `await` dele e a construção do
 * cliente entram na conta de cada função de dados. Com o memo, quem pede duas
 * vezes recebe a mesma instância.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado de um Server Component: o proxy já reflete o refresh.
          }
        },
      },
    },
  );
});
