import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type * as LiveModule from "@lib/live"
import { telemetry } from "../fixtures"

/*
 * live.ts against a fake livekit-client: a Room that records its handlers so
 * the tests can emit room events, and publications that record subscription
 * requests. This covers how the page reads the room, never the SDK itself.
 */

const fake = vi.hoisted(() => {
    type Handler = (...args: unknown[]) => void

    class FakeRoom {
        handlers = new Map<string, Handler[]>()
        remoteParticipants = new Map<string, FakeParticipant>()
        metadata: string | undefined = undefined
        state = "disconnected"
        connect = vi.fn(async () => {
            this.state = "connected"
        })

        constructor(readonly options: unknown) {
            state.room = this
        }

        on(event: string, handler: Handler): this {
            this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler])
            return this
        }

        emit(event: string, ...args: unknown[]): void {
            for (const handler of this.handlers.get(event) ?? []) handler(...args)
        }
    }

    class FakeParticipant {
        trackPublications = new Map<string, FakePublication>()
        constructor(
            readonly identity: string,
            public attributes: Record<string, string> = {}
        ) {}

        publish(pub: FakePublication): FakePublication {
            this.trackPublications.set(pub.trackSid, pub)
            return pub
        }
    }

    let sids = 0

    class FakePublication {
        trackSid = `TR_${++sids}`
        subscribed = false
        track: unknown = undefined
        setSubscribed = vi.fn((subscribed: boolean) => {
            this.subscribed = subscribed
        })

        constructor(
            readonly trackName: string,
            readonly source: string,
            readonly mimeType?: string
        ) {}

        get isDesired(): boolean {
            return this.subscribed
        }

        get isSubscribed(): boolean {
            return this.subscribed && this.track !== undefined
        }
    }

    class RemoteAudioTrack {}

    const state = { room: undefined as unknown as FakeRoom }
    return { FakeRoom, FakeParticipant, FakePublication, RemoteAudioTrack, state }
})

vi.mock("livekit-client", () => ({
    Room: fake.FakeRoom,
    RemoteAudioTrack: fake.RemoteAudioTrack,
    ConnectionState: { Disconnected: "disconnected", Connected: "connected" },
    DisconnectReason: { UNKNOWN_REASON: 0, CLIENT_INITIATED: 1, SIGNAL_CLOSE: 13 },
    Track: { Source: { Camera: "camera", Microphone: "microphone" } },
    RoomEvent: {
        ParticipantConnected: "participantConnected",
        ParticipantDisconnected: "participantDisconnected",
        ParticipantAttributesChanged: "participantAttributesChanged",
        TrackPublished: "trackPublished",
        TrackUnpublished: "trackUnpublished",
        TrackSubscribed: "trackSubscribed",
        TrackUnsubscribed: "trackUnsubscribed",
        TrackSubscriptionFailed: "trackSubscriptionFailed",
        RoomMetadataChanged: "roomMetadataChanged",
        Reconnecting: "reconnecting",
        SignalReconnecting: "signalReconnecting",
        Reconnected: "reconnected",
        Disconnected: "disconnected"
    }
}))

vi.mock("@lib/mixer", () => ({ addTrack: vi.fn(), removeTrack: vi.fn() }))

type Room = InstanceType<typeof fake.FakeRoom>
type Participant = InstanceType<typeof fake.FakeParticipant>
type Publication = InstanceType<typeof fake.FakePublication>

let l: typeof LiveModule
let room: Room
let fetchMock: ReturnType<typeof vi.fn>

function tokenResponse(): Response {
    return { ok: true, json: async () => ({ url: "wss://live.test", token: "viewer-token" }) } as Response
}

/** Loads a fresh live.ts (a new Room) and joins, as `carIdentity` configures it. */
async function join(carIdentity = "", metadata?: string): Promise<void> {
    vi.resetModules()
    l = await import("@lib/live")
    room = fake.state.room
    room.metadata = metadata
    l.start(carIdentity)
    await vi.waitFor(() => expect(l.live.connection).toBe("connected"))
}

function addParticipant(identity: string, attributes: Record<string, string> = {}): Participant {
    const participant = new fake.FakeParticipant(identity, attributes)
    room.remoteParticipants.set(identity, participant)
    room.emit("participantConnected", participant)
    return participant
}

function publish(participant: Participant, name: string, source: string, mimeType?: string): Publication {
    const pub = participant.publish(new fake.FakePublication(name, source, mimeType))
    room.emit("trackPublished", pub, participant)
    return pub
}

beforeEach(async () => {
    vi.clearAllMocks()
    fetchMock = vi.fn(async () => tokenResponse())
    vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
    vi.useRealTimers()
})

