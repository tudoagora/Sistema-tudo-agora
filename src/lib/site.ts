const DEFAULT_SITE_URL = "https://tudoagora.app.br";

/** Aceita só URL absoluta válida; `null` para vazio, malformado ou relativo. */
function normalizeUrl(value: string | undefined | null): string | null {
  const candidate = (value ?? "").trim();
  if (!candidate) return null;
  try {
    return new URL(candidate).href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * URL pública do site, usada em `metadataBase`, OpenGraph e redirecionamentos.
 *
 * Fase de teste (hoje): manda o endereço do próprio deploy, porque o domínio
 * oficial ainda responde pelo WordPress antigo — apontar metadata e OpenGraph
 * para lá levaria o visitante ao site errado. `VERCEL_PROJECT_PRODUCTION_URL`
 * é o domínio estável do projeto (`<projeto>.vercel.app`, o mesmo que o
 * cliente digita); `VERCEL_URL` é o endereço imutável daquele deploy, que muda
 * a cada publicação e por isso é só a segunda opção. O Vercel injeta as duas
 * sozinho em todo build, então não há nada a cadastrar.
 *
 * Na migração, cadastre no Vercel
 * `NEXT_PUBLIC_SITE_URL=https://tudoagora.app.br` junto de
 * `NEXT_PUBLIC_FORCE_SITE_URL=true`; o domínio oficial assume sem alterar uma
 * linha de código.
 *
 * `??` não bastava: env declarada sem valor chega como `""`, que é erro de
 * sintaxe para `new URL()` e derrubava o build inteiro em `src/app/layout.tsx`.
 */
function resolveSiteUrl(value: string | undefined): string {
  const explicit = normalizeUrl(value);

  // Domínio oficial só entra quando pedido de propósito (dia da virada).
  if (explicit && process.env.NEXT_PUBLIC_FORCE_SITE_URL === "true") return explicit;

  // Endereço estável do projeto: é o que o cliente digita e compartilha.
  const stable = normalizeUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
  );
  if (stable) return stable;

  // Endereço imutável deste deploy, que muda a cada publicação.
  const deployment = normalizeUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  );
  if (deployment) return deployment;

  return explicit ?? DEFAULT_SITE_URL;
}

const resolvedUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
const resolvedOrigin = new URL(resolvedUrl);

export const siteConfig = {
  name: "Tudo Agora",
  tagline: "Tudo o que você procura, mais perto de você",
  description:
    "O Tudo Agora conecta você a lojas, serviços e restaurantes da sua cidade. Comida, farmácia, serviços, utilidades e muito mais.",
  url: resolvedUrl,
  locale: "pt-BR",
  whatsapp: "5566992391831",
  phoneDisplay: "(66) 99239-1831",
  supportEmail: "contato@tudoagora.app.br",
} as const;

/**
 * Vitrine por subdomínio de empresa (`slug.dominio`) só existe no domínio
 * oficial: a Vercel não emite certificado nem aceita wildcard para
 * `*.vercel.app`, então durante a fase de teste o formato continua sendo o
 * caminho `/cardapio/slug`. A condição é a mesma da virada de domínio em
 * `resolveSiteUrl` (`NEXT_PUBLIC_FORCE_SITE_URL=true`), com a trava extra do
 * `vercel.app` para uma env configurada cedo demais não gerar link quebrado.
 *
 * No dia da migração, além das duas envs, o projeto precisa do domínio
 * wildcard `*.tudoagora.app.br` cadastrado na Vercel e do CNAME `*` no DNS.
 */
export const storefrontSubdomains =
  process.env.NEXT_PUBLIC_FORCE_SITE_URL === "true" &&
  !resolvedOrigin.hostname.endsWith(".vercel.app");

/**
 * URL pública da vitrine de uma empresa: subdomínio quando o domínio oficial
 * estiver no ar, caminho `/cardapio/slug` enquanto não estiver. É o endereço
 * que vai em canonical, OpenGraph e JSON-LD — os links que o visitante
 * compartilha e que o Google indexa.
 */
export function storefrontUrl(slug: string): string {
  return storefrontSubdomains
    ? `${resolvedOrigin.protocol}//${slug}.${resolvedOrigin.hostname}`
    : `${resolvedUrl}/cardapio/${slug}`;
}

/** Mesmo formato exigido pelo check `businesses_custom_slug_format` do banco. */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Extrai o slug da empresa de um hostname de vitrine
 * (`pizzaria-do-teste.tudoagora.app.br` → `pizzaria-do-teste`), ou `null`
 * quando o host não é um subdomínio de vitrine. O `www` fica de fora porque
 * pertence ao site principal, e o wildcard do DNS cobre um nível só — por
 * isso prefixo com ponto não é vitrine.
 */
export function storefrontSlugFromHost(hostname: string): string | null {
  if (!storefrontSubdomains) return null;
  const base = resolvedOrigin.hostname;
  if (!hostname.endsWith(`.${base}`)) return null;

  const slug = hostname.slice(0, hostname.length - base.length - 1);
  if (slug === "www" || !SLUG_RE.test(slug)) return null;
  return slug;
}

/**
 * Link de contato com o suporte. O WhatsApp tem prioridade; o e-mail é a
 * garantia de que o botão nunca fique sem destino.
 */
export function supportLink(message: string): string {
  const digits = siteConfig.whatsapp.replace(/\D/g, "");
  const target = digits.length > 11 ? digits : `55${digits}`;
  return target
    ? `https://wa.me/${target}?text=${encodeURIComponent(message)}`
    : `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(message)}`;
}

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/planos", label: "Planos" },
  { href: "/loja", label: "Loja" },
] as const;

export const footerLinks = {
  quick: [
    { href: "/loja", label: "Loja" },
    { href: "/ofertas", label: "Promoções" },
    { href: "/planos", label: "Planos" },
  ],
  pages: [
    { href: "/planos", label: "Planos" },
    { href: "/minha-conta", label: "Área de membros" },
    { href: "/politica-e-privacidade", label: "Política e privacidade" },
  ],
} as const;
