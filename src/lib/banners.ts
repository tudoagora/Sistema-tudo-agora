import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AdBanner } from "@/components/home/ad-banner";

/**
 * Faixa comercial da home. Não é o herói (`HeroSlider`, arte fixa em
 * `public/banners`): é a peça que o admin cadastra e que entra DEPOIS de
 * "Destaques em {cidade}".
 *
 * O `placement` é `text` sem CHECK no banco, então este valor é o contrato
 * entre a migration, o seed, `/admin/banners` e esta lista.
 */
export const AD_PLACEMENT = "publicidade";

/** Chave em `site_settings` com quantos banners rodam ao mesmo tempo. */
export const AD_LIMIT_KEY = `${AD_PLACEMENT}_limite`;

/**
 * Teto do carrossel. Com um banner só a faixa vira um bloco estático, então
 * não faz sentido administration ir além disso — e o `.limit()` abaixo usa o
 * mesmo número para não carregar arte que ninguém vê.
 */
export const MAX_AD_LIMIT = 8;

/** Usado quando a chave não existe ou está com lixo — mesma semântica do default do banco. */
export const DEFAULT_AD_LIMIT = 3;

function clampLimit(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_AD_LIMIT;
  return Math.min(MAX_AD_LIMIT, Math.max(1, Math.trunc(value)));
}

/**
 * Quantos banners a faixa mostra de uma vez.
 *
 * O valor é lido do banco, não fixo no código: é o admin que decide quantas
 * peças o visitante vê. Um valor fora da faixa é aparado em vez de virar erro
 * — a home não pode quebrar por causa de um campo de texto.
 */
export const getAdLimit = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", AD_LIMIT_KEY)
    .maybeSingle();

  return clampLimit(Number(data?.value));
});

/**
 * Banners ativos da faixa, na ordem que o admin montou em `/admin/banners`.
 *
 * `sort_order` sozinho não garante ordem entre linhas com o mesmo valor (o
 * admin pode salvar dois banners com o mesmo número), então `id` desempata —
 * sem isso o Postgres devolve uma ordem arbitrária e a faixa "pula" de slide a
 * cada visita. `id` acompanha a criação, que é o que o admin espera.
 *
 * A busca dos banners e a leitura do limite saem no mesmo `Promise.all`, e o
 * corte de quantos ficam é feito aqui. Antes o `.limit()` dependia do valor
 * lido do banco, o que jogava as duas leituras em sequência — e a home esperava
 * as duas para desenhar qualquer coisa. Buscar o teto (`MAX_AD_LIMIT`, o
 * mesmo número que o admin pode pedir) e aparar em JS dá exatamente a mesma
 * lista, porque a ordem é a mesma nos dois casos.
 */
export const listAdBanners = cache(async (): Promise<AdBanner[]> => {
  const supabase = await createClient();

  const [{ data, error }, limit] = await Promise.all([
    supabase
      .from("banners")
      .select("id, title, image_url, link_url")
      .eq("placement", AD_PLACEMENT)
      .eq("is_active", true)
      // A policy `banners_read` já esconde o que está vencido, mas ela não olha
      // `starts_at` (só `is_active` e `ends_at`), então o agendamento futuro é
      // filtrado aqui.
      .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .limit(MAX_AD_LIMIT),
    getAdLimit(),
  ]);

  if (error) throw new Error(`listAdBanners: ${error.message}`);

  return ((data ?? []) as unknown as Record<string, unknown>[])
    .slice(0, limit)
    // Sem imagem não há o que mostrar: o banner fica invisível na faixa, mas
    // continua no admin para o admin completar o cadastro.
    .map((row) => ({
      id: Number(row.id),
      title: String(row.title ?? "Anuncie no Tudo Agora"),
      imageUrl: String(row.image_url ?? ""),
      linkUrl: String(row.link_url ?? "/planos"),
    }))
    .filter((banner) => banner.imageUrl.length > 0);
});
