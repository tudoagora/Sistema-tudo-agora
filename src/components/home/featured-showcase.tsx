import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { initialsFromName } from "@/components/business-card";
import type { FeaturedBusiness } from "@/lib/catalog";

/**
 * Seção "Destaques em {cidade}" da home — o showcase do site atual: um herói
 * escuro com a vitrine em destaque e, abaixo, uma faixa em movimento com as
 * outras empresas (nome à esquerda, logo à direita, altura curta).
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
   * servidor porque depende de `storefrontSlug`, que o banco resolve (com
   * `custom_slug` ou com o slug único entre as ativas); sem ela o botão
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
        /* Faixa em movimento: as mesmas fichas duas vezes seguidas, porque o
           deslocamento de -50% só fecha o laço sem salto com o passe repetido.
           O espaçamento é `pr` no item (e não `gap` na lista) pelo mesmo
           motivo — o `gap` não entraria na conta do -50%. Quem prefere menos
           movimento (`motion-reduce`) recebe a lista quebrando em linhas.
           O `overflow-hidden` do wrapper é o que impede a faixa, que é mais
           larga que a tela, de criar rolagem horizontal na página. */
        <div className="mt-4 overflow-hidden">
          <ul
            aria-label="Mais empresas em destaque"
            className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:gap-3 motion-reduce:animate-none"
          >
            {[...tiles, ...tiles].map((business, index) => {
              const tone =
                TILE_TONES[index % tiles.length % TILE_TONES.length];
              // A segunda cópia é só preenchimento visual: some da árvore
              // acessível e do teclado para não duplicar nome/link.
              const repeat = index >= tiles.length;

              return (
                <li
                  key={`${business.id}-${repeat ? "repete" : "original"}`}
                  className="shrink-0 pr-3 sm:pr-4 motion-reduce:pr-0"
                >
                  <Link
                    href={`/cidades/${citySlug}/empresa/${business.slug}`}
                    aria-hidden={repeat || undefined}
                    tabIndex={repeat ? -1 : undefined}
                    className={`group flex w-[268px] items-center justify-between gap-3 overflow-hidden rounded-card p-4 transition-shadow hover:shadow-card-hover sm:w-[360px] sm:gap-4 sm:p-5 ${tone.card}`}
                  >
                    <span className="flex min-w-0 flex-col items-start gap-1 sm:gap-1.5">
                      <span
                        className={`text-[9px] font-extrabold tracking-[0.03em] uppercase sm:text-[10px] ${tone.kicker}`}
                      >
                        {business.categoryName ?? "Destaque"}
                      </span>
                      {/* `min-h` reserva as duas linhas do nome e a linha da
                          descrição mesmo quando o texto é curto ou não existe:
                          é o que deixa toda ficha com a mesma altura, já que
                          a faixa só pode rolar com cartões de tamanho igual. */}
                      <strong className="line-clamp-2 min-h-[2.3em] text-base leading-[1.15] font-black text-marca-900 sm:text-lg">
                        {business.name}
                      </strong>
                      <span className="line-clamp-1 min-h-[1.65em] text-[11px] leading-relaxed text-texto-suave sm:text-xs">
                        {business.description ?? ""}
                      </span>
                      <span className="mt-0.5 inline-flex w-max items-center gap-2 rounded-pill bg-marca-600 px-3 py-1.5 text-[10px] font-extrabold text-white transition-transform group-hover:-translate-y-0.5 sm:mt-1 sm:px-3.5 sm:py-2 sm:text-[11px]">
                        Ver empresa <span aria-hidden="true">→</span>
                      </span>
                    </span>

                    {/* Só a logo que a empresa subiu: as iniciais do lugar
                        ficavam corteadas no círculo e ocupavam metade da
                        ficha. */}
                    {business.logoUrl ? (
                      <span
                        aria-hidden="true"
                        className="grid h-[62px] w-[62px] shrink-0 place-items-center overflow-hidden rounded-full bg-white/70 sm:h-[78px] sm:w-[78px]"
                      >
                        <Image
                          src={business.logoUrl}
                          alt=""
                          width={78}
                          height={78}
                          className="h-full w-full object-contain"
                          unoptimized={
                            business.logoUrl.startsWith("http://127.0.0.1") ||
                            business.logoUrl.startsWith("http://localhost")
                          }
                        />
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}