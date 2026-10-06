import { computed, reactive, watch } from "vue"
import { live } from "@lib/live"
import { load, save } from "@lib/storage"

export type Tab = "map" | "mixer" | "telemetry"

const TABS: Tab[] = ["map", "mixer", "telemetry"]
const storedTab = load<unknown>("tab", "map")

/*
 * What the viewer chose to look at. The big video shows the car's main camera
 * unless the viewer picked another one; picking the main camera again (or
 * "Revenir à la principale") goes back to following whatever the car
 * designates.
 */
export const view = reactive({
    /** Camera picked by the viewer, or null to follow the main camera. */
    pick: null as string | null,
    /** Receive no video at all. */
    audioOnly: load<unknown>("audioOnly", false) === true,
    /** Panel shown under the video on phones and tablets. */
    tab: (TABS.includes(storedTab as Tab) ? storedTab : "map") as Tab,
    /** Sound dock unfolded (desktop). */
    soundOpen: load<unknown>("soundOpen", false) === true
})

watch(
    () => view.audioOnly,
    value => save("audioOnly", value)
)
watch(
    () => view.tab,
    value => save("tab", value)
)
watch(
    () => view.soundOpen,
    value => save("soundOpen", value)
)

/** Camera in the big video slot. A picked camera that drops out falls back to the main one until it returns. */
export const shown = computed<string | null>(() => {
    const names = live.cameras.map(camera => camera.name)
    if (view.pick && names.includes(view.pick)) return view.pick
    if (live.mainCamera && names.includes(live.mainCamera)) return live.mainCamera
    return names[0] ?? null
})

/** The main camera exists and is not the one shown. */
export const awayFromMain = computed<boolean>(
    () =>
        live.mainCamera !== null &&
        shown.value !== live.mainCamera &&
        live.cameras.some(c => c.name === live.mainCamera)
)

export function pick(name: string): void {
    view.pick = name === live.mainCamera ? null : name
}

export function backToMain(): void {
    view.pick = null
}

/** Next or previous camera, wrapping around (phone arrows and swipes). */
export function step(direction: 1 | -1): void {
    const names = live.cameras.map(camera => camera.name)
    if (names.length < 2) return
    const index = shown.value ? names.indexOf(shown.value) : 0
    pick(names[(index + direction + names.length) % names.length]!)
}
