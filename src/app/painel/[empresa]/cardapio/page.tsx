import type { Metadata } from "next";

import { MenuEditor } from "@/components/menu/menu-editor";
import { requireBusinessMember } from "@/lib/auth";
import { loadMenuEditorData } from "@/lib/menu/load";
import { storefrontSubdomains, storefrontUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cardápio",
  robots: { index: false, follow: false },
};

export default async function PanelMenuPage(
  props: PageProps<"/painel/[empresa]/cardapio">,
) {
  const { empresa } = await props.params;
  const { business } = await requireBusinessMember(Number(empresa));

  const supabase = await createClient();
  const data = await loadMenuEditorData(supabase, business.id);

  // Idem ao cabeçalho do painel: subdomínio no domínio oficial, caminho
  // relativo enquanto a vitrine não tem host próprio.
  const slug = business.customSlug ?? business.slug;
  const previewHref = storefrontSubdomains
    ? storefrontUrl(slug)
    : `/cardapio/${slug}`;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-marca-800">
            Itens e seções
          </h2>
          <p className="mt-1 text-sm text-texto-suave">
            O que estiver pausado ou em seção oculta some da vitrine na hora.
          </p>
        </div>
        <a
          href={previewHref}
          target="_blank"
          rel="noopener"
          className="min-h-10 rounded-pill border border-borda-forte px-5 text-sm font-bold text-texto-suave hover:border-marca-600 hover:text-marca-800"
        >
          Ver como o cliente vê ↗
        </a>
      </div>

      {business.status !== "active" ? (
        <p className="mt-4 rounded-card border border-aviso/40 bg-aviso/5 px-4 py-3 text-sm font-semibold text-texto-forte">
          Sua empresa está com status <strong>{business.status}</strong>. O
          cardápio fica público assim que ela for ativada.
        </p>
      ) : null}

      <MenuEditor
        businessId={business.id}
        previewHref={previewHref}
        {...data}
      />
    </>
  );
}
