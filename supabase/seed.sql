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

-- ---------- CATEGORIAS (árvore de 2 níveis, auto-referente) ----------
--
-- `parent_id is null` = categoria principal (as 9 pílulas da home).
-- `parent_id` preenchido = subcategoria (o antigo `categories.group_id`).
-- Os ids 34-42 são as antigas `groups`; os ids 1-33 são as subcategorias e
-- mantêm o id original para que os `business_categories` abaixo continuem
-- válidos. Onde o slug da subcategoria colidia com o da principal, a
-- subcategoria recebe um slug próprio (o da principal vence, porque
-- `/g/<slug>` é URL pública).

insert into public.categories (id, name, slug, parent_id, image_url, is_order_capable, sort_order) values
  -- comida
  (1,  'Pizzas',                      'pizzas',                    34, null, true,  1),
  (2,  'Lanchonetes',                 'lanchonetes',               34, null, true,  2),
  (3,  'Hambúrguer',                  'hamburguer',                34, null, true,  3),
  (4,  'Restaurantes',                'restaurantes',              34, null, true,  4),
  (5,  'Comida japonesa',             'comida-japonesa',           34, null, true,  5),
  (6,  'Churrascaria',                'churrascaria',              34, null, true,  6),
  (7,  'Pães e doces',                'paes-e-doces',              34, null, true,  7),
  -- sorvetes
  (8,  'Sorvetes, açaí e sobremesas', 'sorvetes-acai-sobremesas',  35, null, true,  1),
  -- bebida
  (9,  'Conveniência',                'conveniencia',              36, null, true,  1),
  (10, 'Bebidas',                     'bebidas',                   36, null, true,  2),
  -- farmacia
  (11, 'Farmácias',                   'farmacias',                 37, null, true,  1),
  (12, 'Saúde e beleza',              'saude-e-beleza',            37, null, true,  2),
  (13, 'Academias',                   'academias',                 37, null, true,  3),
  -- servicos
  (14, 'Serviços em geral',           'servicos-em-geral',         38, null, false, 1),
  (15, 'Automotivo',                  'automotivo',                38, null, false, 2),
  (16, 'Construção e engenharia',     'construcao-engenharia',     38, null, false, 3),
  (17, 'Educação',                    'educacao',                  38, null, false, 4),
  (18, 'Eletrônica e repair',         'eletronica-repair',         38, null, false, 5),
  (19, 'Hospedagem',                  'hospedagem',                38, null, false, 6),
  (20, 'Odontologia',                 'odontologia',               38, null, false, 7),
  (21, 'Salão e beleza',              'salao-e-beleza',            38, null, false, 8),
  -- lojas
  (22, 'Lojas',                       'lojas-gerais',              39, null, true,  1),
  (23, 'Moda e acessórios',           'moda-e-acessorios',         39, null, true,  2),
  (24, 'Casa e construção',           'casa-e-construcao',         39, null, true,  3),
  (25, 'Perfumaria',                  'perfumaria',                39, null, true,  4),
  (26, 'Alimentos',                   'alimentos',                 39, null, true,  5),
  (27, 'Limpeza e higiene',            'limpeza-e-higiene',         39, null, true,  6),
  (28, 'Óptica e relógios',            'optica-e-relogios',         39, null, true,  7),
  (29, 'Floricultura',                'floricultura',              39, null, true,  8),
  -- corridas
  (30, 'Corridas e táxis',            'corridas-e-taxis',          40, null, true,  1),
  -- uteis
  (31, 'Telefones úteis',             'telefones-uteis',           41, null, false, 1),
  (32, 'Serviços públicos',           'servicos-publicos',         41, null, false, 2),
  -- midia
  (33, 'Mídia e Assessoria',          'midia-e-assessoria',        42, null, false, 1),
  -- categorias principais (antes `groups`)
  (34, 'Comida',                      'comida',   null, '/grupos/comida.jpg',   false, 1),
  (35, 'Sorvetes, Açaí e Sobremesas', 'sorvetes', null, '/grupos/sorvetes.jpg', false, 2),
  (36, 'Conveniência',                'bebida',   null, '/grupos/bebida.jpg',   false, 3),
  (37, 'Farmácias, saúde e beleza',   'farmacia', null, '/grupos/farmacia.jpg', false, 4),
  (38, 'Serviços',                    'servicos', null, '/grupos/servicos.jpg', false, 5),
  (39, 'Lojas',                       'lojas',    null, '/grupos/lojas.jpg',    false, 6),
  (40, 'Corridas',                    'corridas', null, '/grupos/corridas.jpg', false, 7),
  (41, 'Úteis',                       'uteis',    null, '/grupos/uteis.jpg',    false, 8),
  (42, 'Mídia',                       'midia',    null, '/grupos/midia.jpg',    false, 9)
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('public.categories', 'id'), 42, true);

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

