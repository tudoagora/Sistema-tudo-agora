import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hasAnyUser } from "@/lib/first-run";
import { FirstRunForm } from "./form";

export const metadata: Metadata = {
  title: "Primeiro acesso",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FirstAccessPage() {
  if (await hasAnyUser()) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 lg:px-6">
      <p className="text-xs font-bold uppercase tracking-widest text-destaque-600">
        Tudo Agora
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-marca-800">
        Primeiro acesso
      </h1>
      <p className="mt-3 text-sm text-texto-suave">
        Nenhuma conta existe neste sistema ainda. Crie a conta de administrador
        que vai cuidar das empresas, do cardápio e dos planos. Depois desta
        etapa, esta página some.
      </p>

      <FirstRunForm />

      <p className="mt-8 text-center text-sm">
        <Link href="/entrar" className="font-semibold text-marca-600 underline">
          Já tenho uma conta
        </Link>
      </p>
    </div>
  );
}
