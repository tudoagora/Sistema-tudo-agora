import { MAX_AD_LIMIT } from "@/lib/banners";

/**
 * Estado da tela `/admin/banners`.
 *
 * Fica fora de `actions.ts` porque aquele arquivo é `"use server"` e só pode
 * exportar funções async — um `export const` lá quebra em runtime.
 *
 * O `placement` e o `MAX_AD_LIMIT` NÃO são repetidos aqui: o loader da home e
 * estas actions importam de `@/lib/banners`. Se a home e o admin usassem duas
 * constantes diferentes, o admin salvaria um banner que a home nunca leria, e
 * o sintoma seria "meu banner sumiu", sem erro em lugar nenhum.
 */

/** Opções do seletor "quantos banners exibir". */
export const AD_LIMIT_OPTIONS = Array.from(
  { length: MAX_AD_LIMIT },
  (_, i) => i + 1,
);

export const AD_IMAGE_HINT =
  "Caminho servido pelo app, ex.: /banners/publicidade/anuncie-tapurah-1.png. Também aceita uma URL completa de fora.";
