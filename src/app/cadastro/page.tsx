import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/app/cadastro/register-form";
import { safeNext } from "@/lib/next-redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false, follow: true },
};

export default async function CadastroPage(props: PageProps<"/cadastro">) {
  const params = await props.searchParams;
  const next = safeNext(
    Array.isArray(params.next) ? params.next[0] : params.next,
  );

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800">
        Criar conta
      </h1>
      <p className="mt-2 text-texto-suave">
        Acompanhe seus pedidos e, se você tem uma empresa, gerencie o cardápio
        por aqui.
      </p>
      <RegisterForm next={next} />
      <p className="mt-6 text-center text-xs text-texto-tenue">
        Já tem conta?{" "}
        <a href="/entrar" className="font-semibold text-marca-600 underline">
          Entrar
        </a>
      </p>
    </div>
  );
}