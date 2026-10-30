begin;

alter table public.profiles
  add column if not exists commission_settlement jsonb not null default '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_commission_settlement_object_check;

alter table public.profiles
  add constraint profiles_commission_settlement_object_check
  check (jsonb_typeof(commission_settlement) = 'object');

commit;
