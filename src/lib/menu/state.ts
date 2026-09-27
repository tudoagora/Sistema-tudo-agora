/**
 * Estado dos formulários do editor de cardápio.
 *
 * Fora de `actions.ts` pelo mesmo motivo que em `empresas/state.ts`: um arquivo
 * `"use server"` só pode exportar funções async.
 */
export type MenuState = { error: string | null };

export const emptyMenuState: MenuState = { error: null };

/** Resultado de um upload de imagem. `url` pronto para gravar no produto. */
export type UploadState = { url: string | null; error: string | null };

export const emptyUploadState: UploadState = { url: null, error: null };
