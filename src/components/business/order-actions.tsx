"use client";

import { useActionState, useState } from "react";

import {
  cancelOrder,
  markOrderPaid,
  updateOrderStatus,
} from "@/app/painel/[empresa]/pedidos/actions";
import { emptyCancelState } from "@/app/painel/[empresa]/pedidos/state";
import {
  canCancelOrder,
  nextOrderStep,
  previousOrderStep,
} from "@/lib/order";
import { cn } from "@/lib/utils";

const botao =
  "inline-flex min-h-10 items-center justify-center rounded-pill px-4 text-xs font-bold transition-opacity";

/**
 * Ações de um pedido: avançar, voltar e cancelar.
 *
 * Fica num componente client porque o cancelamento precisa de um campo de
 * motivo que só aparece depois do clique — no servidor o botão viria sempre
 * visível e qualquer toque cancelaria o pedido sem perguntar nada.
 */
export function OrderActions({
  orderId,
  businessId,
  backTo,
  status,
  fulfillment,
  paymentStatus,
}: {
  orderId: number;
  businessId: number;
  backTo: string;
  status: string;
  fulfillment: string;
  paymentStatus: string;
}) {
  const [cancelando, setCancelando] = useState(false);
  const [state, formAction, pending] = useActionState(
    cancelOrder,
    emptyCancelState,
  );

  const step = nextOrderStep(status, fulfillment);
  const voltar = previousOrderStep(status);
  const podeCancelar = canCancelOrder(status);

  // Pedido encerrado não tem mais nada a fazer: nem avançar, nem voltar, nem
  // cancelar. Sem este early return o botão de cancelar continuaria aparecendo
  // em pedido concluído, que é justamente o que `canCancelOrder` impede.
  if (status === "completed" || status === "cancelled") {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {step ? (
          <form action={updateOrderStatus}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="backTo" value={backTo} />
            <input type="hidden" name="status" value={step.value} />
            <button
              type="submit"
              className={cn(botao, "bg-marca-gradient text-white hover:opacity-90")}
            >
              {step.label}
            </button>
          </form>
        ) : null}

        {voltar ? (
          <form action={updateOrderStatus}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="backTo" value={backTo} />
            <input type="hidden" name="status" value={voltar.value} />
            <button
              type="submit"
              className={cn(
                botao,
                "border border-borda-forte text-texto-suave hover:border-marca-600 hover:text-marca-800",
              )}
            >
              {voltar.label}
            </button>
          </form>
        ) : null}

        {paymentStatus !== "paid" ? (
          <form action={markOrderPaid}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="backTo" value={backTo} />
            <button
              type="submit"
              className={cn(
                botao,
                "border border-sucesso/40 text-sucesso-700 hover:bg-sucesso/10",
              )}
            >
              Marcar como pago
            </button>
          </form>
        ) : null}

        {podeCancelar && !cancelando ? (
          <button
            type="button"
            onClick={() => setCancelando(true)}
            className={cn(botao, "text-texto-tenue hover:text-erro-700")}
          >
            Cancelar pedido
          </button>
        ) : null}
      </div>

      {cancelando ? (
        <form
          action={formAction}
          className="space-y-2 rounded-card border border-erro/30 bg-erro/5 p-3"
        >
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="backTo" value={backTo} />

          <label
            htmlFor={`motivo-${orderId}`}
            className="block text-xs font-bold text-texto-forte"
          >
            Por que este pedido está sendo cancelado?
          </label>
          <textarea
            id={`motivo-${orderId}`}
            name="reason"
            rows={2}
            required
            maxLength={500}
            defaultValue={state.reason}
            placeholder="Cliente desistiu, item esgotado, endereço fora da área…"
            className="w-full rounded-logo border border-borda bg-white p-2 text-sm text-texto-forte focus:border-marca-600"
          />

          {state.error ? (
            <p role="alert" className="text-xs font-bold text-erro-700">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className={cn(
                botao,
                "bg-erro px-4 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {pending ? "Cancelando…" : "Confirmar cancelamento"}
            </button>
            <button
              type="button"
              onClick={() => setCancelando(false)}
              className={cn(botao, "text-texto-suave hover:text-texto-forte")}
            >
              Manter pedido
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
