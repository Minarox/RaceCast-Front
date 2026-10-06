import type { Token } from "@types"
import { defineAction } from "astro:actions"
import { AccessToken, RoomServiceClient } from "livekit-server-sdk"
import { env } from "cloudflare:workers"

export const server = {
    getLiveKitToken: defineAction({
        handler: async () => {
            try {
                // Check if the room exists, if not create it
                const protocol = env.LIVEKIT_TLS === 'true' ? 'https://' : 'http://'
                const room = new RoomServiceClient(
                    protocol + env.LIVEKIT_DOMAIN,
                    env.LIVEKIT_API_KEY,
                    env.LIVEKIT_API_SECRET
                )

                const rooms = await room.listRooms()
                const roomIndex = rooms.findIndex(r => r.name === env.LIVEKIT_ROOM)

                if (roomIndex === -1) {
                    await room.createRoom({
                        name: env.LIVEKIT_ROOM,
                        departureTimeout: 60 * 60 * 24
                    })
                }

                // Create LiveKit token
                const identity = `User-${Math.random().toString(36).substring(7)}`

                let accessToken = new AccessToken(
                    env.LIVEKIT_API_KEY,
                    env.LIVEKIT_API_SECRET,
                    { identity }
                )

                accessToken.addGrant({
                    roomCreate: false,
                    roomJoin: true,
                    roomList: false,
                    roomRecord: false,
                    roomAdmin: false,
                    room: env.LIVEKIT_ROOM,
                    ingressAdmin: false,
                    canPublish: false,
                    canSubscribe: true,
                    canPublishData: false,
                    canUpdateOwnMetadata: false,
                    hidden: false,
                    recorder: false,
                    agent: false
                })

                return {
                    domain: env.LIVEKIT_DOMAIN,
                    room: env.LIVEKIT_ROOM,
                    identity: identity,
                    token: await accessToken.toJwt(),
                    validity: accessToken.ttl.toString(),
                    publisherIdentity: env.LIVEKIT_PUBLISHER_IDENTITY,
                    timestamp: Date.now()
                } as Token
            } catch (error: any) {
                throw new Error(`Failed to create or get LiveKit room: ${error.message}`)
            }
        }
    }),

    getInfoBoxContent: defineAction({
        handler: async () => {
            return await env.STORE.get("INFO_BOX_CONTENT", "text") ?? ''
        }
    })
}
