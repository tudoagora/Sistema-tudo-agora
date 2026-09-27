import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política e privacidade",
  description:
    "Como o Tudo Agora trata seus dados pessoais, cookies e informações de pagamento.",
  alternates: { canonical: "/politica-e-privacidade" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-marca-800 sm:text-4xl">
        Política de privacidade
      </h1>
      <p className="mt-2 text-sm text-texto-tenue">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-texto">
        <section>
          <h2 className="text-lg font-black text-marca-800">
            Quem somos e como falar conosco
          </h2>
          <p className="mt-2 text-texto-suave">
            O {siteConfig.name} é um diretório que conecta empresas e prestadores
            de serviço aos clientes da sua cidade. Dúvidas sobre esta política
            podem ser enviadas para {siteConfig.supportEmail} ou pelo WhatsApp{" "}
            {siteConfig.phoneDisplay}.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-marca-800">
            Dados que coletamos
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-texto-suave">
            <li>
              <strong className="text-texto">Cadastro:</strong> nome, e-mail,
              telefone e cidade, informados por você ou pela empresa anunciante.
            </li>
            <li>
              <strong className="text-texto">Pedidos:</strong> quando você faz
              um pedido, registramos os itens, o valor total, a forma de
              pagamento e o endereço de entrega ou retirada.
            </li>
            <li>
              <strong className="text-texto">Uso:</strong> páginas acessadas,
              termos buscados e interações com o app, para melhorar a
              experiência e a relevância dos resultados.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-marca-800">
            Para que usamos seus dados
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-texto-suave">
            <li>Processar e entregar pedidos.</li>
            <li>Entrar em contato sobre o pedido ou sobre sua conta.</li>
            <li>Enviar comunicações sobre novidades e promoções da sua cidade.</li>
            <li>Cumprir obrigações legais e fiscais.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-marca-800">
            Pagamentos
          </h2>
          <p className="mt-2 text-texto-suave">
            O processamento de pagamentos é feito por parceiros provedores. Não
            armazenamos números completos de cartão. Pedidos pagos via Pix são
            confirmados pela confirmação do pagamento junto ao provedor.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-marca-800">Compartilhamento</h2>
          <p className="mt-2 text-texto-suave">
            Compartilhamos seus dados apenas com a empresa que atender o seu
            pedido (nome, telefone e endereço de entrega) e com os fornecedores
            de pagamento e mensageria estritamente necessários à operação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-marca-800">Seus direitos</h2>
          <p className="mt-2 text-texto-suave">
            Você pode solicitar acesso, correção ou exclusão dos seus dados a
            qualquer momento pelo e-mail {siteConfig.supportEmail}. Também é
            possível cancelar comunicações de marketing pelo link presente nas
            próprias mensagens.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-marca-800">Cookies</h2>
          <p className="mt-2 text-texto-suave">
            Usamos cookies essenciais para manter sua sessão e a cidade que você
            selecionou. Cookies de análise e publicidade só são usados com o seu
            consentimento.
          </p>
        </section>
      </div>

      <p className="mt-12 text-sm text-texto-suave">
        <Link href="/" className="font-semibold text-marca-600 underline">
          Voltar para a página inicial
        </Link>
      </p>
    </div>
  );
}
