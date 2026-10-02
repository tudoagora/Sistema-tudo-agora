"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/cidades", label: "Cidades" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/ofertas", label: "Ofertas" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/usuarios", label: "Usuários" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <nav aria-label="Seções do painel" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            isActive(link.href)
              ? "border-destaque-500 text-marca-800"
              : "border-transparent text-texto-suave hover:text-marca-800"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
