export const PHASES = Object.freeze({
  LOBBY: "lobby",
  ROLE_SYNC: "role-sync",
  OPENING_DAWN: "opening-dawn",
  DAWN_REVEAL: "dawn-reveal",
  DAY: "day",
  CONSPIRACY_SYNC: "conspiracy-sync",
  NIGHT_WITCH: "night-witch",
  NIGHT_CONSTABLE: "night-constable",
  NIGHT_CONFESSION: "night-confession",
  NIGHT_RESOLUTION: "night-resolution",
  ENDED: "ended",
});

export const PHASE_LABELS = Object.freeze({
  [PHASES.LOBBY]: "Gather the town",
  [PHASES.ROLE_SYNC]: "Private role check",
  [PHASES.OPENING_DAWN]: "Opening Dawn",
  [PHASES.DAWN_REVEAL]: "Black Cat revealed",
  [PHASES.DAY]: "Day in Salem",
  [PHASES.CONSPIRACY_SYNC]: "Conspiracy role check",
  [PHASES.NIGHT_WITCH]: "The Witches wake",
  [PHASES.NIGHT_CONSTABLE]: "The Constable wakes",
  [PHASES.NIGHT_CONFESSION]: "Confession window",
  [PHASES.NIGHT_RESOLUTION]: "Night resolves",
  [PHASES.ENDED]: "Game ended",
});

const SETUPS = Object.freeze({
  4: { notWitch: 18, witch: 1, constable: 1, perPlayer: 5 },
  5: { notWitch: 23, witch: 1, constable: 1, perPlayer: 5 },
  6: { notWitch: 27, witch: 2, constable: 1, perPlayer: 5 },
  7: { notWitch: 32, witch: 2, constable: 1, perPlayer: 5 },
  8: { notWitch: 29, witch: 2, constable: 1, perPlayer: 4 },
  9: { notWitch: 33, witch: 2, constable: 1, perPlayer: 4 },
  10: { notWitch: 27, witch: 2, constable: 1, perPlayer: 3 },
  11: { notWitch: 30, witch: 2, constable: 1, perPlayer: 3 },
  12: { notWitch: 33, witch: 2, constable: 1, perPlayer: 3 },
});

export function setupFor(playerCount) {
  return SETUPS[Number(playerCount)] ?? null;
}

export function normalizeName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function createId(prefix = "id") {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte, index) => alphabet[(byte || Date.now() + index) % alphabet.length]).join("");
}

