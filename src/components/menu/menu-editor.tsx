"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useActionState, useState, type ReactNode } from "react";

import { ImageField } from "@/components/menu/image-field";
import { formatBRL } from "@/lib/format";
import {
  createMenuSection,
  createOptionGroup,
  createOptionValue,
  createProduct,
  deleteMenuSection,
  deleteOptionGroup,
  deleteOptionValue,
  deleteProduct,
  linkProductToOptionGroup,
  moveProduct,
  reorderMenuSections,
  reorderOptionGroups,
  reorderOptionValues,
  toggleMenuSection,
  toggleOptionValue,
  toggleProductAvailability,
  toggleProductFeatured,
  unlinkProductFromOptionGroup,
  updateMenuSection,
  updateOptionGroup,
  updateProduct,
} from "@/lib/menu/actions";
import { emptyMenuState } from "@/lib/menu/state";
import type {
  MenuGroup,
  MenuLink,
  MenuProduct,
  MenuSection,
  MenuValue,
} from "@/lib/menu/types";

export type { MenuGroup, MenuLink, MenuProduct, MenuSection, MenuValue };

const input =
  "min-h-10 w-full rounded-logo border border-borda bg-white px-3 text-sm text-texto-forte focus:border-marca-600";
const label = "mb-1 block text-xs font-semibold text-texto-forte";

const ghostButton =
  "min-h-9 rounded-pill border border-borda-forte px-3.5 text-xs font-bold text-texto-suave transition-colors hover:border-marca-600 hover:text-marca-800";
const dangerButton =
  "min-h-9 rounded-pill border border-borda-forte px-3.5 text-xs font-bold text-texto-suave transition-colors hover:border-erro hover:text-erro-700";
const primaryButton =
  "min-h-11 rounded-pill bg-marca-gradient px-6 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="mt-3 rounded-logo border border-erro/30 bg-erro/5 px-3 py-2 text-xs font-semibold text-erro-700"
    >
      {error}
    </p>
  );
}

/**
 * Destino de volta após uma action que falhou.
 *
 * As actions do cardápio que rodam em `<form action>` não têm `useActionState`
 * para devolver a mensagem; elas redirecionam para cá com `?erro=`.
 */
function BackTo({ backTo }: { backTo: string }) {
  return <input type="hidden" name="backTo" value={backTo} />;
}

type FormAction = (formData: FormData) => void | Promise<void>;

/** Botão que liga/desliga um campo booleano sem abrir a edição. */
function ToggleButton({
  action,
  id,
  businessId,
  value,
  active,
  title,
  activeClass,
  children,
}: {
  action: FormAction;
  id: number;
  businessId: number;
  value: boolean;
  active: boolean;
  title: string;
  activeClass: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="value" value={value ? "true" : "false"} />
      <button
        type="submit"
        title={title}
        aria-label={title}
        aria-pressed={active}
        className={`min-h-9 rounded-pill border px-3.5 text-xs font-bold transition-colors ${
          active ? activeClass : ghostButton
        }`}
      >
        {children}
      </button>
    </form>
  );
}

function ArrowButton({
  action,
  id,
  businessId,
  direction,
  title,
  glyph,
}: {
  action: FormAction;
  id: number;
  businessId: number;
  direction: "up" | "down";
  title: string;
  glyph: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        title={title}
        aria-label={title}
        className="min-h-9 min-w-9 rounded-logo border border-borda-forte text-sm transition-colors hover:border-marca-600 hover:text-marca-800"
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
    </form>
  );
}

/**
 * Seta ↑ ↓ que reordena pela posição na lista, e não por um par de ids.
 *
 * Não é `<form action>`: a reordenação grava a lista inteira de uma vez (ver
 * `reorderMenuSections`), então quem chama precisa da posição de origem e de
 * destino, e não de um id com direção.
 */
