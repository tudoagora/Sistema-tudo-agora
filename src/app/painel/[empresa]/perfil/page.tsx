import type { Metadata } from "next";
import Link from "next/link";

import { BusinessForm } from "@/components/business/business-form";
import { requireBusinessMember } from "@/lib/auth";
import type { OpeningHours } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dados da loja",
  robots: { index: false, follow: false },
};

/**
 * Dados que o lojista dono controla da própria empresa.
 *
 * A leitura vem do RLS (`businesses_manage_read`), então `maybeSingle()`
 * vazio já é a resposta "não". Cidade e situação não aparecem aqui: publicar a
 * loja é decisão da equipe do Tudo Agora, e o trigger
 * `businesses_guard_admin_columns` recusa se tentarem.
 */
export default async function PanelProfilePage(
  props: PageProps<"/painel/[empresa]/perfil">,
) {
  const { empresa } = await props.params;
  const businessId = Number(empresa);
  const { business } = await requireBusinessMember(businessId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(
      "name, description, logo_url, cover_url, phone, whatsapp, email, instagram, address, neighborhood, opening_hours, pix_key, delivery_fee_cents, min_order_cents, fulfillment, payment_methods, accepts_quote",
    )
    .eq("id", businessId)
    .maybeSingle();

  return (
    <div className="mt-6">
      <h2 className="text-xl font-black text-marca-800">Dados da loja</h2>
      <p className="mt-1 max-w-2xl text-sm text-texto-suave">
        O que o cliente vê antes de fazer o pedido: contato, endereço, horário
        de funcionamento, formas de entrega, pagamento, taxa e pedido mínimo.
        Salvar já reflete na vitrine.
      </p>

      <p className="mt-4 rounded-card border border-borda bg-superficie px-5 py-4 text-sm text-texto-suave">
        Está anunciando <strong className="text-texto-forte">{business.name}</strong>.
        A situação da empresa e o destaque na vitrine são mantidos pela equipe do
        Tudo Agora —{" "}
        <Link href="/minha-conta" className="font-semibold text-marca-600 hover:underline">
          fale com a gente
        </Link>{" "}
        se precisar mudar isso.
      </p>

      <div className="mt-6">
        <BusinessForm
          mode="merchant"
          businessId={businessId}
          defaults={{
            id: businessId,
            name: data?.name,
            description: data?.description,
            logoUrl: data?.logo_url,
            coverUrl: data?.cover_url,
            phone: data?.phone,
            whatsapp: data?.whatsapp,
            email: data?.email,
            instagram: data?.instagram,
            address: data?.address,
            neighborhood: data?.neighborhood,
            openingHours: (data?.opening_hours ?? null) as OpeningHours | null,
            pixKey: data?.pix_key,
            deliveryFeeCents: data?.delivery_fee_cents,
            minOrderCents: data?.min_order_cents,
            fulfillment: data?.fulfillment ?? [],
            paymentMethods: data?.payment_methods ?? [],
            acceptQuotes: data?.accepts_quote,
          }}
        />
      </div>
    </div>
  );
}
