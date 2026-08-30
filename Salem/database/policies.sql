-- Salem Night Companion - grants and Row Level Security
-- Apply after schema.sql and before functions.sql.

alter table public.salem_games enable row level security;
alter table public.salem_players enable row level security;
alter table public.salem_player_roles enable row level security;
alter table public.salem_secret_actions enable row level security;
alter table public.salem_night_state enable row level security;
alter table public.salem_public_events enable row level security;
alter table public.salem_remembered_players enable row level security;

revoke all on public.salem_games from anon, authenticated;
revoke all on public.salem_players from anon, authenticated;
revoke all on public.salem_player_roles from anon, authenticated;
revoke all on public.salem_secret_actions from anon, authenticated;
revoke all on public.salem_night_state from anon, authenticated;
revoke all on public.salem_public_events from anon, authenticated;
revoke all on public.salem_remembered_players from anon, authenticated;

-- Safe direct reads are available only after a user is a room member.
grant select on public.salem_games, public.salem_players, public.salem_public_events to authenticated;
grant select on public.salem_player_roles, public.salem_secret_actions to authenticated;
grant select, insert, update, delete on public.salem_remembered_players to authenticated;

drop policy if exists salem_games_member_read on public.salem_games;
create policy salem_games_member_read on public.salem_games
for select to authenticated
using (
  host_user_id = auth.uid()
  or exists (
    select 1 from public.salem_players p
    where p.game_id = salem_games.id and p.claimed_user_id = auth.uid()
  )
);

drop policy if exists salem_players_member_read on public.salem_players;
create policy salem_players_member_read on public.salem_players
for select to authenticated
using (
  exists (
    select 1 from public.salem_games g
    where g.id = salem_players.game_id
      and (
        g.host_user_id = auth.uid()
        or exists (
          select 1 from public.salem_players mine
          where mine.game_id = g.id and mine.claimed_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists salem_roles_owner_read on public.salem_player_roles;
create policy salem_roles_owner_read on public.salem_player_roles
for select to authenticated
using (owner_user_id = auth.uid());

drop policy if exists salem_actions_owner_read on public.salem_secret_actions;
create policy salem_actions_owner_read on public.salem_secret_actions
for select to authenticated
using (owner_user_id = auth.uid());

-- No policy is intentionally created for salem_night_state.

drop policy if exists salem_events_member_read on public.salem_public_events;
create policy salem_events_member_read on public.salem_public_events
for select to authenticated
using (
  exists (
    select 1 from public.salem_games g
    where g.id = salem_public_events.game_id
      and (
        g.host_user_id = auth.uid()
        or exists (
          select 1 from public.salem_players p
          where p.game_id = g.id and p.claimed_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists salem_remembered_owner_select on public.salem_remembered_players;
create policy salem_remembered_owner_select on public.salem_remembered_players
for select to authenticated using (owner_user_id = auth.uid());

drop policy if exists salem_remembered_owner_insert on public.salem_remembered_players;
create policy salem_remembered_owner_insert on public.salem_remembered_players
for insert to authenticated with check (owner_user_id = auth.uid());

drop policy if exists salem_remembered_owner_update on public.salem_remembered_players;
create policy salem_remembered_owner_update on public.salem_remembered_players
for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists salem_remembered_owner_delete on public.salem_remembered_players;
create policy salem_remembered_owner_delete on public.salem_remembered_players
for delete to authenticated using (owner_user_id = auth.uid());
