/**
 * Data returned by the MPU sensor
 */
export interface Sensor {
    accel: {
        x: number;
        y: number;
    };
    temp: number;
}