/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly PUBLIC_LIVEKIT_WS_URL: string;
    readonly LIVEKIT_KEY: string;
    readonly LIVEKIT_SECRET: string;
    readonly LIVEKIT_ROOM: string;
    readonly PUBLIC_ACKEE_URL: string;
    readonly PUBLIC_ACKEE_DOMAIN: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
