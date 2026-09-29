-- ============================================================
-- Cadastro das 9 categorias principais (as pílulas da home)
-- ============================================================
--
-- São exatamente as 9 categorias que o site já mostrava, vindas da antiga
-- tabela `groups` (as fotos /grupos/*.jpg da seção CATEGORIAS). Aqui elas
-- entram na tabela única `categories` como RAIZES da árvore:
--
--   parent_id is null  -> categoria principal  (é este arquivo)
--   parent_id preenchido -> subcategoria       (cadastre no /admin/categorias)
--
-- As subcategorias NÃO vêm neste arquivo: elas serão cadastradas por você
-- em /admin/categorias, arrastando para dentro de cada principal.
--
-- ANTES DE RODAR
-- A migration 20260101000011_arvore_de_categorias.sql precisa estar aplicada
-- (ela é quem funde `groups` dentro de `categories` e cria `parent_id` /
-- `image_url`). O guard no início deste arquivo falha com mensagem clara se
-- ela não estiver.
--
-- O script é idempotente: pode rodar quantas vezes quiser. Quem casa é o
-- SLUG, porque é ele que vira a URL pública /g/<slug> — por isso o conflito
-- atualiza nome, imagem e ordem em vez de duplicar a linha.
--
-- Se você já rodou a migration 00011 num banco que tinha `groups` populado,
-- estas 9 linhas já existem e este script só vai alinhar nome/imagem/ordem.

-- ---------- GUARD: a migration 00011 precisa estar aplicada ----------

-- Fica antes do insert de propósito: sem `parent_id`, o insert estouraria com
-- "column parent_id does not exist", que não diz o que fazer.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categories' and column_name = 'parent_id'
  ) then
    raise exception
      'Falta a coluna categories.parent_id. Aplique 20260101000011_arvore_de_categorias.sql antes deste script.';
  end if;

  if to_regclass('public.groups') is not null then
    raise exception
      'A tabela public.groups ainda existe. Aplique 20260101000011_arvore_de_categorias.sql antes deste script.';
  end if;
end $$;

-- ---------- 9 CATEGORIAS PRINCIPAIS ----------

insert into public.categories (name, slug, parent_id, image_url, is_order_capable, sort_order, is_active)
values
  ('Comida',                     'comida',   null, '/grupos/comida.jpg',   false, 1, true),
  ('Sorvetes, Açaí e Sobremesas','sorvetes', null, '/grupos/sorvetes.jpg', false, 2, true),
  ('Conveniência',               'bebida',   null, '/grupos/bebida.jpg',   false, 3, true),
  ('Farmácias, saúde e beleza',  'farmacia', null, '/grupos/farmacia.jpg', false, 4, true),
  ('Serviços',                   'servicos', null, '/grupos/servicos.jpg', false, 5, true),
  ('Lojas',                      'lojas',    null, '/grupos/lojas.jpg',    false, 6, true),
  ('Corridas',                   'corridas', null, '/grupos/corridas.jpg', false, 7, true),
  ('Úteis',                      'uteis',    null, '/grupos/uteis.jpg',    false, 8, true),
  ('Mídia',                      'midia',    null, '/grupos/midia.jpg',    false, 9, true)
on conflict (slug) do update
  set name             = excluded.name,
      image_url        = excluded.image_url,
      sort_order       = excluded.sort_order,
      is_order_capable = excluded.is_order_capable,
      -- Não mexe em `is_active`: se você escondeu uma categoria no admin,
      -- rodar este script de novo não deve trazê-la de volta à toa.
      parent_id        = null;

-- A sequência precisa ficar acima do maior id, senão o próximo insert no
-- admin (cadastro de subcategoria) bate em violation de chave primária.
select setval(
  pg_get_serial_sequence('public.categories', 'id'),
  greatest(coalesce((select max(id) from public.categories), 0), 1),
  true
);

-- ---------- CONFERÊNCIA: o que foi cadastrado ----------
--
-- Rode depois de cadastrar as subcategorias no admin. Lista cada principal com
-- a contagem de filhas e o total de empresas ligadas, para bater o olho se
-- alguma ficou de fora.

-- Duas contagens independentes de propósito: num join só, cada empresa
-- ligada a uma filha faria a contagem das outras se repetir.

select
  raiz.name as "principal",
  raiz.slug as "/g/<slug>",
  (
    select count(*)
    from public.categories f
    where f.parent_id = raiz.id and f.is_active
  ) as "subcategorias",
  (
    select count(distinct bc.business_id)
    from public.business_categories bc
    join public.categories c on c.id = bc.category_id
    where c.id = raiz.id or c.parent_id = raiz.id
  ) as "empresas"
from public.categories raiz
where raiz.parent_id is null
order by raiz.sort_order;
