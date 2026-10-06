/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config"

/*
 * Unit tests run on Astro's Vite configuration, so the path aliases, the Vue
 * plugin and the astro:env modules resolve as in the app. jsdom stands in for
 * the browser; LiveKit, Web Audio and Leaflet are replaced by fakes in the
 * tests that touch them.
 */
export default getViteConfig({
    test: {
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
        restoreMocks: true,
        unstubGlobals: true
    }
})
