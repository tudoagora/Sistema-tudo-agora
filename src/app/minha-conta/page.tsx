import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/minha-conta/actions";
import { BusinessAvatar } from "@/components/business-card";
import { listManagedBusinesses, requireUser } from "@/lib/auth";
import { supportLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: true },
};

const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  admin: "Administrador",
};

const button =
  "inline-flex min-h-11 items-center justify-center rounded-pill px-5 text-sm font-bold transition-opacity";

export default async function AccountPage() {
  const session = await requireUser("/minha-conta");
  const entries = await listManagedBusinesses(session);
  const user = session.user;
  const profile = session.profile;
  const role = profile?.role ?? "customer";

  const roleLabel =
    role === "merchant"
      ? "Conta de lojista"
      : role === "admin"
        ? "Administrador"
        : "Conta de cliente";

  // Só quem tem pelo menos uma empresa tem o que gerenciar. O admin cai no
  // ramo seguinte porque `/admin` não depende de `business_members`.
  const manages = entries.length > 0;
  const isAdmin = role === "admin";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800">
        Olá, {profile?.full_name ?? user.email}
      </h1>
      <p className="mt-2 text-texto-suave">
        {user.email} <span className="text-texto-tenue">• {roleLabel}</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {manages ? (
          <Link
            href="/painel"
            className={`${button} bg-marca-gradient text-white hover:opacity-90`}
          >
            Meu painel
          </Link>
        ) : null}
        {isAdmin ? (
          <Link
            href="/admin"
            className={`${button} bg-marca-gradient text-white hover:opacity-90`}
          >
            Painel administrativo
          </Link>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-black text-marca-800">Minhas empresas</h2>
        {entries.length === 0 ? (
          <p className="mt-4 rounded-card border border-dashed border-borda-forte bg-superficie p-8 text-center text-sm text-texto-suave">
            Você ainda não está ligado a nenhuma empresa. Anuncie a sua e
            apareça para toda a cidade.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map(({ memberRole, business }) => (
              <li
                key={business.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-borda bg-white p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BusinessAvatar
                    name={business.name}
                    logoUrl={business.logoUrl}
                    size={44}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-texto-forte">
                      {business.name}
                    </p>
                    <p className="text-xs text-texto-tenue">
                      {MEMBER_ROLE_LABELS[memberRole] ?? memberRole} ·{" "}
                      {business.cityName}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/painel/${business.id}` as never}
                    className={`${button} bg-marca-gradient px-4 text-white hover:opacity-90`}
                  >
                    Gerenciar
                  </Link>
                  <Link
                    href={`/cidades/${business.citySlug}/empresa/${business.slug}` as never}
                    className={`${button} border border-borda-forte px-4 font-semibold text-texto-suave hover:border-marca-600 hover:text-marca-800`}
                  >
                    Ver página
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-card border border-borda bg-white p-6">
        <h2 className="text-lg font-black text-marca-800">
          Trocar de conta
        </h2>
        <p className="mt-2 text-sm text-texto-suave">
          Sai desta conta para entrar com outro e-mail. Útil quando você
          administra mais de uma loja ou quer alternar entre lojista e
          administrador.
        </p>
        <form action={signOut} className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className={`${button} border border-borda-forte px-6 font-semibold text-texto-suave transition-colors hover:border-marca-600 hover:text-marca-800`}
          >
            Sair e entrar com outra conta
          </button>
          <Link
            href="/entrar"
            className={`${button} px-6 font-semibold text-marca-600 hover:underline`}
          >
            Ir para o login
          </Link>
        </form>
      </section>

      <section className="mt-10 rounded-card border border-borda bg-white p-6">
        <h2 className="text-lg font-black text-marca-800">
          Precisa de ajuda?
        </h2>
        <p className="mt-2 text-sm text-texto-suave">
          Fale com nosso time, é sem compromisso.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/planos"
            className={`${button} bg-marca-gradient px-5 text-white hover:opacity-90`}
          >
            Ver planos
          </Link>
          <a
            href={supportLink(
              "Olá! Preciso de ajuda com a minha conta no Tudo Agora.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={`${button} border border-borda-forte px-5 font-semibold text-texto-suave`}
          >
            Falar com o suporte
          </a>
        </div>
      </section>
    </div>
  );
}
