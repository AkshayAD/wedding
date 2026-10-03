# Personal site

Production: https://akshaydivyanka.in, from `AkshayAD/wedding` on `main`.

Run `npm ci` and `npm run build` in this directory. The build packages the static
homepage, podcast page, MemoryWrapped and both Salem route spellings into `dist`.
Serve `dist` with any static HTTP server for production-equivalent local QA.
The GitHub Pages workflow deploys this same output; `/release.json` identifies
the exact source commit deployed.

- Homepage: `public/index.html`, shared styles: `public/personal.css`.
- Podcast: `public/ai-strategy-brief/index.html`. Episode metadata is a snapshot
  of the RSS feed on 3 October 2026. Update it when new full episodes are released.
  Trailer and full episodes are labeled separately. The verified Spotify show
  is `3x6x4HNZsBEdYBCrTYe35f`; the RSS still contains a different show ID.
  The feed repository is maintained separately and was not edited here.
  Listening uses verified Spotify links. The RSS media host responds to HTTP
  range requests but blocks cross-origin browser playback, so no unusable
  native audio players are shipped.
- MemoryWrapped: `public/hobby-projects/memorywrapped/index.html`. The original
  content and client-side generation are preserved. Assets use absolute paths;
  gallery, policy, partner and sample links use their established public
  `AkshayAD/memorywrapped-demo` GitHub Pages host. `/memorywrapped/` redirects
  here while retaining query and fragment.
- Salem: copied unchanged from `../Salem/site` to `/Salem/` and `/salem/`.

## Newsletter delivery blocker

The Saturday signup is deliberately disabled and visibly marked unavailable.
No submitted names or email addresses are collected. The approved destination
is `akshaydewalwar305@gmail.com`.

Local existing Apps Script source at
`D:/Projects/Diu Chat/memorywrapped/gas_intake.gs` handles only `action: "log"`
for MemoryWrapped orders. Its notifications label non-free submissions as paid
orders. A safe unsupported-action probe of the deployed endpoint returned
`{"success":false,"error":"Unknown action"}`. Connected Drive discovery found
no accessible Apps Script project. No credentials or OAuth scopes were added.

Enabling signup requires access to that existing deployed script project and a
dedicated newsletter handler with server-side name/email validation, explicit
consent, abuse controls and confirmed email delivery. Confirm structured success
acknowledgements in a browser on the production origin, keep input on error,
and verify a clearly labeled test email arrives at the approved Gmail address.
Never interpret an opaque response or completed fetch as delivery success.
