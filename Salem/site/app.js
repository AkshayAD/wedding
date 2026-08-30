import {
  PHASES,
  PHASE_LABELS,
  canStart,
  expectedWitchCards,
  findPlayer,
  livingPlayers,
  normalizeName,
  setupFor,
} from "./game-core.js";
import { createStore } from "./store.js";

const app = document.querySelector("#app");
const statusRegion = document.querySelector("#topbar-status");
const toastRegion = document.querySelector("#toast-region");
const store = createStore();

const state = {
  view: "landing",
  room: null,
  joinRoom: null,
  draftPlayers: [],
  createDraft: {
    roomName: "A Night in Salem",
    hostName: "",
    hostIsPlaying: true,
    rememberPlayers: true,
  },
  roleDraft: null,
  resolutionDraft: null,
  lobbyPlayerDraft: "",
  serverClockOffset: 0,
  unsubscribe: null,
};
const characterSaveTimers = new Map();
const characterDrafts = new Map();

const escapeHtml = (value) => {
  const node = document.createElement("span");
  node.textContent = String(value ?? "");
  return node.innerHTML;
};

const initials = (name) => normalizeName(name).split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const isHost = () => Boolean(state.room?.viewer?.isHost);
const currentPlayer = () => state.room?.players.find((player) => player.id === state.room?.viewer?.playerId) ?? null;
const phaseProgress = (room) => room.publicProgress ?? PHASE_LABELS[room.phase];
const confessionSeconds = (room) => Math.max(0, Math.ceil((Number(room.confessionEndsAt ?? 0) - (Date.now() + state.serverClockOffset)) / 1000));

function syncServerClock(room) {
  if (Number.isFinite(Number(room?.serverNow))) state.serverClockOffset = Number(room.serverNow) - Date.now();
}

function toast(message, tone = "default") {
  const item = document.createElement("div");
  item.className = `toast toast--${tone}`;
  item.textContent = message;
  toastRegion.append(item);
  setTimeout(() => item.remove(), 3200);
}

function updateTopbar() {
  if (!state.room) {
    statusRegion.innerHTML = `<span class="mode-dot"></span><span>${store.mode === "cloudflare" ? "Live rooms" : "Local preview"}</span>`;
    return;
  }
  statusRegion.innerHTML = `
    <span class="mode-dot"></span>
    <span>${escapeHtml(PHASE_LABELS[state.room.phase])}</span>
    <span class="topbar__code">${escapeHtml(state.room.code)}</span>
  `;
}

function attachRoom(room, pointer = null) {
  state.unsubscribe?.();
  if (state.room?.code !== room.code) {
    state.roleDraft = null;
    state.resolutionDraft = null;
    state.lobbyPlayerDraft = "";
    characterDrafts.clear();
  }
  syncServerClock(room);
  state.room = room;
  state.joinRoom = null;
  state.view = "game";
  if (pointer) store.setActiveRoom(pointer);
  state.unsubscribe = store.subscribe(room.code, (updatedRoom) => {
    if (!updatedRoom) {
      state.unsubscribe?.();
      state.unsubscribe = null;
      store.setActiveRoom(null);
      state.room = null;
      state.view = "landing";
      toast("This device is no longer connected to that room.", "danger");
      return render();
    }
    syncServerClock(updatedRoom);
    state.room = updatedRoom;
    render();
  });
  const url = new URL(globalThis.location.href);
  url.searchParams.set("room", room.code);
  history.replaceState({}, "", url);
  render();
}

function landingTemplate() {
  return `
    <section class="landing shell">
      <div class="hero-copy">
        <p class="eyebrow">A private companion for Salem 1692</p>
        <h1>The town sleeps.<br><em>The room remembers.</em></h1>
        <p class="hero-copy__lede">Keep every player, character and secret night action in step—without replacing the cards on your table.</p>
        <div class="hero-actions">
          <button class="button button--primary" data-action="show-create">Create a room</button>
          <button class="button button--quiet" data-action="show-join">Join with a code</button>
        </div>
        <div class="trust-line" aria-label="Product qualities">
          <span>4–12 players</span><i></i><span>Refresh-safe</span><i></i><span>Roles stay private</span>
        </div>
      </div>
      <aside class="night-card" aria-label="Night flow preview">
        <div class="night-card__top"><span>Night 02</span><span class="signal"><i></i> Waiting</span></div>
        <div class="night-card__moon" aria-hidden="true"><span></span></div>
        <p>The Witches wake</p>
        <strong>3 of 3 choices received</strong>
        <div class="progress"><span style="width:100%"></span></div>
        <small>Individual choices remain hidden.</small>
      </aside>
    </section>
    <section class="principles shell" aria-label="What the companion coordinates">
      <article><span>01</span><h2>Remember the town</h2><p>Reuse your regular group, then assign tonight's characters and seats.</p></article>
      <article><span>02</span><h2>Protect the secrets</h2><p>Only Witches and the current Constable receive private night controls.</p></article>
      <article><span>03</span><h2>Resolve without doubt</h2><p>One target, one protection choice and a clear public outcome.</p></article>
    </section>
  `;
}

