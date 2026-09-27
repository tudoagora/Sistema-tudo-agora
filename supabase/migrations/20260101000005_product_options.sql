-- ============================================================================
-- Grupos de opção por produto
--
-- Antes, `option_groups` era ligado à EMPRESA e o `get_business_menu`
-- devolvia todos os grupos para todos os itens. Numa pizzaria isso até
-- passa, mas um refrigerante acabava pedindo "qual a borda?".
--
-- Esta tabela liga o grupo a um produto específico. Itens sem nenhuma linha
-- aqui continuam herdando todos os grupos da empresa (retrocompatível).
-- ============================================================================

create table public.product_option_groups (
  product_id      bigint not null references public.products(id) on delete cascade,
  option_group_id bigint not null references public.option_groups(id) on delete cascade,
  primary key (product_id, option_group_id)
);

create index product_option_groups_group_idx
  on public.product_option_groups (option_group_id);

alter table public.product_option_groups enable row level security;

create policy product_option_groups_public_read on public.product_option_groups
  for select using (
    exists (
      select 1
      from public.products p
      join public.businesses b on b.id = p.business_id
      where p.id = product_id and b.status = 'active'
    )
  );

create policy product_option_groups_manage on public.product_option_groups
  for all to authenticated using (public.manages_product(product_id))
  with check (public.manages_product(product_id));

create policy product_option_groups_admin_delete on public.product_option_groups
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- `get_business_menu`: passa a respeitar a ligação por produto.
-- ---------------------------------------------------------------------------

create or replace function public.get_business_menu(p_business_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'business', (
      select jsonb_build_object(
        'id', b.id, 'name', b.name, 'slug', b.slug, 'custom_slug', b.custom_slug,
        'description', b.description, 'logo_url', b.logo_url, 'cover_url', b.cover_url,
        'whatsapp', b.whatsapp, 'phone', b.phone, 'address', b.address,
        'opening_hours', b.opening_hours, 'fulfillment', b.fulfillment,
        'payment_methods', b.payment_methods, 'pix_key', b.pix_key,
        'delivery_fee_cents', b.delivery_fee_cents, 'min_order_cents', b.min_order_cents
      )
      from public.businesses b where b.id = p_business_id and b.status = 'active'
    ),
    'menu_categories', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', mc.id, 'name', mc.name, 'slug', mc.slug,
          'item_count', (select count(*) from public.products p2
                          where p2.menu_category_id = mc.id and p2.is_available)
        ) order by mc.sort_order
      ), '[]'::jsonb)
      from public.menu_categories mc
      where mc.business_id = p_business_id
    ),
    'items', (
      select coalesce(jsonb_agg(item order by item ->> 'sort_order'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', p.id, 'name', p.name, 'description', p.description,
          'price_cents', p.price_cents, 'image_url', p.image_url,
          'menu_category_id', mc.id, 'menu_category_slug', mc.slug,
          'menu_category_name', mc.name, 'sort_order', p.sort_order,
          'option_groups', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', g.id, 'name', g.name,
                'min_select', g.min_select, 'max_select', g.max_select,
                'is_required', g.is_required,
                'values', (
                  select coalesce(jsonb_agg(
                    jsonb_build_object(
                      'id', v.id, 'name', v.name, 'price_delta_cents', v.price_delta_cents
                    ) order by v.sort_order
                  ), '[]'::jsonb)
                  from public.option_values v
                  where v.option_group_id = g.id and v.is_available
                )
              ) order by g.sort_order
            ), '[]'::jsonb)
            from public.option_groups g
            where g.business_id = p_business_id
              -- Se o produto tem grupos elencados, usa só eles.
              -- Sem nenhum, herda todos os grupos da empresa.
              and (
                not exists (
                  select 1 from public.product_option_groups pog
                  where pog.product_id = p.id
                )
                or exists (
                  select 1 from public.product_option_groups pog
                  where pog.product_id = p.id and pog.option_group_id = g.id
                )
              )
          )
        ) as item
        from public.products p
        left join public.menu_categories mc on mc.id = p.menu_category_id
        where p.business_id = p_business_id and p.is_available
      ) s
    )
  )
  where exists (select 1 from public.businesses b where b.id = p_business_id and b.status = 'active');
$$;
