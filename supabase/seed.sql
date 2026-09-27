-- ============================================================
-- Seed TudoAgora
-- Origem dos dados:
--   * 26 empresas  -> CPT `empresa` (WP) + meta ta_*
--   * 17 serviços  -> empresas.tudoagora.app.br
--   * 10 lojas     -> lojas.tudoagora.app.br
--   * 3 planos     -> página /planos/ (inexistentes no backend atual)
-- ============================================================

-- ---------- CIDADE ----------

insert into public.cities (id, name, state, slug, timezone) values
  (1, 'Tapurah', 'MT', 'tapurah-mt', 'America/Cuiaba')
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('public.cities', 'id'), 1, true);

-- ---------- GRUPOS DA HOME (as 9 pílulas) ----------

insert into public.groups (id, name, slug, image_url, sort_order) values
  (1, 'Comida',                       'comida',   '/grupos/comida.jpg',   1),
  (2, 'Sorvetes, Açaí e Sobremesas',  'sorvetes', '/grupos/sorvetes.jpg', 2),
  (3, 'Conveniência',                 'bebida',   '/grupos/bebida.jpg',   3),
  (4, 'Farmácias, saúde e beleza',    'farmacia', '/grupos/farmacia.jpg', 4),
  (5, 'Serviços',                     'servicos', '/grupos/servicos.jpg', 5),
  (6, 'Lojas',                        'lojas',    '/grupos/lojas.jpg',    6),
  (7, 'Corridas',                     'corridas', '/grupos/corridas.jpg', 7),
  (8, 'Úteis',                        'uteis',    '/grupos/uteis.jpg',    8),
  (9, 'Mídia',                        'midia',    '/grupos/midia.jpg',    9)
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('public.groups', 'id'), 9, true);

-- ---------- CATEGORIAS ----------

insert into public.categories (id, name, slug, group_id, is_order_capable, sort_order) values
  -- comida
  (1,  'Pizzas',                      'pizzas',                 1, true,  1),
  (2,  'Lanchonetes',                 'lanchonetes',            1, true,  2),
  (3,  'Hambúrguer',                  'hamburguer',             1, true,  3),
  (4,  'Restaurantes',                'restaurantes',           1, true,  4),
  (5,  'Comida japonesa',             'comida-japonesa',        1, true,  5),
  (6,  'Churrascaria',                'churrascaria',           1, true,  6),
  (7,  'Pães e doces',                'paes-e-doces',           1, true,  7),
  -- sorvetes
  (8,  'Sorvetes, açaí e sobremesas', 'sorvetes-acai-sobremesas', 2, true, 1),
  -- bebida
  (9,  'Conveniência',                'conveniencia',           3, true,  1),
  (10, 'Bebidas',                     'bebidas',                3, true,  2),
  -- farmacia
  (11, 'Farmácias',                   'farmacias',              4, true,  1),
  (12, 'Saúde e beleza',              'saude-e-beleza',         4, true,  2),
  (13, 'Academias',                   'academias',              4, true,  3),
  -- servicos
  (14, 'Serviços em geral',           'servicos',               5, false, 1),
  (15, 'Automotivo',                  'automotivo',             5, false, 2),
  (16, 'Construção e engenharia',     'construcao-engenharia',  5, false, 3),
  (17, 'Educação',                    'educacao',               5, false, 4),
  (18, 'Eletrônica e repair',         'eletronica-repair',      5, false, 5),
  (19, 'Hospedagem',                  'hospedagem',             5, false, 6),
  (20, 'Odontologia',                 'odontologia',            5, false, 7),
  (21, 'Salão e beleza',              'salao-e-beleza',         5, false, 8),
  -- lojas
  (22, 'Lojas',                       'lojas',                  6, true,  1),
  (23, 'Moda e acessórios',           'moda-e-acessorios',      6, true,  2),
  (24, 'Casa e construção',           'casa-e-construcao',      6, true,  3),
  (25, 'Perfumaria',                  'perfumaria',             6, true,  4),
  (26, 'Alimentos',                   'alimentos',              6, true,  5),
  (27, 'Limpeza e higiene',            'limpeza-e-higiene',      6, true,  6),
  (28, 'Óptica e relógios',            'optica-e-relogios',      6, true,  7),
  (29, 'Floricultura',                'floricultura',           6, true,  8),
  -- corridas
  (30, 'Corridas e táxis',            'corridas',               7, true,  1),
  -- uteis
  (31, 'Telefones úteis',             'telefones-uteis',        8, false, 1),
  (32, 'Serviços públicos',           'servicos-publicos',      8, false, 2),
  -- midia
  (33, 'Mídia eAssessoria',           'midia',                  9, false, 1)
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('public.categories', 'id'), 33, true);

