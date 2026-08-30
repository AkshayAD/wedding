# Free Storage Decision for Salem

Checked on: 2026-08-29

## Decision

Use a Cloudflare Worker with one SQLite-backed Durable Object per active Salem room.

Keep remembered-player names in the coordinator browser's `localStorage`; they are convenience templates, not shared game state. Keep the existing Supabase SQL as a documented fallback, but do not provision or mix Salem data into the Qook project.

This is the best fit because a Durable Object is both the trusted coordinator and the durable room store. It serializes concurrent actions, can keep player phones synchronized with hibernating WebSockets, wakes automatically after inactivity, and does not need a second database or authentication service.

## Options considered

| Option | Current free allowance | Fit for Salem | Decision |
| --- | --- | --- | --- |
| Cloudflare Worker + Durable Object | 100,000 Worker/DO requests per day; SQLite storage includes 5 million rows read/day, 100,000 rows written/day, and 5 GB total | Trusted server logic, strongly consistent room storage, WebSockets, alarms, no inactivity pause | **Selected** |
| Separate Supabase project | Two active Free projects total; 500 MB database per project, 200 peak Realtime connections, 2 million Realtime messages/month, 500,000 Edge Function calls | Easiest reuse of the existing SQL/Auth design, but a low-activity project may pause after a week | Good fallback |
| Firebase Spark + Firestore | 1 GiB, 50,000 reads/day, 20,000 writes/day, 10 GiB egress/month | Excellent client sync, but trusted Cloud Functions require the Blaze billing plan | Rejected for a strict no-billing setup |
| Turso | 5 GB, 500 million rows read/month, 10 million rows written/month | Generous SQL storage, but still needs a Worker/auth layer and a realtime channel | More moving parts than Durable Objects |
| Browser storage only | Effectively free for this data size | Refresh works on one browser; no secure cross-device room | Local preview only |

Official references:

- [Cloudflare Workers and Durable Objects pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Durable Objects on the Free plan](https://developers.cloudflare.com/changelog/post/2025-04-07-durable-objects-free-tier/)
- [Cloudflare hibernating WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Cloudflare SQLite-backed Durable Object storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Supabase billing and two free projects](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Firebase Firestore free quota](https://firebase.google.com/docs/firestore/pricing)
- [Firebase pricing-plan limitations](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Turso pricing](https://turso.tech/pricing)

## Production room model

Each six-character room code maps deterministically to one Durable Object instance. That instance owns the complete state for one game:

```text
room
  public
    name, code, phase, phaseVersion, Night number, expiry
    roster, characters, alive/dead state
    public outcomes and event log
  private
    hashed coordinator/player session tokens
    ever-Witch status and current Witch-card count
    current Constable authority
    role-check submissions
    individual Witch and Constable selections
```

The first implementation should store this as one compact versioned state document in the Durable Object's strongly consistent storage. The room has at most 12 players and lives for roughly one day, so normalized global tables add complexity without practical benefit. SQLite tables can be introduced later only if querying room history becomes a real requirement.

## Identity and refresh recovery

No permanent account is required.

1. The Worker creates a cryptographically random coordinator token when the room is created.
2. Claiming a seat returns a separate random player token.
3. Only token hashes are stored in the Durable Object.
4. The browser stores its token, room code, and player ID locally.
5. Refresh reconnects with that token and receives a newly authorized snapshot.
6. Clearing browser storage loses the token. The coordinator must release that seat before a new device can claim it.

The room code discovers a room; it never authorizes private data.

## Synchronization

- Each connected phone opens a hibernating WebSocket to its room object.
- The socket authenticates with the player's room token.
- A successful mutation increments `phaseVersion`, persists the state atomically, and broadcasts only an invalidation/version message.
- Every phone refetches a sanitized snapshot. It never trusts secret state from a broadcast payload.
- If the socket disconnects, the client reconnects with backoff and performs a snapshot refresh.
- A stale mutation carrying an older `phaseVersion` is rejected.

This preserves the existing Supabase design principle: notifications say that state changed; the authorized snapshot determines what that device may see.

## Secret-state boundary

The Durable Object returns:

- the same public roster/phase/event data to every member;
- only the requesting player's private role indicators and pending action;
- aggregate progress such as `2 of 3 Witch choices received`;
- all individual secret submissions only to its own server-side mutation code.

The coordinator can advance public phases but cannot request another player's private role or vote.

## Remembered players

Remembered names remain on the coordinator's browser under the existing `salem.rememberedPlayers.v1` key.

This is intentional:

- names are useful only on the device that normally creates games;
- they do not need realtime synchronization;
- no account is required;
- characters and all role state still reset for every room.

Cross-device roster backup can be added later with an encrypted coordinator profile object, but it is not needed for the first release.

## Expiry and storage use

- A room schedules an alarm for 24 hours after creation.
- Ending a game may shorten the remaining retention window after the recap is no longer needed.
- The alarm closes sockets and deletes the room's stored state.
- No permanent game history is kept by default.

At this scale, storage is negligible. The more relevant free-tier limit is request/message count, so the client should use WebSocket invalidations rather than one- or two-second polling.

## Deployment boundary

The existing GitHub Pages site continues to serve `/Salem/`. It calls a narrowly scoped `workers.dev` API endpoint over HTTPS. The Worker allows only the live Salem origin plus explicitly configured local-development origins.

No GoDaddy DNS change is required. A custom API subdomain can be added later, but it is not necessary for the MVP.

## Implementation acceptance criteria

1. Two simultaneous claims for one seat cannot both succeed.
2. A room token can read only its own private role state.
3. A coordinator token cannot read player secrets.
4. Witch consensus and phase advancement happen atomically.
5. Refresh restores the same player from the stored token.
6. WebSocket reconnect always refetches an authorized snapshot.
7. Expired rooms delete their state.
8. The frontend never silently falls back to local preview on the live domain.
