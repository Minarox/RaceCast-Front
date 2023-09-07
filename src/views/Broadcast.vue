<script lang="ts">
  import { Room, RoomEvent } from "livekit-client";
  import { socket } from "../socket";

  export default {
    name: "BroadcastPage",
    data() {
      return {
        room: Room,
        interval: null,
        url: "wss://racecast-ix8aqrct.livekit.cloud" as string,
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2OTQxMzg1NzIsImlzcyI6IkFQSWZ2YVdZNUt1UEdaUiIsIm5iZiI6MTY5NDAzNzc3Miwic3ViIjoiUmFjZWNhciIsInZpZGVvIjp7ImNhblB1Ymxpc2giOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsInJvb20iOiJMaXZlIiwicm9vbUpvaW4iOnRydWV9fQ._wljfHH_Hqzgcaz31LvPi8I1g-QLkrspq57T23ZU3rc" as string,
      };
    },
    mounted() {
      socket.close();
      this.launch();
    },
    methods: {
      async launch() {
        // creates a new room with options
        this.room = new Room({
          // automatically manage subscribed video quality
          adaptiveStream: true,

          // optimize publishing bandwidth and CPU for published tracks
          dynacast: true,

          // default capture settings
          audioCaptureDefaults: {
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            channelCount: 2,
          },
          videoCaptureDefaults: {
            resolution: {
              frameRate: 30,
              width: 960,
              height: 540,
            },
          },
          publishDefaults: {
            simulcast: false,
            videoCodec: "vp9",
            videoEncoding: {
              maxFramerate: 30,
              maxBitrate: 2_000_000,
            },
            backupCodec: {
              codec: "h264",
              encoding: {
                maxFramerate: 30,
                maxBitrate: 2_000_000,
              },
            },
            audioPreset: {
              maxBitrate: 96_000,
            },
            dtx: true,
          },
        });

        // pre-warm connection, this can be called as early as your page is loaded
        this.room.prepareConnection(this.url, this.token);

        // set up event listeners
        this.room.on(RoomEvent.Connected, this.handleConnect);
        this.room.on(RoomEvent.Disconnected, this.handleDisconnect);

        // connect to room
        await this.room.connect(this.url, this.token);

        // publish local camera and mic tracks
        await this.room.localParticipant.setCameraEnabled(true);
        await this.room.localParticipant.setMicrophoneEnabled(true);
      },
      handleConnect() {
        console.log("connected to room", this.room.name);
        clearInterval(this.interval);
        this.interval = null;
      },
      handleDisconnect() {
        console.log("disconnected from room");
        if (this.interval) return;
        this.interval = setInterval(() => {
          this.launch();
        }, 8000);
      },
    },
  };
</script>

<template>
  <main></main>
</template>
