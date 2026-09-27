/**
 * O PostgREST tipa `data` como união entre o array e `null`, e o tipo gerado
 * ainda inclui a variante de falha (`PostgrestResponseFailure`, com
 * `data: null`). Estas funções recebem a RESPOSTA inteira — não o `data` — e
 * devolvem o array pronto, sem espalhar `as` e `??` pelo código.
 */

/** Normaliza uma resposta 1:N (`.select()`, listas). */
export function unwrapAll<T>(response: { data: T[] | null } | null | undefined): T[] {
  return Array.isArray(response?.data) ? response.data : [];
}

/** Normaliza uma resposta 1:1 (`.maybeSingle()`, `.single()`). */
export function unwrap<T>(response: { data: T | T[] | null } | null | undefined): T | null {
  const data = response?.data;
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return (data as T | null) ?? null;
}

/** Lê o primeiro elemento de um embed aninhado (`businesses`, `cities`). */
export function embed<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? ((value[0] as T | undefined) ?? null) : value;
}
