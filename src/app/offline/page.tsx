import Link from "next/link";

import { supportLink } from "@/lib/site";

export const metadata = { robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24 text-center lg:px-6">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-marca-600">
        Sem conexão
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-marca-800">
        Você está offline
      </h1>
      <p className="mt-4 text-texto-suave">
        Não conseguimos carregar o diretório agora. Verifique sua internet e
        tente de novo — ou chame a empresa direto pelo WhatsApp.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white"
        >
          Tentar novamente
        </Link>
        <a
          href={supportLink("Olá! Estou sem conexão no Tudo Agora.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-pill border border-borda-forte px-5 text-sm font-semibold text-texto-suave"
        >
          Falar com o suporte
        </a>
      </div>
    </div>
  );
}
