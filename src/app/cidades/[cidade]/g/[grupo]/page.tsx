import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessGrid } from "@/components/business-grid";
import {
  getCategoryBySlug,
  getCityBySlug,
  listBusinesses,
  listSubcategories,
} from "@/lib/catalog";

/**
 * A rota resolve o slug na árvore inteira — a principal ("comida") ou uma
 * subcategoria ("pizzas"). O RPC já consideram as duas coisas ao filtrar
 * (`coalesce(pai, categoria)` no grupo e o slug exato na subcategoria), então
 * um único `listBusinesses` cobre os dois casos.
 */
async function listScopeBusinesses(cityId: number, slug: string) {
  return listBusinesses(cityId, [slug], { categorySlugs: [slug] });
}

export async function generateMetadata(
  props: PageProps<"/cidades/[cidade]/g/[grupo]">,
): Promise<Metadata> {
  const { cidade, grupo } = await props.params;
  const [city, scope] = await Promise.all([
    getCityBySlug(cidade),
    getCategoryBySlug(grupo),
  ]);
  if (!city || !scope) return { title: "Página não encontrada" };

  return {
    title: `${scope.name} em ${city.name} - ${city.state}`,
    description: `Empresas de ${scope.name} em ${city.name} - ${city.state}.`,
    alternates: { canonical: `/cidades/${city.slug}/g/${grupo}` },
  };
}

export default async function GroupPage(
  props: PageProps<"/cidades/[cidade]/g/[grupo]">,
) {
  const { cidade, grupo } = await props.params;
  const [city, scope] = await Promise.all([
    getCityBySlug(cidade),
    getCategoryBySlug(grupo),
  ]);
  if (!city || !scope) notFound();

  const [businesses, filhas] = await Promise.all([
    listScopeBusinesses(city.id, scope.slug),
    scope.parentId ? listSubcategories(scope.parentId) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
        {scope.name} em {city.name}
      </h1>
      <p className="mt-2 text-texto-suave">
        {businesses.length}{" "}
        {businesses.length === 1 ? "empresa encontrada" : "empresas encontradas"}.
      </p>

      {filhas.length > 0 ? (
        <nav aria-label="Subcategorias" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {filhas.map((filha) => (
              <li key={filha.slug}>
                <Link
                  href={`/cidades/${city.slug}/g/${filha.slug}`}
                  className="inline-flex min-h-11 items-center rounded-pill bg-superficie-2 px-4 text-sm font-semibold text-texto-suave transition-colors hover:bg-marca-100 hover:text-marca-800"
                >
                  {filha.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {businesses.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
          Nenhuma empresa em {scope.name} aqui em {city.name} ainda.
        </p>
      ) : (
        <BusinessGrid businesses={businesses} citySlug={city.slug} />
      )}
    </div>
  );
}
