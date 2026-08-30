import {
  PHASES,
  canStart,
  consensusStatus,
  createId,
  determineWinner,
  expectedWitchCards,
  findPlayer,
  livingPlayers,
  nextVersion,
  normalizeName,
  publicPhaseProgress,
  revealOneWitchCard,
  revealRolesOnDeath,
  roleSyncStatus,
} from "./game-core.js";

const HOST_COMMANDS = new Set([
  "release-seat",
  "reveal-witch-card",
  "record-death",
  "add-player",
  "set-character",
  "start-game",
  "continue-dawn",
  "start-conspiracy",
  "start-night",
  "reveal-constable",
  "confirm-constable-absent",
  "continue-night",
  "end-game",
  "resolve-night",
]);

const CONFESSION_WINDOW_MS = 30_000;

function requirePhase(room, ...phases) {
  if (!phases.includes(room.phase)) throw new Error("That action is no longer available in this phase.");
}

function requireHost(actor) {
  if (!actor?.isHost) throw new Error("Only the coordinator can do that.");
}

function actorPlayer(room, actor) {
  return room.players.find((player) => player.id === actor?.playerId && player.claimedBy === actor?.id) ?? null;
}

function requireLivingPlayer(room, actor) {
  const player = actorPlayer(room, actor);
  if (!player?.alive) throw new Error("This seat cannot submit that action.");
  return player;
}

function requireLivingTarget(room, playerId) {
  const player = findPlayer(room, playerId);
  if (!player?.alive) throw new Error("Choose a living player.");
  return player;
}

function addEvent(room, label, detail) {
  room.events.push({ label, detail });
}

function finishIfWon(room) {
  room.winner = determineWinner(room);
  return room.winner ? nextVersion(room, PHASES.ENDED) : room;
}

function enterConfession(room) {
  room.confessionEndsAt = Date.now() + CONFESSION_WINDOW_MS;
  return nextVersion(room, PHASES.NIGHT_CONFESSION);
}

function finalizeRoleSync(room) {
  livingPlayers(room).forEach((item) => {
    item.role.currentWitchCards = Number(item.roleSubmission.witchCardCount ?? 0);
    item.role.everWitch = item.role.everWitch || item.role.currentWitchCards > 0;
    item.role.isConstable = room.constableAvailable && item.roleSubmission.hasConstable;
  });
  room.winner = determineWinner(room);
  const next = room.winner
    ? PHASES.ENDED
    : room.phase === PHASES.ROLE_SYNC
      ? PHASES.OPENING_DAWN
      : PHASES.DAY;
  return nextVersion(room, next);
}

function handleRoleSync(room, actor, payload) {
  requirePhase(room, PHASES.ROLE_SYNC, PHASES.CONSPIRACY_SYNC);
  const player = requireLivingPlayer(room, actor);
  const witchCardCount = Number(payload.witchCardCount);
  const hasConstable = Boolean(payload.hasConstable);
  if (!Number.isInteger(witchCardCount) || witchCardCount < 0 || witchCardCount > expectedWitchCards(room)) {
    throw new Error("Choose a valid Witch card count.");
  }

  player.roleSubmission = { phaseVersion: room.phaseVersion, witchCardCount, hasConstable };
  room.roleSyncConflict = null;
  const status = roleSyncStatus(room);
  if (status.complete && status.valid) {
    finalizeRoleSync(room);
  } else if (status.complete) {
    room.roleSyncConflict = status.reason;
  }
  return room;
}

function handleWitchTarget(room, actor, payload) {
  requirePhase(room, PHASES.OPENING_DAWN, PHASES.NIGHT_WITCH);
  const player = requireLivingPlayer(room, actor);
  if (!player.role.everWitch) throw new Error("This device is not eligible for that action.");
  const target = requireLivingTarget(room, payload.targetPlayerId);
  const type = room.phase === PHASES.OPENING_DAWN ? "black-cat" : "witch-target";
  room.actions = room.actions.filter((item) => !(
    item.phaseVersion === room.phaseVersion && item.type === type && item.playerId === player.id
  ));
  room.actions.push({
    id: createId("action"),
    phaseVersion: room.phaseVersion,
    type,
    playerId: player.id,
    targetPlayerId: target.id,
  });

  const consensus = consensusStatus(room, type);
  if (consensus.agreed) {
    room.publicTargetId = consensus.targetPlayerId;
    if (room.phase === PHASES.OPENING_DAWN) {
      nextVersion(room, PHASES.DAWN_REVEAL);
    } else {
      const activeConstable = livingPlayers(room).some((item) => item.role.isConstable);
      if (room.constableAvailable && activeConstable) nextVersion(room, PHASES.NIGHT_CONSTABLE);
      else enterConfession(room);
    }
  }
  return room;
}

