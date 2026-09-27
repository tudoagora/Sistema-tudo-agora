/** Gerador de slugs compartilhado pelo painel. */

/**
 * Faixa de acentos combinantes (U+0300–U+036F), escrita com escapes \u.
 * O literal com os caracteres reais depende da codificação do arquivo e se
 * corrompe na transcrição — virando uma classe como ['-?], que apaga
 * apóstrofos e hifens em vez dos acentos.
 */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** "Sabor da Itália Delivery" → "sabor-da-italia-delivery" */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Deixa o valor dentro do formato aceito pelo banco para `custom_slug`:
 * `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`. Devolve `null` quando sobra vazio.
 */
export function normalizeSubdomain(value: string): string | null {
  const cleaned = slugify(value);
  return cleaned.length >= 2 ? cleaned : null;
}

/** Só dígitos, para telefone/WhatsApp. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}
