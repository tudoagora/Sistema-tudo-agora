/**
 * Precificação por tamanho: o produto é o tamanho, os sabores são opções.
 *
 * Este módulo é a fonte única da regra. A vitrine (`storefront.tsx`) usa para
 * mostrar o preço antes de o cliente confirmar, e o `placeOrder` usa para
 * recalcular do zero — porque o payload do navegador não é fronteira de
 * confiança, como o resto do `placeOrder` já assume. Se as duas contas
 * divergirem, o cliente vê um total e paga outro.
 *
 * A regra (grupos com `is_flavor_group`):
 *
 *   • O `price_delta_cents` de cada valor é o PREÇO CHEIO daquele sabor
 *     naquele tamanho (o nome da coluna é histórico; para sabor é preço).
 *   • A pizza cobra o SABOR MAIS CARO entre os escolhidos — não a soma.
 *     "Meio a meio Margherita + Quatro Queijos" custa o Quatro Queijos.
 *   • Os demais grupos (borda, extras, molho) somam seus deltas por cima,
 *     como sempre foi.
 *
 * Produto SEM grupo de sabores (uma Coca-Cola, uma porção) precifica como
 * antes: preço do produto + soma dos deltas escolhidos. Nada muda para eles.
 *
 * As funções aceitam `PriceItemLike` em vez de `MenuItem`/`StoreItem` de
 * propósito: a vitrine tem um tipo próprio, mais estreito, e amarrar este
 * módulo a um dos dois obrigaria o outro a virar cast. O que o módulo precisa
 * saber está listado abaixo, e é o mesmo que a RPC devolve.
 */

export type PriceValue = {
  id: number;
  name: string;
  price_delta_cents: number;
};

export type PriceGroup = {
  id: number;
  name: string;
  /** `true` só no grupo "Sabores": preço cheio, combinado pelo mais caro. */
  is_flavor_group: boolean;
  values: PriceValue[];
};

export type PriceItemLike = {
  id: number;
  name: string;
  price_cents: number;
  option_groups: PriceGroup[];
};

/** O grupo de sabores do item (o único com `is_flavor_group`), ou `null`. */
export function flavorGroupOf(item: PriceItemLike): PriceGroup | null {
  return item.option_groups.find((group) => group.is_flavor_group) ?? null;
}

/**
 * Preço da unidade com os sabores e os acréscimos aplicados.
 *
 * Base = o sabor mais caro entre os escolhidos (ou o preço do produto, quando
 * não há grupo de sabores ou nenhum sabor foi marcado — rede de segurança para
 * nunca devolver pizza de graça). Por cima entram os deltas dos grupos que não
 * são de sabor. O delta dos sabores NÃO entra na soma: o preço do sabor já é a
 * base, somar de novo contaria o sabor duas vezes.
 */
export function lineUnitPriceCents(
  item: PriceItemLike,
  selection: Record<number, number[]>,
): number {
  const chosen = new Set(Object.values(selection).flat());
  const flavorGroup = flavorGroupOf(item);

  let base = item.price_cents;
  if (flavorGroup) {
    const precos = (selection[flavorGroup.id] ?? [])
      .map((id) => flavorGroup.values.find((value) => value.id === id))
      .filter((value): value is PriceValue => Boolean(value))
      .map((value) => value.price_delta_cents);
    // Sem sabor escolhido a base fica no preço do produto; com ao menos um,
    // vence o mais caro.
    if (precos.length > 0) base = Math.max(...precos);
  }

  const acréscimos = item.option_groups
    .filter((group) => !group.is_flavor_group)
    .flatMap((group) => group.values)
    .filter((value) => chosen.has(value.id))
    .reduce((sum, value) => sum + value.price_delta_cents, 0);

  return Math.max(0, base + acréscimos);
}

/**
 * Preço "a partir de" para o card do produto.
 *
 * Num produto de tamanho o que o cliente vê na vitrine é o menor preço entre os
 * sabores daquele tamanho — "PIZZA GRANDE a partir de R$ 80,00" —, porque o
 * preço final depende do sabor. Sem grupo de sabores, é o preço do produto.
 */
export function fromPriceCents(item: PriceItemLike): number {
  const flavorGroup = flavorGroupOf(item);
  if (!flavorGroup || flavorGroup.values.length === 0) return item.price_cents;
  return Math.min(...flavorGroup.values.map((value) => value.price_delta_cents));
}
