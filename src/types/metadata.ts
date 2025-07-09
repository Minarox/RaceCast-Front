export interface Metadata {
    location: GPS;
    modem: Modem;
    system: System;
    temp: number;
    timestamp: number;
    ups: UPS;
}

export interface GPS {
    alt: number;
    hdop: number;
    lat: number;
    lon: number;
    sat: number;
    speed: number;
}

export interface Modem {
    signal: number;
    tech: string[];
}

export interface System {
    fan: number;
    load: number;
    temp: number;
    power: number;
}

export interface UPS {
    capa: number;
    volt: number;
}
