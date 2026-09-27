import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./nav";

export const metadata = {
  title: { default: "Painel", template: "%s | Painel Tudo Agora" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-superficie">
      <header className="border-b border-borda bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-logo bg-marca-gradient text-sm font-black text-white">
              TA
            </span>
            <div>
              <p className="text-sm font-black leading-tight text-marca-800">
                Painel Tudo Agora
              </p>
              <p className="text-xs text-texto-tenue">
                {session.profile?.full_name ?? session.user.email}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-texto-suave transition-colors hover:text-marca-800"
          >
            Ver o site →
          </Link>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
          <AdminNav />
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6">
        {children}
      </main>
    </div>
  );
}