export function newRoom({ name, code = createRoomCode(), hostSessionId, hostName, hostIsPlaying, playerNames }) {
  const names = [hostIsPlaying ? hostName : null, ...playerNames]
    .filter(Boolean)
    .map(normalizeName)
    .filter((value, index, values) => values.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index);

  return {
    id: createId("room"),
    code,
    name: normalizeName(name) || "A Night in Salem",
    hostSessionId,
    phase: PHASES.LOBBY,
    phaseVersion: 1,
    night: 0,
    constableAvailable: true,
    revealedWitchCards: 0,
    winner: null,
    publicTargetId: null,
    constableTargetId: null,
    confessionEndsAt: null,
    resolution: null,
    roleSyncConflict: null,
    players: names.map((displayName, index) => ({
      id: createId("player"),
      displayName,
      seat: index + 1,
      character: "",
      avatarTone: index % 6,
      alive: true,
      claimedBy: hostIsPlaying && displayName.toLowerCase() === normalizeName(hostName).toLowerCase() ? hostSessionId : null,
      ready: false,
      role: { everWitch: false, currentWitchCards: 0, isConstable: false },
      roleSubmission: null,
    })),
    actions: [],
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function livingPlayers(room) {
  return room.players.filter((player) => player.alive);
}

export function expectedWitchCards(room) {
  const total = setupFor(room.players.length)?.witch ?? 0;
  return Math.max(0, total - Number(room.revealedWitchCards ?? 0));
}

export function roleSyncStatus(room) {
  const alive = livingPlayers(room);
  const submissions = alive.filter((player) => player.roleSubmission?.phaseVersion === room.phaseVersion);
  if (submissions.length < alive.length) {
    return { complete: false, valid: false, submitted: submissions.length, total: alive.length, reason: null };
  }

  const constables = submissions.filter((player) => player.roleSubmission.hasConstable).length;
  const currentWitchCards = submissions.reduce((total, player) => {
    const count = Number(player.roleSubmission.witchCardCount ?? (player.roleSubmission.hasWitch ? 1 : 0));
    return total + (Number.isInteger(count) && count >= 0 ? count : 100);
  }, 0);
  const expectedCards = expectedWitchCards(room);
  const validConstable = room.constableAvailable ? constables === 1 : constables === 0;
  const validWitches = currentWitchCards === expectedCards;
  const reason = !validConstable
    ? "The Constable claims do not match. Everyone should privately recheck."
    : !validWitches
      ? `Expected ${expectedCards} unrevealed Witch card${expectedCards === 1 ? "" : "s"}. Everyone should privately recheck.`
      : null;

  return { complete: true, valid: validConstable && validWitches, submitted: submissions.length, total: alive.length, reason };
}

export function eligibleWitches(room) {
  return livingPlayers(room).filter((player) => player.role.everWitch);
}

export function revealRolesOnDeath(room, player) {
  const witchCards = Math.max(0, Number(player.role.currentWitchCards ?? 0));
  const constable = Boolean(player.role.isConstable);
  player.alive = false;
  player.role.currentWitchCards = 0;
  player.role.isConstable = false;
  room.revealedWitchCards = Number(room.revealedWitchCards ?? 0) + witchCards;
  if (constable) room.constableAvailable = false;
  return { witchCards, constable };
}

export function revealOneWitchCard(room, player) {
  const current = Math.max(0, Number(player.role.currentWitchCards ?? 0));
  if (!player.alive || current < 1) throw new Error("That player does not hold an unrevealed Witch card.");
  player.role.currentWitchCards = current - 1;
  room.revealedWitchCards = Number(room.revealedWitchCards ?? 0) + 1;
  if (player.role.currentWitchCards === 0) player.alive = false;
  return { died: !player.alive, remainingWithPlayer: player.role.currentWitchCards };
}

export function determineWinner(room) {
  const setup = setupFor(room.players.length);
  if (setup && Number(room.revealedWitchCards ?? 0) >= setup.witch) return "town";
  const alive = livingPlayers(room);
  if (alive.length > 0 && alive.every((player) => player.role.everWitch)) return "witches";
  return null;
}

export function phaseActions(room, type) {
  return room.actions.filter((action) => action.phaseVersion === room.phaseVersion && action.type === type);
}

export function consensusStatus(room, type) {
  const witches = eligibleWitches(room);
  const actions = phaseActions(room, type).filter((action) => witches.some((witch) => witch.id === action.playerId));
  const targets = new Set(actions.map((action) => action.targetPlayerId));
  return {
    submitted: actions.length,
    total: witches.length,
    agreed: witches.length > 0 && actions.length === witches.length && targets.size === 1,
    targetPlayerId: targets.size === 1 ? actions[0]?.targetPlayerId ?? null : null,
  };
}

export function canStart(room) {
  const setup = setupFor(room.players.length);
  return Boolean(
    setup
    && room.players.every((player) => player.claimedBy || player.claimed)
    && room.players.every((player) => normalizeName(player.character)),
  );
}

export function nextVersion(room, phase) {
  room.phase = phase;
  room.phaseVersion += 1;
  room.updatedAt = new Date().toISOString();
  room.players.forEach((player) => {
    player.ready = false;
    player.roleSubmission = null;
  });
  return room;
}

export function findPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId) ?? null;
}

export function publicPhaseProgress(room) {
  if (room.phase === PHASES.ROLE_SYNC || room.phase === PHASES.CONSPIRACY_SYNC) {
    const status = roleSyncStatus(room);
    return `${status.submitted} of ${status.total} checked in`;
  }
  if (room.phase === PHASES.OPENING_DAWN || room.phase === PHASES.NIGHT_WITCH) {
    const type = room.phase === PHASES.OPENING_DAWN ? "black-cat" : "witch-target";
    const status = consensusStatus(room, type);
    return status.agreed ? "The Witches have agreed" : `${status.submitted} of ${status.total} Witch choices received`;
  }
  if (room.phase === PHASES.NIGHT_CONSTABLE) return "Waiting for the Constable";
  return PHASE_LABELS[room.phase];
}
