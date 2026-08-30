# Salem Night Companion - Progress Log

## 2026-08-29 - Product and integration planning

### Completed

- Confirmed the product as a focused Salem 1692 Night companion rather than a full game replacement.
- Chose the everyone-joins, role-limited interaction model.
- Defined setup, Opening Dawn, Conspiracy, Witch, Constable, confession, resolution, and alive/dead behaviour.
- Captured the agreed product plan in `PRODUCT_PLAN.md`.
- Identified `D:\Projects\Diu Chat\wedding-site` / `AkshayAD/wedding` as the repository that owns the custom domain.
- Created the canonical project directory at `wedding-site/Salem/`.
- Confirmed GoDaddy-managed DNS points the domain to GitHub Pages.
- Confirmed GitHub Actions builds `invitation-v2` and publishes only its `dist` artifact.
- Determined that Salem's deployable files must live under `Salem/site/` and be copied into `dist/Salem` by the existing workflow.
- Confirmed `akshaydivyanka.in` as the intended spelling.
- Diagnosed the insecure HTTP behaviour as disabled GitHub Pages HTTPS enforcement.
- Enabled HTTPS enforcement on the `AkshayAD/wedding` Pages site; GitHub now reports the canonical HTTPS URL.
- Refreshed the existing Pages deployment from unchanged `main` commit `65259e7` using successful Actions run `33234640695`.
- Verified apex HTTP now redirects to HTTPS, `www` reaches the HTTPS apex, and the existing MemoryWrapped homepage still returns `200` unchanged.
- Documented the proposed GitHub Pages frontend plus Supabase Auth/Postgres/Realtime architecture.
- Left the existing homepage, build workflow, and unrelated `DEPRECATED.md` unchanged.

### Current decisions

- Production path: `/Salem/`
- Frontend delivery: current GitHub Pages static site
- Deployable source: `Salem/site/`, copied to `invitation-v2/dist/Salem` during the workflow
- Initial frontend style: framework-free, isolated HTML/CSS/JavaScript
- Shared-state recommendation: Supabase
- Player identity: temporary anonymous sign-in; no permanent account
- Room links: query parameter (`/Salem/?room=ABC123`)
- Physical cards remain authoritative

### Unresolved before implementation

- Decide whether a neutral-Moderator, single-device mode is required for the first release.
- Decide whether to use Town Hall character artwork or text-only character names.
- Approve Supabase as the backend provider before provisioning it.

### Next proposed milestone

Create a local, responsive, clickable prototype under `Salem/site/` using fixture data only. Verify the coordinator console and private player screens at 4, 7, and 12 players before creating backend resources.

## 2026-08-29 - Local playable page and sync contract

### Completed

- Built a modern, minimalist Salem-themed page under `Salem/site/` with landing, create/join, lobby, private role check-in, Opening Dawn, day, Conspiracy, Night, Constable, confession, resolution, and recap states.
- Added official 4–12 player Tryal setup counts and player-to-character mapping.
- Added optional remembered-player templates. Names persist; characters, seats, life state, and roles reset for each game.
- Added a refresh-safe local session pointer and seat ownership. Refresh returns to the same player and current phase.
- Added same-browser multi-tab synchronization with `BroadcastChannel` and locked `localStorage` mutations for realistic local testing.
- Verified a four-tab game flow: claims synchronize live, a refreshed player reclaims the same seat, private role actions appear only on eligible tabs, the Witch target advances to the Constable, and Night resolves correctly.
- Verified Conspiracy can add a new Witch permanently and move Constable authority while the original Witch remains on the Witch team.
- Corrected role sync to count Witch cards rather than Witch holders, including the valid case where one player has both Witch cards.
- Added public Witch-card reveal/death handling, removal of a revealed/dead Constable, Town/Witch victory detection, and six passing rules tests.
- Added the Supabase schema, RLS policies, initial room/join/snapshot functions, and the production sync/rejoin contract.
- Confirmed the local preview is clearly labelled and cannot silently present itself as secure cross-device multiplayer.

### Verification

- `node --check` passes for `app.js`, `store.js`, and `game-core.js`.
- `node --test Salem/tests/game-core.test.mjs` passes 6/6 tests.
- Browser flow tested with four independent tabs through one full Night and a Conspiracy role transfer.
- Desktop visual review completed; CSS includes single-column breakpoints at 900px and 680px and reduced-motion support.

### Production blocker

No Supabase project or browser credentials exist yet. The checked-in SQL is a contract and safe starting point, not an applied backend. Transactional phase/action RPCs and their authorization deny-path tests remain required before real phones can share a room securely.

The page has intentionally not been added to the GitHub Pages deployment artifact. Publishing the local adapter now would fail the user's cross-device expectation.

### Next milestone

Provision/approve Supabase, finish and test the transactional mutation functions, add the production adapter, run a multi-browser security test, then add the narrow workflow copy step for `/Salem/`.

