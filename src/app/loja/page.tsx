import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BusinessCard } from "@/components/business-card";
import { GroupFilter } from "@/components/home/group-filter";
import { getCurrentCity } from "@/lib/city";
import { listBusinesses, listGroups } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Lojas e serviços",
  description:
    "O diretório completo de lojas, restaurantes, clínicas e prestadores de serviço da sua cidade.",
  alternates: { canonical: "/loja" },
};

const PER_PAGE = 24;

export default async function StorePage(props: PageProps<"/loja">) {
  const params = await props.searchParams;
  const groupParam = typeof params.grupo === "string" ? params.grupo : null;
  const page = Math.max(1, Number(params.pagina) || 1);

  const city = await getCurrentCity();
  const [groups, businesses] = await Promise.all([
    listGroups(),
    listBusinesses(
      city.id,
      groupParam ? [groupParam] : null,
      { limit: PER_PAGE, offset: (page - 1) * PER_PAGE },
    ),
  ]);

  const counts: Record<string, number> = {};
  const [all, ...perGroup] = await Promise.all([
    listBusinesses(city.id, null, { limit: 1000 }),
    ...groups.map((g) => listBusinesses(city.id, [g.slug], { limit: 1000 })),
  ]);
  counts["todas"] = all.length;
  groups.forEach((group, index) => {
    counts[group.slug] = perGroup[index]?.length ?? 0;
  });

  const total = groupParam ? (counts[groupParam] ?? 0) : counts["todas"];
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
        Lojas e serviços em {city.name}
      </h1>
      <p className="mt-2 text-texto-suave">
        {total} {total === 1 ? "empresa cadastrada" : "empresas cadastradas"}.
      </p>

      <nav aria-label="Categorias" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <li key={group.slug}>
              <Link
                href={`/cidades/${city.slug}/g/${group.slug}`}
                className="inline-flex min-h-11 items-center rounded-pill bg-superficie-2 px-4 text-sm font-semibold text-texto-suave transition-colors hover:bg-marca-100 hover:text-marca-800"
              >
                {group.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">
        <Suspense fallback={null}>
          <GroupFilter groups={groups} counts={counts} />
        </Suspense>
      </div>

      {businesses.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
          Nenhuma empresa encontrada nesta categoria em {city.name}.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <li key={business.id} className="h-full">
              <BusinessCard business={business} citySlug={city.slug} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Paginação"
          className="mt-12 flex items-center justify-center gap-2"
        >
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (n) => {
              const search = new URLSearchParams();
              if (groupParam) search.set("grupo", groupParam);
              if (n > 1) search.set("pagina", String(n));
              const query = search.toString();
              return (
                <Link
                  key={n}
                  href={query ? `/loja?${query}` : "/loja"}
                  aria-current={n === page ? "page" : undefined}
                  className={`grid h-11 w-11 place-items-center rounded-pill text-sm font-bold ${
                    n === page
                      ? "bg-marca-800 text-white"
                      : "bg-superficie-2 text-texto-suave hover:bg-marca-100"
                  }`}
                >
                  {n}
                </Link>
              );
            },
          )}
        </nav>
      ) : null}
    </div>
  );
}