function MoveArrowButton({
  onClick,
  title,
  glyph,
}: {
  onClick: () => void;
  title: string;
  glyph: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="min-h-9 min-w-9 rounded-logo border border-borda-forte text-sm transition-colors hover:border-marca-600 hover:text-marca-800"
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

/**
 * Seta de reordenação do tamanho de uma pílula.
 *
 * Não é `<form action>`: a reordenação agora grava a lista inteira de uma vez
 * (ver `reorderOptionValues`), então quem chama precisa da posição de origem e
 * de destino, e não de um par de ids com direção.
 */
function MiniArrowButton({
  onClick,
  disabled,
  title,
  glyph,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  glyph: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="px-0.5 text-xs leading-none text-texto-tenue transition-colors hover:text-marca-800 disabled:invisible"
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

/**
 * Linha reordenável por arrasto (ou pelo teclado, com as setas do dnd-kit).
 *
 * Só a alça recebe os listeners. O card inteiro tem botão de abrir/fechar,
 * botão de excluir e campos de edição: arrastar em qualquer ponto arrastaria
 * junto com a seleção de texto e o clique abriria o item por acidente.
 */
function SortableItem({
  id,
  children,
}: {
  id: number;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        // Sem isto o card arrastado passa por baixo dos irmãos e some no meio da
        // pilha, porque os vizinhos criam contexto de empilhamento próprio.
        zIndex: isDragging ? 20 : "auto",
        position: "relative",
      }}
      className={isDragging ? "shadow-lg" : undefined}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Arrastar para reordenar"
        aria-label={`Reordenar. Use as setas do teclado ou arraste.`}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab touch-none rounded p-1 text-texto-tenue transition-colors hover:text-marca-800 focus-visible:border focus-visible:border-marca-600 active:cursor-grabbing"
      >
        <span aria-hidden="true" className="block text-base leading-none">
          ⠿
        </span>
      </button>
      {children}
    </li>
  );
}

/**
 * Aplica a ordem otimista por cima da ordem do banco.
 *
 * Ignora ids que a lista base não tem: durante o arrasto o `revalidate` pode
 * devolver um grupo já apagado, e um id órfão no `SortableContext` faz o dnd-kit
 * lançar.
 */
function reorder<T extends { id: number }>(list: T[], order: number[] | null): T[] {
  if (!order) return list;
  const byId = new Map(list.map((item) => [item.id, item]));
  const next = order.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const placed = new Set(next.map((item) => item.id));
  return [...next, ...list.filter((item) => !placed.has(item.id))];
}

export function MenuEditor({
  businessId,
  backTo,
  previewHref,
  sections,
  products,
  groups,
  values,
  links,
}: {
  businessId: number;
  backTo: string;
  previewHref: string;
  sections: MenuSection[];
  products: MenuProduct[];
  groups: MenuGroup[];
  values: MenuValue[];
  links: MenuLink[];
}) {
  const [openSection, setOpenSection] = useState<number | null>(sections[0]?.id ?? null);
  const [openGroup, setOpenGroup] = useState<number | null>(groups[0]?.id ?? null);
  /**
   * Ordem otimista, por lista de ids. O dado vem do servidor e chega em
   * `sort_order`; o `revalidate` da action reenvia a página, mas esperar isso
   * para mover a lista deixa o arrasto sem resposta nenhuma.
   *
   * É uma *sobreposição*, não a fonte: enquanto a página não recarrega, esta
   * lista é a ordem real; se a action recusar, `revalidate` traz a ordem do
   * banco de volta e o `useState` oldsmoa o estado.
   */
  const [groupOrder, setGroupOrder] = useState<number[] | null>(null);
  const [valueOrder, setValueOrder] = useState<Record<number, number[]>>({});
  const [sectionOrder, setSectionOrder] = useState<number[] | null>(null);
  const [sectionState, sectionAction, sectionPending] =
    useActionState(createMenuSection, emptyMenuState);
  const [productState, productAction, productPending] = useActionState(
    createProduct,
    emptyMenuState,
  );
  const [groupState, groupAction, groupPending] = useActionState(
    createOptionGroup,
    emptyMenuState,
  );
  const [valueState, valueAction, valuePending] = useActionState(
    createOptionValue,
    emptyMenuState,
  );

  // `distance: 4` deixa o toque na alça ser toque, e o arrasto só começar depois
  // de um movimento mínimo. Sem isso, o toque numa tela de celular trava a
  // página numa tentativa de arrasto que o usuário nem sabe que começou.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * Grava a nova ordem.
   *
   * O estado local (`order`/`groupOrder`) é atualizado na hora para a lista
   * não piscar enquanto o form viaja; a resposta do servidor é o `revalidate`
   * que reconfirma. Se a action recusar, o editor volta ao que o banco tem.
   */
  function commitOrder(formId: string, ids: number[], owner?: number) {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const fields = form.elements;
    const idsField = fields.namedItem("ids");
    if (idsField instanceof HTMLInputElement) idsField.value = ids.join(",");
    const ownerField = fields.namedItem("optionGroupId");
    if (owner !== undefined && ownerField instanceof HTMLInputElement) {
      ownerField.value = String(owner);
    }
    form.requestSubmit();
  }

  function moveGroupTo(from: number, to: number) {
    if (to < 0 || to >= sortedGroups.length || from === to) return;
    const next = arrayMove(sortedGroups, from, to);
    setGroupOrder(next.map((group) => group.id));
    commitOrder("form-reorder-grupos", next.map((group) => group.id));
  }

  function moveSectionTo(from: number, to: number) {
    if (to < 0 || to >= sortedSections.length || from === to) return;
    const next = arrayMove(sortedSections, from, to);
    setSectionOrder(next.map((section) => section.id));
    commitOrder("form-reorder-secoes", next.map((section) => section.id));
  }

  function onSectionsDragEnd(event: DragEndEvent) {
    const from = sortedSections.findIndex((section) => section.id === event.active.id);
    const to = sortedSections.findIndex((section) => section.id === event.over?.id);
    moveSectionTo(from, to);
  }

  function onGroupsDragEnd(event: DragEndEvent) {
    const from = sortedGroups.findIndex((group) => group.id === event.active.id);
    const to = sortedGroups.findIndex((group) => group.id === event.over?.id);
    moveGroupTo(from, to);
  }

  function moveValueTo(groupId: number, list: MenuValue[], from: number, to: number) {
    if (to < 0 || to >= list.length || from === to) return;
    const next = arrayMove(list, from, to);
    setValueOrder((current) => ({ ...current, [groupId]: next.map((v) => v.id) }));
    commitOrder("form-reorder-valores", next.map((v) => v.id), groupId);
  }

  /**
   * A ordem das setas ↑ ↓ é a ordem que o cliente vai ver: `sort_order` no
   * banco, desempate pelo nome para não ficar instável entre dois itens que
   * nunca foram movidos. Um item já arrastado obedece
   * `sectionOrder`/`groupOrder`/`valueOrder`.
   */
  const bySortOrder = <T extends { id: number; sort_order: number; name: string }>(
    list: T[],
  ) =>
    [...list].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR"),
    );

  const sortedGroups = reorder(bySortOrder(groups), groupOrder);
  const sortedSections = reorder(bySortOrder(sections), sectionOrder);

  const valuesByGroup = new Map<number, MenuValue[]>();
  for (const value of values) {
    const list = valuesByGroup.get(value.option_group_id) ?? [];
    list.push(value);
    valuesByGroup.set(value.option_group_id, list);
  }
  for (const [groupId, list] of valuesByGroup) {
    valuesByGroup.set(groupId, reorder(bySortOrder(list), valueOrder[groupId]));
  }

  const linksByProduct = new Map<number, number[]>();
  for (const link of links) {
    const list = linksByProduct.get(link.product_id) ?? [];
    list.push(link.option_group_id);
    linksByProduct.set(link.product_id, list);
  }

  // Um grupo sem nenhuma linha em `product_option_groups` não aparece para o
  // cliente: o RPC `get_business_menu` só devolve grupo que o próprio produto
  // elt (`20260101000007_cardapio_digital.sql:201-204`). Vale avisar, porque
  // criar o grupo e esquecer de marcar os produtos é um beco sem saída
  // silencioso — o lojista acha que configurou e nada muda na vitrine.
  const productsByGroup = new Map<number, number[]>();
  for (const link of links) {
    const list = productsByGroup.get(link.option_group_id) ?? [];
    list.push(link.product_id);
    productsByGroup.set(link.option_group_id, list);
  }
  const orphanGroups = sortedGroups.filter(
    (group) => (productsByGroup.get(group.id) ?? []).length === 0,
  );

  const loose = products.filter((product) => product.menu_category_id == null);

  return (
    <div className="mt-10 space-y-12">
      {/*
        Alvos das três reordenações. Um form só, com o campo `optionGroupId`
        preenchido no momento do envio: a action valida a propriedade de cada id
        pelo próprio grupo, então não há como o editor escrever valor de outra
        empresa.
      */}
      <form id="form-reorder-secoes" action={reorderMenuSections} hidden>
        <BackTo backTo={backTo} />
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="ids" defaultValue="" />
      </form>
      <form id="form-reorder-grupos" action={reorderOptionGroups} hidden>
        <BackTo backTo={backTo} />
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="ids" defaultValue="" />
      </form>
      <form id="form-reorder-valores" action={reorderOptionValues} hidden>
        <BackTo backTo={backTo} />
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="optionGroupId" defaultValue="" />
        <input type="hidden" name="ids" defaultValue="" />
      </form>
      <section aria-labelledby="secoes">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="secoes" className="text-lg font-black text-marca-800">
              Seções do cardápio
            </h2>
            <p className="mt-1 text-sm text-texto-suave">
              Os grupos que o cliente percorre: &quot;Pizzas&quot;, &quot;Bebidas&quot;,
              &quot;Sobremesas&quot;.
            </p>
            <p className="mt-1 text-xs text-texto-tenue">
              Arraste pela alça ou use as setas: é a ordem em que as seções
              aparecem para o cliente.
            </p>
          </div>
          <a
            href={previewHref}
            target="_blank"
            rel="noopener"
            className={ghostButton}
          >
            Ver como o cliente vê ↗
          </a>
        </div>

        {sortedSections.length === 0 ? (
          <p className="mt-5 rounded-card border border-dashed border-borda-forte bg-white p-8 text-center text-sm text-texto-suave">
            Nenhuma seção ainda. Crie &quot;Entradas&quot; ou &quot;Bebidas&quot; para
            começar.
          </p>
        ) : (
          <DndContext
            id="secoes-do-cardapio"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onSectionsDragEnd}
          >
            <SortableContext
              items={sortedSections.map((section) => section.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-5 space-y-3">
                {sortedSections.map((section, position) => {
                  const items = products
                    .filter((product) => product.menu_category_id === section.id)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  const open = openSection === section.id;

                  return (
                    <SortableItem key={section.id} id={section.id}>
                      <div className="overflow-hidden rounded-card border border-borda bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borda bg-superficie py-3 pl-7 pr-5">
                          <button
                            type="button"
                            onClick={() => setOpenSection(open ? null : section.id)}
                            aria-expanded={open}
                            className="flex min-h-9 items-center gap-2 text-left text-sm font-black text-marca-800"
                          >
                            <span aria-hidden="true">{open ? "▾" : "▸"}</span>
                            {section.name}
                            <span className="font-normal text-texto-tenue">
                              ({items.length})
                            </span>
                            {!section.is_active ? (
                              <span className="rounded-pill bg-aviso/15 px-2 py-0.5 text-xs font-bold text-aviso-700">
                                oculta
                              </span>
                            ) : null}
                          </button>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <ToggleButton
                              action={toggleMenuSection}
                              id={section.id}
                              businessId={businessId}
                              value={!section.is_active}
                              active={!section.is_active}
                              title={
                                section.is_active
                                  ? "Ocultar seção da vitrine"
                                  : "Exibir seção na vitrine"
                              }
                              activeClass="border-aviso-700 bg-aviso/10 text-aviso-700"
                            >
                              {section.is_active ? "Visível" : "Oculta"}
                            </ToggleButton>

                            {position > 0 ? (
                              <MoveArrowButton
                                onClick={() => moveSectionTo(position, position - 1)}
                                title={`Subir ${section.name}`}
                                glyph="↑"
                              />
                            ) : null}
                            {position < sortedSections.length - 1 ? (
                              <MoveArrowButton
                                onClick={() => moveSectionTo(position, position + 1)}
                                title={`Descer ${section.name}`}
                                glyph="↓"
                              />
                            ) : null}
                          </div>
                        </div>

                        {open ? (
                          <SectionBody
                            businessId={businessId}
                            backTo={backTo}
                            section={section}
                            items={items}
                            groups={sortedGroups}
                            linksByProduct={linksByProduct}
                            productState={productState}
                            productAction={productAction}
                            productPending={productPending}
                          />
                        ) : null}
                      </div>
                    </SortableItem>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {loose.length > 0 ? (
          <div className="mt-4 rounded-card border border-aviso/40 bg-aviso/5 p-4">
            <p className="text-sm font-bold text-texto-forte">
              {loose.length}{" "}
              {loose.length === 1
                ? "item está sem seção"
                : "itens estão sem seção"}
            </p>
            <p className="mt-1 text-xs text-texto-suave">
              Eles não aparecem para o cliente. Escolha uma seção na edição de
              cada um.
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {loose.map((product) => (
                <li
                  key={product.id}
                  className="rounded-pill border border-borda-forte bg-white px-3 py-1 text-xs font-semibold text-texto-forte"
                >
                  {product.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form
          action={sectionAction}
          className="mt-5 rounded-card border border-borda bg-white p-5"
        >
          <BackTo backTo={backTo} />
          <input type="hidden" name="businessId" value={businessId} />
          <p className="text-sm font-black text-marca-800">Criar seção</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div>
              <label htmlFor="new-section" className={label}>
                Nome
              </label>
              <input
                id="new-section"
                name="name"
                required
                maxLength={80}
                className={input}
                placeholder="Bebidas"
              />
            </div>
            <div>
              <label htmlFor="new-section-desc" className={label}>
                Descrição (opcional)
              </label>
              <input
                id="new-section-desc"
                name="description"
                maxLength={300}
                className={input}
                placeholder="Geladas, quenchers e cafés"
              />
            </div>
          </div>
          <ErrorNote error={sectionState.error} />
          <button type="submit" disabled={sectionPending} className={`mt-4 ${primaryButton}`}>
            {sectionPending ? "Criando…" : "Criar seção"}
          </button>
        </form>
      </section>

      <section aria-labelledby="opcoes">
        <h2 id="opcoes" className="text-lg font-black text-marca-800">
          Grupos de opção
        </h2>
        <p className="mt-1 text-sm text-texto-suave">
          As escolhas que o cliente faz ao pedir: tamanho, borda, sabores.
        </p>

        {orphanGroups.length > 0 ? (
          <p className="mt-4 rounded-card border border-aviso/40 bg-aviso/10 p-4 text-sm text-texto">
            <span className="font-bold text-aviso-700">
              {orphanGroups.length === 1
                ? "1 grupo não aparece para o cliente:"
                : `${orphanGroups.length} grupos não aparecem para o cliente:`}
            </span>{" "}
            {orphanGroups.map((group) => group.name).join(", ")}. Um grupo só
            existe para o cliente depois de marcá-lo em pelo menos um produto —
            abra o produto e use &quot;Grupos de opção&quot;.
          </p>
        ) : null}

        {groups.length === 0 ? (
          <p className="mt-5 rounded-card border border-dashed border-borda-forte bg-white p-8 text-center text-sm text-texto-suave">
            Nenhum grupo ainda. Crie &quot;Tamanho&quot; ou &quot;Borda&quot; para os
            itens oferecerem variações.
          </p>
        ) : (
          <DndContext
            // `id` fixo: sem ele o dnd-kit gera `DndDescribedBy-N` a partir de
            // um contador de módulo, e como há um `DndContext` aninhado por
            // grupo aberto, servidor e cliente instanciam em ordens diferentes
            // e o React acusa hydration mismatch no `aria-describedby`.
            id="grupos-de-opcao"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onGroupsDragEnd}
          >
            <SortableContext
              items={sortedGroups.map((group) => group.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-5 space-y-3">
                {sortedGroups.map((group, position) => (
                  <SortableItem key={group.id} id={group.id}>
                    <OptionGroupCard
                      businessId={businessId}
                      backTo={backTo}
                      group={group}
                      groupValues={valuesByGroup.get(group.id) ?? []}
                      usedByCount={(productsByGroup.get(group.id) ?? []).length}
                      isFirst={position === 0}
                      isLast={position === sortedGroups.length - 1}
                      onMove={(direction) => moveGroupTo(position, position + direction)}
                      open={openGroup === group.id}
                      onToggle={() =>
                        setOpenGroup((current) => (current === group.id ? null : group.id))
                      }
                      onValuesDragEnd={(from, to) =>
                        moveValueTo(
                          group.id,
                          valuesByGroup.get(group.id) ?? [],
                          from,
                          to,
                        )
                      }
                      sensors={sensors}
                      valueState={valueState}
                      valueAction={valueAction}
                      valuePending={valuePending}
                    />
                  </SortableItem>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <form
          action={groupAction}
          className="mt-5 rounded-card border border-borda bg-white p-5"
        >
          <BackTo backTo={backTo} />
          <input type="hidden" name="businessId" value={businessId} />
          <p className="text-sm font-black text-marca-800">Criar grupo de opção</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="g-name" className={label}>
                Nome
              </label>
              <input
                id="g-name"
                name="name"
                required
                maxLength={60}
                className={input}
                placeholder="Borda"
              />
            </div>
            <div>
              <label htmlFor="g-min" className={label}>
                Mínimo
              </label>
              <input
                id="g-min"
                name="minSelect"
                type="number"
                min="0"
                max="10"
                defaultValue="1"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="g-max" className={label}>
                Máximo
              </label>
              <input
                id="g-max"
                name="maxSelect"
                type="number"
                min="1"
                max="10"
                defaultValue="1"
                className={input}
              />
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-texto-forte">
            <input
              type="checkbox"
              name="isRequired"
              className="h-4 w-4 accent-marca-800"
            />
            Obrigatório
          </label>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-texto-forte">
            <input
              type="checkbox"
              name="isFlavorGroup"
              className="mt-0.5 h-4 w-4 accent-marca-800"
            />
            <span>
              Grupo de sabores (pizza)
              <span className="block text-xs font-normal text-texto-suave">
                Cada opção informa o preço cheio do sabor e o cliente paga o mais
                caro entre os escolhidos. Use no grupo &quot;Sabores&quot; de cada tamanho.
              </span>
            </span>
          </label>
          <ErrorNote error={groupState.error} />
          <button type="submit" disabled={groupPending} className={`mt-4 ${primaryButton}`}>
            {groupPending ? "Criando…" : "Criar grupo"}
          </button>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionBody({
  businessId,
  backTo,
  section,
  items,
  groups,
  linksByProduct,
  productState,
  productAction,
  productPending,
}: {
  businessId: number;
  backTo: string;
  section: MenuSection;
  items: MenuProduct[];
  groups: MenuGroup[];
  linksByProduct: Map<number, number[]>;
  productState: { error: string | null };
  productAction: (formData: FormData) => void;
  productPending: boolean;
}) {
  const [configuring, setConfiguring] = useState(false);

  return (
    <div className="p-5">
      {items.length === 0 ? (
        <p className="rounded-logo border border-dashed border-borda-forte p-6 text-center text-sm text-texto-suave">
          Nenhum item nesta seção.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, index) => (
            <ProductRow
              key={item.id}
              businessId={businessId}
              backTo={backTo}
              product={item}
              groups={groups}
              linked={linksByProduct.get(item.id) ?? []}
              isFirst={index === 0}
              isLast={index === items.length - 1}
            />
          ))}
        </ul>
      )}

      <form
        action={productAction}
        className="mt-5 rounded-logo border border-borda bg-superficie p-4"
      >
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="menuCategoryId" value={section.id} />
        <p className="text-sm font-black text-marca-800">
          Adicionar item em {section.name}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_8rem]">
          <div>
            <label htmlFor={`name-${section.id}`} className={label}>
              Nome
            </label>
            <input
              id={`name-${section.id}`}
              name="name"
              required
              maxLength={120}
              className={input}
              placeholder="Calabresa"
            />
          </div>
          <div>
            <label htmlFor={`price-${section.id}`} className={label}>
              Preço (R$)
            </label>
            <input
              id={`price-${section.id}`}
              name="priceReais"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0.00"
              className={input}
            />
          </div>
          <div>
            <label htmlFor={`compare-${section.id}`} className={label}>
              De (R$)
            </label>
            <input
              id={`compare-${section.id}`}
              name="compareAtReais"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0.00"
              className={input}
            />
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor={`desc-${section.id}`} className={label}>
            Descrição
          </label>
          <textarea
            id={`desc-${section.id}`}
            name="description"
            rows={2}
            maxLength={600}
            className={`${input} py-2`}
            placeholder="O que vem no item, o que diferencia."
          />
        </div>

        <div className="mt-3">
          <ImageField
            businessId={businessId}
            name="imageUrl"
            label="Foto do item"
          />
        </div>

        <ErrorNote error={productState.error} />
        <button
          type="submit"
          disabled={productPending}
          className={`mt-4 ${primaryButton}`}
        >
          {productPending ? "Adicionando…" : "Adicionar item"}
        </button>
      </form>

      <div className="mt-4 border-t border-borda pt-4">
        <button
          type="button"
          onClick={() => setConfiguring((value) => !value)}
          aria-expanded={configuring}
          className={ghostButton}
        >
          {configuring ? "Fechar" : "Configurar seção"}
        </button>

        {configuring ? (
          <form
            action={updateMenuSection}
            className="mt-3 space-y-3 rounded-logo bg-superficie p-4"
          >
            <BackTo backTo={backTo} />
            <input type="hidden" name="id" value={section.id} />
            <input type="hidden" name="businessId" value={businessId} />

            <div>
              <label htmlFor={`sn-${section.id}`} className={label}>
                Nome
              </label>
              <input
                id={`sn-${section.id}`}
                name="name"
                required
                maxLength={80}
                defaultValue={section.name}
                className={input}
              />
            </div>
            <div>
              <label htmlFor={`sd-${section.id}`} className={label}>
                Descrição
              </label>
              <input
                id={`sd-${section.id}`}
                name="description"
                maxLength={300}
                defaultValue={section.description ?? ""}
                className={input}
              />
            </div>
            <ImageField
              businessId={businessId}
              name="imageUrl"
              label="Foto da seção"
              defaultValue={section.image_url}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-texto-forte">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={section.is_active}
                className="h-4 w-4 accent-marca-800"
              />
              Exibir na vitrine
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className={primaryButton}>
                Salvar seção
              </button>
            </div>
          </form>
        ) : null}

        <form action={deleteMenuSection} className="mt-3">
          <BackTo backTo={backTo} />
          <input type="hidden" name="id" value={section.id} />
          <input type="hidden" name="businessId" value={businessId} />
          <button type="submit" className={dangerButton}>
            Excluir seção
          </button>
          <p className="mt-1 text-xs text-texto-tenue">
            Os {items.length} {items.length === 1 ? "item fica" : "itens ficam"}{" "}
            sem seção e saem da vitrine até você recolocá-los.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProductRow({
  businessId,
  backTo,
  product,
  groups,
  linked,
  isFirst,
  isLast,
}: {
  businessId: number;
  backTo: string;
  product: MenuProduct;
  groups: MenuGroup[];
  linked: number[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const usesOwnGroups = linked.length > 0;
  const hasPromo = product.compare_at_cents > product.price_cents;

  return (
    <li className="rounded-logo border border-borda bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-16 w-16 shrink-0 rounded-logo border border-borda object-cover"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-texto-forte">
              {product.name}
              {product.is_featured ? (
                <span className="ml-2 rounded-pill bg-destaque-500/20 px-2 py-0.5 text-xs font-bold text-marca-800">
                  destaque
                </span>
              ) : null}
              {!product.is_available ? (
                <span className="ml-2 rounded-pill bg-erro/10 px-2 py-0.5 text-xs font-bold text-erro-700">
                  pausado
                </span>
              ) : null}
            </p>
            {product.description ? (
              <p className="mt-0.5 text-xs text-texto-suave">{product.description}</p>
            ) : null}
            <p className="mt-1 text-sm font-black text-marca-800">
              {hasPromo ? (
                <span className="mr-1.5 text-xs font-semibold text-texto-tenue line-through">
                  {formatBRL(product.compare_at_cents)}
                </span>
              ) : null}
              {formatBRL(product.price_cents)}
            </p>
            <p className="mt-1 text-xs text-texto-tenue">
              {usesOwnGroups
                ? `grupos: ${
                    groups
                      .filter((group) => linked.includes(group.id))
                      .map((group) => group.name)
                      .join(", ") || "nenhum"
                  }`
                : "herda todos os grupos da empresa"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ToggleButton
            action={toggleProductAvailability}
            id={product.id}
            businessId={businessId}
            value={!product.is_available}
            active={!product.is_available}
            title={
              product.is_available ? "Pausar item" : "Voltar a vender o item"
            }
            activeClass="border-erro bg-erro/10 text-erro-700"
          >
            {product.is_available ? "Pausar" : "Pausado"}
          </ToggleButton>

          <ToggleButton
            action={toggleProductFeatured}
            id={product.id}
            businessId={businessId}
            value={!product.is_featured}
            active={product.is_featured}
            title={
              product.is_featured
                ? "Tirar dos destaques"
                : "Marcar como destaque"
            }
            activeClass="border-destaque-500 bg-destaque-500/20 text-marca-800"
          >
            ★
          </ToggleButton>

          {!isFirst ? (
            <ArrowButton
              action={moveProduct}
              id={product.id}
              businessId={businessId}
              direction="up"
              title={`Subir ${product.name}`}
              glyph="↑"
            />
          ) : null}
          {!isLast ? (
            <ArrowButton
              action={moveProduct}
              id={product.id}
              businessId={businessId}
              direction="down"
              title={`Descer ${product.name}`}
              glyph="↓"
            />
          ) : null}

          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
            className={ghostButton}
          >
            {editing ? "Fechar" : "Editar"}
          </button>
        </div>
      </div>

      {editing ? (
        <form
          action={updateProduct}
          className="mt-4 space-y-3 rounded-logo bg-superficie p-4"
        >
          <BackTo backTo={backTo} />
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="businessId" value={businessId} />

          <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem]">
            <div>
              <label htmlFor={`pn-${product.id}`} className={label}>
                Nome
              </label>
              <input
                id={`pn-${product.id}`}
                name="name"
                required
                maxLength={120}
                defaultValue={product.name}
                className={input}
              />
            </div>
            <div>
              <label htmlFor={`pp-${product.id}`} className={label}>
                Preço (R$)
              </label>
              <input
                id={`pp-${product.id}`}
                name="priceReais"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(product.price_cents / 100).toFixed(2)}
                className={input}
              />
            </div>
            <div>
              <label htmlFor={`pc-${product.id}`} className={label}>
                Preço de (R$)
              </label>
              <input
                id={`pc-${product.id}`}
                name="compareAtReais"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(product.compare_at_cents / 100).toFixed(2)}
                className={input}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`pd-${product.id}`} className={label}>
              Descrição
            </label>
            <textarea
              id={`pd-${product.id}`}
              name="description"
              rows={2}
              maxLength={600}
              defaultValue={product.description ?? ""}
              className={`${input} py-2`}
            />
          </div>

          <ImageField
            businessId={businessId}
            name="imageUrl"
            label="Foto do item"
            defaultValue={product.image_url}
          />

          <div className="flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-texto-forte">
              <input
                type="checkbox"
                name="isAvailable"
                defaultChecked={product.is_available}
                className="h-4 w-4 accent-marca-800"
              />
              Disponível
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-texto-forte">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={product.is_featured}
                className="h-4 w-4 accent-marca-800"
              />
              Destacar no cardápio
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButton}>
              Salvar
            </button>
          </div>
        </form>
      ) : null}

      {groups.length > 0 ? (
        <div className="mt-3 border-t border-borda pt-3">
          <p className="text-xs font-semibold text-texto-suave">
            Grupos que valem para este item
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {groups.map((group) => {
              const on = linked.includes(group.id);
              return (
                <li key={group.id}>
                  <form action={on ? unlinkProductFromOptionGroup : linkProductToOptionGroup}>
                    <BackTo backTo={backTo} />
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="optionGroupId" value={group.id} />
                    <button
                      type="submit"
                      aria-pressed={on}
                      className={`min-h-9 rounded-pill border px-4 text-xs font-bold transition-colors ${
                        on
                          ? "border-marca-600 bg-marca-100 text-marca-800"
                          : ghostButton
                      }`}
                    >
                      {group.name}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
          {!usesOwnGroups ? (
            <p className="mt-2 text-xs text-texto-tenue">
              Enquanto nenhum grupo for escolhido, o item herda todos da empresa.
            </p>
          ) : null}
        </div>
      ) : null}

      <form action={deleteProduct} className="mt-3">
        <BackTo backTo={backTo} />
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="businessId" value={businessId} />
        <button type="submit" className="text-xs font-bold text-texto-tenue hover:text-erro-700">
          Excluir item
        </button>
      </form>
    </li>
  );
}

/* ------------------------------------------------------------------ */

function OptionGroupCard({
  businessId,
  backTo,
  group,
  groupValues,
  usedByCount,
  isFirst,
  isLast,
  onMove,
  onValuesDragEnd,
  open,
  onToggle,
  sensors,
  valueState,
  valueAction,
  valuePending,
}: {
  businessId: number;
  backTo: string;
  group: MenuGroup;
  groupValues: MenuValue[];
  /** Quantos produtos marcam este grupo. `0` = invisível para o cliente. */
  usedByCount: number;
  isFirst: boolean;
  isLast: boolean;
  /** `-1` sobe, `+1` desce. Reordena por posição, não trocando `sort_order`. */
  onMove: (direction: -1 | 1) => void;
  onValuesDragEnd: (from: number, to: number) => void;
  open: boolean;
  onToggle: () => void;
  sensors: ReturnType<typeof useSensors>;
  valueState: { error: string | null };
  valueAction: (formData: FormData) => void;
  valuePending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const available = groupValues.filter((value) => value.is_available).length;

  return (
    <div className="overflow-hidden rounded-card border border-borda bg-white pl-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borda bg-superficie py-3 pl-3 pr-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-h-9 min-w-0 items-center gap-2 text-left text-sm font-black text-marca-800"
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
          {group.name}
          <span className="font-normal text-texto-tenue">
            ({groupValues.length})
          </span>
          {groupValues.length === 0 ? (
            <span className="rounded-pill bg-aviso/15 px-2 py-0.5 text-xs font-bold text-aviso-700">
              sem opções
            </span>
          ) : null}
          {groupValues.length > available ? (
            <span className="rounded-pill bg-erro/10 px-2 py-0.5 text-xs font-bold text-erro-700">
              pausadas
            </span>
          ) : null}
          {usedByCount === 0 ? (
            <span className="rounded-pill bg-aviso/15 px-2 py-0.5 text-xs font-bold text-aviso-700">
              não aparece para o cliente
            </span>
          ) : null}
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          {!isFirst ? (
            <MoveArrowButton
              onClick={() => onMove(-1)}
              title={`Subir ${group.name}`}
              glyph="↑"
            />
          ) : null}
          {!isLast ? (
            <MoveArrowButton
              onClick={() => onMove(1)}
              title={`Descer ${group.name}`}
              glyph="↓"
            />
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-texto-tenue">
              {group.is_required ? "obrigatório" : "opcional"} ·{" "}
              {group.min_select === group.max_select
                ? `exatamente ${group.max_select}`
                : `de ${group.min_select} a ${group.max_select}`}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                aria-expanded={editing}
                className={ghostButton}
              >
                {editing ? "Fechar" : "Editar"}
              </button>
              <form action={deleteOptionGroup}>
                <BackTo backTo={backTo} />
                <input type="hidden" name="id" value={group.id} />
                <input type="hidden" name="businessId" value={businessId} />
                <button type="submit" className={dangerButton}>
                  Excluir grupo
                </button>
              </form>
            </div>
          </div>

          {groupValues.length === 0 ? (
            <p className="mt-3 text-xs font-semibold text-aviso-700">
              Sem valores ainda — o cliente não teria o que escolher.
            </p>
          ) : (
            <>
              <DndContext
                id={`valores-do-grupo-${group.id}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const from = groupValues.findIndex((v) => v.id === event.active.id);
                  const to = groupValues.findIndex((v) => v.id === event.over?.id);
                  onValuesDragEnd(from, to);
                }}
              >
                <SortableContext
                  items={groupValues.map((value) => value.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="mt-3 space-y-1.5">
                    {groupValues.map((value, index) => (
                      <SortableItem key={value.id} id={value.id}>
                        <div
                          className={`flex items-center gap-1.5 rounded-pill border py-1 pl-6 pr-3 text-xs font-semibold ${
                            value.is_available
                              ? "border-borda-forte text-texto-forte"
                              : "border-erro/40 bg-erro/5 text-texto-tenue line-through"
                          }`}
                        >
                          {value.name}
                          {group.is_flavor_group ? (
                            // Grupo de sabores: o valor guarda o preço cheio do
                            // sabor, não um acréscimo — mostra sem o "+".
                            <span className="ml-1 text-marca-600">
                              {formatBRL(value.price_delta_cents)}
                            </span>
                          ) : value.price_delta_cents ? (
                            <span className="ml-1 text-marca-600">
                              {value.price_delta_cents > 0 ? "+" : ""}
                              {formatBRL(value.price_delta_cents)}
                            </span>
                          ) : null}
                          <MiniArrowButton
                            onClick={() => onValuesDragEnd(index, index - 1)}
                            disabled={index === 0}
                            title={`Subir ${value.name}`}
                            glyph="↑"
                          />
                          <MiniArrowButton
                            onClick={() => onValuesDragEnd(index, index + 1)}
                            disabled={index === groupValues.length - 1}
                            title={`Descer ${value.name}`}
                            glyph="↓"
                          />
                          <ToggleButton
                            action={toggleOptionValue}
                            id={value.id}
                            businessId={businessId}
                            value={!value.is_available}
                            active={!value.is_available}
                            title={
                              value.is_available
                                ? `Pausar ${value.name}`
                                : `Reativar ${value.name}`
                            }
                            activeClass="border-erro bg-erro/10 text-erro-700"
                          >
                            {value.is_available ? "⏸" : "▶"}
                          </ToggleButton>
                          <form action={deleteOptionValue} className="contents">
                            <BackTo backTo={backTo} />
                            <input type="hidden" name="id" value={value.id} />
                            <input type="hidden" name="businessId" value={businessId} />
                            <button
                              type="submit"
                              title={`Excluir ${value.name}`}
                              aria-label={`Excluir ${value.name}`}
                              className="text-texto-tenue hover:text-erro-700"
                            >
                              ×
                            </button>
                          </form>
                        </div>
                      </SortableItem>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
              <p className="mt-2 text-xs text-texto-tenue">
                Arraste pela alça ou use as setas: é a ordem em que as opções
                aparecem para o cliente.
              </p>
            </>
          )}

          {editing ? (
            <form
              action={updateOptionGroup}
              className="mt-4 grid gap-3 rounded-logo bg-superficie p-4 sm:grid-cols-[1fr_5rem_5rem]"
            >
              <BackTo backTo={backTo} />
              <input type="hidden" name="id" value={group.id} />
              <input type="hidden" name="businessId" value={businessId} />
              <div>
                <label htmlFor={`gn-${group.id}`} className={label}>
                  Nome
                </label>
                <input
                  id={`gn-${group.id}`}
                  name="name"
                  required
                  maxLength={60}
                  defaultValue={group.name}
                  className={input}
                />
              </div>
              <div>
                <label htmlFor={`gmin-${group.id}`} className={label}>
                  Mínimo
                </label>
                <input
                  id={`gmin-${group.id}`}
                  name="minSelect"
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={group.min_select}
                  className={input}
                />
              </div>
              <div>
                <label htmlFor={`gmax-${group.id}`} className={label}>
                  Máximo
                </label>
                <input
                  id={`gmax-${group.id}`}
                  name="maxSelect"
                  type="number"
                  min="1"
                  max="10"
                  defaultValue={group.max_select}
                  className={input}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-texto-forte sm:col-span-3">
                <input
                  type="checkbox"
                  name="isRequired"
                  defaultChecked={group.is_required}
                  className="h-4 w-4 accent-marca-800"
                />
                Obrigatório
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-texto-forte sm:col-span-3">
                <input
                  type="checkbox"
                  name="isFlavorGroup"
                  defaultChecked={group.is_flavor_group}
                  className="mt-0.5 h-4 w-4 accent-marca-800"
                />
                <span>
                  Grupo de sabores (pizza)
                  <span className="block text-xs font-normal text-texto-suave">
                    Cada opção informa o preço cheio do sabor e o cliente paga o
                    mais caro entre os escolhidos.
                  </span>
                </span>
              </label>
              <div className="sm:col-span-3">
                <button type="submit" className={primaryButton}>
                  Salvar grupo
                </button>
              </div>
            </form>
          ) : null}

          <form
            action={valueAction}
            className="mt-4 flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="optionGroupId" value={group.id} />
            <div className="min-w-40 flex-1">
              <label htmlFor={`v-name-${group.id}`} className={label}>
                Nova opção
              </label>
              <input
                id={`v-name-${group.id}`}
                name="name"
                required
                maxLength={60}
                className={input}
                placeholder="Catupiry"
              />
            </div>
            <div className="w-32">
              <label htmlFor={`v-delta-${group.id}`} className={label}>
                {group.is_flavor_group ? "Preço do sabor (R$)" : "Acréscimo (R$)"}
              </label>
              <input
                id={`v-delta-${group.id}`}
                name="deltaReais"
                type="number"
                step="0.01"
                defaultValue="0.00"
                className={input}
              />
            </div>
            <button
              type="submit"
              disabled={valuePending}
              className="min-h-10 rounded-pill border border-marca-800 px-5 text-sm font-bold text-marca-800 disabled:opacity-60"
            >
              Adicionar
            </button>
            <ErrorNote error={valueState.error} />
          </form>
        </div>
      ) : null}
    </div>
  );
}
