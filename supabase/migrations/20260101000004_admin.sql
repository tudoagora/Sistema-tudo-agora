-- ============================================================================
-- Painel do administrador — complementa a 20260101000003_rls.sql
--
-- A 0003 cobre leitura/edição de quem gerencia a empresa e a inserção de
-- empresa por admin, mas não previa exclusão. O painel precisa dela para
-- remover cadastros duplicados que vieram da migração.
-- ============================================================================

create policy businesses_admin_delete on public.businesses
  for delete to authenticated using (public.is_admin());

create policy business_categories_admin_delete on public.business_categories
  for delete to authenticated using (public.is_admin());

create policy menu_categories_admin_delete on public.menu_categories
  for delete to authenticated using (public.is_admin());

create policy products_admin_delete on public.products
  for delete to authenticated using (public.is_admin());

-- O admin precisa enxergar empresas em qualquer status (inclusive 'draft') ao
-- listar no painel. A 0003 já resolve isso via `businesses_manage_read`, que
-- delega para `manages_business()` → `is_admin()`. Esta policy é apenas uma
-- atalho explícito para documentar a intenção.
create policy businesses_admin_read on public.businesses
  for select to authenticated using (public.is_admin());
