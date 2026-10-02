"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { smoothScrollTo, stopSmoothScroll } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

/**
 * Pílula de categoria da home.
 *
 * O clique não espera o servidor: a seção `#descubra` já está na página nos
 * dois estados (com e sem filtro), então a rolagem começa na hora, em paralelo
 * com a navegação que troca `?grupo=`. A rolagem é longa de propósito — ela
 * dura o suficiente para a listagem filtrada chegar, e o visitante chega na
 * seção já com a categoria escolhida no lugar.
 *
 * Com `scroll: false` o Next não repete a rolagem no fim, e a âncora continua
 * no `href` para clique com modificador (nova aba) e para link colado — aí quem
 * trata é o navegador.
 */
export function CategoryPill({
  slug,
  name,
  imageUrl,
  count,
}: {
  slug: string;
  name: string;
  imageUrl: string | null;
  count?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // A animação é global (um rAF só na página): se esta pílula sair do DOM no
  // meio do voo, os listeners não podem ficar pendurados.
  useEffect(() => stopSmoothScroll, []);

  return (
    <Link
      href={`/?grupo=${slug}#descubra` as Route}
      aria-busy={pending}
      onClick={(event) => {
        // Clique com modificador é do navegador (nova aba, etc.).
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();

        const destino = document.getElementById("descubra");
        if (destino) smoothScrollTo(destino);

        startTransition(() => {
          router.push(`/?grupo=${slug}` as Route, { scroll: false });
        });
      }}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-card p-2 text-center transition-colors hover:bg-superficie",
        pending && "opacity-60",
      )}
    >
      <span className="relative block h-[86px] w-[86px] overflow-hidden rounded-[20px] border border-borda bg-superficie-2">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="86px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-full w-full place-items-center text-2xl"
          >
            {name.charAt(0)}
          </span>
        )}
      </span>
      <span className="text-xs leading-tight font-bold text-texto group-hover:text-marca-800 sm:text-sm">
        {name}
      </span>
      {count ? (
        <span className="text-xs text-texto-tenue">
          {count} {count === 1 ? "empresa" : "empresas"}
        </span>
      ) : null}
    </Link>
  );
}