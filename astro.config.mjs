import { defineConfig } from "astro/config";
import icon from "astro-icon";
import cloudflare from "@astrojs/cloudflare";
import playformCompress from "@playform/compress";
import robotsTxt from "astro-robots-txt";
import sitemap from "astro-sitemap";
import metaTags from "astro-meta-tags";

// https://astro.build/config
export default defineConfig({
  site: 'https://rallye.minarox.fr',
  integrations: [icon(),  metaTags(), robotsTxt(), sitemap(), playformCompress()],
  output: "hybrid",
  adapter: cloudflare({
    imageService: "passthrough"
  })
});
