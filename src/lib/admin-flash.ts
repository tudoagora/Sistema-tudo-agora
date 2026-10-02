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

  // Usuários
  "feito-usuario-criado": {
    tone: "ok",
    mensagem: "Conta criada. A senha é a que você digitou.",
  },
  "feito-usuario-salvo": {
    tone: "ok",
    mensagem: "Usuário atualizado.",
  },
  "feito-usuario-removido": {
    tone: "ok",
    mensagem: "Usuário removido.",
  },
  "feito-senha-trocada": {
    tone: "ok",
    mensagem: "Sua senha foi trocada.",
  },
  "erro-senha-invalida": {
    tone: "erro",
    mensagem:
      "A senha precisa ter entre 8 e 72 caracteres. Nada foi alterado.",
  },
  "erro-trocar-senha": {
    tone: "erro",
    mensagem: "Não foi possível trocar a senha. Tente de novo.",
  },
  "erro-salvar-usuario": {
    tone: "erro",
    mensagem: "Não foi possível salvar o usuário. Tente de novo.",
  },
  "erro-remover-usuario": {
    tone: "erro",
    mensagem: "Não foi possível remover o usuário.",
  },
  "erro-usuario-inexistente": {
    tone: "erro",
    mensagem: "O usuário não existe mais.",
  },
  "erro-proprio-papel": {
    tone: "erro",
    mensagem: "Você não pode tirar o próprio acesso de admin.",
  },
  "erro-cliente-com-empresa": {
    tone: "erro",
    mensagem:
      "Para vincular uma empresa, o usuário precisa ser lojista — não cliente.",
  },
  "erro-ultimo-admin": {
    tone: "erro",
    mensagem:
      "Este é o único admin do sistema. Promova outra conta antes de tirar este acesso.",
  },
  "erro-proprio-conta": {
    tone: "erro",
    mensagem: "Você não pode remover a própria conta por aqui.",
  },

  // Planos
  "erro-salvar-plano": {
    tone: "erro",
    mensagem: "Não foi possível salvar o plano. Tente de novo.",
  },

  // Banners de publicidade
  "feito-banner-salvo": {
    tone: "ok",
    mensagem: "Banner salvo.",
  },
  "feito-banner-criado": {
    tone: "ok",
    mensagem: "Banner criado. Confira a imagem e o link antes de salvar.",
  },
  "feito-banner-excluido": {
    tone: "ok",
    mensagem: "Banner excluído.",
  },
  "feito-banner-ordenado": {
    tone: "ok",
    mensagem: "Ordem dos banners atualizada.",
  },
  "feito-banner-limite-salvo": {
    tone: "ok",
    mensagem: "Quantidade de banners exibidos atualizada.",
  },
  "erro-salvar-banner": {
    tone: "erro",
    mensagem: "Não foi possível salvar o banner. Tente de novo.",
  },
  "erro-excluir-banner": {
    tone: "erro",
    mensagem: "Não foi possível excluir o banner.",
  },
  "erro-banner-inexistente": {
    tone: "erro",
    mensagem: "O banner não existe mais.",
  },
  "erro-ordenar-banner": {
    tone: "erro",
    mensagem: "Não foi possível mudar a ordem. Tente de novo.",
  },
  "erro-salvar-limite-banner": {
    tone: "erro",
    mensagem: "A quantidade precisa ser um número entre 1 e 8.",
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
