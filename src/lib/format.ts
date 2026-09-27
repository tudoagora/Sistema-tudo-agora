/** Formatadores compartilhados entre Server e Client Components. */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Centavos -> "R$ 10,00" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

const WEEKDAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** `{"thu":[["18:00","22:00"]]}` ou o atalho textual `"24/7"`. */
export type OpeningHours = Record<string, string[][]> | string;

/** Só os dígitos, para montar links de wa.me. */
export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * "66992391831" -> "(66) 99239-1831".
 * Números com DDD de 11 dígitos ou menos são tratados como celular/fixo
 * brasileiro sem código de país; com 12/13 dígitos (55...) removemos o 55.
 */
export function formatPhone(value: string | null | undefined): string {
  const digits = digitsOnly(value);
  if (!digits) return "";
  const local = digits.length > 11 ? digits.replace(/^55/, "") : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return local;
}

/** Link de WhatsApp já com a mensagem preenchida. */
export function whatsappLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  const digits = digitsOnly(phone);
  if (!digits) return null;
  const target = digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

const timeRange = (from: string, to: string) => `${from} às ${to}`;

/** Dia da semana de hoje no fuso da cidade. */
export function todayLabel(timezone: string): string {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: timezone,
    weekday: "long",
  });
}

export function isOpenNow(
  hours: OpeningHours | null | undefined,
  timezone: string,
): boolean {
  if (!hours) return false;
  if (typeof hours === "string") return hours.toLowerCase().includes("24/7");

  const key = new Date()
    .toLocaleDateString("en-US", { timeZone: timezone, weekday: "short" })
    .toLowerCase()
    .slice(0, 3);
  const ranges = hours[key];
  if (!Array.isArray(ranges) || ranges.length === 0) return false;

  const now = new Date().toLocaleTimeString("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return ranges.some(([from, to]) => from <= now && now <= to);
}

/** `{"thu":[["18:00","22:00"]]}` -> "Quinta a domingo, das 18:00 às 22:00" */
export function formatOpeningHours(
  hours: OpeningHours | null | undefined,
): string {
  if (!hours || Object.keys(hours).length === 0) return "";
  if (typeof hours === "string") return hours;

  const index = WEEKDAY_KEYS.reduce<Record<string, number>>(
    (acc, key, i) => ({ ...acc, [key]: i }),
    {},
  );
  const distinct = new Map<string, string[]>();

  for (const [key, ranges] of Object.entries(hours)) {
    if (!Array.isArray(ranges) || ranges.length === 0) continue;
    const label = `${ranges.map(([from, to]) => timeRange(from, to)).join(", ")}`;
    distinct.set(label, [...(distinct.get(label) ?? []), key]);
  }

  return [...distinct.entries()]
    .map(([label, keys]) => `${formatDaySpan(keys, index)}: ${label}`)
    .join(" · ");
}

function formatDaySpan(keys: string[], index: Record<string, number>): string {
  const sorted = [...keys].sort(
    (a, b) => (index[a] ?? 0) - (index[b] ?? 0),
  );
  if (sorted.length === 1) return capitalize(WEEKDAYS[index[sorted[0]]] ?? sorted[0]);
  return `${capitalize(WEEKDAYS[index[sorted[0]]] ?? sorted[0])} a ${sorted
    .map((key) => WEEKDAYS[index[key]] ?? key)
    .join(", ")}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Monta o `opening_hours` jsonb a partir do que o formulário de horário
 * enviou.
 *
 * O formulário manda um campo por dia no formato `HH:MM-HH:MM`, e string
 * vazia para dia fechado. A coluna é `jsonb NOT NULL`, então dia fechado vira
 * ausência de chave — é assim que `isOpenNow` e `formatOpeningHours` já
 * liam. Horário fora do formato é ignorado em vez de gravar lixo: a coluna é
 * consumida por `new Date()` no outro lado.
 */
export function hoursFromEntries(entries: Record<string, string>): OpeningHours {
  const hours: Record<string, string[][]> = {};
  for (const key of WEEKDAY_KEYS) {
    const value = (entries[key] ?? "").trim();
    if (!value) continue;
    const [from, to] = value.split("-");
    if (!from || !to || !HHMM.test(from) || !HHMM.test(to)) continue;
    hours[key] = [[from, to]];
  }
  return hours;
}

/** Formato de um dia só, para preencher o formulário a partir da coluna. */
export function hoursToEntries(
  hours: OpeningHours | null | undefined,
): Record<string, string> {
  const entries: Record<string, string> = {};
  if (!hours || typeof hours === "string") return entries;
  for (const key of WEEKDAY_KEYS) {
    const first = hours[key]?.[0];
    entries[key] = first ? `${first[0]}-${first[1]}` : "";
  }
  return entries;
}

export const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_entrega: "Cartão na entrega",
  cartao_retirada: "Cartão na retirada",
  cartao: "Cartão",
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Retirada no local",
  onsite: "Presencial",
};