describe("joining", () => {
    it("asks the server for a token and joins without automatic subscriptions", async () => {
        await join()
        expect(fetchMock).toHaveBeenCalledWith("/api/token", { cache: "no-store" })
        expect(room.connect).toHaveBeenCalledWith("wss://live.test", "viewer-token", { autoSubscribe: false })
        expect(room.options).toMatchObject({ adaptiveStream: { pauseVideoInBackground: true } })
    })

    it("reads the metadata already in the room", async () => {
        const doc = telemetry()
        await join("", JSON.stringify(doc))
        expect(l.live.telemetry).toEqual(doc)
        expect(l.live.unsupportedVersion).toBeUndefined()
    })

    it("waits and retries when the token request fails", async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 429 } as Response)
        vi.spyOn(console, "warn").mockImplementation(() => {})
        vi.resetModules()
        l = await import("@lib/live")
        l.start("")
        await vi.waitFor(() => expect(l.live.connection).toBe("waiting"))
        expect(l.live.retryAt).not.toBeNull()
    })
})

describe("the car and the viewers", () => {
    it("takes the participant that is not a viewer for the car", async () => {
        await join()
        addParticipant("viewer-1")
        addParticipant("car")
        addParticipant("viewer-2")
        expect(l.live.carOnline).toBe(true)
        expect(l.live.viewers).toBe(3)
    })

    it("takes only the configured identity for the car when one is set", async () => {
        await join("racecast-car")
        addParticipant("car")
        expect(l.live.carOnline).toBe(false)
        addParticipant("racecast-car")
        expect(l.live.carOnline).toBe(true)
    })

    it("notices the car leaving", async () => {
        await join()
        const car = addParticipant("car")
        publish(car, "cam-front", "camera", "video/AV1")
        room.remoteParticipants.delete("car")
        room.emit("participantDisconnected", car)
        expect(l.live.carOnline).toBe(false)
        expect(l.live.cameras).toEqual([])
        expect(l.live.viewers).toBe(1)
    })
})

describe("tracks", () => {
    it("lists the main camera first, then the others by name", async () => {
        await join()
        const car = addParticipant("car", { main_camera: "cam-main" })
        publish(car, "cam-b", "camera", "video/AV1")
        publish(car, "cam-main", "camera", "video/AV1")
        publish(car, "cam-a", "camera", "video/AV1")
        expect(l.live.mainCamera).toBe("cam-main")
        expect(l.live.cameras.map(c => c.name)).toEqual(["cam-main", "cam-a", "cam-b"])
        expect(l.live.cameras[0]).toMatchObject({ mimeType: "video/AV1", ready: false })
    })

    it("has no main camera when the attribute is absent or empty", async () => {
        await join()
        const car = addParticipant("car")
        expect(l.live.mainCamera).toBeNull()
        car.attributes = { main_camera: "" }
        room.emit("participantAttributesChanged", {}, car)
        expect(l.live.mainCamera).toBeNull()
    })

    it("follows a new main camera", async () => {
        await join()
        const car = addParticipant("car", { main_camera: "cam-a" })
        car.attributes = { main_camera: "cam-b" }
        room.emit("participantAttributesChanged", { main_camera: "cam-b" }, car)
        expect(l.live.mainCamera).toBe("cam-b")
    })

    it("subscribes to every microphone", async () => {
        await join()
        const car = addParticipant("car")
        const mic = publish(car, "mic-driver", "microphone")
        expect(mic.setSubscribed).toHaveBeenCalledWith(true)
        expect(l.live.microphones).toEqual([{ name: "mic-driver", ready: false }])
    })

    it("subscribes only to the cameras the page shows", async () => {
        await join()
        const car = addParticipant("car")
        const front = publish(car, "cam-front", "camera")
        const rear = publish(car, "cam-rear", "camera")
        expect(front.setSubscribed).not.toHaveBeenCalled()

        l.setWantedCameras(["cam-rear"])
        expect(rear.setSubscribed).toHaveBeenCalledExactlyOnceWith(true)
        expect(front.setSubscribed).not.toHaveBeenCalled()

        l.setWantedCameras(["cam-rear"])
        expect(rear.setSubscribed).toHaveBeenCalledOnce()

        l.setWantedCameras(["cam-front"])
        expect(rear.setSubscribed).toHaveBeenLastCalledWith(false)
        expect(front.setSubscribed).toHaveBeenCalledWith(true)
    })

    it("subscribes to a wanted camera as soon as it is published", async () => {
        await join()
        l.setWantedCameras(["cam-late"])
        const car = addParticipant("car")
        const late = publish(car, "cam-late", "camera")
        expect(late.setSubscribed).toHaveBeenCalledWith(true)
    })

    it("gives a video track only once it is subscribed", async () => {
        await join()
        const car = addParticipant("car")
        const front = publish(car, "cam-front", "camera")
        expect(l.videoTrack("cam-front")).toBeUndefined()
        l.setWantedCameras(["cam-front"])
        front.track = { kind: "video" }
        room.emit("trackSubscribed", front.track, front, car)
        expect(l.videoTrack("cam-front")).toBe(front.track)
        expect(l.live.cameras[0]!.ready).toBe(true)
    })

    it("hands the car's microphones to the mixer, and takes them back", async () => {
        const mixer = await import("@lib/mixer")
        await join()
        const car = addParticipant("car")
        const mic = publish(car, "mic-driver", "microphone")
        const track = new fake.RemoteAudioTrack()
        mic.track = track
        room.emit("trackSubscribed", track, mic, car)
        expect(mixer.addTrack).toHaveBeenCalledWith("mic-driver", track)
        room.emit("trackUnsubscribed", track, mic, car)
        expect(mixer.removeTrack).toHaveBeenCalledWith("mic-driver", track)
    })

    it("releases the microphones when the connection is lost", async () => {
        const mixer = await import("@lib/mixer")
        await join()
        const car = addParticipant("car")
        publish(car, "mic-driver", "microphone")
        vi.useFakeTimers()
        room.emit("disconnected", 13)
        expect(mixer.removeTrack).toHaveBeenCalledWith("mic-driver")
    })
})

