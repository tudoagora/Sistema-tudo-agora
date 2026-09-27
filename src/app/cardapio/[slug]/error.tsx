"use client";

import { useEffect } from "react";

export default function CardapioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-black text-marca-800">
        Não conseguimos abrir este cardápio
      </h1>
      <p className="mt-3 text-sm text-texto-suave">
        Pode ser uma instabilidade do banco ou o cardápio foi alterado agora
        há pouco. Tente de novo em alguns segundos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 min-h-11 rounded-pill bg-marca-gradient px-7 text-sm font-bold text-white"
      >
        Tentar de novo
      </button>
    </section>
  );
}
