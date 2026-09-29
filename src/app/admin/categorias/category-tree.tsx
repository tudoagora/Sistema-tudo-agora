"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Fragment, useActionState, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  deleteCategory,
  reorderCategories,
  toggleCategory,
  updateCategory,
  type CategoryFormState,
} from "./actions";

export type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  imageUrl: string | null;
  isActive: boolean;
  businessCount: number;
};

type Alvo = { id: number; intencao: Intencao };
/** Onde o arrasto está caindo: antes, depois ou dentro (vira subcategoria). */
type Intencao = "antes" | "depois" | "dentro";

/** Só as faixas que o cálculo de intenção usa do retângulo do alvo. */
type Faixa = { top: number; bottom: number; height: number };

const FORM_ID = "form-ordem-categorias";
/** Faixa de cima/baixo do alvo que reordena; o meio transforma em subcategoria. */
const BANDA = 0.28;

const inicial: CategoryFormState = { error: null };

const campo =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte focus:border-marca-600";

function intencao(caixa: Faixa, y: number): Intencao {
  if (y < caixa.top + caixa.height * BANDA) return "antes";
  if (y > caixa.bottom - caixa.height * BANDA) return "depois";
  return "dentro";
}

/**
 * O nó arrastado e tudo que está embaixo dele saem juntos — a lista é montada
 * com as filhas coladas na principal, então uma passada basta.
 */
function comFilhas(nos: CategoryNode[], id: number): Set<number> {
  const ids = new Set<number>([id]);
  for (const no of nos) {
    if (no.parentId != null && ids.has(no.parentId)) ids.add(no.id);
  }
  return ids;
}

/**
 * Aplica o arrasto na lista plana: tira a subárvore e reinsere no lugar certo
 * do novo pai. Só existem dois níveis, então "dentro" de uma subcategoria não
 * vira nada — cai no mesmo nível dela.
 */
function mover(
  nos: CategoryNode[],
  id: number,
  alvoId: number,
  intencao: Intencao,
): CategoryNode[] {
  const no = nos.find((linha) => linha.id === id);
  const alvo = nos.find((linha) => linha.id === alvoId);
  if (!no || !alvo) return nos;

  const saindo = comFilhas(nos, id);
  const resto = nos.filter((linha) => !saindo.has(linha.id));
  // Soltar uma principal sobre a própria subcategoria não tem destino válido.
  if (!resto.some((linha) => linha.id === alvoId)) return nos;

  const dentro = intencao === "dentro" && alvo.parentId == null;
  const parentId = dentro ? alvo.id : alvo.parentId;
  const movido = no.parentId === parentId ? no : { ...no, parentId };

  let indice: number;
  if (dentro) {
    // último filho da principal; se ela não tem nenhum, logo abaixo dela
    let ultimo = resto.findIndex((linha) => linha.id === alvo.id);
    for (let i = resto.length - 1; i > ultimo; i -= 1) {
      if (resto[i].parentId === alvo.id) {
        ultimo = i;
        break;
      }
    }
    indice = ultimo + 1;
  } else {
    const posicao = resto.findIndex((linha) => linha.id === alvo.id);
    indice = intencao === "antes" ? posicao : posicao + 1;
  }

  return [...resto.slice(0, indice), movido, ...resto.slice(indice)];
}

/** Seta de teclado/teclado físico: troca de lugar com o irmão da frente. */
function trocar(nos: CategoryNode[], id: number, passo: 1 | -1): CategoryNode[] {
  const no = nos.find((linha) => linha.id === id);
  if (!no) return nos;
  const irmaos = nos.filter((linha) => linha.parentId === no.parentId);
  const vizinho = irmaos[irmaos.findIndex((linha) => linha.id === id) + passo];
  return vizinho ? mover(nos, id, vizinho.id, passo < 0 ? "antes" : "depois") : nos;
}

/** Solta a subcategoria na lista de principais, logo abaixo de quem a alugava. */
function promover(nos: CategoryNode[], id: number): CategoryNode[] {
  const no = nos.find((linha) => linha.id === id);
  if (!no || no.parentId == null) return nos;
  const irmaos = nos.filter((linha) => linha.parentId === no.parentId);
  const acima = irmaos[irmaos.findIndex((linha) => linha.id === id) - 1];
  return acima ? mover(nos, id, acima.id, "depois") : nos;
}

