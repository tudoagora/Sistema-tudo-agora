/**
 * Estado do formulário de empresa.
 *
 * Vive fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções async — exportar este objeto derrubava o `next build` com
 * "A 'use server' file can only export async functions, found object".
 *
 * O mesmo formato é usado pelas duas actions que salvam empresa
 * (`updateBusiness` do admin e `updateBusinessProfile` do lojista), porque as
 * duas alimentam o mesmo componente `BusinessForm`.
 */
export type BusinessFormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  /**
   * Confirmação de sucesso, para actions que não redirecionam.
   *
   * Opcional de propósito: `createBusiness` faz redirect depois de criar, então
   * nunca chega a montar um estado de sucesso. Só o `updateBusinessProfile`
   * (lojista) devolve isto, porque ele te deixa na mesma tela.
   */
  saved?: boolean;
};

export const emptyBusinessForm: BusinessFormState = {
  error: null,
  fieldErrors: {},
};
