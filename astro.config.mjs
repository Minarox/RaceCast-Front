import { defineConfig, envField } from "astro/config"
import node from "@astrojs/node"
import vue from "@astrojs/vue"

// Public origin of the site. Known at build time: it is baked into the
// canonical URLs and into the list of hosts allowed to set forwarded headers.
const site = process.env.SITE_URL || "https://racecast.minarox.fr"

// https://astro.build/config
export default defineConfig({
    site,
    output: "server",
    integrations: [vue()],

    // Self-hosted: a standalone Node server (dist/server/entry.mjs) behind the
    // operator's reverse proxy, which terminates TLS.
    adapter: node({ mode: "standalone" }),

    // livekit-client alone is ~450 KB minified; the app chunk is that big by
    // nature. Leaflet is split off and only loaded with the map.
    vite: {
        build: { chunkSizeWarningLimit: 700 }
    },

    /*
     * Astro only trusts X-Forwarded-For (and so gives the real visitor IP to
     * the token endpoint's rate limit) when the request's Host, or
     * X-Forwarded-Host, is one of these. No protocol in the pattern: the proxy
     * talks plain HTTP to the container, which only listens on localhost.
     */
    security: {
        allowedDomains: [{ hostname: new URL(site).hostname }]
    },

    /*
     * Declared through astro:env and all marked "secret", even the ones that
     * are not sensitive: secret server variables are read from process.env at
     * *runtime*, so the image is built once and configured when it starts.
     * The browser never sees any of them directly: the page passes what the
     * client needs (map tiles, car identity) as props, and the LiveKit URL
     * comes back with the token.
     */
    env: {
        schema: {
            LIVEKIT_URL: envField.string({ context: "server", access: "secret", url: true }),
            LIVEKIT_API_KEY: envField.string({ context: "server", access: "secret" }),
            LIVEKIT_API_SECRET: envField.string({ context: "server", access: "secret" }),
            LIVEKIT_ROOM: envField.string({ context: "server", access: "secret", default: "racecast" }),

            // Identity of the car's participant. Empty: the car is whichever
            // participant is not a viewer (one car per room).
            LIVEKIT_CAR_IDENTITY: envField.string({ context: "server", access: "secret", default: "" }),

            // Raster tile source of the map. The default is the OpenStreetMap
            // Foundation's server, whose usage policy asks for moderate use.
            TILE_URL: envField.string({
                context: "server",
                access: "secret",
                default: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            }),
            TILE_ATTRIBUTION: envField.string({
                context: "server",
                access: "secret",
                default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }),
            TILE_MAX_ZOOM: envField.number({ context: "server", access: "secret", default: 19 }),
            // Invert light tiles to match the dark theme. Turn off for a
            // provider whose tiles are already dark.
            TILE_DARKEN: envField.boolean({ context: "server", access: "secret", default: true })
        }
    }
})
