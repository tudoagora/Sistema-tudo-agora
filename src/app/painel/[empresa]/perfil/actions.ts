"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { requireBusinessMember } from "@/lib/auth";
import { hoursFromEntries, digitsOnly } from "@/lib/format";
import { revalidateMenu } from "@/lib/menu/revalidate";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = {
  error: string | null;
  saved: boolean;
  fieldErrors: Record<string, string>;
};

const phone = z
  .string()
  .trim()
  .max(40)
  .refine((v) => v === "" || digitsOnly(v).length >= 10, {
    message: "Telefone incompleto.",
  });

const FULFILLMENTS = ["delivery", "pickup"] as const;
const PAYMENTS = ["pix", "dinheiro", "cartao_entrega", "cartao_online"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120),
  description: z.string().trim().max(1000),
  logoUrl: z.string().trim().max(500),
  coverUrl: z.string().trim().max(500),
  phone,
  whatsapp: phone,
  email: z.union([z.literal(""), z.email("E-mail inválido.")]),
  instagram: z.string().trim().max(80),
  address: z.string().trim().max(240),
  neighborhood: z.string().trim().max(120),
  pixKey: z.string().trim().max(140),
  deliveryFeeReais: z.coerce.number().min(0).max(10000).default(0),
  minOrderReais: z.coerce.number().min(0).max(100000).default(0),
  fulfillment: z.array(z.enum(FULFILLMENTS)).default([]),
  paymentMethods: z.array(z.enum(PAYMENTS)).default([]),
  acceptQuotes: z.boolean().default(false),
});

const HOURS_PREFIX = "hours.";

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Atualiza os dados da empresa pelo lojista.
 *
 * Diferente de `updateBusiness` (admin), esta action nao aceita — nem mesmo
 * em campo escondido — `status`, `is_featured`, `city_id`, `slug` ou
 * `custom_slug`. Quem publica a loja continua sendo o admin; o lojista dono
 * controla o conteudo. O trigger `businesses_guard_admin_columns`
 * (migration 0008) fecha a mesma regra no banco.
 */
export async function updateBusinessProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const businessId = Number(formData.get("businessId"));
  if (!Number.isInteger(businessId)) {
    return { error: "Empresa inválida.", saved: false, fieldErrors: {} };
  }
  await requireBusinessMember(businessId);

  const hours: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(HOURS_PREFIX)) {
      hours[key.slice(HOURS_PREFIX.length)] = String(value);
    }
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
    coverUrl: formData.get("coverUrl") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    instagram: formData.get("instagram") ?? "",
    address: formData.get("address") ?? "",
    neighborhood: formData.get("neighborhood") ?? "",
    pixKey: formData.get("pixKey") ?? "",
    deliveryFeeReais: formData.get("deliveryFeeReais") || 0,
    minOrderReais: formData.get("minOrderReais") || 0,
    fulfillment: formData.getAll("fulfillment"),
    paymentMethods: formData.getAll("paymentMethods"),
    acceptQuotes: formData.get("acceptQuotes") === "on",
  });

  if (!parsed.success) {
    return {
      error: "Confira os campos destacados.",
      saved: false,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  if (data.fulfillment.length === 0) {
    return {
      error: "Escolha pelo menos uma forma de entrega.",
      saved: false,
      fieldErrors: {},
    };
  }
  if (data.paymentMethods.length === 0) {
    return {
      error: "Escolha pelo menos uma forma de pagamento.",
      saved: false,
      fieldErrors: {},
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: data.name,
      description: data.description || null,
      logo_url: data.logoUrl || null,
      cover_url: data.coverUrl || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp ? digitsOnly(data.whatsapp) : null,
      email: data.email || null,
      instagram: data.instagram || null,
      address: data.address || null,
      neighborhood: data.neighborhood || null,
      pix_key: data.pixKey || null,
      delivery_fee_cents: Math.round(data.deliveryFeeReais * 100),
      min_order_cents: Math.round(data.minOrderReais * 100),
      fulfillment: data.fulfillment,
      payment_methods: data.paymentMethods,
      opening_hours: hoursFromEntries(hours),
      accepts_quote: data.acceptQuotes,
    })
    .eq("id", businessId);

  if (error) {
    // 42501 aqui é o trigger `businesses_guard_admin_columns` recusando: a
    // action não manda status/slug, mas vale a mensagem precisa.
    if (error.code === "42501") {
      return {
        error: "Algum campo alterado é exclusivo do administrador.",
        saved: false,
        fieldErrors: {},
      };
    }
    return { error: error.message, saved: false, fieldErrors: {} };
  }

  revalidatePath(`/painel/${businessId}`);
  revalidatePath(`/painel/${businessId}/perfil`);
  revalidatePath(`/admin/empresas/${businessId}`);
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath("/cidades/[cidade]/empresa/[slug]", "page");
  revalidateMenu(businessId);
  return { error: null, saved: true, fieldErrors: {} };
}

/** Envia o lojista de volta para o cardápio depois de salvar. */
export async function backToMenu(formData: FormData) {
  const businessId = Number(formData.get("businessId"));
  redirect(`/painel/${businessId}/cardapio` as never);
}
