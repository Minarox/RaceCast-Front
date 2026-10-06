import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RemoteAudioTrack } from "livekit-client"
import type * as MixerModule from "@lib/mixer"

/* ── A small fake of the Web Audio API, enough to follow the graph ── */

class FakeParam {
    value = 1
    setTargetAtTime = vi.fn((value: number) => {
        this.value = value
    })
}

class FakeNode {
    connections: FakeNode[] = []
    connect = vi.fn((node: FakeNode) => {
        this.connections.push(node)
        return node
    })
    disconnect = vi.fn()
}

class FakeGain extends FakeNode {
    gain = new FakeParam()
}

class FakeAnalyser extends FakeNode {
    fftSize = 2048
    sample = 0
    getFloatTimeDomainData(buffer: Float32Array): void {
        buffer.fill(this.sample)
    }
}

class FakeSource extends FakeNode {
    constructor(readonly stream: unknown) {
        super()
    }
}

let context: FakeContext

class FakeContext {
    state = "suspended"
    resumeTo = "running"
    currentTime = 0
    destination = new FakeNode()
    gains: FakeGain[] = []
    analysers: FakeAnalyser[] = []
    sources: FakeSource[] = []
    listeners: Record<string, () => void> = {}
    resume = vi.fn(async () => {
        this.state = this.resumeTo
    })

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- the tests inspect the instance the mixer creates
        context = this
    }

    createGain(): FakeGain {
        const node = new FakeGain()
        this.gains.push(node)
        return node
    }

    createAnalyser(): FakeAnalyser {
        const node = new FakeAnalyser()
        this.analysers.push(node)
        return node
    }

    createMediaStreamSource(stream: unknown): FakeSource {
        const node = new FakeSource(stream)
        this.sources.push(node)
        return node
    }

    addEventListener(type: string, listener: () => void): void {
        this.listeners[type] = listener
    }
}

function fakeTrack(): RemoteAudioTrack & { element: { muted: boolean; play: ReturnType<typeof vi.fn> } } {
    const element = { muted: false, play: vi.fn(() => Promise.resolve()) }
    return {
        element,
        mediaStreamTrack: { kind: "audio" },
        attach: vi.fn(() => element),
        detach: vi.fn()
    } as never
}

let m: typeof MixerModule

async function load(): Promise<void> {
    vi.resetModules()
    m = await import("@lib/mixer")
}

beforeEach(async () => {
    vi.stubGlobal("AudioContext", FakeContext)
    vi.stubGlobal(
        "MediaStream",
        class {
            constructor(readonly tracks: unknown[]) {}
        }
    )
    await load()
})

afterEach(() => localStorage.clear())

/** The master gain is the first gain the mixer creates, before any channel's. */
function masterGain(): FakeGain {
    return context.gains[0]!
}

describe("stored settings", () => {
    it("start at full volume, unmuted", () => {
        expect(m.mixer.master).toBe(1)
        expect(m.mixer.masterMuted).toBe(false)
        expect(m.channelSettings("mic-any")).toEqual({ volume: 1, muted: false })
    })

    it("are restored, and anything malformed is dropped", async () => {
        localStorage.setItem(
            "racecast.mixer",
            JSON.stringify({
                master: 2,
                masterMuted: "yes",
                channels: {
                    good: { volume: 0.5, muted: true },
                    high: { volume: 7, muted: false },
                    bad: { volume: "x" }
                }
            })
        )
        await load()
        expect(m.mixer.master).toBe(1)
        expect(m.mixer.masterMuted).toBe(false)
        expect(m.mixer.channels).toEqual({ good: { volume: 0.5, muted: true }, high: { volume: 1, muted: false } })
    })

    it("are saved on every change, per microphone name", () => {
        m.setVolume("mic-driver", 0.4)
        m.toggleMute("mic-driver")
        m.setMaster(0.8)
        m.toggleMasterMute()
        expect(JSON.parse(localStorage.getItem("racecast.mixer")!)).toEqual({
            master: 0.8,
            masterMuted: true,
            channels: { "mic-driver": { volume: 0.4, muted: true } }
        })
    })
})

