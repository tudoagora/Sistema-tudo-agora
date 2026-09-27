import { Suspense } from "react";

import type { Metadata } from "next";

import { OrderActions } from "@/components/business/order-actions";
import { OrderFilter } from "@/components/business/order-filter";
import { formatBRL, formatPhone, whatsappLink } from "@/lib/format";
import { requireBusinessMember } from "@/lib/auth";
import {
  groupItemOptions,
  ORDER_FILTERS,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_CLASS,
  PAYMENT_STATUS_LABELS,
  resolveOrderFilter,
  type OrderItemOption,
} from "@/lib/order";
import { unwrapAll } from "@/lib/postgrest";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pedidos",
  robots: { index: false, follow: false },
};

type OrderRow = {
  id: number;
  public_id: string;
  customer_name: string;
  customer_phone: string;
  fulfillment: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_cents: number;
  created_at: string;
  notes: string | null;
  address: string | null;
  cancellation_reason: string | null;
  order_items: {
    id: number;
    product_name: string;
    quantity: number;
    unit_price_cents: number;
    notes: string | null;
    order_item_options: OrderItemOption[] | null;
  }[] | null;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function PanelOrdersPage(
  props: PageProps<"/painel/[empresa]/pedidos">,
) {
  const { empresa } = await props.params;
  const { business } = await requireBusinessMember(Number(empresa));
  const searchParams = await props.searchParams;

  const filtro = resolveOrderFilter(
    typeof searchParams.f === "string" ? searchParams.f : undefined,
  );

  const supabase = await createClient();

  // Uma consulta por bucket, só para o contador. `head: true` faz a contagem no
  // Postgres sem transferring linha nenhuma — alternativa seria listar tudo e
  // contar no JS, que quebra com a teto de linhas do PostgREST e ainda
  // transfere o payload inteiro.
  const contagens = Object.fromEntries(
    await Promise.all(
      ORDER_FILTERS.map(async (f) => {
        let q = supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business.id);
        if (f.statuses) q = q.in("status", [...f.statuses]);
        const { count } = await q;
        return [f.key, count ?? 0] as const;
      }),
    ),
  );

  // O filtro vai para o Postgres, não para o array: com `.limit(50)` filtrar
  // depois traria 50 pedidos já podados em vez de 50 do status escolhido.
  let query = supabase
    .from("orders")
    .select(
      // `order_item_options` traz o grupo e o valor como texto — é o snapshot
      // do que o cliente escolheu. Sem esse nível aninhado o lojista via só
      // "1× Pizza Grande - 3 sabores" e não tinha como saber quais sabores nem
      // a borda.
      "id, public_id, customer_name, customer_phone, fulfillment, status, payment_method, payment_status, total_cents, created_at, notes, address, cancellation_reason, order_items(id, product_name, quantity, unit_price_cents, notes, order_item_options(id, option_group_name, option_value_name, price_delta_cents))",
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (filtro.statuses) query = query.in("status", [...filtro.statuses]);

  const response = await query;
  const orders = unwrapAll<OrderRow>(response);
  const backTo = `/painel/${business.id}/pedidos`;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-black text-marca-800">Pedidos</h2>
      <p className="mt-1 text-sm text-texto-suave">
        Os 50 mais recentes. Cada pedido guarda o preço e as opções que o
        cliente escolheu, então o histórico não muda quando você edita o
        cardápio.
      </p>

      <div className="mt-5">
        <Suspense fallback={<div className="h-11" />}>
          <OrderFilter
            filters={ORDER_FILTERS}
            active={filtro.key}
            counts={contagens}
          />
        </Suspense>
      </div>

      {orders.length === 0 ? (
        <p className="mt-5 rounded-card border border-dashed border-borda-forte bg-white p-10 text-center text-sm text-texto-suave">
          {filtro.key === "todos"
            ? "Nenhum pedido ainda. Quando alguém finalizar no cardápio, ele aparece aqui."
            : `Nenhum pedido em "${filtro.label}" no momento.`}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {orders.map((order) => {
            const items = order.order_items ?? [];
            const count = items.reduce((sum, item) => sum + item.quantity, 0);
            // Só sai link se houver telefone válido: `whatsappLink` devolve
            // `null` para número ausente ou curto, e um `href={null}` renderiza
            // um `<a>` sem destino que o lojista clicaria à toa.
            const zap = whatsappLink(
              order.customer_phone,
              `Olá ${order.customer_name}! Falamos sobre o pedido ${order.public_id} de ${formatBRL(order.total_cents)}.`,
            );

            return (
              <li
                key={order.id}
                className={cn(
                  "rounded-card border bg-white p-5",
                  // Pedido novo ganha anel e fundo marcados: é o que o
                  // lojista precisa ver primeiro ao abrir a tela, mesmo com
                  // 50 pedidos empilhados em ordem cronológica.
                  order.status === "pending"
                    ? "border-destaque-500/60 ring-2 ring-destaque-500/25"
                    : "border-borda",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-black text-marca-800">
                      {order.public_id}
                      <span
                        className={`rounded-pill px-2 py-0.5 text-xs font-bold ${
                          ORDER_STATUS_CLASS[order.status] ??
                          "bg-superficie-2 text-texto-suave"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      <span className="text-xs font-normal text-texto-tenue">
                        {order.fulfillment === "pickup"
                          ? "retirada"
                          : "entrega"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-texto-forte">
                      {order.customer_name} ·{" "}
                      {formatPhone(order.customer_phone)}
                    </p>
                    <p className="mt-0.5 text-xs text-texto-tenue">
                      {dateFormat.format(new Date(order.created_at))} ·{" "}
                      {count} {count === 1 ? "item" : "itens"} ·{" "}
                      {PAYMENT_METHOD_LABELS[order.payment_method] ??
                        order.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-marca-800">
                      {formatBRL(order.total_cents)}
                    </p>
                    {/*
                      O checkout do cardápio é manual (Pix na entrega, dinheiro,
                      cartão), então o lojista precisa ver e marcar o recebimento
                      — sem isto ele não tem como saber se o pedido já foi pago.
                    */}
                    <span
                      className={`mt-1 inline-block rounded-pill px-2 py-0.5 text-xs font-bold ${
                        PAYMENT_STATUS_CLASS[order.payment_status] ??
                        "bg-superficie-2 text-texto-suave"
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[order.payment_status] ??
                        order.payment_status}
                    </span>
                  </div>
                </div>

                {/*
                  WhatsApp é onde a confirmação de pedido realmente acontece num
                  negócio de delivery: o cliente pede, o lojista chama, e
                  combinado fica registrado lá. `rel="noopener noreferrer"` para
                  o link não dar acesso à janela do painel.
                */}
                {zap ? (
                  <a
                    href={zap}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-9 items-center rounded-pill border border-sucesso/40 px-3 text-xs font-bold text-sucesso-700 hover:bg-sucesso/10"
                  >
                    Chamar no WhatsApp
                  </a>
                ) : null}

                {/*
                  Cada item mostra o que o cliente escolheu, agrupado por grupo.
                  Sem isso a cozinha não sabe o tamanho nem a borda — e o
                  snapshot garante que continua correto mesmo depois de o
                  lojista editar o cardápio.
                */}
                {items.length > 0 ? (
                  <ul className="mt-3 space-y-2.5 border-t border-borda pt-3">
                    {items.map((item) => {
                      const grupos = groupItemOptions(item.order_item_options);
                      return (
                        <li key={item.id} className="text-xs">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="font-bold text-texto-forte">
                              {item.quantity}× {item.product_name}
                            </p>
                            <p className="shrink-0 font-semibold text-texto-suave">
                              {formatBRL(item.unit_price_cents * item.quantity)}
                            </p>
                          </div>

                          {grupos.length > 0 ? (
                            <ul className="mt-1 space-y-0.5">
                              {grupos.map((grupo) => (
                                <li key={grupo.group} className="text-texto-suave">
                                  <span className="text-texto-tenue">
                                    {grupo.group}:
                                  </span>{" "}
                                  {grupo.values
                                    .map(
                                      (valor) =>
                                        `${valor.name}${
                                          valor.deltaCents
                                            ? ` (+${formatBRL(valor.deltaCents)})`
                                            : ""
                                        }`,
                                    )
                                    .join(", ")}
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {item.notes ? (
                            <p className="mt-1 text-texto-forte">
                              <span className="text-texto-tenue">Obs:</span>{" "}
                              {item.notes}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {order.cancellation_reason ? (
                  <p className="mt-3 rounded-logo bg-erro/5 p-3 text-xs text-texto-forte">
                    <span className="font-bold text-erro-700">Cancelado:</span>{" "}
                    {order.cancellation_reason}
                  </p>
                ) : null}

                {/*
                  Aviso quando o pedido está aberto mas não pode mais ser
                  cancelado: concluído é o único caso, e o botão some
                  silenciosamente. Dizer isso evita o lojista procurar o botão.
                */}
                {order.status === "completed" ? (
                  <p className="mt-3 rounded-logo bg-superficie p-3 text-xs text-texto-suave">
                    Pedido concluído — não pode mais ser alterado.
                  </p>
                ) : null}

                {order.notes ? (
                  <p className="mt-3 rounded-logo bg-superficie p-3 text-xs text-texto-forte">
                    <span className="font-bold">Observação:</span> {order.notes}
                  </p>
                ) : null}

                {order.address ? (
                  <p className="mt-2 text-xs text-texto-suave">
                    {order.address}
                  </p>
                ) : null}

                <OrderActions
                  orderId={order.id}
                  businessId={business.id}
                  backTo={backTo}
                  status={order.status}
                  fulfillment={order.fulfillment}
                  paymentStatus={order.payment_status}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