function handleConstableTarget(room, actor, payload) {
  requirePhase(room, PHASES.NIGHT_CONSTABLE);
  const player = requireLivingPlayer(room, actor);
  if (!player.role.isConstable) throw new Error("This device is not the current Constable.");
  const target = requireLivingTarget(room, payload.targetPlayerId);
  if (target.id === player.id) throw new Error("The Constable cannot protect themselves.");
  room.constableTargetId = target.id;
  return enterConfession(room);
}

export function applyCommand(room, command, actor) {
  if (!room || !command?.type) throw new Error("Invalid room command.");
  if (Number(command.phaseVersion) !== Number(room.phaseVersion)) {
    throw new Error("The room changed on another device. Please try again.");
  }
  if (HOST_COMMANDS.has(command.type)) requireHost(actor);
  const payload = command.payload ?? {};

  switch (command.type) {
    case "release-seat": { requirePhase(room, PHASES.LOBBY); const player = findPlayer(room, payload.playerId); if (!player) throw new Error("Player not found."); if (player.claimedBy === room.hostSessionId) throw new Error("The coordinator's own seat cannot be released."); player.claimedBy = null; return room; }
    case "reveal-witch-card": { requirePhase(room, PHASES.DAY); const player = findPlayer(room, payload.playerId); if (!player) throw new Error("Player not found."); const result = revealOneWitchCard(room, player); addEvent(room, "Witch revealed", player.displayName); if (result.died) { const reveals = revealRolesOnDeath(room, player); if (reveals.constable) addEvent(room, "Constable revealed", player.displayName); addEvent(room, "Died", player.displayName); } return finishIfWon(room); }
    case "record-death": { requirePhase(room, PHASES.DAY); const player = findPlayer(room, payload.playerId); if (!player?.alive) throw new Error("That player is already out of the game."); const reveals = revealRolesOnDeath(room, player); addEvent(room, "Died", player.displayName); if (reveals.witchCards) addEvent(room, "Witch revealed", `${player.displayName} · ${reveals.witchCards} card${reveals.witchCards === 1 ? "" : "s"}`); if (reveals.constable) addEvent(room, "Constable revealed", player.displayName); return finishIfWon(room); }
    case "add-player": { requirePhase(room, PHASES.LOBBY); const name = normalizeName(payload.name); if (!name) throw new Error("Enter a player name."); if (name.length > 40) throw new Error("Player names may be at most 40 characters."); if (room.players.length >= 12) throw new Error("Salem supports at most 12 players."); if (room.players.some((player) => player.displayName.toLowerCase() === name.toLowerCase())) throw new Error("That name is already in the room."); room.players.push({ id: createId("player"), displayName: name, seat: room.players.length + 1, character: "", avatarTone: room.players.length % 6, alive: true, claimedBy: null, ready: false, role: { everWitch: false, currentWitchCards: 0, isConstable: false }, roleSubmission: null }); return room; }
    case "set-character": { requirePhase(room, PHASES.LOBBY); const player = findPlayer(room, payload.playerId); if (!player) throw new Error("Player not found."); player.character = normalizeName(payload.character).slice(0, 40); return room; }
    case "start-game": { requirePhase(room, PHASES.LOBBY); if (!canStart(room)) throw new Error("Every seat must be claimed and assigned a character first."); room.roleSyncConflict = null; addEvent(room, "Game started", `${room.players.length} players`); return nextVersion(room, PHASES.ROLE_SYNC); }
    case "submit-role-sync": return handleRoleSync(room, actor, payload);
    case "submit-witch-target": return handleWitchTarget(room, actor, payload);
    case "submit-constable-target": return handleConstableTarget(room, actor, payload);
    case "continue-dawn": { requirePhase(room, PHASES.DAWN_REVEAL); const target = findPlayer(room, room.publicTargetId); addEvent(room, "Black Cat", target?.displayName ?? "Unknown"); room.publicTargetId = null; return nextVersion(room, PHASES.DAY); }
    case "start-conspiracy": { requirePhase(room, PHASES.DAY); room.roleSyncConflict = null; addEvent(room, "Conspiracy", "Roles resynced"); return nextVersion(room, PHASES.CONSPIRACY_SYNC); }
    case "start-night": { requirePhase(room, PHASES.DAY); room.night += 1; room.publicTargetId = null; room.constableTargetId = null; room.confessionEndsAt = null; room.resolution = null; addEvent(room, `Night ${room.night}`, "The town sleeps"); return nextVersion(room, PHASES.NIGHT_WITCH); }
    case "reveal-constable": { requirePhase(room, PHASES.DAY); if (!room.constableAvailable) throw new Error("The Constable card has already been revealed."); room.constableAvailable = false; room.players.forEach((player) => { player.role.isConstable = false; }); addEvent(room, "Constable", "Card revealed"); return room; }
    case "confirm-constable-absent": { requirePhase(room, PHASES.CONSPIRACY_SYNC); if (!room.constableAvailable) throw new Error("The Constable is already unavailable."); const status = roleSyncStatus(room); const submissions = livingPlayers(room).filter((player) => player.roleSubmission?.phaseVersion === room.phaseVersion); const claims = submissions.filter((player) => player.roleSubmission.hasConstable).length; if (!status.complete || claims !== 0) throw new Error("Constable absence can only be confirmed after every living player reports no Constable card."); room.constableAvailable = false; room.players.forEach((player) => { player.role.isConstable = false; }); addEvent(room, "Constable", "Card confirmed revealed"); const corrected = roleSyncStatus(room); room.roleSyncConflict = corrected.reason; return corrected.valid ? finalizeRoleSync(room) : room; }
    case "continue-night": { requirePhase(room, PHASES.NIGHT_RESOLUTION); room.publicTargetId = null; room.constableTargetId = null; room.confessionEndsAt = null; room.resolution = null; return nextVersion(room, room.winner ? PHASES.ENDED : PHASES.DAY); }
    case "end-game": { requirePhase(room, PHASES.DAY); addEvent(room, "Game ended", `${room.night} nights`); return nextVersion(room, PHASES.ENDED); }
    case "resolve-night": { requirePhase(room, PHASES.NIGHT_CONFESSION); if (Date.now() < Number(room.confessionEndsAt ?? 0)) throw new Error("The 30-second confession window is still open."); const target = findPlayer(room, room.publicTargetId); if (!target) throw new Error("No Night target is available."); const confessed = Boolean(payload.confessed); const asylum = Boolean(payload.asylum); const gavel = room.constableTargetId === target.id; const survived = confessed || asylum || gavel; const reason = confessed ? "Confessed" : asylum ? "Protected by Asylum" : gavel ? "Saved by the Constable" : "No protection"; room.resolution = { survived, reason, confessed, asylum, gavel }; if (!survived) { const reveals = revealRolesOnDeath(room, target); if (reveals.witchCards) addEvent(room, "Witch revealed", `${target.displayName} · ${reveals.witchCards} card${reveals.witchCards === 1 ? "" : "s"}`); if (reveals.constable) addEvent(room, "Constable revealed", target.displayName); room.winner = determineWinner(room); } addEvent(room, survived ? "Survived" : "Killed", `${target.displayName} · ${reason}`); return nextVersion(room, PHASES.NIGHT_RESOLUTION); }
    default: throw new Error("Unknown room command.");
  }
}

