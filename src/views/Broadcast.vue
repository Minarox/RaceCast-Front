<script lang="ts">
  import { Room, RoomEvent } from "livekit-client";
  import { socket } from "../socket";

  export default {
    name: "BroadcastPage",
    data() {
      return {
        room: Room,
        interval: null,
        url: "wss://racecast-54au9qa5.livekit.cloud" as string,
        token: "" as string,
      };
    },
    mounted() {
      socket.close();
      this.requestToken();
    },
    methods: {
      requestToken() {
        console.log("requesting token");
        fetch(`https://rallye.minarox.fr/getBroadcastToken`)
          .then((res) => res.json())
          .then((data) => {
            this.token = data.token;
            this.start();
          });
      },
      async start() {
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
              maxBitrate: 1_700_000,
            },
            backupCodec: {
              codec: "h264",
              encoding: {
                maxFramerate: 30,
                maxBitrate: 1_700_000,
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
          this.requestToken();
        }, 6000);
      },
    },
  };
</script>

<template>
  <main></main>
</template>