describe("before the sound is enabled", () => {
    it("plays each track in a muted element, with no audio graph yet", () => {
        const track = fakeTrack()
        m.addTrack("mic-driver", track)
        expect(track.attach).toHaveBeenCalledOnce()
        expect(track.element.muted).toBe(true)
        expect(track.element.play).toHaveBeenCalledOnce()
        expect(m.mixer.enabled).toBe(false)
        expect(m.level("mic-driver")).toBe(-Infinity)
    })
})

describe("enableSound", () => {
    it("starts the context and wires source → analyser → gain → master → speakers", async () => {
        m.setVolume("mic-driver", 0.5)
        m.addTrack("mic-driver", fakeTrack())
        await m.enableSound()

        expect(m.mixer.enabled).toBe(true)
        expect(context.resume).toHaveBeenCalled()
        const [source] = context.sources
        const [analyser] = context.analysers
        const gain = context.gains[1]!
        expect(source!.connections).toEqual([analyser])
        expect(analyser!.connections).toEqual([gain])
        expect(gain.connections).toEqual([masterGain()])
        expect(masterGain().connections).toEqual([context.destination])
        expect(gain.gain.value).toBe(0.5)
    })

    it("wires tracks that arrive afterwards", async () => {
        await m.enableSound()
        m.addTrack("mic-late", fakeTrack())
        expect(context.sources).toHaveLength(1)
    })

    it("stays disabled when the browser keeps the context suspended", async () => {
        await m.enableSound()
        context.resumeTo = "suspended"
        context.state = "suspended"
        await m.enableSound()
        expect(m.mixer.enabled).toBe(false)
    })

    it("asks for the button again when the context is interrupted (iOS)", async () => {
        await m.enableSound()
        context.state = "interrupted"
        context.listeners["statechange"]!()
        expect(m.mixer.enabled).toBe(false)
    })

    it("plays through the iPhone's silent switch", async () => {
        const session = { type: "auto" }
        vi.stubGlobal("navigator", { ...navigator, audioSession: session })
        await m.enableSound()
        expect(session.type).toBe("playback")
    })
})

describe("gains", () => {
    beforeEach(async () => {
        m.addTrack("mic-driver", fakeTrack())
        await m.enableSound()
    })

    it("follow the volume and mute of each microphone", () => {
        const gain = context.gains[1]!
        m.setVolume("mic-driver", 0.3)
        expect(gain.gain.value).toBe(0.3)
        m.toggleMute("mic-driver")
        expect(gain.gain.value).toBe(0)
        m.toggleMute("mic-driver")
        expect(gain.gain.value).toBe(0.3)
    })

    it("follow the master volume and mute", () => {
        m.setMaster(0.6)
        expect(masterGain().gain.value).toBe(0.6)
        m.toggleMasterMute()
        expect(masterGain().gain.value).toBe(0)
    })
})

describe("level", () => {
    it("reads the peak in dBFS before the fader", async () => {
        m.addTrack("mic-driver", fakeTrack())
        await m.enableSound()
        m.toggleMute("mic-driver")
        context.analysers[0]!.sample = 0.5
        expect(m.level("mic-driver")).toBeCloseTo(-6.02, 1)
        context.analysers[0]!.sample = 0
        expect(m.level("mic-driver")).toBe(-Infinity)
    })
})

describe("removeTrack", () => {
    it("disconnects and detaches the microphone", async () => {
        const track = fakeTrack()
        m.addTrack("mic-driver", track)
        await m.enableSound()
        m.removeTrack("mic-driver", track)
        expect(context.sources[0]!.disconnect).toHaveBeenCalled()
        expect(track.detach).toHaveBeenCalledWith(track.element)
        expect(m.level("mic-driver")).toBe(-Infinity)
    })

    it("leaves a microphone republished under the same name alone", async () => {
        const old = fakeTrack()
        const replacement = fakeTrack()
        m.addTrack("mic-driver", old)
        m.addTrack("mic-driver", replacement)
        await m.enableSound()
        m.removeTrack("mic-driver", old)
        expect(replacement.detach).not.toHaveBeenCalled()
        context.analysers[0]!.sample = 0.25
        expect(m.level("mic-driver")).toBeCloseTo(-12.04, 1)
    })
})
