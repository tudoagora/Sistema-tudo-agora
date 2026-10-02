-- ===========================================================================
-- Cardápio de fora da empresa
--
-- Parte das empresas não tem cardápio no Tudo Agora: vende no Anota, no
-- Sisfood, no pedir.delivery, no site próprio, ou manda o cliente direto para
-- uma conversa de WhatsApp. Até agora não havia onde registrar isso. A página
-- pública (`/cidades/[cidade]/empresa/[slug]`) só conhecia dois destinos: a
-- vitrine interna, e somente quando existia item publicado, e o botão de
-- WhatsApp, e somente quando a coluna `whatsapp` estava preenchida. Na base,
-- 52 das 54 empresas estavam com `whatsapp` nulo — ou seja, saíam sem botão
-- nenhum, mesmo as 14 que funcionam por WhatsApp.
--
-- Uma coluna, e não um enum de "onde está o cardápio": o que o cliente
-- precisa é de um link, e o destino (app de delivery, site, grupo, conversa)
-- é responsabilidade de quem cadastrou a URL. A diferença entre "cardápio
-- externo" e "só o WhatsApp" já está no NULL — sem `menu_url` a página volta
-- a se comportar como antes.
--
-- `menu_url` NÃO entra na lista do trigger `businesses_guard_admin_columns`
-- (migration 0008) de propósito: o link é conteúdo do lojista, não estratégia
-- da casa, então ele tem poder de corrigir o próprio link. Por enquanto o
-- campo é preenchido só pelo admin (cartão "Cardápio" em
-- `/admin/empresas/[id]`), mas a coluna já fica disponível para o painel do
-- lojista no dia em que a tela ganhar o campo.
--
-- O CHECK de esquema é a última linha de defesa, não a primeira: a coluna
-- vira `href` de uma página pública, e `javascript:` num campo de URL é o
-- caminho mais curto para XSS no site inteiro. `^https?://` também descarta o
-- resto da família (`data:`, `vbscript:`, `file:`), que nenhum cardápio
-- legítimo usa. `http` continua aceito porque loja de bairro com site
-- desatualizado ainda existe.
--
-- A CARGA dos links NÃO está aqui, e essa é a parte que precisa ser dita: um
-- `supabase db reset` roda as migrations ANTES do `seed.sql`, então um
-- `update` desta tabela dentro da migration não encontraria empresa nenhuma e
-- quebraria o reset local — foi o que aconteceu na primeira versão deste
-- arquivo. Os 22 links estão no `seed.sql`, no bloco "CARDÁPIO DE FORA DAS
-- EMPRESAS", que roda depois das empresas existirem. Aqui só fica o DDL.
-- ===========================================================================

alter table public.businesses
  add column menu_url text;

comment on column public.businesses.menu_url is
  'Cardápio de fora (app de delivery, site próprio, conversa de WhatsApp). Vira o botão principal na página pública da empresa. NULL = só WhatsApp.';

alter table public.businesses
  add constraint businesses_menu_url_format
  check (menu_url is null or menu_url ~ '^https?://');