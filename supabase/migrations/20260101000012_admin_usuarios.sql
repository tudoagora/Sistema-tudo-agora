-- ============================================================
-- Gestão de usuários no admin
--
-- Antes desta migration não existia NENHUMA forma de um papel `authenticated`
-- criar ou promover um perfil: o trigger `handle_new_user()` insere sempre
-- como 'customer' e a policy `profiles_update_self` exige
-- `role = (select role from profiles where id = auth.uid())`, o que impede o
-- usuário de se auto-promover. Só o `service_role` escrevia papel.
--
-- A tela /admin/usuarios grava com a sessão do admin e depende destas policies
-- — nada de `service_role` para o trabalho comum deadministration.
-- ============================================================

-- INSERT: o admin cria o perfil junto com a conta. O auto-cadastro público não
-- passa por aqui — ele é coberto pelo trigger, que sempre entra como customer.
create policy profiles_admin_insert on public.profiles
  for insert to authenticated with check (public.is_admin());

-- UPDATE: o admin muda papel/nome/telefone de qualquer conta.
--
-- Policies permissivas são combinadas com OU no Postgres, então esta NÃO
-- enfraquece o `profiles_update_self`: um lojista comum continua passando só
-- pela própria policy, que segue exigindo que o `role` enviado seja igual ao
-- papel que ele já tem. Auto-promoção continua bloqueada.
create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.is_admin())
  with check (public.is_admin());

-- DELETE de perfil não entra de propósito: apagar a linha sozinha deixaria uma
-- conta órfã em auth.users, que não volta pelo trigger (só roda no INSERT). A
-- remoção de usuário passa por `auth.admin.deleteUser()`, que derruba o perfil
-- em cascade pela FK `profiles.id`.

-- ---------- business_members ----------

-- `members_write` era `for all ... using (is_admin())` sem WITH CHECK. Numa
-- policy de INSERT o Postgres não avalia USING — a linha nova só passa pelo
-- WITH CHECK — e, sem nenhum dos dois escritos, a policy não restringia nada:
-- o admin inseria vínculo com `business_id`/`user_id` arbitrários, inclusive
-- apontando para empresa de outro tenant, que é o que o RLS existe para
-- impedir. O USING continuava valendo para UPDATE/DELETE, então a intenção era
-- só fechar o INSERT. Separatei por comando e dei WITH CHECK explícito a cada um.
drop policy members_write on public.business_members;

create policy members_admin_insert on public.business_members
  for insert to authenticated with check (public.is_admin());

create policy members_admin_update on public.business_members
  for update to authenticated using (public.is_admin())
  with check (public.is_admin());

create policy members_admin_delete on public.business_members
  for delete to authenticated using (public.is_admin());