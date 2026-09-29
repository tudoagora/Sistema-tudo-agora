"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSession } from "@/lib/auth";
import { isPaymentAccepted } from "@/lib/order";
import { digitsOnly, formatBRL } from "@/lib/format";
import { lineUnitPriceCents } from "@/lib/pricing";
import type { MenuItem } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type OrderState = {
  code: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
};

/** Uma linha do carrinho, como o cliente a mandou. */
export type CartLine = {
  productId: number;
  quantity: number;
  /**
   * Ids dos valores de opção escolhidos, incluindo os sabores. No modelo por
   * tamanho o sabor é uma opção comum (do grupo `is_flavor_group`), então não
   * existe campo separado de "metades" — tudo vem aqui.
   */
  optionValueIds: number[];
  notes: string;
};

const MAX_LINES = 40;
const MAX_QTY = 99;

/**
 * Alfabeto sem I, L, O e U — o código do pedido é lido em voz alta ao telefone
 * e anotado à mão. 34^5 ≈ 45 milhões de combinações.
 */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ";

function orderCode(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `TA-${code}`;
}

/**
 * Desfaz o pedido inteiro quando uma etapa depois da criação falha.
 * `order_items` e `order_item_options` caem por cascade, então um DELETE no
 * pedido limpa tudo. Sem isso o cliente receberia um código que aponta para um
 * registro pela metade.
 */
async function discardOrder(admin: SupabaseClient<Database>, orderId: number) {
  const { error } = await admin.from("orders").delete().eq("id", orderId);
  // Não há UI para mostrar nada aqui: este rollback roda depois que a criação
  // do pedido já falhou. A única forma de o pedido pela metade aparecer no banco
  // e não sumir silenciosamente é deixar o registro, então ele vai para o log.
  if (error) {
    console.error("[placeOrder] rollback falhou, pedido orfao", { orderId, error });
  }
}

const lineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(MAX_QTY),
  optionValueIds: z.array(z.number().int().positive()).max(20).default([]),
  notes: z.string().max(200).default(""),
});

const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Informe seu nome.").max(120),
  customerPhone: z
    .string()
    .trim()
    .transform((value) => digitsOnly(value))
    .refine((value) => value.length >= 10, "Informe um telefone com DDD."),
  customerEmail: z.union([z.literal(""), z.email("E-mail inválido.")]).default(""),
  fulfillment: z.enum(["delivery", "pickup"]),
  address: z.string().trim().max(300).default(""),
  paymentMethod: z.string().trim().min(1),
  notes: z.string().trim().max(500).default(""),
  lines: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Pedido inválido." });
        return z.NEVER;
      }
    })
    .pipe(z.array(lineSchema).min(1, "Adicione ao menos um item.").max(MAX_LINES)),
});

/* ------------------------------------------------------------------ */

/**
 * Cria o pedido a partir do cardápio, não a partir do que o navegador mandou.
 *
 * Nada do que o cliente envia sobre dinheiro é usado: preço, disponibilidade,
 * opções, taxa e pedido mínimo saem todos do banco. A Service Role é usada
 * porque `orders` não tem policy de INSERT (a migration 0003 commenta que a
 * gravação é server-side), o que significa que TODA a validação mora aqui —
 * é por isso que o carrinho não envia valor nenhum.
 */