-- ---------- EMPRESAS (53) ----------

with seed (name, slug, custom_slug, description, legacy_wp_id, source) as (values
  -- ===== 26 principais (CPT `empresa`) =====
  ('Açaíteria e Pastelaria Palmeiras', 'acaiteria-e-pastelaria-palmeiras', null::text,
   'Açaí, pastel, petiscos e sobremesas.', 260, 'principal'),
  ('Brasa Nobre Churrascaria',         'brasa-nobre-churrascaria', null,
   'Churrascaria em Tapurah-MT.', 1527, 'principal'),
  ('Cabana Pizzaria',                  'cabana-pizzaria', null,
   'Pizzaria de Tapurah com delivery.', 1999, 'principal'),
  ('Cacau Show',                       'cacau-show', null,
   'Cafeteria e confeitaria.', 2115, 'principal'),
  ('Chapa Quente Lanches',             'chapa-quente-lanches', null,
   'Lanches e refeições rápidas.', 1463, 'principal'),
  ('Fest Food',                        'fest-food', null,
   'Lanchonete e serviço de food truck.', 1510, 'principal'),
  ('Grupo WhatsApp Tapurah compra e vendas', 'grupo-whatsapp-tapurah', null,
   'Grupo de ofertas e compra e vendas de Tapurah.', 2134, 'principal'),
  ('Hospital Municipal de Tapurah',    'hospital-municipal', null,
   'Hospital público municipal.', 2107, 'principal'),
  ('Jones entrega',                    'jones-entrega', null,
   'Serviço de entregas em Tapurah.', 2066, 'principal'),
  ('Jornal Caiabis Online',            'jornal-caibis-online', null,
   'Notícias de Tapurah e região.', 2128, 'principal'),
  ('JP Doces e Salgados',              'jp-doces-e-salgados', null,
   'Doces e salgados artesanais.', 261, 'principal'),
  ('Makariê Pizzaria e Choperia',      'makarie-pizzaria-e-choperia', null,
   'Pizzaria e choperia com delivery.', 2030, 'principal'),
  ('Master Farma',                     'master-farma', 'masterfarma',
   'A drogaria do Clodoaldo. Sempre perto de você.', 1407, 'principal'),
  ('Paxplesner',                       'paxplesner', null,
   'Serviços e comércio em Tapurah.', 2147, 'principal'),
  ('Plesnergóis',                      'plesnergois', null,
   'Comércio e serviços em Tapurah.', 2149, 'principal'),
  ('Polícia Militar de Tapurah',       'policia-militar-de-tapurah', null,
   'Contato e informações da Polícia Militar.', 2151, 'principal'),
  ('Prefeitura de Tapurah',            'prefeitura-de-tapurah', null,
   'Paço Municipal e serviços da prefeitura.', 2109, 'principal'),
  ('R11Notícias',                      'r11-noticias', null,
   'Cobertura de notícias locais.', 2124, 'principal'),
  ('Restaurante Fio de Azeite',        'restaurante-fio-de-azeite', null,
   'Restaurante em Tapurah-MT.', 1985, 'principal'),
  ('Sabor da Itália Delivery',         'sabor-da-italia-delivery', null,
   'Pizza Napolitana contemporânea artesanal, preparada com massa tradicional italiana de longa fermentação. Ingredientes selecionados, bordas leves e aeradas e sabor autêntico em cada fatia.', 2172, 'principal'),
  ('Society Beer Lanchonete e Pizzaria','society-beer', null,
   'Lanchonete e pizzaria com chopp e delivery.', 1519, 'principal'),
  ('Tapurah.com',                      'tapurah-com', null,
   'Portal de notícias de Tapurah.', 2126, 'principal'),
  ('Taxi Ortega',                      'taxi-ortega', null,
   'Transporte e corridas.', 2064, 'principal'),
  ('TV Buritis',                       'tv-buritis', null,
   'Reportagens e assessoria de imprensa.', 2136, 'principal'),
  ('Ultra Popular',                    'ultra-popular', null,
   'Lanchonete em Tapurah.', 1385, 'principal'),

  -- ===== 17 serviços (empresas.tudoagora.app.br) =====
  ('Body Life Academia',               'body-life-academia', null,
   'Academia com aulas funcionais e musculação.', null, 'servicos'),
  ('Hotel Empório do Sul',             'hotel-emporio-do-sul', null,
   'Hospedagem em Tapurah.', null, 'servicos'),
  ('Odontocompany',                    'odontocompany', null,
   'Clínica odontológica.', null, 'servicos'),
  ('Ricardo Celular',                  'ricardo-celular', 'ricardocelular',
   'Assistência e reparo de celulares.', null, 'servicos'),
  ('SA Pneus e Auto Center',           'sa-pneus-e-auto-center', null,
   'Pneus e centro automotivo.', null, 'servicos'),
  ('Amir Cabeleireiro',                'amir-cabeleireiro', null,
   'Cabeleireiro masculino.', null, 'servicos'),
  ('Auto Escola Central',              'auto-escola-central', null,
   'Autoescola.', null, 'servicos'),
  ('Dhione Auto Elétrica',             'dhione-auto-eletrica', null,
   'Elétrica automotiva.', null, 'servicos'),
  ('Edinho Auto Center',               'edinho-auto-center', null,
   'Centro automotivo.', null, 'servicos'),
  ('Fornari Construtora e Engenharia', 'fornari-construtora', 'fornari',
   'Construção e engenharia.', null, 'servicos'),
  ('Igor Auto Center',                 'igor-auto-center', null,
   'Centro automotivo.', null, 'servicos'),
  ('Lava Jato Avança Mix',             'lava-jato-avanca-mix', null,
   'Lavagem e detalhamento automotivo.', null, 'servicos'),
  ('Metal Tapurah',                    'metal-tapurah', 'metal',
   'Serviços em metal.', null, 'servicos'),
  ('RS Funilaria',                     'rs-funilaria', null,
   'Funilaria e reparos de carroceria.', null, 'servicos'),
  ('SA Ar Condicionado e Elétrica',    'sa-ar-condicionado', null,
   'Ar-condicionado e elétrica.', null, 'servicos'),
  ('Stop Car Auto Center - Itanhangá', 'stop-car-auto-center', null,
   'Centro automotivo em Itanhangá.', null, 'servicos'),
  ('Borracharia do Ledo',              'borracharia-do-ledo', null,
   'Borracharia e pneus.', null, 'servicos'),

  -- ===== 10 lojas (lojas.tudoagora.app.br) =====
  ('Furação Rolamentos e peças agrícolas', 'furacao-rolamentos', 'furacao',
   'Rolamentos e peças agrícolas.', null, 'lojas'),
  ('Sucrica Flores',                   'sucrica-flores', 'flores',
   'Flores e arranjos.', null, 'lojas'),
  ('Casa do Mel',                      'casa-do-mel', 'casadomel',
   'Produtos naturais e alimentos.', null, 'lojas'),
  ('Inovação Porcelanato',             'inovacao-porcelanato', 'inovacaoporcelanato',
   'Porcelanato e revestimentos.', null, 'lojas'),
  ('Marciós Ótica e Relojoaria',       'marcios-otica-e-relojoaria', 'marciosoticaerelojoaria',
   'Óptica, relógios e relojoaria.', null, 'lojas'),
  ('Mercadão dos Parafusos',           'mercadao-dos-parafusos', 'mercadao',
   'Ferramentas e parafusos.', null, 'lojas'),
  ('Moda Livre',                       'moda-livre', 'modalivre',
   'Moda e acessórios.', null, 'lojas'),
  ('Noval Tapurah Produtos de Limpeza', 'noval-produtos-de-limpeza', 'novaltapurahprodutosdelimpeza',
   'Produtos de limpeza.', null, 'lojas'),
  ('Rei das Capinhas',                 'rei-das-capinhas', 'reidascapinhas',
   'Capinhas e acessórios de celular.', null, 'lojas'),
  ('Vitoriana Fragrâncias',            'vitoriana-fragrancias', 'usevitoriana',
   'Perfumaria e fragrâncias.', null, 'lojas')
)
insert into public.businesses (city_id, name, slug, custom_slug, description, legacy_wp_id, source, status)
select 1, s.name, s.slug, s.custom_slug, s.description, s.legacy_wp_id, s.source, 'active'
from seed s
on conflict (city_id, slug) do nothing;

