import { defineConfig } from "astro/config"
import icon from "astro-icon"
import sitemap from "@astrojs/sitemap"
import metaTags from "astro-meta-tags"
import { astroFont } from "astro-font/integration"
import vue from "@astrojs/vue"
import compressor from "astro-compressor"
import cloudflare from "@astrojs/cloudflare"

// https://astro.build/config
export default defineConfig({
    site: "https://racecast.minarox.fr",
    base: '/',
    integrations: [icon(), sitemap(), metaTags(), astroFont(), vue(), compressor()],
    adapter: cloudflare({
        imageService: "cloudflare",
		platformProxy: {
			enabled: true
		}
    }),
    vite: {
        ssr: {
          external: ["buffer", "path", "fs", "os", "crypto", "async_hooks"].map((i) => `node:${i}`)
        }
    }
})
