-- New, isolated project only. Review and test locally before any remote application.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id), owner_id uuid not null unique references auth.users(id),
 name text not null default 'Eduardo', rate_bps integer not null default 500 check(rate_bps between 0 and 10000),
 created_at timestamptz not null default now(), check(id=owner_id)
);
create table public.clients (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 160), cpf text, phone text, email text,
 street text, number text, complement text, district text, city text, uf text, cep text,
 archived_at timestamptz, created_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.sales (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),client_id uuid not null,
 amount_cents bigint not null check(amount_cents between 1 and 10000000000), sold_on date not null,
 payment_method text, payment_status text not null check(payment_status in ('analysis','pending','approved','cancelled')),
 commission_rate_bps integer not null check(commission_rate_bps between 0 and 10000),note text,
 archived_at timestamptz,version integer not null default 1,created_at timestamptz not null default now(),
 idempotency_key uuid not null,unique(owner_id,idempotency_key),unique(id,owner_id),
 foreign key(client_id,owner_id) references public.clients(id,owner_id)
);
create table public.sale_items (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),sale_id uuid not null,
 model text not null check(model in ('google','instagram')),color text check(color in ('blue','black')),
 quantity integer not null check(quantity between 1 and 100000),is_gift boolean not null default false,
 check(model<>'google' or color is not null),foreign key(sale_id,owner_id) references public.sales(id,owner_id)
);
create table public.commissions (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),sale_id uuid not null unique,
 entitlement_cents bigint not null check(entitlement_cents>=0),rule_version integer not null default 1,
 created_at timestamptz not null default now(),unique(id,owner_id),
 foreign key(sale_id,owner_id) references public.sales(id,owner_id)
);
create table public.commission_payments (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),amount_cents bigint not null check(amount_cents>0),
 received_on date not null,description text,idempotency_key uuid not null,created_at timestamptz not null default now(),
 unique(owner_id,idempotency_key),unique(id,owner_id)
);
create table public.commission_allocations (
 owner_id uuid not null references auth.users(id),payment_id uuid not null,commission_id uuid not null,
 amount_cents bigint not null check(amount_cents>0),primary key(payment_id,commission_id),
 foreign key(payment_id,owner_id) references public.commission_payments(id,owner_id),
 foreign key(commission_id,owner_id) references public.commissions(id,owner_id)
);
create table public.financial_transactions (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),
 direction text not null check(direction in ('in','out')),amount_cents bigint not null check(amount_cents>0),
 occurred_on date not null,description text not null,category text,status text not null check(status in ('pending','confirmed')),
 payment_id uuid unique,created_at timestamptz not null default now(),
 foreign key(payment_id,owner_id) references public.commission_payments(id,owner_id)
);
create table public.commission_adjustments (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),commission_id uuid not null,
 amount_cents bigint not null check(amount_cents>0),reason text not null,event_key text not null,
 status text not null default 'unresolved' check(status in ('unresolved','resolved')),
 created_at timestamptz not null default now(),unique(commission_id,event_key),
 foreign key(commission_id,owner_id) references public.commissions(id,owner_id)
);
create table public.goals (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null unique references auth.users(id),
 amount_cents bigint not null check(amount_cents>0),starts_on date not null,ends_on date not null,name text not null,
 created_at timestamptz not null default now(),check(starts_on<=ends_on)
);
create table public.receipts (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),sale_id uuid not null,
 object_path text not null unique,byte_size integer not null check(byte_size between 1 and 10485760),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
 display_name text not null,created_at timestamptz not null default now(),
 foreign key(sale_id,owner_id) references public.sales(id,owner_id)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),actor_id uuid not null,
 entity text not null,event text not null,entity_id uuid,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
create table public.import_runs (
 owner_id uuid not null references auth.users(id),import_key uuid not null,fingerprint text not null,created_at timestamptz not null default now(),primary key(owner_id,import_key)
);
create table private.command_runs (
 owner_id uuid not null references auth.users(id),command_key uuid not null,payload_fingerprint text not null,
 result jsonb not null,created_at timestamptz not null default now(),primary key(owner_id,command_key)
);
alter table private.command_runs enable row level security;

do $$ declare t text;begin
 foreach t in array array['profiles','clients','sales','sale_items','commissions','commission_payments','commission_allocations','financial_transactions','commission_adjustments','goals','receipts','audit_logs','import_runs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_select on public.%I for select to authenticated using (owner_id=(select auth.uid()))',t);
 end loop;
