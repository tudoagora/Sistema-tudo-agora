-- ============================================================================
-- Endurecimento dos privilégios padrão
--
-- Ao criar o schema, o Postgres (e o `supabase db reset`) dão a `anon` e
-- `authenticated` privilégios amplos demais em TODAS as tabelas: SELECT, INSERT,
-- UPDATE, DELETE, REFERENCES, TRIGGER e TRUNCATE.
--
-- A RLS cobre SELECT/INSERT/UPDATE/DELETE. Mas RLS NÃO cobre TRUNCATE: o
-- Postgres nega o comando por privilégio, não por policy. Sem este revoke,
-- qualquer pessoa com a chave anônima (que é pública no bundle do navegador)
-- poderia mandar `TRUNCATE businesses CASCADE` e apagar a base inteira.
-- É exatamente o tipo de falha que só aparece quando é testada.
--
-- Revogamos TRUNCATE e REFERENCES (nenhum papel do app precisa deles) e
-- mantemos o resto, delegando a decisão ao RLS.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'cities', 'groups', 'categories', 'businesses', 'business_categories',
    'menu_categories', 'products', 'product_option_groups', 'option_groups',
    'option_values', 'orders', 'order_items', 'order_item_options',
    'plans', 'subscriptions', 'banners', 'offers', 'coupons',
    'quote_requests', 'profiles', 'business_members'
  ] loop
    execute format('revoke truncate, references on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- `service_role` segue com tudo (é o papel do backend, com BYPASSRLS).
-- `postgres` (dono) também.
