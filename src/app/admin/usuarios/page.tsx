import type { Metadata } from "next";

import { AdminFlash } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/auth";
import type { AdminFlashParams } from "@/lib/admin-flash";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteUser, updateUser } from "./actions";
import { MEMBER_ROLE_LABELS, ROLE_LABELS } from "./state";
import { UserForm } from "./user-form";

export const metadata: Metadata = { title: "Usuários" };

/**
 * O GoTrue devolve no máximo 1000 contas por página e esta tela não pagina.
 * Acima disso a lista trunca e o admin poderia achar que não há mais contas —
 * por isso o total vem junto e a diferença é dita na tela.
 */
const AUTH_PAGE_SIZE = 1000;

const select =
  "min-h-11 w-full rounded-logo border border-borda bg-white px-4 text-sm text-texto-forte focus:border-marca-600";

export default async function UsuariosAdminPage(
  props: PageProps<"/admin/usuarios">,
) {
  const session = await requireAdmin();
  const params = (await props.searchParams) as AdminFlashParams;

  const supabase = await createClient();

  const [{ data: profiles }, { data: businesses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("businesses").select("id, name").order("name"),
  ]);

  // O e-mail só existe no GoTrue: `profiles` não guarda. `listUsers` exige
  // service_role, então é o único ponto da tela que sai da sessão do admin.
  const {
    data: authData,
    error: authError,
  } = await createAdminClient().auth.admin.listUsers({
    page: 1,
    perPage: AUTH_PAGE_SIZE,
  });

  const emails = new Map(
    (authData?.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  const rows = profiles ?? [];
  const ids = rows.map((row) => row.id);

  const { data: links } = await supabase
    .from("business_members")
    .select("business_id, user_id, role")
    .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const linkByUser = new Map<
    string,
    { businessId: number; role: string } | undefined
  >();
  for (const link of links ?? []) {
    // A PK é o par (business_id, user_id), então um usuário pode estar em mais
    // de uma empresa. A tela mostra a primeira e o formulário manda o id dela
    // como `currentBusinessId` — é só esse vínculo que a action remove.
    if (!linkByUser.has(link.user_id)) {
      linkByUser.set(link.user_id, {
        businessId: link.business_id,
        role: link.role,
      });
    }
  }

  const businessOptions = (businesses ?? []).map((business) => ({
    id: business.id,
    name: business.name,
  }));

  // A paginação só volta `total` quando a consulta deu certo; no ramo de erro
  // o GoTrue devolve `{ users: [] }` e a propriedade não existe.
  const fetched = authData?.users?.length ?? 0;
  const total = authData && "total" in authData ? authData.total : fetched;
  const hidden = Math.max(0, total - fetched);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-2xl font-black tracking-tight text-marca-800">
        Usuários
      </h1>
      <AdminFlash params={params} />
      <p className="mt-1 text-sm text-texto-suave">
        {rows.length} {rows.length === 1 ? "perfil" : "perfis"} no Tudo Agora.
        Papel e empresa decidem o que cada um enxerga.
      </p>

      {authError ? (
        <p
          role="alert"
          className="mt-6 rounded-card border border-erro/30 bg-erro/5 px-5 py-4 text-sm text-erro-700"
        >
          Não foi possível ler os e-mails das contas: {authError.message}
        </p>
      ) : null}

      {hidden > 0 ? (
        <p
          role="status"
          className="mt-6 rounded-card border border-borda bg-white px-5 py-4 text-sm text-texto-suave"
        >
          Mostrando as {AUTH_PAGE_SIZE} contas mais recentes de {total}. As
          demais {hidden} não aparecem nesta lista.
        </p>
      ) : null}

      <ul className="mt-8 space-y-4">
        {rows.map((row) => {
          const link = linkByUser.get(row.id);
          const isSelf = row.id === session.user.id;

          return (
            <li
              key={row.id}
              className="rounded-card border border-borda bg-white p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-texto-forte">
                  {row.full_name || "Sem nome"}
                  {isSelf ? (
                    <span className="ml-2 text-xs font-semibold text-texto-tenue">
                      (você)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-texto-tenue">
                  {ROLE_LABELS[row.role] ?? row.role} · desde{" "}
                  {new Date(row.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <p className="mt-1 text-sm text-texto-suave">
                {emails.get(row.id) ?? "e-mail indisponível"}
                {row.phone ? ` · ${row.phone}` : ""}
              </p>

              <form
                action={updateUser}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_9rem_11rem_8rem_auto] sm:items-end"
              >
                <input type="hidden" name="id" value={row.id} />
                <input
                  type="hidden"
                  name="currentBusinessId"
                  value={link?.businessId ?? ""}
                />

                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold text-texto-forte"
                    htmlFor={`fullName-${row.id}`}
                  >
                    Nome
                  </label>
                  <input
                    id={`fullName-${row.id}`}
                    name="fullName"
                    defaultValue={row.full_name ?? ""}
                    required
                    maxLength={120}
                    className={select}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold text-texto-forte"
                    htmlFor={`role-${row.id}`}
                  >
                    Papel
                  </label>
                  <select
                    id={`role-${row.id}`}
                    name="role"
                    defaultValue={row.role}
                    className={select}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold text-texto-forte"
                    htmlFor={`businessId-${row.id}`}
                  >
                    Empresa
                  </label>
                  <select
                    id={`businessId-${row.id}`}
                    name="businessId"
                    defaultValue={link?.businessId ?? ""}
                    className={select}
                  >
                    <option value="">Sem vínculo</option>
                    {businessOptions.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold text-texto-forte"
                    htmlFor={`memberRole-${row.id}`}
                  >
                    Poder
                  </label>
                  <select
                    id={`memberRole-${row.id}`}
                    name="memberRole"
                    defaultValue={link?.role ?? "owner"}
                    className={select}
                  >
                    {Object.entries(MEMBER_ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="min-h-11 rounded-pill bg-marca-gradient px-5 text-sm font-bold text-white"
                >
                  Salvar
                </button>
              </form>

              <form action={deleteUser} className="mt-3">
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  disabled={isSelf}
                  className="min-h-11 rounded-pill border border-borda-forte px-5 text-sm font-semibold text-texto-suave transition-colors hover:border-erro hover:text-erro-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-borda-forte disabled:hover:text-texto-suave"
                >
                  Remover conta
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-card border border-borda bg-white px-5 py-6 text-sm text-texto-suave">
          Nenhum perfil cadastrado.
        </p>
      ) : null}

      <UserForm businesses={businessOptions} />
    </div>
  );
}