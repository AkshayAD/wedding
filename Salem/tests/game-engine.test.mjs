import test from "node:test";
import assert from "node:assert/strict";
import { PHASES, newRoom } from "../site/game-core.js";
import { applyCommand, sanitizeRoom } from "../site/game-engine.js";

function preparedRoom() {
  const actors = Array.from({ length: 4 }, (_, index) => ({
    id: `actor-${index + 1}`,
    isHost: index === 0,
    playerId: null,
  }));
  const room = newRoom({
    name: "Test Salem",
    code: "SALEM7",
    hostSessionId: actors[0].id,
    hostName: "Akshay",
    hostIsPlaying: true,
    playerNames: ["Divyanka", "Mira", "Kabir"],
  });
  room.players.forEach((player, index) => {
    player.claimedBy = actors[index].id;
    player.character = `Character ${index + 1}`;
    actors[index].playerId = player.id;
  });
  return { room, actors };
}

function run(room, actor, type, payload = {}) {
  return applyCommand(room, { type, payload, phaseVersion: room.phaseVersion }, actor);
}

function completeInitialRoleSync(room, actors) {
  run(room, actors[0], "start-game");
  run(room, actors[0], "submit-role-sync", { witchCardCount: 1, hasConstable: false });
  run(room, actors[1], "submit-role-sync", { witchCardCount: 0, hasConstable: true });
  run(room, actors[2], "submit-role-sync", { witchCardCount: 0, hasConstable: false });
  run(room, actors[3], "submit-role-sync", { witchCardCount: 0, hasConstable: false });
}

test("viewer snapshots never expose another player's role or action", () => {
  const { room, actors } = preparedRoom();
  room.players[0].role.everWitch = true;
  room.players[0].role.currentWitchCards = 1;
  room.players[1].role.isConstable = true;
  room.actions.push({ id: "secret", phaseVersion: room.phaseVersion, type: "witch-target", playerId: room.players[0].id, targetPlayerId: room.players[2].id });

  const publicRoom = sanitizeRoom(room);
  assert.equal(publicRoom.players.some((player) => "role" in player), false);
  assert.equal(publicRoom.actions.length, 0);

  const witchRoom = sanitizeRoom(room, actors[0]);
  assert.equal(witchRoom.players[0].role.everWitch, true);
  assert.equal("role" in witchRoom.players[1], false);
  assert.equal(witchRoom.actions.length, 1);
  assert.equal("hostSessionId" in witchRoom, false);
  assert.equal(witchRoom.players.some((player) => "claimedBy" in player), false);
});

test("initial role check assigns one Witch and the current Constable", () => {
  const { room, actors } = preparedRoom();
  completeInitialRoleSync(room, actors);
  assert.equal(room.phase, PHASES.OPENING_DAWN);
  assert.equal(room.players[0].role.everWitch, true);
  assert.equal(room.players[0].role.currentWitchCards, 1);
  assert.equal(room.players[1].role.isConstable, true);
});

test("Conspiracy adds a new permanent Witch while Constable follows the card", () => {
  const { room, actors } = preparedRoom();
  completeInitialRoleSync(room, actors);
  room.phase = PHASES.DAY;
  room.phaseVersion += 1;
  run(room, actors[0], "start-conspiracy");
  run(room, actors[0], "submit-role-sync", { witchCardCount: 0, hasConstable: false });
  run(room, actors[1], "submit-role-sync", { witchCardCount: 0, hasConstable: false });
  run(room, actors[2], "submit-role-sync", { witchCardCount: 1, hasConstable: false });
  run(room, actors[3], "submit-role-sync", { witchCardCount: 0, hasConstable: true });
  assert.equal(room.phase, PHASES.DAY);
  assert.equal(room.players[0].role.everWitch, true);
  assert.equal(room.players[0].role.currentWitchCards, 0);
  assert.equal(room.players[2].role.everWitch, true);
  assert.equal(room.players[3].role.isConstable, true);
  assert.equal(room.players[1].role.isConstable, false);
});

test("a revealed Constable is skipped on later nights", () => {
  const { room, actors } = preparedRoom();
  completeInitialRoleSync(room, actors);
  room.phase = PHASES.DAY;
  room.phaseVersion += 1;
  run(room, actors[0], "record-death", { playerId: room.players[1].id });
  assert.equal(room.constableAvailable, false);
  run(room, actors[0], "start-night");
  run(room, actors[0], "submit-witch-target", { targetPlayerId: room.players[2].id });
  assert.equal(room.phase, PHASES.NIGHT_CONFESSION);
});

test("Night target stays secret until resolution and the confession timer is enforced", () => {
  const { room, actors } = preparedRoom();
  completeInitialRoleSync(room, actors);
  room.phase = PHASES.DAY;
  room.phaseVersion += 1;
  run(room, actors[0], "start-night");
  run(room, actors[0], "submit-witch-target", { targetPlayerId: room.players[2].id });
  assert.equal(room.phase, PHASES.NIGHT_CONSTABLE);
  assert.equal(sanitizeRoom(room, actors[0]).publicTargetId, null);
  assert.equal(sanitizeRoom(room, actors[2]).publicTargetId, null);
  run(room, actors[1], "submit-constable-target", { targetPlayerId: room.players[3].id });
  assert.equal(room.phase, PHASES.NIGHT_CONFESSION);
  assert.equal(sanitizeRoom(room, actors[1]).publicTargetId, null);
  assert.throws(() => run(room, actors[0], "resolve-night", {}), /still open/i);
  room.confessionEndsAt = Date.now() - 1;
  run(room, actors[0], "resolve-night", { asylum: true });
  assert.equal(room.phase, PHASES.NIGHT_RESOLUTION);
  assert.equal(sanitizeRoom(room, actors[2]).publicTargetId, room.players[2].id);
});

test("anonymous progress does not reveal the number of Witches", () => {
  const { room, actors } = preparedRoom();
  room.phase = PHASES.NIGHT_WITCH;
  room.players[0].role.everWitch = true;
  room.players[1].role.everWitch = true;
  assert.equal(sanitizeRoom(room).publicProgress, "Night action in progress");
  assert.equal(sanitizeRoom(room, actors[2]).publicProgress, "Night action in progress");
  assert.match(sanitizeRoom(room, actors[0]).publicProgress, /0 of 2 Witch choices/);
});

test("coordinator can confirm a revealed Constable after a zero-claim Conspiracy", () => {
  const { room, actors } = preparedRoom();
  completeInitialRoleSync(room, actors);
  room.phase = PHASES.DAY;
  room.phaseVersion += 1;
  run(room, actors[0], "start-conspiracy");
  actors.forEach((actor, index) => run(room, actor, "submit-role-sync", { witchCardCount: index === 0 ? 1 : 0, hasConstable: false }));
  assert.equal(room.phase, PHASES.CONSPIRACY_SYNC);
  assert.match(room.roleSyncConflict, /Constable/i);
  run(room, actors[0], "confirm-constable-absent");
  assert.equal(room.phase, PHASES.DAY);
  assert.equal(room.constableAvailable, false);
  assert.equal(room.players.some((player) => player.role.isConstable), false);
  assert.throws(() => run(room, actors[0], "toggle-constable"), /unknown/i);
});

test("stale and unauthorized coordinator commands are rejected", () => {
  const { room, actors } = preparedRoom();
  assert.throws(() => applyCommand(room, { type: "start-game", payload: {}, phaseVersion: 0 }, actors[0]), /changed on another device/i);
  assert.throws(() => run(room, actors[1], "start-game"), /only the coordinator/i);
});
