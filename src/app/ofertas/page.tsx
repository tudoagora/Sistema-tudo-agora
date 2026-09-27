import type { Metadata } from "next";
import Link from "next/link";

import { BusinessAvatar } from "@/components/business-card";
import { getCurrentCity } from "@/lib/city";
import { listOffers } from "@/lib/catalog";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Ofertas e promoções",
  description: "Promoções e ofertas exclusivas das empresas da sua cidade.",
  alternates: { canonical: "/ofertas" },
};

export default async function OffersPage() {
  const city = await getCurrentCity();
  const offers = await listOffers(city.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
        Ofertas em {city.name}
      </h1>
      <p className="mt-2 text-texto-suave">
        Promoções divulgadas pelas empresas cadastradas no Tudo Agora.
      </p>

      {offers.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
          Nenhuma oferta ativa no momento. Volte em breve ou{" "}
          <Link href="/planos" className="font-semibold text-marca-600 underline">
            anuncie sua empresa
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="flex h-full flex-col overflow-hidden rounded-card border border-borda bg-white shadow-card"
            >
              {offer.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={offer.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
              ) : null}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-destaque-600">
                  {offer.title}
                </p>
                {offer.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-texto-suave">
                    {offer.description}
                  </p>
                ) : null}
                <div className="mt-4 flex items-center gap-3">
                  {offer.priceCents != null ? (
                    <span className="text-lg font-black text-marca-800">
                      {formatBRL(offer.priceCents)}
                    </span>
                  ) : null}
                  {offer.compareAtCents != null &&
                  offer.priceCents != null &&
                  offer.compareAtCents > offer.priceCents ? (
                    <span className="text-sm text-texto-tenue line-through">
                      {formatBRL(offer.compareAtCents)}
                    </span>
                  ) : null}
                  {offer.endsAt ? (
                    <span className="ml-auto text-xs text-texto-tenue">
                      até{" "}
                      {new Date(offer.endsAt).toLocaleDateString("pt-BR")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-borda pt-4">
                  <BusinessAvatar
                    name={offer.businessName}
                    logoUrl={offer.businessLogoUrl}
                    size={32}
                    className="h-8 w-8"
                  />
                  <Link
                    href={`/cidades/${city.slug}/empresa/${offer.businessSlug}`}
                    className="truncate text-xs font-semibold text-marca-600 hover:underline"
                  >
                    {offer.businessName}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