export function sanitizeRoom(room, actor = null) {
  const viewerPlayer = actorPlayer(room, actor);
  const viewerPlayerId = viewerPlayer?.id ?? null;
  const targetIsPublic = room.phase === PHASES.DAWN_REVEAL || room.phase === PHASES.NIGHT_RESOLUTION;
  const witchProgressIsPrivate = room.phase === PHASES.OPENING_DAWN || room.phase === PHASES.NIGHT_WITCH;
  const viewerCanSeeWitchProgress = Boolean(viewerPlayer?.alive && viewerPlayer.role.everWitch);
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    phase: room.phase,
    phaseVersion: room.phaseVersion,
    night: room.night,
    constableAvailable: room.constableAvailable,
    revealedWitchCards: room.revealedWitchCards,
    winner: room.winner,
    publicTargetId: targetIsPublic ? room.publicTargetId : null,
    confessionEndsAt: room.confessionEndsAt,
    resolution: room.resolution,
    roleSyncConflict: room.roleSyncConflict,
    publicProgress: witchProgressIsPrivate && !viewerCanSeeWitchProgress
      ? "Night action in progress"
      : publicPhaseProgress(room),
    players: room.players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      seat: player.seat,
      character: player.character,
      avatarTone: player.avatarTone,
      alive: player.alive,
      claimed: Boolean(player.claimedBy),
      ...(player.id === viewerPlayerId ? {
        role: { ...player.role },
        roleSubmission: player.roleSubmission ? { ...player.roleSubmission } : null,
      } : {}),
    })),
    actions: room.actions
      .filter((action) => action.playerId === viewerPlayerId && action.phaseVersion === room.phaseVersion)
      .map((action) => ({ ...action })),
    events: room.events.map((event) => ({ ...event })),
    viewer: { isHost: Boolean(actor?.isHost), playerId: viewerPlayerId },
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}
