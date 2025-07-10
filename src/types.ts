export interface Metadata {
    location: GPS;
    modem: Modem;
    system: System;
    temp: number;
    timestamp: number;
    ups: UPS;
}

export interface GPS {
    alt: number | null;
    hdop: number | null;
    lat: number | null;
    lon: number | null;
    sat: number | null;
    speed: number | null;
}

export interface Modem {
    signal: number | null;
    tech: string[] | null;
}

export interface System {
    fan: number | null;
    load: number | null;
    temp: number | null;
    power: number | null;
}

export interface UPS {
    capa: number | null;
    volt: number | null;
}


export enum State {
    CONNECTING = "connecting",
    CONNECTED = "connected",
    RECONNECTING = "reconnecting",
    DISCONNECTED = "disconnected"
}
