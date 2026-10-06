import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import astro from "eslint-plugin-astro"
import vue from "eslint-plugin-vue"
import prettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

/*
 * Lint rules for correctness; layout is Prettier's job (eslint-config-prettier
 * turns off the rules that would fight it).
 */
export default defineConfig(
    { ignores: ["dist/", ".astro/", "node_modules/", "src/assets/icons.ts"] },
    js.configs.recommended,
    tseslint.configs.recommended,
    vue.configs["flat/recommended"],
    astro.configs.recommended,
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node }
        }
    },
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: { parser: tseslint.parser }
        },
        rules: {
            // Component names follow the files (Icon.vue, LiveApp.vue…), not the multi-word rule.
            "vue/multi-word-component-names": "off"
        }
    },
    {
        // The only v-html: SVG paths generated at build time from @iconify-json/ph, never user input.
        files: ["src/components/Icon.vue"],
        rules: { "vue/no-v-html": "off" }
    },
    prettier
)
