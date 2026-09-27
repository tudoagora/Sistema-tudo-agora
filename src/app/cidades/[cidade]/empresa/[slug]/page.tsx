import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessAvatar } from "@/components/business-card";
import { MenuList } from "@/components/menu/menu-list";
import {
  getBusinessBySlug,
  getBusinessMenu,
  getCityBySlug,
  resolveStorefrontSlug,
} from "@/lib/catalog";
import {
  FULFILLMENT_LABELS,
  PAYMENT_LABELS,
  formatBRL,
  formatOpeningHours,
  isOpenNow,
  todayLabel,
  whatsappLink,
  type OpeningHours,
} from "@/lib/format";

export async function generateMetadata(
  props: PageProps<"/cidades/[cidade]/empresa/[slug]">,
): Promise<Metadata> {
  const { cidade, slug } = await props.params;
  const business = await getBusinessBySlug(cidade, slug);
  if (!business) return { title: "Empresa não encontrada" };

  return {
    title: business.name,
    description:
      business.description?.slice(0, 160) ?? `${business.name} no Tudo Agora`,
    alternates: { canonical: `/cidades/${cidade}/empresa/${business.slug}` },
  };
}

export default async function BusinessPage(
  props: PageProps<"/cidades/[cidade]/empresa/[slug]">,
) {
  const { cidade, slug } = await props.params;
  const [city, business] = await Promise.all([
    getCityBySlug(cidade),
    getBusinessBySlug(cidade, slug),
  ]);
  if (!city || !business) notFound();

  const menu = business.hasMenu ? await getBusinessMenu(business.id) : null;
  const sections = menu?.menu_categories ?? [];
  // O botão precisa de item *disponível*, não de seção: `get_business_menu`
  // devolve as seções ativas mesmo vazias (`item_count: 0`), e o `MenuList`
  // descarta seção sem item — o CTA cairia num alvo em branco.
  const itemCount = menu?.items.length ?? 0;
  const storefrontSlug = itemCount
    ? await resolveStorefrontSlug(business.custom_slug, business.slug)
    : null;
  // `as const` preserva o tipo literal do template — necessário porque o
  // projeto roda com `typedRoutes`.
  const storefrontHref = storefrontSlug
    ? (`/cardapio/${storefrontSlug}` as const)
    : null;
  const whatsapp = business.whatsapp
    ? whatsappLink(
        business.whatsapp,
        `Olá! Vim pelo Tudo Agora e gostaria de falar sobre ${business.name}.`,
      )
    : null;
  const hours = formatOpeningHours(business.opening_hours as OpeningHours);
  const open = isOpenNow(
    business.opening_hours as OpeningHours,
    city.timezone,
  );

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <BusinessAvatar
          name={business.name}
          logoUrl={business.logo_url}
          size={96}
          className="h-24 w-24 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight text-marca-800 sm:text-3xl">
            {business.name}
          </h1>
          <p className="mt-1 text-sm text-texto-suave">
            {business.cityName} - {city.state}
            {business.neighborhood ? ` • ${business.neighborhood}` : ""}
          </p>
          {business.description ? (
            <p className="mt-3 max-w-2xl text-texto">{business.description}</p>
          ) : null}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-pill bg-[#25d366] px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Falar no WhatsApp
          </a>
        ) : null}
        {storefrontHref ? (
          <Link
            href={storefrontHref}
            className="inline-flex min-h-11 items-center rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white"
          >
            Pedir online
          </Link>
        ) : sections.length > 0 ? (
          <a
            href="#cardapio"
            className="inline-flex min-h-11 items-center rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white"
          >
            Ver cardápio
          </a>
        ) : null}
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {business.address ? (
          <InfoCard title="Endereço">{business.address}</InfoCard>
        ) : null}

        {hours ? (
          <InfoCard title="Horário de funcionamento">
            {hours}
            <span className="mt-1 block text-xs font-semibold text-texto-suave">
              Hoje ({todayLabel(city.timezone)}):{" "}
              {open ? "aberto agora" : "fechado"}
            </span>
          </InfoCard>
        ) : null}

        {business.fulfillment.length > 0 ? (
          <InfoCard title="Atendimento">
            <span className="flex flex-wrap gap-1.5">
              {business.fulfillment.map((mode) => (
                <span
                  key={mode}
                  className="rounded-pill bg-marca-100 px-2.5 py-0.5 text-xs font-semibold text-marca-800"
                >
                  {FULFILLMENT_LABELS[mode] ?? mode}
                </span>
              ))}
            </span>
          </InfoCard>
        ) : null}

        {business.payment_methods.length > 0 ? (
          <InfoCard title="Formas de pagamento">
            <span className="flex flex-wrap gap-1.5">
              {business.payment_methods.map((method) => (
                <span
                  key={method}
                  className="rounded-pill bg-superficie-2 px-2.5 py-0.5 text-xs font-semibold text-texto-suave"
                >
                  {PAYMENT_LABELS[method] ?? method}
                </span>
              ))}
            </span>
          </InfoCard>
        ) : null}

        {business.delivery_fee_cents != null ? (
          <InfoCard title="Taxa de entrega">
            {business.delivery_fee_cents > 0
              ? formatBRL(business.delivery_fee_cents)
              : "Grátis"}
          </InfoCard>
        ) : null}

        {business.min_order_cents ? (
          <InfoCard title="Pedido mínimo">
            {formatBRL(business.min_order_cents)}
          </InfoCard>
        ) : null}

        {business.instagram ? (
          <InfoCard title="Instagram">{business.instagram}</InfoCard>
        ) : null}
      </dl>

      <section id="cardapio" className="mt-12 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 className="text-xl font-black tracking-tight text-marca-800">
            Cardápio
          </h2>
          {storefrontHref ? (
            <Link
              href={storefrontHref}
              className="text-sm font-bold text-marca-800 underline underline-offset-4"
            >
              Abrir a vitrine e pedir online →
            </Link>
          ) : null}
        </div>
        {sections.length > 0 && menu ? (
          <MenuList
            menu={menu}
            citySlug={city.slug}
            canOrderOnline={Boolean(storefrontHref)}
          />
        ) : (
          <p className="mt-4 rounded-card border border-dashed border-borda-forte bg-superficie p-8 text-center text-texto-suave">
            Esta empresa ainda não publicou um cardápio online. Fale com ela pelo
            WhatsApp para ver o cardápio completo.
          </p>
        )}
      </section>
    </article>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-borda bg-white p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-texto-tenue">
        {title}
      </dt>
      <dd className="mt-1 text-sm text-texto">{children}</dd>
    </div>
  );
}
