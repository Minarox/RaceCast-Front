<template>
    <div class="map-panel">
        <div class="map-wrap">
            <div ref="container" class="map" :class="{ darken: tiles.darken }" />

            <p v-if="!position" class="notice">Position inconnue</p>

            <button v-if="position && !follow" type="button" class="recenter" @click="recenter">
                <Icon name="crosshair" :size="16" />
                Recentrer
            </button>
        </div>

        <div class="gps" :class="{ stale: gpsStale }">
            <p class="speed num">
                {{ num(gps?.speed_kmh ?? null) }}<span class="unit">km/h</span>
            </p>
            <p class="fix">
                <span class="chip" :class="fixTone">{{ fixLabel }}</span>
                <span v-if="gps?.satellites !== null && gps?.satellites !== undefined" class="num">
                    {{ gps.satellites }} sat.
                </span>
            </p>
            <span class="age num">{{ ago(gpsAt, now) }}</span>

            <details class="details">
                <summary>
                    <Icon name="caret-down" :size="14" class="caret" />
                    Détails GPS
                </summary>
                <dl>
                    <dt>Position</dt>
                    <dd>{{ position_(gps?.lat, gps?.lon) }}</dd>
                    <dt>Altitude</dt>
                    <dd>{{ num(gps?.alt_m ?? null, 0, "m") }}</dd>
                    <dt>Cap</dt>
                    <dd>{{ heading(gps?.course_deg ?? null) }}</dd>
                    <dt>HDOP</dt>
                    <dd>{{ num(gps?.hdop ?? null, 1) }}</dd>
                    <dt>Heure GPS</dt>
                    <dd>{{ hour(gps?.gps_time) }}</dd>
                </dl>
            </details>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
    import type { CircleMarker, Map as LeafletMap, Polyline } from "leaflet"
    import type { AppConfig } from "@lib/config"
    import { live, localTime } from "@lib/live"
    import { now } from "@lib/clock"
    import { trail } from "@lib/history"
    import { STALE_AFTER_MS } from "@lib/telemetry"
    import { ago, heading, hour, num, position as position_ } from "@lib/format"
    import Icon from "@components/Icon.vue"

    /*
     * Leaflet with raster tiles (OpenStreetMap by default), loaded on demand so
     * it stays out of the first paint. The map follows the car until the
     * viewer drags it; "Recentrer" resumes following. Without a fix, the last
     * known position stays on the map, greyed.
     */

    const props = defineProps<{ tiles: AppConfig["tiles"] }>()

    const container = ref<HTMLElement>()
    const follow = ref(true)

    const gps = computed(() => live.telemetry?.gps)
    const gpsAt = computed(() => localTime(gps.value?.ts))
    const hasFix = computed(() => gps.value?.fix === "2d" || gps.value?.fix === "3d")

    /** Current position, or the last one seen this session. */
    const position = computed<[number, number] | null>(() => {
        void trail.rev
        const g = gps.value
        if (g && g.lat !== null && g.lon !== null && hasFix.value) return [g.lat, g.lon]
        return trail.points.at(-1) ?? null
    })

    const gpsStale = computed(
        () => !live.carOnline || gpsAt.value === null || now.value - gpsAt.value > STALE_AFTER_MS.gps
    )

    const fixLabel = computed(() => {
        switch (gps.value?.fix) {
            case "3d":
                return "GPS 3D"
            case "2d":
                return "GPS 2D"
            case "none":
                return "Sans fix GPS"
        }
        return "GPS inconnu"
    })

    const fixTone = computed(() => (hasFix.value && !gpsStale.value ? "ok" : "off"))

    let map: LeafletMap | undefined
    let marker: CircleMarker | undefined
    let line: Polyline | undefined
    let drawn = 0
    let droppedSeen = 0
    let resize: ResizeObserver | undefined
    let destroyed = false
    // The map opens on an overview until the first position is known.
    let located = false

    function color(name: string): string {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    }

    function markerStyle(): { fillColor: string; color: string } {
        const live_ = hasFix.value && !gpsStale.value
        return { fillColor: live_ ? color("--live") : color("--stale"), color: "#ffffff" }
    }

    /** Appends the trail points not drawn yet; redraws all after a trim. */
    function drawTrail(): void {
        if (!line) return
        if (trail.dropped !== droppedSeen) {
            droppedSeen = trail.dropped
            line.setLatLngs(trail.points)
            drawn = trail.points.length
            return
        }
        for (const point of trail.points.slice(drawn)) line.addLatLng(point)
        drawn = trail.points.length
    }

    function update(): void {
        if (!map || !marker) return
        const at = position.value
        if (at) {
            marker.setLatLng(at)
            if (!map.hasLayer(marker)) marker.addTo(map)
            if (!located) {
                located = true
                map.setView(at, 16)
            } else if (follow.value) {
                map.panTo(at, { animate: true, duration: 0.5 })
            }
        }
        marker.setStyle(markerStyle())
    }

    function recenter(): void {
        follow.value = true
        const at = position.value
        if (map && at) map.setView(at, Math.max(map.getZoom(), 15))
    }

    onMounted(async () => {
        const [{ default: L }] = await Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
        if (destroyed || !container.value) return

        const start = position.value
        map = L.map(container.value, { zoomControl: true, attributionControl: true })
        map.setView(start ?? [46.6, 2.4], start ? 16 : 5)
        located = start !== null
        map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>')
        L.tileLayer(props.tiles.url, {
            attribution: props.tiles.attribution,
            maxZoom: props.tiles.maxZoom
        }).addTo(map)

        line = L.polyline([], { color: color("--accent"), weight: 3, opacity: 0.85, interactive: false }).addTo(map)
        marker = L.circleMarker(start ?? [0, 0], { radius: 7, weight: 2, fillOpacity: 1, interactive: false, ...markerStyle() })
        if (start) marker.addTo(map)

        // A drag by the viewer stops following; zooming does not.
        map.on("dragstart", () => (follow.value = false))

        // The map is created hidden on phones (another tab open): resize it
        // whenever its box changes.
        resize = new ResizeObserver(() => map?.invalidateSize())
        resize.observe(container.value)

        drawTrail()
        update()
    })

    watch(() => trail.rev, drawTrail)
    watch([position, hasFix, gpsStale], update)

    onBeforeUnmount(() => {
        destroyed = true
        resize?.disconnect()
        map?.remove()
    })
