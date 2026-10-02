-- ============================================================
-- Faixa de banners de publicidade da home
--
-- A tabela `banners` já existia desde 20260101000001 e já tinha as policies
-- certas (leitura pública para ativo/não expirado, escrita do admin em
-- 20260101000003), mas era uma tabela órfã: nenhuma tela do admin a escrevia
-- e a home não a consultava. Faltavam duas peças, e só uma delas é tabela.
--
-- 1. O `placement` 'publicidade' NÃO pede migration: `placement` é `text` com
--    um comentário(listagem) e não tem CHECK, então o slot novo é só um valor
--    novo. A faixa entra DEPOIS da seção "Destaques em {cidade}" da home.
--
-- 2. Quantos banners rodam ao mesmo tempo é uma preferência DA CASA, não um
--    atributo de cada banner: os dois textos precisam ficar separados, senão
--    "quantos" viraria um campo por linha que o admin edita N vezes. Por isso
--    uma chave/valor em vez de uma coluna em `banners`.
-- ============================================================

create table public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is
  'Preferências da casa em chave/valor. Admin escreve, todo mundo lê.';

create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;

-- A home roda no servidor com a sessão anônima e é ela que corta a lista de
-- banners, então o limite precisa ser legível por `anon` também.
create policy site_settings_read on public.site_settings
  for select to anon, authenticated using (true);

-- INSERT/UPDATE/DELETE separados e com WITH CHECK explícito: numa policy
-- `for all` o USING não é avaliado no INSERT, e sem WITH CHECK a policy não
-- restringiria nada (foi exatamente o bug corrigido em business_members na
-- 20260101000012).
create policy site_settings_admin_insert on public.site_settings
  for insert to authenticated with check (public.is_admin());

create policy site_settings_admin_update on public.site_settings
  for update to authenticated using (public.is_admin())
  with check (public.is_admin());

create policy site_settings_admin_delete on public.site_settings
  for delete to authenticated using (public.is_admin());

-- Teto do carrossel: com um banner só a faixa vira um bloco estático e o
-- campo deixa de fazer sentido. `/admin/banners` respeita este valor como
-- máximo do campo "quantos banners exibir".
insert into public.site_settings (key, value) values
  ('publicidade_limite', '3')
on conflict (key) do nothing;
