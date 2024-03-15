<script lang="ts">
  export default {
    name: "DataSate",
    props: {
      webrtc: {
        type: Boolean,
        default: false,
        required: true,
      },
    },
    computed: {
      state() {
        // return state.data.state;
        return null;
      },
    },
  };
</script>

<template>
  <article>
    <p :class="state.mpu6050 ? 'green' : 'red'">MPU6050</p>
    <p :class="state.gps ? 'green' : 'red'">GPS</p>
    <p :class="webrtc ? 'green' : 'red'">Video</p>
  </article>
</template>

<style lang="scss" scoped>
  article {
    display: grid !important;
    gap: 0.4rem;
    grid-template-columns: repeat(3, 1fr);
    justify-items: center;
    min-height: 41px;
    padding: 0.4rem;

    p {
      border-radius: 4px;
      color: white;
      line-height: 1.8em;
      text-align: center;
      transition: background-color 300ms linear;
      width: 100%;

      &.green {
        background-color: green;
      }

      &.red {
        background-color: #d20000;
      }
    }
  }
</style>
