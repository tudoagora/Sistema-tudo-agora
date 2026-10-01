/**
 * Estado das actions de usuário em /admin/usuarios.
 *
 * Fica fora de `actions.ts` pela regra do projeto: um arquivo `"use server"`
 * só pode exportar funções async, e exportar este objeto derrubaria a página
 * inteira em runtime com "A 'use server' file can only export async functions,
 * found object".
 *
 * `createUser` devolve estado (o formulário fica na tela, com os erros por
 * campo); `updateUser` e `deleteUser` redirecionam com `?feito=`/`?erro=` e
 * passam pelo `adminFlash`, igual a `deleteCity` e `updatePlan`.
 */
export type UserFormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

export const emptyUserForm: UserFormState = { error: null, fieldErrors: {} };

export const ROLE_LABELS: Record<string, string> = {
  customer: "Cliente",
  merchant: "Lojista",
  admin: "Admin",
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  manager: "Gerente",
};