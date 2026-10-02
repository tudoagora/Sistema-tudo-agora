import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import type { Group } from "@/lib/catalog";

/** Seção CATEGORIAS: as 9 pílulas com foto, no formato do site atual. */
export function CategoryGrid({
  groups,
  counts,
}: {
  groups: Group[];
  counts: Record<string, number>;
}) {
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="categorias-titulo" className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6">
      <h2
        id="categorias-titulo"
        className="text-center text-2xl font-black tracking-tight text-marca-800 sm:text-3xl"
      >
        Categorias
      </h2>

      <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {groups.map((group) => (
          <li key={group.slug}>
            <Link
              // A pílula filtra a home em vez de levar para a página da
              // categoria: `?grupo=` é o mesmo estado que o filtro escreve,
              // então a grade e a fileira de chips contam a mesma história.
              // O cast é seguro porque só variamos a query, nunca o caminho.
              href={`/?grupo=${group.slug}` as Route}
              className="group flex flex-col items-center gap-2 rounded-card p-2 text-center transition-colors hover:bg-superficie"
            >
              <span className="relative block h-[86px] w-[86px] overflow-hidden rounded-[20px] border border-borda bg-superficie-2">
                {group.imageUrl ? (
                  <Image
                    src={group.imageUrl}
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
                    {group.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="text-xs leading-tight font-bold text-texto group-hover:text-marca-800 sm:text-sm">
                {group.name}
              </span>
              {counts[group.slug] ? (
                <span className="text-xs text-texto-tenue">
                  {counts[group.slug]} {counts[group.slug] === 1 ? "empresa" : "empresas"}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
