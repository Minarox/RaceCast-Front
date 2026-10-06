import { beforeEach, describe, expect, it, vi } from "vitest"
import { mount } from "@vue/test-utils"
import VideoStage from "@components/VideoStage.vue"
import * as liveModule from "@lib/live"
import * as mixerModule from "@lib/mixer"
import { layout } from "@lib/layout"
import { view } from "@lib/view"

vi.mock("@lib/live", async () => {
    const { reactive } = await import("vue")
    return {
        live: reactive({
            connection: "connected",
            carOnline: true,
            mainCamera: null as string | null,
            cameras: [] as { name: string; mimeType?: string }[],
            microphones: [] as { name: string }[],
            telemetry: null
        }),
        videoTrack: () => undefined
    }
})

vi.mock("@lib/mixer", async () => {
    const { reactive } = await import("vue")
    return { mixer: reactive({ enabled: false }), enableSound: vi.fn() }
})

// "video/AV1-broken" stands for a track this browser cannot decode.
vi.mock("@lib/codecs", () => ({ unplayable: (mimeType?: string) => mimeType === "video/AV1-broken" }))

const live = liveModule.live as unknown as {
    connection: string
    carOnline: boolean
    mainCamera: string | null
    cameras: { name: string; mimeType?: string }[]
    microphones: { name: string }[]
}
const mixer = mixerModule.mixer as unknown as { enabled: boolean }

function cameras(...names: string[]): void {
    live.cameras = names.map(name => ({ name, mimeType: "video/AV1" }))
}

function stage() {
    return mount(VideoStage, {
        global: { stubs: { VideoView: { props: ["name"], template: "<i class='video' :data-name='name' />" } } }
    })
}

beforeEach(() => {
    Object.assign(live, { connection: "connected", carOnline: true, mainCamera: null, cameras: [], microphones: [] })
    Object.assign(view, { pick: null, audioOnly: false })
    mixer.enabled = false
    layout.value = "desktop"
})

describe("big video slot", () => {
    it("shows the main camera, with its star", () => {
        cameras("cam-a", "cam-main")
        live.mainCamera = "cam-main"
        const wrapper = stage()
        expect(wrapper.find(".hero .video").attributes("data-name")).toBe("cam-main")
        expect(wrapper.find(".hero .label").text()).toBe("cam-main")
        expect(wrapper.find(".hero .label .star").exists()).toBe(true)
    })

    it("waits for the car while it is offline", () => {
        live.carOnline = false
        expect(stage().find(".placeholder .title").text()).toBe("Voiture hors ligne")
    })

    it("says it is connecting before the first join", () => {
        live.carOnline = false
        live.connection = "connecting"
        expect(stage().find(".placeholder .title").text()).toBe("Connexion au direct…")
    })

    it("says when the car publishes no camera", () => {
        expect(stage().find(".placeholder .title").text()).toBe("Aucune caméra diffusée")
    })

    it("explains that AV1 cannot be decoded here", () => {
        live.cameras = [{ name: "cam-a", mimeType: "video/AV1-broken" }]
        const wrapper = stage()
        expect(wrapper.find(".placeholder .title").text()).toBe("Vidéo AV1 non prise en charge")
        expect(wrapper.find(".video").exists()).toBe(false)
    })

    it("pauses in audio-only mode and offers to resume", async () => {
        cameras("cam-a")
        view.audioOnly = true
        const wrapper = stage()
        expect(wrapper.find(".placeholder .title").text()).toBe("Vidéo en pause")
        await wrapper.find(".placeholder .pill").trigger("click")
        expect(view.audioOnly).toBe(false)
    })
})

describe("thumbnails", () => {
    it("show the other cameras on desktop, and swap on click", async () => {
        cameras("cam-a", "cam-b", "cam-main")
        live.mainCamera = "cam-main"
        const wrapper = stage()
        const thumbs = wrapper.findAll(".thumb")
        expect(thumbs.map(t => t.find(".video").attributes("data-name"))).toEqual(["cam-a", "cam-b"])
        await thumbs[1]!.trigger("click")
        expect(wrapper.find(".hero .video").attributes("data-name")).toBe("cam-b")
    })

    it("offer to go back to the main camera", async () => {
        cameras("cam-a", "cam-main")
        live.mainCamera = "cam-main"
        view.pick = "cam-a"
        const wrapper = stage()
        const back = wrapper.findAll(".bottom .pill").find(b => b.text().includes("Revenir à la principale"))
        expect(back).toBeDefined()
        await back!.trigger("click")
        expect(wrapper.find(".hero .video").attributes("data-name")).toBe("cam-main")
    })

    it("are not shown on a phone, which switches cameras with arrows instead", async () => {
        cameras("cam-a", "cam-b")
        layout.value = "phone"
        const wrapper = stage()
        expect(wrapper.find(".thumb").exists()).toBe(false)
        await wrapper.findAll(".switcher button")[1]!.trigger("click")
        expect(wrapper.find(".hero .video").attributes("data-name")).toBe("cam-b")
    })

    it("are hidden in audio-only mode", () => {
        cameras("cam-a", "cam-b")
        view.audioOnly = true
        expect(stage().find(".thumb").exists()).toBe(false)
    })
})

describe("sound button", () => {
    it("asks for a gesture while there is sound to play", async () => {
        cameras("cam-a")
        live.microphones = [{ name: "mic-driver" }]
        const wrapper = stage()
        await wrapper.find("button.sound").trigger("click")
        expect(mixerModule.enableSound).toHaveBeenCalledOnce()
    })

    it("is gone once the sound is on, or without microphones", () => {
        cameras("cam-a")
        expect(stage().find("button.sound").exists()).toBe(false)
        live.microphones = [{ name: "mic-driver" }]
        mixer.enabled = true
        expect(stage().find("button.sound").exists()).toBe(false)
    })
})

describe("landscape status strip", () => {
    it("shares the top row with the camera name", () => {
        cameras("cam-a")
        layout.value = "landscape"
        const wrapper = stage()
        expect(wrapper.find(".top .strip").exists()).toBe(true)
        expect(wrapper.find(".top .strip").text()).toContain("En direct")
    })
})
