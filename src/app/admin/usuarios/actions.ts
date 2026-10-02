"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserFormState } from "./state";

const ROLES = ["customer", "merchant", "admin"] as const;
const MEMBER_ROLES = ["owner", "manager"] as const;

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    .max(72, "A senha precisa de no máximo 72 caracteres."),
  role: z.enum(ROLES),
  memberRole: z.enum(MEMBER_ROLES),
});

const updateSchema = z.object({
  id: z.uuid("Usuário inválido."),
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(120),
  role: z.enum(ROLES),
  memberRole: z.enum(MEMBER_ROLES),
});

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    .max(72, "A senha precisa de no máximo 72 caracteres."),
});

/** `"sem vínculo"` chega como string vazia; qualquer outro texto tem de ser inteiro. */
function parseBusinessId(raw: FormDataEntryValue | null): number | null | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function describeCreateError(message: string | undefined): string {
  if (!message) return "Não foi possível criar a conta.";
  // O GoTrue não distingue "e-mail já usado" por código estável; a mensagem é a
  // única fonte e mudar de texto deixaria o admin sem explicação.
  if (/already (been )?registered|already exists|email_exists/i.test(message)) {
    return "Já existe uma conta com esse e-mail.";
  }
  return message;
}

/**
 * Desfaz a conta criada quando uma etapa depois do `createUser` falha.
 *
 * Sem isto sobra um e-mail queimado no GoTrue: o trigger já criou o perfil, a
 * tela diz que falhou e o admin não consegue mais cadastrar o mesmo e-mail
 * porque a conta existe e ele não sabe a senha dela.
 */
async function undoUser(userId: string, motivo: string): Promise<UserFormState> {
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  return {
    error: error
      ? `${motivo} A conta também não pôde ser removida — troque a senha dela no painel do Supabase.`
      : `${motivo} A conta que foi criada no meio do processo já foi desfeita.`,
    fieldErrors: {},
  };
}

/**
 * Cadastra uma conta já pronta para uso.
 *
 * `auth.admin.createUser` exige `service_role`, então ele roda com o cliente de
 * serviço — mas o papel e o vínculo de empresa são gravados com a sessão do
 * admin, atravessando as policies de `profiles`/`business_members` da migration
 * 20260101000012. É assim que a tela se comporta como uma sessão comum.
 */
export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const parsed = createSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    memberRole: formData.get("memberRole"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      fieldErrors,
    };
  }

  const businessId = parseBusinessId(formData.get("businessId"));
  if (businessId === undefined) {
    return { error: "Empresa inválida.", fieldErrors: { businessId: "Empresa inválida." } };
  }
  if (businessId !== null && parsed.data.role === "customer") {
    const mensagem = "Para vincular uma empresa, escolha o papel de lojista.";
    return { error: mensagem, fieldErrors: { role: mensagem } };
  }

  // `email_confirm: true`: a conta entra pronta para entrar. Não há envio de
  // e-mail no projeto, então confirmar por link deixaria a conta inacessível.
  const { data, error } = await createAdminClient().auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    const mensagem = describeCreateError(error?.message);
    return { error: mensagem, fieldErrors: { email: mensagem } };
  }

  // O trigger handle_new_user() já criou o perfil como 'customer'.
  const userId = data.user.id;
  const supabase = await createClient();

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, full_name: parsed.data.fullName })
    .eq("id", userId);
  if (roleError) return undoUser(userId, roleError.message);

  if (businessId !== null) {
    const { error: memberError } = await supabase.from("business_members").insert({
      business_id: businessId,
      user_id: userId,
      role: parsed.data.memberRole,
    });
    if (memberError) return undoUser(userId, memberError.message);
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  redirect("/admin/usuarios?criado=1");
}

/**
 * Salva papel, nome e vínculo de empresa de um usuário existente.
 *
 * Redireciona em vez de devolver estado: o botão vive num `<form action={...}>`
 * sem `useActionState`, e sem query string o admin só veria a tela sumir sem
 * saber se gravou — o mesmo problema que `deleteCity` e `updatePlan` já
 * resolvem passando pelo `adminFlash`.
 */
export async function updateUser(formData: FormData) {
  const session = await requireAdmin();

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    memberRole: formData.get("memberRole"),
  });
  if (!parsed.success) {
    redirect("/admin/usuarios?erro=salvar-usuario");
  }

  const { id, role, memberRole, fullName } = parsed.data;

  if (id === session.user.id && role !== "admin") {
    redirect("/admin/usuarios?erro=proprio-papel");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();
  if (!target) {
    redirect("/admin/usuarios?erro=usuario-inexistente");
  }

  if (target.role === "admin" && role !== "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      redirect("/admin/usuarios?erro=ultimo-admin");
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", id);
  if (profileError) {
    console.error("[updateUser] falha ao salvar perfil", { id, profileError });
    redirect("/admin/usuarios?erro=salvar-usuario");
  }

  // O vínculo anterior vem escondido no formulário. Só aquele é removido: um
  // usuário pode estar em mais de uma empresa (a PK é o par), e apagar tudo
  // por "sem vínculo" derrubaria um vínculo que a tela nem mostrava.
  const currentBusinessId = parseBusinessId(formData.get("currentBusinessId"));
  const businessId = parseBusinessId(formData.get("businessId"));

  // Um id não inteiro nos dois campos é o mesmo erro: o formulário foi
  // adulterado ou veio de uma empresa que não existe mais.
  if (businessId === undefined || currentBusinessId === undefined) {
    redirect("/admin/usuarios?erro=salvar-usuario");
  }

  // Cliente não tem empresa. Sem esta guarda o select de empresa era aceito e
  // o vínculo era simplesmente ignorado três linhas abaixo, sem aviso nenhum.
  if (businessId !== null && role === "customer") {
    redirect("/admin/usuarios?erro=cliente-com-empresa");
  }

  if (currentBusinessId !== null && currentBusinessId !== businessId) {
    const { error } = await supabase
      .from("business_members")
      .delete({ count: "exact" })
      .eq("business_id", currentBusinessId)
      .eq("user_id", id);
    if (error) {
      console.error("[updateUser] falha ao remover vínculo", { id, error });
      redirect("/admin/usuarios?erro=salvar-usuario");
    }
  }

  if (businessId !== null && role !== "customer") {
    const { error } = await supabase.from("business_members").upsert(
      { business_id: businessId, user_id: id, role: memberRole },
      { onConflict: "business_id,user_id" },
    );
    if (error) {
      console.error("[updateUser] falha ao vincular empresa", { id, error });
      redirect("/admin/usuarios?erro=salvar-usuario");
    }
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  redirect("/admin/usuarios?feito=usuario-salvo");
}

export async function changePassword(formData: FormData) {
  const session = await requireAdmin();

  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect("/admin/usuarios?erro=senha-invalida");
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(
    session.user.id,
    { password: parsed.data.password },
  );
  if (error) {
    console.error("[changePassword] falha ao alterar senha", error);
    redirect("/admin/usuarios?erro=trocar-senha");
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?feito=senha-trocada");
}

/** Remove a conta no GoTrue; a FK `profiles.id` derruba o perfil em cascade. */
export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) {
    redirect("/admin/usuarios?erro=usuario-inexistente");
  }
  if (id === session.user.id) {
    redirect("/admin/usuarios?erro=proprio-conta");
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) {
    console.error("[deleteUser] falha ao remover", { id, error });
    redirect("/admin/usuarios?erro=remover-usuario");
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  redirect("/admin/usuarios?feito=usuario-removido");
}