## 2026-08-29 - Cloudflare production implementation

### Decision

- Selected a Cloudflare Worker with one SQLite-backed Durable Object per room instead of consuming another Supabase project.
- Kept remembered names in the coordinator browser and preserved `database/` only as an unused Supabase fallback.
- Set room expiry to 48 hours with Durable Object alarms.

### Completed

- Added the `SalemRoom` Durable Object, Worker API router, CORS boundary, 256-bit reconnect tokens, server-side SHA-256 credential storage, automatic expiry, and hibernating WebSocket invalidations.
- Moved every phase change and secret action into a server-validatable command engine.
- Added viewer-specific snapshots that omit other players' roles/actions, coordinator actor IDs, seat actor IDs, and token hashes.
- Added the production Cloudflare browser adapter with create, find, claim, resume, command, WebSocket invalidation, polling fallback, and same-browser remembered names.
- Preserved a clearly labelled local-preview adapter for development.
- Added permanent-Witch/current-card separation, moving Constable authority, missing-Constable night flow, stale phase rejection, and host-only command enforcement.
- Fixed the create form so coordinator fields survive rerenders while names are added.
- Added the narrow GitHub Pages workflow step that copies only `Salem/site/` into `dist/Salem/`.
- Updated the architecture and sync documents from the abandoned Supabase production plan to the implemented Cloudflare design.

### Verification

- `node --test Salem/tests/*.test.mjs`: 11/11 rule, transition, authorization, and privacy tests pass.
- `npm run check` in `Salem/worker/`: Wrangler bundles the Worker and SQLite Durable Object migration successfully.
- `node Salem/tests/worker-integration.mjs` against local Wrangler: room creation, four identities, WebSocket invalidation, duplicate-claim rejection, released-token revocation/reclaim, unauthorized snapshot rejection, denied player host command, refresh snapshots, role isolation, and CORS denial pass.
- Edge local browser: four independent tabs claimed four seats; the coordinator saw all claims live; a player refresh restored the same seat and phase.

### Release handoff

Cloudflare authorization, Worker deployment, production configuration, and live-backend QA are recorded in the next entry. GitHub Pages publication and live-domain verification remained at this point.

## 2026-08-30 - Cloudflare deployment and live-backend QA

### Completed

- Authorized the official Wrangler application after explicit approval, with no payment prompt or paid resource.
- Deployed Worker version `a84981da-2782-48b8-b9cc-e42916493ae1` to `https://salem-room-service.salem-room-service.workers.dev` with the `ROOMS` Durable Object binding and SQLite migration.
- Waited for first-use DNS/TLS provisioning and verified the production origin over HTTPS.
- Ran `worker-integration.mjs` against the deployed Worker successfully, including WebSocket invalidation, four credentials, token revocation, denied actions, reconnect snapshots, role isolation, and blocked foreign origins.
- Tested the real frontend against the deployed Worker from four isolated localhost origins in Edge.
- Verified live room creation, four independent claims, realtime roster updates, refresh/rejoin, coordinator-only controls, role isolation, Opening Dawn, Witch targeting, Constable targeting, confession, Asylum resolution, and return to Day.
- Found and fixed a production-only form race where a poll or WebSocket refresh could wipe an unsaved role/Constable choice. Role, Night-resolution, lobby-player, and character drafts now survive background synchronization.
- Repeated the affected flow and confirmed unsaved role and resolution choices survive a poll interval before submission.
- Set `site/config.js` to production Cloudflare mode and added cache-busting for the public configuration and revised application module.

### Remaining release steps

- Commit and push the Salem implementation plus the narrow Pages workflow update.
- Wait for the GitHub Pages deployment and verify the existing homepage and live `/Salem/` page over HTTPS.

## 2026-08-30 - Independent release hardening

- Fixed the clean-checkout Pages workflow so it no longer copies an untracked empty assets directory.
- Hid the Witch target through the Constable and confession phases; it becomes public only at the resolution screen.
- Made Witch progress role-neutral for observers so the number of living Witches is not disclosed.
- Added a synchronized 30-second confession countdown that survives refresh and is enforced by the server.
- Added a coordinator recovery when every player confirms the Constable card was already revealed during Conspiracy, while keeping that reveal permanent.
- Added an explicit device-forget control without weakening automatic refresh/rejoin.
- Switched routine sync to WebSocket-first operation with a 30-second poll only while disconnected, and serialized refreshes to prevent stale snapshots from replacing newer state.
- Added strict request and name limits plus a free Durable Object creation limiter of eight rooms per network per hour.
- Deployed hardened Worker version `adc4d897-004a-4efb-af11-cc4c07d15c68` and passed the live integration suite in room `YUVP99`.
- Expanded the rule/privacy suite to 14 passing tests, covering every 4-12 player setup row, Night-target secrecy, timer enforcement, role-neutral progress, and missing-Constable recovery.
