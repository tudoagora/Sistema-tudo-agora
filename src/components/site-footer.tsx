import Link from "next/link";

import { footerLinks, siteConfig } from "@/lib/site";
import { whatsappLink } from "@/lib/format";

export function SiteFooter() {
  const support = whatsappLink(
    siteConfig.whatsapp,
    "Olá! Preciso de ajuda com o Tudo Agora.",
  );

  return (
    <footer className="mt-20 bg-marca-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-2xl font-black tracking-tight">
              Tudo<span className="text-destaque-500">Agora</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-white/70">
              {siteConfig.tagline}. Conectando pessoas a sensações.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/planos"
                className="rounded-pill bg-destaque-500 px-5 py-2.5 text-sm font-bold text-marca-900 transition-colors hover:bg-destaque-400"
              >
                Anuncie
              </Link>
              <Link
                href="/minha-conta"
                className="rounded-pill border border-white/25 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-white/60"
              >
                Minha Conta
              </Link>
            </div>
          </div>

          <nav aria-labelledby="rodape-acesso">
            <h2
              id="rodape-acesso"
              className="text-sm font-bold uppercase tracking-wider text-white/60"
            >
              Acesso Rápido
            </h2>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.quick.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 transition-colors hover:text-destaque-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {support ? (
                <li>
                  <a
                    href={support}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/80 transition-colors hover:text-destaque-500"
                  >
                    Fale Conosco
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>

          <nav aria-labelledby="rodape-paginas">
            <h2
              id="rodape-paginas"
              className="text-sm font-bold uppercase tracking-wider text-white/60"
            >
              Páginas Importantes
            </h2>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.pages.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 transition-colors hover:text-destaque-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. Todos os direitos
            reservados.
          </p>
          <p>Suporte: {siteConfig.phoneDisplay}</p>
        </div>
      </div>
    </footer>
  );
}
