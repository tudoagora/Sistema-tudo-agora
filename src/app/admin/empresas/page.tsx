import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Empresas" };

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  draft: "Rascunho",
  suspended: "Suspensa",
  closed: "Encerrada",
};

type Search = { q?: string; status?: string; city?: string };

export default async function BusinessesPage(props: PageProps<"/admin/empresas">) {
  await requireAdmin();
  const params = (await props.searchParams) as Search;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const city = params.city ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("businesses")
    .select("id, name, slug, status, source, city_id, cities!inner(slug, name, state)")
    .order("name", { ascending: true });

  if (status) query = query.eq("status", status as never);
  if (city) query = query.eq("city_id", Number(city));
  if (q.length >= 2) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }

  const { data: rows, error } = await query.limit(300);
  const { data: allCities } = await supabase
    .from("cities")
    .select("id, name, state")
    .order("name");

  const businesses = (rows ?? []).map((row) => {
    const value = Array.isArray(row.cities) ? row.cities[0] : row.cities;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      source: row.source,
      cityName: value ? `${value.name} - ${value.state}` : "—",
      citySlug: value ? value.slug : "",
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-marca-800">Empresas</h1>
          <p className="mt-1 text-sm text-texto-suave">
            {businesses.length} {businesses.length === 1 ? "empresa" : "empresas"}{" "}
            {q ? `para &quot;{q}&quot;` : ""}
          </p>
        </div>
        <Link
          href="/admin/empresas/nova"
          className="inline-flex min-h-11 items-center rounded-pill bg-marca-gradient px-6 text-sm font-bold text-white"
        >
          + Cadastrar empresa
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou endereço"
          aria-label="Buscar empresa"
          className="min-h-11 min-w-56 flex-1 rounded-logo border border-borda bg-white px-4 text-sm focus:border-marca-600"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Filtrar por situação"
          className="min-h-11 rounded-logo border border-borda bg-white px-3 text-sm focus:border-marca-600"
        >
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="city"
          defaultValue={city}
          aria-label="Filtrar por cidade"
          className="min-h-11 rounded-logo border border-borda bg-white px-3 text-sm focus:border-marca-600"
        >
          <option value="">Todas as cidades</option>
          {(allCities ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} - {c.state}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-logo bg-marca-800 px-5 text-sm font-bold text-white"
        >
          Filtrar
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-6 rounded-card border border-erro/30 bg-erro/5 px-5 py-4 text-sm text-erro-700">
          {error.message}
        </p>
      ) : null}

      {businesses.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-borda-forte bg-white p-12 text-center text-texto-suave">
          Nenhuma empresa encontrada com esses filtros.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-borda bg-white">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-borda bg-superficie text-xs uppercase tracking-wide text-texto-tenue">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Cidade</th>
                <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
                <th scope="col" className="px-4 py-3 font-semibold">Origem</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <tr key={business.id} className="border-b border-borda last:border-0 hover:bg-superficie/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/empresas/${business.id}`}
                      className="font-bold text-marca-800 hover:underline"
                    >
                      {business.name}
                    </Link>
                    <span className="block text-xs text-texto-tenue">/{business.slug}</span>
                  </td>
                  <td className="px-4 py-3 text-texto-suave">{business.cityName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-pill px-3 py-1 text-xs font-bold ${
                        business.status === "active"
                          ? "bg-sucesso/10 text-sucesso-700"
                          : business.status === "draft"
                            ? "bg-aviso/10 text-aviso-700"
                            : "bg-superficie-2 text-texto-suave"
                      }`}
                    >
                      {STATUS_LABEL[business.status] ?? business.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-texto-tenue">{business.source ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/empresas/${business.id}`}
                      className="font-semibold text-marca-600 underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
