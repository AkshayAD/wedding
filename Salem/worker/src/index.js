import { createRoomCode, newRoom, normalizeName } from "../../site/game-core.js";
import { applyCommand, sanitizeRoom } from "../../site/game-engine.js";

const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const MAX_BODY_BYTES = 16_384;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function errorResponse(error, status = 400) {
  return json({ error: error instanceof Error ? error.message : String(error) }, status);
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new Error("Request is too large.");
  let text;
  try {
    text = await request.text();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error("Request is too large.");
  try { return JSON.parse(text); }
  catch { throw new Error("Request body must be valid JSON."); }
}

async function creationLimitResponse(request, env) {
  const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const id = env.CREATION_LIMITER.idFromName(address);
  const response = await env.CREATION_LIMITER.get(id).fetch("https://limiter/check", { method: "POST" });
  return response.ok ? null : response;
}

function bearerToken(request) {
  const value = request.headers.get("Authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function websocketToken(request) {
  const protocols = (request.headers.get("Sec-WebSocket-Protocol") ?? "")
    .split(",")
    .map((value) => value.trim());
  return protocols[0] === "salem-v1" ? protocols[1] ?? "" : "";
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64Url(new Uint8Array(digest));
}

function actorId() {
  return `actor-${crypto.randomUUID()}`;
}

function roomPath(request) {
  const url = new URL(request.url);
  return url.pathname.split("/").filter(Boolean).at(-1) ?? "";
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return "";
  const configured = String(env.ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (configured.includes(origin)) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function withCors(response, origin) {
  if (!origin || response.status === 101) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function routeToRoom(env, code, action, request) {
  const id = env.ROOMS.idFromName(code);
  const stub = env.ROOMS.get(id);
  const headers = new Headers(request.headers);
  headers.set("X-Salem-Room-Code", code);
  return stub.fetch(`https://room/${action}`, { method: request.method, headers, body: request.body });
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (origin === null) return errorResponse("Origin is not allowed.", 403);
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), origin);

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/rooms(?:\/([A-HJ-NP-Z2-9]{6})\/(lobby|claim|snapshot|command|events))?\/?$/i);
    if (!match) return withCors(errorResponse("Not found.", 404), origin);

    try {
      if (!match[1]) {
        if (request.method !== "POST") return withCors(errorResponse("Method not allowed.", 405), origin);
        if (!origin) return withCors(errorResponse("Room creation requires an allowed website origin.", 403), origin);
        const limited = await creationLimitResponse(request, env);
        if (limited) return withCors(limited, origin);
        const input = await readJson(request);
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const code = createRoomCode();
          const response = await routeToRoom(env, code, "initialize", new Request(request.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }));
          if (response.status !== 409) return withCors(response, origin);
        }
        return withCors(errorResponse("Could not allocate a room code. Please try again.", 503), origin);
      }

      const code = match[1].toUpperCase();
      const action = match[2].toLowerCase();
      if (!CODE_PATTERN.test(code)) return withCors(errorResponse("Invalid room code.", 400), origin);
      const expectedMethod = action === "lobby" || action === "snapshot" || action === "events" ? "GET" : "POST";
      if (request.method !== expectedMethod) return withCors(errorResponse("Method not allowed.", 405), origin);
      return withCors(await routeToRoom(env, code, action, request), origin);
    } catch (error) {
      return withCors(errorResponse(error), origin);
    }
  },
};