-- ⚠️  empresa legada com título corrompido no banco WP (id 2132).
-- Inserida como 'draft' e invisível ao público até o cadastro ser refeito.
insert into public.businesses (city_id, name, slug, description, legacy_wp_id, source, status)
values (1, 'Cadastro pendente de revisão (WP #2132)', 'cadastro-pendente-2132',
        'Título corrompido na origem — requer confirmação do lojista.', 2132, 'principal', 'draft')
on conflict (city_id, slug) do nothing;

-- ---------- CATEGORIAS DAS EMPRESAS ----------

-- principais
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id = 260  and c.slug = 'sorvetes-acai-sobremesas'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, false from public.businesses b, public.categories c
where b.legacy_wp_id = 260  and c.slug = 'lanchonetes'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (1527) and c.slug = 'churrascaria'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (1999, 2030, 2172) and c.slug = 'pizzas'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, false from public.businesses b, public.categories c
where b.legacy_wp_id in (1999, 2030, 1519, 1463, 1510) and c.slug = 'lanchonetes'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (2115, 261) and c.slug = 'lanchonetes'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, false from public.businesses b, public.categories c
where b.legacy_wp_id = 261 and c.slug = 'paes-e-doces'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id = 1985 and c.slug = 'restaurantes'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (2134, 2147, 2149, 2066) and c.slug = 'servicos'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (2107, 2151, 2109) and c.slug = 'servicos-publicos'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (2128, 2124, 2136, 2126) and c.slug = 'midia'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id = 1407 and c.slug = 'farmacias'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id = 2064 and c.slug = 'corridas'
on conflict do nothing;

