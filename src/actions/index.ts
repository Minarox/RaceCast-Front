import { Token } from "@types"
import { defineAction } from "astro:actions"
import { AccessToken, RoomServiceClient } from "livekit-server-sdk"

export const server = {
    createLiveKitRoom: defineAction({
        handler: async (_: any, { locals }) => {
            try {
                const protocol = locals.runtime.env.LIVEKIT_TLS === 'true' ? 'https://' : 'http://'
                const room = new RoomServiceClient(
                    protocol + locals.runtime.env.LIVEKIT_DOMAIN,
                    locals.runtime.env.LIVEKIT_API_KEY,
                    locals.runtime.env.LIVEKIT_API_SECRET
                )

                const rooms = await room.listRooms()
                const roomIndex = rooms.findIndex(r => r.name === locals.runtime.env.LIVEKIT_ROOM)

                if (roomIndex === -1) {
                    const newRoom = await room.createRoom({
                        name: locals.runtime.env.LIVEKIT_ROOM,
                        departureTimeout: 60 * 60 * 24
                    })
                    return JSON.parse(JSON.stringify(newRoom))
                }

                return JSON.parse(JSON.stringify(rooms[roomIndex]))
            } catch (error: any) {
                throw new Error(`Failed to create or get LiveKit room: ${error.message}`)
            }
        }
    }),

    getLiveKitToken: defineAction({
        handler: async (_: any, { locals }): Promise<Token> => {
            const identity: string = `User-${Math.random().toString(36).substring(7)}`

            // Generate a new token
            let accessToken: AccessToken = new AccessToken(
                locals.runtime.env.LIVEKIT_API_KEY,
                locals.runtime.env.LIVEKIT_API_SECRET,
                { identity }
            )

            // Set permissions
            accessToken.addGrant({
                roomCreate: false,
                roomJoin: true,
                roomList: false,
                roomRecord: false,
                roomAdmin: false,
                room: locals.runtime.env.LIVEKIT_ROOM,
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
                domain: locals.runtime.env.LIVEKIT_DOMAIN,
                room: locals.runtime.env.LIVEKIT_ROOM,
                identity: identity,
                token: await accessToken.toJwt(),
                validity: accessToken.ttl.toString(),
                remoteIdentity: locals.runtime.env.LIVEKIT_REMOTE_IDENTITY,
                timestamp: Date.now()
            }
        }
    }),

    getInfoBoxContent: defineAction({
        handler: async (_: any, { locals }): Promise<string> => {
            const content = await locals.runtime.env.STORE.get("INFO_BOX_CONTENT", { type: "text" })
            return content ?? ''
        }
    })
}
