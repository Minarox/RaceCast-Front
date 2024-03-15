<script lang="ts">
  import { AccessToken } from "livekit-server-sdk";
  import SidePanel from "@/components/SidePanel.vue";
  // import Player from "@/components/Player.vue";
  import { RemoteTrack, Room, RoomEvent, Track } from "livekit-client";

  export default {
    name: "HomePage",
    components: {
      SidePanel,
      // Player,
    },
    data() {
      return {
        lock: false as boolean,
        token: null as string | null,
        room: null as object | null,
        carData: {
          sensor: null as object | null,
          modem: null as object | null
        }
      };
    },
    methods: {
      lockHandler(value: boolean) {
        this.lock = value;
      },
      async getToken() {
        // Generate a new token
        const access_token= new AccessToken(
          import.meta.env.VITE_API_KEY,
          import.meta.env.VITE_API_SECRET,
          {
            identity: this.randomString(),
            ttl: 60 * 60,
          },
        );

        // Set permissions
        access_token.addGrant({
          roomCreate: false,
          roomJoin: true,
          roomList: false,
          roomRecord: false,
          roomAdmin: false,
          room: import.meta.env.VITE_API_ROOM,
          ingressAdmin: false,
          canPublish: false,
          canSubscribe: true,
          canPublishData: false,
          canUpdateOwnMetadata: false,
          hidden: false,
          recorder: false,
          agent: false
        });

        this.token = await access_token.toJwt();
      },
      randomString() {
        let result: string = "";
        const characters: string =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const charactersLength: number = characters.length;
        let counter: number = 0;
        while (counter < 8) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
      },
      async connect() {
        await this.getToken();

        this.room = new Room({
          adaptiveStream: true,
          dynacast: false,
        });

        await this.room.prepareConnection(import.meta.env.VITE_API_URL, this.token);

        this.room
          .on(RoomEvent.DataReceived, (payload: Uint8Array) => {
            const data = JSON.parse(new TextDecoder().decode(payload))
            this.carData = {
              ...this.carData,
              ...data
            }
            const customEvent = new CustomEvent(
              'data',
              {
                detail: { data: data }
              });
            window.dispatchEvent(customEvent);
          })
          .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
          .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
          .on(RoomEvent.Disconnected, this.handleDisconnect);

        await this.room.connect(import.meta.env.VITE_API_URL, this.token);
        console.log("connected to room", this.room.name);
      },
      handleTrackSubscribed(track: RemoteTrack) {
        if (
          track.kind === Track.Kind.Video ||
          track.kind === Track.Kind.Audio
        ) {
          // attach it to a new HTMLVideoElement or HTMLAudioElement
          const element = track.attach();
          document.getElementById("wrapper").appendChild(element);
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
      },
    },
  };
</script>

<template>
  <button
    v-if="!room"
    :class="lock ? 'reduce' : ''"
    @click.prevent="connect"
  >
    Lancer le direct
  </button>
  <div id="wrapper" :class="lock ? 'reduce' : ''"></div>

  <!--<Player :lock="lock" @webrtc="webrtcHandler" />-->
  <SidePanel @lock="lockHandler" />
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
    position: relative;
    transition: width 0.3s ease-in-out;
    width: 100%;

    &.reduce {
      width: calc(100% - 380px - 0.8rem * 2);
    }
  }
</style>
