import type { NextConfig } from "next";

/**
 * O bucket `cardapio` do Supabase Storage serve as fotos de produto e de
 * seção. O hostname muda entre ambientes (local é `127.0.0.1:54321`,
 * produção é o domínio do projeto), então o padrão sai da env em vez de ser
 * fixo no arquivo.
 */
function storagePattern(): {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: "/storage/v1/object/public/**";
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const storage = storagePattern();

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    serverActions: {
      /**
       * O limite padrão do Next é 1 MB, e ele é aplicado pelo runtime ANTES
       * da action rodar: uma foto de produto de 2 MB era recusada com um erro
       * de infraestrutura, sem mensagem para o lojista e sem passar pelo
       * `MAX_IMAGE_BYTES` que valida a mesma coisa com mensagem boa. Aqui o
       * teto fica acima do que a aplicação aceita, de propósito — a validação
       * continua sendo a da action, que é quem sabe escrever a mensagem.
       */
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Logos e banners legados ainda vivem no WordPress durante a migração.
    // Fotos de cardápio já vão para o bucket, tratado acima.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tudoagora.app.br",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**.tudoagora.app.br",
        pathname: "/assets/uploads/**",
      },
      ...(storage ? [storage] : []),
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // O service worker precisa poder ser atualizado sem depender do cache HTTP.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "text/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
