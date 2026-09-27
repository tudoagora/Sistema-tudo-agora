/**
 * Fixture de desenvolvimento: cria o admin, um lojista sem admin e a
 * "Pizzaria do Teste" com cardapio completo.
 *
 *   node supabase/seed-dev.mjs
 *
 * `supabase db reset` recria o banco e apaga auth.users, entao este script
 * precisa rodar de novo depois de cada reset. Nao faz parte do seed.sql
 * porque guarda senha em texto puro e so existe para a maquina local.
 */
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync("D:/Projetos IA/TudoAgoraApp/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function rest(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const rows = (path, body) => rest(path, { method: "POST", body, prefer: "return=representation" });

async function createUser(email, password, fullName) {
  const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`createUser ${email} -> ${res.status} ${JSON.stringify(json)}`);
  return json.id;
}

const HOURS = {
  tue: [["18:00", "23:00"]],
  wed: [["18:00", "23:00"]],
  thu: [["18:00", "23:00"]],
  fri: [["18:00", "23:30"]],
  sat: [["18:00", "23:30"]],
  sun: [["18:00", "22:00"]],
};

const IMG = { comida: "/grupos/comida.jpg", bebida: "/grupos/bebida.jpg", doce: "/grupos/sorvetes.jpg" };

async function main() {
  const adminId = await createUser("germanoreis2024@gmail.com", "1704mano", "Germano Reis");
  await rest(`profiles?id=eq.${adminId}`, { method: "PATCH", body: { role: "admin" } });
  console.log("admin   ", adminId, "germanoreis2024@gmail.com");

  const merchantId = await createUser("pizzaria.teste@teste.com", "1704mano", "Pizzaria do Teste");
  await rest(`profiles?id=eq.${merchantId}`, { method: "PATCH", body: { role: "merchant" } });
  console.log("merchant", merchantId, "pizzaria.teste@teste.com");

  const [biz] = await rows("businesses", {
    city_id: 1,
    name: "Pizzaria do Teste",
    slug: "pizzaria-do-teste",
    custom_slug: "pizzaria-do-teste",
    description: "Pizzaria artesanal de teste, criada para validar o cardapio digital do Tudo Agora.",
    phone: "65999990000",
    whatsapp: "5565999990000",
    address: "Rua das Pizzas, 123 - Centro",
    neighborhood: "Centro",
    opening_hours: HOURS,
    fulfillment: ["delivery", "pickup"],
    payment_methods: ["pix", "dinheiro", "cartao_entrega"],
    pix_key: "pizzariadoteste@teste.com",
    delivery_fee_cents: 800,
    min_order_cents: 2000,
    status: "active",
    source: "seed-teste",
  });
  console.log("empresa ", biz.id, biz.custom_slug);

  for (const slug of ["pizzas", "restaurantes"]) {
    const cat = await rest(`categories?slug=eq.${slug}&select=id`);
    if (cat[0]) await rows("business_categories", { business_id: biz.id, category_id: cat[0].id, is_primary: slug === "pizzas" });
  }

  const sections = [
    ["Entradas", "entradas"],
    ["Pizzas", "pizzas"],
    ["Bebidas", "bebidas"],
    ["Sobremesas", "sobremesas"],
    ["Combos", "combos"],
    ["Promocoes", "promocoes"],
  ];
  const catIds = {};
  for (const [i, [name, slug]] of sections.entries()) {
    const [row] = await rows("menu_categories", { business_id: biz.id, name, slug, sort_order: i + 1, is_active: true });
    catIds[slug] = row.id;
  }
  console.log("secoes  ", Object.keys(catIds).length);

  const groups = {};
  // isFlavor marca o grupo como "sabores": os valores passam a ter preço
  // CHEIO em price_delta_cents e a pizza cobra o sabor mais caro entre os
  // escolhidos (modelo Yooga). Um grupo de sabores por tamanho, porque o
  // preço do sabor muda com o tamanho da pizza.
  const mkGroup = async (name, min, max, required, sort, values, isFlavor = false) => {
    const [g] = await rows("option_groups", {
      business_id: biz.id, name, min_select: min, max_select: max, is_required: required, sort_order: sort, is_flavor_group: isFlavor,
    });
    groups[name] = g.id;
    for (const [i, [vname, delta, available]] of values.entries()) {
      await rows("option_values", { option_group_id: g.id, name: vname, price_delta_cents: delta, is_available: available, sort_order: i + 1 });
    }
  };
  await mkGroup("Borda", 0, 1, false, 1, [["Sem borda", 0, true], ["Catupiry", 800, true], ["Cheddar", 900, true], ["Portuguesa", 1200, true]]);
  await mkGroup("Molho", 1, 1, true, 2, [["Molho de tomate", 0, true], ["Molho branco", 300, true], ["Molho pesto", 400, true]]);
  await mkGroup("Extras", 0, 3, false, 3, [["Bacon", 700, true], ["Milho", 500, false], ["Azeitona", 500, true], ["Catupiry extra", 700, true]]);
  await mkGroup("Sabores - Media", 1, 2, true, 4, [["Margherita", 4000, true], ["Calabresa", 4300, true], ["Portuguesa", 4700, true], ["Quatro Queijos", 5000, true], ["Vegetariana", 4600, true]], true);
  await mkGroup("Sabores - Grande", 1, 3, true, 5, [["Margherita", 4500, true], ["Calabresa", 4800, true], ["Portuguesa", 5200, true], ["Quatro Queijos", 5500, true], ["Vegetariana", 5100, true]], true);
  await mkGroup("Sabores - Familia", 1, 4, true, 6, [["Margherita", 6000, true], ["Calabresa", 6300, true], ["Portuguesa", 6700, true], ["Quatro Queijos", 7000, true], ["Vegetariana", 6600, true]], true);
  console.log("grupos  ", Object.keys(groups).length);

  // O produto da seção "pizzas" agora é o TAMANHO/FORMATO, não o sabor: o
  // cliente escolhe os sabores ao abrir o produto. price_cents fica com o
  // sabor mais barato — é o "a partir de" que a vitrine mostra quando o
  // grupo de sabores some (fallback), mas o card já calcula do grupo.
  const products = [
    ["entradas", "Paes de alho", "4 unidades assadas no forno com manteiga e ervas.", 1200, 0, false, true, 1, null],
    ["entradas", "Batata frita crocante", "Porcao de 400g com sal e páprica.", 1800, 2200, false, true, 2, null],
    ["entradas", "Bruschetta", "Quatro fatias com tomate, alho e manjericao.", 2100, 0, false, true, 3, null],
    ["pizzas", "Pizza Media - 2 sabores", "6 fatias. Escolha ate 2 sabores; paga o valor do sabor mais caro.", 4000, 0, false, true, 1, ["Sabores - Media", "Borda", "Molho", "Extras"]],
    ["pizzas", "Pizza Grande - 3 sabores", "8 fatias. Escolha ate 3 sabores; paga o valor do sabor mais caro.", 4500, 5200, true, true, 2, ["Sabores - Grande", "Borda", "Molho", "Extras"]],
    ["pizzas", "Pizza Familia - 4 sabores", "12 fatias. Escolha ate 4 sabores; paga o valor do sabor mais caro.", 6000, 0, false, true, 3, ["Sabores - Familia", "Borda", "Molho", "Extras"]],
    ["bebidas", "Coca-Cola Lata 350ml", "Bem gelada.", 600, 0, false, true, 1, null],
    ["bebidas", "Guarana Antarctica 350ml", "Bem gelado.", 600, 0, false, true, 2, null],
    ["bebidas", "Suco de laranja natural 500ml", "Feito na hora, sem acucar.", 900, 0, false, true, 3, null],
    ["bebidas", "Agua mineral 500ml", "Com ou sem gas.", 400, 0, false, true, 4, null],
    ["bebidas", "Cerveja long neck", "Heineken, Brahma ou Original.", 900, 1200, false, true, 5, null],
    ["sobremesas", "Petit Gateau", "Bolinho quente com sorvete de creme.", 1600, 0, false, true, 1, null],
    ["sobremesas", "Picole de creme", "Picole artesanal de creme com cobertura.", 800, 0, false, true, 2, null],
    ["combos", "Combo Familia - 2 pizzas", "Duas pizzas medias de 2 sabores + refrigerante lata.", 9900, 11500, true, true, 1, null],
    ["combos", "Combo Individual", "Uma pizza media + refrigerante + sobremesa.", 6800, 0, false, true, 2, null],
    ["promocoes", "Terca em Dobro", "Na terca, duas pizzas grandes pelo preco de uma.", 9900, 0, true, true, 1, null],
    ["promocoes", "Borda gratis na quarta", "Toda pizza com borda catupiry por nossa conta.", 0, 0, false, false, 2, null],
  ];

  const created = {};
  for (const [cat, name, description, price, compare, featured, available, sort, optGroups] of products) {
    const image = cat === "bebidas" ? IMG.bebida : cat === "sobremesas" ? IMG.doce : cat === "promocoes" ? null : IMG.comida;
    const [p] = await rows("products", {
      business_id: biz.id,
      menu_category_id: catIds[cat],
      name,
      description,
      price_cents: price,
      compare_at_cents: compare,
      is_featured: featured,
      is_available: available,
      sort_order: sort,
      image_url: image,
      source: "seed-teste",
    });
    created[name] = p;
    for (const g of optGroups ?? []) await rows("product_option_groups", { product_id: p.id, option_group_id: groups[g] });
  }
  console.log("produtos", Object.keys(created).length, "| pausados:", products.filter((p) => !p[6]).length);

  await rows("business_members", { business_id: biz.id, user_id: merchantId, role: "owner" });
  console.log("vinculo ", "owner na empresa", biz.id);

  console.log("\n--- para testar ---");
  console.log("admin   : germanoreis2024@gmail.com / 1704mano");
  console.log("lojista : pizzaria.teste@teste.com  / 1704mano");
  console.log("vitrine : http://localhost:3000/cardapio/pizzaria-do-teste");
  console.log("painel  : http://localhost:3000/painel/" + biz.id + "/cardapio");
  console.log("pedidos : http://localhost:3000/painel/" + biz.id + "/pedidos");
}

main().catch((err) => {
  console.error("FALHOU:", err.message);
  process.exit(1);
});
