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

export interface Location {
    alt: number | null
    hdop: number | null
    lat: number | null
    lon: number | null
    sat: number | null
    speed: number | null
}

export const defaultLocation: Location = {
    alt: null,
    hdop: null,
    lat: null,
    lon: null,
    sat: null,
    speed: null
}

export interface Modem {
    signal: number | null
    tech: string[] | null
}

export const defaultModem: Modem = {
    signal: null,
    tech: null
}

export interface System {
    fan: number | null
    load: number | null
    temp: number | null
    power: number | null
}

export const defaultSystem: System = {
    fan: null,
    load: null,
    temp: null,
    power: null
}

export interface UPS {
    capa: number | null
    volt: number | null
    charge: boolean
}

export const defaultUPS: UPS = {
    capa: null,
    volt: null,
    charge: false
}

export interface Metadata {
    location: Location
    modem: Modem
    system: System
    temp: number | null
    timestamp: number | null
    ups: UPS
}

export const defaultMetadata: Metadata = {
    location: defaultLocation,
    modem: defaultModem,
    system: defaultSystem,
    temp: null,
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
