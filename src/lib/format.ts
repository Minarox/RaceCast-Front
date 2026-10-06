/* French number and duration formatting for the UI. `null` renders as a dash. */

const DASH = "—"

const formatters = new Map<number, Intl.NumberFormat>()

function formatter(digits: number): Intl.NumberFormat {
    let f = formatters.get(digits)
    if (!f) {
        f = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
        formatters.set(digits, f)
    }
    return f
}

/** `12.492` with 1 digit → "12,5"; null → "—". The unit is appended with a narrow no-break space. */
export function num(value: number | null | undefined, digits = 0, unit = ""): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return DASH
    const text = formatter(digits).format(value)
    return unit ? `${text}\u202f${unit}` : text
}

export function text(value: string | null | undefined): string {
    return value ? value : DASH
}

/** Age of a timestamp in words: "à l'instant", "il y a 12 s", "il y a 3 min", "il y a 2 h 05". */
export function ago(from: number | null | undefined, now: number): string {
    if (from === null || from === undefined || !Number.isFinite(from)) return "jamais"
    const seconds = Math.max(0, Math.round((now - from) / 1000))
    if (seconds < 2) return "à l'instant"
    if (seconds < 60) return `il y a ${seconds}\u00a0s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `il y a ${minutes}\u00a0min`
    const hours = Math.floor(minutes / 60)
    if (hours < 48) return `il y a ${hours}\u00a0h\u00a0${String(minutes % 60).padStart(2, "0")}`
    return `il y a ${Math.floor(hours / 24)}\u00a0j`
}

/** Parses an ISO 8601 timestamp to epoch milliseconds, or null. */
export function time(iso: string | null | undefined): number | null {
    if (!iso) return null
    const t = Date.parse(iso)
    return Number.isNaN(t) ? null : t
}

const clock = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

/** Local wall-clock time of an ISO timestamp, "14:34:25". */
export function hour(iso: string | null | undefined): string {
    const t = time(iso)
    return t === null ? DASH : clock.format(t)
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]

/** Heading in degrees with its compass point: "245° SO". */
export function heading(degrees: number | null | undefined): string {
    if (degrees === null || degrees === undefined || !Number.isFinite(degrees)) return DASH
    const point = COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]
    return `${Math.round(degrees)}°\u00a0${point}`
}

/** Coordinates as "48,11730° N 11,51667° E". */
export function position(lat: number | null | undefined, lon: number | null | undefined): string {
    if (lat === null || lat === undefined || lon === null || lon === undefined) return DASH
    const ns = lat >= 0 ? "N" : "S"
    const ew = lon >= 0 ? "E" : "O"
    return `${num(Math.abs(lat), 5)}°\u00a0${ns} ${num(Math.abs(lon), 5)}°\u00a0${ew}`
}
