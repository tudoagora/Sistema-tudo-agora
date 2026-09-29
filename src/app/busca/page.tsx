import type { Metadata } from "next";

import { BusinessGrid } from "@/components/business-grid";
import { SearchBox } from "@/components/home/search-box";
import { getCurrentCity } from "@/lib/city";
import { searchBusinesses } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Busca",
  description: "Encontre lojas, restaurantes, serviços e contatos úteis.",
  robots: { index: false, follow: true },
};

export default async function SearchPage(props: PageProps<"/busca">) {
  const params = await props.searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? "").trim();

  const city = await getCurrentCity();
  const results = query ? await searchBusinesses(query, city.id, 30) : [];

  const hasQuery = results.length > 0;
  const empty = query.length >= 2 && !hasQuery;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-6">
      <h1 className="text-2xl font-black tracking-tight text-marca-800 sm:text-3xl">
        Resultados da busca
      </h1>

      {/* A busca fica na própria página: sem campo aqui, quem erra o termo
          tinha só o botão "voltar" do navegador para corrigir. */}
      <div className="mt-5">
        <SearchBox
          placeholder="O que você procura?"
          defaultValue={query}
        />
      </div>

      <p className="mt-6 text-texto-suave">
        {query ? (
          <>
            {results.length}{" "}
            {results.length === 1 ? "empresa" : "empresas"} para{" "}
            <strong className="text-texto">{query}</strong> em {city.name}.
          </>
        ) : (
          <>Digite pelo menos 2 letras para buscar.</>
        )}
      </p>

      {empty ? (
        <p className="mt-10 rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
          Não encontramos nada para <strong>{query}</strong>. Tente outra
          palavra ou navegue pelas categorias.
        </p>
      ) : null}

      {hasQuery ? (
        <BusinessGrid
          businesses={results}
          citySlug={city.slug}
          className="mt-8 grid gap-4 sm:grid-cols-2"
        />
      ) : null}

      {!query ? (
        <p className="mt-10 text-texto-suave">
          Dica: experimente buscar por “pizza”, “farmácia” ou “advogado”.
        </p>
      ) : null}
    </div>
  );
}
