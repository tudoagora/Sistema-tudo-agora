import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessForm } from "@/components/business/business-form";
import { requireAdmin } from "@/lib/auth";
import { listCategories, listCities } from "@/lib/catalog";
import type { OpeningHours } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { deleteBusiness, publishBusiness, setBusinessCategory } from "../actions";

export const metadata: Metadata = { title: "Editar empresa" };

export default async function EditBusinessPage(props: PageProps<"/admin/empresas/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const businessId = Number(id);
  if (!Number.isInteger(businessId)) notFound();

  const supabase = await createClient();
  const [cities, categories, { data: business }, { data: links }] = await Promise.all([
    listCities(),
    listCategories(),
    supabase
      .from("businesses")
      .select("*, cities!inner(slug)")
      .eq("id", businessId)
      .maybeSingle(),
    supabase
      .from("business_categories")
      .select("category_id")
      .eq("business_id", businessId),
  ]);

  if (!business) notFound();

  const linked = new Set((links ?? []).map((row) => row.category_id));
  const cityValue = Array.isArray(business.cities) ? business.cities[0] : business.cities;
  const citySlug = cityValue ? String(cityValue.slug) : (cities[0]?.slug ?? "");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-marca-800">
            {business.name}
          </h1>
          <p className="mt-1 text-sm text-texto-suave">
            <Link
              href={`/cidades/${citySlug}/empresa/${business.slug}`}
              className="font-semibold text-marca-600 underline"
            >
              Ver a pÃ¡gina pÃºblica
            </Link>
          </p>
        </div>

        {business.status !== "active" ? (
          <form action={publishBusiness}>
            <input type="hidden" name="id" value={business.id} />
            <button
              type="submit"
              className="min-h-11 rounded-pill bg-destaque-500 px-6 text-sm font-bold text-texto-forte"
            >
              Publicar agora
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <BusinessForm
          cities={cities}
          defaults={{
            id: business.id,
            name: business.name,
            slug: business.slug,
            customSlug: business.custom_slug,
            description: business.description,
            logoUrl: business.logo_url,
            coverUrl: business.cover_url,
            phone: business.phone,
            whatsapp: business.whatsapp,
            email: business.email,
            instagram: business.instagram,
            address: business.address,
            neighborhood: business.neighborhood,
            openingHours: business.opening_hours as OpeningHours | null,
            pixKey: business.pix_key,
            cityId: business.city_id,
            deliveryFeeCents: business.delivery_fee_cents,
            minOrderCents: business.min_order_cents,
            fulfillment: business.fulfillment,
            paymentMethods: business.payment_methods,
            acceptQuotes: business.accepts_quote,
            isFeatured: business.is_featured,
            status: business.status,
          }}
        />

        <aside className="space-y-6">
          <section className="rounded-card border border-borda bg-white p-5">
            <h2 className="text-sm font-black text-marca-800">Categorias</h2>
            <p className="mt-1 text-xs text-texto-tenue">
              Onde a empresa aparece na home e no diretÃ³rio.
            </p>
            <ul className="mt-4 space-y-1.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <form action={setBusinessCategory} className="flex items-center gap-2">
                    <input type="hidden" name="businessId" value={business.id} />
                    <input type="hidden" name="categoryId" value={category.id} />
                    <label className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-logo px-2 text-sm text-texto-forte transition-colors hover:bg-superficie">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={linked.has(category.id)}
                        className="h-4 w-4 accent-marca-800"
                      />
                      {category.name}
                    </label>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-card border border-borda bg-white p-5">
            <h2 className="text-sm font-black text-marca-800">CardÃ¡pio</h2>
            <p className="mt-1 text-xs text-texto-tenue">
              SeÃ§Ãµes, itens e grupos de opÃ§Ã£o (borda, sabor, tamanho).
            </p>
            <Link
              href={`/admin/empresas/${business.id}/cardapio`}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-marca-800 px-5 text-sm font-bold text-white"
            >
              Gerenciar cardÃ¡pio
            </Link>
          </section>

          <section className="rounded-card border border-erro/25 bg-erro/5 p-5">
            <h2 className="text-sm font-black text-erro-700">Excluir</h2>
            <p className="mt-1 text-xs text-texto-suave">
              Apaga a empresa, o cardÃ¡pio e as categorias. NÃ£o dÃ¡ para desfazer.
            </p>
            <form action={deleteBusiness} className="mt-4">
              <input type="hidden" name="id" value={business.id} />
              <button
                type="submit"
                className="min-h-11 w-full rounded-pill border border-erro/40 px-5 text-sm font-bold text-erro-700 transition-colors hover:bg-erro/10"
              >
                Excluir empresa
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
