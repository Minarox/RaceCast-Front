<script lang="ts">
  export default {
    name: "SpeedGraph",
    data() {
      const options = {
        lang: {
          noData: "Aucune donnée",
        },
        credits: {
          enabled: false,
        },
        title: {
          text: null,
        },
        legend: {
          enabled: false,
        },
      };
      return {
        speed: 0 as number,
        speedometer: {
          ...options,
          chart: {
            type: "gauge",
            height: null,
            spacing: [10, 26, 0, 26],
            backgroundColor: "transparent",
            animation: true,
          },
          tooltip: {
            enabled: false,
          },
          plotOptions: {
            series: {
              enableMouseTracking: false,
            },
          },
          pane: {
            startAngle: -90,
            endAngle: 90,
            background: null,
          },
          yAxis: {
            min: 0,
            max: 200,
            tickPixelInterval: 60,
            minorTickInterval: null,
            tickPosition: "inside",
            tickColor: "#FFFFFF",
            tickLength: 20,
            tickWidth: 2,
            labels: {
              distance: 16,
              style: {
                fontSize: "14px",
                color: "white",
              },
            },
            lineWidth: 0,
            plotBands: [
              {
                from: 0,
                to: 120,
                color: "#55BF3B",
                thickness: 20,
              },
              {
                from: 120,
                to: 160,
                color: "#DDDF0D",
                thickness: 20,
              },
              {
                from: 160,
                to: 200,
                color: "#DF5353",
                thickness: 20,
              },
            ],
          },
          series: [
            {
              name: "data",
              data: [0],
              tooltip: {
                valueSuffix: " km/h",
              },
              dataLabels: {
                format: "{y} km/h",
                borderWidth: 0,
                color: "white",
                style: {
                  fontSize: "2.3em",
                },
              },
              dial: {
                radius: "80%",
                backgroundColor: "gray",
                baseWidth: 12,
                baseLength: "0%",
                rearLength: "0%",
              },
              pivot: {
                backgroundColor: "gray",
                radius: 6,
              },
            },
          ],
        },
      };
    },
    // computed: {
    //   speed(): number | null {
    //     if (state.data.gps) return state.data.gps.speed;
    //     return null;
    //   },
    //   state() {
    //     return state.data.state;
    //     return null;
    //   },
    // },
    watch: {
      speed: {
        deep: true,
        handler(value) {
          this.speedometer.series[0].data = [parseInt(value)];
        },
      },
    },
    mounted() {
      window.addEventListener('data', this.dataEvent);
    },
    beforeUnmount() {
      window.removeEventListener('data', this.dataEvent);
    },
    methods: {
      dataEvent(event: CustomEvent) {
        if (event?.detail?.data?.modem?.GPS?.speed) {
          this.speed = event.detail.data.modem.GPS.speed;
        }
      },
    },
  };
</script>

<template>
  <Transition name="fade">
    <highcharts v-if="true" :options="speedometer" />
  </Transition>
</template>

<style lang="scss" scoped>
  * {
    height: 100%;
    width: 100%;
  }
</style>