end $$;
create index sales_owner_date on public.sales(owner_id,sold_on desc,id);
create index sales_owner_status on public.sales(owner_id,payment_status);
create index clients_owner_name on public.clients(owner_id,name);
create index items_sale on public.sale_items(owner_id,sale_id);
create index commissions_owner_sale on public.commissions(owner_id,sale_id);
create index allocations_owner_commission on public.commission_allocations(owner_id,commission_id);
create index payments_owner_date on public.commission_payments(owner_id,received_on);
create index cash_owner_date on public.financial_transactions(owner_id,occurred_on);
create index receipts_owner_sale on public.receipts(owner_id,sale_id);
create index audit_owner_date on public.audit_logs(owner_id,created_at desc);

-- All writes share an owner-level transaction lock. Direct client DML is revoked.
-- This serializes payment, cancellation, editing and idempotent replay for one owner.
create function private.apply_panel_command(p jsonb,k uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); action text:=p->>'action'; sid uuid;cid uuid;pid uuid;cmd uuid;row_sale public.sales;
 item jsonb;alloc jsonb;existing jsonb;old_fingerprint text;answer jsonb;amount bigint;entitlement bigint;paid bigint;total bigint:=0;
 item_count integer;rate integer;new_version integer;kind text;event_metadata jsonb:='{}'::jsonb;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select r.result,r.payload_fingerprint into existing,old_fingerprint from private.command_runs r where r.owner_id=u and r.command_key=k;
 if found then
  if old_fingerprint<>encode(sha256(convert_to(p::text,'UTF8')),'hex') then raise exception 'Idempotency key already used with another payload';end if;
  return existing;
 end if;
 insert into public.profiles(id,owner_id) values(u,u) on conflict(id) do nothing;
 if action='client.save' then
  cid:=(p->>'id')::uuid;
  if exists(select 1 from public.clients where id=cid and owner_id<>u) then raise exception 'Client unavailable' using errcode='42501';end if;
  insert into public.clients(id,owner_id,name,cpf,phone,email,street,number,complement,district,city,uf,cep,archived_at)
  values(cid,u,p->>'name',p->>'cpf',p->>'phone',p->>'email',p->>'street',p->>'number',p->>'complement',p->>'district',p->>'city',p->>'uf',p->>'cep',case when (p->>'archived')::boolean then now() else null end)
  on conflict(id) do update set name=excluded.name,cpf=excluded.cpf,phone=excluded.phone,email=excluded.email,street=excluded.street,number=excluded.number,complement=excluded.complement,district=excluded.district,city=excluded.city,uf=excluded.uf,cep=excluded.cep,archived_at=excluded.archived_at;
  answer:=jsonb_build_object('id',cid);
 elsif action='sale.save' then
  sid:=(p->>'id')::uuid;
  if nullif(p->>'client','') is null or length(p->>'client')>160 then raise exception 'Invalid client name';end if;
  if jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 100 then raise exception 'Invalid sale items';end if;
  select * into row_sale from public.sales where id=sid and owner_id=u for update;
  if found then
   if row_sale.version<>(p->>'version')::integer-1 then raise exception 'Sale changed; reload before editing' using errcode='40001';end if;
   cid:=row_sale.client_id;rate:=row_sale.commission_rate_bps;new_version:=row_sale.version+1;
   -- Client identity is stable; names never cause automatic merging.
   update public.clients set name=p->>'client' where id=cid and owner_id=u;
   update public.sales set amount_cents=(p->>'amountCents')::bigint,sold_on=(p->>'soldOn')::date,
     payment_status=p->>'status',version=new_version where id=sid and owner_id=u;
   delete from public.sale_items where sale_id=sid and owner_id=u;
  else
   if nullif(p->>'clientId','') is not null then
    select id into cid from public.clients where id=(p->>'clientId')::uuid and owner_id=u;
    if not found then raise exception 'Client unavailable' using errcode='42501';end if;
   else
    cid:=gen_random_uuid();insert into public.clients(id,owner_id,name) values(cid,u,p->>'client');
   end if;
   select rate_bps into rate from public.profiles where owner_id=u;
   insert into public.sales(id,owner_id,client_id,amount_cents,sold_on,payment_status,commission_rate_bps,idempotency_key)
    values(sid,u,cid,(p->>'amountCents')::bigint,(p->>'soldOn')::date,p->>'status',rate,k);
   new_version:=1;
  end if;
  for item in select value from jsonb_array_elements(p->'items') loop
   insert into public.sale_items(owner_id,sale_id,model,color,quantity,is_gift)
   values(u,sid,item->>'model',nullif(item->>'color',''),(item->>'quantity')::integer,coalesce((item->>'isGift')::boolean,false));
  end loop;
  select floor((amount_cents::numeric*commission_rate_bps+5000)/10000)::bigint into entitlement from public.sales where id=sid and owner_id=u and payment_status='approved';
  insert into public.commissions(owner_id,sale_id,entitlement_cents) values(u,sid,coalesce(entitlement,0))
   on conflict(sale_id) do update set entitlement_cents=excluded.entitlement_cents;
  select id into cmd from public.commissions where sale_id=sid and owner_id=u;
  select coalesce(sum(amount_cents),0) into paid from public.commission_allocations where commission_id=cmd and owner_id=u;
  -- Resolve earlier snapshots, then record the current excess once per sale version.
  update public.commission_adjustments set status='resolved' where commission_id=cmd and owner_id=u and status='unresolved';
  if paid>coalesce(entitlement,0) then
   insert into public.commission_adjustments(owner_id,commission_id,amount_cents,reason,event_key)
    values(u,cmd,paid-coalesce(entitlement,0),'Entitlement changed after receipt','sale-version-'||new_version);
  end if;
  event_metadata:=jsonb_build_object('before',case when row_sale.id is null then null else jsonb_build_object('amount_cents',row_sale.amount_cents,'payment_status',row_sale.payment_status,'commission_rate_bps',row_sale.commission_rate_bps,'version',row_sale.version) end,
   'after',jsonb_build_object('amount_cents',(p->>'amountCents')::bigint,'payment_status',p->>'status','commission_rate_bps',rate,'entitlement_cents',coalesce(entitlement,0),'version',new_version));
  answer:=jsonb_build_object('id',sid);
 elsif action='sale.archive' then
  sid:=(p->>'id')::uuid;
  update public.sales set archived_at=case when (p->>'archived')::boolean then now() else null end,version=version+1
   where id=sid and owner_id=u and version=(p->>'version')::integer;
  if not found then raise exception 'Sale not found or changed' using errcode='40001';end if;
  answer:=jsonb_build_object('id',sid);
 elsif action='payment.create' then
  amount:=(p->>'amountCents')::bigint;
  if amount<=0 or jsonb_typeof(p->'allocations')<>'array' or jsonb_array_length(p->'allocations') not between 1 and 100 then raise exception 'Invalid allocations';end if;
  pid:=gen_random_uuid();
  insert into public.commission_payments(id,owner_id,amount_cents,received_on,description,idempotency_key)
   values(pid,u,amount,(p->>'date')::date,'Recebimento de comissão',k);
  for alloc in select value from jsonb_array_elements(p->'allocations') loop
   select id,entitlement_cents into cmd,entitlement from public.commissions where sale_id=(alloc->>'saleId')::uuid and owner_id=u for update;
   if not found then raise exception 'Commission not found' using errcode='42501';end if;
   select coalesce(sum(amount_cents),0) into paid from public.commission_allocations where commission_id=cmd and owner_id=u;
   if (alloc->>'amountCents')::bigint<=0 or (alloc->>'amountCents')::bigint>entitlement-paid then raise exception 'Allocation exceeds available balance';end if;
   total:=total+(alloc->>'amountCents')::bigint;
   insert into public.commission_allocations(owner_id,payment_id,commission_id,amount_cents) values(u,pid,cmd,(alloc->>'amountCents')::bigint);
  end loop;
  if total<>amount then raise exception 'Allocation sum must equal payment';end if;
  insert into public.financial_transactions(owner_id,direction,amount_cents,occurred_on,description,category,status,payment_id)
   values(u,'in',amount,(p->>'date')::date,'Recebimento de comissão','commission','confirmed',pid);
  answer:=jsonb_build_object('id',pid);
 elsif action='cash.create' then
  pid:=(p->>'id')::uuid;
  insert into public.financial_transactions(id,owner_id,direction,amount_cents,occurred_on,description,status,category)
   values(pid,u,p->>'direction',(p->>'amountCents')::bigint,(p->>'date')::date,p->>'description',case when (p->>'confirmed')::boolean then 'confirmed' else 'pending' end,'manual');
  answer:=jsonb_build_object('id',pid);
 elsif action='goal.save' then
  insert into public.goals(owner_id,amount_cents,starts_on,ends_on,name) values(u,(p->>'amountCents')::bigint,(p->>'startsOn')::date,(p->>'endsOn')::date,p->>'name')
   on conflict(owner_id) do update set amount_cents=excluded.amount_cents,starts_on=excluded.starts_on,ends_on=excluded.ends_on,name=excluded.name;
  answer:=jsonb_build_object('ok',true);
 elsif action='import.run' then
  if jsonb_typeof(p->'sales')<>'array' or jsonb_array_length(p->'sales') not between 1 and 100 then raise exception 'Invalid import';end if;
  select fingerprint into kind from public.import_runs where owner_id=u and import_key=(p->>'importKey')::uuid;
  if found then
   if kind<>md5(p::text) then raise exception 'Import key reused with changed content';end if;
   answer:=jsonb_build_object('alreadyImported',true);
  else
   insert into public.import_runs(owner_id,import_key,fingerprint) values(u,(p->>'importKey')::uuid,md5(p::text));
   select rate_bps into rate from public.profiles where owner_id=u;
   update public.profiles set rate_bps=500 where owner_id=u;
   for item in select value from jsonb_array_elements(p->'sales') loop
    perform private.apply_panel_command(item||jsonb_build_object('action','sale.save','id',gen_random_uuid(),'version',1),gen_random_uuid());
   end loop;
   update public.profiles set rate_bps=rate where owner_id=u;
   perform private.apply_panel_command((p->'goal')||jsonb_build_object('action','goal.save'),gen_random_uuid());
   answer:=jsonb_build_object('alreadyImported',false);
  end if;
 elsif action='profile.save' then
  update public.profiles set name=p->>'name',rate_bps=(p->>'rateBps')::integer where owner_id=u;
  answer:=jsonb_build_object('ok',true);
 else raise exception 'Unsupported command';
 end if;
 insert into public.audit_logs(owner_id,actor_id,entity,event,entity_id,metadata) values(u,u,split_part(action,'.',1),action,coalesce(sid,pid,cid),event_metadata);
 -- Store only a payload fingerprint for replay; no CPF, addresses or dispatch prompts.
 insert into private.command_runs(owner_id,command_key,payload_fingerprint,result) values(u,k,encode(sha256(convert_to(p::text,'UTF8')),'hex'),answer);
 return answer;