-- ---------- CARDÁPIO DE FORA DAS EMPRESAS ----------
--
-- `menu_url` (migration 00014) é o link para onde o cliente sai do site quando a
-- empresa vende em outro lugar: app de delivery, site próprio, grupo ou
-- conversa de WhatsApp. Este bloco tem que ficar DEPOIS do insert das empresas
-- acima — e é por isso que a carga não está na migration: num
-- `supabase db reset` as migrations rodam antes do seed, e um `update` desta
-- tabela dentro da migration não acharia empresa nenhuma.
--
-- O casamento é pelo NOME, e não pelo id: os ids são da base de produção e um
-- reset local numera diferente, enquanto o nome é o que o admin reconhece na
-- tela. Os 22 nomes abaixo foram conferidos um a um contra
-- `select id, name from businesses` no cloud (54 linhas, todos distintos) e
-- batem com os nomes deste arquivo.
--
-- As linhas da planilha "Loja/Empresa x Link1" que NÃO entraram aqui são duas
-- por não existir empresa com esse nome na base (virar cadastro novo é coisa do
-- admin):
--
--   Grupo OFC (Tapurah) MT  https://chat.whatsapp.com/Hs1eY1ZkZ7m4173Yut72LM?s=cl&p=a&mlu=4&ilr=4
--   Polícia Civil            https://wa.me/5566999945815?text=...
--
-- ...e três por apontarem para o site antigo, explicadas no fim deste bloco.
--
-- Diferenças de grafia entre a planilha e o banco, resolvidas para o nome que
-- está no banco: "Açaíteria e Pastelaria Palmeiras" (planilha: "Aiçaíteria"),
-- "Hospital Municipal de Tapurah" (planilha: "Hospital Tapurah"), "Makariê
-- Pizzaria e Choperia" (planilha: "Makarê"), "Plesnergóis" (planilha:
-- "Plesnergás"). "TV Buritis (reportagem)" na planilha é a empresa 24, "TV
-- Buritis" — o parênteses era anotação da planilha, não parte do nome.
--
-- Muitos dos links são wa.me/chat.whatsapp.com.
--
-- Três linhas da planilha apontavam para o host antigo do projeto
-- (tudoagora-app-br-950721.hostingersite.com) e NÃO entraram aqui. Trocar o
-- host pelo domínio atual não produz link melhor em nenhum dos três:
--
--   Master Farma       a URL era a vitrine (masterfarma.<host-antigo>/). Não há
--                      produto nenhum cadastrado no cardápio desta empresa, então
--                      /cardapio/masterfarma abriria uma vitrine vazia.
--   Sabor da Itália    a URL era /cardapio/?loja=2172, um id do site antigo. A
--                      empresa tem cardápio nativo funcionando (é o único cardápio
--                      real do site), e gravar a própria vitrine no menu_url só
--                      trocaria o botão "Pedir online" por "Ver cardápio" abrindo a
--                      mesma página em outra aba.
--   Tapurah.com        a URL era a própria página da empresa
--      (.../empresa/tapurah-com/). Trocar o host deixaria o botão "Ver cardápio"
--      apontando para a página que o cliente já está vendo.
--
-- Preferimos o campo vazio a um botão que abre a página vazia, a própria página
-- ou um id que não existe mais. As três empresas continuam sem cardápio externo:
-- a Sabor da Itália pelo cardápio nativo, as outras duas pelo WhatsApp/categorias.
-- Se algum desses links voltar a fazer sentido, é só acrescentar o par aqui.
--
-- O `raise exception` no fim existe para o casamento falhar alto: se alguém
-- renomear uma destas empresas depois daqui, o seed deixa de ser
-- silenciosamente parcial e falha na aplicação, em vez de dar um "rodou" que
-- cadastrou 20 dos 22 links. Idempotente no resto: rodar de novo regrava os
-- mesmos 22 valores.
do $$
declare
  gravadas integer;
