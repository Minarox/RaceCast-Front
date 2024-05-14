import { defineConfig } from "astro/config";
import icon from "astro-icon";
import cloudflare from "@astrojs/cloudflare";
import playformCompress from "@playform/compress";
import robotsTxt from "astro-robots-txt";

// https://astro.build/config
export default defineConfig({
  site: 'https://rallye.minarox.fr',
  integrations: [icon(), robotsTxt(), playformCompress()],
  output: "hybrid",
  adapter: cloudflare({
    imageService: "passthrough"
  })
});
