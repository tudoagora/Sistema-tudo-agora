/** Rótulos e transições de status de pedido. Sem `"use server"` — usado
 *  também por componentes de servidor, que não podem importar função
 *  síncrona de um módulo de Server Action. */

import type { Database } from "@/lib/supabase/database.types";

/** Enum de status direto do banco. O filtro passa esse array para `.in()`, e
 *  um `string[]` genérico não é atribuível ao tipo da coluna — sem esta
 *  âncora o compilador aceitaria status que o Postgres rejeitaria. */
export type OrderStatus = Database["public"]["Enums"]["order_status"];

/**
 * `businesses.payment_methods` guarda o vocabulário em português usado pelo
 * formulário da empresa (`business-form.tsx`), não o enum `payment_method`.
 * Esta ponte é o único lugar onde os dois se encontram — o cliente escolhe
 * pelo rótulo, o banco grava pelo enum.
 */
export const PAYMENT_METHODS = [
  { key: "pix", enum: "pix", label: "Pix" },
  { key: "dinheiro", enum: "cash", label: "Dinheiro" },
  { key: "cartao_entrega", enum: "card_on_delivery", label: "Cartão na entrega" },
  { key: "cartao_retirada", enum: "card_online", label: "Cartão na retirada" },
  { key: "cartao", enum: "card_on_delivery", label: "Cartão" },
] as const;

export type PaymentEnum = (typeof PAYMENT_METHODS)[number]["enum"];

/** Formas que a empresa aceita de fato, na ordem do formulário. */
export function availablePayments(accepted: readonly string[] | null) {
  if (!accepted) return [];
  return PAYMENT_METHODS.filter((method) => accepted.includes(method.key));
}

/** Confere se um enum pedido está entre as formas que a empresa aceita. */
export function isPaymentAccepted(
  accepted: readonly string[] | null,
  value: string,
): boolean {
  return PAYMENT_METHODS.some(
    (method) => method.enum === value && accepted?.includes(method.key),
  );
}

/** Uma opção do pedido, como foi gravada em `order_item_options`. */
export type OrderItemOption = {
  id: number;
  option_group_name: string;
  option_value_name: string;
  price_delta_cents: number;
};

export type GroupedItemOption = {
  group: string;
  values: { name: string; deltaCents: number }[];
};

/**
 * Agrupa as opções de um item pelos grupos, na ordem em que o cliente
 * escolheu.
 *
 * `order_item_options` é um snapshot: guarda `option_group_name` e
 * `option_value_name` como texto, não ids. Sem o agrupamento, "Grande" e
 * "Portuguesa" apareceriam numa lista solta e o lojista teria que lembrar que
 * uma é tamanho e a outra é borda — que é exatamente o que ele precisa ler
 * para produzir o pedido.
 */
export function groupItemOptions(
  options: readonly OrderItemOption[] | null | undefined,
): GroupedItemOption[] {
  if (!options || options.length === 0) return [];

  const groups = new Map<string, { name: string; deltaCents: number }[]>();
  for (const option of options) {
    const chave = option.option_group_name;
    const lista = groups.get(chave) ?? [];
    lista.push({
      name: option.option_value_name,
      deltaCents: option.price_delta_cents,
    });
    groups.set(chave, lista);
  }
  return [...groups].map(([group, values]) => ({ group, values }));
}

