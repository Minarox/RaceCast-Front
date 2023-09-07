<script lang="ts">
  import SidePanel from "@/components/SidePanel.vue";
  import Player from "@/components/Player.vue";

  export default {
    name: "HomePage",
    components: {
      SidePanel,
      Player,
    },
    data() {
      return {
        webrtc: false as boolean,
        lock: false as boolean,
      };
    },
    methods: {
      webrtcHandler(value: boolean) {
        this.webrtc = value;
      },
      lockHandler(value: boolean) {
        this.lock = value;
      },
    },
  };
</script>

<template>
  <Player :lock="lock" @webrtc="webrtcHandler" />
  <SidePanel :webrtc="webrtc" @lock="lockHandler" />
</template>
