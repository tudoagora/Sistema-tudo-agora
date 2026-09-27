import Link from "next/link";
import { Suspense } from "react";

import { BusinessAvatar, BusinessCard } from "@/components/business-card";
import { CategoryGrid } from "@/components/home/category-grid";
import { GroupFilter } from "@/components/home/group-filter";
import { HeroSlider, type HeroSlide } from "@/components/home/hero-slider";
import { LiveSearch } from "@/components/home/search-box";
import {
  listBusinesses,
  listFeaturedBusinesses,
  listGroups,
} from "@/lib/catalog";
import { getCurrentCity } from "@/lib/city";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

function buildSlides(citySlug: string): HeroSlide[] {
  return [
    {
      id: "geral",
      title: "Tudo o que você procura, mais perto de você",
      subtitle: "Lojas, serviços e restaurantes da sua cidade em um só lugar.",
      ctaLabel: "Explorar agora",
      href: "#descubra",
      desktop: "/banners/geral-desktop.webp",
      mobile: "/banners/geral-mobile.webp",
    },
    {
      id: "servicos",
      title: "Precisa de um serviço?",
      subtitle: "Da oficina ao pedreiro, encontre quem resolve na sua cidade.",
      ctaLabel: "Ver serviços",
      href: `/cidades/${citySlug}/g/servicos`,
      desktop: "/banners/servicos-desktop.webp",
      mobile: "/banners/servicos-mobile.webp",
    },
    {
      id: "lojas",
      title: "Suas lojas preferidas",
      subtitle: "Encontre sua loja e fale direto com ela, sem intermediário.",
      ctaLabel: "Ver lojas",
      href: `/cidades/${citySlug}/g/lojas`,
      desktop: "/banners/lojas-desktop.webp",
      mobile: "/banners/lojas-mobile.webp",
    },
  ];
}

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const groupParam =
    typeof searchParams.grupo === "string" ? searchParams.grupo : null;
  const activeGroup = groupParam && groupParam !== "todas" ? groupParam : null;

  const [city, groups] = await Promise.all([getCurrentCity(), listGroups()]);

  // Uma listagem por grupo alimenta tanto o filtro quanto a contagem dos cards.
  const perGroup = await Promise.all(
    groups.map((group) => listBusinesses(city.id, [group.slug])),
  );
  const counts: Record<string, number> = Object.fromEntries(
    groups.map((group, i) => [group.slug, perGroup[i].length]),
  );
  counts.todas = (await listBusinesses(city.id)).length;

  const [businesses, featured] = await Promise.all([
    listBusinesses(city.id, activeGroup ? [activeGroup] : null),
    listFeaturedBusinesses(city.id, 4),
  ]);

  return (
    <>
      <h1 className="sr-only">
        {siteConfig.name} — {siteConfig.tagline}
      </h1>

      <div className="mx-auto w-full max-w-6xl px-4 pt-5 lg:px-6">
        <HeroSlider slides={buildSlides(city.slug)} />
      </div>

      <section
        aria-label="Buscar empresas e serviços"
        className="bg-white px-4 py-10 sm:py-12"
      >
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="text-center text-xl font-black tracking-tight text-marca-800 sm:text-2xl">
            O que você procura hoje?
          </h2>
          <p className="mt-1 mb-5 text-center text-sm text-texto-suave">
            Busque por comida, serviços, lojas ou contatos úteis em {city.name}.
          </p>
          <Suspense fallback={<div className="h-14 rounded-media bg-superficie-2" />}>
            <LiveSearch cityId={city.id} />
          </Suspense>
        </div>
      </section>

      <CategoryGrid groups={groups} citySlug={city.slug} counts={counts} />

      <section
        id="descubra"
        aria-labelledby="descubra-titulo"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-6 lg:px-6"
      >
        <h2
          id="descubra-titulo"
          className="text-2xl font-black tracking-tight text-marca-800 sm:text-3xl"
        >
          Descubra empresas e serviços
        </h2>
        <p className="mt-1 text-sm text-texto-suave">
          Empresas ativas em {city.name}.
        </p>

        <div className="mt-6">
          <Suspense fallback={<div className="h-11" />}>
            <GroupFilter
              groups={groups.map((g) => ({ slug: g.slug, name: g.name }))}
              counts={counts}
            />
          </Suspense>
        </div>

        {businesses.length === 0 ? (
          <p className="mt-10 rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
            Nenhuma empresa encontrada nesse filtro. Tente{" "}
            <strong className="text-marca-800">Todas</strong>.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <li key={business.id} className="h-full">
                <BusinessCard business={business} citySlug={city.slug} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {featured.length > 0 ? (
        <section
          aria-labelledby="em-alta-titulo"
          className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6"
        >
          <h2
            id="em-alta-titulo"
            className="text-2xl font-black tracking-tight text-marca-800 sm:text-3xl"
          >
            Em alta
          </h2>
          <p className="mt-1 text-sm text-texto-suave">
            Empresas em destaque na cidade selecionada.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((business) => (
              <li key={business.id}>
                <article className="group flex h-full items-center gap-3 rounded-card border border-borda bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
                  <BusinessAvatar
                    name={business.name}
                    logoUrl={business.logoUrl}
                    size={56}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-marca-800">
                      {business.name}
                    </span>
                    {business.description ? (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-texto-suave">
                        {business.description}
                      </span>
                    ) : null}
                  </span>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AnuncieCta />
    </>
  );
}

function AnuncieCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-4 lg:px-6">
      <div className="rounded-media bg-marca-gradient px-6 py-12 text-center sm:px-12">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Sua empresa no Tudo Agora
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/80">
          Anuncie e receba pedidos e contatos direto no seu WhatsApp. Planos a
          partir de R$ 49,90 por mês.
        </p>
        <Link
          href="/planos"
          className="mt-6 inline-flex rounded-pill bg-destaque-500 px-8 py-3 text-sm font-bold text-marca-900 transition-colors hover:bg-destaque-400"
        >
          Ver planos
        </Link>
      </div>
    </section>
  );
}
