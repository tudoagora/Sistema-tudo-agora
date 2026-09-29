import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "./category-form";
import { CategoryTree, type CategoryNode } from "./category-tree";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesAdminPage() {
  await requireAdmin();
  const supabase = await createClient();

  // O admin precisa da categoria inteira, inativa inclusive — `listCategories`
  // filtra as que estão no ar.
  const { data } = await supabase
    .from("categories")
    .select(
      "id, name, slug, parent_id, image_url, is_active, business_categories(count)",
    )
    .order("sort_order");

  const linhas = data ?? [];
  const conhecidos = new Set(linhas.map((linha) => linha.id));
  const nos: CategoryNode[] = linhas.map((linha) => {
    const contagem = linha.business_categories as { count: number }[] | null;
    return {
      id: linha.id,
      name: linha.name,
      slug: linha.slug,
      // Rede de segurança para um pai que não veio na consulta: melhor
      // mostrar a categoria na raiz do que sumir com ela da tela.
      parentId:
        linha.parent_id != null && conhecidos.has(linha.parent_id)
          ? linha.parent_id
          : null,
      imageUrl: linha.image_url ?? null,
      isActive: linha.is_active,
      businessCount: contagem?.[0]?.count ?? 0,
    };
  });

  // O editor guarda a ordem em estado enquanto a tela não muda; quando uma
  // action grava no banco, `CategoryTree` recebe a lista nova e troca a sua.
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-2xl font-black tracking-tight text-marca-800">
        Categorias
      </h1>
      <p className="mt-1 text-sm text-texto-suave">
        As categorias principais são as pílulas da home. Arraste pela alça para
        reordenar ou para transformar uma categoria em subcategoria de outra —
        soltar no meio da linha é o que cria o vínculo.
      </p>

      <div className="mt-8">
        {nos.length === 0 ? (
          <p className="rounded-card border border-dashed border-borda-forte bg-superficie p-10 text-center text-texto-suave">
            Nenhuma categoria cadastrada.
          </p>
        ) : (
          <CategoryTree nos={nos} />
        )}
      </div>

      <CategoryForm raizes={nos.filter((no) => no.parentId == null).map((no) => ({ id: no.id, name: no.name }))} />
    </div>
  );
}
