import test from "node:test";
import assert from "node:assert/strict";
import {
  PHASES,
  consensusStatus,
  determineWinner,
  expectedWitchCards,
  newRoom,
  revealOneWitchCard,
  revealRolesOnDeath,
  roleSyncStatus,
  setupFor,
} from "../site/game-core.js";

test("official setup counts cover 4 through 12 players", () => {
  const expected = {
    4: [18, 1, 5], 5: [23, 1, 5], 6: [27, 2, 5], 7: [32, 2, 5], 8: [29, 2, 4],
    9: [33, 2, 4], 10: [27, 2, 3], 11: [30, 2, 3], 12: [33, 2, 3],
  };
  Object.entries(expected).forEach(([count, [notWitch, witch, perPlayer]]) => {
    assert.deepEqual(setupFor(count), { notWitch, witch, constable: 1, perPlayer });
  });
  assert.equal(setupFor(3), null);
  assert.equal(setupFor(13), null);
});

test("initial role sync requires the expected witches and one constable", () => {
  const room = newRoom({
    name: "Test",
    hostSessionId: "host",
    hostName: "A",
    hostIsPlaying: true,
    playerNames: ["B", "C", "D"],
  });
  room.phase = PHASES.ROLE_SYNC;
  room.players.forEach((player, index) => {
    player.roleSubmission = {
      phaseVersion: room.phaseVersion,
      hasWitch: index === 0,
      hasConstable: index === 1,
    };
  });
  assert.equal(roleSyncStatus(room).valid, true);

  room.players[2].roleSubmission.hasConstable = true;
  assert.equal(roleSyncStatus(room).valid, false);
});

test("Witch affiliation is represented independently of current Witch card", () => {
  const room = newRoom({
    name: "Test",
    hostSessionId: "host",
    hostName: "A",
    hostIsPlaying: true,
    playerNames: ["B", "C", "D"],
  });
  room.phase = PHASES.NIGHT_WITCH;
  room.players[0].role.everWitch = true;
  room.players[1].role.everWitch = true;
  room.actions = [
    { type: "witch-target", phaseVersion: room.phaseVersion, playerId: room.players[0].id, targetPlayerId: room.players[3].id },
    { type: "witch-target", phaseVersion: room.phaseVersion, playerId: room.players[1].id, targetPlayerId: room.players[3].id },
  ];
  assert.deepEqual(consensusStatus(room, "witch-target"), {
    submitted: 2,
    total: 2,
    agreed: true,
    targetPlayerId: room.players[3].id,
  });
});

test("role sync counts Witch cards, even when one player holds both", () => {
  const room = newRoom({
    name: "Six player test",
    hostSessionId: "host",
    hostName: "A",
    hostIsPlaying: true,
    playerNames: ["B", "C", "D", "E", "F"],
  });
  room.phase = PHASES.ROLE_SYNC;
  room.players.forEach((player, index) => {
    player.roleSubmission = {
      phaseVersion: room.phaseVersion,
      witchCardCount: index === 0 ? 2 : 0,
      hasConstable: index === 1,
    };
  });
  assert.equal(roleSyncStatus(room).valid, true);
});

test("revealed Witch cards and a dead Constable update future checks", () => {
  const room = newRoom({
    name: "Six player test",
    hostSessionId: "host",
    hostName: "A",
    hostIsPlaying: true,
    playerNames: ["B", "C", "D", "E", "F"],
  });
  const player = room.players[0];
  player.role.everWitch = true;
  player.role.currentWitchCards = 2;
  player.role.isConstable = true;

  const firstReveal = revealOneWitchCard(room, player);
  assert.deepEqual(firstReveal, { died: false, remainingWithPlayer: 1 });
  assert.equal(expectedWitchCards(room), 1);

  const deathReveal = revealRolesOnDeath(room, player);
  assert.deepEqual(deathReveal, { witchCards: 1, constable: true });
  assert.equal(room.constableAvailable, false);
  assert.equal(expectedWitchCards(room), 0);
  assert.equal(determineWinner(room), "town");
});

test("Witches win when every living player has ever joined their team", () => {
  const room = newRoom({
    name: "Test",
    hostSessionId: "host",
    hostName: "A",
    hostIsPlaying: true,
    playerNames: ["B", "C", "D"],
  });
  room.players.forEach((player) => { player.role.everWitch = true; });
  room.players[3].role.everWitch = false;
  room.players[3].alive = false;
  assert.equal(determineWinner(room), "witches");
});
