import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listGroups } from "@/lib/catalog";
import { getCityBySlug } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export async function generateMetadata(
  props: PageProps<"/cidades/[cidade]">,
): Promise<Metadata> {
  const { cidade } = await props.params;
  const city = await getCityBySlug(cidade);
  if (!city) return { title: "Cidade não encontrada" };

  return {
    title: `Tudo Agora em ${city.name} - ${city.state}`,
    description: `Lojas, serviços e restaurantes de ${city.name} - ${city.state}. Comida, farmácia, utilidades e muito mais.`,
    alternates: { canonical: `/cidades/${city.slug}` },
  };
}

export default async function CityPage(props: PageProps<"/cidades/[cidade]">) {
  const { cidade } = await props.params;
  const city = await getCityBySlug(cidade);
  if (!city) notFound();

  const groups = await listGroups();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
        {city.name} - {city.state}
      </h1>
      <p className="mt-2 max-w-2xl text-texto-suave">
        Tudo o que você procura em {city.name}, mais perto de você. Escolha uma
        categoria para ver as empresas disponíveis.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <li key={group.slug}>
            <Link
              href={`/cidades/${city.slug}/g/${group.slug}`}
              className="flex items-center gap-4 rounded-card border border-borda bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <span className="grid h-12 w-12 place-items-center rounded-logo bg-marca-100 text-lg font-bold text-marca-800">
                {group.name.charAt(0)}
              </span>
              <span className="text-sm font-bold text-marca-800">{group.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-sm text-texto-tenue">
        Não encontra o que procura? <Link href="/planos" className="font-semibold text-marca-600 underline">Anuncie sua empresa</Link> ou fale com a gente pelo{" "}
        {siteConfig.phoneDisplay}.
      </p>
    </div>
  );
}
