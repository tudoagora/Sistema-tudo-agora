/** Estado do formulário de cancelamento. Vive fora do módulo `"use server"`
 *  porque um arquivo de Server Action só pode exportar funções async. */

export type CancelState = {
  error: string | null;
  /** Motivo que o lojista digitou, preservado para não perder a digitação
   *  quando a action devolve um erro. */
  reason: string;
};

export const emptyCancelState: CancelState = { error: null, reason: "" };
