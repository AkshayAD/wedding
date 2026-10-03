# Personal site

Production: https://akshaydivyanka.in, from `AkshayAD/wedding` on `main`.

Run `npm ci` and `npm run build` in this directory. The build packages the static
homepage, podcast page, MemoryWrapped and both Salem route spellings into `dist`.
Serve `dist` with any static HTTP server for production-equivalent local QA.
The GitHub Pages workflow deploys this same output; `/release.json` identifies
the exact source commit deployed.

- Homepage: `public/index.html`, shared light styles: `public/editorial.css`.
  `public/personal.js` adds progressive scroll reveals and a podcast feed-copy
  option. Reduced motion is respected; reading content works without JavaScript.
- Blog: `public/blog/index.html`; Episode 1 companion at
  `public/blog/the-governance-flip/index.html`. Charts cite BCG's September 2026
  Applied AI Index, McKinsey's August 2026 survey, and Guild.ai/Morning Consult's
  August 2026 fieldwork. Agent incident framework cites the original paper.
  Findings, derived remainders, survey caveats, and editorial interpretation are
  labeled separately. This is companion analysis, not a transcript.
- Podcast: `public/ai-strategy-brief/index.html`. Episode metadata is a snapshot
  of the RSS feed on 3 October 2026. Update it when new full episodes are released.
  Trailer and full episodes are labeled separately. The verified Spotify show
  is `3x6x4HNZsBEdYBCrTYe35f`. The latest feed commit `7c8d584` already corrected
  both channel/image Spotify links, so no additional feed changes were needed.
  Spotify is the primary listening option; RSS is explained under an optional
  "Use a different podcast app?" disclosure.
  Listening uses verified Spotify links. The RSS media host responds to HTTP
  range requests but blocks cross-origin browser playback, so no unusable
  native audio players are shipped.
- MemoryWrapped: `public/hobby-projects/memorywrapped/index.html`. The original
  content and client-side generation are preserved. Assets use absolute paths;
  gallery, policy, partner and sample links use their established public
  `AkshayAD/memorywrapped-demo` GitHub Pages host. `/memorywrapped/` redirects
  here while retaining query and fragment. The brand returns to the homepage's
  projects section, including on mobile where the wider navigation is hidden.
- Salem: copied from `../Salem/site` to `/Salem/` and `/salem/`.
  Both dark project pages retain their original styles and scripts; their only
  new dependency is `public/project-transition.css`. Native view transitions
  progressively enhance navigation between the light site and dark projects.

## Newsletter delivery blocker

The Saturday newsletter has a clear coming-soon state, with no inactive form
that looks ready to accept submissions. Spotify following is explicitly
distinguished from email registration.
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

## Adding writing and episodes

Add a static article at `public/blog/<slug>/index.html`, with a canonical URL,
title, description, source links, and the shared editorial CSS and script.
Add its card to the blog index and feature it on the homepage as appropriate.
For a podcast companion, link it from the episode's notes. Verify the audio,
episode date, runtime, source editions, denominators, and chapter labels before
publishing charts. Distinguish full episodes from trailers and keep the exact
AI-generation disclosure. No publishing system or paid service is required.
