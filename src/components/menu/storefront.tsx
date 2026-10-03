"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import { placeOrder, type OrderState } from "@/app/cardapio/[slug]/actions";
import {
  formatBRL,
  formatPhone,
  isOpenNow,
  whatsappLink,
  type OpeningHours,
} from "@/lib/format";
import { availablePayments } from "@/lib/order";
import {
  flavorGroupOf,
  fromPriceCents,
  lineUnitPriceCents,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

type OptionValue = {
  id: number;
  name: string;
  /**
   * Acréscimo sobre o preço do produto — ou o PREÇO CHEIO do sabor quando o
   * valor pertence a um grupo com `is_flavor_group`.
   */
  price_delta_cents: number;
  /** Foto do valor (sabor, borda, extra) — mostra dentro do botão. */
  image_url: string | null;
};
type OptionGroup = {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  /** Grupo "Sabores": preço cheio por sabor, cobra o mais caro. */
  is_flavor_group: boolean;
  values: OptionValue[];
};
export type StoreItem = {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  compare_at_cents: number;
  image_url: string | null;
  is_featured: boolean;
  /** `null` = item sem seção; o servidor agrupa num "Outros". */
  menu_category_id: number | null;
  option_groups: OptionGroup[];
};
export type StoreSection = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  items: StoreItem[];
};
export type StoreBusiness = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  opening_hours: OpeningHours | null;
  fulfillment: string[] | null;
  payment_methods: string[] | null;
  delivery_fee_cents: number;
  min_order_cents: number;
};

type Line = {
  /**
   * Identidade da linha: produto + escolha de opções.
   *
   * Duas pizzas do mesmo sabor com tamanhos/bordas diferentes são duas
   * linhas, não uma linha de quantidade 2. Sem isso o cliente pedia
   * "média com catupiry" e "grande sem borda" e o carrinho virava um item
   * único com os dois tamanhos e as duas bordas marcados — impossível de
   * produzir na cozinha.
   */
  key: string;
  item: StoreItem;
  quantity: number;
  /** groupId -> valueIds escolhidos (inclui os sabores, que são opções) */
  selection: Record<number, number[]>;
  notes: string;
};

/**
 * Assinatura estável do conjunto de opções — a identidade da linha.
 *
 * A ordem dentro do grupo não conta: escolher "média" e depois "grande" dá a
 * mesma chave que escolher "grande" e depois "média", então o passo de
 * quantidade continua somando na linha certa em vez de criar duplicata. Os
 * sabores entram aqui como qualquer outra opção.
 */
function lineKey(itemId: number, selection: Record<number, number[]>) {
  const grupos = Object.keys(selection)
    .map(Number)
    .sort((a, b) => a - b)
    .map(
      (groupId) =>
        `${groupId}=${[...(selection[groupId] ?? [])]
          .sort((a, b) => a - b)
          .join(".")}`,
    )
    .join("|");
  return `p${itemId}#${grupos}`;
}

const initialState: OrderState = { code: null, error: null, fieldErrors: {} };

/** Aviso efêmero que confirma a entrada do item no carrinho. */
type AddedNotice = {
  /** Sequência: faz a animação reiniciar a cada adição. */
  seq: number;
  name: string;
  detail: string;
  total: number;
};


function deltaLabel(cents: number): string {
  if (!cents) return "";
  return `${cents > 0 ? "+" : "−"}${formatBRL(Math.abs(cents))}`;
}

/** Preço já com os sabores e as opções — mesma conta que a action refaz. */
function unitPrice(line: Line): number {
  return lineUnitPriceCents(line.item, line.selection);
}

function missingChoices(
  item: StoreItem,
  selection: Record<number, number[]>,
) {
  const missing: string[] = [];
  for (const group of item.option_groups) {
    // `is_required` com `min_select = 0` é um grupo que precisa de ao menos
    // uma escolha — o rótulo "obrigatório" já avisa isso na tela. O grupo de
    // sabores cai aqui também: mín 1 obriga escolher ao menos um sabor.
    const minimo = Math.max(group.min_select, group.is_required ? 1 : 0);
    if ((selection[group.id] ?? []).length < minimo) missing.push(group.name);
  }
  return missing;
}

/** Preço de uma escolha ainda no rascunho, para mostrar antes de adicionar. */
function draftPrice(
  item: StoreItem,
  selection: Record<number, number[]>,
): number {
  return lineUnitPriceCents(item, selection);
}

