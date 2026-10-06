import { afterEach, describe, expect, it, vi } from "vitest"
import { load, save } from "@lib/storage"

afterEach(() => localStorage.clear())

describe("storage", () => {
    it("round-trips JSON under the racecast. prefix", () => {
        save("tab", "mixer")
        expect(localStorage.getItem("racecast.tab")).toBe('"mixer"')
        expect(load("tab", "map")).toBe("mixer")
    })

    it("returns the fallback for a missing key", () => {
        expect(load("missing", 42)).toBe(42)
    })

    it("returns the fallback for malformed data", () => {
        localStorage.setItem("racecast.broken", "{nope")
        expect(load("broken", "fallback")).toBe("fallback")
    })

    it("survives storage that throws (private browsing, blocked site data)", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("blocked", "SecurityError")
        })
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("full", "QuotaExceededError")
        })
        expect(load("tab", "map")).toBe("map")
        expect(() => save("tab", "mixer")).not.toThrow()
    })
})
