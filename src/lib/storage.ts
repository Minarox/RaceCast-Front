/*
 * Per-viewer preferences in localStorage. Storage can be missing or throw
 * (private browsing, blocked site data): every access is guarded, and the app
 * works the same with defaults.
 */

const PREFIX = "racecast."

export function load<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(PREFIX + key)
        return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
        return fallback
    }
}

export function save(key: string, value: unknown): void {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
        // Preferences are a convenience; losing them is fine.
    }
}
