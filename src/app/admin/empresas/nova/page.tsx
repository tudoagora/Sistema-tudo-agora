import type { Metadata } from "next";

import { BusinessForm } from "@/components/business/business-form";
import { listCities } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Cadastrar empresa" };

export default async function NewBusinessPage() {
  await requireAdmin();
  const cities = await listCities();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-black tracking-tight text-marca-800">
        Cadastrar empresa
      </h1>
      <p className="mt-1 text-sm text-texto-suave">
        Preencha o que jÃ¡ souber. O endereÃ§o da pÃ¡gina e o subdomÃ­nio sÃ£o gerados
        a partir do nome, e dÃ¡ para mudar depois.
      </p>

      <div className="mt-8">
        <BusinessForm cities={cities} />
      </div>
    </div>
  );
}
