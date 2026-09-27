import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BusinessCard } from "@/components/business-card";
import {
  getCategoryBySlug,
  getCityBySlug,
  getGroupBySlug,
  listBusinesses,
  listBusinessesByCategory,
} from "@/lib/catalog";

/** A rota aceita o slug do grupo ("comida") ou o da categoria ("pizzas"). */
async function resolveScope(slug: string) {
  const group = await getGroupBySlug(slug);
  if (group) return { kind: "group" as const, group, category: null };
  const category = await getCategoryBySlug(slug);
  if (category) return { kind: "category" as const, group: null, category };
  return null;
}

export async function generateMetadata(
  props: PageProps<"/cidades/[cidade]/g/[grupo]">,
): Promise<Metadata> {
  const { cidade, grupo } = await props.params;
  const [city, scope] = await Promise.all([
    getCityBySlug(cidade),
    resolveScope(grupo),
  ]);
  if (!city || !scope) return { title: "Página não encontrada" };

  const label = scope.group?.name ?? scope.category?.name;
  return {
    title: `${label} em ${city.name} - ${city.state}`,
    description: `Empresas de ${label} em ${city.name} - ${city.state}.`,
    alternates: { canonical: `/cidades/${city.slug}/g/${grupo}` },
  };
}

export default async function GroupPage(
  props: PageProps<"/cidades/[cidade]/g/[grupo]">,
) {
  const { cidade, grupo } = await props.params;
  const [city, scope] = await Promise.all([
    getCityBySlug(cidade),
    resolveScope(grupo),
  ]);
  if (!city || !scope) notFound();

  const label = scope.group?.name ?? scope.category?.name ?? grupo;
  const businesses =
    scope.kind === "group"
      ? await listBusinesses(city.id, [scope.group!.slug])
      : await listBusinessesByCategory(scope.category!.id, city.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
        {label} em {city.name}
      </h1>
      <p className="mt-2 text-texto-suave">
        {businesses.length}{" "}
        {businesses.length === 1 ? "empresa encontrada" : "empresas encontradas"}.
      </p>

      {businesses.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
          Nenhuma empresa em {label} aqui em {city.name} ainda.
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
    </div>
  );
}
