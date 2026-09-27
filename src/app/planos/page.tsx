import type { Metadata } from "next";
import Link from "next/link";

import { listPlans } from "@/lib/catalog";
import { formatBRL } from "@/lib/format";
import { supportLink } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Sua empresa conectada aos clientes da sua cidade. Planos anuais para lojas, restaurantes, clínicas e prestadores de serviço.",
  alternates: { canonical: "/planos" },
};

export default async function PlansPage() {
  const plans = await listPlans();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-marca-600">
          Planos TudoAgora
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
          Sua empresa conectada aos clientes da sua cidade
        </h1>
        <p className="mt-4 text-texto-suave">
          Escolha o plano que combina com o seu momento. Todos os planos incluem
          presença no app e contato direcionado para o WhatsApp.
        </p>
      </header>

      <ul className="mt-12 grid items-start gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className={cn(
              "flex h-full flex-col rounded-card border bg-white p-6 shadow-card",
              plan.isFeatured
                ? "border-marca-600 ring-2 ring-marca-500/20 lg:-my-3 lg:py-9"
                : "border-borda",
            )}
          >
            {plan.isFeatured ? (
              <p className="mb-4 inline-flex w-fit rounded-pill bg-destaque-500 px-3 py-1 text-xs font-black text-marca-900">
                O MAIS ESCOLHIDO
              </p>
            ) : null}

            <h2 className="text-lg font-black text-marca-800">{plan.name}</h2>
            {plan.tagline ? (
              <p className="mt-1.5 min-h-10 text-sm text-texto-suave">
                {plan.tagline}
              </p>
            ) : null}

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-4xl font-black tracking-tight text-marca-800">
                {formatBRL(plan.priceCents)}
              </span>
              <span className="text-sm font-semibold text-texto-suave">
                /{plan.period === "year" ? "ano" : plan.period === "month" ? "mês" : plan.period}
              </span>
            </p>
            {plan.monthlyEquivalentCents ? (
              <p className="mt-1 text-xs text-texto-tenue">
                equivale a {formatBRL(plan.monthlyEquivalentCents)} por mês
              </p>
            ) : null}

            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm text-texto">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-destaque-500 text-[10px] font-black text-marca-900"
                  >
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href={supportLink(
                `Olá! Tenho interesse no ${plan.name} do Tudo Agora. Pode me passar os detalhes?`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-7 inline-flex min-h-11 items-center justify-center rounded-pill px-5 text-sm font-bold transition-opacity hover:opacity-90",
                plan.isFeatured
                  ? "bg-marca-gradient text-white"
                  : "border border-marca-800 text-marca-800",
              )}
            >
              Quero este plano
            </a>
          </li>
        ))}
      </ul>

      <section className="mt-12 rounded-card border border-dashed border-borda-forte bg-superficie p-6 text-center sm:p-8">
        <h2 className="text-base font-black text-marca-800">
          Precisa de ajuda para montar seu cardápio?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-texto-suave">
          Nossa equipe monta o cardápio digital da sua empresa, com fotos,
          categorias e preços organizados para venda online.
        </p>
        <Link
          href="/politica-e-privacidade"
          className="mt-4 inline-block text-sm font-semibold text-marca-600 underline"
        >
          Ver política de privacidade
        </Link>
      </section>
    </div>
  );
}
