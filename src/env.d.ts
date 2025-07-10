interface ImportMetaEnv {
    readonly LIVEKIT_DOMAIN: string;
    readonly LIVEKIT_API_KEY: string;
    readonly LIVEKIT_API_SECRET: string;
    readonly LIVEKIT_ROOM: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
