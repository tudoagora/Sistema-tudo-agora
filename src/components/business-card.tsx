import Image from "next/image";
import Link from "next/link";

import type { BusinessCard as BusinessCardData } from "@/lib/catalog";

/** Avatar com iniciais — usado enquanto a empresa não tem logo no Storage. */
export function BusinessAvatar({
  name,
  logoUrl,
  size = 76,
  className = "",
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-logo border border-borda object-cover ${className}`}
        style={{ width: size, height: size }}
        unoptimized={logoUrl.startsWith("http://127.0.0.1") || logoUrl.startsWith("http://localhost")}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-logo bg-marca-100 font-bold text-marca-800 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
    >
      {initials || name.charAt(0).toUpperCase()}
    </span>
  );
}

export function BusinessCard({
  business,
  citySlug,
}: {
  business: BusinessCardData;
  citySlug?: string;
}) {
  const city = citySlug ?? business.citySlug;

  return (
    <article className="group relative flex h-full flex-col rounded-card border border-borda bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start gap-4">
        <BusinessAvatar name={business.name} logoUrl={business.logoUrl} />
        <div className="min-w-0">
          <h3 className="text-[17px] leading-tight font-extrabold tracking-tight text-marca-800">
            <Link
              href={`/cidades/${city}/empresa/${business.slug}`}
              className="after:absolute after:inset-0 hover:underline"
            >
              {business.name}
            </Link>
          </h3>
          {business.hasMenu ? (
            <span className="mt-1.5 inline-flex items-center rounded-pill bg-destaque-100 px-2.5 py-0.5 text-xs font-bold text-marca-800">
              Pedidos online
            </span>
          ) : null}
        </div>
      </div>

      {business.description ? (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-texto-suave">
          {business.description}
        </p>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-marca-600">
        Ver empresa
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </article>
  );
}
