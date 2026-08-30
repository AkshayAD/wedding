-- Salem Night Companion - Supabase/Postgres schema
-- Apply before policies.sql and functions.sql.

create extension if not exists pgcrypto;

create table if not exists public.salem_games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  name text not null check (char_length(name) between 1 and 50),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null default 'lobby' check (phase in (
    'lobby', 'role-sync', 'opening-dawn', 'dawn-reveal', 'day',
    'conspiracy-sync', 'night-witch', 'night-constable',
    'night-confession', 'night-resolution', 'ended'
  )),
  phase_version integer not null default 1 check (phase_version > 0),
  night_number integer not null default 0 check (night_number >= 0),
  constable_available boolean not null default true,
  revealed_witch_cards smallint not null default 0 check (revealed_witch_cards between 0 and 2),
  winner text check (winner in ('town', 'witches')),
  role_sync_conflict text,
  status text not null default 'active' check (status in ('active', 'ended', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.salem_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.salem_games(id) on delete cascade,
  claimed_user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  seat_number smallint not null check (seat_number between 1 and 12),
  character_name text not null default '' check (char_length(character_name) <= 60),
  avatar_tone smallint not null default 0 check (avatar_tone between 0 and 5),
  alive boolean not null default true,
  joined_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (game_id, seat_number),
  unique (game_id, claimed_user_id)
);

create table if not exists public.salem_player_roles (
  player_id uuid primary key references public.salem_players(id) on delete cascade,
  game_id uuid not null references public.salem_games(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  ever_witch boolean not null default false,
  is_constable boolean not null default false,
  current_witch_card_count smallint not null default 0 check (current_witch_card_count between 0 and 2),
  current_constable_claim boolean not null default false,
  sync_phase_version integer,
  updated_at timestamptz not null default now(),
  unique (game_id, owner_user_id)
);

create table if not exists public.salem_secret_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.salem_games(id) on delete cascade,
  phase_version integer not null,
  action_type text not null check (action_type in ('black-cat', 'witch-target', 'constable-target')),
  player_id uuid not null references public.salem_players(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  target_player_id uuid not null references public.salem_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, phase_version, action_type, player_id)
);

-- Never grant this table directly to browser roles. Snapshot/RPC functions reveal
-- only the fields that are public in the current phase.
create table if not exists public.salem_night_state (
  game_id uuid primary key references public.salem_games(id) on delete cascade,
  phase_version integer not null,
  witch_target_player_id uuid references public.salem_players(id) on delete set null,
  constable_target_player_id uuid references public.salem_players(id) on delete set null,
  confessed boolean not null default false,
  asylum boolean not null default false,
  gavel boolean not null default false,
  survived boolean,
  resolution_reason text,
  updated_at timestamptz not null default now()
);

create table if not exists public.salem_public_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.salem_games(id) on delete cascade,
  phase_version integer not null,
  event_type text not null,
  label text not null check (char_length(label) <= 80),
  detail text not null default '' check (char_length(detail) <= 240),
  created_at timestamptz not null default now()
);

create table if not exists public.salem_remembered_players (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_tone smallint not null default 0 check (avatar_tone between 0 and 5),
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists salem_remembered_owner_name_idx
  on public.salem_remembered_players (owner_user_id, lower(display_name));
create index if not exists salem_players_game_idx on public.salem_players (game_id);
create index if not exists salem_players_claimed_idx on public.salem_players (claimed_user_id);
create index if not exists salem_roles_game_idx on public.salem_player_roles (game_id);
create index if not exists salem_actions_phase_idx on public.salem_secret_actions (game_id, phase_version, action_type);
create index if not exists salem_events_game_idx on public.salem_public_events (game_id, id desc);
create index if not exists salem_games_expiry_idx on public.salem_games (expires_at) where status = 'active';