function createTemplate() {
  const remembered = store.getRememberedPlayers();
  return `
    <section class="form-page shell shell--narrow">
      <button class="back-link" data-action="go-home">← Back</button>
      <p class="eyebrow">Create tonight's room</p>
      <h1 class="page-title">Gather the town.</h1>
      <p class="page-intro">Names can be remembered. Characters and roles always start fresh.</p>

      <form id="create-room-form" class="form-stack">
        <div class="field-grid">
          <label class="field"><span>Room name</span><input name="roomName" value="${escapeHtml(state.createDraft.roomName)}" maxlength="50" required /></label>
          <label class="field"><span>Your name</span><input name="hostName" value="${escapeHtml(state.createDraft.hostName)}" autocomplete="name" maxlength="40" required /></label>
        </div>
        <label class="check-row"><input type="checkbox" name="hostIsPlaying" ${state.createDraft.hostIsPlaying ? "checked" : ""} /><span><b>I am also playing</b><small>Turn this off if you are a neutral Moderator.</small></span></label>

        ${remembered.length ? `
          <div class="section-label"><span>Remembered players</span><small>Tap to add tonight</small></div>
          <div class="saved-list">
            ${remembered.map((player) => `
              <div class="saved-person">
                <button type="button" data-action="add-remembered" data-name="${escapeHtml(player.name)}"><span class="avatar avatar--${player.avatarTone}">${escapeHtml(initials(player.name))}</span>${escapeHtml(player.name)}</button>
                <button type="button" class="icon-button" aria-label="Forget ${escapeHtml(player.name)}" data-action="forget-player" data-name="${escapeHtml(player.name)}">×</button>
              </div>
            `).join("")}
          </div>
        ` : ""}

        <div class="section-label"><span>Tonight's players</span><small>${state.draftPlayers.length} added</small></div>
        <div class="add-row">
          <label class="field"><span class="sr-only">Player name</span><input id="new-player-name" placeholder="Add a player's name" maxlength="40" /></label>
          <button type="button" class="button button--quiet" data-action="add-draft-player">Add</button>
        </div>
        <div class="draft-list">
          ${state.draftPlayers.length ? state.draftPlayers.map((name, index) => `
            <span class="name-chip">${escapeHtml(name)}<button type="button" aria-label="Remove ${escapeHtml(name)}" data-action="remove-draft-player" data-index="${index}">×</button></span>
          `).join("") : `<p class="empty-inline">Add at least ${4 - 1} other players when you are playing.</p>`}
        </div>
        <label class="check-row check-row--compact"><input type="checkbox" name="rememberPlayers" ${state.createDraft.rememberPlayers ? "checked" : ""} /><span><b>Remember these names for next time</b></span></label>
        <button class="button button--primary button--wide" type="submit">Create room</button>
      </form>
    </section>
  `;
}

function joinTemplate() {
  const room = state.joinRoom;
  return `
    <section class="form-page shell shell--narrow">
      <button class="back-link" data-action="go-home">← Back</button>
      <p class="eyebrow">Enter the circle</p>
      <h1 class="page-title">Join your town.</h1>
      ${!room ? `
        <form id="find-room-form" class="join-code-form">
          <label class="field"><span>Six-character room code</span><input name="roomCode" class="room-code-input" maxlength="6" autocomplete="off" placeholder="SALEM7" required /></label>
          <button class="button button--primary" type="submit">Find room</button>
        </form>
        <p class="preview-note"><span class="mode-dot"></span>${store.mode === "cloudflare" ? "Live rooms sync securely across devices and expire after 48 hours." : "Local preview rooms are available only in tabs from this browser profile."}</p>
      ` : `
        <div class="join-room-heading">
          <span>Room ${escapeHtml(room.code)}</span>
          <h2>${escapeHtml(room.name)}</h2>
          <p><b>${escapeHtml(room.coordinatorName)}</b> is the coordinator. Choose your name; a claimed seat can only be released by them.</p>
        </div>
        <div class="seat-list">
          ${room.players.map((player) => `
            <button class="seat-choice" data-action="claim-seat" data-player-id="${player.id}" ${player.claimed ? "disabled" : ""}>
              <span class="avatar avatar--${player.avatarTone}">${escapeHtml(initials(player.displayName))}</span>
              <span><b>${escapeHtml(player.displayName)}</b><small>Seat ${player.seat}${player.character ? ` · ${escapeHtml(player.character)}` : ""}</small></span>
              <em>${player.claimed ? "Claimed" : "This is me"}</em>
            </button>
          `).join("")}
        </div>
      `}
    </section>
  `;
}

