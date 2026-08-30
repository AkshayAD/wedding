import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCoordinatorRecord,
  selectCoordinatorActor,
  transferCoordinator,
} from "../worker/src/index.js";

function recordFixture() {
  const players = ["Akshay", "Divyanka", "Mira", "Kabir"].map((displayName, index) => ({
    id: `player-${index}`,
    displayName,
    claimedBy: `actor-${index}`,
  }));
  return {
    room: {
      hostSessionId: "actor-0",
      coordinatorName: "Akshay",
      players,
      events: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    credentials: {
      host: { id: "actor-0", isHost: true, playerId: "player-0" },
      second: { id: "actor-1", isHost: false, playerId: "player-1" },
      third: { id: "actor-2", isHost: false, playerId: "player-2" },
      fourth: { id: "actor-3", isHost: false, playerId: "player-3" },
    },
  };
}

test("legacy credentials receive deterministic join order", () => {
  const record = normalizeCoordinatorRecord(recordFixture());
  assert.deepEqual(Object.values(record.credentials).map((actor) => actor.joinOrder), [0, 1, 2, 3]);
  assert.equal(record.nextJoinOrder, 4);
});

test("the earliest still-credentialed claimed player becomes coordinator", () => {
  const record = normalizeCoordinatorRecord(recordFixture());
  delete record.credentials.second;
  const nextActor = selectCoordinatorActor(record);
  assert.equal(nextActor.id, "actor-2");
  assert.equal(transferCoordinator(record, nextActor), true);
  assert.equal(record.room.hostSessionId, "actor-2");
  assert.equal(record.room.coordinatorName, "Mira");
  assert.equal(record.credentials.third.isHost, true);
  assert.equal(record.credentials.host.isHost, false);
  assert.deepEqual(record.room.events.at(-1), { label: "Coordinator", detail: "Mira" });
});

test("unclaimed or revoked seats cannot inherit coordinator control", () => {
  const record = normalizeCoordinatorRecord(recordFixture());
  record.room.players[1].claimedBy = null;
  delete record.credentials.third;
  delete record.credentials.fourth;
  assert.equal(selectCoordinatorActor(record), null);
});
