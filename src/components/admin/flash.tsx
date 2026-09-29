import { adminFlash, type AdminFlashParams } from "@/lib/admin-flash";
import { cn } from "@/lib/utils";

/**
 * Faixa de retorno da action, no topo das telas de admin.
 *
 * Server component puro: a action é a única que sabe se a operação deu certo,
 * e a query string é o que sobra depois que a requisição termina. A cor segue
 * o tom — verde para o que foi feito, vermelho para o que falhou, e nunca os
 * dois, para o admin não ler "Excluída" num erro.
 */
export function AdminFlash({ params }: { params: AdminFlashParams }) {
  const flash = adminFlash(params);
  if (!flash) return null;

  return (
    <p
      role="status"
      className={cn(
        "mt-6 rounded-card border px-5 py-4 text-sm font-semibold",
        flash.tone === "ok"
          ? "border-sucesso/40 bg-sucesso/10 text-sucesso-700"
          : "border-erro/30 bg-erro/5 text-erro-700",
      )}
    >
      {flash.mensagem}
    </p>
  );
}
