import "server-only";

import type { Route } from "next";

/**
 * Normaliza o destino após o login.
 *
 * O valor vem da query string (ou de um campo do formulário), então é entrada
 * não confiável: aceitar qualquer coisa abriria redirect para site externo
 * (open redirect). A regra é deliberadamente estrita — só caminhos internos
 * absolutos, sem protocolo, sem `//`, sem barras invertidas e sem `:` (que
 * poderia sugerir `javascript:`).
 *
 * Prefixos permitidos: só as áreas que realmente exigem login.
 */
const ALLOWED_PREFIXES = [
  "/admin",
  "/minha-conta",
  "/painel",
  "/pedido",
  "/pedidos",
] as const;

export const DEFAULT_AFTER_LOGIN = "/minha-conta" as Route;

export function safeNext(raw: string | null | undefined): Route {
  if (!raw) return DEFAULT_AFTER_LOGIN;

  const value = raw.trim();
  if (!value.startsWith("/")) return DEFAULT_AFTER_LOGIN;
  if (value.startsWith("//")) return DEFAULT_AFTER_LOGIN;
  if (value.includes("\\")) return DEFAULT_AFTER_LOGIN;
  if (value.includes(":")) return DEFAULT_AFTER_LOGIN;
  // remove query/hash antes de comparar o caminho
  const path = value.split(/[?#]/, 1)[0] ?? "";

  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return (allowed ? value : DEFAULT_AFTER_LOGIN) as Route;
}
