"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Route } from "next";

import { cn } from "@/lib/utils";

/** Categorias principais, na ordem do banco. */
type GroupPill = { id: number; slug: string; name: string };
/** Subcategorias de todas as principais (o componente agrupa por `parentId`). */
type ChildPill = { parentId: number | null; slug: string; name: string };

type Counts = {
  /** slug da principal -> empresas na cidade. */
  groups: Record<string, number>;
  /** slug da subcategoria -> empresas na cidade. */
  categories: Record<string, number>;
};

type Panel = "principais" | "filhas";

/** O que o painel precisa para se pintar; a URL vira esse estado. */
type Vista = { panel: Panel; grupo: string | null; categoria: string | null };

/** Duração do painel que sai, em ms. Tem que bater com `--animate-filtro-sai`. */
const SAIR_MS = 170;

const row =
  "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0";

const pillBase =
  "min-h-11 shrink-0 rounded-pill px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors";

const pillAtiva = "bg-destaque-500 text-marca-900";
const pillInativa = "bg-marca-800 text-white hover:bg-marca-700";

function Pill({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number | undefined;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(pillBase, active ? pillAtiva : pillInativa)}
    >
      {label}
      {count != null && count > 0 ? (
        <span className={active ? "text-marca-800/70" : "text-white/60"}>
          {" "}
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Filtro por categoria via query string (`?grupo=` + `?categoria=`).
 *
 * A URL é a única fonte de estado: clicar numa principal que tem
 * subcategorias troca o painel no mesmo espaço (a fileira de principais sai
 * e a de subcategorias entra), clicar numa subcategoria filtra por ela e o
 * botão "Voltar" volta para as principais. Principal sem subcategoria segue
 * o comportamento antigo — sem animação e sem cabeçalho extra.
 */
export function GroupFilter({
  groups,
  subcategories,
  counts,
}: {
  groups: GroupPill[];
  subcategories: ChildPill[];
  counts: Counts;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const grupo = searchParams.get("grupo");
  const categoria = searchParams.get("categoria");

  const ativas = (slug: string | null) =>
    slug ? subcategories.filter((c) => c.parentId === groups.find((g) => g.slug === slug)?.id) : [];

  /** "principais" enquanto a principal escolhida não tem filhas. */
  const atual: Vista = {
    panel: ativas(grupo).length > 0 ? "filhas" : "principais",
    grupo,
    categoria,
  };

  // A troca de painel é derivada da URL. O painel que sai continua montado
  // por ~170ms por cima do novo (para o cross-fade) e a URL que o produziu
  // vai junto: sem o snapshot, o painel antigo se repintaria com os dados
  // novos. Ajustar estado durante o render evita o quadro em que os dois
  // painéis aparecem já trocados.
  const [vista, setVista] = useState<{
    atual: Vista;
    saindo: Vista | null;
  }>({ atual, saindo: null });

  if (vista.atual.panel !== atual.panel) {
    setVista((v) => ({ atual, saindo: v.atual }));
  }

  useEffect(() => {
    if (!vista.saindo) return;
    const timer = setTimeout(
      () => setVista((v) => (v.saindo ? { ...v, saindo: null } : v)),
      SAIR_MS,
    );
    return () => clearTimeout(timer);
  }, [vista]);

  function ir(params: { grupo?: string | null; categoria?: string | null }) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(params)) {
      if (valor == null) next.delete(chave);
      else next.set(chave, valor);
    }

    // Trocar de categoria invalida a página atual do diretório.
    next.delete("pagina");

    const query = next.toString();
    // `pathname` é uma rota válida, mas concatenar query string apaga o tipo
    // literal gerado pelo typedRoutes; o cast é seguro porque só variamos
    // a query, nunca o caminho.
    const href = (query ? `${pathname}?${query}` : pathname) as Route;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function pintar({ panel, grupo, categoria }: Vista) {
    if (panel === "principais") {
      return (
        <div className={row}>
          <Pill
            label="Todas"
            active={!grupo}
            count={undefined}
            onClick={() => ir({ grupo: null, categoria: null })}
          />
          {groups.map((group) => (
            <Pill
              key={group.slug}
              label={group.name}
              active={group.slug === grupo}
              count={counts.groups[group.slug]}
              onClick={() =>
                ir(
                  group.slug === grupo
                    ? { grupo: null, categoria: null }
                    : { grupo: group.slug, categoria: null },
                )
              }
            />
          ))}
        </div>
      );
    }

    const principal = groups.find((g) => g.slug === grupo);
    return (
      <div className="space-y-2">
        <div className={row}>
          <button
            type="button"
            onClick={() => ir({ grupo: null, categoria: null })}
            className={cn(
              pillBase,
              "bg-transparent text-texto-suave hover:bg-superficie hover:text-marca-800",
            )}
          >
            <span aria-hidden="true">←</span> Voltar
          </button>
          {/* a principal continua em destaque, agora como cabeçalho do painel */}
          <span className={cn(pillBase, pillAtiva, "cursor-default")}>
            {principal?.name}
          </span>
        </div>
        <div className={row}>
          {ativas(grupo).map((child) => (
            <Pill
              key={child.slug}
              label={child.name}
              active={child.slug === categoria}
              count={counts.categories[child.slug]}
              onClick={() =>
                ir(
                  child.slug === categoria
                    ? { categoria: null }
                    : { categoria: child.slug },
                )
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Filtrar por categoria"
      aria-busy={pending}
      className="relative"
    >
      <div
        key={atual.panel}
        className={cn(vista.saindo && "animate-filtro-entra")}
      >
        {pintar(atual)}
      </div>
      {vista.saindo ? (
        <div
          key={vista.saindo.panel}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 animate-filtro-sai"
        >
          {pintar(vista.saindo)}
        </div>
      ) : null}
    </div>
  );
}
