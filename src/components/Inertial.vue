<script lang="ts">
  export default {
    name: "InertialData",
    data() {
      const options: object = {
        lang: {
          noData: "Aucune donnée",
        },
        credits: {
          enabled: false,
        },
        legend: {
          enabled: false,
        },
        plotOptions: {
          series: {
            marker: {
              radius: 6,
            },
          },
        },
      };
      return {
        temperature: null,
        gyroscope: [0, 0],
        element: null,
        pose: {
          x: 0,
          y: 0,
        },
        animation: true,
        accelChart: {
          ...options,
          chart: {
            height: null,
            spacing: [10, 10, 4, 10],
            backgroundColor: "transparent",
            type: "scatter",
            animation: false,
          },
          title: {
            text: "Accélération",
          },
          yAxis: {
            min: -3,
            max: 3,
            title: null,
          },
          xAxis: {
            min: -3,
            max: 3,
            gridLineWidth: 1,
          },
          series: [
            {
              name: "data",
              data: [[0, 0]],
              color: "#FF0000",
            },
            {
              name: "origin",
              data: [[0, 0]],
              color: "#888888",
            },
          ],
        },
      };
    },
    /* computed: {
      accelerometer(): { x: number; y: number; z: number } | null {
        // if (state.data.mpu6050) {
        //   return state.data.mpu6050.accel;
        // }
        return null;
      },
      gyroscope(): { x: number; y: number } | null {
        // if (state.data.mpu6050) {
        //   return state.data.mpu6050.gyro;
        // }
        return null;
      },
      temperature(): number | null {
        // if (state.data.mpu6050) {
        //   return state.data.mpu6050.temp;
        // }
        return null;
      },
    }, */
    watch: {
      gyroscope(value): void {
        this.accelChart.series[0].data = [value];
      },
    },
    mounted(): void {
      window.addEventListener('data', this.dataEvent);
    },
    beforeUnmount() {
      window.removeEventListener('data', this.dataEvent);
    },
    methods: {
      dataEvent(event: CustomEvent) {
        if (event?.detail?.data?.sensor) {
          this.temperature = event.detail.data.sensor.temp;
          this.gyroscope = [
            event.detail.data.sensor.accel.x,
            event.detail.data.sensor.accel.y,
          ];
        }
      },
    },
  };
</script>

<template>
  <article>
    <section>
      <highcharts :options="accelChart" />
    </section>
    <p>Température : {{ temperature }}</p>
  </article>
</template>

<style lang="scss" scoped>
  article {
    align-items: center;
    display: flex;
    flex-flow: column nowrap;
    height: 240px;
    justify-content: center;
    padding-bottom: 0.4rem;
    width: 100%;

    section {
      width: 100%;

      &:first-child {
        height: 190px;

        > * {
          height: inherit;
          width: 100%;
        }
      }

      &:last-child {
        text-align: center;
      }
    }
  }
</style>
