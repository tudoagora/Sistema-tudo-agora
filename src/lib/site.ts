const DEFAULT_SITE_URL = "https://tudoagora.app.br";

/**
 * Resolve a URL pública do site tolerando variável ausente, vazia ou
 * malformada. `??` não basta: no Vercel uma env declarada sem valor chega como
 * `""`, que é um erro de sintaxe para `new URL()` e derrubava o build inteiro
 * na avaliação de `src/app/layout.tsx`.
 */
function resolveSiteUrl(value: string | undefined | null): string {
  // Prioriza o domínio Vercel FREE durante o build (usa automaticamente
  // https://<project-name>.vercel.app durante desenvolvimento/preview)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  
  const candidate = (value ?? "").trim();
  if (!candidate) return DEFAULT_SITE_URL;
  try {
    return new URL(candidate).href.replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
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
