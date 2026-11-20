-- Run this once in the Supabase SQL editor.
-- The event pool page then loads and saves these rows.
-- Use the anon key in .env.local. Do not put the service role key in the app.

create table if not exists public.event_pools (
  name text primary key,
  position integer not null
);

create table if not exists public.game_events (
  id text primary key,
  pool text not null,
  title text not null default '',
  description text not null default '',
  min_age integer,
  max_age integer,
  show_limit integer,
  required_race jsonb not null default '[]'::jsonb,
  required_class jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  repeat_after integer,
  mandatory boolean not null default false
);

alter table public.game_events add column if not exists repeat_after integer;
alter table public.game_events add column if not exists mandatory boolean not null default false;

alter table public.event_pools enable row level security;
alter table public.game_events enable row level security;

grant select, insert, update, delete on public.event_pools to anon, authenticated;
grant select, insert, update, delete on public.game_events to anon, authenticated;

drop policy if exists "event pools are editable" on public.event_pools;
create policy "event pools are editable"
  on public.event_pools
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "game events are editable" on public.game_events;
create policy "game events are editable"
  on public.game_events
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Shared event-pool copies. The app keeps the newest five and deletes the rest.

create table if not exists public.pool_history (
  id text primary key,
  saved_at bigint not null,
  reason text not null default 'Auto save',
  events jsonb not null default '[]'::jsonb,
  pools jsonb not null default '[]'::jsonb
);

alter table public.pool_history enable row level security;

grant select, insert, update, delete on public.pool_history to anon, authenticated;

drop policy if exists "pool history is editable" on public.pool_history;
create policy "pool history is editable"
  on public.pool_history
  for all
  to anon, authenticated
  using (true)
  with check (true);
