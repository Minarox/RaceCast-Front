# RaceCast-Front

Live web viewer for [RaceCast](https://github.com/Minarox/RaceCast-Emitter): the cameras, microphones and
telemetry of a race car, published by RaceCast-Emitter to a LiveKit room over 5G.

One page, for phones, tablets and computers:

- **Video**: every camera of the car, the main one large; the others as thumbnails (computer, tablet)
  or one swipe away (phone). A phone on its side shows the video full screen.
- **Sound**: a mixer with a volume, a mute button and a level meter per microphone, plus a master
  volume. Settings are remembered per microphone.
- **Map**: the car's position on OpenStreetMap, followed automatically, with the trail since the page
  was opened.
- **Telemetry**: network (5G), battery and Jetson health with ten-minute curves, and the state of the
  car (recording, devices). Values turn amber or red past thresholds.

The site is a pure viewer: it subscribes to the room and never publishes. The interface is in French.

## How it works

- The car publishes AV1 video and Opus audio tracks to the LiveKit room, and its telemetry as the
  room metadata. The contract is [`docs/PROTOCOL.md`](https://github.com/Minarox/RaceCast-Emitter/blob/main/docs/PROTOCOL.md)
  in RaceCast-Emitter.
- The server side of this site only issues viewer tokens (`GET /api/token`): subscribe-only, valid
  two hours, rate-limited per IP. The LiveKit key and secret never reach the browser.
- The browser receives only what it shows: one video on a phone, all of them on a computer or tablet,
  none in audio-only mode. Each video costs about 1.2 Mbit/s.

### Browser support

The video is AV1: Chrome, Edge and Firefox play it; Safari only on hardware with an AV1 decoder
(iPhone 15 Pro and later, Macs with an M3 or later). Elsewhere the page says so and keeps the sound,
map and telemetry.

## Development

Requires Node 24 and pnpm.

```sh
pnpm install
cp .env.example .env   # fill in the LiveKit settings
pnpm dev               # http://localhost:4321
pnpm check             # astro check + vue-tsc: run before considering a change done
pnpm build             # production build into ./dist
pnpm start             # run the built server
pnpm icons             # regenerate src/assets/icons.ts from @iconify-json/ph
```

Without the car, run a local server with `livekit-server --dev` and publish test tracks with the
[`lk` CLI](https://github.com/livekit/livekit-cli), e.g.
`lk --dev room join --identity car --publish cam-front.ivf --publish mic-driver.ogg racecast`
(`.ivf` files may hold AV1). Room metadata can be set with `lk --dev room update --metadata '…' racecast`.

## Configuration

All settings are environment variables, read at **runtime** (see `.env.example`), except `SITE_URL`
which is read at build time:

| Variable | Default | Purpose |
|---|---|---|
| `LIVEKIT_URL` | | LiveKit server, e.g. `wss://live.example.com` |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | | Used to sign viewer tokens |
| `LIVEKIT_ROOM` | `racecast` | Room of the car |
| `LIVEKIT_CAR_IDENTITY` | empty | Identity of the car's participant; empty = the participant that is not a viewer |
| `TILE_URL`, `TILE_ATTRIBUTION`, `TILE_MAX_ZOOM` | OpenStreetMap | Raster tiles of the map |
| `TILE_DARKEN` | `true` | Invert light tiles to fit the dark theme |
| `SITE_URL` | `https://racecast.minarox.fr` | Public origin (build time) |
| `PORT` | `4321` | Port of the Node server |

The default tiles come from the OpenStreetMap Foundation's server, whose
[usage policy](https://operations.osmfoundation.org/policies/tiles/) asks for moderate use. Point
`TILE_URL` to another provider for heavy traffic.

## Deployment

```sh
cp .env.example .env      # fill it in
docker compose up -d --build
```

The container listens on `127.0.0.1:4321`; put it behind the reverse proxy that terminates TLS. The
token endpoint's rate limit uses the visitor IP from `X-Forwarded-For`, which is trusted only when the
request's `Host` (or `X-Forwarded-Host`) is the `SITE_URL` host: have the proxy keep the original
`Host` and set `X-Forwarded-For`.

## Licence

AGPL-3.0-only.
