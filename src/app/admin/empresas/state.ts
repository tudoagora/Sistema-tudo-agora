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

/**
 * Estado das caixinhas de categoria da lateral.
 *
 * `setBusinessCategory` grava uma linha por vez e não redireciona, então devolve
 * estado para a tela confirmar o que foi salvo — ou dizer por que não foi.
 */
export type CategoryState = {
  error: string | null;
  saved: boolean;
};

export const emptyCategoryState: CategoryState = { error: null, saved: false };

/**
 * Estado do campo de cardápio de fora (cartão "Cardápio" da lateral).
 *
 * Não usa `BusinessFormState` de propósito: o link é gravado por uma action
 * só dele, no cartão do admin, e não pelo formulário grande da empresa. Se
 * entrasse no `BusinessForm`, salvar o nome da loja apagaria o link — o
 * `updateBusiness` reescreve a linha com a lista inteira de colunas e
 * `menu_url` não está nessa lista.
 */
export type MenuLinkState = {
  error: string | null;
  saved: boolean;
};

export const emptyMenuLinkState: MenuLinkState = { error: null, saved: false };