/** Rótulo do meio de pagamento a partir do enum, para não mostrar `card_on_delivery`. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card_on_delivery: "Cartão na entrega",
  card_online: "Cartão na retirada",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pagamento pendente",
  paid: "Pago",
  failed: "Pagamento falhou",
  refunded: "Estornado",
};

export const PAYMENT_STATUS_CLASS: Record<string, string> = {
  pending: "bg-aviso/15 text-aviso-700",
  paid: "bg-sucesso/10 text-sucesso-700",
  failed: "bg-erro/10 text-erro-700",
  refunded: "bg-superficie-2 text-texto-suave",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Novo",
  confirmed: "Aceito",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  ready_for_pickup: "Pronto para retirada",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_CLASS: Record<string, string> = {
  pending: "bg-destaque-500/20 text-marca-800",
  confirmed: "bg-info/10 text-info-700",
  preparing: "bg-aviso/15 text-aviso-700",
  out_for_delivery: "bg-info/10 text-info-700",
  ready_for_pickup: "bg-info/10 text-info-700",
  completed: "bg-sucesso/10 text-sucesso-700",
  cancelled: "bg-erro/10 text-erro-700",
};

/**
 * Próximo passo offered ao lojista. `delivery` e `pickup` divergem só no fim
 * do fluxo, então o resto é igual.
 */
export function nextOrderStep(
  current: string,
  fulfillment: string,
): { value: string; label: string } | null {
  switch (current) {
    case "pending":
      return { value: "confirmed", label: "Aceitar" };
    case "confirmed":
      return { value: "preparing", label: "Começar preparo" };
    case "preparing":
      return fulfillment === "pickup"
        ? { value: "ready_for_pickup", label: "Pronto para retirada" }
        : { value: "out_for_delivery", label: "Saiu para entrega" };
    case "out_for_delivery":
    case "ready_for_pickup":
      return { value: "completed", label: "Concluir" };
    default:
      return null;
  }
}

/**
 * Um pedido concluído ou já cancelado é histórico: não volta nem se cancela.
 *
 * Sem esta trava o lojista que clicasse por engano em "Cancelar" num pedido já
 * entregue apagaria da operação um pedido que ele mesmo dão como concluído.
 */
export function canCancelOrder(status: string) {
  return status !== "completed" && status !== "cancelled";
}

/**
 * Transição inversa, para desfazer um avanço sem querer.
 *
 * "Aceitar" com o dedo errado é comum, e sem volta o pedido ficava travado em
 * `confirmed` sem como corrigir. Só oferece um passo para trás por vez, e
 * nunca sai de `completed`/`cancelled`.
 */
export function previousOrderStep(
  current: string,
): { value: string; label: string } | null {
  switch (current) {
    case "confirmed":
      return { value: "pending", label: "Voltar para novo" };
    case "preparing":
      return { value: "confirmed", label: "Voltar para aceito" };
    case "out_for_delivery":
    case "ready_for_pickup":
      return { value: "preparing", label: "Voltar para em preparo" };
    default:
      return null;
  }
}

/**
 * Filtros da listagem, na ordem em que o lojista trabalha: o que chegou agora
 * primeiro, o que já saiu do frying pan por último.
 *
 * "Em andamento" junta os quatro estados do meio de produção. O lojista não
 * pensa em "aceito" e "saiu para entrega" como filas separadas quando olha o
 * que tem para fazer — ele quer saber o que está em aberto.
 */
export type OrderFilterKey =
  | "todos"
  | "novos"
  | "andamento"
  | "concluidos"
  | "cancelados";

export const ORDER_FILTERS: readonly {
  key: OrderFilterKey;
  label: string;
  /** `null` = sem filtro de status. */
  statuses: readonly OrderStatus[] | null;
}[] = [
  { key: "todos", label: "Todos", statuses: null },
  { key: "novos", label: "Novos", statuses: ["pending"] },
  {
    key: "andamento",
    label: "Em andamento",
    statuses: ["confirmed", "preparing", "out_for_delivery", "ready_for_pickup"],
  },
  { key: "concluidos", label: "Concluídos", statuses: ["completed"] },
  { key: "cancelados", label: "Cancelados", statuses: ["cancelled"] },
];

/** Chave de filtro vinda da query string, com queda para "todos". */
export function resolveOrderFilter(
  value: string | undefined,
): (typeof ORDER_FILTERS)[number] {
  return ORDER_FILTERS.find((f) => f.key === value) ?? ORDER_FILTERS[0];
}
