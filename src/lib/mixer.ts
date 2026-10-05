import { reactive } from "vue"
import type { RemoteAudioTrack } from "livekit-client"
import { load, save } from "@lib/storage"

/*
 * Audio mixer on the Web Audio API. Per microphone:
 *
 *   track ─▶ source ─▶ analyser (VU meter, pre-fader) ─▶ gain ─▶ master ─▶ speakers
 *
 * The meter sits before the fader so a muted microphone still shows that it
 * picks something up.
 *
 * Each track is also attached to a muted <audio> element that is never shown:
 * Chrome only feeds a remote WebRTC stream into Web Audio while a media element
 * is playing it. The element is muted, so it autoplays without a gesture.
 *
 * Browsers only start an AudioContext after a user gesture: nothing is audible
 * until `enableSound()` runs from a click or tap, and the UI offers a button
 * until then.
 *
 * Volumes and mutes are kept per microphone name, so they survive reloads and
 * a microphone that drops out and comes back.
 */

interface ChannelSettings {
    volume: number
    muted: boolean
}

interface Settings {
    master: number
    masterMuted: boolean
    channels: Record<string, ChannelSettings>
}

const STORAGE_KEY = "mixer"
const DEFAULT_CHANNEL: ChannelSettings = { volume: 1, muted: false }

/** Stored settings, ignoring anything malformed (storage is user-editable). */
function stored(): Settings {
    const raw = load<Partial<Settings> | null>(STORAGE_KEY, null)
    const channels: Record<string, ChannelSettings> = {}
    if (raw && typeof raw.channels === "object" && raw.channels !== null) {
        for (const [name, value] of Object.entries(raw.channels)) {
            if (typeof value?.volume === "number" && typeof value.muted === "boolean") {
                channels[name] = { volume: Math.min(1, Math.max(0, value.volume)), muted: value.muted }
            }
        }
    }
    return {
        master: typeof raw?.master === "number" ? Math.min(1, Math.max(0, raw.master)) : 1,
        masterMuted: raw?.masterMuted === true,
        channels
    }
}

export const mixer = reactive({
    /** The AudioContext runs: sound is audible (unless muted). */
    enabled: false,
    ...stored()
})

interface Channel {
    track: RemoteAudioTrack
    element: HTMLMediaElement
    source?: MediaStreamAudioSourceNode
    analyser?: AnalyserNode
    gain?: GainNode
    buffer?: Float32Array<ArrayBuffer>
}

const channels = new Map<string, Channel>()

let context: AudioContext | null = null
let master: GainNode | null = null

function persist(): void {
    save(STORAGE_KEY, { master: mixer.master, masterMuted: mixer.masterMuted, channels: mixer.channels })
}

export function channelSettings(name: string): ChannelSettings {
    return mixer.channels[name] ?? DEFAULT_CHANNEL
}

function applyGain(name: string): void {
    const channel = channels.get(name)
    if (!channel?.gain || !context) return
    const { volume, muted } = channelSettings(name)
    channel.gain.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.02)
}

function applyMaster(): void {
    if (!master || !context) return
    master.gain.setTargetAtTime(mixer.masterMuted ? 0 : mixer.master, context.currentTime, 0.02)
}

function connect(name: string, channel: Channel): void {
    if (!context || !master || channel.source) return
    channel.source = context.createMediaStreamSource(new MediaStream([channel.track.mediaStreamTrack]))
    channel.analyser = context.createAnalyser()
    channel.analyser.fftSize = 1024
    channel.buffer = new Float32Array(channel.analyser.fftSize)
    channel.gain = context.createGain()
    channel.source.connect(channel.analyser)
    channel.analyser.connect(channel.gain)
    channel.gain.connect(master)
    const { volume, muted } = channelSettings(name)
    channel.gain.gain.value = muted ? 0 : volume
}

function disconnect(channel: Channel): void {
    channel.source?.disconnect()
    channel.analyser?.disconnect()
    channel.gain?.disconnect()
    delete channel.source
    delete channel.analyser
    delete channel.gain
    delete channel.buffer
}

/** Called by the room when a microphone track is subscribed. */
export function addTrack(name: string, track: RemoteAudioTrack): void {
    removeTrack(name)
    // attach() unmutes the element and tries to play it, which fails before a
    // gesture: mute it and play again, muted playback is always allowed.
    const element = track.attach()
    element.muted = true
    element.play().catch(() => {})
    const channel: Channel = { track, element }
    channels.set(name, channel)
    connect(name, channel)
}

/**
 * Called by the room when a microphone track goes away. With `track`, only
 * removes the channel if it still plays that track (a microphone republished
 * under the same name may already have replaced it).
 */
export function removeTrack(name: string, track?: RemoteAudioTrack): void {
    const channel = channels.get(name)
    if (!channel || (track && channel.track !== track)) return
    disconnect(channel)
    channel.track.detach(channel.element)
    channels.delete(name)
}

/**
 * Starts the sound. Must run inside a user gesture (click, tap, key press):
 * that is the only moment browsers let an AudioContext start.
 */
export async function enableSound(): Promise<void> {
    if (!context) {
        context = new AudioContext({ latencyHint: "playback" })
        master = context.createGain()
        master.connect(context.destination)
        master.gain.value = mixer.masterMuted ? 0 : mixer.master
        // iOS: play through the silent switch, like a video app does.
        const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
        if (session) session.type = "playback"
        context.addEventListener("statechange", () => {
            // iOS suspends or "interrupts" the context (call, lock screen):
            // show the button again so a tap can resume it.
            mixer.enabled = context?.state === "running"
        })
        for (const [name, channel] of channels) connect(name, channel)
    }
    try {
        await context.resume()
    } catch {
        // Still suspended: `enabled` stays false and the button stays.
    }
    mixer.enabled = context.state === "running"
}

export function setVolume(name: string, volume: number): void {
    mixer.channels[name] = { ...channelSettings(name), volume }
    applyGain(name)
    persist()
}

export function toggleMute(name: string): void {
    const current = channelSettings(name)
    mixer.channels[name] = { ...current, muted: !current.muted }
    applyGain(name)
    persist()
}

export function setMaster(volume: number): void {
    mixer.master = volume
    applyMaster()
    persist()
}

export function toggleMasterMute(): void {
    mixer.masterMuted = !mixer.masterMuted
    applyMaster()
    persist()
}

/**
 * Peak level of a microphone over the last analyser window, in dBFS
 * (0 = full scale), or -Infinity when silent or not measurable yet.
 */
export function level(name: string): number {
    const channel = channels.get(name)
    if (!channel?.analyser || !channel.buffer) return -Infinity
    channel.analyser.getFloatTimeDomainData(channel.buffer)
    let peak = 0
    for (const sample of channel.buffer) {
        const magnitude = Math.abs(sample)
        if (magnitude > peak) peak = magnitude
    }
    return peak > 0 ? 20 * Math.log10(peak) : -Infinity
}
