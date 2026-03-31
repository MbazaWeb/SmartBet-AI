create extension if not exists pgcrypto;

create table if not exists public.fixture_snapshots (
  fixture_id text primary key,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  utc_date timestamptz,
  status_category text,
  is_played boolean not null default false,
  source text,
  fixture jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists fixture_snapshots_last_seen_at_idx on public.fixture_snapshots (last_seen_at desc);
create index if not exists fixture_snapshots_utc_date_idx on public.fixture_snapshots (utc_date asc);
create index if not exists fixture_snapshots_status_category_idx on public.fixture_snapshots (status_category);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.fixture_snapshots to anon, authenticated, service_role;

alter table public.fixture_snapshots enable row level security;

drop policy if exists "fixture_snapshots_read" on public.fixture_snapshots;
create policy "fixture_snapshots_read"
on public.fixture_snapshots
for select
to anon, authenticated
using (true);

drop policy if exists "fixture_snapshots_write" on public.fixture_snapshots;
create policy "fixture_snapshots_write"
on public.fixture_snapshots
for all
to anon, authenticated
using (true)
with check (true);

create or replace function public.set_fixture_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists fixture_snapshots_set_updated_at on public.fixture_snapshots;
create trigger fixture_snapshots_set_updated_at
before update on public.fixture_snapshots
for each row
execute function public.set_fixture_snapshots_updated_at();

notify pgrst, 'reload schema';