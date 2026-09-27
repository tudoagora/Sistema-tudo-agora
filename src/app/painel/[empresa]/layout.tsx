import Link from "next/link";

import { PanelNav } from "@/components/business/panel-nav";
import { BusinessAvatar } from "@/components/business-card";
import { requireBusinessMember } from "@/lib/auth";
import { storefrontSubdomains, storefrontUrl } from "@/lib/site";

export default async function PanelBusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = await params;
  const { business } = await requireBusinessMember(Number(empresa));

  // No domínio oficial o botão já mostra o endereço definitivo da vitrine
  // (subdomínio da empresa); antes dele, o caminho relativo de sempre — que é
  // o que funciona no `vercel.app` e no desenvolvimento local.
  const slug = business.customSlug ?? business.slug;
  const vitrineHref = storefrontSubdomains
    ? storefrontUrl(slug)
    : `/cardapio/${slug}`;

  return (
    <div className="mt-6">
      <Link
        href="/painel"
        className="text-sm font-semibold text-texto-suave hover:text-marca-800"
      >
        ← Todas as empresas
      </Link>

      <header className="mt-3 flex flex-wrap items-center gap-4 rounded-card border border-borda bg-white p-5">
        <BusinessAvatar
          name={business.name}
          logoUrl={business.logoUrl}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black text-marca-800">
            {business.name}
          </h1>
          <p className="truncate text-xs text-texto-tenue">{business.cityName}</p>
        </div>
        {/* `<a>` em vez de `Link`: com subdomínio o destino é outra origem, e
            o `typedRoutes` só aceita string calculada em âncora comum. */}
        <a
          href={vitrineHref}
          target="_blank"
          rel="noopener"
          className="min-h-10 rounded-pill border border-borda-forte px-5 text-sm font-bold text-texto-suave hover:border-marca-600 hover:text-marca-800"
        >
          Ver cardápio ↗
        </a>
      </header>

      <PanelNav
        items={[
          { href: `/painel/${business.id}`, label: "Início" },
          { href: `/painel/${business.id}/pedidos`, label: "Pedidos" },
          { href: `/painel/${business.id}/cardapio`, label: "Cardápio" },
          { href: `/painel/${business.id}/perfil`, label: "Dados da loja" },
        ]}
      />

      {children}
    </div>
  );
}
