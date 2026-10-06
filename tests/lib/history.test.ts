import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as HistoryModule from "@lib/history"
import { telemetry } from "../fixtures"

// The history lives in module state: every test starts from a fresh module.
let h: typeof HistoryModule

beforeEach(async () => {
    vi.resetModules()
    h = await import("@lib/history")
})

function at(seconds: number): string {
    return new Date(Date.parse("2026-10-05T12:00:00Z") + seconds * 1000).toISOString()
}

describe("series", () => {
    it("records one sample per section timestamp", () => {
        h.record(telemetry(at(0)))
        h.record(telemetry(at(0)))
        h.record(telemetry(at(1)))
        expect(h.history.speed.t).toHaveLength(2)
        expect(h.history.battery.v).toEqual([84, 84])
        expect(h.history.speed.rev).toBe(2)
    })

    it("ignores samples older than the last one", () => {
        h.record(telemetry(at(5)))
        h.record(telemetry(at(3)))
        expect(h.history.signal.t).toEqual([Date.parse(at(5))])
    })

    it("keeps unavailable values as gaps", () => {
        const doc = telemetry(at(0))
        doc.ups!.percent = null
        h.record(doc)
        expect(h.history.battery.v).toEqual([null])
    })

    it("breaks the line after a long silence", () => {
        h.record(telemetry(at(0)))
        h.record(telemetry(at(60)))
        // Speed is sampled every second: 60 s without a sample inserts a gap.
        expect(h.history.speed.v).toEqual([87.5, null, 87.5])
    })

    it("keeps only the last ten minutes", () => {
        for (let s = 0; s <= 11 * 60; s += 1) h.record(telemetry(at(s)))
        const t = h.history.speed.t
        expect(t[t.length - 1]! - t[0]!).toBeLessThanOrEqual(h.HISTORY_MS)
        expect(t[0]).toBe(Date.parse(at(60)))
    })
})

describe("trail", () => {
    it("adds a point per new fix", () => {
        h.record(telemetry(at(0)))
        h.record(telemetry(at(0)))
        h.record(telemetry(at(1)))
        expect(h.trail.points).toEqual([
            [48.1173, 11.5166667],
            [48.1173, 11.5166667]
        ])
        expect(h.trail.rev).toBe(2)
    })

    it("skips samples without a fix or a position", () => {
        const noFix = telemetry(at(0))
        noFix.gps = { ...noFix.gps!, fix: "none", lat: null, lon: null }
        h.record(noFix)
        expect(h.trail.points).toHaveLength(0)
    })

    it("counts the points trimmed from the start", () => {
        for (let s = 0; s < 36_005; s++) {
            const doc = telemetry(at(s))
            doc.gps!.lat = s
            h.record(doc)
        }
        expect(h.trail.points).toHaveLength(36_000)
        expect(h.trail.dropped).toBe(5)
        expect(h.trail.points[0]![0]).toBe(5)
    })
})
