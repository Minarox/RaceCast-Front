import DefaultSettings from "@assets/settings.json"

export type Settings = typeof DefaultSettings

export enum Position {
    LEFT = "left",
    RIGHT = "right"
}

export interface Token {
    domain: string
    room: string
    identity: string
    token: string
    validity: string
    publisherIdentity: string
    timestamp: number
}

export interface Modem {
    alt: number | null
    hdop: number | null
    lat: number | null
    lon: number | null
    sat: number | null
    signal: number | null
    spd: number | null
    tech: string | null
}

export const defaultModem: Modem = {
    alt: null,
    hdop: null,
    lat: null,
    lon: null,
    sat: null,
    signal: null,
    spd: null,
    tech: null
}

export interface UPS {
    a: number | null
    p: number | null
    v: number | null
    w: number | null
}

export const defaultUPS: UPS = {
    a: null,
    p: null,
    v: null,
    w: null
}

export interface Metadata {
    modem: Modem
    timestamp: number | null
    ups: UPS
}

export const defaultMetadata: Metadata = {
    modem: defaultModem,
    timestamp: null,
    ups: defaultUPS
}

export enum Event {
    LOCAL_STATUS = "local-status",
    REMOTE_STATUS = "remote-status",
    VIEWERS = "viewers",
    CAMERAS = "cameras",
    MICROPHONES = "microphones",
    METADATA = "metadata",
    CONNECT = "connect",
    RESEND = "resend",
    RESUME_AUDIO = "resume-audio",
    NEED_USER_INTERACTION = "need-user-interaction",
    HIDE_AUDIO_TRIGGER = "hide-audio-trigger",
    SHOW_SETTINGS = "show-settings",
    SETTINGS = "settings"
}

export enum State {
    CONNECTING = "connecting",
    CONNECTED = "connected",
    RECONNECTING = "reconnecting",
    DISCONNECTED = "disconnected"
}

export function getStateString(state: State): string {
    switch (state) {
        case State.CONNECTING:
            return "Connection..."
        case State.CONNECTED:
            return "Connecté"
        case State.RECONNECTING:
            return "Reconnexion..."
        case State.DISCONNECTED:
            return "Déconnecté"
        default:
            return "Inconnu"
    }
}

export function dispatchEvent(event: Event, data?: any): void {
    document.dispatchEvent(
        new CustomEvent(event, { detail: data })
    )
}

export function getSettings(): Settings {
    return JSON.parse(window.localStorage.getItem("settings") || JSON.stringify(DefaultSettings))
}
