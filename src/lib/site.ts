export const siteConfig = {
  name: "Tudo Agora",
  tagline: "Tudo o que você procura, mais perto de você",
  description:
    "O Tudo Agora conecta você a lojas, serviços e restaurantes da sua cidade. Comida, farmácia, serviços, utilidades e muito mais.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tudoagora.app.br",
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
