-- Salem Night Companion - browser-facing transactional functions
-- Apply after schema.sql and policies.sql.

create or replace function public.salem_random_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(translate(encode(gen_random_bytes(6), 'base64'), '/+=01IO', 'ABCDEFG'), 1, 6));
$$;

create or replace function public.salem_create_game(
  p_name text,
  p_player_names text[],
  p_host_player_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_game public.salem_games;
  v_code text;
  v_name text;
  v_count integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  v_count := coalesce(array_length(p_player_names, 1), 0);
  if v_count < 4 or v_count > 12 then raise exception 'Salem requires 4 to 12 players'; end if;

  loop
    v_code := public.salem_random_code();
    exit when not exists (select 1 from public.salem_games where code = v_code);
  end loop;

  insert into public.salem_games (code, name, host_user_id)
  values (v_code, left(trim(p_name), 50), v_user)
  returning * into v_game;

  for v_name in select trim(value) from unnest(p_player_names) with ordinality as n(value, position) order by position loop
    if v_name = '' then raise exception 'Player names cannot be empty'; end if;
  end loop;

  insert into public.salem_players (game_id, claimed_user_id, display_name, seat_number, avatar_tone, joined_at)
  select
    v_game.id,
    case when p_host_player_name is not null and lower(trim(value)) = lower(trim(p_host_player_name)) then v_user else null end,
    left(trim(value), 40),
    position::smallint,
    ((position - 1) % 6)::smallint,
    case when p_host_player_name is not null and lower(trim(value)) = lower(trim(p_host_player_name)) then now() else null end
  from unnest(p_player_names) with ordinality as n(value, position);

  insert into public.salem_player_roles (player_id, game_id, owner_user_id)
  select id, game_id, claimed_user_id from public.salem_players where game_id = v_game.id;

  return jsonb_build_object('id', v_game.id, 'code', v_game.code);
end;
$$;

create or replace function public.salem_lobby(p_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_game public.salem_games;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_game from public.salem_games
  where code = upper(trim(p_code)) and phase = 'lobby' and status = 'active' and expires_at > now();
  if not found then raise exception 'Room not found or no longer joinable'; end if;
  return jsonb_build_object(
    'game', jsonb_build_object('id', v_game.id, 'code', v_game.code, 'name', v_game.name, 'phase', v_game.phase),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'displayName', p.display_name, 'seat', p.seat_number,
        'character', p.character_name, 'avatarTone', p.avatar_tone,
        'claimed', p.claimed_user_id is not null
      ) order by p.seat_number)
      from public.salem_players p where p.game_id = v_game.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.salem_claim_player(p_code text, p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_game_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select id into v_game_id from public.salem_games
  where code = upper(trim(p_code)) and phase = 'lobby' and status = 'active' and expires_at > now()
  for update;
  if v_game_id is null then raise exception 'Room not found or no longer joinable'; end if;
  if exists (select 1 from public.salem_players where game_id = v_game_id and claimed_user_id = v_user) then
    raise exception 'This device already owns a seat';
  end if;
  update public.salem_players
  set claimed_user_id = v_user, joined_at = now(), updated_at = now()
  where id = p_player_id and game_id = v_game_id and claimed_user_id is null;
  if not found then raise exception 'Seat already claimed'; end if;
  update public.salem_player_roles set owner_user_id = v_user, updated_at = now() where player_id = p_player_id;
end;
$$;

create or replace function public.salem_snapshot(p_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_game public.salem_games;
  v_me public.salem_players;
  v_role public.salem_player_roles;
  v_is_host boolean;
  v_public_target uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_game from public.salem_games where code = upper(trim(p_code));
  if not found then raise exception 'Room not found'; end if;
  v_is_host := v_game.host_user_id = v_user;
  select * into v_me from public.salem_players where game_id = v_game.id and claimed_user_id = v_user;
  if not v_is_host and v_me.id is null then raise exception 'Not a room member'; end if;
  if v_me.id is not null then select * into v_role from public.salem_player_roles where player_id = v_me.id; end if;

  if v_game.phase in ('dawn-reveal', 'night-resolution') then
    select witch_target_player_id into v_public_target from public.salem_night_state where game_id = v_game.id;
  end if;

  return jsonb_build_object(
    'game', jsonb_build_object(
      'id', v_game.id, 'code', v_game.code, 'name', v_game.name,
      'phase', v_game.phase, 'phaseVersion', v_game.phase_version,
      'night', v_game.night_number, 'constableAvailable', v_game.constable_available,
      'revealedWitchCards', v_game.revealed_witch_cards, 'winner', v_game.winner,
      'roleSyncConflict', v_game.role_sync_conflict, 'status', v_game.status,
      'publicTargetId', v_public_target, 'expiresAt', v_game.expires_at
    ),
    'isHost', v_is_host,
    'me', case when v_me.id is null then null else jsonb_build_object(
      'id', v_me.id, 'displayName', v_me.display_name, 'seat', v_me.seat_number,
      'character', v_me.character_name, 'alive', v_me.alive,
      'role', jsonb_build_object(
        'everWitch', v_role.ever_witch,
        'currentWitchCards', v_role.current_witch_card_count,
        'isConstable', v_role.is_constable
      ),
      'syncPhaseVersion', v_role.sync_phase_version
    ) end,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'displayName', p.display_name, 'seat', p.seat_number,
        'character', p.character_name, 'avatarTone', p.avatar_tone,
        'alive', p.alive, 'claimed', p.claimed_user_id is not null
      ) order by p.seat_number)
      from public.salem_players p where p.game_id = v_game.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'label', e.label, 'detail', e.detail, 'createdAt', e.created_at) order by e.id desc)
      from (select * from public.salem_public_events where game_id = v_game.id order by id desc limit 20) e
    ), '[]'::jsonb)
  );
end;
$$;

-- Mutating game functions are deliberately separate from direct table grants.
-- The first production backend milestone must add and test:
--   salem_start_game
--   salem_submit_role_sync
--   salem_submit_witch_target
--   salem_submit_constable_target
--   salem_resolve_night
--   salem_host_transition
-- Each must validate auth.uid(), phase_version, phase, living state, target
-- legality and role eligibility inside one transaction before it is granted.

revoke all on function public.salem_random_code() from public;
revoke all on function public.salem_create_game(text, text[], text) from public;
revoke all on function public.salem_lobby(text) from public;
revoke all on function public.salem_claim_player(text, uuid) from public;
revoke all on function public.salem_snapshot(text) from public;

grant execute on function public.salem_create_game(text, text[], text) to authenticated;
grant execute on function public.salem_lobby(text) to authenticated;
grant execute on function public.salem_claim_player(text, uuid) to authenticated;
grant execute on function public.salem_snapshot(text) to authenticated;
