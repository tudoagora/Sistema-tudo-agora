"use client";

import { useActionState } from "react";

import { createCity, type CityFormState } from "./actions";

const initial: CityFormState = { error: null };

const field =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte focus:border-marca-600";

export function CityForm() {
  const [state, action, pending] = useActionState(createCity, initial);

  return (
    <form action={action} className="mt-6 rounded-card border border-borda bg-white p-6">
      <h2 className="text-sm font-black text-marca-800">Adicionar cidade</h2>
      <p className="mt-1 text-xs text-texto-tenue">
        O endereço é gerado automaticamente: Tapurah vira tapurah-mt.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_6rem]">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-texto-forte">
            Nome da cidade
          </label>
          <input id="name" name="name" required maxLength={80} className={field} placeholder="Tapurah" />
        </div>
        <div>
          <label htmlFor="state" className="mb-1.5 block text-sm font-semibold text-texto-forte">
            UF
          </label>
          <input
            id="state"
            name="state"
            required
            maxLength={2}
            className={`${field} uppercase`}
            placeholder="MT"
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="mt-4 rounded-logo border border-erro/30 bg-erro/5 px-4 py-3 text-sm text-erro-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-12 rounded-pill bg-marca-gradient px-8 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Cadastrar cidade"}
      </button>
    </form>
  );
}
