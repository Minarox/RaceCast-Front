# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RaceCast-Front is the public live viewer of a race car: cameras, microphones and telemetry published by
RaceCast-Emitter (Rust, on a Jetson in the car) to a LiveKit room over 5G. One page, for phones,
tablets and computers. The site only subscribes; it never publishes and has no control over the car.

**The contract with the car is `docs/PROTOCOL.md` in RaceCast-Emitter** (track sources and codecs, the
`main_camera` participant attribute, the room metadata document and its version `v`). Do not guess
around it: if the front needs something the protocol does not provide, ask for a protocol change
instead of inferring it. `src/lib/telemetry.ts` mirrors the metadata format.

Repository files (code, comments, docs, commits) are in English; the interface text is in French.

## Commands

pnpm, Node 24. `pnpm check` (astro check + vue-tsc, strictest TS) must pass before a task is done;
`pnpm build` then `pnpm start` runs the production server. There is no test suite. CI runs check and
build on pull requests. Deployment: `docker compose up -d --build` behind the operator's reverse proxy.

For local work without the car: `livekit-server --dev` plus the `lk` CLI as a fake car
(`lk --dev room join --identity car --publish x.ivf …`; `.ivf` may hold AV1; `lk` unpublishes a file
track when the file ends, and allows at most 3 `--publish`). Room metadata:
`lk --dev room update --metadata '…' racecast`. In dev, `window.racecastRoom` is the LiveKit Room.

## Architecture

Astro 7, `output: "server"`, `@astrojs/node` standalone. Server side is tiny:

- `src/pages/api/token.ts`: subscribe-only viewer tokens (identity `viewer-<uuid>`, not hidden so
  clients can count viewers), per-IP rate limit. The IP comes from `X-Forwarded-For`, which Astro only
  trusts when the Host matches `security.allowedDomains` (built from `SITE_URL`).
- `src/pages/index.astro`: reads runtime settings (car identity, map tiles) and passes them as props
  to the one client island, `LiveApp.vue` (`client:only="vue"`).

All settings go through `astro:env` and are declared `secret` so they are read at runtime, not inlined
at build; only `SITE_URL` is a build-time value. Never expose the LiveKit key/secret to the client.

### Client state (`src/lib/`)

- `live.ts` owns the single `Room` and a reactive `live` object. **LiveKit objects never enter Vue
  reactivity** (proxies break their private fields and emitters): the state holds plain descriptors
  keyed by track name, rebuilt by `sync()` on every room event; components get the real track with
  `videoTrack(name)`. Viewers vs car: `LIVEKIT_CAR_IDENTITY`, or else "the participant whose identity
  does not start with `viewer-`".
- Subscriptions are manual (`autoSubscribe: false`): microphones always; cameras only those the UI
  shows, set through `setWantedCameras()` from `LiveApp.vue` (all on desktop/tablet, the shown one on
  phone, none in audio-only mode or when AV1 cannot be decoded). There is no simulcast: each video is
  ~1.2 Mbit/s for the viewer.
- `mixer.ts`: Web Audio graph per microphone, track → analyser (pre-fader VU) → gain → master. Each
  track is also attached to a muted, unrendered `<audio>`: Chrome only feeds remote WebRTC audio into
  Web Audio while an element plays it. The AudioContext starts only from a user gesture
  (`enableSound()`); settings persist per microphone name.
- `history.ts`: ten-minute series for the sparklines and the session trail for the map, accumulated in
  the browser (the metadata only carries the current state). Raw arrays plus a `rev` counter.
- Car timestamps are converted with `localTime()` (`live.ts`), which corrects for the car/viewer clock
  offset measured on live metadata updates. Use it for every age or staleness computation.
- `layout.ts` picks one of four layouts from media queries (`desktop`, `tablet` portrait, `phone`
  portrait, `landscape` phone = full-screen video). It drives both CSS (`data-layout`) and which
  videos are subscribed, so keep both in mind when changing it.
- `view.ts`: which camera is in the big slot. The car's `main_camera` by default; a viewer pick wins
  until they pick the main camera again or press "Revenir à la principale".

### UI decisions (made with the user, 2026-10-05; ask before changing them)

Dark "nocturne" theme only (tokens in `src/styles/theme.css`, components never hardcode colours).
Desktop: big video + thumbnails + mixer on the left, map and telemetry column on the right, fitting the
screen. Phone/tablet portrait: video on top, tabs Carte / Son / Infos (tablet adds thumbnails).
Mixer: horizontal strips, volume + mute + VU meter, master; no solo, no pan. Sound is enabled by a
button over the video and in the header. Map: Leaflet (lazy-loaded), raster tiles darkened by a CSS
filter, auto-follow until dragged, session trail; no heading arrow. Telemetry thresholds are in
`levels` (`src/lib/telemetry.ts`). Car offline: banner with the age of the last data, greyed values.

The user wants to be asked (with mockups) before any new visual or functional choice.

### Icons

Inline Phosphor SVG paths generated into `src/assets/icons.ts` by `pnpm icons` (`scripts/icons.mjs`);
add a name to the script's list rather than editing the generated file.