end $$;
revoke all on function private.apply_panel_command(jsonb,uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.apply_panel_command(jsonb,uuid) to authenticated;
create function public.panel_command(p jsonb,k uuid) returns jsonb language sql security invoker set search_path='' as $$select private.apply_panel_command(p,k);$$;
revoke all on function public.panel_command(jsonb,uuid) from public,anon;
grant execute on function public.panel_command(jsonb,uuid) to authenticated;

create table private.ai_budgets(owner_id uuid primary key references auth.users(id),window_start bigint not null,used integer not null);
alter table private.ai_budgets enable row level security;
create function private.consume_ai_budget() returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w bigint:=floor(extract(epoch from now())/600);count_used integer;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 insert into private.ai_budgets values(u,w,1) on conflict(owner_id) do update set
  used=case when ai_budgets.window_start=w then ai_budgets.used+1 else 1 end,window_start=w returning used into count_used;
 return count_used<=15;
end $$;
revoke all on function private.consume_ai_budget() from public,anon;
grant execute on function private.consume_ai_budget() to authenticated;
create function public.consume_panel_ai_budget() returns boolean language sql security invoker set search_path='' as $$select private.consume_ai_budget();$$;
revoke all on function public.consume_panel_ai_budget() from public,anon;
grant execute on function public.consume_panel_ai_budget() to authenticated;

-- Storage writes are server-mediated; browser users cannot upload arbitrary files.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('panel-receipts','panel-receipts',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']);
create policy panel_receipt_read on storage.objects for select to authenticated using (
 bucket_id='panel-receipts' and exists(select 1 from public.receipts r where r.owner_id=(select auth.uid()) and r.object_path=name)
);
grant select,insert on public.receipts,public.audit_logs to service_role;
commit;
