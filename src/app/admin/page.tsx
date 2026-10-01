import Link from "next/link";
import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { businessStatusLabel } from "@/lib/business-status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visão geral" };

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    { count: totalEmpresas },
    { count: ativas },
    { count: rascunhos },
    { count: cidades },
    { count: planos },
    { count: ofertas },
    { count: pedidos },
    { data: comCardapio },
    { data: recentes },
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("cities").select("id", { count: "exact", head: true }),
    supabase.from("plans").select("id", { count: "exact", head: true }),
    supabase.from("offers").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("menu_categories").select("business_id", { head: false }).limit(500),
    supabase
      .from("businesses")
      .select("id, name, slug, status, created_at, cities!inner(slug, name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const comMenu = new Set((comCardapio ?? []).map((row) => row.business_id)).size;

  const cards = [
    { label: "Empresas ativas", value: ativas ?? 0, hint: `${totalEmpresas ?? 0} no total` },
    { label: "Rascunhos", value: rascunhos ?? 0, hint: "ainda não publicadas" },
    { label: "Com cardápio", value: comMenu, hint: "aceitam pedido online" },
    { label: "Cidades", value: cidades ?? 0, hint: "com diretório publicado" },
    { label: "Planos", value: planos ?? 0, hint: "na página de planos" },
    { label: "Ofertas", value: ofertas ?? 0, hint: "ativas e expiradas" },
    { label: "Pedidos", value: pedidos ?? 0, hint: "histórico total" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-marca-800">
          Visão geral
        </h1>
        <p className="mt-1 text-sm text-texto-suave">
          O estado do Tudo Agora em um olhar.
        </p>
      </div>

      <section aria-label="Indicadores">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li
              key={card.label}
              className="rounded-card border border-borda bg-white p-5 shadow-card"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-texto-tenue">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-black text-marca-800">{card.value}</p>
              <p className="mt-1 text-xs text-texto-tenue">{card.hint}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="acoes">
        <h2 id="acoes" className="text-lg font-black text-marca-800">
          Ações rápidas
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            { href: "/admin/empresas/nova", label: "Cadastrar empresa", hint: "substitui o plugin do GetNinja" },
            { href: "/admin/empresas", label: "Gerenciar empresas", hint: "editar, publicar, excluir" },
            { href: "/admin/cidades", label: "Cadastrar cidade", hint: "abrir novas praças" },
            { href: "/admin/planos", label: "Planos e preços", hint: "o que a landing vende" },
            { href: "/admin/ofertas", label: "Ofertas e banners", hint: "campanhas e destaques" },
            { href: "/admin/usuarios", label: "Usuários", hint: "papel, senha e vínculo de lojista" },
          ] as const).map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex min-h-16 items-center justify-between gap-3 rounded-card border border-borda bg-white px-5 transition-shadow hover:shadow-card-hover"
              >
                <span>
                  <span className="block text-sm font-bold text-texto-forte">{action.label}</span>
                  <span className="block text-xs text-texto-tenue">{action.hint}</span>
                </span>
                <span aria-hidden="true" className="text-marca-600">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recentes">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="recentes" className="text-lg font-black text-marca-800">
            Cadastros recentes
          </h2>
          <Link href="/admin/empresas" className="text-sm font-semibold text-marca-600 underline">
            Ver todos
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto rounded-card border border-borda bg-white">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="border-b border-borda bg-superficie text-xs uppercase tracking-wide text-texto-tenue">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Cidade</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {(recentes ?? []).map((row) => {
                const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
                return (
                  <tr key={row.id} className="border-b border-borda last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/empresas/${row.id}`}
                        className="font-semibold text-marca-800 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-texto-suave">
                      {city ? String((city as { name: string }).name) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-texto-tenue">
                      {new Date(row.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {planos === 0 ? (
        <p className="rounded-card border border-aviso/30 bg-aviso/5 px-5 py-4 text-sm text-texto">
          Nenhum plano cadastrado — a página <Link href="/planos" className="font-semibold underline">/planos</Link> ficará vazia.
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-sucesso/10 text-sucesso-700"
      : status === "draft"
        ? "bg-aviso/10 text-aviso-700"
        : "bg-superficie-2 text-texto-suave";

  return (
    <span className={`inline-block rounded-pill px-3 py-1 text-xs font-bold ${tone}`}>
      {businessStatusLabel(status)}
    </span>
  );
}
