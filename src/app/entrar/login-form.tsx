"use client";

import { useActionState } from "react";

import { login } from "@/app/entrar/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, {
    error: null,
  });

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-bold text-texto-forte"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 min-h-11 w-full rounded-pill border border-borda-forte bg-white px-4 text-sm text-texto focus:border-marca-600"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-bold text-texto-forte"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 min-h-11 w-full rounded-pill border border-borda-forte bg-white px-4 text-sm text-texto focus:border-marca-600"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-logo bg-erro-100 px-4 py-3 text-sm font-semibold text-erro-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
