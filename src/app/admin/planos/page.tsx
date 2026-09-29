import type { Metadata } from "next";
import Link from "next/link";

import { AdminFlash } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/auth";
import type { AdminFlashParams } from "@/lib/admin-flash";
import { listPlans } from "@/lib/catalog";
import { formatBRL } from "@/lib/format";
import { updatePlan } from "./actions";

export const metadata: Metadata = { title: "Planos" };

const PERIOD_LABEL: Record<string, string> = {
  month: "mensal",
  year: "anual",
};

export default async function PlansAdminPage(
  props: PageProps<"/admin/planos">,
) {
  await requireAdmin();
  const params = (await props.searchParams) as AdminFlashParams;
  const plans = await listPlans();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-black tracking-tight text-marca-800">
        Planos e preços
      </h1>
      <p className="mt-1 text-sm text-texto-suave">
        Estes são os planos que a página <Link href="/planos" className="font-semibold text-marca-600 underline">/planos</Link> vende.
        No WordPress a landing anunciava 3 planos que nunca existiram no banco —
        o cadastro aqui é a fonte da verdade.
      </p>

      <AdminFlash params={params} />

      <ul className="mt-8 space-y-4">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-card border border-borda bg-white p-6">
            <form action={updatePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-lg font-black text-marca-800">{plan.name}</h2>
                <p className="text-sm text-texto-tenue">
                  {PERIOD_LABEL[plan.period] ?? plan.period} · {plan.features.length} recursos
                </p>
              </div>

              <p className="mt-1 text-sm text-texto-suave">{plan.tagline}</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`price-${plan.id}`}
                    className="mb-1.5 block text-sm font-semibold text-texto-forte"
                  >
                    Preço (R$)
                  </label>
                  <input
                    id={`price-${plan.id}`}
                    name="priceReais"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={(plan.priceCents / 100).toFixed(2)}
                    className="min-h-11 w-full rounded-logo border border-borda px-4 text-sm focus:border-marca-600"
                  />
                  <p className="mt-1 text-xs text-texto-tenue">
                    Hoje: {formatBRL(plan.priceCents)}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={`monthly-${plan.id}`}
                    className="mb-1.5 block text-sm font-semibold text-texto-forte"
                  >
                    Equivalente mensal (R$)
                  </label>
                  <input
                    id={`monthly-${plan.id}`}
                    name="monthlyEquivalentReais"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={((plan.monthlyEquivalentCents ?? 0) / 100).toFixed(2)}
                    className="min-h-11 w-full rounded-logo border border-borda px-4 text-sm focus:border-marca-600"
                  />
                  <p className="mt-1 text-xs text-texto-tenue">
                    &quot;paga 10 meses, ganha 2 grátis&quot;
                  </p>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-texto-forte">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={plan.isFeatured}
                  className="h-4 w-4 accent-marca-800"
                />
                Destacar como &quot;o mais escolhido&quot;
              </label>

              <button
                type="submit"
                className="mt-5 min-h-11 rounded-pill bg-marca-800 px-6 text-sm font-bold text-white"
              >
                Salvar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
