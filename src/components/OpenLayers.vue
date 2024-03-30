<script lang="ts">
  import { Feature, Map, View } from "ol/index";
  import { OSM, Vector as VectorSource } from "ol/source";
  import { Point } from "ol/geom";
  import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
  import { useGeographic } from "ol/proj";
  import {
    defaults as defaultControls,
    FullScreen,
    ScaleLine,
  } from "ol/control.js";
  import { Circle as CircleStyle, Stroke, Style } from "ol/style.js";
  import { easeOut } from "ol/easing.js";
  import { getVectorContext } from "ol/render.js";
  import { unByKey } from "ol/Observable.js";
  import "ol/ol.css";

  export default {
    name: "OpenLayers",
    props: {
      carData: {
        type: Object,
        default: null,
      },
    },
    data() {
      return {
        map: null,
        tileLayer: null,
        source: null,
        vector: null,
        duration: 3000,
        start: null,
        flashGeom: null,
        listenerKey: null,
        interval: null,
        location: [0, 0],
      };
    },
    // computed: {
    //   location(): [number, number] {
    //     if (state.data.gps) {
    //       return [state.data.gps.longitude, state.data.gps.latitude];
    //     }
    //     return [0, 0];
    //   },
    // },
    watch: {
      carData: function(newVal, oldVal) { // watch it
        console.log('Prop changed: ', newVal, ' | was: ', oldVal)
      },
      location(position: [number, number]) {
        this.map
          .getLayers()
          .getArray()[1]
          .getSource()
          .getFeatures()[0]
          .getGeometry()
          .setCoordinates(position);
        setTimeout(() => {
          this.map.getView().animate({
            center: position,
            duration: 300,
          });
        }, 1);
      },
    },
    mounted() {
      window.addEventListener('data', this.dataEvent);

      useGeographic();
      this.createMap();

      this.flash();
      this.interval = setInterval(() => {
        this.flash();
      }, 3000);
    },
    beforeUnmount() {
      window.removeEventListener('data', this.dataEvent);
      clearInterval(this.interval);
    },
    methods: {
      dataEvent(event: CustomEvent) {
        if (event?.detail?.data?.gps) {
          this.location = [
            event.detail.data.gps.longitude,
            event.detail.data.gps.latitude,
          ];
        }
      },
      createMap(): void {
        this.tileLayer = new TileLayer({
          source: new OSM({
            wrapX: false,
          }),
        });

        this.source = new VectorSource({
          wrapX: false,
          features: [new Feature(new Point(this.location))],
        });

        this.vector = new VectorLayer({
          source: this.source,
          style: {
            "circle-radius": 12,
            "circle-fill-color": "rgba(255,255,255,0.6)",
            "circle-stroke-color": "#3399CC",
            "circle-stroke-width": 1.8,
          },
        });

        this.map = new Map({
          target: this.$refs.map,
          controls: defaultControls({ attribution: false, zoom: true }).extend([
            new ScaleLine({
              units: "metric",
            }),
            new FullScreen(),
          ]),
          layers: [this.tileLayer, this.vector],
          view: new View({
            center: this.location,
            zoom: 15,
          }),
        });
      },
      flash(): void {
        this.start = Date.now();
        this.flashGeom = this.map
          .getLayers()
          .getArray()[1]
          .getSource()
          .getFeatures()[0]
          .getGeometry()
          .clone();
        this.listenerKey = this.tileLayer.on("postrender", this.animate);
      },
      animate(event): void {
        const frameState = event.frameState;
        const elapsed = frameState.time - this.start;
        if (elapsed >= this.duration) {
          unByKey(this.listenerKey);
          return;
        }
        const vectorContext = getVectorContext(event);
        const elapsedRatio = elapsed / this.duration;
        const radius = easeOut(elapsedRatio) * 25 + 12;
        const opacity = easeOut(1 - elapsedRatio);

        const style = new Style({
          image: new CircleStyle({
            radius: radius,
            stroke: new Stroke({
              color: "rgba(255, 0, 0, " + opacity + ")",
              width: 0.25 + opacity,
            }),
          }),
        });

        vectorContext.setStyle(style);
        vectorContext.drawGeometry(this.flashGeom);
        this.map.render();
      },
    },
  };
</script>

<template>
  <article ref="map" />
</template>

<style lang="scss" scoped>
  article {
    flex: 1;
    min-height: 260px;
    overflow: hidden;
  }
</style>