function setupSummary(room) {
  const setup = setupFor(room.players.length);
  if (!setup) return `<p class="warning-text">Salem requires 4–12 active players.</p>`;
  const hiddenWitchCards = expectedWitchCards(room);
  return `
    <div class="setup-strip">
      <div><span>Players</span><b>${room.players.length}</b></div>
      <div><span>Not a Witch</span><b>${setup.notWitch}</b></div>
      <div><span>Witch cards hidden</span><b>${hiddenWitchCards} / ${setup.witch}</b></div>
      <div><span>Constable</span><b>${room.constableAvailable ? "Active" : "Revealed"}</b></div>
      <div><span>Each receives</span><b>${setup.perPlayer} Tryals</b></div>
    </div>
  `;
}

function rosterTemplate(room) {
  const host = isHost();
  const canEditCharacters = host && room.phase === PHASES.LOBBY;
  const canEditLife = host && room.phase === PHASES.DAY;
  return `
    <section class="panel roster-panel">
      <div class="panel-heading"><div><span class="section-kicker">The town</span><h2>${livingPlayers(room).length} living</h2></div><span class="muted">${room.players.length} seats</span></div>
      <div class="roster-grid">
        ${room.players.map((player) => `
          <article class="person-card ${player.alive ? "" : "person-card--dead"}">
            <div class="avatar avatar--${player.avatarTone}">${escapeHtml(initials(player.displayName))}</div>
            <div class="person-card__copy">
              <strong>${escapeHtml(player.displayName)}</strong>
              ${canEditCharacters ? `
                <label><span class="sr-only">Character for ${escapeHtml(player.displayName)}</span><input data-character-id="${player.id}" value="${escapeHtml(characterDrafts.get(player.id) ?? player.character)}" placeholder="Town Hall character" maxlength="40" /></label>
              ` : `<small>${escapeHtml(player.character || "Character not assigned")}</small>`}
              <span class="claim-state">${player.alive ? (player.claimed ? "Connected" : "Waiting to join") : "Dead"}</span>
            </div>
            <div class="person-card__actions">
              ${host && room.phase === PHASES.LOBBY && player.claimed && player.id !== room.viewer.playerId ? `<button class="tiny-button" data-action="release-seat" data-player-id="${player.id}">Release</button>` : ""}
              ${canEditLife && player.alive ? `<button class="tiny-button" data-action="reveal-witch-card" data-player-id="${player.id}">Witch revealed</button><button class="tiny-button" data-action="record-death" data-player-id="${player.id}">Record death</button>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
      ${host && room.phase === PHASES.LOBBY ? `
        <div class="inline-add">
          <input id="lobby-player-name" value="${escapeHtml(state.lobbyPlayerDraft)}" placeholder="Add another player" maxlength="40" ${room.players.length >= 12 ? "disabled" : ""} />
          <button class="button button--quiet" data-action="add-lobby-player" ${room.players.length >= 12 ? "disabled" : ""}>Add</button>
        </div>
      ` : ""}
    </section>
  `;
}

function targetGrid(room, { action, excludeSelf = false }) {
  const me = currentPlayer();
  return `
    <div class="target-grid">
      ${livingPlayers(room).filter((player) => !(excludeSelf && player.id === me?.id)).map((player) => `
        <button class="target-card" data-action="${action}" data-target-id="${player.id}">
          <span class="avatar avatar--${player.avatarTone}">${escapeHtml(initials(player.displayName))}</span>
          <span><b>${escapeHtml(player.displayName)}</b><small>${escapeHtml(player.character)}</small></span>
        </button>
      `).join("")}
    </div>
  `;
}

function privatePanel(room) {
  const me = currentPlayer();
  const host = isHost();
  const ownSubmission = me?.roleSubmission?.phaseVersion === room.phaseVersion ? me.roleSubmission : null;

  if (room.phase === PHASES.LOBBY) {
    if (host) {
      return `
        <div class="phase-copy"><span class="section-kicker">Coordinator</span><h2>Prepare the room</h2><p>Every player must claim their name, and every Town Hall character must be recorded.</p></div>
        <div class="host-actions">
          <button class="button button--quiet" data-action="copy-room-link">Copy invite link</button>
          <button class="button button--primary" data-action="start-game" ${canStart(room) ? "" : "disabled"}>Begin private check-in</button>
        </div>
        ${!canStart(room) ? `<p class="phase-hint">Waiting for 4–12 claimed players with assigned characters.</p>` : ""}
      `;
    }
    return `<div class="waiting-state"><span class="waiting-orbit"></span><h2>The coordinator is preparing Salem.</h2><p>Your seat is saved. Keep this page open.</p></div>`;
  }

  if (room.phase === PHASES.ROLE_SYNC || room.phase === PHASES.CONSPIRACY_SYNC) {
    if (!me || !me.alive) return `<div class="waiting-state"><span class="waiting-orbit"></span><h2>Private role check in progress.</h2><p>${escapeHtml(phaseProgress(room))}</p></div>`;
    const initial = room.phase === PHASES.ROLE_SYNC;
    const roleDraft = state.roleDraft?.roomCode === room.code && state.roleDraft?.phaseVersion === room.phaseVersion ? state.roleDraft : ownSubmission;
    const ownWitchCardCount = Number(roleDraft?.witchCardCount ?? (roleDraft?.hasWitch ? 1 : 0));
    const witchCardOptions = Array.from({ length: expectedWitchCards(room) + 1 }, (_, count) => `<option value="${count}" ${count === ownWitchCardCount ? "selected" : ""}>${count}</option>`).join("");
    return `
      <div class="phase-copy"><span class="section-kicker">Only you can answer this</span><h2>${initial ? "Check your Tryal cards" : "What changed after Conspiracy?"}</h2><p>${initial ? "Your answers determine which private controls this device receives." : "Becoming a Witch is permanent. Constable authority follows the card."}</p></div>
      ${room.roleSyncConflict ? `<div class="notice notice--danger">${escapeHtml(room.roleSyncConflict)}</div>` : ""}
      <form id="role-sync-form" class="secret-form">
        <label class="secret-choice secret-choice--count"><span><b>Witch cards currently in front of me</b><small>${initial ? "Count the Witch Tryal cards you hold." : "Losing a Witch card does not remove you from the Witch team."}</small></span><select name="witchCardCount" aria-label="Witch cards currently in front of me">${witchCardOptions}</select></label>
        <label class="secret-choice"><input type="checkbox" name="hasConstable" ${roleDraft?.hasConstable ? "checked" : ""} ${room.constableAvailable ? "" : "disabled"} /><span><b>I currently hold the Constable card</b><small>${room.constableAvailable ? "This authority can move after Conspiracy." : "The Constable card has already been revealed."}</small></span></label>
        <button class="button button--primary button--wide" type="submit">${ownSubmission ? "Update private answer" : "Seal my answer"}</button>
      </form>
      ${ownSubmission ? `<p class="phase-hint">Answer received · ${escapeHtml(phaseProgress(room))}</p>` : ""}
      ${host && !initial && room.roleSyncConflict ? `<button class="button button--quiet button--wide" data-action="confirm-constable-absent">Everyone confirms the Constable card was revealed</button>` : ""}
    `;
  }

  if (room.phase === PHASES.OPENING_DAWN || room.phase === PHASES.NIGHT_WITCH) {
    const witch = me && me.alive && me.role.everWitch;
    if (!witch) return `<div class="waiting-state"><span class="waiting-orbit"></span><h2>Keep your eyes closed.</h2><p>The night is moving quietly.</p></div>`;
    const type = room.phase === PHASES.OPENING_DAWN ? "black-cat" : "witch-target";
    const existing = room.actions.find((item) => item.type === type && item.phaseVersion === room.phaseVersion && item.playerId === me.id);
    return `
      <div class="phase-copy"><span class="section-kicker">Witch action</span><h2>${room.phase === PHASES.OPENING_DAWN ? "Choose the Black Cat" : "Choose tonight's target"}</h2><p>Every living Witch must choose the same person. Individual choices stay hidden.</p></div>
      ${existing ? `<div class="notice">Your current choice is ${escapeHtml(findPlayer(room, existing.targetPlayerId)?.displayName)}. You may change it until agreement.</div>` : ""}
      ${targetGrid(room, { action: "submit-witch-target" })}
    `;
  }

  if (room.phase === PHASES.DAWN_REVEAL) {
    const target = findPlayer(room, room.publicTargetId);
    return `
      <div class="reveal-state"><span class="reveal-state__label">The Black Cat goes to</span><h2>${escapeHtml(target?.displayName)}</h2><p>${escapeHtml(target?.character)}</p></div>
      ${host ? `<button class="button button--primary button--wide" data-action="continue-from-dawn">Begin daytime play</button>` : `<p class="phase-hint">Place the physical Black Cat card, then wait for the coordinator.</p>`}
    `;
  }

  if (room.phase === PHASES.DAY) {
    if (!host) return `<div class="waiting-state waiting-state--day"><span class="sun-mark">I</span><h2>Daytime play continues at the table.</h2><p>The companion will wake when Conspiracy or Night is drawn.</p></div>`;
    return `
      <div class="phase-copy"><span class="section-kicker">Coordinator controls</span><h2>Day in Salem</h2><p>Use the physical cards as normal. Return here only for a state-changing event.</p></div>
      <div class="host-action-grid">
        <button data-action="start-conspiracy"><span>Conspiracy</span><small>Resolve the Black Cat reveal, then privately resync</small></button>
        <button data-action="start-night"><span>Begin Night ${room.night + 1}</span><small>Witches select a target</small></button>
        ${room.constableAvailable ? `<button data-action="reveal-constable"><span>Constable card revealed</span><small>Permanently disable future protection phases</small></button>` : ""}
        <button data-action="end-game"><span>End game</span><small>Close private actions and show recap</small></button>
      </div>
    `;
  }

  if (room.phase === PHASES.NIGHT_CONSTABLE) {
    const constable = me && me.alive && me.role.isConstable;
    if (!constable) return `<div class="waiting-state"><span class="waiting-orbit"></span><h2>Keep your eyes closed.</h2><p>The Constable is choosing silently.</p></div>`;
    return `
      <div class="phase-copy"><span class="section-kicker">Constable action</span><h2>Place the Gavel</h2><p>Protect one living player. You may not choose yourself.</p></div>
      ${targetGrid(room, { action: "submit-constable-target", excludeSelf: true })}
    `;
  }

  if (room.phase === PHASES.NIGHT_CONFESSION) {
    const seconds = confessionSeconds(room);
    if (!host) return `<div class="waiting-state"><span class="hourglass">${seconds}</span><h2>Open your eyes.</h2><p>${seconds ? "Anyone may confess by revealing one of their own Tryal cards before the timer ends." : "The confession window has closed. Wait for the coordinator to reveal the target."}</p></div>`;
    const resolutionDraft = state.resolutionDraft?.roomCode === room.code && state.resolutionDraft?.phaseVersion === room.phaseVersion ? state.resolutionDraft : null;
    return `
      <div class="phase-copy"><span class="hourglass">${seconds}</span><span class="section-kicker">Public resolution</span><h2>${seconds ? "Confession window" : "Confession window closed"}</h2><p>Do not reveal the target until the table has finished confessing.</p></div>
      <form id="resolve-night-form" class="secret-form">
        <label class="secret-choice"><input type="checkbox" name="confessed" ${resolutionDraft?.confessed ? "checked" : ""} /><span><b>The target confessed</b><small>They revealed one of their own Tryal cards in time.</small></span></label>
        <label class="secret-choice"><input type="checkbox" name="asylum" ${resolutionDraft?.asylum ? "checked" : ""} /><span><b>The target has Asylum</b><small>Confirm this from the physical card in front of them.</small></span></label>
        <button class="button button--primary button--wide" type="submit" ${seconds ? "disabled" : ""}>${seconds ? `Wait ${seconds} second${seconds === 1 ? "" : "s"}` : "Reveal and resolve the Night"}</button>
      </form>
    `;
  }

  if (room.phase === PHASES.NIGHT_RESOLUTION) {
    const target = findPlayer(room, room.publicTargetId);
    const saved = room.resolution?.survived;
    return `
      <div class="reveal-state ${saved ? "reveal-state--safe" : "reveal-state--death"}">
        <span class="reveal-state__label">The Witches chose</span>
        <h2>${escapeHtml(target?.displayName)}</h2>
        <p>${saved ? `Survived · ${escapeHtml(room.resolution.reason)}` : "Killed during the Night"}</p>
      </div>
      ${host ? `<button class="button button--primary button--wide" data-action="continue-from-night">Return to daytime play</button>` : `<p class="phase-hint">The coordinator will continue when the table is ready.</p>`}
    `;
  }

  if (room.phase === PHASES.ENDED) {
    const result = room.winner === "town" ? "The Town wins" : room.winner === "witches" ? "The Witches win" : "Game ended";
    return `
      <div class="reveal-state reveal-state--ended"><span class="reveal-state__label">The record closes</span><h2>${result}</h2><p>${room.night} Night${room.night === 1 ? "" : "s"} recorded</p></div>
      <button class="button button--quiet button--wide" data-action="leave-room">Return home</button>
    `;
  }

  return `<div class="waiting-state"><h2>${escapeHtml(PHASE_LABELS[room.phase])}</h2></div>`;
}

function gameTemplate() {
  const room = state.room;
  const me = currentPlayer();
  return `
    <section class="game-shell shell">
      <div class="room-header">
        <div><p class="eyebrow">${isHost() ? "Coordinator view" : me ? `Seat ${me.seat}` : "Observer view"}</p><h1>${escapeHtml(room.name)}</h1></div>
        <div class="room-header__actions">
          <button class="room-code" data-action="copy-room-link"><span>Room code</span><b>${escapeHtml(room.code)}</b></button>
          <button class="icon-button icon-button--large" aria-label="Leave room" data-action="leave-room">×</button>
        </div>
      </div>

      <div class="mode-banner"><span class="mode-dot"></span><b>Coordinator · ${escapeHtml(room.coordinatorName)}</b><span>${store.mode === "cloudflare" ? "Synced privately across phones. Screen lock, refresh, and ordinary exit keep this coordinator; choosing Forget transfers control." : "Stored only in this browser. Production uses the Cloudflare room service."}</span></div>
      ${setupSummary(room)}

      <div class="game-layout">
        <div class="game-main">
          <section class="panel phase-panel">
            <div class="phase-meta"><span>Phase ${room.phaseVersion}</span><span>${escapeHtml(phaseProgress(room))}</span></div>
            ${privatePanel(room)}
          </section>
          ${rosterTemplate(room)}
        </div>
        <aside class="side-rail">
          <section class="panel identity-panel">
            <span class="section-kicker">This device</span>
            ${me ? `
              <div class="identity"><span class="avatar avatar--${me.avatarTone}">${escapeHtml(initials(me.displayName))}</span><div><b>${escapeHtml(me.displayName)}</b><small>${escapeHtml(me.character || `Seat ${me.seat}`)}</small></div></div>
              ${me.role?.everWitch || me.role?.isConstable ? `<div class="private-badges">${me.role?.everWitch ? "<span>Witch</span>" : ""}${me.role?.isConstable ? "<span>Constable</span>" : ""}</div>` : `<p class="muted small">Private role indicators appear here after check-in.</p>`}
            ` : `<p class="muted">Neutral coordinator. This device has no player role.</p>`}
            ${store.mode === "cloudflare" ? `<button class="back-link forget-device" data-action="forget-device">${isHost() ? "Transfer coordinator & forget this room" : "Forget this room on this device"}</button>` : ""}
          </section>
          <section class="panel log-panel">
            <div class="panel-heading"><div><span class="section-kicker">Public record</span><h2>Tonight</h2></div></div>
            <ol class="event-log">
              ${room.events.length ? [...room.events].reverse().slice(0, 8).map((event) => `<li><span>${escapeHtml(event.label)}</span><time>${escapeHtml(event.detail)}</time></li>`).join("") : `<li class="event-log__empty">Nothing has been recorded yet.</li>`}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  `;
}

function render() {
  const activeCharacterInput = document.activeElement?.closest?.("[data-character-id]");
  const focus = activeCharacterInput && app.contains(activeCharacterInput) ? {
    playerId: activeCharacterInput.dataset.characterId,
    start: activeCharacterInput.selectionStart,
    end: activeCharacterInput.selectionEnd,
    direction: activeCharacterInput.selectionDirection,
  } : null;
  updateTopbar();
  if (state.view === "create") app.innerHTML = createTemplate();
  else if (state.view === "join") app.innerHTML = joinTemplate();
  else if (state.view === "game" && state.room) app.innerHTML = gameTemplate();
  else app.innerHTML = landingTemplate();
  if (focus) {
    const input = app.querySelector(`[data-character-id="${focus.playerId}"]`);
    if (input) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(focus.start, focus.end, focus.direction);
    }
  }
}

