import { markRaw, shallowReactive } from "vue"
import type { Telemetry } from "@lib/telemetry"
import { time } from "@lib/format"

/*
 * The metadata only carries the current state, so curves and the map trail
 * are accumulated here from the moment the page opened (lost on reload).
 *
 * The arrays are raw (not deeply reactive): a push bumps `rev`, which is what
 * the sparklines and the map watch.
 */

/** Sliding window of the sparklines. */
export const HISTORY_MS = 10 * 60_000

/** Trail points kept, about ten hours at one fix per second. */
const TRAIL_MAX = 36_000

export interface Series {
    /** Sample times (the car's clock, epoch ms). */
    t: number[]
    /** Values; `null` marks a gap (value unavailable, or the car was offline). */
    v: (number | null)[]
    rev: number
}

function series(): Series {
    return shallowReactive({ t: markRaw<number[]>([]), v: markRaw<(number | null)[]>([]), rev: 0 })
}

export const history = {
    speed: series(),
    signal: series(),
    battery: series(),
    junction: series()
}

/*
 * `dropped` counts the points trimmed from the start, so the map can append
 * new points incrementally and only redraw everything after a trim.
 */
export const trail = shallowReactive({ points: markRaw<[number, number][]>([]), dropped: 0, rev: 0 })

/** Pushes one sample unless it is the one already recorded (same timestamp). */
function push(s: Series, at: number | null, value: number | null, gapMs: number): void {
    if (at === null) return
    const last = s.t.length ? s.t[s.t.length - 1]! : null
    if (last !== null && at <= last) return
    // A long silence (car offline) breaks the line instead of joining across it.
    if (last !== null && at - last > gapMs) {
        s.t.push(last + 1)
        s.v.push(null)
    }
    s.t.push(at)
    s.v.push(value)
    let drop = 0
    while (drop < s.t.length && s.t[drop]! < at - HISTORY_MS) drop++
    if (drop) {
        s.t.splice(0, drop)
        s.v.splice(0, drop)
    }
    s.rev++
}

let lastFix: string | null = null

export function record(telemetry: Telemetry): void {
    const { gps, modem, ups, system } = telemetry
    if (gps) {
        push(history.speed, time(gps.ts), gps.speed_kmh, 5_000)
        if (gps.ts !== lastFix && gps.lat !== null && gps.lon !== null && gps.fix !== "none") {
            lastFix = gps.ts
            trail.points.push([gps.lat, gps.lon])
            if (trail.points.length > TRAIL_MAX) {
                const excess = trail.points.length - TRAIL_MAX
                trail.points.splice(0, excess)
                trail.dropped += excess
            }
            trail.rev++
        }
    }
    if (modem) push(history.signal, time(modem.ts), modem.signal_quality, 16_000)
    if (ups) push(history.battery, time(ups.ts), ups.percent, 8_000)
    if (system) push(history.junction, time(system.ts), system.tj_temp_c, 16_000)
}
