import { reactive } from "vue";

// Define interfaces
export interface Data {
  mpu6050: Mpu6050 | null;
  gps: Gps | null;
  state: State;
}

export interface State {
  online?: boolean;
  mpu6050: boolean;
  gps: boolean;
  webrtc: boolean;
}

export interface Gps {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
}

export interface Mpu6050 {
  gyro: {
    x: number;
    y: number;
  };
  accel: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
  };
  temp: number;
}

export interface Status {
  online: boolean;
  latency: number | null;
  lastConnection: number | null;
}

// Define global variables
const status: Status = {
  online: false,
  latency: null,
  lastConnection: null,
};

const data: Data = {
  mpu6050: null,
  gps: null,
  state: {
    mpu6050: false,
    gps: false,
    webrtc: false,
  },
};

export const state = reactive({
  online: false,
  status,
  data,
});
