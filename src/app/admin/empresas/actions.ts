"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { businessStatusSchema } from "@/lib/business-status";
import { hoursFromEntries } from "@/lib/format";
import { digitsOnly, normalizeSubdomain, slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { normalizeExternalUrl } from "@/lib/url";
import type { BusinessFormState, CategoryState, MenuLinkState } from "./state";

const FULFILLMENTS = ["delivery", "pickup"] as const;
const PAYMENTS = ["pix", "dinheiro", "cartao_entrega", "cartao_online"] as const;

/** O `OpeningHoursField` manda `hours.<dia>=HH:MM-HH:MM`. */
function hoursFromForm(formData: FormData): Record<string, string> {
  const hours: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("hours.")) hours[key.slice(6)] = String(value);
  }
  return hours;
}

/**
 * Acende a flag "no ar" de um rascunho.
 *
 * Antes existia `?publicar=1` no link do painel. virar isso em rota prÃ³pria
 * evita que um link com efeito colado no editor de texto seja clicado.
 */
export async function publishBusiness(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  // Sem checar o erro, uma empresa podia não ir ao ar e o admin ver o mesmo
  // "no ar" da tela que já estava em rascunho — nada indicava a falha.
  const { error } = await supabase
    .from("businesses")
    .update({ status: "active" })
    .eq("id", id);

  if (error) return;

  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath("/");
  revalidatePath("/loja");
}

const menuUrlSchema = z.object({
  id: z.coerce.number().int().positive("Empresa inválida."),
  menuUrl: z.string().trim().max(500, "Link longo demais."),
});

/**
 * Grava — ou apaga — o cardápio de fora da empresa.
 *
 * Action separada do `updateBusiness` porque o link mora no cartão "Cardápio"
 * da lateral, com um botão próprio. Se entrasse no formulário grande, salvar
 * qualquer outro campo da empresa reescreveria `menu_url` a partir de um
 * campo que esse formulário nem tem, e o link sumiria sozinho.
 *
 * Campo vazio é "sem cardápio de fora", e é assim que a página pública volta a
 * mostrar só o WhatsApp.
 */
export async function saveBusinessMenuUrl(
  _prev: MenuLinkState,
  formData: FormData,
): Promise<MenuLinkState> {
  await requireAdmin();

  const parsed = menuUrlSchema.safeParse({
    id: formData.get("id"),
    menuUrl: formData.get("menuUrl") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Confira o link.",
      saved: false,
    };
  }

  const menuUrl = normalizeExternalUrl(parsed.data.menuUrl);
  // `normalizeExternalUrl` devolve `null` em dois casos que precisam de
  // respostas diferentes: campo vazio (que é o certo) e link com esquema
  // inválido (`javascript:alert(1)`, que não é). Sem esta distinção o segundo
  // viraria "campo vazio" e apagaria o link sem dizer nada.
  if (menuUrl === null && parsed.data.menuUrl !== "") {
    return {
      error: "Cole um link começando com http:// ou https://.",
      saved: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ menu_url: menuUrl })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message, saved: false };

  revalidatePath("/admin/empresas");
  revalidatePath(`/admin/empresas/${parsed.data.id}`);
  revalidatePath(`/cidades/[cidade]/empresa/[slug]`, "page");
  return { error: null, saved: true };
}

const schema = z.object({
  cityId: z.coerce.number().int().positive("Escolha a cidade."),
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Use apenas letras minÃºsculas, nÃºmeros e hÃ­fen.")
    .optional()
    .or(z.literal("")),
  customSlug: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  logoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  coverUrl: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().max(160).optional().or(z.literal("")),
  instagram: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  neighborhood: z.string().trim().max(120).optional().or(z.literal("")),
  pixKey: z.string().trim().max(140).optional().or(z.literal("")),
  deliveryFeeReais: z.coerce.number().min(0).max(10000).default(0),
  minOrderReais: z.coerce.number().min(0).max(100000).default(0),
  fulfillment: z.array(z.enum(FULFILLMENTS)).default([]),
  paymentMethods: z.array(z.enum(PAYMENTS)).default([]),
  acceptQuotes: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  status: businessStatusSchema.default("draft"),
});

