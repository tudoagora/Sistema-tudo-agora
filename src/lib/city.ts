import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCityBySlug, listCities, type City } from "@/lib/catalog";
import { CITY_COOKIE } from "@/lib/constants";

/**
 * Cidade ativa. A escolha do visitante vive num cookie (`ta_cidade`) para
 * não obrigar navegação extra — o site antigo fazia isso com `?ta_cidade=`
 * em query string, que não é indexável nem sobrevive a compartilhamento.
 *
 * Com uma única cidade cadastrada hoje, o cookie serve só como residueiro
 * até a segunda cidade entrar no ar.
 */
export const getCurrentCity = cache(async (): Promise<City> => {
  const cities = await listCities();
  if (cities.length === 0) {
    throw new Error(
      "Nenhuma cidade cadastrada. Rode `supabase db reset` para aplicar o seed.",
    );
  }

  const slug = (await cookies()).get(CITY_COOKIE)?.value;
  if (slug) {
    const match = await getCityBySlug(slug);
    if (match) return match;
  }
  return cities[0];
});
