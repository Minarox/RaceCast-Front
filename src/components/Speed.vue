<script lang="ts">
  export default {
    name: "SpeedData",
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
        histogram: {
          ...options,
          chart: {
            type: "areaspline",
            height: null,
            spacing: [12, 10, 12, 10],
            backgroundColor: "transparent",
            animation: true,
          },
          time: {
            useUTC: true,
          },
          xAxis: {
            type: "datetime",
            tickPixelInterval: 150,
          },
          yAxis: {
            max: 200,
            gridLineColor: "#c0c0c0",
            gridLineWidth: 1,
            title: {
              text: null,
            },
          },
          tooltip: {
            headerFormat: "",
            pointFormat: "{point.x:%Y-%m-%d %H:%M:%S}<br/>{point.y:.2f}",
          },
          plotOptions: {
            areaspline: {
              lineWidth: 3,
              fillOpacity: 0.2,
            },
            series: {
              marker: {
                enabled: false,
              },
            },
          },
          series: [
            {
              name: "data",
              data: [],
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
    // },
    watch: {
      speed: {
        deep: true,
        handler(value): void {
          this.histogram.series[0].data.push([
            new Date().getTime() + 2 * 60 * 60 * 1000,
            value,
          ]);
          if (this.histogram.series[0].data.length > 100) {
            this.histogram.series[0].data.shift();
          }
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
  <article>
    <highcharts :options="histogram" />
  </article>
</template>

<style lang="scss" scoped>
  article {
    height: 180px;
    width: 100%;

    > * {
      height: inherit;
      width: 100%;
    }
  }
</style>
