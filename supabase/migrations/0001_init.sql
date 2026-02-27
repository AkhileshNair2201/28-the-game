-- 0001_init.sql
-- Canonical schema for Twenty-Eight (28)

create extension if not exists pgcrypto;

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id text not null,
  status text not null default 'waiting',
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lobby_players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  actor_id text not null,
  seat smallint,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (lobby_id, actor_id),
  unique (lobby_id, seat)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  status text not null default 'created',
  current_round_no integer not null default 1,
  team_a_score integer not null default 0,
  team_b_score integer not null default 0,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  round_no integer not null,
  phase text not null,
  dealer_seat smallint not null,
  current_turn_seat smallint not null,
  bidder_seat smallint,
  bid_value integer,
  trump_suit text,
  trump_revealed boolean not null default false,
  state_json jsonb not null,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, round_no)
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  round_id uuid references public.rounds(id) on delete set null,
  actor_id text not null,
  action_type text not null,
  request_id text not null,
  expected_version bigint not null,
  accepted boolean not null,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (match_id, actor_id, request_id)
);

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  actor_id text not null,
  request_id text not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (match_id, actor_id, request_id)
);

create index if not exists idx_rounds_match_version on public.rounds(match_id, version);
create index if not exists idx_actions_match_created on public.actions(match_id, created_at desc);
create index if not exists idx_idem_match_actor_request on public.idempotency_keys(match_id, actor_id, request_id);

alter table public.lobbies enable row level security;
alter table public.lobby_players enable row level security;
alter table public.matches enable row level security;
alter table public.rounds enable row level security;
alter table public.actions enable row level security;
alter table public.idempotency_keys enable row level security;

-- Basic authenticated-read policy for members.
create policy if not exists "lobbies_select_member" on public.lobbies
for select
using (
  exists (
    select 1
    from public.lobby_players lp
    where lp.lobby_id = lobbies.id
      and lp.actor_id = auth.uid()::text
  )
);

create policy if not exists "lobby_players_select_member" on public.lobby_players
for select
using (
  exists (
    select 1
    from public.lobby_players lp
    where lp.lobby_id = lobby_players.lobby_id
      and lp.actor_id = auth.uid()::text
  )
);

create policy if not exists "matches_select_member" on public.matches
for select
using (
  exists (
    select 1
    from public.lobby_players lp
    where lp.lobby_id = matches.lobby_id
      and lp.actor_id = auth.uid()::text
  )
);

create policy if not exists "rounds_select_member" on public.rounds
for select
using (
  exists (
    select 1
    from public.matches m
    join public.lobby_players lp on lp.lobby_id = m.lobby_id
    where m.id = rounds.match_id
      and lp.actor_id = auth.uid()::text
  )
);

create policy if not exists "actions_select_member" on public.actions
for select
using (
  exists (
    select 1
    from public.matches m
    join public.lobby_players lp on lp.lobby_id = m.lobby_id
    where m.id = actions.match_id
      and lp.actor_id = auth.uid()::text
  )
);

create policy if not exists "idem_select_member" on public.idempotency_keys
for select
using (
  exists (
    select 1
    from public.matches m
    join public.lobby_players lp on lp.lobby_id = m.lobby_id
    where m.id = idempotency_keys.match_id
      and lp.actor_id = auth.uid()::text
  )
);
