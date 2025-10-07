// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import metaTags from 'astro-meta-tags';
import icon from 'astro-icon';
import compressor from 'astro-compressor';
import cloudflare from "@astrojs/cloudflare";

import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
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
