import { CategoryPill } from "@/components/home/category-pill";
import type { Group } from "@/lib/catalog";

/** SeÃ§Ã£o CATEGORIAS: as 9 pÃ­lulas com foto, no formato do site atual. */
export function CategoryGrid({
  groups,
  counts,
}: {
  groups: Group[];
  counts: Record<string, number>;
}) {
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="categorias-titulo" className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6">
      <h2
        id="categorias-titulo"
        className="text-center text-2xl font-black tracking-tight text-marca-800 sm:text-3xl"
      >
        Categorias
      </h2>

      <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {groups.map((group) => (
          <li key={group.slug}>
            <CategoryPill
              slug={group.slug}
              name={group.name}
              imageUrl={group.imageUrl}
              count={counts[group.slug]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