async function command(type, payload = {}) {
  try {
    state.room = await store.command(state.room.code, { type, payload, phaseVersion: state.room.phaseVersion });
    syncServerClock(state.room);
    render();
    return state.room;
  } catch (error) {
    toast(error.message, "danger");
  }
}

function addDraftPlayer(rawName) {
  const name = normalizeName(rawName);
  if (!name) return;
  if (state.draftPlayers.some((item) => item.toLowerCase() === name.toLowerCase())) return toast("That player is already on tonight's list.");
  if (state.draftPlayers.length >= 12) return toast("Salem supports at most 12 players.", "danger");
  state.draftPlayers.push(name);
  render();
}

app.addEventListener("click", async (event) => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;

  if (action === "show-create") {
    state.view = "create";
    state.draftPlayers = [];
    state.createDraft = { roomName: "A Night in Salem", hostName: "", hostIsPlaying: true, rememberPlayers: true };
    return render();
  }
  if (action === "show-join") { state.view = "join"; state.joinRoom = null; return render(); }
  if (action === "go-home") { state.view = "landing"; state.joinRoom = null; return render(); }
  if (action === "add-draft-player") return addDraftPlayer(document.querySelector("#new-player-name")?.value);
  if (action === "add-remembered") return addDraftPlayer(trigger.dataset.name);
  if (action === "remove-draft-player") { state.draftPlayers.splice(Number(trigger.dataset.index), 1); return render(); }
  if (action === "forget-player") { store.forgetPlayer(trigger.dataset.name); return render(); }

  if (action === "claim-seat") {
    const room = state.joinRoom;
    if (!room || room.phase !== PHASES.LOBBY) return toast("This room is no longer accepting seats.", "danger");
    const playerId = trigger.dataset.playerId;
    let updated;
    try { updated = await store.claimSeat(room.code, playerId); }
    catch (error) { return toast(error.message, "danger"); }
    store.rememberPlayers([findPlayer(updated, playerId)?.displayName]);
    return attachRoom(updated, { code: updated.code });
  }

  if (!state.room) return;
  const room = state.room;

  if (action === "copy-room-link") {
    const url = new URL(globalThis.location.href);
    url.search = "";
    url.searchParams.set("room", room.code);
    await navigator.clipboard?.writeText(url.toString());
    return toast("Invite link copied.");
  }
  if (action === "leave-room") {
    state.unsubscribe?.();
    store.setActiveRoom(null);
    state.room = null;
    state.view = "landing";
    const url = new URL(globalThis.location.href); url.search = ""; history.replaceState({}, "", url);
    return render();
  }
  if (action === "forget-device") {
    const warning = isHost()
      ? `Transfer coordinator control to the next joined player and forget ${room.name} on this device?`
      : `Forget ${room.name} on this device? Your seat will remain claimed until the coordinator releases it.`;
    if (!globalThis.confirm(warning)) return;
    try { await store.forgetRoom(room.code); }
    catch (error) { return toast(error.message, "danger"); }
    state.unsubscribe?.();
    store.setActiveRoom(null);
    state.room = null;
    state.view = "landing";
    const url = new URL(globalThis.location.href); url.search = ""; history.replaceState({}, "", url);
    toast("This room identity was removed from this device.");
    return render();
  }
  if (action === "release-seat" && isHost()) return command("release-seat", { playerId: trigger.dataset.playerId });
  if (action === "reveal-witch-card" && isHost()) return command("reveal-witch-card", { playerId: trigger.dataset.playerId });
  if (action === "record-death" && isHost()) return command("record-death", { playerId: trigger.dataset.playerId });
  if (action === "add-lobby-player" && isHost()) {
    const name = normalizeName(document.querySelector("#lobby-player-name")?.value);
    if (!name) return;
    store.rememberPlayers([name]);
    return command("add-player", { name }).then((updated) => { if (updated) { state.lobbyPlayerDraft = ""; render(); } });
  }
  if (action === "start-game" && isHost()) return command("start-game");
  if (action === "submit-witch-target") {
    return command("submit-witch-target", { targetPlayerId: trigger.dataset.targetId });
  }
  if (action === "submit-constable-target") return command("submit-constable-target", { targetPlayerId: trigger.dataset.targetId });
  if (action === "continue-from-dawn" && isHost()) return command("continue-dawn");
  if (action === "start-conspiracy" && isHost()) return command("start-conspiracy");
  if (action === "start-night" && isHost()) return command("start-night");
  if (action === "reveal-constable" && isHost()) return command("reveal-constable");
  if (action === "confirm-constable-absent" && isHost()) return command("confirm-constable-absent");
  if (action === "continue-from-night" && isHost()) return command("continue-night");
  if (action === "end-game" && isHost()) return command("end-game");
});

