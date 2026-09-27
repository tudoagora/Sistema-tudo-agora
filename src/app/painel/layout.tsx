import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Painel da empresa",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser("/painel");

  return <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">{children}</main>;
}
