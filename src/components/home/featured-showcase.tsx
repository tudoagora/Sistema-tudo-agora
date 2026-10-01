import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { initialsFromName } from "@/components/business-card";
import type { FeaturedBusiness } from "@/lib/catalog";

/**
 * Seção "Destaques em {cidade}" da home — o showcase do site atual: um herói
 * escuro com a vitrine em destaque e duas fichas coloridas abaixo.
 *
 * O herói é sempre a empresa com cardápio disponível (`hasMenu` vem ordenado
 * assim de `listFeaturedBusinesses`), porque "Ver cardápio" vende mais que
 * "Ver empresa". As fichas usam a categoria principal como kicker.
 */

/** Fundo/kicker de cada ficha — as duas cores do site, na mesma ordem. */
const TILE_TONES = [
  { card: "bg-sucesso/10", kicker: "text-sucesso-700" },
  { card: "bg-marca-100", kicker: "text-marca-600" },
] as const;

function ShowcaseArt({
  name,
  logoUrl,
  size,
}: {
  name: string;
  logoUrl: string | null;
  size: number;
}) {
  // A arte fica num círculo branco: `contain` para não cortar a logo, e as
  // iniciais só aparecem quando a empresa ainda não subiu logo.
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        unoptimized={
          logoUrl.startsWith("http://127.0.0.1") ||
          logoUrl.startsWith("http://localhost")
        }
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid h-full w-full place-items-center font-black text-marca-800"
      style={{ fontSize: Math.round(size / 3.2) }}
    >
      {initialsFromName(name)}
    </span>
  );
}

export function FeaturedShowcase({
  businesses,
  cityName,
  citySlug,
  heroMenuHref = null,
}: {
  businesses: FeaturedBusiness[];
  cityName: string;
  citySlug: string;
  /**
   * Vitrine do herói (`/cardapio/{slug}`), quando ela é alcançável. Vem do
   * servidor porque depende de `resolveStorefrontSlug`; sem ela o botão
   * "Ver cardápio" cai na seção de cardápio da página da empresa.
   */
  heroMenuHref?: string | null;
}) {
  const [hero, ...tiles] = businesses;
  if (!hero) return null;

  const companyHref = `/cidades/${citySlug}/empresa/${hero.slug}`;
  // Sem vitrine alcançável o "Ver cardápio" ainda leva ao cardápio — só que
  // dentro da página da empresa, no bloco `#cardapio`.
  const heroHref: Route =
    hero.hasMenu && !heroMenuHref
      ? (`${companyHref}#cardapio` as Route)
      : ((heroMenuHref ?? companyHref) as Route);
  const heroCta = hero.hasMenu ? "Ver cardápio" : "Ver empresa";

  return (
    <section
      aria-labelledby="destaques-titulo"
      className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="destaques-titulo"
            className="text-2xl font-black tracking-tight text-marca-800 sm:text-3xl"
          >
            Destaques em {cityName}
          </h2>
          <p className="mt-1 text-sm text-texto-suave">
            Empresas da sua cidade para conhecer.
          </p>
        </div>

        <Link
          href="#descubra"
          className="mt-1 shrink-0 text-sm font-bold text-marca-600 hover:underline"
        >
          Ver todas <span aria-hidden="true">›</span>
        </Link>
      </div>

      {/* Herói: fundo marca-900 com dois círculos claros atrás, nome grande e
          o CTA de vitrine em branco. No mobile a arte vira marca d'água. */}
      <Link
        href={heroHref as Route}
        className="group relative isolate mt-6 flex min-h-[216px] items-center justify-between gap-4 overflow-hidden rounded-media bg-marca-900 p-5 shadow-media transition-shadow hover:shadow-card-hover sm:min-h-[245px] sm:p-8"
      >
        <span
          aria-hidden="true"
          className="absolute -right-24 -top-28 -z-10 h-[410px] w-[410px] rounded-full bg-marca-700/50"
        />
        <span
          aria-hidden="true"
          className="-bottom-56 right-10 -z-10 hidden h-[390px] w-[390px] rounded-full bg-marca-600/40 sm:block"
        />

        <span className="relative z-10 flex max-w-[67%] flex-col items-start gap-2.5 sm:max-w-[62%] sm:gap-3">
          <span className="inline-block rounded-pill bg-marca-100 px-3 py-1.5 text-[9px] font-extrabold tracking-[0.03em] text-marca-900 sm:px-4 sm:py-2 sm:text-[11px]">
            {hero.hasMenu ? "CARDÁPIO ONLINE" : (hero.categoryName ?? "DESTAQUE")}
          </span>
          <strong className="block text-2xl leading-[1.15] font-black text-white sm:text-3xl lg:text-4xl">
            {hero.name}
          </strong>
          {hero.description ? (
            <span className="line-clamp-2 text-xs leading-relaxed text-marca-100 sm:text-[15px]">
              {hero.description}
            </span>
          ) : null}
          <span className="mt-1 inline-flex w-max items-center gap-3 rounded-pill bg-white px-4 py-2.5 text-[11px] font-extrabold text-marca-600 transition-transform group-hover:-translate-y-0.5 sm:mt-3 sm:gap-4 sm:px-5 sm:py-3 sm:text-[13px]">
            {heroCta}
            <span aria-hidden="true">→</span>
          </span>
        </span>

        <span
          aria-hidden="true"
          className="absolute right-[-22px] top-[22px] z-0 grid h-[145px] w-[145px] place-items-center overflow-hidden rounded-full border-[8px] border-white/15 bg-white opacity-95 shadow-media sm:relative sm:right-auto sm:top-auto sm:z-10 sm:h-[230px] sm:w-[230px] sm:border-[12px] sm:opacity-100"
        >
          <ShowcaseArt
            name={hero.name}
            logoUrl={hero.logoUrl}
            size={230}
          />
        </span>
      </Link>

      {tiles.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-[18px]">
          {tiles.map((business, index) => {
            const tone = TILE_TONES[index % TILE_TONES.length];

            return (
              <li key={business.id}>
                <Link
                  href={`/cidades/${citySlug}/empresa/${business.slug}`}
                  className={`group flex min-h-[143px] items-center justify-between overflow-hidden rounded-card p-4 transition-shadow hover:shadow-card-hover sm:min-h-[185px] sm:p-6 ${tone.card}`}
                >
                  <span className="relative z-10 flex max-w-[70%] flex-col items-start gap-2 sm:gap-2.5">
                    <span
                      className={`text-[10px] font-extrabold tracking-[0.03em] uppercase ${tone.kicker}`}
                    >
                      {business.categoryName ?? "Destaque"}
                    </span>
                    <strong className="text-lg leading-[1.15] font-black text-marca-900 sm:text-2xl">
                      {business.name}
                    </strong>
                    {business.description ? (
                      <span className="line-clamp-2 text-xs leading-relaxed text-texto-suave sm:text-[13px]">
                        {business.description}
                      </span>
                    ) : null}
                    <span className="mt-1 inline-flex w-max items-center gap-3 rounded-pill bg-marca-600 px-3.5 py-2 text-[11px] font-extrabold text-white transition-transform group-hover:-translate-y-0.5 sm:mt-3 sm:px-4 sm:py-2.5 sm:text-[13px]">
                      Ver empresa <span aria-hidden="true">→</span>
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="ml-1 grid h-[94px] w-[94px] shrink-0 place-items-center overflow-hidden rounded-full bg-white/70 sm:ml-2.5 sm:h-[126px] sm:w-[126px]"
                  >
                    <ShowcaseArt
                      name={business.name}
                      logoUrl={business.logoUrl}
                      size={126}
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}