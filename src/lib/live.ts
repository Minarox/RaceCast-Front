import { reactive } from "vue"
import {
    ConnectionState,
    DisconnectReason,
    RemoteAudioTrack,
    Room,
    RoomEvent,
    Track,
    type RemoteParticipant,
    type RemoteTrack,
    type RemoteTrackPublication
} from "livekit-client"
import { VIEWER_PREFIX, type TokenResponse } from "@lib/viewer"
import { parseTelemetry, type Telemetry } from "@lib/telemetry"
import { record } from "@lib/history"
import { addTrack, removeTrack } from "@lib/mixer"

/*
 * The single LiveKit connection of the page, and the reactive state the UI
 * renders from.
 *
 * LiveKit objects (Room, publications, tracks) never go into Vue reactivity:
 * a proxy breaks their private fields and event emitters. The reactive state
 * holds plain descriptors keyed by track name; components fetch the real
 * track with `videoTrack(name)` when a descriptor says it is ready.
 *
 * Nothing is subscribed automatically: microphones always are (64 kbit/s
 * each), cameras only when the UI shows them (`setWantedCameras`), since each
 * one costs the viewer about 1.2 Mbit/s and there is no simulcast to fall back
 * on.
 */

/*
 * - connecting:   fetching a token / joining
 * - connected:    in the room (the car may still be offline)
 * - reconnecting: LiveKit is resuming a dropped connection by itself
 * - waiting:      disconnected for good; a new attempt is scheduled at `retryAt`
 */
export type Connection = "connecting" | "connected" | "reconnecting" | "waiting"

export interface CameraInfo {
    name: string
    /** Changes when the car republishes the camera under the same name. */
    sid: string
    /** Track subscribed and media flowing: `videoTrack(name)` returns it. */
    ready: boolean
    mimeType: string | undefined
    /** Published dimensions, when the server reports them. */
    width: number | undefined
    height: number | undefined
}

export interface MicrophoneInfo {
    name: string
    ready: boolean
}

export const live = reactive({
    connection: "connecting" as Connection,
    retryAt: null as number | null,
    carOnline: false,
    /** Viewers in the room, this one included. */
    viewers: 1,
    /** Track name of the car's main camera, or null (attribute absent: none designated). */
    mainCamera: null as string | null,
    /** Cameras published by the car: main camera first, then by name. */
    cameras: [] as CameraInfo[],
    microphones: [] as MicrophoneInfo[],
    /** Last metadata document (frozen; replaced as a whole on each update). */
    telemetry: null as Readonly<Telemetry> | null,
    /** When the last document arrived, browser clock. */
    telemetryAt: null as number | null,
    /** Set when the metadata has a format this page does not understand. */
    unsupportedVersion: undefined as number | null | undefined,
    /** Browser clock minus car clock, in ms (see `localTime`). */
    clockOffset: 0
})

const room = new Room({
    // No simulcast on the car, so adaptive stream cannot pick lower layers;
    // it still pauses videos that are off-screen or in a background tab.
    adaptiveStream: { pauseVideoInBackground: true },
    disconnectOnPageLeave: true
})

// Handy from the browser console while developing.
if (import.meta.env.DEV) Object.assign(window, { racecastRoom: room })

let carIdentity = ""
let wantedCameras = new Set<string>()
let attempt = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined

function isCar(participant: RemoteParticipant): boolean {
    return carIdentity ? participant.identity === carIdentity : !participant.identity.startsWith(VIEWER_PREFIX)
}

function car(): RemoteParticipant | undefined {
    for (const participant of room.remoteParticipants.values()) {
        if (isCar(participant)) return participant
    }
    return undefined
}

function publications(source: Track.Source): RemoteTrackPublication[] {
    const participant = car()
    if (!participant) return []
    return [...participant.trackPublications.values()].filter(pub => pub.source === source)
}

/** The car's camera publication with this track name. */
function cameraPublication(name: string): RemoteTrackPublication | undefined {
    return publications(Track.Source.Camera).find(pub => pub.trackName === name)
}

export function videoTrack(name: string): RemoteTrack | undefined {
    const pub = cameraPublication(name)
    return pub?.isSubscribed ? pub.track : undefined
}

/** Subscribes to exactly these cameras (by track name), and unsubscribes the rest. */
export function setWantedCameras(names: string[]): void {
    wantedCameras = new Set(names)
    applySubscriptions()
}

function applySubscriptions(): void {
    for (const pub of publications(Track.Source.Camera)) {
        const want = wantedCameras.has(pub.trackName)
        if (pub.isDesired !== want) pub.setSubscribed(want)
    }
    for (const pub of publications(Track.Source.Microphone)) {
        if (!pub.isDesired) pub.setSubscribed(true)
    }
}