function fieldErrorsFrom(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createBusiness(
  _prev: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    cityId: formData.get("cityId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    customSlug: formData.get("customSlug"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    coverUrl: formData.get("coverUrl"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    instagram: formData.get("instagram"),
    address: formData.get("address"),
    neighborhood: formData.get("neighborhood"),
    pixKey: formData.get("pixKey"),
    deliveryFeeReais: formData.get("deliveryFeeReais") || 0,
    minOrderReais: formData.get("minOrderReais") || 0,
    fulfillment: formData.getAll("fulfillment"),
    paymentMethods: formData.getAll("paymentMethods"),
    acceptQuotes: formData.get("acceptQuotes") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    status: formData.get("status") || "draft",
  });

  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const slug = data.slug || slugify(data.name);
  if (slug.length < 2) {
    return {
      error: "NÃ£o foi possÃ­vel gerar o endereÃ§o da pÃ¡gina a partir do nome.",
      fieldErrors: { slug: "Informe o endereÃ§o manualmente." },
    };
  }

  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("businesses")
    .insert({
      city_id: data.cityId,
      name: data.name,
      slug,
      custom_slug: normalizeSubdomain(data.customSlug ?? ""),
      description: data.description || null,
      logo_url: data.logoUrl || null,
      cover_url: data.coverUrl || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp ? digitsOnly(data.whatsapp) : null,
      email: data.email || null,
      instagram: data.instagram || null,
      address: data.address || null,
      neighborhood: data.neighborhood || null,
      opening_hours: hoursFromEntries(hoursFromForm(formData)),
      pix_key: data.pixKey || null,
      delivery_fee_cents: Math.round(data.deliveryFeeReais * 100),
      min_order_cents: Math.round(data.minOrderReais * 100),
      fulfillment: data.fulfillment,
      payment_methods: data.paymentMethods,
      accepts_quote: data.acceptQuotes,
      is_featured: data.isFeatured,
      status: data.status,
      source: "admin",
    })
    .select("id")
    .single();

  if (error || !created) {
    const duplicated = error?.code === "23505";
    return {
      error: duplicated
        ? "JÃ¡ existe uma empresa com esse endereÃ§o ou subdomÃ­nio. Escolha outro."
        : (error?.message ?? "NÃ£o foi possÃ­vel salvar."),
      fieldErrors: {},
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath("/");
  revalidatePath("/loja");
  redirect(`/admin/empresas/${created.id}?criado=1`);
}

export async function updateBusiness(
  _prev: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Empresa invÃ¡lida.", fieldErrors: {} };

  const parsed = schema.safeParse({
    cityId: formData.get("cityId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    customSlug: formData.get("customSlug"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    coverUrl: formData.get("coverUrl"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    instagram: formData.get("instagram"),
    address: formData.get("address"),
    neighborhood: formData.get("neighborhood"),
    pixKey: formData.get("pixKey"),
    deliveryFeeReais: formData.get("deliveryFeeReais") || 0,
    minOrderReais: formData.get("minOrderReais") || 0,
    fulfillment: formData.getAll("fulfillment"),
    paymentMethods: formData.getAll("paymentMethods"),
    acceptQuotes: formData.get("acceptQuotes") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    status: formData.get("status") || "draft",
  });

  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const slug = data.slug || slugify(data.name);
  const supabase = await createClient();

  const { error } = await supabase
    .from("businesses")
    .update({
      city_id: data.cityId,
      name: data.name,
      slug,
      custom_slug: normalizeSubdomain(data.customSlug ?? ""),
      description: data.description || null,
      logo_url: data.logoUrl || null,
      cover_url: data.coverUrl || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp ? digitsOnly(data.whatsapp) : null,
      email: data.email || null,
      instagram: data.instagram || null,
      address: data.address || null,
      neighborhood: data.neighborhood || null,
      opening_hours: hoursFromEntries(hoursFromForm(formData)),
      pix_key: data.pixKey || null,
      delivery_fee_cents: Math.round(data.deliveryFeeReais * 100),
      min_order_cents: Math.round(data.minOrderReais * 100),
      fulfillment: data.fulfillment,
      payment_methods: data.paymentMethods,
      accepts_quote: data.acceptQuotes,
      is_featured: data.isFeatured,
      status: data.status,
    })
    .eq("id", id);

  if (error) {
    const duplicated = error.code === "23505";
    return {
      error: duplicated
        ? "JÃ¡ existe uma empresa com esse endereÃ§o ou subdomÃ­nio."
        : error.message,
      fieldErrors: {},
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath(`/admin/empresas/${id}`);
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath(`/cidades/[cidade]/empresa/[slug]`, "page");
  return { error: null, fieldErrors: {}, saved: true };
}

/** Liga/desliga a empresa numa categoria da home (substitui o `data-ta-groups`). */
export async function setBusinessCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  await requireAdmin();
  const businessId = Number(formData.get("businessId"));
  const categoryId = Number(formData.get("categoryId"));
  const active = formData.get("active") === "on";
  if (!Number.isInteger(businessId) || !Number.isInteger(categoryId)) {
    return { error: "Empresa ou categoria inválida.", saved: false };
  }

  const supabase = await createClient();
  const gravacao = active
    ? await supabase
        .from("business_categories")
        .upsert({ business_id: businessId, category_id: categoryId, is_primary: false })
    : await supabase
        .from("business_categories")
        .delete()
        .eq("business_id", businessId)
        .eq("category_id", categoryId);

  // Sem este check a falha era muda: o checkbox ficava marcado na tela e sumia
  // no próximo reload, sem nenhuma pista do motivo.
  if (gravacao.error) return { error: gravacao.error.message, saved: false };

  revalidatePath(`/admin/empresas/${businessId}`);
  revalidatePath("/");
  revalidatePath("/loja");
  return { error: null, saved: active };
}

export async function deleteBusiness(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  // `select` volta as linhas realmente apagadas: um 204 com 0 linhas é o
  // PostgREST respondendo a um DELETE que a RLS barrou, e redirecionar com
  // "excluída=1" nesse caso seria mentir para o admin.
  const { data, error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", id)
    .select("id");

  if (error || !data?.length) return;

  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath(`/cidades/[cidade]/empresa/[slug]`, "page");
  redirect("/admin/empresas?feito=empresa-excluida");
}
