import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BusinessCard } from "@/components/business-card";
import { GroupFilter } from "@/components/home/group-filter";
import { getCurrentCity } from "@/lib/city";
import {
  listBusinesses,
  listCategoryCounts,
  listGroups,
  listSubcategories,
} from "@/lib/catalog";

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
  const categoryParam =
    typeof params.categoria === "string" ? params.categoria : null;
  const page = Math.max(1, Number(params.pagina) || 1);

  const city = await getCurrentCity();
  const [groups, subcategories, counts] = await Promise.all([
    listGroups(),
    listSubcategories(),
    listCategoryCounts(city.id),
  ]);

  // Resolvemos contra a árvore: query string antiga não pode virar 404 nem
  // página vazia.
  const activeGroup = groups.find((g) => g.slug === groupParam)?.slug ?? null;
  const activeCategory =
    activeGroup && subcategories.some((c) => c.slug === categoryParam)
      ? categoryParam
      : null;

  const businesses = await listBusinesses(
    city.id,
    activeGroup ? [activeGroup] : null,
    {
      categorySlugs: activeCategory ? [activeCategory] : null,
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    },
  );

  const total = activeCategory
    ? (counts.categories[activeCategory] ?? 0)
    : activeGroup
      ? (counts.groups[activeGroup] ?? 0)
      : counts.total;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
        Lojas e serviços em {city.name}
      </h1>
      <p className="mt-2 text-texto-suave">
        {total} {total === 1 ? "empresa cadastrada" : "empresas cadastradas"}.
      </p>

      <div className="mt-8">
        <Suspense fallback={null}>
          <GroupFilter
            groups={groups}
            subcategories={subcategories}
            counts={{ groups: counts.groups, categories: counts.categories }}
          />
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
              if (activeGroup) search.set("grupo", activeGroup);
              if (activeCategory) search.set("categoria", activeCategory);
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
