/**
 * Meio a meio: um item é metade de outro, não uma opção dele.
 *
 * Este módulo é a fonte única da regra. A vitrine (`storefront.tsx`) usa para
 * mostrar o preço antes de o cliente confirmar, e o `placeOrder` usa para
 * recalcular do zero — porque o payload do navegador não é fronteira de
 * confiança, como o resto de `placeOrder` já assume. Se as duas contas
 * divergirem, o cliente vê um total e paga outro.
 *
 * A metade é só o sabor. Tamanho, borda e extras são escolhidos uma vez para o
 * item inteiro, então a metade não precisa ter os mesmos grupos de opção da
 * base — se exigisse, "meio a meio Margherita + Quatro Queijos" seria impossível
 * justamente nas duas pizzas que mais se combinam.
 *
 * As funções aceitam `HalfItemLike` em vez de `MenuItem`/`StoreItem` de
 * propósito: a vitrine tem um tipo próprio, mais estreito, e amarrar este
 * módulo a um dos dois obrigaria o outro a virar cast. O que o módulo precisa
 * saber está listado abaixo, e é o mesmo que a RPC devolve.
 */

export type HalfItemLike = {
  id: number;
  name: string;
  price_cents: number;
  /** `null` = item sem seção. Só item com seção tem metade. */
  menu_category_id: number | null;
  option_groups: {
    values: {
      id: number;
      name: string;
      price_delta_cents: number;
      halves_count: number;
    }[];
  }[];
};

/**
 * Quantas metades a escolha atual exige, ou `0` para pizza inteira.
 *
 * Se o cliente marcou dois valores que disparam metade (o grupo "Quantidade de
 * Sabores" tem `max_select = 2`, então "1 Sabor" + "2 Sabores" dá para acontecer),
 * vence o maior. A vitrine mostra os dois selecionados e o cliente se corrige;
 * recusar aqui só produziria erro de validação em cima de algo que a tela
 * deixou passar.
 */
export function halvesRequirement(
  item: HalfItemLike,
  selection: Record<number, number[]>,
): number {
  const chosen = new Set(Object.values(selection).flat());
  let maior = 0;
  for (const value of allValues(item)) {
    if (chosen.has(value.id) && value.halves_count > maior) {
      maior = value.halves_count;
    }
  }
  return maior;
}

/**
 * Quem pode entrar como metade deste item: mesma seção, disponível, e não o
 * próprio item.
 *
 * Mesma seção é o que impede "meio a meio Coca-Cola". `is_available` já vem
 * garantido pela RPC, mas a checagem é repetida em `placeOrder` porque lá a
 * lista vem do mesmo filtro — se um dia a RPC mudar, a validação do servidor
 * continua valendo sem depender disso.
 */
export function eligibleHalves<T extends HalfItemLike>(
  item: T,
  items: readonly T[],
): T[] {
  if (item.menu_category_id === null) return [];
  return items.filter(
    (other) =>
      other.id !== item.id &&
      other.menu_category_id === item.menu_category_id,
  );
}

/**
 * Preço da unidade com as metades já aplicadas.
 *
 * Regra do mercado: paga o sabor mais caro, não a soma. "Meio a meio Margherita
 * + Quatro Queijos" custa o preço do Quatro Queijos — o cliente não espera
 * pagar 45 + 55 por uma pizza de 55, e a pizzaria não quer explicar isso.
 *
 * O `delta` das opções (tamanho, borda, extras) entra por cima porque é
 * acréscimo sobre a pizza escolhida. O delta dos valores que disparam metade
 * fica de fora de propósito: o preço da metade já entrou no `Math.max`, e somar
 * os dois contaria o sabor duas vezes.
 */
export function lineUnitPriceCents(
  item: HalfItemLike,
  selection: Record<number, number[]>,
  metades: readonly number[],
  porId: ReadonlyMap<number, HalfItemLike>,
): number {
  const chosen = new Set(Object.values(selection).flat());
  const delta = allValues(item)
    .filter((value) => chosen.has(value.id) && value.halves_count === 0)
    .reduce((sum, value) => sum + value.price_delta_cents, 0);

  const precos = [item.price_cents];
  for (const id of metades) {
    const metade = porId.get(id);
    if (metade) precos.push(metade.price_cents);
  }

  return Math.max(0, Math.max(...precos) + delta);
}

/**
 * Rótulo das metades para a lista do carrinho e para a tela do lojista.
 *
 * "Meio a meio: Calabresa / Quatro Queijos" é o que a cozinha lê. O nome do
 * produto base já está no cabeçalho da linha, então repetir aqui só gastaria
 * espaço.
 */
export function halvesLabel(
  metades: readonly number[],
  porId: ReadonlyMap<number, HalfItemLike>,
): string {
  const nomes = metades
    .map((id) => porId.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  if (nomes.length === 0) return "";
  return `Meio a meio: ${nomes.join(" / ")}`;
}

function allValues(item: HalfItemLike) {
  return item.option_groups.flatMap((group) => group.values);
}
