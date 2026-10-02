import Link from "next/link";
import { Suspense } from "react";

import { BusinessGrid } from "@/components/business-grid";
import { AdBannerCarousel } from "@/components/home/ad-banner";
import { CategoryGrid } from "@/components/home/category-grid";
import { FeaturedShowcase } from "@/components/home/featured-showcase";
import { GroupFilter } from "@/components/home/group-filter";
import { HeroSlider, type HeroSlide } from "@/components/home/hero-slider";
import { LiveSearch } from "@/components/home/search-box";
import { listAdBanners } from "@/lib/banners";
import {
  listBusinesses,
  listCategoryCounts,
  listFeaturedBusinesses,
  listGroups,
  listSubcategories,
  type Group,
} from "@/lib/catalog";
import { getCurrentCity } from "@/lib/city";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

function buildSlides(citySlug: string, groups: Group[]): HeroSlide[] {
  // O CTA aponta para a página da categoria, então o slug vem do banco —
  // se alguém renomear a categoria no admin, o banner acompanha.
  const slugDe = (nome: string) => groups.find((g) => g.name === nome)?.slug;

  const slides: (HeroSlide | null)[] = [
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
      href: `/cidades/${citySlug}/g/${slugDe("Serviços") ?? ""}`,
      desktop: "/banners/servicos-desktop.webp",
      mobile: "/banners/servicos-mobile.webp",
    },
    {
      id: "lojas",
      title: "Suas lojas preferidas",
      subtitle: "Encontre sua loja e fale direto com ela, sem intermediário.",
      ctaLabel: "Ver lojas",
      href: `/cidades/${citySlug}/g/${slugDe("Lojas") ?? ""}`,
      desktop: "/banners/lojas-desktop.webp",
      mobile: "/banners/lojas-mobile.webp",
    },
  ];

  return slides.filter(
    (slide): slide is HeroSlide => slide !== null && !slide.href.endsWith("/g/"),
  );
}

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const grupoParam =
    typeof searchParams.grupo === "string" ? searchParams.grupo : null;
  const categoriaParam =
    typeof searchParams.categoria === "string" ? searchParams.categoria : null;

  const [city, groups, subcategories] = await Promise.all([
    getCurrentCity(),
    listGroups(),
    listSubcategories(),
  ]);

  // A URL pode chegar com slugs antigos (o filtro é o único que escreve
  // `?grupo=`), então resolvemos contra a árvore em vez de confiar no texto.
  const activeGroup = groups.find((g) => g.slug === grupoParam)?.slug ?? null;
  const activeCategory =
    activeGroup && subcategories.some((c) => c.slug === categoriaParam)
      ? categoriaParam
      : null;

  // Tudo que depende só de `city.id` e do slug ativo sai numa ida só.
  const [counts, featured, businesses, adBanners] = await Promise.all([
    // Uma ida ao banco alimenta os números dos dois níveis do filtro.
    listCategoryCounts(city.id),
    // 1 herói + 3 fichas: é o que o showcase da home desenha.
    listFeaturedBusinesses(city.id, 4),
    listBusinesses(
      city.id,
      activeGroup ? [activeGroup] : null,
      { categorySlugs: activeCategory ? [activeCategory] : null },
    ),
    // A faixa de publicidade entra DEPOIS de "Destaques em {cidade}".
    // `AdBannerCarousel` devolve `null` quando não há banner ativo, então a
    // lista vazia não muda o layout.
    listAdBanners(),
  ]);

  // O "Ver cardápio" do herói vai direto na vitrine `/cardapio/{slug}`, que só
  // existe quando o slug é alcançável. `storefrontSlug` já vem resolvido do
  // banco: perguntar de novo aqui custava um terceiro salto sequencial no
  // caminho crítico da home — o tempo que se sente ao voltar para ela.
  const hero = featured[0];
  const heroMenuSlug = hero?.hasMenu ? hero.storefrontSlug : null;

  return (
    <>
      <h1 className="sr-only">
        {siteConfig.name} — {siteConfig.tagline}
      </h1>

      <div className="mx-auto w-full max-w-6xl px-4 pt-5 lg:px-6">
        <HeroSlider slides={buildSlides(city.slug, groups)} />
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

      <CategoryGrid groups={groups} counts={counts.groups} />

      <FeaturedShowcase
        businesses={featured}
        cityName={city.name}
        citySlug={city.slug}
        heroMenuHref={heroMenuSlug ? `/cardapio/${heroMenuSlug}` : null}
      />

      <AdBannerCarousel banners={adBanners} />

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
          <Suspense fallback={<div className="h-[6.5rem]" />}>
            <GroupFilter
              groups={groups}
              subcategories={subcategories}
              counts={{ groups: counts.groups, categories: counts.categories }}
            />
          </Suspense>
        </div>

        {businesses.length === 0 ? (
          <p className="mt-10 rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
            Nenhuma empresa encontrada nesse filtro. Tente{" "}
            <strong className="text-marca-800">Todas</strong>.
          </p>
        ) : (
          <BusinessGrid
            businesses={businesses}
            citySlug={city.slug}
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          />
        )}
      </section>

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