/** Rebuilds the reactive view of the room. Cheap enough to run on every event. */
function sync(): void {
    const participant = car()
    live.carOnline = participant !== undefined
    live.viewers = room.remoteParticipants.size - (participant ? 1 : 0) + 1
    live.mainCamera = participant?.attributes["main_camera"] || null

    const main = live.mainCamera
    live.cameras = publications(Track.Source.Camera)
        .map(pub => ({
            name: pub.trackName,
            sid: pub.trackSid,
            ready: pub.isSubscribed && pub.track !== undefined,
            mimeType: pub.mimeType,
            width: pub.dimensions?.width,
            height: pub.dimensions?.height
        }))
        .sort((a, b) => Number(b.name === main) - Number(a.name === main) || a.name.localeCompare(b.name))
    live.microphones = publications(Track.Source.Microphone)
        .map(pub => ({ name: pub.trackName, ready: pub.isSubscribed && pub.track !== undefined }))
        .sort((a, b) => a.name.localeCompare(b.name))

    applySubscriptions()
}

/*
 * The car stamps samples with its own clock, which may disagree with the
 * viewer's. Documents that arrive live (pushed while the car is online) are
 * at most a moment old, so the smallest "arrival − build time" seen recently
 * is the clock offset plus the shortest network delay. Ages are computed on
 * the viewer's clock after correcting by it.
 */
const offsets: number[] = []

function measureOffset(rootTs: string): void {
    const built = Date.parse(rootTs)
    if (Number.isNaN(built)) return
    offsets.push(Date.now() - built)
    if (offsets.length > 30) offsets.shift()
    live.clockOffset = Math.min(...offsets)
}

/** A car timestamp converted to the viewer's clock (epoch ms), or null. */
export function localTime(iso: string | null | undefined): number | null {
    if (!iso) return null
    const t = Date.parse(iso)
    return Number.isNaN(t) ? null : t + live.clockOffset
}

function readMetadata(raw: string | undefined, pushed: boolean): void {
    const result = parseTelemetry(raw ?? "")
    if (!result) return
    if (!result.ok) {
        live.unsupportedVersion = result.version
        return
    }
    live.unsupportedVersion = undefined
    if (pushed && car()) measureOffset(result.telemetry.ts)
    live.telemetry = Object.freeze(result.telemetry)
    live.telemetryAt = Date.now()
    record(result.telemetry)
}

function onTrackSubscribed(track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant): void {
    if (isCar(participant) && track instanceof RemoteAudioTrack && pub.source === Track.Source.Microphone) {
        addTrack(pub.trackName, track)
    }
    sync()
}

function onTrackUnsubscribed(track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant): void {
    if (isCar(participant) && track instanceof RemoteAudioTrack) removeTrack(pub.trackName, track)
    sync()
}

room.on(RoomEvent.ParticipantConnected, sync)
    .on(RoomEvent.ParticipantDisconnected, sync)
    .on(RoomEvent.ParticipantAttributesChanged, sync)
    .on(RoomEvent.TrackPublished, sync)
    .on(RoomEvent.TrackUnpublished, sync)
    .on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    .on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed)
    .on(RoomEvent.TrackSubscriptionFailed, (sid, participant, reason) => {
        console.warn("subscription failed", sid, participant?.identity, reason)
    })
    .on(RoomEvent.RoomMetadataChanged, metadata => readMetadata(metadata, true))
    .on(RoomEvent.Reconnecting, () => (live.connection = "reconnecting"))
    .on(RoomEvent.SignalReconnecting, () => (live.connection = "reconnecting"))
    .on(RoomEvent.Reconnected, () => {
        live.connection = "connected"
        sync()
    })
    .on(RoomEvent.Disconnected, reason => {
        for (const microphone of live.microphones) removeTrack(microphone.name)
        sync()
        if (reason !== DisconnectReason.CLIENT_INITIATED) scheduleRetry()
    })

/** Delay before the next attempt: 1 s, 2 s, 5 s, 10 s, then every 20 s. */
function backoff(): number {
    const steps = [1_000, 2_000, 5_000, 10_000]
    return steps[attempt] ?? 20_000
}

function scheduleRetry(): void {
    clearTimeout(retryTimer)
    const delay = backoff()
    attempt++
    live.connection = "waiting"
    live.retryAt = Date.now() + delay
    retryTimer = setTimeout(connect, delay)
}

async function connect(): Promise<void> {
    clearTimeout(retryTimer)
    live.connection = "connecting"
    live.retryAt = null
    try {
        const response = await fetch("/api/token", { cache: "no-store" })
        if (!response.ok) throw new Error(`token request failed: ${response.status}`)
        const { url, token } = (await response.json()) as TokenResponse
        await room.connect(url, token, { autoSubscribe: false })
        attempt = 0
        live.connection = "connected"
        readMetadata(room.metadata, false)
        sync()
    } catch (error) {
        console.warn("could not join the room", error)
        scheduleRetry()
    }
}

/** Retries now, e.g. from a "Réessayer" button or when the device is back online. */
export function retryNow(): void {
    if (live.connection === "waiting") {
        attempt = 0
        void connect()
    }
}

let started = false

export function start(identity: string): void {
    if (started) return
    started = true
    carIdentity = identity
    window.addEventListener("online", retryNow)
    // The room disconnects when the page is hidden for navigation; a page
    // restored from the back/forward cache must join again.
    window.addEventListener("pageshow", event => {
        if (event.persisted && room.state === ConnectionState.Disconnected) {
            attempt = 0
            void connect()
        }
    })
    void connect()
}
