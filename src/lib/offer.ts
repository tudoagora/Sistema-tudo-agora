/**
 * Regra de domínio: uma oferta sem prazo nunca expira; com prazo, só vale
 * enquanto `ends_at` estiver no futuro.
 *
 * Fica num módulo próprio (e não no componente) porque `Date.now()` dentro de
 * um Server Component viola a regra de pureza do React Compiler
 * (`react-hooks/purity`), mesmo sendo seguro aqui: este render roda uma vez
 * por requisição, no servidor.
 */
export function isOfferActive(endsAt: string | null | undefined): boolean {
  if (!endsAt) return true;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return true;
  return end > Date.now();
}
