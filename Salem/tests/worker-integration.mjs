import assert from "node:assert/strict";

const base = process.env.SALEM_API_URL ?? "http://127.0.0.1:8787";

async function request(path, { method = "GET", body, token, origin = "http://localhost:4173" } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const created = await request("/api/rooms", {
  method: "POST",
  body: {
    name: "Integration Night",
    hostName: "Akshay",
    hostIsPlaying: true,
    playerNames: ["Divyanka", "Mira", "Kabir"],
  },
});
assert.equal(created.response.status, 201, JSON.stringify(created.data));
const code = created.data.room.code;
const hostToken = created.data.token;
assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);

const lobby = await request(`/api/rooms/${code}/lobby`);
assert.equal(lobby.response.status, 200);
assert.equal(lobby.data.room.players.some((player) => "role" in player), false);
assert.equal(lobby.data.room.players.some((player) => "claimedBy" in player), false);

const unauthorized = await request(`/api/rooms/${code}/snapshot`, { token: "wrong-token" });
assert.equal(unauthorized.response.status, 401);

const actors = [{ token: hostToken, room: created.data.room }];
const eventUrl = new URL(`${base}/api/rooms/${code}/events`);
eventUrl.protocol = eventUrl.protocol === "https:" ? "wss:" : "ws:";
const events = new WebSocket(eventUrl, ["salem-v1", hostToken]);
await new Promise((resolve, reject) => {
  events.addEventListener("open", resolve, { once: true });
  events.addEventListener("error", () => reject(new Error("WebSocket connection failed.")), { once: true });
});
const nextInvalidation = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("WebSocket invalidation timed out.")), 3_000);
  events.addEventListener("message", (event) => { clearTimeout(timeout); resolve(JSON.parse(event.data)); }, { once: true });
});

for (const [index, player] of lobby.data.room.players.slice(1).entries()) {
  const claimed = await request(`/api/rooms/${code}/claim`, { method: "POST", body: { playerId: player.id } });
  assert.equal(claimed.response.status, 201, JSON.stringify(claimed.data));
  actors.push({ token: claimed.data.token, room: claimed.data.room });
  if (index === 0) assert.equal((await nextInvalidation).type, "room-updated");
}
events.close();

const duplicate = await request(`/api/rooms/${code}/claim`, {
  method: "POST",
  body: { playerId: lobby.data.room.players[1].id },
});
assert.equal(duplicate.response.status, 409);

const releasedPlayerId = lobby.data.room.players[1].id;
const released = await request(`/api/rooms/${code}/command`, {
  method: "POST",
  token: hostToken,
  body: { type: "release-seat", phaseVersion: created.data.room.phaseVersion, payload: { playerId: releasedPlayerId } },
});
assert.equal(released.response.status, 200, JSON.stringify(released.data));
const revokedSnapshot = await request(`/api/rooms/${code}/snapshot`, { token: actors[1].token });
assert.equal(revokedSnapshot.response.status, 401);
const reclaimed = await request(`/api/rooms/${code}/claim`, { method: "POST", body: { playerId: releasedPlayerId } });
assert.equal(reclaimed.response.status, 201, JSON.stringify(reclaimed.data));
actors[1] = { token: reclaimed.data.token, room: reclaimed.data.room };

let hostRoom = (await request(`/api/rooms/${code}/snapshot`, { token: hostToken })).data.room;
for (const player of hostRoom.players) {
  const result = await request(`/api/rooms/${code}/command`, {
    method: "POST",
    token: hostToken,
    body: { type: "set-character", phaseVersion: hostRoom.phaseVersion, payload: { playerId: player.id, character: `Character ${player.seat}` } },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  hostRoom = result.data.room;
}

const forbiddenHostCommand = await request(`/api/rooms/${code}/command`, {
  method: "POST",
  token: actors[1].token,
  body: { type: "start-game", phaseVersion: hostRoom.phaseVersion, payload: {} },
});
assert.equal(forbiddenHostCommand.response.status, 409);

let result = await request(`/api/rooms/${code}/command`, {
  method: "POST",
  token: hostToken,
  body: { type: "start-game", phaseVersion: hostRoom.phaseVersion, payload: {} },
});
assert.equal(result.response.status, 200, JSON.stringify(result.data));
hostRoom = result.data.room;
assert.equal(hostRoom.phase, "role-sync");

for (let index = 0; index < actors.length; index += 1) {
  result = await request(`/api/rooms/${code}/command`, {
    method: "POST",
    token: actors[index].token,
    body: {
      type: "submit-role-sync",
      phaseVersion: hostRoom.phaseVersion,
      payload: { witchCardCount: index === 0 ? 1 : 0, hasConstable: index === 1 },
    },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  if (index === 0) hostRoom = result.data.room;
}

const refreshedHost = (await request(`/api/rooms/${code}/snapshot`, { token: hostToken })).data.room;
const refreshedConstable = (await request(`/api/rooms/${code}/snapshot`, { token: actors[1].token })).data.room;
assert.equal(refreshedHost.phase, "opening-dawn");
assert.equal(refreshedHost.players[0].role.everWitch, true);
assert.equal("role" in refreshedHost.players[1], false);
assert.equal(refreshedConstable.players[1].role.isConstable, true);
assert.equal("role" in refreshedConstable.players[0], false);

const blockedOrigin = await request(`/api/rooms/${code}/lobby`, { origin: "https://evil.example" });
assert.equal(blockedOrigin.response.status, 403);

const forgottenHost = await request(`/api/rooms/${code}/forget`, { method: "POST", token: hostToken });
assert.equal(forgottenHost.response.status, 200, JSON.stringify(forgottenHost.data));
assert.equal((await request(`/api/rooms/${code}/snapshot`, { token: hostToken })).response.status, 401);
const successorRoom = (await request(`/api/rooms/${code}/snapshot`, { token: actors[2].token })).data.room;
assert.equal(successorRoom.viewer.isHost, true);
assert.equal(successorRoom.coordinatorName, "Mira");
assert.equal((await request(`/api/rooms/${code}/snapshot`, { token: actors[1].token })).data.room.viewer.isHost, false);

console.log(`Worker integration passed for room ${code}`);
