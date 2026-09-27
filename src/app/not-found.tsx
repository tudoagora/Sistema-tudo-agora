import Link from "next/link";

import { siteConfig } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center lg:px-6">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-marca-600">
        Erro 404
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-marca-800">
        Não encontramos esta página
      </h1>
      <p className="mt-4 text-texto-suave">
        O endereço pode ter mudado ou a empresa pode ter saído do ar. Tente
        buscar pelo nome ou volte para a página inicial.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white"
        >
          Página inicial
        </Link>
        <Link
          href="/loja"
          className="inline-flex min-h-11 items-center rounded-pill border border-borda-forte px-5 text-sm font-semibold text-texto-suave"
        >
          Ver todas as empresas
        </Link>
      </div>
      <p className="mt-10 text-xs text-texto-tenue">
        {siteConfig.tagline}
      </p>
    </div>
  );
}
