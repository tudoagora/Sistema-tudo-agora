"use client";

import { useActionState } from "react";

import { createCategory, type CategoryFormState } from "./actions";

const initial: CategoryFormState = { error: null };

const field =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte focus:border-marca-600";

export function CategoryForm({
  raizes,
}: {
  raizes: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState(createCategory, initial);

  return (
    <form
      action={action}
      className="mt-6 rounded-card border border-borda bg-white p-6"
    >
      <h2 className="text-sm font-black text-marca-800">
        Adicionar categoria
      </h2>
      <p className="mt-1 text-xs text-texto-tenue">
        Sem categoria principal ela vira uma das pílulas da home. Escolhendo uma
        principal, nasce como subcategoria.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
          >
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            className={field}
            placeholder="Barbearia"
          />
        </div>
        <div>
          <label
            htmlFor="parentId"
            className="mb-1.5 block text-sm font-semibold text-texto-forte"
          >
            Categoria principal
          </label>
          <select id="parentId" name="parentId" defaultValue="" className={field}>
            <option value="">É uma categoria principal</option>
            {raizes.map((raiz) => (
              <option key={raiz.id} value={raiz.id}>
                {raiz.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? (
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
        {pending ? "Salvando…" : "Cadastrar categoria"}
      </button>
    </form>
  );
}
