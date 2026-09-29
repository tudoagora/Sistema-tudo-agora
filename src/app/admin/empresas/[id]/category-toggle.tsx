"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";
import { setBusinessCategory } from "../actions";
import { emptyCategoryState } from "../state";

/**
 * Uma categoria da lateral, com a caixa que liga/desliga.
 *
 * A caixa é um `<button type="submit" name="active">` de verdade, e não um
 * `<input type="checkbox">`: checkbox sozinho não submete form, então o clique
 * marcava na tela sem chegar no servidor e a categoria sumia no reload.
 *
 * O `value` do botão sai do estado que o **servidor** mandou, não do otimista:
 * um botão de submit sempre entra no FormData com o próprio `name`/`value`, e
 * `value="on"` fixo faria a action receber "marcar" mesmo quando o objetivo era
 * desmarcar. Assim o clique carrega a intenção certa e ainda funciona sem JS
 * (a página inteira recarrega com o estado novo).
 */
function Caixa({ marcado, servidor, nome, aoClicar }: {
  marcado: boolean;
  servidor: boolean;
  nome: string;
  aoClicar: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="active"
      value={servidor ? "" : "on"}
      role="checkbox"
      aria-checked={marcado}
      disabled={pending}
      onClick={aoClicar}
      title={pending ? "Salvando…" : `${marcado ? "Desmarcar" : "Marcar"} ${nome}`}
      className={cn(
        "flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-logo px-2 text-left text-sm text-texto-forte transition-colors hover:bg-superficie",
        pending && "opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors",
          marcado ? "border-marca-800 bg-marca-800" : "border-borda-forte bg-white",
        )}
      >
        {marcado ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M2.5 6.2 4.8 8.5 9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {nome}
      <span className="sr-only">
        {pending ? " — salvando" : marcado ? " — marcada, clique para desmarcar" : " — clique para marcar"}
      </span>
    </button>
  );
}

export function CategoryToggle({
  businessId,
  categoryId,
  name,
  marcado,
}: {
  businessId: number;
  categoryId: number;
  name: string;
  marcado: boolean;
}) {
  const [state, formAction] = useActionState(setBusinessCategory, emptyCategoryState);
  // A caixa antecipa o resultado enquanto a action voa; o banco é a verdade.
  // Sincronizar no render (e não num effect) é o padrão do React para estado
  // derivado de prop, e o `react-hooks/set-state-in-effect` barra o effect.
  const [local, setLocal] = useState(marcado);
  const [ultimo, setUltimo] = useState({ doServidor: marcado, resultado: state });
  if (ultimo.doServidor !== marcado || ultimo.resultado !== state) {
    setUltimo({ doServidor: marcado, resultado: state });
    setLocal(marcado);
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <Caixa
        marcado={local}
        servidor={marcado}
        nome={name}
        aoClicar={() => setLocal((v) => !v)}
      />
      {state.error ? (
        <p role="alert" className="px-2 text-xs font-semibold text-erro-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
