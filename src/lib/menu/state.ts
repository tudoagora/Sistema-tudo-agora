/**
 * Estado dos formulários do editor de cardápio.
 *
 * Fora de `actions.ts` pelo mesmo motivo que em `empresas/state.ts`: um arquivo
 * `"use server"` só pode exportar funções async.
 */
export type MenuState = { error: string | null };

export const emptyMenuState: MenuState = { error: null };

/**
 * Resultado de uma mutação do editor que roda em `<form action>` sem
 * `useActionState`.
 *
 * A action NÃO redireciona: devolver o resultado deixa o cliente mostrar um
 * toast no lugar, mantendo o scroll e o painel de edição abertos. `ok` é a
 * mensagem de sucesso; `error`, o motivo da falha. Os dois nunca vêm juntos.
 */
export type MenuActionResult = { error: string | null; ok: string | null };

/** Resultado de um upload de imagem. `url` pronto para gravar no produto. */
export type UploadState = { url: string | null; error: string | null };

export const emptyUploadState: UploadState = { url: null, error: null };
