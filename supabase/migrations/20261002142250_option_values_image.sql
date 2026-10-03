-- Adiciona imagem por valor de opção
alter table public.option_values
  add column if not exists image_url text;