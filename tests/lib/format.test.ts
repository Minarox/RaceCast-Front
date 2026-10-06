import { describe, expect, it } from "vitest"
import { ago, heading, hour, num, position, text, time } from "@lib/format"

const NNBSP = "\u202f"
const NBSP = "\u00a0"

describe("num", () => {
    it("formats French numbers with a fixed number of digits", () => {
        expect(num(12.492, 1)).toBe("12,5")
        expect(num(12, 2)).toBe("12,00")
        expect(num(1234.5)).toBe(`1${NNBSP}235`)
    })

    it("appends the unit after a narrow no-break space", () => {
        expect(num(84, 0, "%")).toBe(`84${NNBSP}%`)
    })

    it("renders missing or invalid values as a dash", () => {
        expect(num(null)).toBe("—")
        expect(num(undefined, 1, "V")).toBe("—")
        expect(num(Number.NaN)).toBe("—")
        expect(num(Number.POSITIVE_INFINITY)).toBe("—")
    })
})

describe("text", () => {
    it("falls back to a dash", () => {
        expect(text("Orange F")).toBe("Orange F")
        expect(text("")).toBe("—")
        expect(text(null)).toBe("—")
    })
})

describe("ago", () => {
    const now = Date.parse("2026-10-05T12:00:00Z")

    it("says when there never was a value", () => {
        expect(ago(null, now)).toBe("jamais")
        expect(ago(Number.NaN, now)).toBe("jamais")
    })

    it("rounds to the largest sensible unit", () => {
        expect(ago(now - 1_000, now)).toBe("à l'instant")
        expect(ago(now - 12_000, now)).toBe(`il y a 12${NBSP}s`)
        expect(ago(now - 59_000, now)).toBe(`il y a 59${NBSP}s`)
        expect(ago(now - 3 * 60_000, now)).toBe(`il y a 3${NBSP}min`)
        expect(ago(now - (2 * 60 + 5) * 60_000, now)).toBe(`il y a 2${NBSP}h${NBSP}05`)
        expect(ago(now - 3 * 24 * 3_600_000, now)).toBe(`il y a 3${NBSP}j`)
    })

    it("treats a timestamp from the future as now", () => {
        expect(ago(now + 5_000, now)).toBe("à l'instant")
    })
})

describe("time and hour", () => {
    it("parses ISO timestamps", () => {
        expect(time("2026-10-05T12:00:00.500Z")).toBe(Date.parse("2026-10-05T12:00:00.500Z"))
        expect(time("not a date")).toBeNull()
        expect(time(null)).toBeNull()
    })

    it("shows the local wall-clock time", () => {
        expect(hour("2026-10-05T12:34:25Z")).toMatch(/^\d{2}:\d{2}:\d{2}$/)
        expect(hour(null)).toBe("—")
    })
})

describe("heading", () => {
    it("adds the compass point", () => {
        expect(heading(0)).toBe(`0°${NBSP}N`)
        expect(heading(44)).toBe(`44°${NBSP}NE`)
        expect(heading(245)).toBe(`245°${NBSP}SO`)
        expect(heading(359)).toBe(`359°${NBSP}N`)
    })

    it("wraps negative and large angles", () => {
        expect(heading(-90)).toBe(`-90°${NBSP}O`)
        expect(heading(450)).toBe(`450°${NBSP}E`)
    })

    it("renders an unknown heading as a dash", () => {
        expect(heading(null)).toBe("—")
    })
})

describe("position", () => {
    it("writes hemispheres instead of signs", () => {
        expect(position(48.1173, 11.5166667)).toBe(`48,11730°${NBSP}N 11,51667°${NBSP}E`)
        expect(position(-33.5, -70.25)).toBe(`33,50000°${NBSP}S 70,25000°${NBSP}O`)
    })

    it("needs both coordinates", () => {
        expect(position(48.1, null)).toBe("—")
    })
})
