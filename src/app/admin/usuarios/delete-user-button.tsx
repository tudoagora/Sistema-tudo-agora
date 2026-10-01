"use client";

import { useState } from "react";

import { deleteUser } from "./actions";

const botao =
  "min-h-11 rounded-pill px-5 text-sm font-semibold transition-colors";

/**
 * Remoção de conta com confirmação em dois passos.
 *
 * Fica num componente client porque a pergunta precisa acontecer antes do
 * submit — no servidor o botão viria sempre visível e um toque errado apagava
 * a conta sem perguntar nada. Mesmo desenho do cancelamento de pedido em
 * `business/order-actions.tsx`.
 */
export function DeleteUserButton({
  userId,
  userName,
  disabled,
}: {
  userId: string;
  userName: string;
  disabled: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (disabled) {
    return (
      <div className="mt-3">
        <button
          type="button"
          disabled
          className={`${botao} border border-borda-forte text-texto-suave disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Remover conta
        </button>
      </div>
    );
  }

  if (!confirmando) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className={`${botao} border border-borda-forte text-texto-suave hover:border-erro hover:text-erro-700`}
        >
          Remover conta
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-card border border-erro/30 bg-erro/5 p-3">
      <p className="text-sm font-bold text-texto-forte">
        Remover mesmo a conta de {userName}?
      </p>
      <p className="mt-1 text-xs text-texto-suave">
        Isso apaga o login, o perfil e o histórico do usuário. Não dá para
        desfazer.
      </p>

      <form action={deleteUser} className="mt-3">
        <input type="hidden" name="id" value={userId} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className={`${botao} bg-erro text-white hover:opacity-90`}
          >
            Sim, remover conta
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className={`${botao} border border-borda-forte text-texto-suave hover:border-marca-600 hover:text-marca-800`}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}