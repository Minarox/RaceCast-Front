/*
 * Shared by the token endpoint and the client: every viewer identity starts
 * with this prefix, which is how the client tells viewers from the car when
 * LIVEKIT_CAR_IDENTITY is left empty.
 */
export const VIEWER_PREFIX = "viewer-"

/** What GET /api/token returns. */
export interface TokenResponse {
    url: string
    token: string
}
