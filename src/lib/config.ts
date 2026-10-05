/** Runtime settings passed by the page to the client app (see pages/index.astro). */
export interface AppConfig {
    /** Identity of the car's participant; empty to take the one non-viewer. */
    carIdentity: string
    tiles: {
        url: string
        attribution: string
        maxZoom: number
        darken: boolean
    }
}
