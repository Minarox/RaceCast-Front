<script lang="ts">
  // import Status from "@/components/Status.vue";
  // import State from "@/components/State.vue";
  import OpenLayers from "@/components/OpenLayers.vue";
  import Speed from "@/components/Speed.vue";
  // import Inertial from "@/components/Inertial.vue";
  import Speedometer from "@/components/Speedometer.vue";

  export default {
    name: "SidePanel",
    components: {
      Speedometer,
      // Status,
      // State,
      OpenLayers,
      Speed,
      // Inertial,
    },
    // eslint-disable-next-line vue/require-prop-types
    emits: ["lock"],
    data() {
      return {
        open: false as boolean,
        lock: false as boolean,
      };
    },
    watch: {
      lock(boolean) {
        if (boolean) this.open = true;
        this.$emit("lock", boolean);
      },
    },
    methods: {
      toggle() {
        if (this.lock) return;
        this.open = !this.open;
      },
    },
  };
</script>

<template>
  <aside :class="open ? 'opened' : ''">
    <div id="wrapper">
      <!--<Status />-->
      <!--<State :webrtc="webrtc" />-->
      <OpenLayers />
      <Speed />
      <!--<Inertial />-->
    </div>
    <div id="pin" @click.prevent="lock = !lock">
      <TransitionGroup name="fade">
        <img v-if="lock" alt="Locked" src="@/assets/lock-solid.svg" />
        <img v-else alt="Unlocked" src="@/assets/unlock-solid.svg" />
      </TransitionGroup>
    </div>
    <div id="arrow" @click.prevent="toggle">
      <img :class="open ? 'opened' : ''" alt="Arrow" src="@/assets/arrow.svg" />
    </div>
    <div id="speed">
      <Speedometer />
    </div>
    <span v-if="open && !lock" id="close" @click.prevent="toggle" />
  </aside>
</template>

<style lang="scss" scoped>
  aside {
    bottom: 0;
    margin: 0.8rem;
    position: absolute;
    right: 0;
    top: 0;
    transform: translateX(calc(380px + 0.8rem * 2));
    transition: transform 0.3s ease-in-out;
    width: 380px;
    z-index: 100;

    &.opened {
      transform: translateX(0);
    }

    > #wrapper {
      align-items: center;
      backdrop-filter: blur(4px);
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      display: flex;
      flex-flow: column nowrap;
      gap: 0.8rem;
      height: 100%;
      justify-content: flex-start;
      overflow-y: overlay;
      padding: 1rem;

      > article {
        align-items: center;
        background-color: rgba(255, 255, 255, 0.87);
        border-radius: 6px;
        color: #242424;
        display: flex;
        justify-content: center;
        width: 100%;
      }
    }

    > #arrow,
    > #pin {
      align-items: center;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      padding: 14rem 0.6rem 14rem 2rem;
      position: absolute;
      right: calc(380px + 0.8rem);
      top: 50%;
      transform: translateY(-50%);

      img {
        height: 40px;
        transform: rotate(180deg);
        transition: transform 180ms ease-in-out;
        width: 40px;

        &.opened {
          transform: rotate(0deg);
        }
      }
    }

    > #pin {
      padding: 0.6rem 0.8rem 2rem 2rem;
      top: 0;
      transform: translateY(0);

      img {
        height: 26px;
        transform: rotate(0deg);
        width: 26px;
      }
    }

    > #speed {
      align-items: center;
      border-radius: 8px;
      bottom: -2rem;
      display: flex;
      height: 220px;
      justify-content: center;
      pointer-events: none;
      position: absolute;
      right: calc(380px + 0.8rem);
      width: 260px;
    }

    #close {
      height: 100vh;
      position: absolute;
      right: calc(380px + 0.8rem);
      top: -0.8rem;
      width: calc(100vw - 380px - 0.8rem * 2);
      z-index: -1;
    }
  }
</style>
