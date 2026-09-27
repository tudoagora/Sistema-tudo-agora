"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { Route } from "next";

import { cn } from "@/lib/utils";

import type { OrderFilterKey } from "@/lib/order";

/**
 * Filtro de status dos pedidos via query string (`?f=novos`).
 *
 * Client só porque precisa ler `useSearchParams` e trocar a URL sem recarregar
 * tudo — a filtragem em si acontece no Postgres, no servidor. Se fizesse isso
 * no cliente o lojista veria a lista inteira e o "contador" de novos mentiria.
 */
export function OrderFilter({
  filters,
  active,
  counts,
}: {
  filters: readonly { key: OrderFilterKey; label: string }[];
  active: OrderFilterKey;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(key: OrderFilterKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "todos") params.delete("f");
    else params.set("f", key);

    const query = params.toString();
    // `pathname` é uma rota válida, mas concatenar query string apaga o tipo
    // literal do typedRoutes; o cast é seguro porque só variamos a query.
    const href = (query ? `${pathname}?${query}` : pathname) as Route;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <div
      role="group"
      aria-label="Filtrar pedidos por status"
      aria-busy={pending}
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {filters.map((filter) => {
        const isActive = filter.key === active;
        const count = counts[filter.key] ?? 0;
        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => select(filter.key)}
            aria-pressed={isActive}
            className={cn(
              "min-h-11 shrink-0 rounded-pill px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors",
              isActive
                ? "bg-destaque-500 text-marca-900"
                : "bg-white text-texto-suave border border-borda hover:border-marca-600 hover:text-marca-800",
            )}
          >
            {filter.label}
            {count > 0 ? (
              <span
                className={cn(
                  "ml-1.5 rounded-pill px-1.5 py-0.5 text-xs",
                  isActive ? "bg-marca-900/15 text-marca-900" : "bg-superficie-2",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
