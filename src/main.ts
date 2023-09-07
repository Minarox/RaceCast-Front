/// <reference types="vite-plugin-pwa/client" />
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { registerSW } from "virtual:pwa-register";
import Highcharts from "highcharts";
import HighchartsVue from "highcharts-vue";
import highchartsMore from "highcharts/highcharts-more";
import highcharts3d from "highcharts/highcharts-3d";
import highchartsNoData from "highcharts/modules/no-data-to-display";

registerSW();

highchartsMore(Highcharts);
highcharts3d(Highcharts);
highchartsNoData(Highcharts);

createApp(App)
  .use(router)
  .use(HighchartsVue as never)
  .mount("#app");
