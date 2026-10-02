"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Peça da faixa. O tipo mora aqui (e não em `@/lib/banners`) porque o
 * componente é `"use client"` e o módulo do loader é `server-only` — importar
 * o valor cruzaria a fronteira. O servidor só precisa deste tipo.
 */
export type AdBanner = {
  id: number;
  /** Rótulo/alt da arte. O texto do anúncio já vem desenhado na imagem. */
  title: string;
  imageUrl: string;
  linkUrl: string;
};

/**
 * Faixa de publicidade da home, entre "Destaques em {cidade}" e "Descubra".
 *
 * O texto do anúncio já vem desenhado na arte (3:1), então a peça é só a
 * imagem — por cima só entram os controles do carrossel, e nenhum título: um
 * título aqui cobriria a arte e repetiria o que ela já diz.
 *
 * O alvo é o art inteiro, como no site antigo: o link cobre 100% da faixa e
 * o nome acessível fica num `sr-only`, senão a única área clicável seria um
 * botão invisível. Pelo mesmo motivo a `alt` da imagem é vazia — quem nomeia
 * o link é o `sr-only`; as duas coisas juntos leriam o título duas vezes.
 */

/** Ritmo mais lento que o herói: aqui o anúncio quer ser lido, não virado. */
const AUTO_PLAY_MS = 8000;

export function AdBannerCarousel({ banners }: { banners: AdBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + banners.length) % banners.length);
    },
    [banners.length],
  );

  useEffect(() => {
    if (paused || banners.length < 2) return;
    const timer = setInterval(() => go(1), AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [go, paused, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Anuncie no Tudo Agora"
      className="mx-auto w-full max-w-6xl px-4 pt-8 pb-2 lg:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
        if (Math.abs(delta) > 45) go(delta < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <div className="relative overflow-hidden rounded-media bg-marca-800 shadow-media">
        <div className="relative aspect-3/1 w-full">
          {banners.map((banner, i) => (
            <AdSlide key={banner.id} banner={banner} active={i === index} />
          ))}

          {/* Os controles ficam DEPOIS das peças e com `z-10` de propósito: o
              link de cada peça cobre a faixa inteira em `z-5`, então sem isso
              as setas ficariam embaixo do link e parariam de responder. */}
          {banners.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Anúncio anterior"
                className="absolute top-1/2 left-2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Próximo anúncio"
                className="absolute top-1/2 right-2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40"
              >
                <span aria-hidden="true">›</span>
              </button>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {banners.map((banner, i) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Ir para o anúncio ${i + 1}`}
                    aria-current={i === index}
                    className={`h-2.5 rounded-pill transition-all ${
                      i === index ? "w-7 bg-destaque-500" : "w-2.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Publicidade tem que parecer publicidade: sem esta linha a peça se
          passa por conteúdo editorial. */}
      <p className="mt-2 text-center text-xs text-texto-tenue">Anúncio</p>
    </section>
  );
}

function AdSlide({ banner, active }: { banner: AdBanner; active: boolean }) {
  // Só caminho servido pelo Next entra no otimizador; uma URL colada no admin
  // (host externo) vai direto ao navegador. Sem isso o `next/image` lança em
  // tempo de render por não estar em `images.remotePatterns`.
  const isLocal = banner.imageUrl.startsWith("/");
  const interna =
    banner.linkUrl.startsWith("/") && !banner.linkUrl.includes("#");

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <Image
        src={banner.imageUrl}
        alt=""
        fill
        unoptimized={!isLocal}
        quality={75}
        sizes="(max-width: 1024px) 100vw, 1152px"
        className="object-cover"
      />
      {interna ? (
        <Link href={banner.linkUrl as Route} className="absolute inset-0 z-5">
          <span className="sr-only">{banner.title}</span>
        </Link>
      ) : (
        <a href={banner.linkUrl} className="absolute inset-0 z-5">
          <span className="sr-only">{banner.title}</span>
        </a>
      )}
    </div>
  );
}
