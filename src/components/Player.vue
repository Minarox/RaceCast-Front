<script lang="ts">
  import { RemoteTrack, Room, RoomEvent, Track } from "livekit-client";

  export default {
    name: "PlayerComponent",
    props: {
      lock: {
        type: Boolean,
        default: false,
        required: true,
      },
    },
    emits: ["webrtc"],
    data() {
      return {
        play: false as boolean,
        url: "wss://racecast-ix8aqrct.livekit.cloud" as string,
        token: "" as string,
      };
    },
    methods: {
      requestToken() {
        console.log("requesting token");
        fetch(`https://rallye.minarox.fr/getToken`)
          .then((res) => res.json())
          .then((data) => {
            this.token = data.token;
            this.start();
          });
      },
      async start() {
        this.play = true;
        this.clear();

        // creates a new room with options
        const room = new Room({
          // automatically manage subscribed video quality
          adaptiveStream: true,

          // optimize publishing bandwidth and CPU for published tracks
          dynacast: true,
        });

        // pre-warm connection, this can be called as early as your page is loaded
        room.prepareConnection(this.url, this.token);

        // set up event listeners
        room
          .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
          .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
          .on(RoomEvent.Disconnected, this.handleDisconnect);

        // connect to room
        await room.connect(this.url, this.token);
        console.log("connected to room", room.name);
      },
      handleTrackSubscribed(track: RemoteTrack) {
        if (
          track.kind === Track.Kind.Video ||
          track.kind === Track.Kind.Audio
        ) {
          // attach it to a new HTMLVideoElement or HTMLAudioElement
          const element = track.attach();
          document.getElementById("wrapper").appendChild(element);
          // Check if video and audio is present
          if (
            document.getElementsByTagName("video").length > 0 &&
            document.getElementsByTagName("audio").length > 0
          )
            this.$emit("webrtc", true);
        }
      },
      handleTrackUnsubscribed(track: RemoteTrack) {
        // remove tracks from all attached elements
        track.detach();
        this.clear();
      },
      handleDisconnect() {
        this.play = false;
        this.clear();
        console.log("disconnected from room");
      },
      clear() {
        document.getElementById("wrapper").innerHTML = "";
        this.$emit("webrtc", false);
      },
    },
  };
</script>

<template>
  <button
    v-if="!play"
    :class="lock ? 'reduce' : ''"
    @click.prevent="requestToken"
  >
    Lancer le direct
  </button>
  <div id="wrapper" :class="lock ? 'reduce' : ''"></div>
</template>

<style lang="scss" scoped>
  button {
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    transition: left 0.3s ease-in-out;
    z-index: 100;

    &.reduce {
      left: calc(50% - 180px);
    }
  }

  #wrapper {
    height: 100%;
    transition: width 0.3s ease-in-out;
    width: 100%;

    &.reduce {
      width: calc(100% - 380px - 0.8rem * 2);
    }
  }
</style>
