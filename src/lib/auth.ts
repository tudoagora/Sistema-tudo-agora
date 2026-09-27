import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type AppRole = "customer" | "merchant" | "admin";

export type Session = {
  user: User;
  profile: { id: string; full_name: string | null; role: AppRole } | null;
};

/**
 * Sessão do visitante + papel no Tudo Agora.
 *
 * A sessão vem do cookie HttpOnly gerado pelo `@supabase/ssr`; o papel vem de
 * `profiles.role`, preenchido pelo trigger `handle_new_user()` no banco. Por
 * isso `auth.getUser()` (que valida o token no servidor) e não `getSession()`
 * (que só lê o cookie) — nunca confiar no cookie sozinho.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    user: data.user,
    profile: profile
      ? {
          id: profile.id,
          full_name: profile.full_name,
          role: (profile.role as AppRole) ?? "customer",
        }
      : null,
  };
});

/** Exige usuário autenticado. Sem sessão, manda para o login. */
export async function requireUser(returnTo?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/entrar${next}` as Route);
  }
  return session;
}

/** Exige perfil de administrador. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser("/admin");
  if (session.profile?.role !== "admin") redirect("/minha-conta?erro=permissao");
  return session;
}

/* ------------------------------------------------------------------ */
/* Área do lojista (/painel)                                            */
/* ------------------------------------------------------------------ */

export type MemberRole = "owner" | "manager";

export type ManagedBusiness = {
  id: number;
  name: string;
  slug: string;
  /** Link próprio de `/cardapio/[slug]`, quando a empresa definiu um. */
  customSlug: string | null;
  logoUrl: string | null;
  status: string;
  citySlug: string;
  cityName: string;
};

/** `memberRole` distingue o vínculo real de quem entra só por ser admin. */
export type ManagedEntry = {
  memberRole: MemberRole | "admin";
  business: ManagedBusiness;
};

function toManaged(value: unknown): ManagedBusiness | null {
  if (value == null) return null;
  const raw = (Array.isArray(value) ? value[0] : value) as
      | {
          id?: unknown;
          name?: unknown;
          slug?: unknown;
          custom_slug?: unknown;
          logo_url?: unknown;
          status?: unknown;
          cities?: unknown;
        }
    | null;
  if (!raw) return null;

  const city = raw.cities == null
    ? null
    : (Array.isArray(raw.cities) ? raw.cities[0] : raw.cities) as
        | { slug?: unknown; name?: unknown; state?: unknown }
        | null;

  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    customSlug: (raw.custom_slug as string | null) ?? null,
    logoUrl: (raw.logo_url as string | null) ?? null,
    status: String(raw.status ?? "draft"),
    citySlug: city ? String(city.slug ?? "") : "",
    cityName: city
      ? `${String(city.name ?? "")} - ${String(city.state ?? "")}`
      : "",
  };
}

const BUSINESS_SELECT =
  "id, name, slug, custom_slug, logo_url, status, cities!inner(slug, name, state)";

/**
 * Empresas que o usuário administra, como `business_members`.
 *
 * O admin não tem linha em `business_members`, então entra por um ramo
 * próprio — sem isso, `/painel` ficaria vazio justamente para quem mais
 * precisa enxergar todas as empresas.
 */
export const listManagedBusinesses = cache(
  async (session: Session): Promise<ManagedEntry[]> => {
    const supabase = await createClient();
    const isAdmin = session.profile?.role === "admin";

    if (isAdmin) {
      const { data } = await supabase
        .from("businesses")
        .select(BUSINESS_SELECT)
        .order("name");
      return (data ?? [])
        .map((row): ManagedEntry | null => {
          const business = toManaged(row);
          return business ? { memberRole: "admin", business } : null;
        })
        .filter((entry): entry is ManagedEntry => entry !== null);
    }

    const { data } = await supabase
      .from("business_members")
      .select(`role, businesses!inner(${BUSINESS_SELECT})`)
      .eq("user_id", session.user.id);

    return (data ?? [])
      .map((row): ManagedEntry | null => {
        const business = toManaged(row.businesses);
        return business
          ? { memberRole: (row.role as MemberRole) ?? "manager", business }
          : null;
      })
      .filter((entry): entry is ManagedEntry => entry !== null);
  },
);

/**
 * Exige que o usuário gerencie a empresa informada.
 *
 * A checagem é feita deixando o RLS decidir: `businesses_manage_read` só
 * devolve a linha para quem está em `business_members` ou é admin, então um
 * `maybeSingle()` vazio já é a resposta "não". Nenhuma subquery de
 * `business_id` é escrita aqui — a fonte da verdade é a policy, igual em
 * toda a migration 0003.
 */
export const requireBusinessMember = cache(
  async (businessId: number): Promise<{ session: Session; business: ManagedBusiness; memberRole: MemberRole | "admin" }> => {
    const session = await requireUser(`/painel/${businessId}`);
    if (!Number.isInteger(businessId)) redirect("/painel?erro=empresa");

    const supabase = await createClient();
    const { data } = await supabase
      .from("businesses")
      .select(`${BUSINESS_SELECT}, business_members!inner(role)`)
      .eq("id", businessId)
      .maybeSingle();

    const business = toManaged(data);
    if (!business) redirect("/painel?erro=empresa");

    const members = (data as { business_members?: unknown }).business_members;
    const first = (Array.isArray(members) ? members[0] : members) as
      | { role?: unknown }
      | null;
    const memberRole =
      (first?.role as MemberRole | undefined) ??
      (session.profile?.role === "admin" ? "admin" : "manager");

    return { session, business, memberRole };
  },
);