export class SalemRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.record = null;
    ctx.blockConcurrencyWhile(async () => {
      this.record = await ctx.storage.get("room-state") ?? null;
    });
  }

  async authenticate(token) {
    if (!token || !this.record) return null;
    return this.record.credentials[await tokenHash(token)] ?? null;
  }

  async save() {
    const ttlHours = Math.min(168, Math.max(1, Number(this.env.ROOM_TTL_HOURS ?? 48)));
    this.record.expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
    await this.ctx.storage.put("room-state", this.record);
    await this.ctx.storage.setAlarm(this.record.expiresAt);
  }

  broadcast() {
    const message = JSON.stringify({
      type: "room-updated",
      phaseVersion: this.record.room.phaseVersion,
      updatedAt: this.record.room.updatedAt,
    });
    this.ctx.getWebSockets().forEach((socket) => {
      try { socket.send(message); } catch { /* disconnected sockets are discarded by the runtime */ }
    });
  }

  async initialize(request) {
    if (this.record) return errorResponse("Room already exists.", 409);
    const input = await readJson(request);
    const code = request.headers.get("X-Salem-Room-Code") ?? "";
    const hostName = normalizeName(input.hostName);
    const hostIsPlaying = Boolean(input.hostIsPlaying);
    const roomName = normalizeName(input.name);
    const playerNames = Array.isArray(input.playerNames) ? input.playerNames.map(normalizeName) : [];
    const total = playerNames.length + (hostIsPlaying ? 1 : 0);
    if (!CODE_PATTERN.test(code)) return errorResponse("Invalid room code.");
    if (!hostName) return errorResponse("Enter the coordinator's name.");
    if (hostName.length > 40) return errorResponse("Coordinator names may be at most 40 characters.");
    if (roomName.length > 50) return errorResponse("Room names may be at most 50 characters.");
    if (!Array.isArray(input.playerNames) || input.playerNames.length > 12 || playerNames.some((name) => !name || name.length > 40)) return errorResponse("Player names must be 1 to 40 characters.");
    if (total < 4 || total > 12) return errorResponse("Choose between 4 and 12 total players.");

    const hostActorId = actorId();
    const room = newRoom({
      name: roomName,
      code,
      hostSessionId: hostActorId,
      hostName,
      hostIsPlaying,
      playerNames,
    });
    if (room.players.length !== total) return errorResponse("Player names must be unique.");
    const hostPlayer = room.players.find((player) => player.claimedBy === hostActorId) ?? null;
    const token = randomToken();
    const actor = { id: hostActorId, isHost: true, playerId: hostPlayer?.id ?? null };
    this.record = { room, credentials: { [await tokenHash(token)]: actor }, expiresAt: 0 };
    await this.save();
    return json({ token, room: sanitizeRoom(room, actor) }, 201);
  }

  lobby() {
    if (!this.record) return errorResponse("Room not found.", 404);
    return json({ room: sanitizeRoom(this.record.room) });
  }

  async claim(request) {
    if (!this.record) return errorResponse("Room not found.", 404);
    if (this.record.room.phase !== "lobby") return errorResponse("This room is no longer accepting seats.", 409);
    const input = await readJson(request);
    const player = this.record.room.players.find((item) => item.id === input.playerId);
    if (!player) return errorResponse("Player not found.", 404);
    if (player.claimedBy) return errorResponse("That seat has already been claimed.", 409);
    const id = actorId();
    const token = randomToken();
    const actor = { id, isHost: false, playerId: player.id };
    player.claimedBy = id;
    this.record.room.events.push({ label: "Joined", detail: player.displayName });
    this.record.credentials[await tokenHash(token)] = actor;
    await this.save();
    this.broadcast();
    return json({ token, room: sanitizeRoom(this.record.room, actor) }, 201);
  }

  async snapshot(request) {
    if (!this.record) return errorResponse("Room not found.", 404);
    const actor = await this.authenticate(bearerToken(request));
    if (!actor) return errorResponse("This device is no longer connected to that seat.", 401);
    return json({ room: sanitizeRoom(this.record.room, actor) });
  }

  async command(request) {
    if (!this.record) return errorResponse("Room not found.", 404);
    const actor = await this.authenticate(bearerToken(request));
    if (!actor) return errorResponse("This device is no longer connected to that seat.", 401);
    const input = await readJson(request);
    const previousRoom = this.record.room;
    const releasedActorId = input.type === "release-seat"
      ? previousRoom.players.find((player) => player.id === input.payload?.playerId)?.claimedBy
      : null;
    const nextRoom = structuredClone(previousRoom);
    try {
      applyCommand(nextRoom, input, actor);
    } catch (error) {
      return errorResponse(error, 409);
    }
    nextRoom.updatedAt = new Date().toISOString();
    this.record.room = nextRoom;
    if (releasedActorId) {
      Object.entries(this.record.credentials).forEach(([hash, credential]) => {
        if (credential.id === releasedActorId) delete this.record.credentials[hash];
      });
    }
    await this.save();
    this.broadcast();
    return json({ room: sanitizeRoom(nextRoom, actor) });
  }

  async events(request) {
    if (!this.record) return errorResponse("Room not found.", 404);
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return errorResponse("WebSocket upgrade required.", 426);
    const actor = await this.authenticate(websocketToken(request));
    if (!actor) return errorResponse("This device is no longer connected to that seat.", 401);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { "Sec-WebSocket-Protocol": "salem-v1" },
    });
  }

  async fetch(request) {
    try {
      const action = roomPath(request);
      if (action === "initialize" && request.method === "POST") return await this.initialize(request);
      if (action === "lobby" && request.method === "GET") return this.lobby();
      if (action === "claim" && request.method === "POST") return await this.claim(request);
      if (action === "snapshot" && request.method === "GET") return await this.snapshot(request);
      if (action === "command" && request.method === "POST") return await this.command(request);
      if (action === "events" && request.method === "GET") return await this.events(request);
      return errorResponse("Not found.", 404);
    } catch (error) {
      return errorResponse(error, 500);
    }
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
    this.record = null;
    this.ctx.getWebSockets().forEach((socket) => {
      try { socket.close(1000, "Room expired"); } catch { /* already closed */ }
    });
  }

  webSocketMessage() {}
}

export class RoomCreationLimiter {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch() {
    const now = Date.now();
    const current = await this.ctx.storage.get("window") ?? { count: 0, resetAt: now + 60 * 60 * 1000 };
    const window = now >= current.resetAt ? { count: 0, resetAt: now + 60 * 60 * 1000 } : current;
    if (window.count >= 8) {
      const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
      return json({ error: "Too many rooms were created from this network. Try again later." }, 429, { "Retry-After": String(retryAfter) });
    }
    window.count += 1;
    await this.ctx.storage.put("window", window);
    await this.ctx.storage.setAlarm(window.resetAt);
    return new Response(null, { status: 204 });
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