function queueCharacterSave(input, delay = 320) {
  const playerId = input.dataset.characterId;
  const value = normalizeName(input.value);
  characterDrafts.set(playerId, input.value);
  clearTimeout(characterSaveTimers.get(playerId));
  characterSaveTimers.set(playerId, setTimeout(async () => {
    characterSaveTimers.delete(playerId);
    if (!isHost() || state.room?.phase !== PHASES.LOBBY) return;
    const updated = await command("set-character", { playerId, character: value });
    if (updated && findPlayer(updated, playerId)?.character === value && normalizeName(characterDrafts.get(playerId)) === value) {
      characterDrafts.delete(playerId);
    }
  }, delay));
}

app.addEventListener("input", (event) => {
  const input = event.target.closest("[data-character-id]");
  if (input) queueCharacterSave(input);
  if (event.target.form?.id === "create-room-form" && event.target.name in state.createDraft) {
    state.createDraft[event.target.name] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  }
  if (event.target.form?.id === "role-sync-form") {
    const data = new FormData(event.target.form);
    state.roleDraft = {
      roomCode: state.room?.code,
      phaseVersion: state.room?.phaseVersion,
      witchCardCount: Number(data.get("witchCardCount")),
      hasConstable: data.get("hasConstable") === "on",
    };
  }
  if (event.target.form?.id === "resolve-night-form") {
    const data = new FormData(event.target.form);
    state.resolutionDraft = {
      roomCode: state.room?.code,
      phaseVersion: state.room?.phaseVersion,
      confessed: data.get("confessed") === "on",
      asylum: data.get("asylum") === "on",
    };
  }
  if (event.target.id === "lobby-player-name") state.lobbyPlayerDraft = event.target.value;
});

