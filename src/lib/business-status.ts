/**
 * Vocabulário de `business_status` em um só lugar.
 *
 * A lista vivia em quatro arquivos independentes — o `<select>` do formulário, o
 * schema zod da action e os mapas de rótulo das telas — e eles divergiram: o
 * formulário oferecia `closed`, que não existe no enum do banco, enquanto a
 * action aceitava só `draft` e `active`. Escolher "Suspensa" derrubava o save
 * inteiro com "Confira os campos destacados", sem nunca renderizar o erro do
 * campo `status`. Derivando select, schema e rótulo do enum, a lista não tem
 * mais como divergir.
 *
 * Sem `"use server"` — este módulo é importado por Server Actions e por
 * componentes de servidor, que não podem importar nada síncrono de um módulo de
 * Server Action (mesma razão que documenta `lib/order.ts`).
 */

import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

export type BusinessStatus = Database["public"]["Enums"]["business_status"];

/** Ordem da tela: do mais invisível ao mais nocivo. */
export const BUSINESS_STATUSES = [
  "draft",
  "pending",
  "active",
  "suspended",
] as const satisfies readonly BusinessStatus[];

export const businessStatusSchema = z.enum(BUSINESS_STATUSES);

/** Rótulo curto, para tabela e selo. */
export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  draft: "Rascunho",
  pending: "Aguardando aprovação",
  active: "Ativa",
  suspended: "Suspensa",
};

/** Texto do `<option>`, com o efeito prático de cada situação. */
export const BUSINESS_STATUS_OPTIONS: Record<BusinessStatus, string> = {
  draft: "Rascunho — invisível no site",
  pending: "Aguardando aprovação — invisível no site",
  active: "Ativa — visível no site",
  suspended: "Suspensa — invisível no site",
};

export const BUSINESS_STATUS_CLASS: Record<BusinessStatus, string> = {
  draft: "bg-superficie-2 text-texto-suave",
  pending: "bg-aviso/15 text-aviso-700",
  active: "bg-sucesso/10 text-sucesso-700",
  suspended: "bg-erro/10 text-erro-700",
};

/**
 * Rótulo de umasituação vinda do banco. O `Record` acima é exato de propósito —
 * é ele que impede o próximo status fantasma de entrar — então a ponte para o
 * `string` que vem de `select("status")` mora aqui, num lugar só.
 */
export function businessStatusLabel(status: string) {
  return BUSINESS_STATUS_LABELS[status as BusinessStatus] ?? status;
}

export function businessStatusClass(status: string) {
  return (
    BUSINESS_STATUS_CLASS[status as BusinessStatus] ??
    "bg-superficie-2 text-texto-suave"
  );
}
