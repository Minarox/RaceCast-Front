import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import type * as ViewModule from "@lib/view"

// A plain reactive stand-in for the room state: view.ts only reads it.
vi.mock("@lib/live", async () => {
    const { reactive } = await import("vue")
    return { live: reactive({ mainCamera: null as string | null, cameras: [] as { name: string }[] }) }
})

let live: { mainCamera: string | null; cameras: { name: string }[] }
let v: typeof ViewModule

async function load(): Promise<void> {
    vi.resetModules()
    // resetModules keeps mocked modules: clear the shared stand-in by hand.
    live = (await import("@lib/live")).live as unknown as typeof live
    live.cameras = []
    live.mainCamera = null
    v = await import("@lib/view")
}

function cameras(...names: string[]): void {
    live.cameras = names.map(name => ({ name }))
}

beforeEach(load)
afterEach(() => localStorage.clear())

describe("camera in the big slot", () => {
    it("is the main camera by default", () => {
        cameras("cam-a", "cam-main")
        live.mainCamera = "cam-main"
        expect(v.shown.value).toBe("cam-main")
        expect(v.awayFromMain.value).toBe(false)
    })

    it("is the first camera without a main one", () => {
        cameras("cam-a", "cam-b")
        expect(v.shown.value).toBe("cam-a")
        live.mainCamera = "cam-gone"
        expect(v.shown.value).toBe("cam-a")
        expect(v.awayFromMain.value).toBe(false)
    })

    it("is null without cameras", () => {
        expect(v.shown.value).toBeNull()
    })

    it("is the viewer's pick, until they go back to the main camera", () => {
        cameras("cam-a", "cam-main")
        live.mainCamera = "cam-main"
        v.pick("cam-a")
        expect(v.shown.value).toBe("cam-a")
        expect(v.awayFromMain.value).toBe(true)
        v.backToMain()
        expect(v.shown.value).toBe("cam-main")
    })

    it("follows the car's main camera when the viewer picked the main one", () => {
        cameras("cam-a", "cam-b")
        live.mainCamera = "cam-a"
        v.pick("cam-a")
        expect(v.view.pick).toBeNull()
        live.mainCamera = "cam-b"
        expect(v.shown.value).toBe("cam-b")
    })

    it("keeps the viewer's pick when the car designates another main camera", () => {
        cameras("cam-a", "cam-b", "cam-c")
        live.mainCamera = "cam-a"
        v.pick("cam-c")
        live.mainCamera = "cam-b"
        expect(v.shown.value).toBe("cam-c")
    })

    it("falls back while the picked camera is gone, and returns to it", () => {
        cameras("cam-a", "cam-main")
        live.mainCamera = "cam-main"
        v.pick("cam-a")
        cameras("cam-main")
        expect(v.shown.value).toBe("cam-main")
        cameras("cam-a", "cam-main")
        expect(v.shown.value).toBe("cam-a")
    })
})

describe("step", () => {
    it("goes to the next and previous camera, wrapping around", () => {
        cameras("cam-a", "cam-b", "cam-c")
        v.step(1)
        expect(v.shown.value).toBe("cam-b")
        v.step(-1)
        v.step(-1)
        expect(v.shown.value).toBe("cam-c")
        v.step(1)
        expect(v.shown.value).toBe("cam-a")
    })

    it("does nothing with a single camera", () => {
        cameras("cam-a")
        v.step(1)
        expect(v.view.pick).toBeNull()
    })
})

describe("remembered preferences", () => {
    it("saves audio-only mode, the tab and the dock state", async () => {
        v.view.audioOnly = true
        v.view.tab = "telemetry"
        v.view.soundOpen = true
        await nextTick()
        expect(localStorage.getItem("racecast.audioOnly")).toBe("true")
        expect(localStorage.getItem("racecast.tab")).toBe('"telemetry"')
        expect(localStorage.getItem("racecast.soundOpen")).toBe("true")
    })

    it("restores them on the next visit", async () => {
        localStorage.setItem("racecast.audioOnly", "true")
        localStorage.setItem("racecast.tab", '"mixer"')
        await load()
        expect(v.view.audioOnly).toBe(true)
        expect(v.view.tab).toBe("mixer")
    })

    it("ignores stored values of the wrong kind", async () => {
        localStorage.setItem("racecast.audioOnly", '"yes"')
        localStorage.setItem("racecast.tab", '"admin"')
        await load()
        expect(v.view.audioOnly).toBe(false)
        expect(v.view.tab).toBe("map")
    })
})
