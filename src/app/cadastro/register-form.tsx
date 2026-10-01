"use client";

import { useActionState } from "react";

import { register, type RegisterState } from "@/app/cadastro/actions";

const initial: RegisterState = {
  error: null,
  fieldErrors: {},
  confirmationRequired: false,
};

const field =
  "mt-1.5 min-h-11 w-full rounded-pill border border-borda-forte bg-white px-4 text-sm text-texto focus:border-marca-600";

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(register, initial);
  const erro = (campo: string) => state.fieldErrors[campo];

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-bold text-texto-forte"
        >
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          maxLength={120}
          autoComplete="name"
          className={field}
        />
        {erro("fullName") ? (
          <p className="mt-1 text-xs text-erro-700">{erro("fullName")}</p>
        ) : null}
      </div>

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
          className={field}
        />
        {erro("email") ? (
          <p className="mt-1 text-xs text-erro-700">{erro("email")}</p>
        ) : null}
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
          minLength={8}
          autoComplete="new-password"
          className={field}
        />
        {erro("password") ? (
          <p className="mt-1 text-xs text-erro-700">{erro("password")}</p>
        ) : (
          <p className="mt-1 text-xs text-texto-tenue">
            Pelo menos 8 caracteres.
          </p>
        )}
      </div>

      {state.confirmationRequired ? (
        <p
          role="status"
          className="rounded-logo border border-sucesso/30 bg-sucesso/5 px-4 py-3 text-sm text-texto-forte"
        >
          Conta criada. Confirme o e-mail que enviamos e depois entre no Tudo
          Agora.
        </p>
      ) : state.error && !erro("email") && !erro("fullName") && !erro("password") ? (
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
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}