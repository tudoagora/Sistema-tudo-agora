/**
 * Mensagens de retorno das actions de admin.
 *
 * As actions de `<form action={...}>` não têm onde devolver um estado: sem
 * `useActionState` o resultado some quando a requisição termina. A saída
 * possível é a query string, e o problema é que ninguém lia de volta — o
 * `?excluida=1` que o `deleteBusiness` escrevia nunca teve banner, e as
 * falhas que o PostgREST devolvia eram descartadas antes de chegar lá.
 *
 * Este módulo é o unico lugar onde esses codigos viram texto. Uma action
 * redireciona para `?erro=<codigo>` ou `?feito=<codigo>` e a pagina chama
 * `adminFlash`; codigo desconhecido nao renderiza nada, para nao expor a URL
 * crua como se fosse mensagem.
 */

export type AdminFlash = { tone: "erro" | "ok"; mensagem: string };

const MENSAGENS: Record<`${"erro" | "feito"}-${string}`, AdminFlash> = {
  // Cidades
  "erro-cidade-com-empresas": {
    tone: "erro",
    mensagem:
      "Não foi possível excluir: ainda há empresas ligadas nesta cidade.",
  },
  "erro-cidade-inexistente": {
    tone: "erro",
    mensagem: "A cidade não existe mais.",
  },
  "feito-cidade-excluida": {
    tone: "ok",
    mensagem: "Cidade excluída.",
  },

  // Empresas
  "feito-empresa-excluida": {
    tone: "ok",
    mensagem: "Empresa excluída.",
  },

  // Ofertas
  "erro-excluir-oferta": {
    tone: "erro",
    mensagem: "Não foi possível excluir a oferta.",
  },
  "erro-oferta-inexistente": {
    tone: "erro",
    mensagem: "A oferta não existe mais.",
  },
  "feito-oferta-excluida": {
    tone: "ok",
    mensagem: "Oferta excluída.",
  },

  // Planos
  "erro-salvar-plano": {
    tone: "erro",
    mensagem: "Não foi possível salvar o plano. Tente de novo.",
  },
};

/** Valor de `searchParams` já normalizado para string. */
export type AdminFlashParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** `null` quando não há nada para avisar — a maioria dos carregamentos. */
export function adminFlash(params: AdminFlashParams): AdminFlash | null {
  const erro = first(params.erro);
  if (erro) return MENSAGENS[`erro-${erro}`] ?? null;

  const feito = first(params.feito);
  if (feito) return MENSAGENS[`feito-${feito}`] ?? null;

  return null;
}
