"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { Route } from "next";

export const ALL_GROUPS = "todas";

/**
 * Filtro por grupo via query string (`?grupo=comida`). O site antigo
 * filtrava no cliente a partir de um JSON embutido no HTML; aqui a lista
 * é re-renderizada no servidor a partir do banco, então o filtro escala
 * e o estado é compartilhável por URL.
 */
export function GroupFilter({
  groups,
  counts,
}: {
  groups: { slug: string; name: string }[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const active = searchParams.get("grupo") ?? ALL_GROUPS;

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === ALL_GROUPS) params.delete("grupo");
    else params.set("grupo", slug);

    const query = params.toString();
    // `pathname` é uma rota válida, mas concatenar query string apaga o tipo
    // literal gerado pelo typedRoutes; o cast é seguro porque só variamos
    // a query, nunca o caminho.
    const href = (query ? `${pathname}?${query}` : pathname) as Route;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  const pills = [{ slug: ALL_GROUPS, name: "Todas" }, ...groups];

  return (
    <div
      role="group"
      aria-label="Filtrar por categoria"
      aria-busy={pending}
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {pills.map((group) => {
        const isActive = group.slug === active;
        const count = counts[group.slug];
        return (
          <button
            key={group.slug}
            type="button"
            onClick={() => select(group.slug)}
            aria-pressed={isActive}
            className={`min-h-11 shrink-0 rounded-pill px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
              isActive
                ? "bg-destaque-500 text-marca-900"
                : "bg-marca-800 text-white hover:bg-marca-700"
            }`}
          >
            {group.name}
            {count != null && count > 0 ? (
              <span className={isActive ? "text-marca-800/70" : "text-white/60"}>
                {" "}
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
