import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { requireBusinessMember } from "@/lib/auth";
import { businessStatusLabel } from "@/lib/business-status";
import { ORDER_STATUS_LABELS } from "@/lib/order";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Painel da empresa",
  robots: { index: false, follow: false },
};


/**
 * Resumo da empresa — a tela que `/painel` abre ao clicar na loja.
 *
 * A rota `/painel/[empresa]` é o segmento de layout: sem este `page.tsx` o
 * link da lista caía em 404, porque só existiam `cardapio/` e `pedidos/`
 * abaixo dele.
 */
export default async function PanelBusinessPage(
  props: PageProps<"/painel/[empresa]">,
) {
  const { empresa } = await props.params;
  const { business } = await requireBusinessMember(Number(empresa));
  const supabase = await createClient();

  // Contagens com `head: true`: o RLS `orders_business_read` já garante que
  // estas linhas são da empresa, e `business_id` fecha o filtro.
  const [novos, emAndamento, itensAtivos] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .in("status", ["confirmed", "preparing", "out_for_delivery", "ready_for_pickup"]),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("is_available", true),
  ]);

  const cards = [
    {
      href: `/painel/${business.id}/pedidos`,
      title: "Pedidos",
      description: "Aceite, acompanhe o preparo e cancele quando precisar.",
      badge: (novos.count ?? 0) + (emAndamento.count ?? 0),
      badgeLabel: (novos.count ?? 0) > 0 ? `${novos.count} novo(s)` : undefined,
    },
    {
      href: `/painel/${business.id}/cardapio`,
      title: "Cardápio",
      description: "Seções, itens, fotos, preços, promoções e destaques.",
      badge: itensAtivos.count ?? 0,
      badgeLabel: "itens no ar",
    },
    {
      href: `/painel/${business.id}/perfil`,
      title: "Dados da loja",
      description: "Contato, endereço, horário de funcionamento, entrega e taxas.",
      badge: 0,
      badgeLabel: undefined,
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {business.status !== "active" ? (
        <p className="rounded-card border border-aviso/40 bg-aviso/5 px-5 py-4 text-sm text-texto-forte">
          Sua empresa está com situação{" "}
          <strong>{businessStatusLabel(business.status)}</strong>. O
          cardápio e a vitrine só ficam públicos depois que a equipe do Tudo
          Agora ativar a empresa.
        </p>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href as Route}
              className="flex h-full flex-col rounded-card border border-borda bg-white p-5 transition-shadow hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-black text-marca-800">
                  {card.title}
                </h2>
                {card.badge > 0 ? (
                  <span className="rounded-pill bg-destaque-500/20 px-2.5 py-0.5 text-xs font-bold text-marca-800">
                    {card.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 flex-1 text-sm text-texto-suave">
                {card.description}
              </p>
              {card.badgeLabel ? (
                <p className="mt-3 text-xs font-semibold text-texto-tenue">
                  {card.badgeLabel}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      <section className="rounded-card border border-borda bg-white p-6">
        <h2 className="text-base font-black text-marca-800">Como funciona</h2>
        <ol className="mt-3 space-y-2 text-sm text-texto-suave">
          <li>
            <strong className="text-texto-forte">1.</strong> Monte o cardápio em{" "}
            <em>Cardápio</em> — o que estiver pausado some da vitrine na hora.
          </li>
          <li>
            <strong className="text-texto-forte">2.</strong> Ajuste horário,
            entrega e taxas em <em>Dados da loja</em>.
          </li>
          <li>
            <strong className="text-texto-forte">3.</strong> Os pedidos chegam
            em <em>Pedidos</em>: {Object.keys(ORDER_STATUS_LABELS).join(" → ")}.
          </li>
        </ol>
      </section>
    </div>
  );
}
