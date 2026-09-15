begin;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id),
  created_at timestamptz not null default now()
);

alter table public.quotations add column if not exists job_name text not null default 'Untitled';
alter table public.quotations add column if not exists quote_number text;
alter table public.quotations add column if not exists version integer not null default 1;
alter table public.quotations add column if not exists is_repeat_order boolean not null default false;
alter table public.quotations add column if not exists state jsonb;
alter table public.quotations add column if not exists updated_at timestamptz not null default now();
alter table public.quotations add column if not exists revision bigint not null default 0;
alter table public.quotations add column if not exists deleted_at timestamptz;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quotations' and column_name = 'data') then
    execute 'update public.quotations set state = data where state is null';
    execute 'alter table public.quotations alter column data drop not null';
  end if;
end $$;

update public.quotations set state = '{}'::jsonb where state is null;
alter table public.quotations alter column state set not null;
create index if not exists quotations_client_updated_idx on public.quotations(client_id, updated_at desc) where deleted_at is null;
create index if not exists quotations_updated_idx on public.quotations(updated_at desc) where deleted_at is null;

do $$
begin
  if exists (select 1 from public.quotations where quote_number is not null group by quote_number, version having count(*) > 1) then
    raise exception 'Duplicate quote_number/version pairs exist. Review and resolve identifiers before applying this migration; no records have been deleted.';
  end if;
end $$;
create unique index if not exists quotations_number_version_idx on public.quotations(quote_number, version);

create or replace function public.save_quotation_checked(payload jsonb, expected_revision bigint)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  existing public.quotations%rowtype;
  saved public.quotations%rowtype;
  target_id uuid := (payload->>'id')::uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_id::text, 0));
  select * into existing from public.quotations where id = target_id for update;
  if found then
    if existing.deleted_at is not null or existing.revision <> expected_revision or existing.client_id <> (payload->>'client_id')::uuid then
      raise exception 'Quotation conflict: reload or copy your draft' using errcode = '40001';
    end if;
    update public.quotations set
      job_name = coalesce(payload->>'job_name', 'Untitled'),
      state = payload->'state', is_repeat_order = false,
      updated_at = now(), revision = existing.revision + 1
    where id = target_id returning * into saved;
  else
    if expected_revision <> 0 then raise exception 'Quotation no longer exists' using errcode = '40001'; end if;
    insert into public.quotations(id, client_id, job_name, quote_number, version, state, revision)
      values(target_id, (payload->>'client_id')::uuid, coalesce(payload->>'job_name', 'Untitled'),
        payload->>'quote_number', coalesce((payload->>'version')::integer, 1), payload->'state', 1)
      returning * into saved;
  end if;
  return to_jsonb(saved);
end $$;

create or replace function public.delete_quotation_checked(quotation_id uuid)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(quotation_id::text, 0));
  insert into public.quotations(id, state, deleted_at, revision)
  values(quotation_id, '{}'::jsonb, now(), 1)
  on conflict (id) do update set deleted_at = coalesce(quotations.deleted_at, now()),
    revision = quotations.revision + 1, updated_at = now()
  where quotations.deleted_at is null;
end $$;

alter table public.clients enable row level security;
alter table public.quotations enable row level security;
revoke all on public.clients, public.quotations from anon, authenticated;
revoke all on function public.save_quotation_checked(jsonb, bigint) from public;
revoke all on function public.delete_quotation_checked(uuid) from public;

commit;