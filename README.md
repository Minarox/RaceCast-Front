# RaceCast-Front

This site is the live viewer of a race car. It shows what
[RaceCast-Emitter](https://github.com/Minarox/RaceCast-Emitter) publishes from the car to a
[LiveKit](https://livekit.io) room over 5G: the cameras, the microphones and the telemetry (GPS, 5G modem,
battery, system state).

- It shows **every camera**, the car's main one large, and lets the viewer **mix the microphones**.
- It puts the car **on a map** and shows its **telemetry** with short history curves and alert colours.

It is one page, for phones, tablets and computers, in French. It only watches: it subscribes to the room,
never publishes, and has no control over the car. The car dropping out of 5G coverage is a normal event,
not an error.

> [!WARNING]
> **This site only makes sense with the car.** It is written for RaceCast-Emitter and nothing else:
>
> - **Contract**: it expects the tracks, the participant attribute and the room metadata (format `v: 1`)
>   described in the emitter's [`docs/PROTOCOL.md`](https://github.com/Minarox/RaceCast-Emitter/blob/main/docs/PROTOCOL.md).
>   Another publisher shows up only as far as it follows that contract.
> - **Video**: the car publishes **AV1 only**, a choice made for quality on a weak uplink. Browsers without
>   an AV1 decoder get a clear message instead of the video, and keep the sound, map and telemetry.
>
> Without the car in the room, the page shows the last known state kept in the room metadata, or waits.

## Stack

| Part | Choice | Used for |
|---|---|---|
| Server | **Node 24**, [Astro 7](https://astro.build) rendered on demand with `@astrojs/node` (standalone) | the page, and the viewer token endpoint |
| Client | **Vue 3** island (`client:only`), TypeScript (strictest) | everything live |
| Live media | [`livekit-client`](https://github.com/livekit/client-sdk-js) | room connection, tracks, metadata |
| Tokens | [`livekit-server-sdk`](https://github.com/livekit/node-sdks) | subscribe-only viewer tokens, signed on the server |
| Sound | Web Audio API | mixer and level meters |
| Map | [Leaflet](https://leafletjs.com), raster tiles ([OpenStreetMap](https://www.openstreetmap.org) by default) | position and trail |
| Deployment | Docker image, behind the operator's reverse proxy | hosting |

Browser support depends on AV1 decoding:

| Browser | Video |
|---|---|
| Chrome, Edge, Firefox (desktop and Android) | yes |
| Safari (macOS, iOS, iPadOS) | only on hardware with an AV1 decoder: iPhone 15 Pro and later, Macs with an M3 or later |
| Anything else | the page detects it (`RTCRtpReceiver.getCapabilities`) and says so; sound, map and telemetry still work |

## Features

### Video

- **Built from the tracks present**, never from a list of names: cameras appear and disappear with the
  car's devices and connection, without reloading the page.
- **Main camera** (the car's `main_camera` attribute) **large by default**. Tapping another camera puts it
  in its place, and "Revenir à la principale" goes back. If the car designates another main camera, the
  page follows, unless the viewer picked one.
- Portrait cameras (rotated by 90°) keep their aspect ratio.
- Full-screen button wherever the browser allows it. iPhones do not; there, turning the phone gives the
  full-screen video.

### Layouts

| Screen | Layout |
|---|---|
| Computer, tablet in landscape | large video and thumbnails on the whole left side; on the right, map, telemetry, and the sound dock. Fits the screen, only the telemetry column scrolls |
| Tablet in portrait | video on top with thumbnails, then tabs **Carte / Son / Infos** |
| Phone in portrait | video on top (swipe or arrows to change camera), then the same tabs |
| Phone in landscape | full-screen video; camera name and a status strip (live, speed, signal, battery) hide after 4 s and come back on a tap |

### Sound

- One **Opus track per microphone**, mixed in the browser through the Web Audio API.
- Per microphone: **volume, mute and a level meter**. The meter reads before the fader, so a muted
  microphone still shows what it picks up. Plus a **master volume** and mute.
- **Settings are remembered** per microphone name, in the browser.
- Browsers only play sound after a gesture: an **"Activer le son"** button sits on the video and in the
  header until then.
- On desktop, the mixer is folded into a **dock** at the bottom of the right column (small level meters
  and the master speaker). It unfolds over the telemetry and folds back on Escape or a click elsewhere.

### Data use

- Each video costs the viewer about **1.2 Mbit/s**, and the car sends a single layer (no simulcast), so
  **only the videos on screen are received**: every camera on desktop and tablet, the one shown on a
  phone.
- **"Audio seul"** mode in the header: no video at all, remembered in the browser.
- Videos pause while the tab is in the background (LiveKit adaptive stream).
- Microphones are always received (64 kbit/s each).

### Map

- **Leaflet**, loaded only with the map, with **raster tiles darkened** by a CSS filter to match the dark
  theme. Tile server, attribution and darkening are configurable.
- The map **follows the car** until the viewer drags it; **"Recentrer"** resumes following.
- **Trail** of the car since the page was opened (the metadata only carries the current position).
- Without a GPS fix, the last known position stays on the map, greyed.

### Telemetry

| Section | Shows | Alert (amber / red) |
|---|---|---|
| GPS (under the map) | speed, fix, satellites; altitude, course, HDOP, position, GNSS time in the details | grey without a fix |
| Car | recording state, cameras and microphones with their streaming state | |
| Network | signal quality, technology (5G NSA, 4G…), operator, modem state; LTE and NR radio values in the details | signal below 30 % / 15 % |
| Battery | charge, voltage, current, power | charge below 25 % / 10 % |
| Jetson | hottest junction temperature, CPU/GPU load, free disk; temperatures, RAM, encoder clock, power mode in the details | junction above 80 / 90 °C, free disk below 10 / 2 GB |

- Ten-minute **sparklines** for signal, battery and temperature, accumulated in the browser.
- Each section shows the **age of its sample**. Ages correct for a clock offset between the car and the
  viewer, measured on the live updates.
- An unknown metadata version (`v`) is reported instead of being misread.

### Connection and degraded states

- **Car offline** (tunnel, no 5G): a banner gives the age of the last data, the video waits for the
  stream, and the telemetry and map stay visible, greyed, with their age. Everything comes back by itself.
- **Viewer offline**: LiveKit resumes short drops. After a full disconnection, the page asks for a new
  token and rejoins with backoff (1 s, 2 s, 5 s, 10 s, then every 20 s), and right away when the device
  is back online. A "Réessayer" button forces it.
- **Viewers are counted** in the header.

### Server

- The browser never sees the LiveKit key and secret. **`GET /api/token`** issues a viewer token:
  - subscribe only (no publishing, no data, no metadata changes), with a unique `viewer-` identity;
  - valid two hours (LiveKit refreshes it while connected);
  - carrying the room configuration (24 h timeouts), in case the join recreates an expired room, as the
    protocol requires.
- **Rate limit**: 60 tokens per minute per IP. The IP comes from `X-Forwarded-For`, trusted only when the
  request's host is the site's.

### Configuration

- Everything is set through **environment variables, read at runtime**, so one image serves any setup.
  Only `SITE_URL` is read at build time.

| Variable | Default | Purpose |
|---|---|---|
| `LIVEKIT_URL` | | LiveKit server, e.g. `wss://live.example.com` |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | | sign the viewer tokens |
| `LIVEKIT_ROOM` | `racecast` | room of the car |
| `LIVEKIT_CAR_IDENTITY` | empty | identity of the car's participant; empty means the participant that is not a viewer |
| `TILE_URL`, `TILE_ATTRIBUTION`, `TILE_MAX_ZOOM` | OpenStreetMap | raster tiles of the map |
| `TILE_DARKEN` | `true` | invert light tiles to fit the dark theme |
| `SITE_URL` | `https://racecast.minarox.fr` | public origin (build time) |
| `PORT` | `4321` | port of the Node server |

- The default tiles come from the OpenStreetMap Foundation's server, whose
  [usage policy](https://operations.osmfoundation.org/policies/tiles/) asks for moderate use. Point
  `TILE_URL` to another provider for heavy traffic.

## Getting started

Requires Node 24 and pnpm. Copy `.env.example` to `.env` and fill in the LiveKit URL and keys first.

```bash
pnpm install
pnpm dev            # http://localhost:4321
pnpm check          # types: astro check + vue-tsc
pnpm lint           # ESLint, warnings as errors
pnpm format         # Prettier (pnpm format:check only reports)
pnpm test           # unit tests (pnpm test:watch while working)
pnpm build          # production build into ./dist
pnpm start          # run the built server
pnpm icons          # regenerate src/assets/icons.ts from @iconify-json/ph
```

Deployment, behind the reverse proxy that terminates TLS:

```bash
docker compose up -d --build
```

The site answers in plain HTTP on port 4321, published on every interface by default because the
reverse proxy runs on another machine of the LAN (`BIND_ADDRESS` in `.env` narrows it to one address,
e.g. `127.0.0.1` for a proxy on the same host). Only the proxy should reach that port: a client
talking to it directly skips TLS and can forge `X-Forwarded-For`. Docker's published ports bypass
`ufw`, so filter them in the `DOCKER-USER` chain:

```bash
# Drop connections to the site that do not come from the proxy (here 192.168.1.2).
sudo iptables -I DOCKER-USER -p tcp -m conntrack --ctorigdstport 4321 ! -s 192.168.1.2 -j DROP
```

The proxy must keep the original `Host` and replace `X-Forwarded-For` with the client's address (not
append to it), which the token rate limit relies on. Rebuild (not just restart) after changing
`SITE_URL`.

Without the car, run a local `livekit-server --dev` and publish test tracks with the
[`lk` CLI](https://github.com/livekit/livekit-cli). `.ivf` files may hold AV1, and the room metadata is
set with `lk room update --metadata`:

```bash
lk --dev room join --identity car --attribute main_camera=cam-front.ivf \
    --publish cam-front.ivf --publish mic-driver.ogg racecast
```

`lk` unpublishes a file's track when the file ends, and takes at most three `--publish`.

## Contributing

Development happens on `dev`, and changes reach `main` through pull requests. Each pull request is checked
by [GitHub Actions](.github/workflows/ci.yml): a [TruffleHog](https://github.com/trufflesecurity/trufflehog)
secret scan of the new commits (with LiveKit detectors), formatting (Prettier), ESLint with warnings as
errors, types (`astro check`, `vue-tsc`), the unit tests and a production build. Dependabot proposes
dependency updates monthly.

The unit tests ([Vitest](https://vitest.dev), in `tests/`) cover the logic and the components without a
browser or a server:

- formatting, the telemetry format and its thresholds, the history and the trail;
- the LiveKit side against a fake SDK: telling the car from the viewers, which tracks get subscribed,
  the microphones handed to the mixer, the clock offset, reconnection with backoff;
- the mixer against a fake Web Audio graph, and the stored preferences;
- the token endpoint: grants, identity, lifetime, room timeouts, rate limit;
- the video stage, the status banner, the sparklines and the sound dock.

There is no automated test against a live room: video, sound and layouts are still checked by hand,
against the car or a local LiveKit server.

## Repository layout

| Path | Contents |
|---|---|
| `src/pages/` | the page (`index.astro`) and the token endpoint (`api/token.ts`) |
| `src/components/` | Vue components: app shell, video stage, map, mixer and sound dock, telemetry |
| `src/lib/` | client state: LiveKit room and subscriptions, mixer, telemetry types and history, layouts, formatting |
| `src/styles/` | theme tokens (colours, radii, type) |
| `src/assets/` | generated icon set |
| `scripts/` | icon generator |
| `public/` | favicon |
| `tests/` | unit tests (Vitest), with their fakes and fixtures |
| `.github/` | CI workflow, TruffleHog detectors, Dependabot |

## Documentation

- [`docs/PROTOCOL.md`](https://github.com/Minarox/RaceCast-Emitter/blob/main/docs/PROTOCOL.md) in
  RaceCast-Emitter: what the car publishes (tracks, attributes, room metadata). It is the contract this
  site follows.
- [`.env.example`](.env.example): every setting, commented.
- [`CLAUDE.md`](CLAUDE.md): architecture, conventions and the display choices made so far.

## Roadmap

- Admin page: device configuration, main camera, recording start and stop, through LiveKit RPC once the
  protocol defines them.
- Pending field tests: Safari and Chrome on real phones, a viewer on 5G at the trackside, the Docker image
  behind the reverse proxy.

## License

Copyright 2026 Mathis Serrieres Maniecki.

Licensed under the [Apache License, Version 2.0](LICENSE).

The icon paths in `src/assets/icons.ts` come from [Phosphor Icons](https://github.com/phosphor-icons/core),
under the MIT license. Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
