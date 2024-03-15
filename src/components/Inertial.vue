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
            type: "scatter3d",
            animation: false,
            options3d: {
              enabled: true,
              alpha: 10,
              beta: 20,
              depth: 300,
              // fitToPlot: false,
            },
          },
          title: {
            text: "Accéléromètre",
          },
          yAxis: {
            min: -2.5,
            max: 2.5,
            title: null,
          },
          xAxis: {
            min: -2.5,
            max: 2.5,
            gridLineWidth: 1,
          },
          zAxis: {
            min: -2.5,
            max: 2.5,
            showFirstLabel: false,
          },
          series: [
            {
              name: "data",
              data: [[0, 0, 0]],
              color: "#FF0000",
            },
            {
              name: "origin",
              data: [[0, 0, 0]],
              color: "#888888",
            },
          ],
        },
        gyroChart: {
          ...options,
          chart: {
            height: null,
            spacing: [10, 10, 4, 10],
            backgroundColor: "transparent",
            type: "scatter",
            animation: false,
          },
          title: {
            text: "Gyroscope",
          },
          yAxis: {
            min: -260,
            max: 260,
            title: null,
          },
          xAxis: {
            min: -260,
            max: 260,
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
    computed: {
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
    },
    watch: {
      accelerometer(value): void {
        this.accelChart.series[0].data = [value];
      },
      gyroscope(value): void {
        this.gyroChart.series[0].data = [value];
      },
    },
    mounted(): void {
      ["mouseup", "touchend"].forEach((type) => {
        document.addEventListener(type, this.release, {
          passive: true,
        });
      });
      ["mousedown", "touchstart"].forEach((type) => {
        const element = document.getElementById("accel-chart");
        if (element) element.addEventListener(type, this.click, false);
      });
    },
    methods: {
      click(event): void {
        this.element = event.target;
        while (this.element.id !== "accel-chart") {
          this.element = this.element.parentNode;
        }

        this.pose = {
          x: event.pageX,
          y: event.pageY,
        };

        ["mousemove", "touchmove"].forEach((type) => {
          document.addEventListener(type, this.drag, false);
        });
      },
      drag(event): void {
        if (this.animation) {
          this.animation = false;

          if (this.element.id === "accel-chart") {
            this.accelChart.chart.options3d.alpha +=
              (event.pageY - this.pose.y) / 2;
            this.accelChart.chart.options3d.beta -=
              (event.pageX - this.pose.x) / 2;
          }

          this.pose = {
            x: event.pageX,
            y: event.pageY,
          };

          requestAnimationFrame(() => {
            this.animation = true;
          });
        }
      },
      release(): void {
        ["mousemove", "touchmove"].forEach((type) => {
          document.removeEventListener(type, this.drag, false);
        });
        this.pose = {
          x: 0,
          y: 0,
        };
        this.element = null;
      },
    },
  };
</script>

<template>
  <article>
    <section>
      <highcharts id="accel-chart" :options="accelChart" />
      <highcharts :options="gyroChart" />
    </section>
    <hr />
    <section>
      <p>Température : {{ temperature }}</p>
    </section>
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
        display: grid;
        grid-template-columns: repeat(2, 1fr);
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

    hr {
      border: none;
      border-bottom: 2px solid #888888;
      border-radius: 100%;
      margin: 0.4rem 0;
      width: 80%;
    }
  }
</style>
