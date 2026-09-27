"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Rota interna (`/cidades/...`), âncora (`#descubra`) ou URL absoluta. */
  href: string;
  desktop: string;
  mobile: string;
};

const CTA_CLASS =
  "mt-4 inline-flex w-fit items-center gap-2 rounded-pill bg-destaque-500 px-6 py-3 text-sm font-bold text-marca-900 transition-colors hover:bg-destaque-400";

function Cta({ slide }: { slide: HeroSlide }) {
  // Âncoras e URLs absolutas ficam fora do roteador do Next; rotas internas
  // aproveitam a navegação client-side.
  if (slide.href.startsWith("/") && !slide.href.includes("#")) {
    return (
      <Link href={slide.href as Route} className={CTA_CLASS}>
        {slide.ctaLabel}
      </Link>
    );
  }
  return (
    <a href={slide.href} className={CTA_CLASS}>
      {slide.ctaLabel}
    </a>
  );
}

const AUTO_PLAY_MS = 6000;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setInterval(() => go(1), AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [go, paused, slides.length]);

  if (slides.length === 0) return null;
  const active = slides[index];

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="relative overflow-hidden rounded-media bg-marca-800 shadow-media"
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
      <div className="relative aspect-16/9 w-full">
        {slides.map((slide, i) => (
          <SlidePicture
            key={slide.id}
            slide={slide}
            active={i === index}
            preload={i === 0}
          />
        ))}

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-marca-950/90 via-marca-950/30 to-transparent p-5 sm:p-8">
          <p className="max-w-md text-lg font-extrabold tracking-tight text-white drop-shadow sm:text-2xl">
            {active.title}
          </p>
          <p className="mt-1 max-w-md text-sm text-white/85 drop-shadow sm:text-base">
            {active.subtitle}
          </p>
          <Cta slide={active} />
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Banner anterior"
              className="absolute top-1/2 left-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo banner"
              className="absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40"
            >
              <span aria-hidden="true">›</span>
            </button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ir para o banner ${i + 1}`}
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
    </section>
  );
}

/**
 * Art direction: o banner "mobile" tem 1/3 do peso do "desktop" e é o
 * que a maior parte do público em cidade pequena vai baixar. O
 * `<picture>` é montado via `getImageProps` porque não dá para aninhar
 * `<Image>` dentro de `<source>`.
 */
function SlidePicture({
  slide,
  active,
  preload,
}: {
  slide: HeroSlide;
  active: boolean;
  preload: boolean;
}) {
  const common = {
    alt: "",
    sizes: "(max-width: 1024px) 100vw, 1152px",
    quality: 75,
  };

  const { props: desktop } = getImageProps({
    ...common,
    src: slide.desktop,
    width: 1600,
    height: 900,
  });
  const { props: mobile } = getImageProps({
    ...common,
    src: slide.mobile,
    width: 1600,
    height: 900,
  });

  return (
    <picture
      className={`absolute inset-0 transition-opacity duration-500 ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <source media="(max-width: 767px)" srcSet={mobile.srcSet} />
      <img
        {...desktop}
        alt=""
        loading={preload ? "eager" : "lazy"}
        fetchPriority={preload && active ? "high" : "auto"}
        className="h-full w-full object-cover"
      />
    </picture>
  );
}
