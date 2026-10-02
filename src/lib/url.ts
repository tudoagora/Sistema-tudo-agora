/**
 * Link que o cliente sai do site por ele: cardápio de fora (app de delivery,
 * site próprio, conversa de WhatsApp).
 *
 * Estas duas funções existem pelo mesmo motivo e não podem ser a mesma: uma
 * normaliza o que o admin COLOU, a outra filtra o que o banco DEVOLVE. A
 * primeira aceita entrada incompleta e repara; a segunda não mexe em nada e
 * recusa. Se fossem uma só, ou o `href` acabaria normalizado a cada render
 * (mudando o link gravado na tela sem ninguém ter pedido), ou a gravação
 * passaria a depender de `new URL` rodando no action.
 */

/** `algo://` — a parte da frente que decide o que o navegador vai fazer. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Prepara o valor do campo antes de gravar em `businesses.menu_url`.
 *
 * Devolve `null` para campo vazio (o caso normal: empresa sem cardápio de
 * fora) e para o que não é um link http(s) — `javascript:`, `data:` e
 * companhia passam longe. O `https://` é completado quando o admin cola
 * `wa.me/5511999` sem esquema, que é como o link aparece no WhatsApp.
 */
export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;

  return url.toString();
}

/**
 * Filtro do lado da leitura, para a página pública.
 *
 * O CHECK `businesses_menu_url_format` já barra esquema ruim no banco, mas a
 * coluna vira `href` de uma página vista por qualquer pessoa, e um `href` é
 * o único lugar do app onde o texto do admin vira código executado. Devolve
 * o valor **exatamente como está no banco** (sem normalizar), porque é
 * decisão de segurança, não de exibição: normalizar aqui faria o link da tela
 * divergir do link gravado.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  return url.protocol === "http:" || url.protocol === "https:" ? raw : null;
}