export async function placeOrder(
  _prev: OrderState,
  formData: FormData,
): Promise<OrderState> {
  const businessId = Number(formData.get("businessId"));
  if (!Number.isInteger(businessId)) {
    return { code: null, error: "Empresa inválida.", fieldErrors: {} };
  }

  const parsed = orderSchema.safeParse({
    customerName: formData.get("customerName") ?? "",
    customerPhone: formData.get("customerPhone") ?? "",
    customerEmail: formData.get("customerEmail") ?? "",
    fulfillment: formData.get("fulfillment") ?? "",
    address: formData.get("address") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    notes: formData.get("notes") ?? "",
    lines: formData.get("lines") ?? "[]",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { code: null, error: null, fieldErrors };
  }

  const input = parsed.data;
  const admin = createAdminClient();

  /* --- empresa e cardápio, lidos do banco --- */

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select(
      "id, name, status, fulfillment, payment_methods, delivery_fee_cents, min_order_cents",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    return {
      code: null,
      error: "Não conseguimos falar com a empresa agora. Tente de novo.",
      fieldErrors: {},
    };
  }
  if (!business || business.status !== "active") {
    return { code: null, error: "Este cardápio não está no ar.", fieldErrors: {} };
  }

  // Mesma RPC da vitrine: já vem filtrada por `is_available` e por seção ativa,
  // então um item pausado simplesmente não existe aqui.
  const { data: rawMenu, error: menuError } = await admin.rpc("get_business_menu", {
    p_business_id: businessId,
  });
  if (menuError || !rawMenu) {
    return {
      code: null,
      error: "O cardápio mudou enquanto você escolhia. Recarregue a página.",
      fieldErrors: {},
    };
  }

  // O tipo real do cardápio, o mesmo que a vitrine consome. A forma local e
  // estreita que existed aqui listava campo por campo e já tinha ficado
  // atrás da RPC uma vez — foi por isso que o meio a meio não tinha como ser
  // validado no servidor sem reescrever o cast.
  const menuItems = (rawMenu as unknown as { items: MenuItem[] }).items;

  const catalog = new Map(menuItems.map((item) => [item.id, item]));

  if (!business.fulfillment.includes(input.fulfillment)) {
    return {
      code: null,
      error: "A empresa não atende essa modalidade.",
      fieldErrors: { fulfillment: "Escolha entre as opções disponíveis." },
    };
  }
  if (!isPaymentAccepted(business.payment_methods, input.paymentMethod)) {
    return {
      code: null,
      error: "Essa forma de pagamento não é aceita.",
      fieldErrors: { paymentMethod: "Escolha uma forma disponível." },
    };
  }
  if (input.fulfillment === "delivery" && !input.address) {
    return {
      code: null,
      error: null,
      fieldErrors: { address: "Informe o endereço de entrega." },
    };
  }

  /* --- validação e preço de cada linha --- */

  const items: {
    productId: number | null;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes: string;
    options: { group: string; name: string; delta: number }[];
  }[] = [];

  for (const line of input.lines) {
    const product = catalog.get(line.productId);
    if (!product) {
      return {
        code: null,
        error: `"${line.productId}" saiu do cardápio. Remova e tente de novo.`,
        fieldErrors: {},
      };
    }

    // Só aceita valores que pertencem a um grupo deste item. Sem isso um
    // cliente poderia mandar o id de um "bacon extra" de outro produto e
    // usá-lo como desconto.
    const allowed = new Map<number, { group: string; name: string; delta: number }>();
    for (const group of product.option_groups) {
      for (const value of group.values) {
        allowed.set(value.id, {
          group: group.name,
          name: value.name,
          delta: value.price_delta_cents,
        });
      }
    }

    const chosen = [...new Set(line.optionValueIds)];
    for (const valueId of chosen) {
      if (!allowed.has(valueId)) {
        return {
          code: null,
          error: `A escolha em ${product.name} não existe mais.`,
          fieldErrors: {},
        };
      }
    }

    // As mesmas regras que o `MenuList` aplica na vitrine, refeitas aqui porque
    // o cliente pode ter alterado o payload.
    const perGroup = new Map<number, number>();
    for (const valueId of chosen) {
      const group = product.option_groups.find((g) =>
        g.values.some((value) => value.id === valueId),
      );
      if (!group) continue;
      perGroup.set(group.id, (perGroup.get(group.id) ?? 0) + 1);
    }
    for (const group of product.option_groups) {
      const count = perGroup.get(group.id) ?? 0;
      if (count > group.max_select) {
        return {
          code: null,
          error: `Em ${product.name} você pode escolher até ${group.max_select} de "${group.name}".`,
          fieldErrors: {},
        };
      }
      if (group.is_required && count < Math.max(1, group.min_select)) {
        return {
          code: null,
          error: `Escolha ${group.name} em ${product.name}.`,
          fieldErrors: {},
        };
      }
      if (count < group.min_select) {
        return {
          code: null,
          error: `Em ${product.name}, escolha ao menos ${group.min_select} de "${group.name}".`,
          fieldErrors: {},
        };
      }
    }

    const options = chosen.map((valueId) => allowed.get(valueId)!);

    // `chosen` é uma lista plana; o cálculo de preço trabalha com o formato
    // `groupId -> valueIds`, que é como a vitrine guarda. Os sabores são um
    // grupo de opção comum (`is_flavor_group`), então já estão em `chosen` e a
    // validação de mínimo/máximo por grupo acima já cobre "escolha de 1 a N
    // sabores". Não há campo separado de metades.
    const selection = Object.fromEntries(
      product.option_groups.map((g) => [
        g.id,
        chosen.filter((id) => g.values.some((v) => v.id === id)),
      ]),
    );

    items.push({
      productId: product.id,
      productName: product.name,
      // Preço vem do banco: o sabor mais caro entre os escolhidos + acréscimos.
      // O cliente nunca manda valor.
      unitPriceCents: lineUnitPriceCents(product, selection),
      quantity: line.quantity,
      notes: line.notes,
      options,
    });
  }

  /* --- totais --- */

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  if (subtotal < business.min_order_cents) {
    const faltando = business.min_order_cents - subtotal;
    return {
      code: null,
      error: `O pedido mínimo é de ${formatBRL(business.min_order_cents)} em itens. Faltam ${formatBRL(faltando)} — a taxa de entrega não conta para o mínimo.`,
      fieldErrors: {},
    };
  }

  const deliveryFee =
    input.fulfillment === "delivery" ? business.delivery_fee_cents : 0;
  const total = subtotal + deliveryFee;

  /* --- gravação --- */

  const session = await getSession();

  // O `public_id` é único e curto; 5 tentativas cobrem colisão real sem
  // transformar isso num loop infinito se algo estiver errado no banco.
  let order: { id: number; public_id: string } | null = null;
  for (let attempt = 0; attempt < 5 && order === null; attempt += 1) {
    const code = orderCode();
    const { data, error } = await admin
      .from("orders")
      .insert({
        public_id: code,
        business_id: business.id,
        customer_id: session?.user.id ?? null,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail || null,
        fulfillment: input.fulfillment,
        address: input.fulfillment === "delivery" ? input.address : null,
        status: "pending",
        payment_method: input.paymentMethod as never,
        subtotal_cents: subtotal,
        delivery_fee_cents: deliveryFee,
        discount_cents: 0,
        total_cents: total,
        notes: input.notes || null,
      })
      .select("id, public_id")
      .maybeSingle();

    if (error) {
      // 23505 aqui só pode ser o `public_id`; qualquer outra coisa é real.
      if (error.code === "23505") continue;
      return {
        code: null,
        error: "Não conseguimos registrar seu pedido. Tente de novo.",
        fieldErrors: {},
      };
    }
    if (data) order = data;
  }

  if (!order) {
    return {
      code: null,
      error: "Não conseguimos registrar seu pedido. Tente de novo.",
      fieldErrors: {},
    };
  }

  const { data: savedItems, error: itemsError } = await admin
    .from("order_items")
    .insert(
      items.map((item) => ({
        order_id: order!.id,
        product_id: item.productId,
        product_name: item.productName,
        unit_price_cents: item.unitPriceCents,
        quantity: item.quantity,
        notes: item.notes || null,
      })),
    )
    .select("id");

  if (itemsError || !savedItems || savedItems.length !== items.length) {
    await discardOrder(admin, order!.id);
    return {
      code: null,
      error: "Não conseguimos registrar seu pedido. Tente de novo em instantes.",
      fieldErrors: {},
    };
  }

  // Snapshot das opções: se a empresa renomear "Catupiry" para "Catupiry
  // artesanal" amanhã, o pedido de hoje continua mostrando o que foi pedido.
  const optionRows = items.flatMap((item, index) =>
    item.options.map((option) => ({
      order_item_id: savedItems[index].id,
      option_group_name: option.group,
      option_value_name: option.name,
      price_delta_cents: option.delta,
    })),
  );

  if (optionRows.length > 0) {
    const { error: optionsError } = await admin
      .from("order_item_options")
      .insert(optionRows);
    // Sem este check, o cliente receberia o código de um pedido em que as
    // escolhas dele sumiram — "sem cebola" que ele marcou chegaria na mesa
    // como "sem cebola" ausente. O pedido volta inteiro, então desfazemos.
    if (optionsError) {
      await discardOrder(admin, order!.id);
      return {
        code: null,
        error: "Não conseguimos registrar seu pedido. Tente de novo em instantes.",
        fieldErrors: {},
      };
    }
  }

  return { code: order.public_id, error: null, fieldErrors: {} };
}
