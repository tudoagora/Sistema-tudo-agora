-- ============================================================
-- Row Level Security — isolamento multi-tenant
-- Um lojista só enxerga/edita a própria empresa, seus produtos e pedidos.
-- O admin (você) enxerga tudo.
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.manages_business(p_business_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid()
  );
$$;

create or replace function public.manages_product(p_product_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.products p
    join public.business_members bm on bm.business_id = p.business_id
    where p.id = p_product_id and bm.user_id = auth.uid()
  ) or public.is_admin();
$$;

-- ---------- profiles ----------

alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()));

-- ---------- business_members ----------

alter table public.business_members enable row level security;

create policy members_select on public.business_members
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy members_write on public.business_members
  for all to authenticated using (public.is_admin());

-- ---------- públicos (somente leitura) ----------

alter table public.cities     enable row level security;
alter table public.groups    enable row level security;
alter table public.categories enable row level security;
alter table public.plans     enable row level security;
alter table public.banners   enable row level security;
alter table public.offers    enable row level security;

create policy cities_read     on public.cities     for select using (is_active);
create policy groups_read    on public.groups    for select using (is_active);
create policy categories_read on public.categories for select using (is_active);
create policy plans_read     on public.plans     for select using (is_active);
create policy banners_read   on public.banners   for select using (is_active and (ends_at is null or ends_at > now()));
create policy offers_read    on public.offers    for select using (is_active and (ends_at is null or ends_at > now()));

alter table public.cities     enable row level security; -- (idempotente)

create policy cities_admin_write on public.cities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy groups_admin_write on public.groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy categories_admin_write on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy plans_admin_write on public.plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy banners_admin_write on public.banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy offers_merchant_write on public.offers
  for insert to authenticated with check (public.manages_business(business_id));

create policy offers_merchant_update on public.offers
  for update to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

-- ---------- businesses ----------

alter table public.businesses enable row level security;

-- público só vê empresas ativas
create policy businesses_public_read on public.businesses
  for select using (status = 'active');

-- lojista/admin vê a própria ficha completa
create policy businesses_manage_read on public.businesses
  for select to authenticated using (public.manages_business(id));

create policy businesses_merchant_update on public.businesses
  for update to authenticated using (public.manages_business(id))
  with check (public.manages_business(id));

create policy businesses_admin_insert on public.businesses
  for insert to authenticated with check (public.is_admin());

-- ---------- business_categories ----------

alter table public.business_categories enable row level security;

create policy business_categories_public_read on public.business_categories
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
  );

create policy business_categories_manage on public.business_categories
  for all to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

-- ---------- menu_categories ----------

alter table public.menu_categories enable row level security;

create policy menu_categories_public_read on public.menu_categories
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
  );

create policy menu_categories_manage on public.menu_categories
  for all to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

-- ---------- products ----------

alter table public.products enable row level security;

create policy products_public_read on public.products
  for select using (
    is_available
    and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
  );

create policy products_manage_read on public.products
  for select to authenticated using (public.manages_business(business_id));

create policy products_manage_write on public.products
  for all to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

-- ---------- option_groups / option_values ----------

alter table public.option_groups enable row level security;
alter table public.option_values  enable row level security;

create policy option_groups_public_read on public.option_groups
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
  );

create policy option_groups_manage on public.option_groups
  for all to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

create policy option_values_public_read on public.option_values
  for select using (
    is_available
    and exists (
      select 1 from public.option_groups g
      join public.businesses b on b.id = g.business_id
      where g.id = option_group_id and b.status = 'active'
    )
  );

create policy option_values_manage on public.option_values
  for all to authenticated using (
    exists (
      select 1 from public.option_groups g
      where g.id = option_group_id and public.manages_business(g.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.option_groups g
      where g.id = option_group_id and public.manages_business(g.business_id)
    )
  );

-- ---------- orders ----------
-- Criação de pedido é feita server-side (service role) no checkout.
-- Aqui o cliente e o lojista só leem, e o lojista atualiza o status.

alter table public.orders enable row level security;

create policy orders_customer_read on public.orders
  for select to authenticated using (customer_id = auth.uid());

create policy orders_business_read on public.orders
  for select to authenticated using (public.manages_business(business_id));

create policy orders_business_update on public.orders
  for update to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

alter table public.order_items enable row level security;

create policy order_items_read on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or public.manages_business(o.business_id))
    )
  );

alter table public.order_item_options enable row level security;

create policy order_item_options_read on public.order_item_options
  for select using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id
        and (o.customer_id = auth.uid() or public.manages_business(o.business_id))
    )
  );

-- ---------- subscriptions ----------

alter table public.subscriptions enable row level security;

create policy subscriptions_read on public.subscriptions
  for select to authenticated using (public.manages_business(business_id));

-- ---------- coupons ----------

alter table public.coupons enable row level security;

create policy coupons_read on public.coupons
  for select using (
    is_active
    and (business_id is null or exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'active'
    ))
  );

create policy coupons_manage on public.coupons
  for all to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

-- ---------- quote_requests ----------

alter table public.quote_requests enable row level security;

create policy quote_requests_business_read on public.quote_requests
  for select to authenticated using (public.manages_business(business_id));

create policy quote_requests_business_update on public.quote_requests
  for update to authenticated using (public.manages_business(business_id))
  with check (public.manages_business(business_id));

-- ---------- realtime: status do pedido ao vivo ----------

alter publication supabase_realtime add table public.orders;
