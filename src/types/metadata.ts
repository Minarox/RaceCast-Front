/**
 * Metadata object
 */
export interface Metadata {
    name: string;
    link: string;
    stages: Stage[];
    car: any;
}

/**
 * Stage object
 */
interface Stage {
    name: string;
    time: string;
}

interface Car {
    gps: GPS;
    last_update: number;
}

/**
 * GPS data returned by the modem
 */
export interface GPS {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
}
