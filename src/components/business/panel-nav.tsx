"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas do painel da empresa.
 *
 * Vive num client component porque o item ativo depende da URL atual. Server
 * component não tem `pathname` sem custo extra, e o layout do painel é
 * compartilhado por todas as abas.
 */
export function PanelNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções da empresa"
      className="mt-4 flex gap-1 overflow-x-auto border-b border-borda no-scrollbar"
    >
      {items.map((item) => {
        const ativo = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href as never}
            aria-current={ativo ? "page" : undefined}
            className={
              ativo
                ? "shrink-0 border-b-2 border-destaque-500 px-4 py-2.5 text-sm font-bold text-marca-800"
                : "shrink-0 border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-texto-suave hover:text-marca-800"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
