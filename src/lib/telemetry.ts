/*
 * The room metadata document, as defined by RaceCast-Emitter's
 * docs/PROTOCOL.md. That file is the contract: keep these types in step with
 * it, and bump SUPPORTED_VERSION only together with the code that handles the
 * new format.
 *
 * A section appears after its first sample; inside a section every field is
 * present and `null` means "value unavailable".
 */

export const SUPPORTED_VERSION = 1

export interface DeviceState {
    name: string
    main?: boolean
    streaming: boolean
}

export interface CarState {
    recording: boolean
    main_camera: string | null
    cameras: DeviceState[]
    microphones: DeviceState[]
}

export interface Gps {
    ts: string
    fix: "none" | "2d" | "3d" | null
    lat: number | null
    lon: number | null
    alt_m: number | null
    speed_kmh: number | null
    course_deg: number | null
    satellites: number | null
    hdop: number | null
    gps_time: string | null
}

export interface Modem {
    ts: string
    state: string | null
    access_tech: string | null
    operator: string | null
    signal_quality: number | null
    lte_rssi_dbm: number | null
    lte_rsrp_dbm: number | null
    lte_rsrq_db: number | null
    lte_sinr_db: number | null
    nr_rsrp_dbm: number | null
    nr_rsrq_db: number | null
    nr_sinr_db: number | null
    cell_id: string | null
    tac: string | null
    ip_connected: boolean | null
}

export interface Ups {
    ts: string
    load_voltage_v: number | null
    current_a: number | null
    power_w: number | null
    percent: number | null
}

export interface SystemInfo {
    ts: string
    cpu_temp_c: number | null
    gpu_temp_c: number | null
    tj_temp_c: number | null
    cpu_load_pct: number | null
    gpu_load_pct: number | null
    ram_used_mb: number | null
    nvenc_mhz: number | null
    disk_free_gb: number | null
    recording: boolean | null
    cameras: number | null
    mics: number | null
    livekit_connected: boolean | null
    power_mode: string | null
}

export interface Telemetry {
    v: number
    ts: string
    car?: CarState
    gps?: Gps
    modem?: Modem
    ups?: Ups
    system?: SystemInfo
}

export type ParseResult = { ok: true; telemetry: Telemetry } | { ok: false; version: number | null }

/** Parses the room metadata. An empty string (no document yet) is not an error. */
export function parseTelemetry(raw: string): ParseResult | null {
    if (!raw) return null
    let doc: unknown
    try {
        doc = JSON.parse(raw)
    } catch {
        return { ok: false, version: null }
    }
    if (typeof doc !== "object" || doc === null) return { ok: false, version: null }
    const version = (doc as { v?: unknown }).v
    if (version !== SUPPORTED_VERSION) {
        return { ok: false, version: typeof version === "number" ? version : null }
    }
    return { ok: true, telemetry: doc as Telemetry }
}

/*
 * How long after its timestamp a section is shown as stale: about three
 * sampling periods (gps 1 s, ups 2 s, modem and system 5 s).
 */
export const STALE_AFTER_MS = {
    gps: 5_000,
    ups: 8_000,
    modem: 16_000,
    system: 16_000
} as const

export type Level = "ok" | "warn" | "crit" | "none"

/*
 * Alert thresholds chosen with the user on 2026-10-05. Values that are not a
 * concern (or unknown) are "ok"/"none" so the UI stays neutral.
 */
function below(value: number | null | undefined, warn: number, crit: number): Level {
    if (value === null || value === undefined) return "none"
    if (value < crit) return "crit"
    if (value < warn) return "warn"
    return "ok"
}

function above(value: number | null | undefined, warn: number, crit: number): Level {
    if (value === null || value === undefined) return "none"
    if (value > crit) return "crit"
    if (value > warn) return "warn"
    return "ok"
}

export const levels = {
    battery: (percent: number | null | undefined): Level => below(percent, 25, 10),
    junction: (celsius: number | null | undefined): Level => above(celsius, 80, 90),
    signal: (percent: number | null | undefined): Level => below(percent, 30, 15),
    disk: (gigabytes: number | null | undefined): Level => below(gigabytes, 10, 2)
}
