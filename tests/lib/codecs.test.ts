import { beforeEach, describe, expect, it, vi } from "vitest"

// The decoder check is cached in the module: reload it for each case.
beforeEach(() => vi.resetModules())

function receiverWith(...mimeTypes: string[]): void {
    vi.stubGlobal("RTCRtpReceiver", {
        getCapabilities: vi.fn(() => ({ codecs: mimeTypes.map(mimeType => ({ mimeType })) }))
    })
}

describe("canDecodeAv1", () => {
    it("is true when the browser lists AV1", async () => {
        receiverWith("video/VP8", "video/AV1")
        const { canDecodeAv1 } = await import("@lib/codecs")
        expect(canDecodeAv1()).toBe(true)
    })

    it("is false without AV1", async () => {
        receiverWith("video/VP8", "video/H264")
        const { canDecodeAv1 } = await import("@lib/codecs")
        expect(canDecodeAv1()).toBe(false)
    })

    it("is false without WebRTC", async () => {
        vi.stubGlobal("RTCRtpReceiver", undefined)
        const { canDecodeAv1 } = await import("@lib/codecs")
        expect(canDecodeAv1()).toBe(false)
    })

    it("asks the browser only once", async () => {
        receiverWith("video/AV1")
        const { canDecodeAv1 } = await import("@lib/codecs")
        canDecodeAv1()
        canDecodeAv1()
        expect(RTCRtpReceiver.getCapabilities).toHaveBeenCalledTimes(1)
    })
})

describe("unplayable", () => {
    it("flags AV1 tracks only when AV1 cannot be decoded", async () => {
        receiverWith("video/VP8")
        const { unplayable } = await import("@lib/codecs")
        expect(unplayable("video/AV1")).toBe(true)
        expect(unplayable("video/av1")).toBe(true)
        expect(unplayable("video/VP8")).toBe(false)
        expect(unplayable(undefined)).toBe(false)
    })

    it("lets AV1 through when it can be decoded", async () => {
        receiverWith("video/AV1")
        const { unplayable } = await import("@lib/codecs")
        expect(unplayable("video/AV1")).toBe(false)
    })
})