-- serviços (17) — todos no grupo serviços
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.source = 'servicos' and c.slug = 'servicos'
on conflict do nothing;

update public.business_categories bc set is_primary = false
where bc.business_id in (select id from public.businesses where source = 'servicos');

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'ricardo-celular' and c.slug = 'eletronica-repair'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'hotel-emporio-do-sul' and c.slug = 'hospedagem'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'odontocompany' and c.slug = 'odontologia'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug in ('amir-cabeleireiro') and c.slug = 'salao-e-beleza'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug in ('body-life-academia') and c.slug = 'academias'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'auto-escola-central' and c.slug = 'educacao'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'fornari-construtora' and c.slug = 'construcao-engenharia'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug in ('sa-pneus-e-auto-center','dhione-auto-eletrica','edinho-auto-center',
                 'igor-auto-center','lava-jato-avanca-mix','metal-tapurah','rs-funilaria',
                 'sa-ar-condicionado','stop-car-auto-center','borracharia-do-ledo')
  and c.slug = 'automotivo'
on conflict do nothing;

-- lojas (10)
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.source = 'lojas' and c.slug = 'lojas'
on conflict do nothing;

update public.business_categories bc set is_primary = false
where bc.business_id in (select id from public.businesses where source = 'lojas');

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'moda-livre' and c.slug = 'moda-e-acessorios'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug in ('inovacao-porcelanato','mercadao-dos-parafusos') and c.slug = 'casa-e-construcao'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'vitoriana-fragrancias' and c.slug = 'perfumaria'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'casa-do-mel' and c.slug = 'alimentos'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'noval-produtos-de-limpeza' and c.slug = 'limpeza-e-higiene'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'marcios-otica-e-relojoaria' and c.slug = 'optica-e-relogios'
on conflict do nothing;
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.slug = 'sucrica-flores' and c.slug = 'floricultura'
on conflict do nothing;

