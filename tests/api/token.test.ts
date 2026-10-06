// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { APIContext } from "astro"
import { TokenVerifier } from "livekit-server-sdk"
import type { TokenResponse } from "@lib/viewer"

// Test credentials only: the real .env is never read.
vi.mock("astro:env/server", () => ({
    LIVEKIT_URL: "wss://live.test",
    LIVEKIT_API_KEY: "APItestkey",
    LIVEKIT_API_SECRET: "test-secret-test-secret-test-secret",
    LIVEKIT_ROOM: "racecast"
}))

const verifier = new TokenVerifier("APItestkey", "test-secret-test-secret-test-secret")

type Get = (context: APIContext) => Promise<Response>
let GET: Get

// The rate limit lives in module state: every test starts from a fresh module.
beforeEach(async () => {
    vi.resetModules()
    GET = (await import("../../src/pages/api/token")).GET as unknown as Get
})

function request(ip = "203.0.113.7"): Promise<Response> {
    return GET({ clientAddress: ip } as APIContext)
}

describe("GET /api/token", () => {
    it("returns the server URL and a token, never cached", async () => {
        const response = await request()
        expect(response.status).toBe(200)
        expect(response.headers.get("Cache-Control")).toBe("no-store")
        const body = (await response.json()) as TokenResponse
        expect(body.url).toBe("wss://live.test")
        expect(typeof body.token).toBe("string")
    })

    it("grants subscribe-only access to the car's room", async () => {
        const { token } = (await (await request()).json()) as TokenResponse
        const claims = await verifier.verify(token)
        expect(claims.video).toMatchObject({
            room: "racecast",
            roomJoin: true,
            canSubscribe: true,
            canPublish: false,
            canPublishData: false,
            canUpdateOwnMetadata: false,
            hidden: false
        })
    })

    it("gives every viewer a distinct viewer- identity", async () => {
        const first = await verifier.verify(((await (await request()).json()) as TokenResponse).token)
        const second = await verifier.verify(((await (await request()).json()) as TokenResponse).token)
        expect(first.sub).toMatch(/^viewer-[0-9a-f-]{36}$/)
        expect(second.sub).not.toBe(first.sub)
    })

    it("is valid for two hours", async () => {
        const { token } = (await (await request()).json()) as TokenResponse
        const claims = await verifier.verify(token)
        expect(claims.exp! - claims.nbf!).toBe(2 * 3600)
    })

    it("carries the car's 24 h room timeouts, for a join that recreates the room", async () => {
        const { token } = (await (await request()).json()) as TokenResponse
        const claims = await verifier.verify(token)
        expect(claims.roomConfig).toMatchObject({ emptyTimeout: 86_400, departureTimeout: 86_400 })
    })

    it("allows 60 tokens per minute per IP", async () => {
        vi.useFakeTimers({ toFake: ["Date"] })
        for (let i = 0; i < 60; i++) expect((await request("198.51.100.1")).status).toBe(200)

        const refused = await request("198.51.100.1")
        expect(refused.status).toBe(429)
        expect(refused.headers.get("Retry-After")).toBe("60")

        // Another address is not affected, and the window reopens a minute later.
        expect((await request("198.51.100.2")).status).toBe(200)
        vi.advanceTimersByTime(60_000)
        expect((await request("198.51.100.1")).status).toBe(200)
        vi.useRealTimers()
    })
})
