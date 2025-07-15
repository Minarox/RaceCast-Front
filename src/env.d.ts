interface ImportMetaEnv {
    readonly LIVEKIT_DOMAIN: string;
    readonly LIVEKIT_API_KEY: string;
    readonly LIVEKIT_API_SECRET: string;
    readonly LIVEKIT_ROOM: string;
    readonly LIVEKIT_REMOTE_IDENTITY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