begin
  update public.businesses b
     set menu_url = v.link
    from (values
      ('Açaíteria e Pastelaria Palmeiras',
       'https://www.hubt.com.br/acaiteria-e-pastelaria-palmeiras/'),
      ('Brasa Nobre Churrascaria',
       'https://wa.me/5566992049283?text=Ol%C3%A1%20venho%20atrav%C3%A9s%20do%20Tudo%20Agora'),
      ('Cabana Pizzaria',
       'https://pedir.delivery/app/cabanapizzariaa/menu'),
      ('Cacau Show',
       'https://dire.to/cacaushowtapurah'),
      ('Chapa Quente Lanches',
       'https://app.anota.ai/m/kUEyWkZPw'),
      ('Fest Food',
       'https://wa.me/5566992000846?text=Ol%C3%A1%20venho%20atrav%C3%A9s%20do%20Tudo%20Agora.%20Quero%20mais%20informa%C3%A7%C3%B5es'),
      ('Grupo WhatsApp Tapurah compra e vendas',
       'https://chat.whatsapp.com/HYJHULkrMfPFzXczOaVWav'),
      ('Hospital Municipal de Tapurah',
       'https://wa.me/556699862489?text=Venho%20do%20Tudo%20Agora%20App%2C%20preciso%20de%20informa%C3%A7%C3%B5es'),
      ('Jones entrega',
       'https://wa.me/5566996611996?text=Venho%20do%20Tudo%20Agora%20App%2C%20preciso%20de%20uma%20entrega'),
      ('Jornal Caiabis Online',
       'https://www.caiabisonline.com.br/'),
      ('JP Doces e Salgados',
       'https://wa.me/556599657987?text=Ol%C3%A1%20venho%20atrav%C3%A9s%20do%20Tudo%20Agora'),
('Makariê Pizzaria e Choperia',
        'https://makariepizzariaechoperia.sisfood.com.br/loja'),
       ('Paxplesner',
       'https://paxplesner.com/'),
      ('Plesnergóis',
       'https://wa.me/5566992221022?text=Venho%20do%20Tudo%20Agora%20App%2C%20preciso%20de%20informa%C3%A7%C3%B5es'),
      ('Polícia Militar de Tapurah',
       'https://wa.me/66999365864?text=Venho%20do%20Tudo%20Agora%20App%2C%20pode%20me%20atender?'),
      ('Prefeitura de Tapurah',
       'https://wa.me/5566992373640?text=Venho%20do%20Tudo%20Agora%20App%2C%20preciso%20de%20informa%C3%A7%C3%B5es'),
      ('R11Notícias',
       'https://www.r11noticias.com.br/'),
      ('Restaurante Fio de Azeite',
       'https://wa.me/5547988302191?text=Ol%C3%A1%20venho%20atrav%C3%A9s%20do%20Tudo%20Agora.%20Quero%20mais%20informa%C3%A7%C3%B5es'),
      ('Society Beer Lanchonete e Pizzaria',
       'https://delivery.yooga.app/society-beer/tabs/home'),
      ('Taxi Ortega',
       'https://wa.me/556699950055?text=Ol%C3%A1%20venho%20atrav%C3%A9s%20do%20Tudo%20Agora.%20Quero%20o%20servi%C3%A7o%20de%20taxi'),
      ('TV Buritis',
       'https://wa.me/5566997238988?text=Venho%20do%20Tudo%20Agora%20App%2C%20preciso%20de%20informa%C3%A7%C3%B5es'),
      ('Ultra Popular',
       'https://wa.me/5566999645045?text=Ol%C3%A1%20venho%20atrav%C3%A9s%20do%20Tudo%20Agora')
    ) as v(nome, link)
   where b.name = v.nome;

  get diagnostics gravadas = row_count;

  if gravadas <> 22 then
    raise exception
      'menu_url: a carga dos cardápios de fora esperava 22 empresas e atualizou %', gravadas;
  end if;
end
$$;

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
where b.legacy_wp_id in (2134, 2147, 2149, 2066) and c.slug = 'servicos-em-geral'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (2107, 2151, 2109) and c.slug = 'servicos-publicos'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id in (2128, 2124, 2136, 2126) and c.slug = 'midia-e-assessoria'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id = 1407 and c.slug = 'farmacias'
on conflict do nothing;

insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.legacy_wp_id = 2064 and c.slug = 'corridas-e-taxis'
on conflict do nothing;

-- serviços (17) — todos no grupo serviços
insert into public.business_categories (business_id, category_id, is_primary)
select b.id, c.id, true from public.businesses b, public.categories c
where b.source = 'servicos' and c.slug = 'servicos-em-geral'
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
where b.source = 'lojas' and c.slug = 'lojas-gerais'
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

-- ---------- BANNER DE PUBLICIDADE (faixa comercial da home) ----------
--
-- `placement = 'publicidade'` é a faixa que entra DEPOIS de "Destaques em
-- {cidade}". Ela é da casa (`business_id is null`) e aponta para /planos.
--
-- `image_url` guarda o caminho servido pelo Next (`public/banners/publicidade/`),
-- e não a URL do site antigo: o deploy não pode depender do Hostinger cair.
-- Os arquivos são 1600x533 (3:1) e o texto do anúncio já está na arte — por
-- isso a faixa não desenha título por cima, o `title` aqui é só o rótulo/alt.
--
-- `banners` só tem PK por `id`, então `on conflict` não dá para este insert
-- idempotente: o guard é um `not exists` por arte dentro do placement.
insert into public.banners (title, image_url, link_url, placement, sort_order, is_active)
select v.title, v.image_url, v.link_url, 'publicidade', v.sort_order, true
from (values
  ('Anuncie no Tudo Agora em Tapurah', '/banners/publicidade/anuncie-tapurah-1.png', '/planos', 1),
  ('Divulgue seu negócio em Tapurah',    '/banners/publicidade/anuncie-tapurah-2.png', '/planos', 2)
) as v(title, image_url, link_url, sort_order)
where not exists (
  select 1
  from public.banners b
  where b.placement = 'publicidade' and b.image_url = v.image_url
);
