import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/entrar/login-form";
import { safeNext } from "@/lib/next-redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: true },
};

export default async function LoginPage(props: PageProps<"/entrar">) {
  const params = await props.searchParams;
  const next = safeNext(
    Array.isArray(params.next) ? params.next[0] : params.next,
  );

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  // `?saiu=1` chega do logout em `/minha-conta`. Sem este aviso a tela de
  // login aparece do nada e parece que a conta sumiu sozinha.
  const saiu = params.saiu === "1";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 lg:px-6">
      {saiu ? (
        <p
          role="status"
          className="mb-6 rounded-card border border-sucesso/30 bg-sucesso/5 px-5 py-4 text-sm text-texto-forte"
        >
          Sessão encerrada. Entre com a conta que quiser usar agora.
        </p>
      ) : null}
      <h1 className="text-3xl font-black tracking-tight text-marca-800">
        Entrar
      </h1>
      <p className="mt-2 text-texto-suave">
        Acesse sua conta para acompanhar pedidos e gerenciar sua empresa.
      </p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-xs text-texto-tenue">
        Ainda não tem conta?{" "}
        <a href="/cadastro" className="font-semibold text-marca-600 underline">
          Criar conta
        </a>{" "}
        ou{" "}
        <a href="/planos" className="font-semibold text-marca-600 underline">
          anuncie sua empresa
        </a>
      </p>
    </div>
  );
}
