import { AccessToken } from "livekit-server-sdk";

/**
 * @description Generate a token for LiveKit
 * @endpoint GET /livekit-token
 * @returns {Promise<Response>} Token
 */
export async function GET(): Promise<Response> {
    // Generate a new token
    let accessToken: AccessToken = new AccessToken(
        import.meta.env.LIVEKIT_KEY,
        import.meta.env.LIVEKIT_SECRET,
        {
            identity: `User-${Math.random().toString(36).substring(7)}`,
        }
    );

    // Set permissions
    accessToken.addGrant({
        roomCreate: false,
        roomJoin: true,
        roomList: false,
        roomRecord: false,
        roomAdmin: false,
        room: import.meta.env.LIVEKIT_ROOM,
        ingressAdmin: false,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
        canUpdateOwnMetadata: false,
        hidden: true,
        recorder: false,
        agent: false
    });

    // Return the token
    return new Response(
        JSON.stringify(
            await accessToken.toJwt()
        )
    )
}
