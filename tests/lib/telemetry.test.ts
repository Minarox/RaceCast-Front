import { describe, expect, it } from "vitest"
import { levels, parseTelemetry, SUPPORTED_VERSION } from "@lib/telemetry"
import { telemetry } from "../fixtures"

describe("parseTelemetry", () => {
    it("accepts a version 1 document", () => {
        const doc = telemetry()
        expect(parseTelemetry(JSON.stringify(doc))).toEqual({ ok: true, telemetry: doc })
    })

    it("treats empty metadata as no document yet", () => {
        expect(parseTelemetry("")).toBeNull()
    })

    it("rejects another version and reports it", () => {
        expect(parseTelemetry(JSON.stringify({ v: SUPPORTED_VERSION + 1, ts: "x" }))).toEqual({
            ok: false,
            version: SUPPORTED_VERSION + 1
        })
    })

    it("rejects a document without a numeric version", () => {
        expect(parseTelemetry(JSON.stringify({ ts: "x" }))).toEqual({ ok: false, version: null })
        expect(parseTelemetry(JSON.stringify({ v: "1" }))).toEqual({ ok: false, version: null })
    })

    it("rejects what is not a JSON object", () => {
        expect(parseTelemetry("{not json")).toEqual({ ok: false, version: null })
        expect(parseTelemetry("null")).toEqual({ ok: false, version: null })
        expect(parseTelemetry("42")).toEqual({ ok: false, version: null })
    })
})

describe("levels", () => {
    it("battery: amber below 25 %, red below 10 %", () => {
        expect(levels.battery(25)).toBe("ok")
        expect(levels.battery(24.9)).toBe("warn")
        expect(levels.battery(10)).toBe("warn")
        expect(levels.battery(9.9)).toBe("crit")
    })

    it("junction: amber above 80 °C, red above 90 °C", () => {
        expect(levels.junction(80)).toBe("ok")
        expect(levels.junction(80.1)).toBe("warn")
        expect(levels.junction(90)).toBe("warn")
        expect(levels.junction(90.1)).toBe("crit")
    })

    it("signal: amber below 30 %, red below 15 %", () => {
        expect(levels.signal(30)).toBe("ok")
        expect(levels.signal(29)).toBe("warn")
        expect(levels.signal(14)).toBe("crit")
    })

    it("disk: amber below 10 GB, red below 2 GB", () => {
        expect(levels.disk(10)).toBe("ok")
        expect(levels.disk(9.5)).toBe("warn")
        expect(levels.disk(1.5)).toBe("crit")
    })

    it("stays neutral for unknown values", () => {
        expect(levels.battery(null)).toBe("none")
        expect(levels.junction(undefined)).toBe("none")
    })
})
