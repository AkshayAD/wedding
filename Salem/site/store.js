import { newRoom } from "./game-core.js";
import { applyCommand, sanitizeRoom } from "./game-engine.js";

const ROOM_PREFIX = "salem.room.v2.";
const REMEMBERED_KEY = "salem.rememberedPlayers.v1";
const SESSION_KEY = "salem.session.v2";
const ACTIVE_ROOM_KEY = "salem.activeRoom.v2";
const IDENTITY_PREFIX = "salem.identity.v2.";
const CHANNEL_NAME = "salem-local-preview-v2";

function parse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function uniqueNames(names) {
  const seen = new Set();
  return names.filter((entry) => {
    const key = String(entry?.name ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

class DeviceStore {
  getActiveRoom() { return parse(localStorage.getItem(ACTIVE_ROOM_KEY), null); }
  setActiveRoom(pointer) {
    if (!pointer) localStorage.removeItem(ACTIVE_ROOM_KEY);
    else localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(pointer));
  }
  getRememberedPlayers() {
    return uniqueNames(parse(localStorage.getItem(REMEMBERED_KEY), []))
      .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""));
  }
  rememberPlayers(names) {
    const now = new Date().toISOString();
    const existing = this.getRememberedPlayers();
    const byName = new Map(existing.map((entry) => [entry.name.toLowerCase(), entry]));
    names.forEach((rawName, index) => {
      const name = String(rawName ?? "").trim().replace(/\s+/g, " ");
      if (!name) return;
      const key = name.toLowerCase();
      byName.set(key, { ...byName.get(key), name, avatarTone: byName.get(key)?.avatarTone ?? index % 6, lastUsedAt: now });
    });
    localStorage.setItem(REMEMBERED_KEY, JSON.stringify(uniqueNames([...byName.values()])));
  }
  forgetPlayer(name) {
    const key = String(name).toLowerCase();
    const next = this.getRememberedPlayers().filter((entry) => entry.name.toLowerCase() !== key);
    localStorage.setItem(REMEMBERED_KEY, JSON.stringify(next));
  }
  forgetIdentity() {}
}

export class LocalPreviewStore extends DeviceStore {
  constructor() {
    super();
    this.mode = "local-preview";
    this.channel = "BroadcastChannel" in globalThis ? new BroadcastChannel(CHANNEL_NAME) : null;
    this.listeners = new Map();
    this.onStorage = (event) => {
      if (event.key?.startsWith(ROOM_PREFIX)) this.emit(event.key.slice(ROOM_PREFIX.length));
    };
    globalThis.addEventListener("storage", this.onStorage);
    this.channel?.addEventListener("message", (event) => this.emit(event.data?.code));
  }
  getActorId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `actor-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }
  roomKey(code) { return `${ROOM_PREFIX}${String(code).toUpperCase()}`; }
  getRawRoom(code) { return parse(localStorage.getItem(this.roomKey(code)), null); }
  actorFor(room) {
    const id = this.getActorId();
    const player = room.players.find((item) => item.claimedBy === id) ?? null;
    if (!player && room.hostSessionId !== id) return null;
    return { id, isHost: room.hostSessionId === id, playerId: player?.id ?? null };
  }
  saveRawRoom(room) {
    room.updatedAt = new Date().toISOString();
    localStorage.setItem(this.roomKey(room.code), JSON.stringify(room));
    this.channel?.postMessage({ code: room.code });
    this.emit(room.code);
  }
  async withRoom(code, operation) {
    const execute = async () => {
      const room = this.getRawRoom(code);
      if (!room) throw new Error("This room no longer exists in local preview.");
      const result = await operation(room);
      this.saveRawRoom(room);
      return result;
    };
    return navigator.locks?.request ? navigator.locks.request(`salem-room-${code}`, execute) : execute();
  }
  async createRoom(input) {
    const room = newRoom({ ...input, hostSessionId: this.getActorId() });
    this.saveRawRoom(room);
    return sanitizeRoom(room, this.actorFor(room));
  }
  async findRoom(code) {
    const room = this.getRawRoom(code);
    return room ? sanitizeRoom(room) : null;
  }
  async resumeRoom(code) {
    const room = this.getRawRoom(code);
    const actor = room ? this.actorFor(room) : null;
    return room && actor ? sanitizeRoom(room, actor) : null;
  }
  async claimSeat(code, playerId) {
    return this.withRoom(code, (room) => {
      if (room.phase !== "lobby") throw new Error("This room is no longer accepting seats.");
      const player = room.players.find((item) => item.id === playerId);
      if (!player || player.claimedBy) throw new Error("That seat has already been claimed.");
      player.claimedBy = this.getActorId();
      room.events.push({ label: "Joined", detail: player.displayName });
      return sanitizeRoom(room, this.actorFor(room));
    });
  }
  async command(code, command) {
    return this.withRoom(code, (room) => {
      const actor = this.actorFor(room);
      if (!actor) throw new Error("This device is no longer connected to that seat.");
      applyCommand(room, command, actor);
      return sanitizeRoom(room, actor);
    });
  }
  forgetIdentity() { sessionStorage.removeItem(SESSION_KEY); }
  subscribe(code, listener) {
    const key = String(code).toUpperCase();
    const listeners = this.listeners.get(key) ?? new Set();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(key);
    };
  }
  emit(code) {
    if (!code) return;
    const room = this.getRawRoom(code);
    const actor = room ? this.actorFor(room) : null;
    const snapshot = room && actor ? sanitizeRoom(room, actor) : null;
    this.listeners.get(String(code).toUpperCase())?.forEach((listener) => listener(snapshot));
  }
}

export class CloudflareStore extends DeviceStore {
  constructor(apiBaseUrl) {
    super();
    this.mode = "cloudflare";
    this.apiBaseUrl = String(apiBaseUrl).replace(/\/$/, "");
  }
  identityKey(code) { return `${IDENTITY_PREFIX}${String(code).toUpperCase()}`; }
  getToken(code) { return localStorage.getItem(this.identityKey(code)) ?? ""; }
  setToken(code, token) { localStorage.setItem(this.identityKey(code), token); }
  forgetIdentity(code) { localStorage.removeItem(this.identityKey(code)); }
  async request(path, { method = "GET", body, token } = {}) {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error ?? "The Salem room service could not complete that request.");
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async createRoom(input) {
    const result = await this.request("/api/rooms", { method: "POST", body: input });
    this.setToken(result.room.code, result.token);
    return result.room;
  }
  async findRoom(code) {
    try { return (await this.request(`/api/rooms/${String(code).toUpperCase()}/lobby`)).room; }
    catch (error) { if (error.status === 404) return null; throw error; }
  }
  async resumeRoom(code) {
    const token = this.getToken(code);
    if (!token) return null;
    try { return (await this.request(`/api/rooms/${String(code).toUpperCase()}/snapshot`, { token })).room; }
    catch (error) {
      if (error.status === 401 || error.status === 404) {
        localStorage.removeItem(this.identityKey(code));
        return null;
      }
      throw error;
    }
  }
  async claimSeat(code, playerId) {
    const result = await this.request(`/api/rooms/${String(code).toUpperCase()}/claim`, { method: "POST", body: { playerId } });
    this.setToken(code, result.token);
    return result.room;
  }
  async command(code, command) {
    const token = this.getToken(code);
    if (!token) throw new Error("This device is no longer connected to that seat.");
    return (await this.request(`/api/rooms/${String(code).toUpperCase()}/command`, { method: "POST", body: command, token })).room;
  }
  subscribe(code, listener) {
    let stopped = false;
    let socket = null;
    let socketOpen = false;
    let refreshInFlight = false;
    let refreshQueued = false;
    let latestPhaseVersion = -1;
    let latestUpdatedAt = "";
    const token = this.getToken(code);
    const refresh = async () => {
      if (stopped) return;
      if (refreshInFlight) { refreshQueued = true; return; }
      refreshInFlight = true;
      try {
        const room = await this.resumeRoom(code);
        if (!stopped && room) {
          const version = Number(room.phaseVersion ?? 0);
          const updatedAt = String(room.updatedAt ?? "");
          if (version > latestPhaseVersion || (version === latestPhaseVersion && updatedAt > latestUpdatedAt)) {
            latestPhaseVersion = version;
            latestUpdatedAt = updatedAt;
            listener(room);
          }
        } else if (!stopped) listener(null);
      } catch { /* the next event or poll retries transient failures */ }
      finally {
        refreshInFlight = false;
        if (refreshQueued && !stopped) { refreshQueued = false; void refresh(); }
      }
    };
    const connect = () => {
      if (stopped || !token) return;
      const url = new URL(`${this.apiBaseUrl}/api/rooms/${String(code).toUpperCase()}/events`);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      try {
        socket = new WebSocket(url, ["salem-v1", token]);
        socket.addEventListener("open", () => { socketOpen = true; });
        socket.addEventListener("message", refresh);
        socket.addEventListener("close", () => {
          socketOpen = false;
          if (!stopped && this.getToken(code) === token) setTimeout(connect, 1500);
        });
        socket.addEventListener("error", () => { socketOpen = false; });
      } catch { socketOpen = false; /* polling remains available */ }
    };
    connect();
    const pollTimer = setInterval(() => { if (!socketOpen) refresh(); }, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    globalThis.addEventListener("online", refresh);
    return () => {
      stopped = true;
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisible);
      globalThis.removeEventListener("online", refresh);
      socket?.close();
    };
  }
}

export function createStore() {
  const config = globalThis.SALEM_CONFIG ?? {};
  if (config.mode === "cloudflare") {
    if (!config.apiBaseUrl) throw new Error("Salem is missing its room service URL.");
    return new CloudflareStore(config.apiBaseUrl);
  }
  return new LocalPreviewStore();
}
