import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { listCities } from "@/lib/catalog";
import { formatBRL } from "@/lib/format";
import { isOfferActive } from "@/lib/offer";
import { createClient } from "@/lib/supabase/server";
import { deleteOffer } from "./actions";

export const metadata: Metadata = { title: "Ofertas" };

export default async function OffersAdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const city = await listCities().then((c) => c[0] ?? null);

  const { data: offers } = await supabase
    .from("offers")
    .select("*, businesses!inner(id, name, slug, logo_url)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-marca-800">Ofertas</h1>
      <p className="mt-1 text-sm text-texto-suave">
       Campanhas com preço destaque, exibidas em{" "}
        <Link href="/ofertas" className="font-semibold text-marca-600 underline">/ofertas</Link>.
      </p>

      {offers?.length ? (
        <div className="mt-8 overflow-x-auto rounded-card border border-borda bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-borda bg-superficie text-xs uppercase tracking-wide text-texto-tenue">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Oferta</th>
                <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Preço</th>
                <th scope="col" className="px-4 py-3 font-semibold">Válida até</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const business = Array.isArray(offer.businesses)
                  ? offer.businesses[0]
                  : offer.businesses;
                const isActive = isOfferActive(offer.ends_at);
                return (
                  <tr key={offer.id} className="border-b border-borda last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold text-texto-forte">{offer.title}</p>
                      <p
                        className={`text-xs font-semibold ${isActive ? "text-sucesso-700" : "text-texto-tenue"}`}
                      >
                        {isActive ? "ativa" : "encerrada"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-texto-suave">
                      {business ? String((business as { name: string }).name) : "—"}
                    </td>
                    <td className="px-4 py-3 text-texto-forte">
                      {offer.price_cents ? formatBRL(offer.price_cents) : "—"}
                      {offer.compare_at_cents ? (
                        <span className="ml-1 text-xs text-texto-tenue line-through">
                          {formatBRL(offer.compare_at_cents)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-texto-tenue">
                      {offer.ends_at
                        ? new Date(offer.ends_at).toLocaleDateString("pt-BR")
                        : "sem prazo"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteOffer}>
                        <input type="hidden" name="id" value={offer.id} />
                        <button
                          type="submit"
                          className="font-semibold text-texto-suave hover:text-erro-700"
                        >
                          Excluir
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 rounded-card border border-dashed border-borda-forte bg-white p-12 text-center text-texto-suave">
          Nenhuma oferta cadastrada.
        </p>
      )}

      <p className="mt-8 text-sm text-texto-suave">
        A criação de oferta é feita pelo painel da empresa, em{" "}
        <span className="font-semibold text-texto-forte">Editar empresa → Cardápio</span>.
        {city ? "" : " Nenhuma cidade cadastrada."}
      </p>
    </div>
  );
}