describe("telemetry", () => {
    it("replaces the document on every update", async () => {
        await join()
        room.emit("roomMetadataChanged", JSON.stringify(telemetry("2026-10-05T12:00:00.000Z")))
        room.emit("roomMetadataChanged", JSON.stringify(telemetry("2026-10-05T12:00:01.000Z")))
        expect(l.live.telemetry?.ts).toBe("2026-10-05T12:00:01.000Z")
        expect(Object.isFrozen(l.live.telemetry)).toBe(true)
    })

    it("reports an unknown version and keeps the last good document", async () => {
        await join()
        room.emit("roomMetadataChanged", JSON.stringify(telemetry()))
        room.emit("roomMetadataChanged", JSON.stringify({ v: 2, ts: "x" }))
        expect(l.live.unsupportedVersion).toBe(2)
        expect(l.live.telemetry?.v).toBe(1)
        room.emit("roomMetadataChanged", JSON.stringify(telemetry()))
        expect(l.live.unsupportedVersion).toBeUndefined()
    })

    it("measures the car's clock offset on live updates only", async () => {
        // Present at join: may be old, so it does not count.
        await join("", JSON.stringify(telemetry("2026-10-05T11:00:00.000Z")))
        expect(l.live.clockOffset).toBe(0)

        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(Date.parse("2026-10-05T12:00:05.000Z"))
        addParticipant("car")
        // Pushed while the car is online: the car's clock is 3 s behind (plus the network delay).
        room.emit("roomMetadataChanged", JSON.stringify(telemetry("2026-10-05T12:00:02.000Z")))
        expect(l.live.clockOffset).toBe(3_000)
        vi.setSystemTime(Date.parse("2026-10-05T12:00:06.500Z"))
        room.emit("roomMetadataChanged", JSON.stringify(telemetry("2026-10-05T12:00:03.000Z")))
        expect(l.live.clockOffset).toBe(3_000)

        expect(l.localTime("2026-10-05T12:00:03.000Z")).toBe(Date.parse("2026-10-05T12:00:06.000Z"))
        expect(l.localTime(null)).toBeNull()
        expect(l.localTime("garbage")).toBeNull()
    })
})

describe("connection", () => {
    it("shows LiveKit's own reconnections", async () => {
        await join()
        room.emit("reconnecting")
        expect(l.live.connection).toBe("reconnecting")
        room.emit("reconnected")
        expect(l.live.connection).toBe("connected")
    })

    it("rejoins with a new token after a disconnection, backing off", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {})
        await join()
        vi.useFakeTimers()
        fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response)

        const delays: number[] = []
        room.emit("disconnected", 13)
        for (let i = 0; i < 6; i++) {
            expect(l.live.connection).toBe("waiting")
            const delay = l.live.retryAt! - Date.now()
            delays.push(delay)
            await vi.advanceTimersByTimeAsync(delay)
        }
        expect(delays).toEqual([1_000, 2_000, 5_000, 10_000, 20_000, 20_000])
        expect(fetchMock).toHaveBeenCalledTimes(1 + 6)

        fetchMock.mockResolvedValue(tokenResponse())
        await vi.advanceTimersByTimeAsync(20_000)
        expect(l.live.connection).toBe("connected")
    })

    it("does not rejoin after leaving on purpose", async () => {
        await join()
        room.emit("disconnected", 1)
        expect(l.live.connection).toBe("connected")
        expect(l.live.retryAt).toBeNull()
    })

    it("retries at once on demand, only while waiting", async () => {
        await join()
        l.retryNow()
        expect(fetchMock).toHaveBeenCalledTimes(1)

        vi.useFakeTimers()
        room.emit("disconnected", 13)
        l.retryNow()
        await vi.advanceTimersByTimeAsync(0)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(l.live.connection).toBe("connected")
    })
})
