import { describe, expect, it, vi } from "vitest"
import { wantedCameras } from "@lib/subscriptions"

vi.mock("@lib/codecs", () => ({
    // In these tests, only "video/AV1-broken" stands for a track the browser cannot decode.
    unplayable: (mimeType: string | undefined) => mimeType === "video/AV1-broken"
}))

const cameras = [
    { name: "cam-front", mimeType: "video/AV1" },
    { name: "cam-rear", mimeType: "video/AV1" },
    { name: "cam-side", mimeType: "video/AV1" }
]

describe("wantedCameras", () => {
    it("receives every camera on desktop and tablet", () => {
        expect(wantedCameras(cameras, "desktop", "cam-front", false)).toEqual(["cam-front", "cam-rear", "cam-side"])
        expect(wantedCameras(cameras, "tablet", "cam-rear", false)).toEqual(["cam-front", "cam-rear", "cam-side"])
    })

    it("receives only the camera shown on a phone", () => {
        expect(wantedCameras(cameras, "phone", "cam-rear", false)).toEqual(["cam-rear"])
        expect(wantedCameras(cameras, "landscape", "cam-side", false)).toEqual(["cam-side"])
    })

    it("receives nothing on a phone with no camera shown", () => {
        expect(wantedCameras(cameras, "phone", null, false)).toEqual([])
    })

    it("receives nothing in audio-only mode", () => {
        expect(wantedCameras(cameras, "desktop", "cam-front", true)).toEqual([])
        expect(wantedCameras(cameras, "phone", "cam-front", true)).toEqual([])
    })

    it("never receives a camera the browser cannot decode", () => {
        const mixed = [...cameras, { name: "cam-broken", mimeType: "video/AV1-broken" }]
        expect(wantedCameras(mixed, "desktop", null, false)).not.toContain("cam-broken")
        expect(wantedCameras(mixed, "phone", "cam-broken", false)).toEqual([])
    })
})
