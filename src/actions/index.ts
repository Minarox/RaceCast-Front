import { Token } from "@types"
import { defineAction } from "astro:actions"
import { AccessToken } from "livekit-server-sdk"

export const server = {
    getLiveKitToken: defineAction({
        handler: async (_, { locals }): Promise<Token> => {
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
    })
}
