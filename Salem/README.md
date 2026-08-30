# Salem Night Companion

This folder is the canonical home for the Salem Night Companion project. Product decisions, architecture notes, progress, application files, database definitions, and tests must stay inside this folder.

## Status

- Phase: production backend deployed and verified; GitHub Pages release in progress
- Browser application: `site/`
- Shared-room service: `worker/`
- Intended production URL: `https://akshaydivyanka.in/Salem/`
- Repository: `https://github.com/AkshayAD/wedding`
- Deployment: GitHub Actions builds `invitation-v2` and publishes its `dist` artifact to GitHub Pages

## Domain and HTTPS

The confirmed domain is `akshaydivyanka.in`, registered with GoDaddy and connected to GitHub Pages. HTTPS enforcement was enabled on the `AkshayAD/wedding` Pages site on 2026-08-29. See `CURRENT_SETUP.md` for the verified DNS, repository, workflow, and deployment path.

## Documents

- [PRODUCT_PLAN.md](PRODUCT_PLAN.md) - agreed product scope and game behaviour
- [CURRENT_SETUP.md](CURRENT_SETUP.md) - how the app fits the existing website and recommended architecture
- [PROGRESS.md](PROGRESS.md) - chronological progress and decisions
- [SYNC_AND_DATABASE.md](SYNC_AND_DATABASE.md) - cross-device sync, privacy, and reconnect design
- [STORAGE_OPTIONS.md](STORAGE_OPTIONS.md) - free-tier comparison and selected Cloudflare room-storage design

## Folder rules

1. Keep Salem-specific source, assets, schemas, tests, and documentation here.
2. Do not modify the existing homepage merely to implement Salem.
3. Keep deployable browser files under `site/` and use relative asset paths so the app works under `/Salem/`.
4. Do not put service-role keys, database passwords, or other secrets in this repository.
5. Treat physical Salem cards as the source of truth; the app is a night coordinator, not a complete digital replacement.

## Project layout

```text
Salem/
|-- site/
|   |-- index.html
|   |-- styles.css
|   |-- app.js
|   |-- config.example.js
|   `-- store.js
|-- worker/
|   |-- src/index.js
|   |-- wrangler.jsonc
|   `-- package.json
|-- database/
|   |-- schema.sql
|   |-- policies.sql
|   `-- functions.sql
|-- tests/
|-- README.md
|-- PRODUCT_PLAN.md
|-- CURRENT_SETUP.md
`-- PROGRESS.md
```

## Run the local preview

From `Salem/site/`, serve the folder with any static HTTP server, for example:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. Multiple tabs behave like separate player devices, refresh restores the same seat, and remembered-player templates persist in the browser. The create form preserves the coordinator's inputs while players are added.

The local preview deliberately labels itself. It is not secure cross-device multiplayer: its rooms exist only in one browser profile and its secret state can be inspected with developer tools.

## Test the shared-room service

```powershell
node --test Salem/tests/*.test.mjs
cd Salem/worker
npm install
npm run check
npm run dev -- --port 8787
```

With the local Worker running, execute `node Salem/tests/worker-integration.mjs` from the repository root.

## Production status

The free Cloudflare Worker and SQLite-backed Durable Objects are deployed at `https://salem-room-service.salem-room-service.workers.dev`. The production client configuration points to that origin, and both the live API security suite and a four-device Edge game flow pass. The GitHub Pages workflow is ready to publish `/Salem/`; the remaining release gate is the `main` push and live-domain verification.

The SQL under `database/` is preserved as the Supabase fallback. It is not the selected production path and has not been applied to the Qook project or any other Supabase project.
