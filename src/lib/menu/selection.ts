/**
 * Regras de escolha de opções na vitrine, compartilhadas pelos dois componentes
 * que deixam o cliente montar o pedido: o `Storefront` (carrinho de verdade, em
 * `/cardapio/[slug]`) e o `MenuList` (prévia na página da empresa).
 *
 * Ficou num módulo só porque as duas telas montam a mesma estrutura — um grupo de
 * valores com mínimo e máximo — e jáivalsaram por implementações diferentes:
 * uma trocava a seleção inteira quando o grupo enchia, a outra mantinha uma
 * janela móvel. Com a regra aqui, tocar num valor que não cabe mais se comporta
 * igual nas duas.
 *
 * `groupId -> valueIds escolhidos` é o formato que o `pricing.ts` e o
 * `placeOrder` esperam, então a seleção sai daqui no formato final, sem
 * conversão nos dois lados.
 */

export type Selection = Record<number, number[]>;

/** O grupo tem `is_flavor_group`? Não precisa saber disso aqui. */
export type SelectableGroup = {
  id: number;
  min_select: number;
  max_select: number;
  is_required: boolean;
};

/**
 * Quantas escolhas o grupo exige no mínimo.
 *
 * `is_required` com `min_select = 0` é um grupo que precisa de ao menos uma
 * escolha — o rótulo "obrigatório" já avisa isso na tela. O grupo de sabores cai
 * aqui também, e é onde o `min_select` > 1 entra: meio a meio com `min_select` 2
 * exige dois sabores.
 */
export function minimoDe(group: SelectableGroup): number {
  return Math.max(group.min_select, group.is_required ? 1 : 0);
}

/** O grupo já está no limite de escolhas? */
export function grupoCheio(
  group: SelectableGroup,
  selection: Selection,
): boolean {
  return (selection[group.id] ?? []).length >= group.max_select;
}

/** Quantas escolhas ainda faltam no grupo (0 quando já cumpre o mínimo). */
export function quantosFaltam(
  group: SelectableGroup,
  selection: Selection,
): number {
  return Math.max(0, minimoDe(group) - (selection[group.id] ?? []).length);
}

/** Ids dos grupos com escolha insuficiente. */
export function gruposIncompletos(
  groups: SelectableGroup[],
  selection: Selection,
): number[] {
  return groups.filter((group) => quantosFaltam(group, selection) > 0).map(
    (group) => group.id,
  );
}

/**
 * Marca ou desmarca um valor dentro das ids já escolhidas do grupo.
 *
 * Devolve o MESMO array quando nada muda (grupo cheio e valor não marcado).
 * Quem chama compara por referência para não recriar estado à toa.
 *
 * Grupo cheio não aceita valor novo, mas o que já estava escolhido continua
 * intacto: antes, marcar um valor novo com o grupo cheio devolvia `[valueId]` e
 * jogava fora as escolhas anteriores. Num "escolha 2 de 2" o cliente tocava num
 * terceiro sabor e perdia os dois primeiros sem aviso nenhum — e, com o mínimo
 * em 2, ainda ficava com o grupo inválido.
 *
 * Quem quer trocar uma escolha marca um valor que já estava escolhido: aí o
 * primeiro ramo desmarca, sobrando vaga para o próximo toque.
 */
export function toggleValue(
  atual: number[],
  group: SelectableGroup,
  valueId: number,
): number[] {
  if (atual.includes(valueId)) {
    return atual.filter((id) => id !== valueId);
  }
  if (atual.length >= group.max_select) return atual;
  return [...atual, valueId];
}

/**
 * Como o grupo se anuncia no modal: "escolha 2", "escolha 1 a 3", "até 4".
 *
 * "obrigatório" sozinho não serve quando o mínimo é maior que 1 — o cliente
 * ficaria sem saber que precisa de dois sabores. E quando cabe uma escolha só e
 * o grupo é obrigatório, "obrigatório" já diz tudo: repetir "até 1" só polui.
 */
export function faixaLabel(group: SelectableGroup): string | null {
  const minimo = minimoDe(group);
  if (minimo <= 1 && group.max_select <= 1) return null;
  if (minimo <= 0) return `até ${group.max_select}`;
  if (minimo >= group.max_select) return `escolha ${minimo}`;
  return `escolha ${minimo} a ${group.max_select}`;
}

/**
 * Nomes dos grupos incompletos para a mensagem de erro. Quando o mínimo é maior
 * que 1 o nome sozinho não diz quanto falta, então vira `2 de "Sabores"`.
 */
export function faltandoLabels(
  groups: (SelectableGroup & { name: string })[],
  selection: Selection,
): string[] {
  return groups.flatMap((group) => {
    const faltam = quantosFaltam(group, selection);
    if (faltam === 0) return [];
    return [minimoDe(group) > 1 ? `${faltam} de "${group.name}"` : group.name];
  });
}