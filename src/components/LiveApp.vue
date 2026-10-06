<template>
    <div class="app" :data-layout="layout">
        <AppHeader v-if="layout !== 'landscape'" />
        <StatusBanner v-if="layout !== 'landscape'" />

        <main class="main">
            <VideoStage class="stage" />

            <div v-if="tabbed" class="tabs" role="tablist" aria-label="Panneaux">
                <button
                    v-for="tab in tabs"
                    :id="`tab-${tab.id}`"
                    :key="tab.id"
                    type="button"
                    role="tab"
                    :aria-selected="view.tab === tab.id"
                    :aria-controls="`panel-${tab.id}`"
                    @click="view.tab = tab.id"
                >
                    <Icon :name="tab.icon" :size="17" />
                    {{ tab.label }}
                </button>
            </div>

            <!--
                Panels stay mounted when hidden (v-show): the map keeps its
                trail and the mixer keeps playing whatever tab is open.
            -->
            <section
                v-show="visible('map')"
                id="panel-map"
                class="panel panel-map"
                :role="tabbed ? 'tabpanel' : undefined"
                aria-label="Carte"
            >
                <MapPanel :tiles="config.tiles" />
            </section>
            <section
                v-show="visible('mixer')"
                id="panel-mixer"
                class="panel panel-mixer"
                :role="tabbed ? 'tabpanel' : undefined"
                aria-label="Son"
            >
                <!-- Desktop folds the mixer into a dock under the telemetry. -->
                <SoundDock v-if="layout === 'desktop'" />
                <MixerPanel v-else />
            </section>
            <section
                v-show="visible('telemetry')"
                id="panel-telemetry"
                class="panel panel-telemetry"
                :role="tabbed ? 'tabpanel' : undefined"
                aria-label="Télémétrie"
            >
                <TelemetryPanel />
            </section>
        </main>
    </div>
</template>

<script setup lang="ts">
    import { computed, watch } from "vue"
    import type { AppConfig } from "@lib/config"
    import type { IconName } from "@assets/icons"
    import { live, setWantedCameras, start } from "@lib/live"
    import { layout, watchLayout } from "@lib/layout"
    import { shown, view, type Tab } from "@lib/view"
    import { wantedCameras } from "@lib/subscriptions"
    import { startClock } from "@lib/clock"
    import Icon from "@components/Icon.vue"
    import AppHeader from "@components/AppHeader.vue"
    import StatusBanner from "@components/StatusBanner.vue"
    import VideoStage from "@components/VideoStage.vue"
    import MapPanel from "@components/MapPanel.vue"
    import MixerPanel from "@components/MixerPanel.vue"
    import SoundDock from "@components/SoundDock.vue"
    import TelemetryPanel from "@components/TelemetryPanel.vue"

    const props = defineProps<{ config: AppConfig }>()

    watchLayout()
    startClock()
    start(props.config.carIdentity)

    const tabs: { id: Tab; label: string; icon: IconName }[] = [
        { id: "map", label: "Carte", icon: "map-trifold" },
        { id: "mixer", label: "Son", icon: "faders" },
        { id: "telemetry", label: "Infos", icon: "info" }
    ]

    const tabbed = computed(() => layout.value === "phone" || layout.value === "tablet")

    function visible(panel: Tab): boolean {
        if (layout.value === "landscape") return false
        return tabbed.value ? view.tab === panel : true
    }

    const wanted = computed<string[]>(() => wantedCameras(live.cameras, layout.value, shown.value, view.audioOnly))

    watch(wanted, names => setWantedCameras(names), { immediate: true })
</script>

<style scoped>
    .app {
        height: 100dvh;
        display: flex;
        flex-direction: column;
        padding: 0 var(--safe-right) 0 var(--safe-left);
    }

    .main {
        flex: 1;
        min-height: 0;
    }

    .panel {
        min-height: 0;
        background: var(--surface);
    }

    /*
     * ── Desktop: the video takes the whole left side; on the right, map,
     * telemetry and the folded sound dock ──
     */

    [data-layout="desktop"] .main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) clamp(320px, 27vw, 420px);
        grid-template-rows: clamp(220px, 36vh, 380px) minmax(0, 1fr) auto;
        grid-template-areas:
            "stage map"
            "stage telemetry"
            "stage mixer";
        gap: 10px;
        padding: 0 10px 10px;
    }

    [data-layout="desktop"] .stage {
        grid-area: stage;
        min-height: 0;
    }

    [data-layout="desktop"] .panel {
        border-radius: var(--r-lg);
        box-shadow: inset 0 0 0 1px var(--line);
        overflow: hidden;
    }

    /* Leaflet's panes use z-indexes up to 1000: keep them inside the map. */
    [data-layout="desktop"] .panel-map {
        grid-area: map;
        isolation: isolate;
    }

    /* The dock draws its own bar, and its mixer unfolds over the telemetry. */
    [data-layout="desktop"] .panel-mixer {
        grid-area: mixer;
        position: relative;
        z-index: 5;
        overflow: visible;
        background: none;
        box-shadow: none;
    }

    [data-layout="desktop"] .panel-telemetry {
        grid-area: telemetry;
        overflow-y: auto;
    }

    /* ── Phone and tablet portrait: video on top, one panel at a time below ── */

    [data-layout="phone"] .main,
    [data-layout="tablet"] .main {
        display: flex;
        flex-direction: column;
    }

    [data-layout="phone"] .stage,
    [data-layout="tablet"] .stage {
        flex: none;
    }

    [data-layout="phone"] .panel,
    [data-layout="tablet"] .panel {
        flex: 1;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding-bottom: var(--safe-bottom);
    }

    [data-layout="phone"] .panel-map,
    [data-layout="tablet"] .panel-map {
        overflow: hidden;
    }

    .tabs {
        flex: none;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        background: var(--bg);
        border-bottom: 1px solid var(--line);
    }

    .tabs button {
        min-height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-4);
        border-bottom: 2px solid transparent;
    }

    .tabs button[aria-selected="true"] {
        color: var(--text);
        border-bottom-color: var(--accent);
    }

    /* ── Phone on its side: the video takes the whole screen ── */

    .app[data-layout="landscape"] {
        padding: 0;
    }

    [data-layout="landscape"] .stage {
        position: fixed;
        inset: 0;
        z-index: 10;
    }
</style>
