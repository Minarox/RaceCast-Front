import { reactive } from "vue";
import io from "socket.io-client";

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
  socket: string | null;
  online: boolean;
  latency: number | null;
  lastConnection: number | null;
}

// Define global variables
const status: Status = {
  socket: null,
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

export const socket = io("https://rallye.minarox.fr", {
  reconnectionDelay: 2000,
  reconnectionDelayMax: 2000,
  timeout: 2000,
  retries: Infinity,
});

socket.on("connect", (): void => {
  state.online = true;
});

socket.on("disconnect", (): void => {
  state.online = false;
});

socket.on("status", (status: Status): void => {
  state.status = status;
});

socket.on("latency", (latency: number): void => {
  state.status.latency = latency;
});

socket.on("mpu6050", (sensor_data: Mpu6050): void => {
  state.data.mpu6050 = sensor_data;
});

socket.on("gps", (sensor_data: Gps): void => {
  state.data.gps = sensor_data;
});

socket.on("state", (state_data: State): void => {
  state.data.state = state_data;
});

socket.on("lastData", (data: Data): void => {
  state.data = data;
});
