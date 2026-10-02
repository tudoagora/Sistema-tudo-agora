"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveBusinessMenuUrl } from "../actions";
import { emptyMenuLinkState } from "../state";

/**
 * Campo de cardápio de fora, dentro do cartão "Cardápio" da lateral.
 *
 * Formulário próprio, e não mais um input no `BusinessForm`, por dois motivos
 * que se reforçam: o link é uma decisão à parte (a empresa tem cardápio aqui
 * ou não tem), e o `updateBusiness` reescreve a linha da empresa com a lista
 * inteira de colunas — se `menu_url` entrasse naquele formulário, ele
 * apagaria o link a cada save de qualquer outro campo, porque o formulário
 * não manda o campo.
 *
 * `type="url"` foi evitado de propósito: a validação nativa do navegador
 * bloqueia o submit de `wa.me/5511999` (sem esquema) com mensagem em inglês,
 * e o servidor justamente completa o esquema. `inputMode="url"` mantém o
 * teclado certo no celular sem trazer a validação junto.
 */
const field =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte transition-colors placeholder:text-texto-tenue focus:border-marca-600";

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-pill border border-marca-800 px-5 text-sm font-bold text-marca-800 transition-colors hover:bg-marca-100 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar link"}
    </button>
  );
}

export function MenuLinkField({
  businessId,
  menuUrl,
}: {
  businessId: number;
  menuUrl: string | null;
}) {
  const [state, formAction] = useActionState(saveBusinessMenuUrl, emptyMenuLinkState);

  return (
    <form action={formAction} className="mt-5 border-t border-borda pt-5">
      <input type="hidden" name="id" value={businessId} />

      <label
        htmlFor="menuUrl"
        className="block text-sm font-semibold text-texto-forte"
      >
        Cardápio de fora
      </label>
      <p className="mt-1 text-xs text-texto-tenue">
        Para quem já vende em outro lugar: app de delivery, site próprio ou
        conversa de WhatsApp. O link vira o botão principal na página da
        empresa. Vazio deixa a página mostrando só o WhatsApp.
      </p>

      <input
        id="menuUrl"
        name="menuUrl"
        type="text"
        inputMode="url"
        autoComplete="url"
        defaultValue={menuUrl ?? ""}
        maxLength={500}
        placeholder="https://wa.me/5566990000000"
        className={`${field} mt-3`}
      />

      {state.error ? (
        <p role="alert" className="mt-1 text-xs font-semibold text-erro-700">
          {state.error}
        </p>
      ) : state.saved ? (
        <p role="status" className="mt-1 text-xs font-semibold text-sucesso-700">
          Link salvo.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Botao />
        {menuUrl ? (
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-marca-800 underline underline-offset-4"
          >
            Abrir o link
          </a>
        ) : null}
      </div>
    </form>
  );
}