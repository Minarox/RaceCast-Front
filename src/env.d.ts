/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly PUBLIC_LIVEKIT_URL: string;
    readonly LIVEKIT_API: string;
    readonly LIVEKIT_SECRET: string;
    readonly LIVEKIT_ROOM: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
