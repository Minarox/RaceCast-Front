import { onBeforeUnmount, onMounted, type Ref } from "vue"
import { live } from "@lib/live"
import { level, mixer } from "@lib/mixer"

/*
 * Animates the VU meters inside `root`, outside Vue: a requestAnimationFrame
 * loop writes straight to the DOM, so 60 updates a second re-render nothing.
 *
 * Inside `root`, an element `[data-meter="<mic>"]` gets a `--level` custom
 * property from 0 to 1, and `[data-db="<mic>"]` the level as text a few times
 * a second. Nothing runs while `root` is hidden.
 */

const FLOOR_DB = -60
const FALL_DB_PER_S = 24

export function useMeters(root: Ref<HTMLElement | undefined>): void {
    const shown = new Map<string, number>()
    let frame = 0
    let last = performance.now()
    let lastText = 0

    function tick(at: number): void {
        frame = requestAnimationFrame(tick)
        const elapsed = (at - last) / 1000
        last = at
        const element = root.value
        if (!element || element.offsetParent === null) return

        const writeText = at - lastText > 250
        if (writeText) lastText = at

        for (const microphone of live.microphones) {
            const name = microphone.name
            const measured = Math.max(FLOOR_DB, level(name))
            // Instant attack, steady fall: the meter reads like a hardware one.
            const value = Math.max(measured, (shown.get(name) ?? FLOOR_DB) - FALL_DB_PER_S * elapsed)
            shown.set(name, value)

            const selector = CSS.escape(name)
            for (const meter of element.querySelectorAll<HTMLElement>(`[data-meter="${selector}"]`)) {
                meter.style.setProperty("--level", String((value - FLOOR_DB) / -FLOOR_DB))
            }
            if (writeText) {
                for (const label of element.querySelectorAll<HTMLElement>(`[data-db="${selector}"]`)) {
                    label.textContent = mixer.enabled && value > FLOOR_DB ? `${Math.round(value)} dB` : "—"
                }
            }
        }
    }

    onMounted(() => {
        frame = requestAnimationFrame(tick)
    })

    onBeforeUnmount(() => cancelAnimationFrame(frame))
}
