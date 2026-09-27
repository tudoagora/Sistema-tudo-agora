"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { requireBusinessMember } from "@/lib/auth";
import { canCancelOrder } from "@/lib/order";
import { createClient } from "@/lib/supabase/server";

import type { CancelState } from "./state";

/** Destinos de status alcançáveis por "avançar" ou "voltar". `cancelled` fica
 *  de fora de propósito: cancelamento exige motivo e passa por
 *  `cancelOrder`, então esta action não pode ser usada para contornar isso. */
const statusSchema = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "completed",
]);

const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Explique o motivo do cancelamento.")
    .max(500, "Motivo muito longo."),
});

/** Quantas linhas o pedido tem, para revalidar quem interessa. */
function paginaDaEmpresa(businessId: number) {
  return `/painel/${businessId}/pedidos`;
}

/**
 * Avança ou volta o status de um pedido.
 *
 * A RLS `orders_business_update` (migration 0003) restringe ao lojista da
 * empresa, e o `.eq("business_id")` fecha o resto — sem isso um id de pedido
 * adivinhado de outra empresa passaria pela checagem de papel.
 */
export async function updateOrderStatus(formData: FormData) {
  const businessId = Number(formData.get("businessId"));
  const orderId = Number(formData.get("orderId"));
  const backTo = String(formData.get("backTo") ?? "");

  await requireBusinessMember(businessId);

  const parsed = statusSchema.safeParse(formData.get("status"));
  if (!parsed.success || !Number.isInteger(orderId)) return;

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Voltar um passo tem que limpar o carimbo do passo que deixou de valer.
  // Sem isso um pedido que saiu de "em preparo" e voltou carregaria um
  // `completed_at` de quando foi concluded, e o histórico mente.
  const patch =
    parsed.data === "confirmed"
      ? { status: parsed.data, confirmed_at: now }
      : parsed.data === "completed"
        ? { status: parsed.data, completed_at: now }
        : parsed.data === "pending"
          ? { status: parsed.data, confirmed_at: null }
          : { status: parsed.data, completed_at: null };

  await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("business_id", businessId);

  revalidatePath(backTo || paginaDaEmpresa(businessId));
}

/**
 * Cancela um pedido, guardando o motivo.
 *
 * O status atual é lido do banco em vez de vir de campo escondido: é o que
 * garante que um pedido já concluído não seja cancelado por quem mexer no
 * HTML, e que o motivo gravado corresponda ao que estava na tela.
 */
export async function cancelOrder(
  _prev: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const businessId = Number(formData.get("businessId"));
  const orderId = Number(formData.get("orderId"));
  const backTo = String(formData.get("backTo") ?? "");

  if (!Number.isInteger(businessId) || !Number.isInteger(orderId)) {
    return { error: "Pedido inválido.", reason: "" };
  }
  await requireBusinessMember(businessId);

  const parsed = cancelSchema.safeParse({
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Motivo inválido.",
      reason: String(formData.get("reason") ?? ""),
    };
  }

  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!atual) {
    return { error: "Pedido não encontrado.", reason: parsed.data.reason };
  }
  if (!canCancelOrder(atual.status)) {
    return {
      error: "Este pedido não pode mais ser cancelado.",
      reason: parsed.data.reason,
    };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancellation_reason: parsed.data.reason })
    .eq("id", orderId)
    .eq("business_id", businessId);

  if (error) {
    return { error: error.message, reason: parsed.data.reason };
  }

  revalidatePath(backTo || paginaDaEmpresa(businessId));
  return { error: null, reason: "" };
}

/**
 * Marca o pagamento como pago.
 *
 * O checkout do cardápio é manual (Pix na entrega, dinheiro, cartão), então o
 * lojista é quem confirma o recebimento — não existe integração de pagamento
 * para fazer isso sozinha.
 */
export async function markOrderPaid(formData: FormData) {
  const businessId = Number(formData.get("businessId"));
  const orderId = Number(formData.get("orderId"));
  const backTo = String(formData.get("backTo") ?? "");

  await requireBusinessMember(businessId);
  if (!Number.isInteger(orderId)) return;

  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId)
    .eq("business_id", businessId);

  revalidatePath(backTo || paginaDaEmpresa(businessId));
}
