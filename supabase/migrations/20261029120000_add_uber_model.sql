-- Adds the Uber plate model used by the USETAG product catalog.
alter table public.sale_items
  drop constraint if exists sale_items_model_check;

alter table public.sale_items
  add constraint sale_items_model_check
  check (model = any (array['google'::text, 'instagram'::text, 'uber'::text]));
