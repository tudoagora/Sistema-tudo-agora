"use client";

import { useMemo, useState } from "react";

import type { Menu, MenuItem } from "@/lib/catalog";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Selection = Record<number, number[]>;

/** Soma o delta dos grupos de opção marcados para um item. */
function deltaFor(item: MenuItem, selected: Record<number, number[]>) {
  let total = 0;
  for (const group of item.option_groups) {
    for (const valueId of selected[group.id] ?? []) {
      const value = group.values.find((v) => v.id === valueId);
      if (value) total += value.price_delta_cents;
    }
  }
  return total;
}

function toggle(selection: Selection, groupId: number, valueId: number, max: number) {
  const current = selection[groupId] ?? [];
  if (current.includes(valueId)) {
    return { ...selection, [groupId]: current.filter((id) => id !== valueId) };
  }
  const next = max <= 1 ? [valueId] : [...current, valueId].slice(-max);
  return { ...selection, [groupId]: next };
}

export function MenuList({
  menu,
  citySlug,
  canOrderOnline = false,
}: {
  menu: Menu;
  citySlug: string;
  /**
   * `true` quando a página já oferece o CTA da vitrine (`/cardapio/[slug]`).
   * Aí a prévia não pode mandar o cliente para o WhatsApp — o pedido sai
   * pelo carrinho. Sem vitrine alcançável, o WhatsApp é o destino real.
   */
  canOrderOnline?: boolean;
}) {
  const [selection, setSelection] = useState<Selection>({});
  const [openId, setOpenId] = useState<number | null>(null);

  const sections = useMemo(
    () =>
      menu.menu_categories
        .map((section) => ({
          ...section,
          items: menu.items.filter(
            (item) => item.menu_category_id === section.id,
          ),
        }))
        .filter((section) => section.items.length > 0),
    [menu],
  );

  const uncategorized = useMemo(
    () => menu.items.filter((item) => item.menu_category_id == null),
    [menu],
  );

  if (sections.length === 0 && uncategorized.length === 0) return null;

  return (
    <div className="mt-4 space-y-8">
      {sections.map((section) => (
        <MenuGroup
          key={section.id}
          title={section.name}
          items={section.items}
          selection={selection}
          setSelection={setSelection}
          openId={openId}
          setOpenId={setOpenId}
        />
      ))}
      {uncategorized.length > 0 ? (
        <MenuGroup
          title="Outros"
          items={uncategorized}
          selection={selection}
          setSelection={setSelection}
          openId={openId}
          setOpenId={setOpenId}
        />
      ) : null}
      <p className="text-xs text-texto-tenue">
        Toque em um item para ver tamanhos, bordas e sabores.{" "}
        {canOrderOnline
          ? "Use “Pedir online” para montar o pedido no carrinho."
          : "O pedido é finalizado com a empresa pelo WhatsApp."}{" "}
        <a href={`/cidades/${citySlug}`} className="underline">
          Voltar para {citySlug.replace(/-/g, " ")}
        </a>
        .
      </p>
    </div>
  );
}

type MenuGroupProps = {
  title: string;
  items: MenuItem[];
  selection: Selection;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
  openId: number | null;
  setOpenId: React.Dispatch<React.SetStateAction<number | null>>;
};

function MenuGroup({
  title,
  items,
  selection,
  setSelection,
  openId,
  setOpenId,
}: MenuGroupProps) {
  return (
    <section>
      <h3 className="border-b border-borda pb-2 text-sm font-black uppercase tracking-wide text-marca-800">
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => {
          const open = openId === item.id;
          const groups = item.option_groups.filter(
            (group) => group.values.length > 0,
          );
          const total = item.price_cents + deltaFor(item, selection);

          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-card border border-borda bg-white"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-4 p-3 text-left"
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-logo object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-texto-forte">
                    {item.name}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-texto-suave">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm font-black text-marca-800">
                  {formatBRL(total)}
                </span>
              </button>

              {open && groups.length > 0 ? (
                <div className="space-y-4 border-t border-borda bg-superficie p-4">
                  {groups.map((group) => {
                    const selected = selection[group.id] ?? [];
                    return (
                      <fieldset key={group.id}>
                        <legend className="text-xs font-bold uppercase tracking-wide text-texto-tenue">
                          {group.name}
                          {group.max_select > 1
                            ? ` (até ${group.max_select})`
                            : ""}
                        </legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.values.map((value) => {
                            const active = selected.includes(value.id);
                            return (
                              <button
                                key={value.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                  setSelection((prev) =>
                                    toggle(
                                      prev,
                                      group.id,
                                      value.id,
                                      group.max_select,
                                    ),
                                  )
                                }
                                className={cn(
                                  "min-h-11 rounded-pill border px-3.5 text-xs font-semibold transition-colors",
                                  active
                                    ? "border-marca-800 bg-marca-800 text-white"
                                    : "border-borda-forte bg-white text-texto-suave hover:border-marca-600",
                                )}
                              >
                                {value.name}
                                {value.price_delta_cents > 0
                                  ? ` +${formatBRL(value.price_delta_cents)}`
                                  : ""}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    );
                  })}

                  <p className="text-sm font-bold text-marca-800">
                    Total com as escolhas: {formatBRL(total)}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