-- ---------- AJUSTES QUE EXISTIAM SÓ COMO META `ta_*` NO WP ----------
-- Sabor da Itália (id 2172): único cardápio real do site
update public.businesses set
  fulfillment     = '{delivery,pickup}',
  payment_methods = '{pix,dinheiro,cartao_entrega}',
  delivery_fee_cents = 800,
  min_order_cents    = 0,
  whatsapp        = '5566992391831',
  phone           = '66992391831',
  address         = 'Rua Paraiba 178 Jardim Juliana',
  neighborhood    = 'Jardim Juliana',
  instagram       = '@pizzasabordaitaliadelivery',
  opening_hours   = '{"thu":[["18:00","22:00"]],"fri":[["18:00","22:00"]],"sat":[["18:00","22:00"]],"sun":[["18:00","22:00"]]}'::jsonb
where legacy_wp_id = 2172;

-- seção de cardápio (vinha como taxonomia interna do CPT oculto)
insert into public.menu_categories (business_id, name, slug, sort_order)
select b.id, 'Pizzas 01 Sabor', 'pizzas-01-sabor', 1
from public.businesses b where b.legacy_wp_id = 2172
on conflict do nothing;

insert into public.products (business_id, menu_category_id, name, description, price_cents, sort_order, source, legacy_wp_id)
select b.id, mc.id, v.name, v.description, v.price_cents, v.sort_order, 'wp_cardapio', v.legacy_wp_id
from public.businesses b
join public.menu_categories mc on mc.business_id = b.id and mc.slug = 'pizzas-01-sabor'
join (values
  ('Filé Mignon',
   'Suculentos pedaços de filé mignon grelhados no alho e manteiga, sobre massa italiana de 400 g, molho de tomate e muçarela. Recebe cebola, provolone defumado. Uma explosão de sabor em cada mordida.',
   1000, 1, 2173::bigint),
  ('Frango',
   'Frango desfiado, páprica defumada, massa italiana de 400g, molho de tomate, milho verde e orégano, finaliza com queijo cremoso cream cheese tudo harmonizado para um sabor irresistível.',
   1000, 2, 2175::bigint)
) as v(name, description, price_cents, sort_order, legacy_wp_id) on true
where b.legacy_wp_id = 2172;

-- Grupos de opção de pizza.
-- ATENÇÃO: no WP `pizza-config` devolvia [] — bordas e sabores NUNCA foram
-- cadastrados. Estes são placeholders para validar com o lojista antes de
-- ir para produção. "Sabores" fica sem valores de propósito.
-- `is_flavor_group = true` só no "Sabores": os valores desse grupo terão
-- preço cheio (a pizza cobra o sabor mais caro entre os escolhidos), enquanto
-- Tamanho e Borda seguem somando acréscimos.
insert into public.option_groups (business_id, name, min_select, max_select, is_required, sort_order, is_flavor_group)
select b.id, v.name, v.min_select, v.max_select, v.is_required, v.sort_order, v.is_flavor_group
from public.businesses b
join (values
  ('Tamanho',  1, 1, true,  1, false),
  ('Borda',    1, 1, true,  2, false),
  ('Sabores',  1, 4, false, 3, true)
) as v(name, min_select, max_select, is_required, sort_order, is_flavor_group) on true
where b.legacy_wp_id = 2172;

insert into public.option_values (option_group_id, name, price_delta_cents, sort_order)
select g.id, v.name, v.price_delta_cents, v.sort_order
from public.option_groups g
join public.businesses b on b.id = g.business_id
join (values
  ('Pequena 4 fatias',    0::bigint, 1),
  ('Grande 6 fatias',  1200::bigint, 2),
  ('Família 8 fatias',  2200::bigint, 3)
) as v(name, price_delta_cents, sort_order) on true
where b.legacy_wp_id = 2172 and g.name = 'Tamanho';

