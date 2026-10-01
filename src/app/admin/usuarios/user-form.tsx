"use client";

import { useActionState } from "react";

import { createUser } from "./actions";
import { emptyUserForm, MEMBER_ROLE_LABELS, ROLE_LABELS } from "./state";

const field =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte focus:border-marca-600";

export type BusinessOption = { id: number; name: string };

export function UserForm({ businesses }: { businesses: BusinessOption[] }) {
  const [state, action, pending] = useActionState(createUser, emptyUserForm);
  const erro = (campo: string) => state.fieldErrors[campo];

  return (
    <form
      action={action}
      className="mt-8 rounded-card border border-borda bg-white p-6"
    >
      <h2 className="text-sm font-black text-marca-800">Criar conta</h2>
      <p className="mt-1 text-xs text-texto-tenue">
        A conta entra pronta para entrar, com a senha que você definir aqui. Para
        virar lojista, vincule a empresa no mesmo cadastro.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="fullName"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
          >
            Nome completo
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            maxLength={120}
            autoComplete="off"
            aria-invalid={Boolean(erro("fullName"))}
            className={field}
          />
          {erro("fullName") ? (
            <p className="mt-1 text-xs text-erro-700">{erro("fullName")}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            aria-invalid={Boolean(erro("email"))}
            className={field}
          />
          {erro("email") ? (
            <p className="mt-1 text-xs text-erro-700">{erro("email")}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
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
            aria-invalid={Boolean(erro("password"))}
            className={field}
          />
          {erro("password") ? (
            <p className="mt-1 text-xs text-erro-700">{erro("password")}</p>
          ) : (
            <p className="mt-1 text-xs text-texto-tenue">
              Mínimo de 8 caracteres.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
          >
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue="customer"
            aria-invalid={Boolean(erro("role"))}
            className={field}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {erro("role") ? (
            <p className="mt-1 text-xs text-erro-700">{erro("role")}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="businessId"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
          >
            Vínculo com a empresa
          </label>
          <select
            id="businessId"
            name="businessId"
            defaultValue=""
            aria-invalid={Boolean(erro("businessId"))}
            className={field}
          >
            <option value="">Sem vínculo</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
          {erro("businessId") ? (
            <p className="mt-1 text-xs text-erro-700">{erro("businessId")}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="memberRole"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
          >
            Poder na empresa
          </label>
          <select
            id="memberRole"
            name="memberRole"
            defaultValue="owner"
            className={field}
          >
            {Object.entries(MEMBER_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && !erro("email") && !erro("fullName") && !erro("password") ? (
        <p
          role="alert"
          className="mt-4 rounded-logo border border-erro/30 bg-erro/5 px-4 py-3 text-sm text-erro-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-12 rounded-pill bg-marca-gradient px-8 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Criando…" : "Criar conta"}
      </button>
    </form>
  );
}