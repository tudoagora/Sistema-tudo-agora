"use client";

import { useActionState } from "react";

import { createFirstAdmin, type FirstRunState } from "./actions";

const initial: FirstRunState = { error: null, ok: false };

const field =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte transition-colors placeholder:text-texto-tenue focus:border-marca-600";

export function FirstRunForm() {
  const [state, action, pending] = useActionState(createFirstAdmin, initial);

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-texto-forte">
          Nome completo
        </label>
        <input id="fullName" name="fullName" required autoComplete="name" className={field} placeholder="Seu nome" />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-texto-forte">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={field}
          placeholder="voce@tudoagora.app.br"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-texto-forte">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
          placeholder="mínimo de 8 caracteres"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-logo border border-erro/30 bg-erro/5 px-4 py-3 text-sm text-erro-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-pill bg-marca-gradient px-6 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Criando conta…" : "Criar conta de administrador"}
      </button>
    </form>
  );
}
