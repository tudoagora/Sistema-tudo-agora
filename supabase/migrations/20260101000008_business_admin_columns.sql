-- ===========================================================================
-- Colunas de empresa que só o admin altera
--
-- A policy `businesses_merchant_update` (migration 0003) libera o UPDATE
-- inteiro da linha para quem está em `business_members`. Isso é o que permite
-- o lojista corrigir nome, contato, horário e taxa — mas a mesma policy
-- deixaria ele escrever `status = 'active'` e publicar a própria loja sem
-- passar por aprovação, ou ocupar a vitrine com `is_featured = true`.
--
-- A action `updateBusinessProfile` já ignora esses campos, mas uma action não
-- é fronteira de segurança: qualquer outro caminho de escrita passaria. O
-- trigger fecha na coluna.
-- ===========================================================================

create or replace function public.guard_business_admin_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- SEM `security definer` de propósito. Com ele, `current_user` dentro da
  -- função passa a ser o dono dela (`postgres`) em vez de quem executa o
  -- UPDATE, e a checagem de papel abaixo deixa de distinguir lojista de
  -- service role. A função só precisa de NEW/OLD e de `is_admin()`, que já é
  -- `security definer` por conta própria.

  -- Quem não é usuário da aplicação não passa por aqui: `service_role` (usado
  -- pelo `createAdminClient` e pelo `seed-dev.mjs`) e o dono do banco, que é
  -- quem roda migrations e `seed.sql`.
  if coalesce(auth.role(), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
    or new.is_featured is distinct from old.is_featured
    or new.featured_until is distinct from old.featured_until
    or new.city_id is distinct from old.city_id
    or new.slug is distinct from old.slug
    or new.custom_slug is distinct from old.custom_slug
    or new.source is distinct from old.source
    or new.legacy_wp_id is distinct from old.legacy_wp_id then
    raise exception
      'colunas de situacao, destaque, cidade e endereco da empresa so podem ser alteradas por um administrador'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger businesses_guard_admin_columns
  before update on public.businesses
  for each row
  execute function public.guard_business_admin_columns();