</script>

<style scoped>
    .map-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .map-wrap {
        position: relative;
        flex: 1;
        min-height: 160px;
    }

    .map {
        position: absolute;
        inset: 0;
        background: var(--surface-2);
    }

    /* Light raster tiles inverted to sit in the dark theme. */
    .map.darken :deep(.leaflet-tile-pane) {
        filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.88) saturate(0.6);
    }

    .map :deep(.leaflet-control-attribution) {
        font-size: 10px;
        color: var(--text-4);
        background: var(--scrim);
    }

    .map :deep(.leaflet-control-attribution a) {
        color: var(--text-2);
    }

    .map :deep(.leaflet-bar a) {
        color: var(--text);
        background: var(--surface-2);
        border-color: var(--line-2);
    }

    .notice {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 500;
        padding: 6px 12px;
        border-radius: var(--r-sm);
        font-size: 13px;
        color: var(--text-3);
        background: var(--scrim);
        pointer-events: none;
    }

    .recenter {
        position: absolute;
        right: 10px;
        top: 10px;
        z-index: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 36px;
        padding: 0 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text);
        background: var(--scrim);
        box-shadow: inset 0 0 0 1px var(--line-3);
    }

    .gps {
        flex: none;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 4px 12px;
        padding: 10px 14px;
        border-top: 1px solid var(--line);
        transition: opacity 0.3s;
    }

    .gps.stale .speed,
    .gps.stale .fix {
        opacity: 0.55;
    }

    .speed {
        font-size: 26px;
        font-weight: 650;
        line-height: 1;
    }

    .unit {
        margin-left: 4px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-4);
    }

    .fix {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-3);
    }

    .chip {
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-4);
        background: var(--surface-3);
    }

    .chip.ok {
        color: var(--ok);
        background: rgba(76, 195, 138, 0.12);
    }

    .age {
        font-size: 11.5px;
        color: var(--text-5);
    }

    .details {
        grid-column: 1 / -1;
    }

    .details summary {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 28px;
        font-size: 12.5px;
        color: var(--text-4);
        cursor: pointer;
        list-style: none;
    }

    .details summary::-webkit-details-marker {
        display: none;
    }

    .caret {
        transition: transform 0.2s;
        transform: rotate(-90deg);
    }

    .details[open] .caret {
        transform: none;
    }

    dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 14px;
        margin-top: 6px;
        font-size: 13px;
    }

    dt {
        color: var(--text-4);
    }

    dd {
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: var(--text-2);
    }
</style>
