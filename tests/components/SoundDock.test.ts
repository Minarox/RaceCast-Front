import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mount, type VueWrapper } from "@vue/test-utils"
import SoundDock from "@components/SoundDock.vue"
import * as liveModule from "@lib/live"
import * as mixerModule from "@lib/mixer"
import { view } from "@lib/view"

vi.mock("@lib/live", async () => {
    const { reactive } = await import("vue")
    return { live: reactive({ microphones: [] as { name: string }[], cameras: [], mainCamera: null }) }
})

vi.mock("@lib/mixer", async () => {
    const { reactive } = await import("vue")
    return {
        mixer: reactive({ enabled: false, masterMuted: false }),
        enableSound: vi.fn(),
        toggleMasterMute: vi.fn()
    }
})

// The meter animation is DOM work outside Vue; not under test here.
vi.mock("@lib/meters", () => ({ useMeters: vi.fn() }))

const live = liveModule.live as unknown as { microphones: { name: string }[] }
const mixer = mixerModule.mixer as unknown as { enabled: boolean; masterMuted: boolean }

let wrapper: VueWrapper | undefined

function dock(): VueWrapper {
    wrapper = mount(SoundDock, {
        attachTo: document.body,
        global: { stubs: { MixerPanel: { template: "<div class='mixer-stub' />" } } }
    })
    return wrapper
}

function popoverShown(w: VueWrapper): boolean {
    return (w.find("#sound-popover").element as HTMLElement).style.display !== "none"
}

beforeEach(() => {
    live.microphones = [{ name: "mic-a" }, { name: "mic-b" }]
    Object.assign(mixer, { enabled: false, masterMuted: false })
    view.soundOpen = false
})

afterEach(() => wrapper?.unmount())

describe("folded bar", () => {
    it("shows a small meter per microphone", () => {
        const meters = dock().findAll(".mini")
        expect(meters.map(m => m.attributes("data-meter"))).toEqual(["mic-a", "mic-b"])
    })

    it("says when there is no microphone, and disables the speaker", () => {
        live.microphones = []
        const w = dock()
        expect(w.find(".none").text()).toBe("aucun micro")
        expect(w.find(".speaker").attributes("disabled")).toBeDefined()
    })

    it("enables the sound first, then mutes and unmutes the master", async () => {
        const w = dock()
        await w.find(".speaker").trigger("click")
        expect(mixerModule.enableSound).toHaveBeenCalledOnce()
        mixer.enabled = true
        await w.find(".speaker").trigger("click")
        expect(mixerModule.toggleMasterMute).toHaveBeenCalledOnce()
    })
})

describe("unfolded mixer", () => {
    it("opens and closes from the bar", async () => {
        const w = dock()
        expect(popoverShown(w)).toBe(false)
        await w.find(".toggle").trigger("click")
        expect(view.soundOpen).toBe(true)
        expect(w.find(".toggle").attributes("aria-expanded")).toBe("true")
        expect(popoverShown(w)).toBe(true)
        await w.find(".close").trigger("click")
        expect(view.soundOpen).toBe(false)
    })

    it("closes on Escape", async () => {
        view.soundOpen = true
        dock()
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
        expect(view.soundOpen).toBe(false)
    })

    it("closes on a click elsewhere, not on a click inside", async () => {
        view.soundOpen = true
        const w = dock()
        w.find(".mixer-stub").element.dispatchEvent(new Event("pointerdown", { bubbles: true }))
        expect(view.soundOpen).toBe(true)
        document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
        expect(view.soundOpen).toBe(false)
    })
})