insert into public.option_values (option_group_id, name, price_delta_cents, sort_order)
select g.id, v.name, v.price_delta_cents, v.sort_order
from public.option_groups g
join public.businesses b on b.id = g.business_id
join (values
  ('Tradicional',   0::bigint, 1),
  ('Catupiry',    500::bigint, 2),
  ('Chocolate',   600::bigint, 3),
  ('Sem borda',     0::bigint, 4)
) as v(name, price_delta_cents, sort_order) on true
where b.legacy_wp_id = 2172 and g.name = 'Borda';

-- Elenco de opções por produto. A migration 0007 trocou a regra de herança:
-- antes, produto sem nenhuma linha aqui herdava TODOS os grupos da empresa, e
-- não havia como escrever "este item não tem opção". Agora o elenco é
-- obrigatório, então as duas pizzas precisam dizer quais grupos acceptam.
--
-- 'Sabores' fica de fora de propósito: o grupo foi criado sem valores, para
-- servir de placeholder a ser preenchido pelo lojista.
insert into public.product_option_groups (product_id, option_group_id)
select p.id, g.id
from public.products p
join public.businesses b on b.id = p.business_id
join public.option_groups g on g.business_id = b.id and g.name in ('Tamanho', 'Borda')
where b.legacy_wp_id = 2172
on conflict do nothing;

-- ---------- EM ALTA (seção "EM ALTA" da home) ----------

update public.businesses set is_featured = true, featured_until = now() + interval '90 days'
where slug in ('cacau-show', 'makarie-pizzaria-e-choperia', 'cabana-pizzaria', 'society-beer');

-- ---------- PLANOS (os 3 da página /planos/, que não existiam no backend) ----------

insert into public.plans (name, slug, tagline, price_cents, period, monthly_equivalent_cents, features, is_featured, sort_order) values
  ('Plano Essencial', 'essencial',
   'Para quem já tem cardápio digital ou trabalha via WhatsApp.',
   49900, 'year', 4990,
   '[
     "Presença no app",
     "Cadastro na categoria",
     "Divulgação de produtos e serviços",
     "Informações comerciais, telefone/WhatsApp, endereço e horário",
     "Pedidos e contatos direcionados para o WhatsApp"
   ]'::jsonb, false, 1),

  ('Plano Premium', 'premium',
   'Para empresas que querem receber pedidos e vender através do TudoAgora.',
   79900, 'year', 7990,
   '[
     "Tudo do Plano Essencial",
     "Cardápio digital completo",
     "Integração com meios de pagamento",
     "Recebimento de pedidos online",
     "Impressão de pedidos",
     "Organização dos pedidos para produção",
     "Vendas para retirada e vendas de balcão",
     "Participação em promoções e campanhas especiais",
     "Cupons exclusivos",
     "Banners rotativos",
     "Maior exposição"
   ]'::jsonb, true, 2),

  ('Plano Executivo', 'executivo',
   'Para quem quer uma presença digital completa.',
   119900, 'year', 11990,
   '[
     "Tudo do Plano Premium",
     "Landing page exclusiva",
     "Link personalizado com o nome da empresa",
     "Logomarca e fotos de produtos",
     "Apresentação completa",
     "Contato direto com o vendedor",
     "Solicitação de orçamento",
     "Consulta de preços",
     "Loja virtual para vendas online",
     "Campanhas de divulgação em redes sociais"
   ]'::jsonb, false, 3)
on conflict (slug) do nothing;

insert into public.plans (name, slug, tagline, price_cents, period, monthly_equivalent_cents, features, sort_order) values
  ('Montagem de cardápio', 'montagem-cardapio',
   'Nossa equipe monta o seu cardápio digital.',
   7990, 'month', null,
   '["Cadastro dos produtos, fotos, categorias e preços", "Configuração de delivery e retirada"]'::jsonb, 4)
on conflict (slug) do nothing;