app.addEventListener("focusout", (event) => {
  const input = event.target.closest("[data-character-id]");
  if (input) queueCharacterSave(input, 0);
});

app.addEventListener("keydown", (event) => {
  const input = event.target.closest("[data-character-id]");
  if (input && event.key === "Enter") {
    event.preventDefault();
    input.blur();
  }
});

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);

  if (form.id === "create-room-form") {
    const hostName = normalizeName(data.get("hostName"));
    const hostIsPlaying = data.get("hostIsPlaying") === "on";
    const total = state.draftPlayers.length + (hostIsPlaying ? 1 : 0);
    if (total < 4 || total > 12) return toast("Choose between 4 and 12 total players.", "danger");
    if (state.draftPlayers.some((name) => name.toLowerCase() === hostName.toLowerCase())) return toast("Your name is already on tonight's list.", "danger");
    let room;
    try {
      room = await store.createRoom({ name: data.get("roomName"), hostName, hostIsPlaying, playerNames: state.draftPlayers });
    } catch (error) {
      return toast(error.message, "danger");
    }
    if (data.get("rememberPlayers") === "on") store.rememberPlayers(room.players.map((player) => player.displayName));
    return attachRoom(room, { code: room.code });
  }

  if (form.id === "find-room-form") {
    const code = String(data.get("roomCode") ?? "").trim().toUpperCase();
    let room;
    try {
      room = await store.resumeRoom(code);
      if (room) return attachRoom(room, { code });
      room = await store.findRoom(code);
    }
    catch (error) { return toast(error.message, "danger"); }
    if (!room) return toast("Room not found. Check the six-character code.", "danger");
    state.joinRoom = room;
    return render();
  }

  if (form.id === "role-sync-form") {
    const witchCardCount = Number(data.get("witchCardCount"));
    const hasConstable = data.get("hasConstable") === "on";
    return command("submit-role-sync", { witchCardCount, hasConstable });
  }

  if (form.id === "resolve-night-form" && isHost()) {
    const confessed = data.get("confessed") === "on";
    const asylum = data.get("asylum") === "on";
    return command("resolve-night", { confessed, asylum });
  }
});

async function init() {
  const urlCode = new URL(globalThis.location.href).searchParams.get("room")?.toUpperCase();
  const pointer = store.getActiveRoom();
  const code = urlCode || pointer?.code;
  if (code) {
    let room = null;
    try { room = await store.resumeRoom(code); }
    catch (error) { toast(error.message, "danger"); }
    if (room) {
      return attachRoom(room, pointer ?? { code });
    }
    try { room = await store.findRoom(code); }
    catch (error) { toast(error.message, "danger"); }
    if (room) { state.view = "join"; state.joinRoom = room; return render(); }
  }
  render();
}

setInterval(() => {
  if (state.room?.phase === PHASES.NIGHT_CONFESSION) render();
}, 1_000);

init();
