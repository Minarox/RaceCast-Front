import { defineConfig } from "astro/config";
import icon from "astro-icon";
import cloudflare from "@astrojs/cloudflare";
import robotsTxt from "astro-robots-txt";
import sitemap from "astro-sitemap";
import metaTags from "astro-meta-tags";

// https://astro.build/config
export default defineConfig({
  site: 'https://rallye.minarox.fr',
  integrations: [icon(), metaTags(), robotsTxt(), sitemap()],
  output: "hybrid",
  adapter: cloudflare({
    imageService: "passthrough"
  })
});
