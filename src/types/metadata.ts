/**
 * Metadata object
 */
export interface Metadata {
    name: string;
    link: string;
    stages: Stage[];
}

/**
 * Stage object
 */
interface Stage {
    name: string;
    time: string;
}
