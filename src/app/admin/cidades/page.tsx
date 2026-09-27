import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { listCities } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { deleteCity } from "./actions";
import { CityForm } from "./city-form";

export const metadata: Metadata = { title: "Cidades" };

export default async function CitiesAdminPage() {
  await requireAdmin();
  const cities = await listCities();
  const supabase = await createClient();

  const { data: counts } = await supabase
    .from("businesses")
    .select("city_id")
    .in("city_id", cities.length ? cities.map((c) => c.id) : [-1]);

  const tally = new Map<number, number>();
  for (const row of counts ?? []) {
    tally.set(row.city_id, (tally.get(row.city_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-black tracking-tight text-marca-800">Cidades</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Tapurah é a primeira praça. Cadastre a próxima para abrir o diretório em
        outra cidade.
      </p>

      <ul className="mt-8 space-y-3">
        {cities.map((city) => (
          <li
            key={city.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-borda bg-white p-5"
          >
            <div>
              <p className="font-bold text-texto-forte">
                {city.name} - {city.state}
              </p>
              <p className="text-xs text-texto-tenue">
                /{city.slug} · {tally.get(city.id) ?? 0} empresas · fuso {city.timezone}
              </p>
            </div>
            <form action={deleteCity}>
              <input type="hidden" name="id" value={city.id} />
              <button
                type="submit"
                className="min-h-11 rounded-pill border border-borda-forte px-5 text-sm font-semibold text-texto-suave transition-colors hover:border-erro hover:text-erro-700"
              >
                Excluir
              </button>
            </form>
          </li>
        ))}
      </ul>

      <CityForm />
    </div>
  );
}
