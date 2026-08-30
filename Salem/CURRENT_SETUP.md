# Current Website Setup and Salem Integration

## Confirmed production path

- Domain: `https://akshaydivyanka.in`
- Registrar and DNS manager: GoDaddy
- Source repository: `AkshayAD/wedding`
- Static host: GitHub Pages
- Build workflow: `.github/workflows/deploy.yml`
- Salem URL: `https://akshaydivyanka.in/Salem/`
- Salem source: `Salem/site/`
- Salem shared-room backend: Cloudflare Worker with SQLite-backed Durable Objects
- Worker origin: `https://salem-room-service.salem-room-service.workers.dev`
- Deployed Worker version: `adc4d897-004a-4efb-af11-cc4c07d15c68`

HTTPS enforcement was enabled for the existing GitHub Pages site on 2026-08-29. The apex HTTP URL redirects to HTTPS, `www` reaches the HTTPS apex, and the MemoryWrapped homepage remains the root page.

## Deployment layout

The existing workflow builds `invitation-v2`, preserves its MemoryWrapped root page, then copies only browser-ready files from `Salem/site/` into `invitation-v2/dist/Salem/`.

```text
GitHub repository
|-- invitation-v2/          existing root site
|-- Salem/
|   |-- site/               copied to the public /Salem/ folder
|   |-- worker/             deployed separately to Cloudflare
|   |-- tests/              repository only
|   |-- database/           Supabase fallback, repository only
|   `-- *.md                repository only
`-- .github/workflows/deploy.yml
```

The relative asset paths in `Salem/site/index.html` make the page safe under `/Salem/`. Room links use `/Salem/?room=ABC123`, so a refresh remains a valid GitHub Pages file request instead of relying on server-side routing.

## Runtime architecture

```text
Player phones
    |
    | HTTPS page and static assets
    v
GitHub Pages: akshaydivyanka.in/Salem/
    |
    | authorized commands + viewer-specific snapshots
    v
Cloudflare Worker: salem-room-service
    |
    `-- one SQLite-backed Durable Object per room code
```

GitHub Pages remains responsible only for HTML, CSS, and JavaScript. Cloudflare owns writable room state, authorization, server-validated phase transitions, realtime invalidations, and automatic expiry.

No Cloudflare secret is placed in the browser. `site/config.js` contains only the public Worker HTTPS base URL after deployment. Each device receives an opaque random reconnect token; only its SHA-256 hash is stored with the room.

## Production data boundary

- Public: room name/code, phase, characters, living roster, claimed-seat status, aggregate progress, and public events.
- Private to one device: that player's role submission, permanent Witch membership, current Witch-card count, current Constable authority, and pending target.
- Server only: other players' private roles/actions, raw device credentials, Witch consensus inputs, and Constable target before resolution.
- Coordinator: phase controls and public corrections, but no special access to other players' secret roles.

Remembered names remain in the coordinator browser's `localStorage`. They are reusable templates only; roles, characters, seats, and life state reset for every room.

## Free-tier resources

The production backend needs one Cloudflare Worker, a `ROOMS` Durable Object binding for game state, and a `CREATION_LIMITER` Durable Object binding that allows eight new rooms per network per hour. Rooms extend their expiry on each mutation and are automatically deleted after 48 hours. The client uses WebSocket invalidations while connected and a 30-second poll only while the socket is unavailable.

The expected usage for an in-person friend game is far below the Workers/Durable Objects free allowances documented in `STORAGE_OPTIONS.md`. No paid database or existing Qook Supabase project is required.

## Release procedure

1. Authorize Wrangler against the intended Cloudflare account.
2. Run `npm run deploy` from `Salem/worker/`.
3. Put the returned `workers.dev` HTTPS origin in `Salem/site/config.js` with `mode: "cloudflare"`.
4. Run the rule tests, local Worker integration test, and browser flow.
5. Commit and push the Salem folder plus workflow change to `main`.
6. Confirm the GitHub Pages Actions run succeeds.
7. Verify the existing homepage, `/Salem/`, refresh/rejoin, cross-device sync, CORS, and role privacy on production.

Do not point the live page at `local-preview`. Production must fail visibly if the room service is unavailable; it must never silently downgrade to browser-only rooms.
