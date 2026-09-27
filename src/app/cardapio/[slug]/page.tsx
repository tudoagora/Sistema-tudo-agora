import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  Storefront,
  type StoreBusiness,
  type StoreItem,
  type StoreSection,
} from "@/components/menu/storefront";
import { getMenuBySlug } from "@/lib/catalog";
import { getCityBySlug } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

type PageParams = { params: Promise<{ slug: string }> };

/**
 * Vitrine do cardápio. Duas leituras para uma rota, porque o Google precisa de
 * metadados no servidor e o cliente precisa da página rápida:
 * `generateMetadata` e a página chamam `getMenuBySlug`, que é `cache()` do
 * React — a segunda chamada é de graça dentro do mesmo render.
 */
export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const found = await getMenuBySlug(slug);
  if (!found?.menu.business) {
    return { title: "Cardápio não encontrado", robots: { index: false } };
  }

  const business = found.menu.business;
  const title = `Cardápio · ${business.name}`;
  const description =
    business.description?.slice(0, 160) ??
    `Peça online no cardápio do ${business.name}.`;

  return {
    title,
    description,
    alternates: { canonical: `/cardapio/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CardapioPage({ params }: PageParams) {
  const { slug } = await params;
  const found = await getMenuBySlug(slug);
  if (!found?.menu.business) notFound();

  const { menu, citySlug } = found;
  // `Menu.business` é o `Pick` cru da tabela; `StoreBusiness` é a forma
  // enxuta que a vitrine consome. `unknown` no meio porque `opening_hours`
  // chega como `Json` do PostgREST e `StoreBusiness` já o tipou.
  const business = menu.business as unknown as StoreBusiness;

  const city = citySlug ? await getCityBySlug(citySlug) : null;

  /* A RPC já devolve só o que está no ar (empresa ativa, item disponível,
     seção ativa). Agrupar por `menu_category_id` aqui evita uma segunda
     consulta. */
  const items = menu.items as unknown as StoreItem[];
  const byCategory = new Map<number, StoreItem[]>();
  for (const item of items) {
    const key = Number(item.menu_category_id ?? 0);
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }

  const sections: StoreSection[] = menu.menu_categories
    .filter((section) => (byCategory.get(section.id) ?? []).length > 0)
    .map((section) => ({
      id: section.id,
      name: section.name,
      description: section.description ?? null,
      image_url: section.image_url ?? null,
      items: byCategory.get(section.id) ?? [],
    }));

  // Item sem seção é erro de cadastro, mas some da vitrine se for ignorado —
  // melhor um "Outros" provisório do que comida invisível.
  const loose = byCategory.get(0) ?? [];
  if (loose.length > 0) {
    sections.push({
      id: 0,
      name: "Outros",
      description: null,
      image_url: null,
      items: loose,
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: business.name,
    description: business.description ?? undefined,
    url: `${siteConfig.url}/cardapio/${slug}`,
    ...(business.logo_url ? { logo: business.logo_url } : {}),
    ...(citySlug && business.address
      ? { address: { "@type": "PostalAddress", streetAddress: business.address } }
      : {}),
    ...(business.fulfillment?.length
      ? {
          hasMenu: {
            "@type": "Menu",
            name: `Cardápio ${business.name}`,
            hasMenuSection: sections.map((section) => ({
              "@type": "MenuSection",
              name: section.name,
              hasMenuItem: section.items.map((item) => ({
                "@type": "MenuItem",
                name: item.name,
                ...(item.description ? { description: item.description } : {}),
                offers: {
                  "@type": "Offer",
                  price: (item.price_cents / 100).toFixed(2),
                  priceCurrency: "BRL",
                },
              })),
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Storefront
        business={business}
        sections={sections}
        citySlug={citySlug}
        timezone={city?.timezone ?? "America/Cuiaba"}
      />
    </>
  );
}
