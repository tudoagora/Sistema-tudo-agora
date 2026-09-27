import { revalidatePath } from "next/cache";

/**
 * Cardápio aparece em três lugares ao mesmo tempo: a página da empresa, a
 * vitrine pública em `/cardapio/[slug]` e os dois editores. Uma mutation de
 * produto tem que invalidar tudo — senão a empresa corrige o preço e o cliente
 * vê o valor velho.
 *
 * O `slug` da página pública é o da empresa dentro da cidade, por isso o
 * `revalidatePath` com o padrão de rota em vez do caminho concreto.
 */
export function revalidateMenu(businessId: number) {
  revalidatePath(`/painel/${businessId}/cardapio`);
  revalidatePath(`/painel/${businessId}/pedidos`);
  revalidatePath(`/admin/empresas/${businessId}/cardapio`);
  revalidatePath(`/admin/empresas/${businessId}`);
  revalidatePath(`/cidades/[cidade]/empresa/[slug]`, "page");
  revalidatePath("/cardapio/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/loja");
}
