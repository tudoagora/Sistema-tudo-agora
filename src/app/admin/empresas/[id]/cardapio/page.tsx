import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MenuEditor } from "@/components/menu/menu-editor";
import { requireAdmin } from "@/lib/auth";
import { loadMenuEditorData } from "@/lib/menu/load";
import { storefrontSubdomains, storefrontUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

type PageParams = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Cardápio da empresa",
  robots: { index: false, follow: false },
};

export default async function BusinessMenuPage({ params }: PageParams) {
  await requireAdmin();
  const { id } = await params;
  const businessId = Number(id);
  if (!Number.isInteger(businessId)) notFound();

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, custom_slug, status")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) notFound();

  const data = await loadMenuEditorData(supabase, businessId);

  // Subdomínio da empresa no domínio oficial; caminho relativo antes dele.
  const slug = business.custom_slug ?? business.slug;
  const previewHref = storefrontSubdomains
    ? storefrontUrl(slug)
    : `/cardapio/${slug}`;

  return (
    <>
      <a
        href={`/admin/empresas/${businessId}`}
        className="text-sm font-semibold text-texto-suave hover:text-marca-800"
      >
        ← {business.name}
      </a>
      <h1 className="mt-2 text-2xl font-black text-marca-800">Cardápio</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Itens, preços, fotos e grupos de opção. O que está pausado ou em seção
        oculta não aparece para o cliente.
      </p>

      {business.status !== "active" ? (
        <p className="mt-4 rounded-card border border-aviso/40 bg-aviso/5 px-4 py-3 text-sm font-semibold text-texto-forte">
          Esta empresa está com status <strong>{business.status}</strong>. O
          cardápio só fica público depois que ela for ativada.
        </p>
      ) : null}

      <MenuEditor
        businessId={businessId}
        previewHref={previewHref}
        {...data}
      />
    </>
  );
}
