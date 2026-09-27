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

export const siteConfig = {
  name: "Tudo Agora",
  tagline: "Tudo o que você procura, mais perto de você",
  description:
    "O Tudo Agora conecta você a lojas, serviços e restaurantes da sua cidade. Comida, farmácia, serviços, utilidades e muito mais.",
  url: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  locale: "pt-BR",
  whatsapp: "5566992391831",
  phoneDisplay: "(66) 99239-1831",
  supportEmail: "contato@tudoagora.app.br",
} as const;

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
