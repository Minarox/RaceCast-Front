import { AccessToken } from "livekit-server-sdk";
import { Token } from "@types";

export const prerender = false;

/**
 * @description Generate a token for LiveKit
 * @method GET
 * @param {any} context - Request context
 * @endpoint GET /livekit-token
 * @returns {Promise<Response>} Token
 */
export async function GET(context: any): Promise<Response> {
    const identity: string = `User-${Math.random().toString(36).substring(7)}`;

    // Generate a new token
    let accessToken: AccessToken = new AccessToken(
        context?.locals?.runtime?.env?.LIVEKIT_API_KEY || import.meta.env.LIVEKIT_API_KEY,
        context?.locals?.runtime?.env?.LIVEKIT_API_SECRET || import.meta.env.LIVEKIT_API_SECRET,
        { identity },
    );

    // Set permissions
    accessToken.addGrant({
        roomCreate: false,
        roomJoin: true,
        roomList: false,
        roomRecord: false,
        roomAdmin: false,
        room: context?.locals?.runtime?.env?.LIVEKIT_ROOM || import.meta.env.LIVEKIT_ROOM,
        ingressAdmin: false,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
        canUpdateOwnMetadata: false,
        hidden: false,
        recorder: false,
        agent: false,
    });

    const response: Token = {
        domain: context?.locals?.runtime?.env?.LIVEKIT_DOMAIN || import.meta.env.LIVEKIT_DOMAIN,
        room: context?.locals?.runtime?.env?.LIVEKIT_ROOM || import.meta.env.LIVEKIT_ROOM,
        identity: identity,
        token: await accessToken.toJwt(),
        validity: accessToken.ttl.toString(),
        remoteIdentity: context?.locals?.runtime?.env?.LIVEKIT_REMOTE_IDENTITY || import.meta.env.LIVEKIT_REMOTE_IDENTITY,
        timestamp: Date.now(),
    };

    // Return the token
    return new Response(
        JSON.stringify(response),
        {
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
};
