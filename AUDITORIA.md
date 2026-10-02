# Auditoria — TudoAgoraApp

Inventário de falhas, riscos e melhorias encontrados na leitura completa do
código (setembro/2026). Serve como fila de trabalho: cada item é corrigido,
marcado com `- [x]` e citado no commit.

**Como usar**

1. Abrir o item aqui, corrigir no código, marcar `- [x]`.
2. Anotar o commit na seção [Registro](#registro).
3. Ao pedir nova auditoria, esta lista é atualizada em vez de recomeçar.

**Legenda de prioridade**

| Nível | Significado |
| --- | --- |
| **P0** | Vazamento de dado, perda de dado ou dinheiro. Corrigir primeiro. |
| **P1** | Bug de comportamento visível para o usuário. |
| **P2** | UX, acessibilidade, performance. |
| **P3** | Higiene de código e dívida técnica. |

**Validação**: `npx tsc --noEmit` + `npm run lint`. O `npm run build` falha
neste ambiente (~40 erros `@vercel/turbopack-next/internal/font/google/font`)
porque `fonts.gstatic.com` é inalcançável no sandbox — é ambiental, não é bug.

**Estado do banco auditado**: Supabase de produção `ofpjiuwxlkqutspyipcy`,
sondado com a chave anônima (ver [P0-1](#p0-dados-e-segurança)).

---

## P0 — Dados e segurança

### P0-1 `businesses` inteiro é legível com a chave anônima

`supabase/migrations/20260101000003_rls.sql:99-100`

```sql
create policy businesses_public_read on public.businesses
  for select using (status = 'active');
```

Sem cláusula `to`, a policy vale para `anon`. Confirmado ao vivo: a chave
anônima lê `select=*` de toda empresa ativa, incluindo `pix_key`, `email`,
`whatsapp`, `latitude`, `longitude`, `search_text`, `source` e `legacy_wp_id`.

Exemplo real vazado na consulta: `{id: 54, name: "Pizzaria do Teste",
pix_key: "pizzariadoteste@teste.com", whatsapp: "5565999990000",
source: "seed-teste"}`.

Escrita está protegida (UPDATE com `anon` afeta 0 linhas). `orders`,
`order_items`, `business_members` e `profiles` também retornam 0 linhas para
`anon` — o problema é só a leitura de `businesses`.

- [ ] **Resolver**: colunas explícitas na policy ou, melhor, uma view/RPC
      pública com só o que a vitrine precisa (nome, slug, logo, cidade,
      contato público, categorias).
- [ ] Cortar `pix_key` e coordenadas do caminho público
      (ver [P0-2](#p0-2-pix_key-e-lista-de-businesses-trafegam-para-o-cliente)).

### P0-2 `pix_key` e a lista de empresas trafegam para o cliente

- `src/lib/catalog.ts:127` — `Menu.business` inclui `pix_key`; o objeto inteiro
  é entregue ao client component `Storefront`
  (`src/app/cardapio/[slug]/page.tsx:57`), então a chave Pix shippa no payload
  RSC de **todo visitante**.
- `src/lib/catalog.ts:262` — `getBusinessBySlug` usa `select("*, ...")` em rota
  pública: a linha completa trafega no servidor a cada visita e em
  `generateMetadata`.

- [ ] Definir um tipo público de empresa (sem `pix_key`, sem coordenadas, sem
      `search_*`, sem `legacy_*`) e usá-lo nas consultas de vitrine.

### P0-3 `option_values` e `product_option_groups` são lidas sem filtro de empresa

`src/lib/menu/load.ts:55-62` consulta as duas tabelas **sem** `.eq("business_id")`
(scan da tabela inteira) e filtra em JS na linha 73. Como
`option_values_public_read` (`migrations/0003:170`) permite leitura anônima, dados
de outros lojistas chegam ao editor de `/painel`.

- [ ] Filtrar no banco com `.eq("business_id", businessId)` e remover o filtro JS.

### P0-4 Escrita cross-tenant em grupos de opção

`src/lib/menu/actions.ts:851,860` — `linkProductToOptionGroup`/`unlink` não
validam que `optionGroupId` pertence à mesma empresa; a policy
`product_option_groups_manage` só checa o lado do produto. Mesmo padrão em
`createProduct:310` (`menuCategoryId`) e `createOptionValue:618`.

- [ ] Validar a empresa no servidor em todas as três actions.

### P0-5 Pedido gravado em três `INSERT` sem transação

`src/app/cardapio/[slug]/actions.ts:333,377,411` — `orders` → `order_items` →
`order_item_options`. A compensação `discardOrder:56` ignora o erro do `DELETE`,
podendo deixar pedido pela metade **com o código já entregue ao cliente**.

- [ ] RPC única no banco (`place_order`) ou transação explícita; a
      compensação tem de checar o erro e avisar quando falhar.

### P0-6 Service worker guarda HTML autenticado

`public/sw.js:63-71` — estratégia network-first grava **todo** same-origin no
Cache Storage sem excluir `/minha-conta`, `/painel/*`, `/admin/*`. Com a rede
caída, o HTML do usuário autenticado fica legível no dispositivo (inclusive
depois do logout, em device compartilhado).

- [ ] Ignorar no cache qualquer request autenticado e os prefixos acima.

### P0-7 Headers de segurança ausentes

`next.config.ts:53-79` — só há `X-Frame-Options`; faltam
`Content-Security-Policy`, `Strict-Transport-Security` e `Permissions-Policy`.
Existe `dangerouslySetInnerHTML` em `src/app/cardapio/[slug]/page.tsx:130`.

- [ ] Definir CSP (com `nonce` para o script hydration), HSTS e Permissions-Policy.

### P0-8 `remotePatterns` transforma a instância em proxy de imagem aberto

`next.config.ts:44-48` — `**.tudoagora.app.br` e
`tudagora.app.br/wp-content/uploads/**` permitem URL arbitrária nesses hosts.

- [ ] Restringir a padrões de caminho realmente usados.

### P0-9 Cookie de cidade sem `Secure`

`src/components/city-provider.tsx:41` — `document.cookie` grava `ta_cidade` sem
`Secure` (também vai em http) e sem prefixo `__Host-`.

- [ ] `Secure; SameSite=Lax; Path=/` + `__Host-`.

### P0-10 Rota de primeiro acesso pública e não atômica

`src/app/primeiro-acesso/page.tsx:16` + `actions.ts:39-48,54-65` — `hasAnyUser()`
e `createUser` não são atômicos: dois requests simultâneos criam dois admins em
deploy novo. A página também revela se o sistema já tem usuários. E se o
`promote` falhar depois do `create`, o usuário fica criado sem perfil admin e a
rota morre.

- [ ] Travar por advisory lock ou exigir token; reverter o usuário se o
      `promote` falhar; remover a rota depois do primeiro uso.

### P0-11 `placeOrder` público sem limite de chamadas

`src/app/cardapio/[slug]/actions.ts:103` — cada chamada faz 2 leituras + 3
`INSERT` com `service_role`. Sem rate limit ou captcha, é vetô de spam de
pedidos e de custo.

- [ ] Rate limit por IP/sessão no proxy ou middleware.

### P0-12 `backTo` do FormData vira `revalidatePath`

`src/app/painel/[empresa]/pedidos/actions.ts:48,76,137,163` — o lojista escolhe o
caminho invalidado, inclusive `/admin/*`. Usar o mesmo padrão já existente em
`src/lib/next-redirect.ts` (`safeNext`).

- [ ] Validar contra uma allowlist.

### P0-13 Cache público na busca sem `Vary` nem limite

`src/app/api/busca/route.ts:41` — `Cache-Control: public, max-age=30` em
resposta que varia por cookie de cidade: proxy compartilhado pode servir a
cidade errada. Sem `Vary` e sem rate limit.

- [ ] `private` ou `Vary: Cookie`, mais limite de chamadas.

---

## P1 — Bugs de comportamento

### P1-1 `status` da empresa é rejeitado pelo próprio formulário

`src/app/admin/empresas/actions.ts:71` aceita só `draft|active`, mas o `<select>`
em `src/components/business/business-form.tsx:483-484` oferece também
`suspended` e `closed`. Escolher qualquer um deles faz o save **sempre** falhar
com "Confira os campos destacados", e o erro de `status` nunca é renderizado.

- [ ] Alinhar as duas listas (ou derivar as opções do schema).

### P1-2 "Ver a página pública" dá 404 para empresa não ativa

`src/app/admin/empresas/[id]/page.tsx:57` — a rota pública filtra
`status = 'active'` (`src/lib/catalog.ts:272`). O link também vira
`/cidades//empresa/x` quando o fallback de cidade (linha 40) é vazio.

- [ ] Mostrar o link só para empresa ativa, com fallback de cidade válido.

### P1-3 `deltaFor` soma todos os deltas; o preço cobra só o sabor mais caro

`src/components/menu/menu-list.tsx:12,134` soma **todos** os deltas (inclusive
sabores) enquanto `src/lib/pricing.ts:63` cobra apenas o sabor mais caro. A
página pública da cidade mostra "Total com as escolhas" diferente do valor
cobrado na vitrine.

- [ ] Reusar a mesma regra de `pricing.ts` na vitrine.

### P1-4 `updateOrderStatus` não condiciona o status atual

`src/app/painel/[empresa]/pedidos/actions.ts:52,70` — valida só o status
**destino** (`statusSchema:16` aceita os 6), não lê o atual nem faz
`.eq("status", atual)`. Permite pular etapas, ressuscitar pedido cancelado e
sofre lost-update entre dois dispositivos.

- [ ] Ler o atual e condicionar o update; rejeitar transições inválidas.

### P1-5 `cancelOrder` tem TOCTOU

`src/app/painel/[empresa]/pedidos/actions.ts:110,127` — `SELECT` e `UPDATE` em
viagens separadas: pedido concluído entre as duas ainda é cancelado.

- [ ] Um `UPDATE ... WHERE status IN (...)` só.

### P1-6 `markOrderPaid` marca pago pedido cancelado

`src/app/painel/[empresa]/pedidos/actions.ts:157` — sem condição de status.

- [ ] Condicionar a `payment_status`.

### P1-7 `placeOrder` não revalida o painel de pedidos

`src/app/cardapio/[slug]/actions.ts:428` — a rota é estática e nada revalida
`/painel/[id]/pedidos`; o lojista não vê o pedido novo.

- [ ] Adicionar à revalidação (ver também [P2-9](#p2-9-contadores-do-painel-ficam-velhos)).

### P1-8 Upload acima de 1 MB é cortado antes da action

`next.config.ts:33` não define `serverActions.bodySizeLimit`; o default do Next
é 1 MB (ver `node_modules/next/dist/docs/.../serverActions.md:61`). O
`MAX_IMAGE_BYTES` de 5 MB em `src/lib/menu/actions.ts:20,482` é inalcançável e a
foto falha com erro genérico.

- [ ] `experimental: { serverActions: { bodySizeLimit: "6mb" } }`.

### P1-9 Reorder recusado fica na tela para sempre

`src/components/menu/menu-editor.tsx:405,544` — `sectionOrder`, `groupOrder` e
`valueOrder` nunca são resetados quando props novas chegam (o comentário em
401-403 afirma o contrário). O próximo arrasto reenvia a lista errada.

- [ ] Sincronizar as ordens com as props.

### P1-10 Card "Com cardápio" conta errado acima de 500 linhas

`src/app/admin/page.tsx:38` — conta `business_id` distintos dentro de
`limit(500)`.

- [ ] Agregar no banco (RPC) ou remover o limite.

### P1-11 Cidade nova nasce sem fuso

`src/app/admin/cidades/city-form.tsx:12-58` não tem campo `timezone`, mas a
página exibe "fuso {city.timezone}" (`cidades/page.tsx:45`). Toda cidade nova
nasce `America/Sao_Paulo`.

- [ ] Adicionar o campo ao formulário.

### P1-12 `?city=abc` na lista de empresas

`src/app/admin/empresas/page.tsx:33` — `Number(city)` sem validar gera
`city_id=eq.NaN` e a mensagem crua do PostgREST aparece na linha 120.

- [ ] Validar com zod antes de consultar.

### P1-13 Categorias inativas não são vinculáveis e o 3º nível some

`src/app/admin/empresas/[id]/page.tsx:44-46` — `listCategories()` já filtra
`is_active` (`src/lib/catalog.ts:479`) e o desenho é de 2 níveis com `filter`
O(n²) por categoria.

- [ ] Usar a lista completa para o desenho e agrupar em `Map` uma vez.

### P1-14 `is_primary` é inalcançável

`src/app/admin/empresas/actions.ts:279` grava `is_primary: false` fixo e nenhum
outro ponto de `src/` escreve o flag, consumido em
`src/lib/catalog.ts:298,303`.

- [ ] Expor a escolha de categoria principal ou remover o consumo.

### P1-15 Preview do cardápio usa o slug cru

`src/app/admin/empresas/[id]/cardapio/page.tsx:36-39` — `previewHref` usa `slug`
em vez de `resolveStorefrontSlug` (`src/lib/catalog.ts:396`): slug ambíguo entre
cidades aponta 404 e slug vazio gera `https://.dominio`.

- [ ] Usar `resolveStorefrontSlug`.

### P1-16 `unwrapAll` esconde erro de consulta

`src/app/painel/[empresa]/pedidos/page.tsx:106` — se o embed
`order_items(...order_item_options(...))` falhar, o lojista vê "Nenhum pedido
ainda" com pedidos no banco.

- [ ] Tratar o erro antes de listar.

### P1-17 Labels obrigatórios sem atributo `required`

`src/components/business/business-form.tsx:211,283` — nome e cidade têm `*` no
label mas sem `required`; a validação só chega depois do round-trip.

- [ ] `required` no input (o zod do servidor continua como rede de segurança).

### P1-18 `cache()` embrulha timestamp

`src/lib/catalog.ts:230-241` — `.or()` com `new Date().toISOString()` dentro de
`cache()`. Seguro hoje (cache por request), quebra no dia em que virar
`unstable_cache` / `"use cache"`.

- [ ] Comentar o porquê e isolar a parte temporal.

### Erro do Supabase descartado em 12 actions

Sem checar `{ error }`, a falha é muda: a tela mostra sucesso e a próxima
leitura volta ao valor antigo. Este é o padrão que gerou o bug da categoria
(corrigido em `57b3182`).

- [ ] `src/app/admin/cidades/actions.ts:31` — `deleteCity`: FK restrict (23503)
      falha e o admin não recebe aviso
- [ ] `src/app/cardapio/[slug]/actions.ts` — ver [P1-7](#p1-7-placeorder-não-revalida-o-painel-de-pedidos)
- [ ] `src/lib/menu/actions.ts:446-453` — `moveProduct` responde "Item movido."
      mesmo com falha
- [ ] `src/lib/menu/actions.ts:161,314,428` — `const { data }` sem checar
      `error`: lista vazia vira `sort_order`/`slug` silenciosamente errado
- [ ] `src/app/admin/categorias/actions.ts:282-285` — `toggleCategory`
- [ ] `src/app/admin/categorias/actions.ts:233,244,262` — `reorderCategories`
      tem 3 `return` silenciosos (parse, leitura, updates)
- [ ] `src/app/painel/[empresa]/pedidos/actions.ts:70,157` — ver
      [P1-4](#p1-4-updateorderstatus-não-condiciona-o-status-atual) e
      [P1-6](#p1-6-markorderpaid-marca-pago-pedido-cancelado)
- [ ] `src/app/admin/empresas/actions.ts:37` — `publishBusiness`: empresa pode
      não ir ao ar e o admin vê sucesso
- [ ] `src/app/admin/empresas/actions.ts:302` — `deleteBusiness` redireciona
      com `?excluida=1` mesmo com 0 linhas afetadas
- [ ] `src/app/admin/ofertas/actions.ts:14` — `deleteOffer`
- [ ] `src/app/admin/planos/actions.ts:29-36` — `updatePlan`: preço salvo só
      no cache do cliente

### `Number()` sem validação de faixa

`isInteger` aceita `0` e negativos, então `id=0` atualiza 0 linhas em silêncio.
Afeta `src/app/admin/empresas/actions.ts:34`, `cidades/actions.ts:26`,
`ofertas/actions.ts:11` e `categorias/actions.ts:174`.

- [ ] Trocar por `z.coerce.number().int().positive()`.

### Campos de texto sem limite no banco

`src/lib/menu/actions.ts:185-193` e `575-580` — `updateMenuSection` e
`updateOptionGroup` não passam por zod, e `name` não tem `.max()` (o `create`
usa schema).

- [ ] Reusar o mesmo schema do `create`.

### Colisão de `slug` e `sort_order`

`src/lib/menu/actions.ts:118-137,170,314-319` — read-then-write sem transação
nem upsert: duas gravações simultâneas colidem (23505) ou duplicam
`sort_order`. `moveProduct:435,446` troca `sort_order` de irmãos sem
`.eq("business_id")`.

- [ ] Transação, ou `upsert` com conflito resolvido no banco.

### Lojista grava campo exclusivo de admin

`src/lib/menu/actions.ts:359,396` — `products.is_featured` é gravável pelo
lojista, enquanto `businesses.is_featured` é exclusiva de admin (trigger da
migration 0008).

- [ ] Decidir a intenção e alinhar com o trigger.

---

## P2 — UX, acessibilidade e performance

### P2-1 Nenhuma exclusão pede confirmação

`src/app/admin/empresas/[id]/page.tsx:160` e `cidades/page.tsx:48` — exclusões
destrutivas (empresa em CASCADE com cardápio e pedidos) em clique único.
`deleteBusiness` (`actions.ts:296`) também não revalida o caminho público da
empresa removida.

- [ ] Confirmar antes; revalidar a vitrine.

### P2-2 Cada categoria alternada revalida o site inteiro

`src/app/admin/empresas/[id]/category-toggle.tsx:78-104` +
`empresas/actions.ts:290-292` — cada linha é um form com `useActionState`, e
cada toggle dispara `revalidatePath("/")` + `/loja` + `/admin/empresas/[id]`.
N categorias marcadas = N revalidações de site inteiro.

- [ ] Uma action com lote de ids, ou revalidar a vitrine só no fim.

### P2-3 `select("*")` traz colunas pesadas sem uso

`src/app/admin/empresas/[id]/page.tsx:22` — `search_text` e `search_tsvector`
viajam no payload sem serem usados na tela.

- [ ] Listar as colunas.

### P2-4 `await` sequencial onde dá para paralelizar

`src/app/admin/empresas/page.tsx:39-43`, `ofertas/page.tsx:16-18`,
`cidades/page.tsx:13-19`, `[id]/cardapio/page.tsx:25-33`. Em
`cidades/page.tsx:16-24` ainda há varredura da tabela `businesses` inteira para
contar em JS.

- [ ] `Promise.all` e agregação no banco.

### P2-5 Admin sem `loading.tsx` nem `error.tsx`

Nenhum dos dois arquivos existe no segmento `src/app/admin`. O dashboard
dispara 9 queries e a edição 4, tudo bloqueando na mais lenta, sem skeleton
nem tela de erro por rota.

- [ ] Streaming com Suspense e `error.tsx` por segmento.

### P2-6 `category-tree` re-renderiza tudo a cada `onDragOver`

`src/app/admin/categorias/category-tree.tsx:655,703-718,771,783` —
`useState(nos)` guarda o array inteiro; `setAlvo` a cada `onDragOver`
re-renderiza todas as `Linha` (cada uma com 2 `useActionState`) e `raizes.map`
aloca array novo por linha a cada render.

- [ ] Estado de arraste em ref, `Linha` memoizada, índices pré-calculados.

### P2-7 `menu-editor` recalcula tudo a cada render

`src/components/menu/menu-editor.tsx:544,547,569,409` —
`sortedSections`, `sortedGroups`, `valuesByGroup` e `orphanGroups` sem `useMemo`
e sem `React.memo` nas linhas: um único toast re-renderiza o editor inteiro com
3 `DndContext` aninhados.

- [ ] `useMemo` + `memo` nas linhas.

### P2-8 Cabeçalhos de tabela ausentes

Falta `<caption>` em `src/app/admin/page.tsx:125`,
`admin/empresas/page.tsx:131` e `admin/ofertas/page.tsx:34`.

- [ ] Adicionar (pode ser `sr-only`).

### P2-9 Contadores do painel ficam velhos

`src/app/painel/[empresa]/pedidos/actions.ts:76` e
`src/lib/menu/revalidate.ts:13` — nada revalida `/painel/[empresa]`, então os
contadores de "novos / em andamento" da home do painel ficam velhos após
aceitar, concluir ou cancelar.

- [ ] Incluir o caminho em `revalidateMenu`.

### P2-10 Seis viagens ao banco por troca de filtro

`src/app/painel/[empresa]/pedidos/page.tsx:75,91` — 5 contagens `head: true` em
`Promise.all` mais a listagem.

- [ ] Uma RPC que devolve contagens + lista.

### P2-11 Foco perdido nos pedidos

`src/components/business/order-actions.tsx:113,124` — abrir o cancelamento
desmonta o botão focado sem mover o foco para o `textarea`; "Manter pedido" não
devolve o foco (cai no `<body>`).

- [ ] Mover e devolver o foco explicitamente.

### P2-12 Menu mobile sem controle de teclado

`src/components/site-header.tsx:115-126` — não fecha no `Escape`, sem focus trap
e sem devolver foco; o `sr-only` da linha 122 continua "Abrir menu" mesmo
aberto.

- [ ] `dialog`/`drawer` do Next ou tratar `Escape` + foco.

### P2-13 Sem `robots.txt`, `robots.ts` nem `sitemap.ts`

Não existe nenhum dos três, sendo `/cidades/[cidade]` e
`/cidades/[cidade]/g/[grupo]` a superfície SEO do site.

- [ ] Gerar a partir de `listCities` + `listGroups`.

### P2-14 Canonical único em página que varia por cookie

`src/app/ofertas/page.tsx:12` e `src/app/loja/page.tsx:19` — canonical fixo
(`/ofertas`, `/loja`) em conteúdo que depende do cookie de cidade: todas as
variantes colapsam numa URL só.

- [ ] Canonical por cidade, ou `noindex` nessas variantes.

### P2-15 `hero-slider` pede largura inexistente

`src/components/home/hero-slider.tsx:162-172` — `width: 1600` nos dois banners;
1600 não está em `deviceSizes`, então o otimizador sobe para 1920/3840 e amplia
um asset mobile que é 1/3 do peso.

- [ ] Usar uma largura de `deviceSizes`.

### P2-16 `<img>` cru com `eslint-disable`

`src/app/ofertas/page.tsx:45`, `components/site-footer.tsx:19`,
`components/site-header.tsx:24`, `components/menu/storefront.tsx:485,495,843,958`,
`components/menu/menu-list.tsx:149`. Os dois logos não têm `width`/`height` (CLS)
e nenhum passa pelo otimizador.

- [ ] Migrar para `next/image` ou declarar dimensões.

### P2-17 Home sem cache de rota

`src/app/page.tsx:20` + `src/app/layout.tsx:62-63` — `force-dynamic` com
`listCities()` e `getCurrentCity()` no layout: 3+ idas ao Supabase por request.

- [ ] Cachear as listas por revalidação.

### P2-18 Ida extra ao banco em toda página de empresa

`src/app/cidades/[cidade]/empresa/[slug]/page.tsx:45` +
`src/lib/catalog.ts:305` — `countMenuItems` é encadeado fora do `Promise.all`.

- [ ] Incluir na mesma ida.

### P2-19 `setState` durante o render

`src/components/home/group-filter.tsx:113` — compara só `panel`; trocar de
`grupo` dentro do mesmo painel pula o snapshot e o painel que sai se repinta com
dados novos.

- [ ] Incluir `grupo` na comparação.

### P2-20 Nome acessível dos grupos de checkbox

`src/components/business/business-form.tsx:370,388` — "Como o cliente recebe" e
"Formas de pagamento" são `<p>` sem `fieldset`/`legend`.

- [ ] Envolver em `fieldset` com `legend`.

### P2-21 Alças de arrasto sem nome do item

`src/components/menu/menu-editor.tsx:347` — `aria-label` fixo ("Reordenar…") em
todas as alças; leitor de tela não sabe qual linha está movendo e o `aria-label`
sobrescreve o anúncio padrão do dnd-kit.

- [ ] Incluir o nome do item.

---

## P3 — Higiene e dívida técnica

### P3-1 `eslint` não cobre o arquivo de maior risco

`eslint.config.mjs:16` — `public/sw.js` está em `globalIgnores`. Também não há
`no-explicit-any`, `no-console` nem plugin de a11y além do preset do Next.

- [ ] Lintar o `sw.js` e apertar as regras.

### P3-2 `tsconfig` permissivo

`tsconfig.json:6-7` — `allowJs: true` sem `checkJs` e sem
`noUncheckedIndexedAccess`. O catálogo compensa com `as unknown as`
(`src/lib/catalog.ts:192,248,333,339,422,483`), que o checker não valida.

- [ ] Habilitar `noUncheckedIndexedAccess` e remover as coerções `as unknown as`.

### P3-3 Código morto

- [ ] `src/app/painel/[empresa]/perfil/actions.ts:179` — `backToMenu` exportada
      e nunca importada.

### P3-4 Revisitar as invariantes de `"use server"`

Um arquivo `"use server"` só pode exportar funções async. Exportar um objeto
quebra em **runtime**, sem aviso de `tsc` nem de `eslint`, e derruba todas as
actions da rota com 500 genérico. Foi exatamente o bug `554bcd3`.

- [ ] Regra no lint (ou teste) que barra export não-async nesses arquivos.
- [ ] Manter o estado em `state.ts` ao lado, como já feito em
      `src/app/admin/empresas/state.ts`, `painel/[empresa]/pedidos/state.ts` e
      `src/lib/menu/state.ts`.

### P3-5 Checkbox não submete form

Um `<input type="checkbox">` dentro de `<form action={...}>` sem botão de submit
marca na tela e não envia nada ao servidor. Foi o segundo bug de
`57b3182`. Ao criar formulário novo, conferir: botão de submit, `requestSubmit()`
ou o padrão de `<button type="submit" name="...">`.

---

## Registro

Corrigido nesta auditoria:

| Commit | O quê |
| --- | --- |
| `554bcd3` | `emptyProfileState` (objeto) exportado de arquivo `"use server"` derrubava todas as actions de `/admin/empresas/[id]`, `/admin/empresas/nova` e `/painel/[empresa]/perfil` com 500 `@E352`. |
| `57b3182` | Banner "Dados salvos" nunca aparecia no admin (`updateBusiness` sem `saved: true`); a caixa de categoria não submeteva o form e a categoria sumia no reload, com erro do Supabase engolido. Novo `src/app/admin/empresas/[id]/category-toggle.tsx`. |

Pendências de infra conhecidas (não são bug do código):

- [ ] `supabase/categorias_principais.sql` continua **untracked** no git.
- [ ] `npm run build` não roda neste sandbox (fontes do Google inacessíveis);
      validar em CI/Vercel.
