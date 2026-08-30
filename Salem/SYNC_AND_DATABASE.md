# Sync, Storage, Privacy, and Rejoin Design

## Outcome

Production uses a Cloudflare Worker with one SQLite-backed Durable Object per active room. The Durable Object is the sole authority for game phases, private role state, and actions. GitHub Pages serves the browser UI only.

The existing Supabase SQL under `database/` is retained as an unused fallback. Salem does not consume a Qook Supabase project.

## How devices synchronize

1. The coordinator creates a room through `POST /api/rooms`.
2. The Worker allocates a random six-character code and initializes its Durable Object.
3. Each phone opens the code, sees the public lobby, and claims one unclaimed name.
4. Claiming returns a 256-bit random reconnect token. The browser stores it locally; Cloudflare stores only its SHA-256 hash.
5. Every command includes the current `phaseVersion`. The Durable Object rejects stale commands.
6. The server validates role eligibility, living state, target validity, consensus, victory, and phase transitions.
7. The command response contains a viewer-specific snapshot.
8. Hibernating WebSockets send only an invalidation notice. Each phone then refetches its own authorized snapshot. A 30-second disconnected-only watchdog plus foreground/online refresh provides recovery if WebSockets are interrupted without consuming the free request allowance while the socket is healthy.

The event channel never broadcasts roles, individual Witch choices, tokens, or Constable protection.

## Refresh and rejoin

The browser keeps:

```text
active room code
opaque room token
remembered player-name templates
```

On refresh or a later visit from the same browser:

1. Read the active room code and token from `localStorage`.
2. Call the authorized snapshot endpoint.
3. Confirm that the credential still owns the coordinator/player identity.
4. Render the current phase and reconnect the invalidation channel.

No role or action stored in the page is trusted as authoritative.

If browser storage is cleared or the player moves to another phone, the coordinator explicitly releases the old seat in the lobby before it can be claimed again. Releasing a seat revokes that token. This is intentionally simpler than recovery PINs for the first in-person release.

## Remembered players

Remembered names are device-local templates, not room data. A template contains only:

- display name;
- avatar colour index;
- last-used time.

Characters, seats, alive/dead state, Witch history, Constable authority, and all actions always start fresh.

## Durable Object record

Each room stores one compact record:

```text
room
  public phase, phase version, night number, winner, expiry
  roster, characters, claimed actor IDs, alive/dead state
  private role state and latest role-sync submissions
  private phase actions
  public event log and resolved outcomes

credentials
  SHA-256(token) -> actor ID, coordinator flag, player ID

expiresAt
```

The record is written atomically after a validated command. Failed commands operate on a clone and cannot partially mutate the stored room.

## Viewer-specific snapshots

Every response is sanitized before leaving Cloudflare.

| Information | Unauthenticated lobby | Player device | Coordinator device | Durable Object |
| --- | --- | --- | --- | --- |
| Roster, characters, phase | Read | Read | Read | Read/write |
| Claimed/unclaimed indicator | Read | Read | Read | Read/write |
| Own role and submission | No | Read | Only if coordinator is playing | Read/write |
| Another player's role | No | No | No | Read/write |
| Own pending action | No | Read | Only if coordinator is acting as that player | Read/write |
| Individual Witch choices | No | No cross-player read | No | Aggregate |
| Constable target before resolution | No | No cross-player read | No | Read/write |
| Aggregate progress/public outcome | Read | Read | Read | Calculate |

Snapshots never contain `hostSessionId`, `claimedBy`, credential hashes, another player's `role`, or another player's action.

## Game invariants enforced server-side

- Setup supports 4–12 players and the official Tryal counts in `game-core.js`.
- Every seat must be claimed and assigned a character before play starts.
- Private role counts must equal the remaining unrevealed Witch-card count.
- Once a player has become a Witch, `everWitch` never returns to false—even if Conspiracy moves their Witch card.
- Current Witch-card counts can move after Conspiracy and determine later public reveals.
- Constable authority follows the current card after every valid role resync.
- A revealed/dead Constable disables the protection phase.
- Witches advance only after every living ever-Witch submits the same target.
- The current Constable cannot protect themselves.
- Town wins when every Witch card is revealed; Witches win when every living player has ever been a Witch.
- A stale device cannot act after the room's phase version advances.

## API surface

```text
POST /api/rooms
GET  /api/rooms/:code/lobby
POST /api/rooms/:code/claim
GET  /api/rooms/:code/snapshot
POST /api/rooms/:code/command
GET  /api/rooms/:code/events       WebSocket upgrade
```

Authorized HTTP requests use `Authorization: Bearer <token>`. WebSockets send the token as the second `Sec-WebSocket-Protocol` value so it does not appear in URLs or routine access logs.

The Worker accepts the production Salem origins plus localhost development origins. Other browser origins receive `403`.

## Expiry and cost control

Every successful mutation extends a room's expiry to 48 hours. A Durable Object alarm deletes the complete record and disconnects sockets after expiry. There is no permanent player account or historical role archive.

## Verification

- `game-core.test.mjs` covers official setup, Witch-card counts, transfers, revealed roles, and victory.
- `game-engine.test.mjs` covers snapshot secrecy, initial roles, new Witch/Constable changes after Conspiracy, missing Constable behavior, stale commands, and coordinator authorization.
- `worker-integration.mjs` exercises a real local Worker/Durable Object with four identities, duplicate claims, unauthorized snapshots, denied player coordinator commands, refresh snapshots, private-role isolation, and blocked CORS origins.
- Browser testing covers the responsive UI, independent seat claims, character assignment, role controls, and refresh recovery.
