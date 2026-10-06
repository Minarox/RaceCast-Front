# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

RaceCast is a live-streaming dashboard that displays a real-time video/audio feed (and telemetry) from a race
car. Video/audio distribution is handled by LiveKit (WebRTC SFU); the site itself is an Astro app deployed as
a Cloudflare Worker.

## Commands

Package manager is **pnpm** (`packageManager: pnpm@11.5.0`).

```sh
pnpm install        # install dependencies
pnpm dev             # local dev server (localhost:4321)
pnpm check           # astro check (TypeScript + template diagnostics) — run before considering a task done
pnpm build           # astro build -> ./dist
pnpm preview         # astro build + wrangler dev (runs the Worker build locally)
pnpm deploy          # astro build + wrangler deploy (publishes to Cloudflare — do not run without asking)
pnpm cf-typegen      # regenerate worker-configuration.d.ts from wrangler.jsonc bindings/vars
```

There is no test suite and no lint script configured. CI (`.github/workflows/build.yml`) runs `pnpm check`
and `pnpm build` on every PR; `.github/workflows/secret.yml` runs TruffleHog verified-secret scanning on push.

Environment variables (see `.env.example`) are LiveKit connection settings: `LIVEKIT_TLS`, `LIVEKIT_DOMAIN`,
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_ROOM`, `LIVEKIT_PUBLISHER_IDENTITY`. In production these are
read via `cloudflare:workers` `env` (see `wrangler.jsonc` `vars` and Worker secrets), not `import.meta.env`.

## Architecture

**Stack**: Astro 6 (SSR/hybrid, `output` per-page via `export const prerender`), Vue 3 islands
(`@astrojs/vue`, hydrated with `client:*` directives), deployed via `@astrojs/cloudflare` adapter to a
Cloudflare Worker (static assets binding `ASSETS`, KV binding `STORE`).

**Path aliases** (`tsconfig.json`): `@assets/*`, `@components/*`, `@layouts/*`, `@pages/*`, `@types` →
`src/types.ts`.

### LiveKit connection and the global event bus

`src/components/LiveKit.astro` is mounted once in the base `Layout.astro` (i.e. on every page) and owns the
*single* LiveKit `Room` connection and its state (viewer count, camera/mic track publications, connection
status, room metadata). It never renders anything — it's pure connection logic that talks to the rest of the
app through **`document`-level `CustomEvent`s**, not props or a store. This pattern is the backbone of the
whole frontend:

- `src/types.ts` defines the `Event` enum (event names) and `State` enum (connection states), plus
  `dispatchEvent(event, data)` — a thin wrapper around `document.dispatchEvent(new CustomEvent(...))`.
- Any component that needs live data (`VideoPlayer.vue`, `AudioPlayer.vue`, `VideoGrid.vue`, `AudioGrid.vue`,
  `Info.vue`, `Metadata.vue`, `Settings.astro`, `OpenMap.vue`, etc.) adds a `document.addEventListener` for
  the relevant `Event` in `onMounted`/inline `<script>`, and removes it in `onBeforeUnmount`.
- Because Vue islands can mount *after* `LiveKit.astro` has already emitted its initial state, components
  dispatch `Event.RESEND` with the event name they missed (e.g. `dispatchEvent(Event.RESEND, Event.CAMERAS)`)
  on mount; `LiveKit.astro` listens for `Event.RESEND` and re-emits the current cached value. Follow this
  mount → resend → re-emit pattern when adding a component that needs live state.
- The LiveKit token itself is minted server-side via the Astro Action `getLiveKitToken` in
  `src/actions/index.ts` (creates the LiveKit room if missing, issues a subscribe-only token — `canPublish:
  false`). `getInfoBoxContent` reads free-text content from the `STORE` KV namespace. Add new server-only
  logic as Astro Actions here rather than API routes.
- Per-user UI preferences (sidebar position, which camera is "main", FSR upscaling, sidebar/map visibility,
  saved volumes) live in `localStorage` under the `settings` key, typed by `Settings` (`src/types.ts`,
  shaped by `src/assets/settings.json` as the default). Read with `getSettings()`; after writing, dispatch
  `Event.SETTINGS` so listeners re-sync (see `ControlCenter.astro`'s `checkSettings()` for the canonical
  pattern).

### Pages and layout composition

- `src/layouts/Layout.astro` — HTML shell, SEO/meta tags, font loading, mounts `LiveKit.astro` (always),
  `AudioTrigger.astro` (only if `audio` prop passed — handles browsers blocking autoplay until user
  interaction), `Loader.astro`, `Plausible.astro` (analytics).
- `src/layouts/ControlCenter.astro` — the collapsible sidebar UI shell (fullscreen toggle, settings button,
  sticky/open sidebar toggle); page content passed via `<slot>` becomes the sidebar body.
- Routes: `/` (main dashboard: video grid + sidebar with info/map/speed history/metadata), `/cam` and
  `/cam/[index]` (camera grid / single full camera view), `/mic` and `/mic/[index]` (microphone grid /
  single audio player), `/map` (standalone map), `/data` (standalone metadata view). `[index].astro` routes
  set `export const prerender = false` since they render a dynamic single track by index.

### Video pipeline / FSR upscaling

`src/components/VideoPlayer.vue` normally attaches a LiveKit `RemoteTrackPublication`'s `track` directly to
a `<video>` element. When FSR (AMD FidelityFX Super Resolution) is enabled in settings
(`src/assets/fsr.ts`, WebGL2-based), the pipeline changes: the LiveKit track is instead attached to a hidden
offscreen `<video>`, run through `FSRRenderer` onto a detached `<canvas>`, and `canvas.captureStream(30)` is
fed into the *visible* `<video>`'s `srcObject` — this keeps native fullscreen/controls/mobile playback
working on the visible element while the actual pixels are GPU-upscaled. `enableFSR`/`disableFSR` in
`VideoPlayer.vue` handle rewiring the track between the direct and FSR paths; if WebGL2 init fails, it rolls
back to direct attachment automatically. Follow this same re-attach-on-toggle structure if extending the
video processing pipeline.

### Telemetry / map

`Metadata.vue`, `Speed.vue`, `SpeedHistory.vue` render live car telemetry (GPS/modem/UPS data) delivered via
LiveKit room metadata (`RoomEvent.RoomMetadataChanged`, parsed JSON matching the `Metadata`/`Modem`/`UPS`
interfaces in `src/types.ts`) and re-broadcast as `Event.METADATA`. `OpenMap.vue` uses OpenLayers (`ol`) to
plot the car's GPS position from that same metadata stream.