function chosenNames(
  item: StoreItem,
  selection: Record<number, number[]>,
) {
  return item.option_groups.flatMap((group) =>
    (selection[group.id] ?? [])
      .map((id) => group.values.find((value) => value.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
  );
}

/**
 * Rótulo acessível de uma linha do carrinho.
 *
 * Duas linhas podem ser o mesmo sabor com opções diferentes, então "Diminuir
 * Pizza" duas vezes na tela é ambíguo para leitor de tela. Incluir as opções
 * deixa cada botão identificável.
 */
function rotularLinha(name: string, options: string[]) {
  return options.length > 0 ? `${name} (${options.join(", ")})` : name;
}

export function Storefront({
  business,
  sections,
  citySlug,
  timezone,
}: {
  business: StoreBusiness;
  sections: StoreSection[];
  citySlug: string;
  timezone: string;
}) {
  const visible = useMemo(
    () => sections.filter((section) => section.items.length > 0),
    [sections],
  );

  const [lines, setLines] = useState<Line[]>([]);
  /** Escolhas em andamento antes de o item entrar no carrinho. */
  const [drafts, setDrafts] = useState<Record<number, Record<number, number[]>>>(
    {},
  );
  /**
   * Seção destacada no menu de navegação. Não esconde nada: todas as seções
   * ficam na página, o botão só rola até ela. Abas de verdade escondiam 16 dos
   * 19 itens de quem abre a pagina sem JavaScript, e nao davam URL para uma
   * categoria especifica.
   */
  const [activeId, setActiveId] = useState<number | null>(visible[0]?.id ?? null);
  const [customizing, setCustomizing] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [added, setAdded] = useState<AddedNotice | null>(null);
  /** Só para reiniciar a animação a cada adição. */
  const addedSeq = useRef(0);
  /**
   * Item em fase de sucesso dentro do modal: o painel mostra o ✓ animado por
   * um instante e só então fecha, com o toast já aparecendo sobre a barra do
   * carrinho. `successId` separado de `customizing` porque o modal continua
   * aberto (e travado para cliques) durante a animação.
   */
  const [successId, setSuccessId] = useState<number | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    },
    [],
  );

  const customizingItem = useMemo(() => {
    if (customizing === null) return null;
    for (const section of visible) {
      const found = section.items.find((item) => item.id === customizing);
      if (found) return found;
    }
    return null;
  }, [customizing, visible]);

  // O aviso some sozinho: ele confirma, não é um estado que o cliente precise
  // managear. `added` na dependência reinicia o relógio se ele adicionar outro
  // item antes do tempo do primeiro.
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(null), 3800);
    return () => clearTimeout(timer);
  }, [added]);

  // Destaca no menu a secao que esta no topo da tela enquanto o cliente rola.
  useEffect(() => {
    const alvos = visible
      .map((section) => document.getElementById(`secao-${section.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (alvos.length === 0) return;
    const visivel = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          visivel.set(Number(entrada.target.id.replace("secao-", "")), entrada.intersectionRatio);
        }
        const melhor = [...visivel.entries()].sort((a, b) => b[1] - a[1])[0];
        if (melhor && melhor[1] > 0) setActiveId(melhor[0]);
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const alvo of alvos) observer.observe(alvo);
    return () => observer.disconnect();
  }, [visible]);

  const [fulfillment, setFulfillment] = useState(
    () => business.fulfillment?.[0] ?? "",
  );
  const payments = useMemo(
    () => availablePayments(business.payment_methods),
    [business.payment_methods],
  );
  const [payment, setPayment] = useState<string>(() => payments[0]?.enum ?? "");

  const [state, formAction, pending] = useActionState(placeOrder, initialState);

  const totalCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce(
    (sum, line) => sum + unitPrice(line) * line.quantity,
    0,
  );
  const deliveryFee =
    fulfillment === "delivery" ? business.delivery_fee_cents : 0;
  const total = subtotal + deliveryFee;
  const belowMinimum =
    business.min_order_cents > 0 && subtotal < business.min_order_cents;

  // Esvazia o carrinho no mesmo render em que o código do pedido aparece.
  // Ajustar estado durante o render é o padrão da React para "mudei de props,
  // ajuste o estado" — um effect aqui dispararia um segundo render em cascata.
  const [placedCode, setPlacedCode] = useState(state.code);
  if (state.code && state.code !== placedCode) {
    setPlacedCode(state.code);
    setLines([]);
    setDrafts({});
    setCustomizing(null);
    setSuccessId(null);
    setReviewing(false);
  }

  function toggleDraft(item: StoreItem, group: OptionGroup, valueId: number) {
    setDrafts((current) => {
      const forItem = current[item.id] ?? {};
      const ids = forItem[group.id] ?? [];
      const next = ids.includes(valueId)
        ? ids.filter((id) => id !== valueId)
        : ids.length < group.max_select
          ? [...ids, valueId]
          : [valueId];
      return { ...current, [item.id]: { ...forItem, [group.id]: next } };
    });
  }

  function add(item: StoreItem) {
    const selection = drafts[item.id] ?? {};

    // Rede de segurança: item com variação só entra no carrinho depois de
    // escolhida. A UI já esconde o botão, mas `add` é o único portão — se
    // algum caminho novo a chamar, o item não sai incompleto daqui. Os sabores
    // são um grupo de opção (mín 1), então já caem nesta checagem.
    if (missingChoices(item, selection).length > 0) {
      setCustomizing(item.id);
      return;
    }

    const key = lineKey(item.id, selection);
    const igual = lines.find((line) => line.key === key);
    const quantidade = igual ? Math.min(99, igual.quantity + 1) : 1;

    setLines((current) => {
      const found = current.find((line) => line.key === key);
      // Mesma configuração: soma na linha existente. Configuração diferente
      // vira linha nova, e é isso que permite pedir o mesmo tamanho duas vezes
      // com sabores e bordas distintos.
      return found
        ? current.map((line) =>
            line.key === key
              ? { ...line, quantity: Math.min(99, line.quantity + 1) }
              : line,
          )
        : [...current, { key, item, quantity: 1, selection, notes: "" }];
    });

    // Zera o rascunho: o item vai para a barra de carrinho com as opções já
    // registradas, e a próxima vez que o cliente abrir o modal ele monta uma
    // configuração nova do zero.
    setDrafts((current) => {
      const proximo = { ...current };
      delete proximo[item.id];
      return proximo;
    });

    const notice: AddedNotice = {
      seq: addedSeq.current++,
      name: item.name,
      detail: chosenNames(item, selection).join(" · "),
      total: draftPrice(item, selection) * quantidade,
    };

    if (customizing === item.id) {
      // Veio do modal: mostra o ✓ animado dentro do painel, fecha e só então
      // dispara o toast — a sequência "confirma → guarda → some" lê melhor do
      // que modal e aviso aparecendo ao mesmo tempo.
      setSuccessId(item.id);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => {
        setCustomizing(null);
        setSuccessId(null);
        setAdded(notice);
      }, 900);
    } else {
      setCustomizing(null);
      setAdded(notice);
    }
  }

  function changeQuantity(key: string, delta: number) {
    setLines((current) =>
      current
        .map((line) =>
          line.key === key
            ? {
                ...line,
                quantity: Math.max(0, Math.min(99, line.quantity + delta)),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function setNotes(index: number, notes: string) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, notes } : line)),
    );
  }

  /* ------------------------------- confirmação ------------------------------ */

  if (state.code) {
    const message = `Olá! Acabei de fazer o pedido ${state.code} no cardápio de ${business.name}.`;
    const zap = whatsappLink(business.whatsapp, message);

    return (
      <section className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm font-bold text-sucesso-700">Pedido enviado</p>
        <h2 className="mt-2 text-2xl font-black text-marca-800">
          {business.name} recebeu seu pedido
        </h2>
        <p className="mt-3 text-sm text-texto-suave">
          Guarde o código — é por ele que a empresa acompanha o andamento.
        </p>
        <p className="mx-auto mt-4 inline-block rounded-card bg-marca-gradient px-6 py-3 text-xl font-black tracking-widest text-white">
          {state.code}
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {zap ? (
            <a
              href={zap}
              className="inline-flex min-h-11 items-center justify-center rounded-pill border border-borda-forte px-6 text-sm font-bold text-texto-suave hover:border-marca-600"
            >
              Avisar no WhatsApp
            </a>
          ) : null}
          <Link
            href={`/cidades/${citySlug}/empresa/${business.slug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-pill border border-borda-forte px-6 text-sm font-bold text-texto-suave hover:border-marca-600"
          >
            Voltar à empresa
          </Link>
        </div>
      </section>
    );
  }

  /* --------------------------------- revisão --------------------------------- */

  if (reviewing) {
    return (
      <Review
        business={business}
        citySlug={citySlug}
        lines={lines}
        onChangeQuantity={changeQuantity}
        onNotes={setNotes}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        total={total}
        belowMinimum={belowMinimum}
        fulfillment={fulfillment}
        setFulfillment={setFulfillment}
        payments={payments}
        payment={payment}
        setPayment={setPayment}
        state={state}
        pending={pending}
        formAction={formAction}
        onBack={() => setReviewing(false)}
      />
    );
  }

  /* --------------------------------- vitrine --------------------------------- */

  const open = isOpenNow(business.opening_hours, timezone);

  return (
    <div className="pb-28 lg:pb-12">
      <header className="border-b border-borda bg-superficie">
        {business.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.cover_url}
            alt=""
            className="h-36 w-full object-cover sm:h-56"
          />
        ) : null}
        <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-6">
          <div className="flex items-start gap-4">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-logo border-2 border-white object-cover shadow-card sm:h-20 sm:w-20"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black text-marca-800 sm:text-3xl">
                {business.name}
              </h1>
              {business.neighborhood || business.address ? (
                <p className="mt-1 text-sm text-texto-suave">
                  {[business.neighborhood, business.address]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-1 font-bold",
                    open ? "bg-sucesso/10 text-sucesso-700" : "bg-erro/10 text-erro-700",
                  )}
                >
                  {open ? "Aberto agora" : "Fechado agora"}
                </span>
                {business.phone ? (
                  <span className="text-texto-tenue">
                    {formatPhone(business.phone)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {business.description ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-texto-suave">
              {business.description}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Seções do cardápio"
        // O `SiteHeader` é `sticky top-0` com h-16. Sem o `top-16` aqui, o
        // menu de seções grudava em 0 por baixo do header e sumia da tela ao
        // rolar — o cliente tinha que voltar ao topo para trocar de categoria.
        className="sticky top-16 z-20 border-b border-borda bg-white/95 backdrop-blur"
      >
        <ul className="no-scrollbar mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-4 lg:px-6">
          {visible.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveId(section.id);
                  document
                    .getElementById(`secao-${section.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-current={activeId === section.id ? "true" : undefined}
                className={cn(
                  "min-h-12 shrink-0 border-b-2 px-4 text-sm font-bold transition-colors",
                  activeId === section.id
                    ? "border-destaque-500 text-marca-800"
                    : "border-transparent text-texto-suave hover:text-marca-800",
                )}
              >
                {section.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-6">
        {visible.length === 0 ? (
          <p className="rounded-card border border-dashed border-borda-forte bg-white p-10 text-center text-sm text-texto-suave">
            Esta empresa ainda não publicou itens no cardápio.
          </p>
        ) : (
          <div className="space-y-10">
            {visible.map((section) => (
              <section
                key={section.id}
                id={`secao-${section.id}`}
                aria-labelledby={`titulo-${section.id}`}
                // 4rem do header fixo + ~3rem deste menu de seções: sem isso o
                // título da seção fica escondido atrás das duas barras ao
                // pular para uma categoria.
                className="scroll-mt-28"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2
                    id={`titulo-${section.id}`}
                    className="text-lg font-black text-marca-800"
                  >
                    {section.name}
                  </h2>
                  <span className="text-xs text-texto-tenue">
                    {section.items.length}{" "}
                    {section.items.length === 1 ? "item" : "itens"}
                  </span>
                </div>
                {section.description ? (
                  <p className="mt-1 text-sm text-texto-suave">
                    {section.description}
                  </p>
                ) : null}

                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {section.items.map((item) => {
                    // O mesmo tamanho pode estar em várias linhas do carrinho,
                    // cada uma com uma configuração de opções diferente.
                    const doItem = lines.filter(
                      (line) => line.item.id === item.id,
                    );
                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        count={doItem.reduce((s, l) => s + l.quantity, 0)}
                        variantKeys={doItem.map((line) => line.key)}
                        onOpen={() => setCustomizing(item.id)}
                        onAdd={() => add(item)}
                        onQuantity={(key, delta) => changeQuantity(key, delta)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {totalCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-white p-3 shadow-card">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-texto-suave">
                {totalCount} {totalCount === 1 ? "item" : "itens"}
              </p>
              <p className="text-lg font-black text-marca-800">
                {formatBRL(subtotal)}
              </p>
            </div>
            {/* A `key` troca a cada adição, o que reinicia a animação do pulso
                e faz o olho ir do aviso para o botão de revisão. */}
            <button
              key={added?.seq ?? 0}
              type="button"
              onClick={() => setReviewing(true)}
              className={cn(
                "min-h-12 shrink-0 rounded-pill bg-marca-gradient px-7 text-sm font-bold text-white transition-opacity hover:opacity-90",
                added && "animate-carrinho-pulso",
              )}
            >
              Revisar pedido
            </button>
          </div>
        </div>
      ) : null}

      {customizingItem ? (
        <ItemModal
          item={customizingItem}
          selection={drafts[customizingItem.id] ?? {}}
          variantKeys={lines
            .filter((line) => line.item.id === customizingItem.id)
            .map((line) => line.key)}
          success={successId === customizingItem.id}
          onClose={() => setCustomizing(null)}
          onSelect={(group, valueId) =>
            toggleDraft(customizingItem, group, valueId)
          }
          onAdd={() => add(customizingItem)}
        />
      ) : null}

      {/*
        Confirmação de que o item entrou no carrinho. Aparece acima da barra
        para não cobrir o total, e some sozinho: quem precisa da verdade é o
        cliente, não o estado da tela.
      */}
      {added ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-24 z-40 px-4 lg:bottom-28"
          role="status"
          aria-live="polite"
        >
          <div className="animate-aviso-entra pointer-events-auto mx-auto flex w-full max-w-4xl items-start gap-3 rounded-card border border-sucesso/30 bg-white p-3 shadow-media">
            <span className="animate-check-pop grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sucesso-700 text-base font-black text-white">
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-texto-forte">
                {added.name} no carrinho
              </p>
              {added.detail ? (
                <p className="truncate text-xs text-texto-suave">
                  {added.detail}
                </p>
              ) : null}
            </div>
            <p className="shrink-0 text-sm font-black text-marca-800">
              {formatBRL(added.total)}
            </p>
            <button
              type="button"
              onClick={() => setAdded(null)}
              aria-label="Fechar aviso"
              className="-mr-1 shrink-0 rounded-pill px-2 py-1 text-lg leading-none text-texto-tenue hover:text-texto-forte"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ItemCard({
  item,
  count,
  variantKeys,
  onOpen,
  onAdd,
  onQuantity,
}: {
  item: StoreItem;
  /** Quantas unidades deste produto estão no carrinho, somando as linhas. */
  count: number;
  /**
   * Chaves das linhas deste produto. Mais de uma significa configurações
   * diferentes (sabores, borda) do mesmo tamanho já no carrinho.
   */
  variantKeys: string[];
  onOpen: () => void;
  onAdd: () => void;
  onQuantity: (key: string, delta: number) => void;
}) {
  const onSale = item.compare_at_cents > item.price_cents;
  const hasOptions = item.option_groups.length > 0;
  // Só dá para ajustar quantidade no card quando há uma única linha: com duas
  // ou mais, quem manda é a revisão, linha a linha.
  const unica = variantKeys.length === 1 ? variantKeys[0] : null;
  // Produto de tamanho mostra "a partir de" (o sabor mais barato); os demais
  // mostram o preço cheio.
  const temSabores = flavorGroupOf(item) !== null;
  const precoExibido = fromPriceCents(item);

  return (
    <li className="overflow-hidden rounded-card border border-borda bg-white shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-texto-forte">
            {item.name}
            {item.is_featured ? (
              <span className="rounded-pill bg-destaque-500/25 px-2 py-0.5 text-xs font-bold text-marca-800">
                destaque
              </span>
            ) : null}
          </p>
          {item.description ? (
            <p className="mt-1 text-xs leading-relaxed text-texto-suave">
              {item.description}
            </p>
          ) : null}

          <p className="mt-2 flex flex-wrap items-baseline gap-2">
            {onSale ? (
              <span className="text-xs font-semibold text-texto-tenue line-through">
                {formatBRL(item.compare_at_cents)}
              </span>
            ) : null}
            {temSabores ? (
              <span className="text-xs font-semibold text-texto-suave">
                a partir de
              </span>
            ) : null}
            <span
              className={cn(
                "text-lg font-black",
                onSale ? "text-sucesso-700" : "text-marca-800",
              )}
            >
              {formatBRL(precoExibido)}
            </span>
          </p>

          {/*
            Produto com variação NÃO tem botão "Adicionar" aqui. Escolher
            sabores/borda/extras é parte do pedido, não um extra opcional —
            deixar o botão direto permitia entrar no carrinho incompleto e o
            cliente só descobria o que faltou na revisão. O caminho é o modal
            de personalização e, dentro dele, o botão de adicionar.
          */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasOptions ? (
              <>
                <button
                  type="button"
                  onClick={onOpen}
                  className="min-h-10 rounded-pill bg-marca-gradient px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  {temSabores ? "Escolher sabores" : "Personalizar"}
                </button>

                {/* Duas ou mais configurações deste produto já no carrinho: um
                    único botão de quantidade aqui seria ambíguo, porque cada
                    linha tem sabores e borda diferentes. A contagem informa o
                    total e a revisão ajusta linha a linha. */}
                {variantKeys.length > 1 ? (
                  <span className="rounded-pill bg-marca-100 px-3 py-1.5 text-xs font-bold text-marca-800">
                    {count} no carrinho
                  </span>
                ) : unica ? (
                  <Stepper
                    quantity={count}
                    name={item.name}
                    onChange={(delta) => onQuantity(unica, delta)}
                  />
                ) : null}
              </>
            ) : count > 0 && unica ? (
              <Stepper
                quantity={count}
                name={item.name}
                onChange={(delta) => onQuantity(unica, delta)}
              />
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="min-h-10 rounded-pill bg-marca-gradient px-5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                Adicionar
              </button>
            )}
          </div>
        </div>

        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-24 w-24 shrink-0 self-start rounded-logo object-cover sm:h-28 sm:w-28"
          />
        ) : null}
      </div>
    </li>
  );
}

/**
 * Modal de personalização do produto — o foco do pedido fica inteiro no item.
 *
 * Bottom-sheet que sobe da borda no celular e diálogo centralizado com pop no
 * desktop (variantes `sm:` trocam a animação). Escape, clique no fundo e o ×
 * fecham; Tab cicla dentro do painel para o teclado não "vazar" para a página
 * atrás. Depois de adicionar, o painel mostra o ✓ animado por um instante e
 * fecha, passando o bastão para o toast acima da barra do carrinho.
 */
function ItemModal({
  item,
  selection,
  variantKeys,
  success,
  onClose,
  onSelect,
  onAdd,
}: {
  item: StoreItem;
  selection: Record<number, number[]>;
  variantKeys: string[];
  /** Fase de sucesso: o item já entrou e o painel anima a confirmação. */
  success: boolean;
  onClose: () => void;
  onSelect: (group: OptionGroup, valueId: number) => void;
  onAdd: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Refs em vez de dependências: `onClose` chega como arrow nova a cada render
  // do pai, e um effect que roda de novo a cada render roubava o foco e
  // re-travava o scroll sem parar. A sincronização mora num effect próprio
  // porque atualizar ref durante o render viola `react-hooks/refs`.
  const closeRef = useRef(onClose);
  const successRef = useRef(success);
  useEffect(() => {
    closeRef.current = onClose;
    successRef.current = success;
  });

  const missing = missingChoices(item, selection);
  const pronto = missing.length === 0;
  // Se a configuração da tela já está no carrinho, o botão soma unidade numa
  // linha existente em vez de criar outra.
  const repetindo = variantKeys.includes(lineKey(item.id, selection));
  const temSabores = flavorGroupOf(item) !== null;

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!successRef.current) closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focaveis = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div
        className="animate-fundo-entra absolute inset-0 bg-marca-950/60"
        onClick={() => {
          if (!success) onClose();
        }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-modal-sobe absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-media bg-white shadow-media outline-none sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:max-w-lg sm:animate-modal-pop sm:rounded-media"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-borda p-4">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-logo object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-base font-black text-marca-800">
              {item.name}
              {item.is_featured ? (
                <span className="rounded-pill bg-destaque-500/25 px-2 py-0.5 text-xs font-bold text-marca-800">
                  destaque
                </span>
              ) : null}
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2">
              {temSabores ? (
                <span className="text-xs font-semibold text-texto-suave">
                  a partir de
                </span>
              ) : null}
              <span className="text-lg font-black text-marca-800">
                {formatBRL(fromPriceCents(item))}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!success) onClose();
            }}
            aria-label="Fechar"
            disabled={success}
            className="-mr-1 shrink-0 rounded-pill px-2 py-1 text-2xl leading-none text-texto-tenue hover:text-texto-forte disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-superficie p-4">
          {item.option_groups.map((group) => {
            const ids = selection[group.id] ?? [];
            const falta = missing.includes(group.name);
            // No grupo de sabores cada valor mostra o PREÇO CHEIO daquele
            // sabor (não um acréscimo), e a pizza cobra o mais caro entre os
            // escolhidos. Nos demais grupos o valor é um acréscimo (+R$ …).
            const sabores = group.is_flavor_group;
            // Grupo com foto vira lista de linhas — uma opção por linha, com a
            // imagem grande. Grupo só de texto continua em pílulas compactas,
            // que cabem mais na tela (borda e extras costumam ter 4+ valores).
            const temFoto = group.values.some((value) => value.image_url);
            return (
              <fieldset key={group.id}>
                <legend className="text-xs font-bold text-texto-forte">
                  {group.name}
                  {group.is_required ? (
                    <span className="ml-1 text-erro-700">obrigatório</span>
                  ) : group.min_select > 0 ? (
                    <span className="ml-1 font-normal text-texto-tenue">
                      escolha {group.min_select} a {group.max_select}
                    </span>
                  ) : (
                    <span className="ml-1 font-normal text-texto-tenue">
                      até {group.max_select}
                    </span>
                  )}
                  {sabores ? (
                    <span className="ml-1 font-normal text-marca-600">
                      · paga o mais caro
                    </span>
                  ) : null}
                </legend>
                <ul className={temFoto ? "mt-2 space-y-2" : "mt-2 flex flex-wrap gap-2"}>
                  {group.values.map((value) => {
                    const marcado = ids.includes(value.id);
                    return (
                      <li key={value.id} className={temFoto ? "w-full" : undefined}>
                        <button
                          type="button"
                          onClick={() => onSelect(group, value.id)}
                          aria-pressed={marcado}
                          className={cn(
                            "text-xs font-semibold transition-colors",
                            temFoto
                              ? cn(
                                  "flex w-full items-center gap-3 rounded-logo border p-2 text-left",
                                  // Altura igual para linha com foto e sem foto,
                                  // senão o nome pulava ao passar pelos sabores.
                                  "min-h-16",
                                  marcado && "ring-2 ring-marca-600",
                                )
                              : "min-h-9 rounded-pill border px-4",
                            marcado
                              ? "border-marca-600 bg-marca-600 text-white"
                              : cn(
                                  "border-borda-forte bg-white text-texto-forte hover:border-marca-600",
                                  falta && "border-erro/50",
                                ),
                          )}
                        >
                          {value.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={value.image_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className={cn(
                                "h-12 w-12 shrink-0 rounded-logo object-cover sm:h-14 sm:w-14",
                                marcado ? "ring-1 ring-white/50" : "ring-1 ring-borda",
                              )}
                            />
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className={cn(temFoto && "block text-sm")}>{value.name}</span>
                            {sabores ? (
                              <span
                                className={cn(
                                  marcado ? "text-white/80" : "text-marca-600",
                                  temFoto ? "block" : "ml-1",
                                )}
                              >
                                {formatBRL(value.price_delta_cents)}
                              </span>
                            ) : value.price_delta_cents ? (
                              <span
                                className={cn(
                                  marcado ? "text-white/80" : "text-marca-600",
                                  temFoto ? "block" : "ml-1",
                                )}
                              >
                                {deltaLabel(value.price_delta_cents)}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            );
          })}
        </div>

        <div className="shrink-0 space-y-2 border-t border-borda bg-white p-4">
          {missing.length > 0 ? (
            <p role="status" className="text-xs font-bold text-erro-700">
              Escolha {missing.join(" e ")} para continuar.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            disabled={!pronto}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {repetindo ? "Adicionar mais" : "Adicionar ao carrinho"}
            <span aria-hidden className="font-black">
              {formatBRL(draftPrice(item, selection))}
            </span>
          </button>
        </div>

        {success ? (
          <div className="absolute inset-0 grid place-items-center rounded-t-media bg-white sm:rounded-media">
            <div className="flex flex-col items-center gap-1 px-6 text-center">
              <span className="animate-check-pop grid h-16 w-16 place-items-center rounded-full bg-sucesso-700 text-3xl font-black text-white">
                ✓
              </span>
              <p className="mt-2 text-sm font-black text-texto-forte">
                Adicionado ao carrinho
              </p>
              <p className="max-w-64 truncate text-xs text-texto-suave">
                {item.name}
                {chosenNames(item, selection).length > 0
                  ? ` · ${chosenNames(item, selection).join(" · ")}`
                  : ""}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Passo de quantidade. Extraído porque aparece em dois ramos do `ItemCard`. */
function Stepper({
  quantity,
  name,
  onChange,
}: {
  quantity: number;
  name: string;
  onChange: (delta: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-marca-600 bg-marca-100">
      <button
        type="button"
        onClick={() => onChange(-1)}
        aria-label={`Diminuir ${name}`}
        className="min-h-10 min-w-9 px-2 text-base font-bold text-marca-800"
      >
        −
      </button>
      <span className="min-w-4 text-center text-sm font-black text-marca-800">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label={`Aumentar ${name}`}
        className="min-h-10 min-w-9 px-2 text-base font-bold text-marca-800"
      >
        +
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */

function Review({
  business,
  citySlug,
  lines,
  onChangeQuantity,
  onNotes,
  subtotal,
  deliveryFee,
  total,
  belowMinimum,
  fulfillment,
  setFulfillment,
  payments,
  payment,
  setPayment,
  state,
  pending,
  formAction,
  onBack,
}: {
  business: StoreBusiness;
  citySlug: string;
  lines: Line[];
  onChangeQuantity: (key: string, delta: number) => void;
  onNotes: (index: number, notes: string) => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  belowMinimum: boolean;
  fulfillment: string;
  setFulfillment: (value: string) => void;
  payments: ReturnType<typeof availablePayments>;
  payment: string;
  setPayment: (value: string) => void;
  state: OrderState;
  pending: boolean;
  formAction: (formData: FormData) => void;
  onBack: () => void;
}) {
  const [ack, setAck] = useState(false);
  const modes = business.fulfillment ?? [];
  // O mínimo da empresa é sobre os itens, nunca sobre o total: a taxa de
  // entrega entra na conta só na hora de pagar. Sem essa distinção o cliente
  // vê "Total R$ 20,00" e "mínimo R$ 20,00" e não entende o bloqueio.
  const faltando = Math.max(0, business.min_order_cents - subtotal);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-texto-suave hover:text-marca-800"
      >
        ← Voltar ao cardápio
      </button>
      <h1 className="mt-3 text-2xl font-black text-marca-800">
        Revisar pedido
      </h1>

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-card border border-erro/30 bg-erro/5 px-4 py-3 text-sm font-semibold text-erro-700"
        >
          {state.error}
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {lines.map((line, index) => {
          const unit = unitPrice(line);
          const missing = missingChoices(line.item, line.selection);
          const names = chosenNames(line.item, line.selection);

          return (
            <li
              key={line.key}
              className="rounded-card border border-borda bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-texto-forte">
                    {line.item.name}
                  </p>
                  {names.length > 0 ? (
                    <p className="mt-0.5 text-xs text-texto-suave">
                      {names.join(" · ")}
                    </p>
                  ) : null}
                  {missing.length > 0 ? (
                    <p role="alert" className="mt-1 text-xs font-bold text-erro-700">
                      Falta escolher: {missing.join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-pill border border-borda-forte">
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(line.key, -1)}
                      aria-label={`Diminuir ${rotularLinha(line.item.name, names)}`}
                      className="min-h-9 min-w-8 px-1 text-base font-bold text-texto-forte"
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center text-sm font-black">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(line.key, 1)}
                      aria-label={`Aumentar ${rotularLinha(line.item.name, names)}`}
                      className="min-h-9 min-w-8 px-1 text-base font-bold text-texto-forte"
                    >
                      +
                    </button>
                  </span>
                  <p className="w-20 text-right text-sm font-black text-marca-800">
                    {formatBRL(unit * line.quantity)}
                  </p>
                </div>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-texto-forte">
                  Observação (opcional)
                </span>
                <input
                  value={line.notes}
                  maxLength={200}
                  onChange={(event) => onNotes(index, event.target.value)}
                  className="min-h-10 w-full rounded-logo border border-borda bg-white px-3 text-sm focus:border-marca-600"
                  placeholder="Sem cebola, bem passada…"
                />
              </label>
            </li>
          );
        })}
      </ul>

      <dl className="mt-6 space-y-1.5 border-t border-borda pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-texto-suave">Subtotal</dt>
          <dd className="font-semibold">{formatBRL(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-suave">
            {fulfillment === "delivery" ? "Taxa de entrega" : "Retirada no local"}
          </dt>
          <dd className="font-semibold">
            {deliveryFee ? formatBRL(deliveryFee) : "grátis"}
          </dd>
        </div>
        <div className="flex justify-between border-t border-borda pt-2 text-base">
          <dt className="font-black text-marca-800">Total</dt>
          <dd className="font-black text-marca-800">{formatBRL(total)}</dd>
        </div>
      </dl>

      {modes.length === 0 ? (
        <p
          role="alert"
          className="mt-6 rounded-card border border-aviso/40 bg-aviso/5 px-4 py-3 text-sm font-semibold text-texto-forte"
        >
          {business.name} não informed como os pedidos são entregues. Fale com a
          empresa.
        </p>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="businessId" value={business.id} />
          <input type="hidden" name="fulfillment" value={fulfillment} />
          <input type="hidden" name="paymentMethod" value={payment} />
          <input
            type="hidden"
            name="lines"
            value={JSON.stringify(
              lines.map((line) => ({
                productId: line.item.id,
                quantity: line.quantity,
                optionValueIds: Object.values(line.selection).flat(),
                notes: line.notes,
              })),
            )}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-texto-forte">
              Como você quer receber?
            </legend>
            <div className="flex flex-wrap gap-2">
              {modes.map((mode) => (
                <Choice
                  key={mode}
                  active={fulfillment === mode}
                  onClick={() => setFulfillment(mode)}
                >
                  {mode === "delivery" ? "Delivery" : "Retirar no local"}
                </Choice>
              ))}
            </div>
          </fieldset>

          {fulfillment === "delivery" ? (
            <Field
              name="address"
              label="Endereço de entrega"
              error={state.fieldErrors.address}
              placeholder="Rua, número, bairro, complemento"
              required
            />
          ) : null}

          <Field
            name="customerName"
            label="Seu nome"
            error={state.fieldErrors.customerName}
            required
          />
          <Field
            name="customerPhone"
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            error={state.fieldErrors.customerPhone}
            placeholder="(00) 00000-0000"
            required
          />
          <Field
            name="customerEmail"
            label="E-mail (opcional)"
            type="email"
            inputMode="email"
            error={state.fieldErrors.customerEmail}
          />

          {payments.length > 0 ? (
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-texto-forte">
                Forma de pagamento
              </legend>
              <div className="flex flex-wrap gap-2">
                {payments.map((method) => (
                  <Choice
                    key={method.enum}
                    active={payment === method.enum}
                    onClick={() => setPayment(method.enum)}
                  >
                    {method.label}
                  </Choice>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-texto-forte">
              Observação do pedido (opcional)
            </span>
            <textarea
              name="notes"
              rows={2}
              maxLength={500}
              className="min-h-10 w-full rounded-logo border border-borda bg-white px-3 py-2 text-sm focus:border-marca-600"
              placeholder="Tocar o interfone, talheres a mais…"
            />
          </label>

          {belowMinimum ? (
            <p
              role="alert"
              className="rounded-card border border-aviso/40 bg-aviso/5 px-4 py-3 text-sm font-semibold text-texto-forte"
            >
              O pedido mínimo é de {formatBRL(business.min_order_cents)} em
              itens. Faltam {formatBRL(faltando)} — a taxa de entrega não conta
              para o mínimo.
            </p>
          ) : null}

          <label
            className={cn(
              "flex items-start gap-2 text-sm text-texto-forte",
              belowMinimum ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            <input
              type="checkbox"
              checked={ack}
              disabled={belowMinimum}
              onChange={(event) => setAck(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-marca-800"
            />
            Confirmo que revisei os itens e as escolhas.
          </label>

          <button
            type="submit"
            disabled={pending || belowMinimum || !ack}
            className="w-full rounded-pill bg-marca-gradient px-6 py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending
              ? "Enviando…"
              : belowMinimum
                ? `Faltam ${formatBRL(faltando)} para finalizar`
                : `Finalizar pedido · ${formatBRL(total)}`}
          </button>

          {state.fieldErrors.lines ? (
            <p role="alert" className="text-xs font-semibold text-erro-700">
              {state.fieldErrors.lines}
            </p>
          ) : null}
        </form>
      )}

      <p className="mt-6 text-center text-xs text-texto-tenue">
        Ao finalizar, o pedido vai para{" "}
        <Link
          href={`/cidades/${citySlug}/empresa/${business.slug}`}
          className="underline"
        >
          {business.name}
        </Link>{" "}
        confirmar.
      </p>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-pill border px-5 text-sm font-semibold transition-colors",
        active
          ? "border-marca-600 bg-marca-100 text-marca-800"
          : "border-borda-forte text-texto-suave hover:border-marca-600",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  name,
  label,
  error,
  type = "text",
  required,
  placeholder,
  inputMode,
}: {
  name: string;
  label: string;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "tel" | "email" | "text";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-texto-forte">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        className="min-h-11 w-full rounded-logo border border-borda bg-white px-3 text-sm text-texto-forte focus:border-marca-600"
      />
      {error ? (
        <span
          role="alert"
          className="mt-1 block text-xs font-semibold text-erro-700"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
