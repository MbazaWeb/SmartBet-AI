create extension if not exists pgcrypto;

create table if not exists public.match_likes (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint match_likes_fixture_user_unique unique (fixture_id, user_id)
);

create index if not exists match_likes_fixture_id_idx on public.match_likes (fixture_id);

create table if not exists public.match_comments (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  parent_id uuid references public.match_comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists match_comments_fixture_id_idx on public.match_comments (fixture_id);
create index if not exists match_comments_parent_id_idx on public.match_comments (parent_id);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, delete on public.match_likes to anon, authenticated, service_role;
grant select, insert, delete on public.match_comments to anon, authenticated, service_role;

alter table public.match_likes enable row level security;
alter table public.match_comments enable row level security;

drop policy if exists "match_likes_read" on public.match_likes;
create policy "match_likes_read"
on public.match_likes
for select
to anon, authenticated
using (true);

drop policy if exists "match_likes_insert_own" on public.match_likes;
create policy "match_likes_insert_own"
on public.match_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "match_likes_delete_own" on public.match_likes;
create policy "match_likes_delete_own"
on public.match_likes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "match_comments_read" on public.match_comments;
create policy "match_comments_read"
on public.match_comments
for select
to anon, authenticated
using (true);

drop policy if exists "match_comments_insert_own" on public.match_comments;
create policy "match_comments_insert_own"
on public.match_comments
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "match_comments_delete_own" on public.match_comments;
create policy "match_comments_delete_own"
on public.match_comments
for delete
to authenticated
using (auth.uid() = author_id);

notify pgrst, 'reload schema';