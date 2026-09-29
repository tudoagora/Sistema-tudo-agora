"use client";

import { useId, useState } from "react";

import { BusinessCard } from "@/components/business-card";
import type { BusinessCard as BusinessCardData } from "@/lib/catalog";

/** Quantas empresas aparecem a cada revelação. */
const PAGE_SIZE = 9;

/**
 * Grade de empresas com revelação progressiva: 9 por vez e, no fim, um botão
 * que soma mais 9.
 *
 * A lista inteira já chega pronta do servidor (`list_businesses` sem `p_limit`
 * devolve tudo), então o botão não dispara request nenhum — ele só segura o
 * resto do DOM. O custo é SEO: os links além do 9º só existem depois do clique,
 * então quem indexa precisa renderizar e clicar.
 */
export function BusinessGrid({
  businesses,
  citySlug,
  step = PAGE_SIZE,
  initial = PAGE_SIZE,
  className = "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  itemClassName = "h-full",
}: {
  businesses: BusinessCardData[];
  citySlug?: string;
  step?: number;
  initial?: number;
  className?: string;
  itemClassName?: string;
}) {
  const gradeId = useId();
  const [visiveis, setVisiveis] = useState(initial);

  // Home e loja reaproveitam o mesmo componente quando o filtro muda pela URL.
  // Sem esta correção o contador continuaria no valor do filtro anterior, e o
  // usuário veria "Explorar mais" numa lista que já cabe inteira na tela.
  const assinatura = `${businesses.length}:${businesses[0]?.id ?? ""}:${
    businesses[businesses.length - 1]?.id ?? ""
  }`;
  const [ultimaAssinatura, setUltimaAssinatura] = useState(assinatura);
  if (assinatura !== ultimaAssinatura) {
    setUltimaAssinatura(assinatura);
    setVisiveis(initial);
  }

  const total = businesses.length;
  const mostradas = Math.min(visiveis, total);
  const restantes = total - mostradas;
  const ultimaRodada = restantes <= step;

  return (
    <>
      <ul id={gradeId} className={className}>
        {businesses.slice(0, mostradas).map((business) => (
          <li key={business.id} className={itemClassName}>
            <BusinessCard business={business} citySlug={citySlug} />
          </li>
        ))}
      </ul>

      {restantes > 0 ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            aria-controls={gradeId}
            onClick={() => setVisiveis((atual) => atual + step)}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-marca-gradient px-6 text-sm font-bold text-white transition-opacity hover:opacity-95"
          >
            {ultimaRodada
              ? `Ver todas as ${total} empresas`
              : "Explorar mais"}
            <span aria-hidden="true" className="transition-transform">
              →
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}
