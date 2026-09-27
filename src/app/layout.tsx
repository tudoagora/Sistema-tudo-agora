import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";

import { CityProvider } from "@/components/city-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listCities } from "@/lib/catalog";
import { getCurrentCity } from "@/lib/city";
import { siteConfig } from "@/lib/site";

import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: siteConfig.name },
  icons: {
    icon: [
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#001c7c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cities = await listCities();
  const current = await getCurrentCity();

  return (
    <html lang="pt-BR" className={`${openSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-white text-texto antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-marca-800 focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <CityProvider cities={cities} current={current}>
          <ServiceWorkerRegistrar />
          <SiteHeader />
          <main id="conteudo" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </CityProvider>
      </body>
    </html>
  );
}
