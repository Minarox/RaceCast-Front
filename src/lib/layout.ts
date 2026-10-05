import { ref } from "vue"

/*
 * Which of the four layouts the viewport gets. The choice drives both the CSS
 * (`data-layout` on the app root) and which videos are subscribed to, so it is
 * decided once, here, from media queries.
 *
 * - landscape: a phone on its side; the video fills the screen
 * - desktop:   wide landscape screens, tablets in landscape included
 * - tablet:    a tablet in portrait (phone layout plus thumbnails)
 * - phone:     a phone in portrait
 */
export type Layout = "landscape" | "desktop" | "tablet" | "phone"

const queries: [Layout, string][] = [
    ["landscape", "(orientation: landscape) and (max-height: 500px)"],
    ["desktop", "(orientation: landscape) and (min-width: 1024px)"],
    ["tablet", "(min-width: 600px)"]
]

function current(): Layout {
    for (const [layout, query] of queries) {
        if (matchMedia(query).matches) return layout
    }
    return "phone"
}

export const layout = ref<Layout>("phone")

let started = false

export function watchLayout(): void {
    if (started) return
    started = true
    layout.value = current()
    for (const [, query] of queries) {
        matchMedia(query).addEventListener("change", () => (layout.value = current()))
    }
}

/** Layouts that show every camera at once (hero + thumbnails). */
export function showsAllCameras(value: Layout): boolean {
    return value === "desktop" || value === "tablet"
}
