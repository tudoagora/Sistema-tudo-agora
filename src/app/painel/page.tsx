import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { BusinessAvatar } from "@/components/business-card";
import { listManagedBusinesses, requireUser } from "@/lib/auth";
import {
  businessStatusClass,
  businessStatusLabel,
} from "@/lib/business-status";

export const metadata: Metadata = {
  title: "Minhas empresas",
  description: "Gerencie o cardápio e os pedidos das suas empresas no Tudo Agora.",
};

export default async function PanelPage(props: PageProps<"/painel">) {
  const session = await requireUser("/painel");
  const entries = await listManagedBusinesses(session);
  const { erro } = await props.searchParams;

  return (
    <>
      <p className="text-sm font-semibold text-texto-suave">
        Olá, {session.profile?.full_name ?? session.user.email}
      </p>
      <h1 className="mt-1 text-2xl font-black text-marca-800">Minhas empresas</h1>

      {erro === "empresa" ? (
        <p
          role="alert"
          className="mt-4 rounded-card border border-erro/30 bg-erro/5 px-4 py-3 text-sm font-semibold text-erro-700"
        >
          Você não gerencia essa empresa.
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-borda-forte bg-white p-10 text-center">
          <p className="text-sm font-bold text-texto-forte">
            Nenhuma empresa no seu painel ainda.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-texto-suave">
            O acesso é liberado pela equipe do Tudo Agora. Se você é lojista e
            ainda não tem acesso, fale com a gente.
          </p>
          <Link
            href="/minha-conta"
            className="mt-5 inline-flex min-h-10 items-center rounded-pill border border-borda-forte px-5 text-sm font-bold text-texto-suave hover:border-marca-600 hover:text-marca-800"
          >
            Ver minha conta
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {entries.map(({ business, memberRole }) => {
            const statusClass = businessStatusClass(business.status);

            return (
              <li key={business.id}>
                <Link
                  href={`/painel/${business.id}` as Route}
                  className="flex items-center gap-4 rounded-card border border-borda bg-white p-4 transition-shadow hover:shadow-card"
                >
                  <BusinessAvatar
                    name={business.name}
                    logoUrl={business.logoUrl}
                    size={56}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-texto-forte">
                      {business.name}
                    </p>
                    <p className="truncate text-xs text-texto-tenue">
                      {business.cityName}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-pill px-2 py-0.5 text-xs font-bold ${statusClass}`}
                      >
                        {businessStatusLabel(business.status)}
                      </span>
                      <span className="rounded-pill bg-superficie-2 px-2 py-0.5 text-xs font-semibold text-texto-suave">
                        {memberRole === "admin"
                          ? "administrador"
                          : memberRole === "owner"
                            ? "responsável"
                            : "gerente"}
                      </span>
                    </div>
                  </div>
                  <span aria-hidden="true" className="text-texto-tenue">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