function Alca() {
  return (
    <svg viewBox="0 0 10 16" aria-hidden="true" className="h-4 w-2.5 fill-current">
      <circle cx="2" cy="2" r="1.4" />
      <circle cx="8" cy="2" r="1.4" />
      <circle cx="2" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="2" cy="14" r="1.4" />
      <circle cx="8" cy="14" r="1.4" />
    </svg>
  );
}

function Botao({
  children,
  onClick,
  titulo,
  desativado,
}: {
  children: ReactNode;
  onClick: () => void;
  titulo: string;
  desativado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desativado}
      title={titulo}
      className="grid h-9 w-9 place-items-center rounded-logo text-sm text-texto-suave transition-colors hover:bg-superficie hover:text-marca-800 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/** Mesmo desenho do `Botao`, mas submitting — é o que liga/desliga a linha. */
function BotaoEnvio({ children, titulo }: { children: ReactNode; titulo: string }) {
  return (
    <button
      type="submit"
      title={titulo}
      className="grid h-9 w-9 place-items-center rounded-logo text-sm text-texto-suave transition-colors hover:bg-superficie hover:text-marca-800"
    >
      {children}
    </button>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-3 rounded-logo border border-erro/30 bg-erro/5 px-4 py-3 text-sm text-erro-700"
    >
      {children}
    </p>
  );
}

function Linha({
  no,
  nivel,
  raizes,
  alvo,
  primeiro,
  ultimo,
  onMover,
  onPromover,
}: {
  no: CategoryNode;
  nivel: 0 | 1;
  raizes: { id: number; name: string }[];
  alvo: Alvo | null;
  primeiro: boolean;
  ultimo: boolean;
  onMover: (id: number, passo: 1 | -1) => void;
  onPromover: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: no.id });
  const [editando, setEditando] = useState(false);
  const [editState, editar] = useActionState(updateCategory, inicial);
  const [apagarState, apagar] = useActionState(deleteCategory, inicial);

  const destacado = alvo?.id === no.id;
  const marca = destacado ? alvo.intencao : null;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        // Sem isto o item arrastado passa por baixo dos irmãos e some no meio
        // da pilha, porque os vizinhos criam contexto de empilhamento próprio.
        zIndex: isDragging ? 20 : "auto",
        position: "relative",
      }}
      className={cn(
        "rounded-card border bg-white p-4 transition-colors",
        no.isActive ? "border-borda" : "border-dashed border-borda",
        marca === "dentro" && "border-destaque-500 ring-2 ring-destaque-400",
        (marca === "antes" || marca === "depois") && "border-marca-600",
        nivel === 1 && "ml-6 sm:ml-10",
      )}
    >
      {marca === "antes" ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 inset-x-2 h-0.5 rounded-full bg-marca-600"
        />
      ) : null}
      {marca === "depois" ? (
        <span
          aria-hidden="true"
          className="absolute -bottom-1 inset-x-2 h-0.5 rounded-full bg-marca-600"
        />
      ) : null}

      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Arrastar para reordenar"
          aria-label={`Reordenar ${no.name}. Arraste ou use as setas.`}
          className="-ml-1 mt-0.5 cursor-grab rounded p-1 text-texto-tenue transition-colors hover:text-marca-800 active:cursor-grabbing"
        >
          <Alca />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-texto-forte">
            {no.name}
            {!no.isActive ? (
              <span className="rounded-pill bg-superficie-2 px-2 py-0.5 text-xs font-semibold text-texto-tenue">
                inativa
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-xs text-texto-tenue">
            /{no.slug} ·{" "}
            {no.businessCount === 1 ? "1 empresa" : `${no.businessCount} empresas`}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Botao
              titulo="Subir"
              onClick={() => onMover(no.id, -1)}
              desativado={primeiro}
            >
              <span aria-hidden="true">↑</span>
            </Botao>
            <Botao
              titulo="Descer"
              onClick={() => onMover(no.id, 1)}
              desativado={ultimo}
            >
              <span aria-hidden="true">↓</span>
            </Botao>
            {nivel === 1 ? (
              <Botao
                titulo="Virar categoria principal"
                onClick={() => onPromover(no.id)}
              >
                <span aria-hidden="true">⇧</span>
                <span className="sr-only">Virar categoria principal</span>
              </Botao>
            ) : null}
            <form action={toggleCategory}>
              <input type="hidden" name="id" value={no.id} />
              <BotaoEnvio titulo={no.isActive ? "Desligar" : "Ligar"}>
                <span aria-hidden="true">{no.isActive ? "◉" : "○"}</span>
                <span className="sr-only">
                  {no.isActive ? "Desligar" : "Ligar"} {no.name}
                </span>
              </BotaoEnvio>
            </form>
            <button
              type="button"
              onClick={() => setEditando((v) => !v)}
              aria-expanded={editando}
              className="h-9 rounded-logo px-3 text-sm font-semibold text-texto-suave transition-colors hover:bg-superficie hover:text-marca-800"
            >
              {editando ? "Fechar" : "Editar"}
            </button>
            <form action={apagar} className="ml-auto">
              <input type="hidden" name="id" value={no.id} />
              <button
                type="submit"
                className="h-9 rounded-logo px-3 text-sm font-semibold text-texto-suave transition-colors hover:bg-erro/10 hover:text-erro-700"
              >
                Excluir
              </button>
            </form>
          </div>

          {apagarState.error ? <Aviso>{apagarState.error}</Aviso> : null}

          {editando ? (
            <form action={editar} className="mt-4 space-y-3 border-t border-borda pt-4">
              <input type="hidden" name="id" value={no.id} />
              <div>
                <label
                  htmlFor={`nome-${no.id}`}
                  className="mb-1.5 block text-sm font-semibold text-texto-forte"
                >
                  Nome
                </label>
                <input
                  id={`nome-${no.id}`}
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={no.name}
                  className={campo}
                />
              </div>
              <div>
                <label
                  htmlFor={`pai-${no.id}`}
                  className="mb-1.5 block text-sm font-semibold text-texto-forte"
                >
                  Categoria principal
                </label>
                <select
                  id={`pai-${no.id}`}
                  name="parentId"
                  defaultValue={no.parentId ?? ""}
                  className={campo}
                >
                  <option value="">É uma categoria principal</option>
                  {raizes
                    .filter((raiz) => raiz.id !== no.id)
                    .map((raiz) => (
                      <option key={raiz.id} value={raiz.id}>
                        {raiz.name}
                      </option>
                    ))}
                </select>
              </div>
              {nivel === 0 ? (
                <div>
                  <label
                    htmlFor={`imagem-${no.id}`}
                    className="mb-1.5 block text-sm font-semibold text-texto-forte"
                  >
                    Imagem da pílula da home
                  </label>
                  <input
                    id={`imagem-${no.id}`}
                    name="imageUrl"
                    defaultValue={no.imageUrl ?? ""}
                    placeholder="/grupos/comida.jpg"
                    className={campo}
                  />
                </div>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-texto-forte">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={no.isActive}
                  className="h-4 w-4 accent-marca-800"
                />
                Visível no site
              </label>

              {editState.error ? <Aviso>{editState.error}</Aviso> : null}

              <button
                type="submit"
                className="min-h-11 rounded-pill bg-marca-gradient px-6 text-sm font-bold text-white"
              >
                Salvar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Cartao({ no }: { no: CategoryNode }) {
  return (
    <div className="rounded-card border border-marca-600 bg-white p-4 shadow-card">
      <p className="text-sm font-bold text-marca-800">{no.name}</p>
      <p className="mt-0.5 text-xs text-texto-tenue">/{no.slug}</p>
    </div>
  );
}

/**
 * Árvore de categorias do admin.
 *
 * A lista é plana e na ordem da tela: cada subcategoria vem colada na sua
 * principal, e é esse arranjo que vai para `sort_order` e `parent_id`. Arrastar
 * para a faixa do meio de uma principal transforma o item em subcategoria
 * dela; topo e base reordenam no mesmo nível.
 */
export function CategoryTree({ nos }: { nos: CategoryNode[] }) {
  const [ordem, setOrdem] = useState(nos);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [teclado, setTeclado] = useState(false);
  const idsRef = useRef<HTMLInputElement>(null);
  const paisRef = useRef<HTMLInputElement>(null);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const raizes = ordem.filter((no) => no.parentId == null);
  const filhasDe = (id: number) => ordem.filter((no) => no.parentId === id);
  const cartao = arrastando ? (ordem.find((no) => no.id === arrastando) ?? null) : null;

  function salvar(proxima: CategoryNode[]) {
    if (proxima === ordem) return;
    setOrdem(proxima);
    if (idsRef.current) {
      idsRef.current.value = proxima.map((no) => no.id).join(",");
    }
    if (paisRef.current) {
      paisRef.current.value = proxima
        .map((no) => no.parentId ?? "null")
        .join(",");
    }
    const form = document.getElementById(FORM_ID);
    if (form instanceof HTMLFormElement) form.requestSubmit();
  }

  function aoIniciar(event: DragStartEvent) {
    setArrastando(Number(event.active.id));
    setTeclado(event.activatorEvent instanceof KeyboardEvent);
  }

  function mirar(event: DragOverEvent) {
    const sobre = event.over?.rect;
    const cursor = event.active.rect.current.translated;
    const id = Number(event.over?.id ?? 0);
    if (!sobre || !cursor || !id) {
      setAlvo(null);
      return;
    }
    setAlvo({
      id,
      // Sem ponteiro não há faixa: o teclado só reordena.
      intencao: teclado
        ? "depois"
        : intencao(sobre, cursor.top + cursor.height / 2),
    });
  }

  function aoSoltar(event: DragEndEvent) {
    setArrastando(null);
    setAlvo(null);

    const sobre = event.over?.rect;
    const cursor = event.active.rect.current.translated;
    const alvoId = Number(event.over?.id ?? 0);
    const id = Number(event.active.id);
    if (!sobre || !cursor || !alvoId || id === alvoId) return;

    salvar(
      mover(
        ordem,
        id,
        alvoId,
        teclado ? "depois" : intencao(sobre, cursor.top + cursor.height / 2),
      ),
    );
  }

  return (
    <div>
      <form id={FORM_ID} action={reorderCategories} hidden>
        <input ref={idsRef} type="hidden" name="ids" defaultValue="" />
        <input ref={paisRef} type="hidden" name="pais" defaultValue="" />
      </form>

      <DndContext
        id="arvore-categorias"
        sensors={sensores}
        collisionDetection={closestCenter}
        onDragStart={aoIniciar}
        onDragOver={mirar}
        onDragEnd={aoSoltar}
        onDragCancel={() => {
          setArrastando(null);
          setAlvo(null);
        }}
      >
        <SortableContext
          items={ordem.map((no) => no.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {raizes.map((raiz) => {
              const filhas = filhasDe(raiz.id);
              return (
                <Fragment key={raiz.id}>
                  <Linha
                    no={raiz}
                    nivel={0}
                    raizes={raizes.map((no) => ({ id: no.id, name: no.name }))}
                    alvo={alvo}
                    primeiro={raiz.id === raizes[0]?.id}
                    ultimo={raiz.id === raizes[raizes.length - 1]?.id}
                    onMover={(id, passo) => salvar(trocar(ordem, id, passo))}
                    onPromover={(id) => salvar(promover(ordem, id))}
                  />
                  {filhas.map((filha, i) => (
                    <Linha
                      key={filha.id}
                      no={filha}
                      nivel={1}
                      raizes={raizes.map((no) => ({ id: no.id, name: no.name }))}
                      alvo={alvo}
                      primeiro={i === 0}
                      ultimo={i === filhas.length - 1}
                      onMover={(id, passo) => salvar(trocar(ordem, id, passo))}
                      onPromover={(id) => salvar(promover(ordem, id))}
                    />
                  ))}
                </Fragment>
              );
            })}
          </ul>
        </SortableContext>

        <DragOverlay>
          {cartao ? <Cartao no={cartao} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
