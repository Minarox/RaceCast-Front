import type { APIRoute } from "astro"
import { AccessToken, RoomConfiguration } from "livekit-server-sdk"
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_ROOM, LIVEKIT_URL } from "astro:env/server"
import { VIEWER_PREFIX, type TokenResponse } from "@lib/viewer"

/*
 * Issues a subscribe-only LiveKit token to any visitor (the stream is public).
 *
 * The token only needs to be valid when joining: once connected, the LiveKit
 * server keeps refreshing it, and a viewer that loses the connection entirely
 * asks for a new one. Viewers are not hidden, so every client can count them.
 * The token also carries the room's configuration, in case this join creates
 * the room (see ROOM_TIMEOUT_S).
 */

const TOKEN_TTL = "2h"

/*
 * Same timeouts as the car gives the room (PROTOCOL.md, "Room and
 * participant"). After a day without the car the room is gone and the next
 * viewer's join recreates it; the server applies this configuration only to a
 * room created by that join, and the car cannot change the timeouts of a room
 * that already exists. Without it, the room would close soon after the car
 * leaves, taking the last known state with it.
 */
const ROOM_TIMEOUT_S = 86_400

/*
 * Per-IP limit, generous on purpose: trackside spectators often share one
 * carrier NAT address, and a viewer on a flaky connection re-requests a token
 * on each full reconnect. This only stops a client stuck in a loop.
 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 60

const requests = new Map<string, { count: number; reset: number }>()

function limited(ip: string, now: number): boolean {
    // Drop expired windows once the map grows, so it cannot grow unbounded.
    if (requests.size > 10_000) {
        for (const [key, entry] of requests) {
            if (entry.reset <= now) requests.delete(key)
        }
    }

    const entry = requests.get(ip)
    if (!entry || entry.reset <= now) {
        requests.set(ip, { count: 1, reset: now + WINDOW_MS })
        return false
    }
    entry.count++
    return entry.count > MAX_PER_WINDOW
}

export const GET: APIRoute = async ({ clientAddress }) => {
    const headers = { "Cache-Control": "no-store" }

    if (limited(clientAddress, Date.now())) {
        return new Response("Too many requests", {
            status: 429,
            headers: { ...headers, "Retry-After": String(WINDOW_MS / 1000) }
        })
    }

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: VIEWER_PREFIX + crypto.randomUUID(),
        ttl: TOKEN_TTL
    })
    token.addGrant({
        room: LIVEKIT_ROOM,
        roomJoin: true,
        canSubscribe: true,
        canPublish: false,
        canPublishData: false,
        canUpdateOwnMetadata: false,
        hidden: false
    })
    token.roomConfig = new RoomConfiguration({
        emptyTimeout: ROOM_TIMEOUT_S,
        departureTimeout: ROOM_TIMEOUT_S
    })

    const body: TokenResponse = { url: LIVEKIT_URL, token: await token.toJwt() }
    return Response.json(body, { headers })
}
