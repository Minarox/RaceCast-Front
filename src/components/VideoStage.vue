<template>
    <div class="stage" :data-layout="layout">
        <div
            ref="hero"
            class="hero"
            @touchstart.passive="onTouchStart"
            @touchend="onTouchEnd"
            @click="onHeroClick"
        >
            <VideoView v-if="!placeholder && shown" :key="shown" :name="shown" />

            <div v-else-if="placeholder" class="placeholder">
                <Icon :name="placeholder.icon" :size="34" />
                <p class="title">{{ placeholder.title }}</p>
                <p v-if="placeholder.text" class="text">{{ placeholder.text }}</p>
                <button v-if="placeholder.resume" type="button" class="pill" @click.stop="view.audioOnly = false">
                    <Icon name="video-camera" :size="16" />
                    Reprendre la vidéo
                </button>
            </div>

            <!-- Overlays: the controls fade out in landscape until the screen is tapped. -->
            <div class="overlay" :class="{ hidden: layout === 'landscape' && !controls }">
                <div class="top">
                    <span v-if="shown && !placeholder" class="label">
                        <Icon v-if="shown === live.mainCamera" name="star-fill" :size="13" class="star" />
                        {{ shown }}
                    </span>
                    <span class="grow" />
                    <button
                        v-if="fullscreenAvailable && layout !== 'landscape' && !placeholder"
                        type="button"
                        class="round"
                        :title="fullscreen ? 'Quitter le plein écran' : 'Plein écran'"
                        @click.stop="toggleFullscreen"
                    >
                        <Icon :name="fullscreen ? 'arrows-in' : 'arrows-out'" />
                    </button>
                </div>

                <div v-if="layout === 'landscape'" class="strip num">
                    <span class="live-dot" :class="{ on: live.carOnline }" />
                    <span>{{ live.carOnline ? "En direct" : "Hors ligne" }}</span>
                    <span v-if="speed !== null">{{ num(speed, 0, "km/h") }}</span>
                    <span v-if="signal !== null">Signal {{ num(signal, 0, "%") }}</span>
                    <span v-if="battery !== null">Batterie {{ num(battery, 0, "%") }}</span>
                </div>

                <div class="bottom">
                    <button v-if="awayFromMain" type="button" class="pill" @click.stop="backToMain">
                        <Icon name="arrow-counter-clockwise" :size="16" />
                        Revenir à la principale
                    </button>
                    <span class="grow" />
                    <div v-if="swipeable && live.cameras.length > 1" class="switcher">
                        <button type="button" class="round" title="Caméra précédente" @click.stop="step(-1)">
                            <Icon name="caret-left" />
                        </button>
                        <span class="dots" aria-hidden="true">
                            <span
                                v-for="camera in live.cameras"
                                :key="camera.name"
                                class="dot"
                                :class="{ on: camera.name === shown }"
                            />
                        </span>
                        <button type="button" class="round" title="Caméra suivante" @click.stop="step(1)">
                            <Icon name="caret-right" />
                        </button>
                    </div>
                </div>
            </div>

            <button v-if="soundPrompt" type="button" class="sound" @click.stop="enableSound">
                <Icon name="speaker-high" :size="20" />
                Activer le son
            </button>
        </div>

        <div v-if="thumbnails.length" class="thumbs">
            <button
                v-for="camera in thumbnails"
                :key="camera.name"
                type="button"
                class="thumb"
                :title="`Afficher ${camera.name}`"
                @click="pick(camera.name)"
            >
                <VideoView :name="camera.name" small />
                <span class="label">
                    <Icon v-if="camera.name === live.mainCamera" name="star-fill" :size="12" class="star" />
                    {{ camera.name }}
                </span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
    import type { IconName } from "@assets/icons"
    import { live } from "@lib/live"
    import { layout, showsAllCameras } from "@lib/layout"
    import { awayFromMain, backToMain, pick, shown, step, view } from "@lib/view"
    import { enableSound, mixer } from "@lib/mixer"
    import { unplayable } from "@lib/codecs"
    import { num } from "@lib/format"
    import Icon from "@components/Icon.vue"
    import VideoView from "@components/VideoView.vue"

    interface Placeholder {
        icon: IconName
        title: string
        text?: string
        resume?: boolean
    }

    const hero = ref<HTMLElement>()

    const shownCamera = computed(() => live.cameras.find(camera => camera.name === shown.value))

    /** Why the big slot shows a message instead of a video, if it does. */
    const placeholder = computed<Placeholder | null>(() => {
        if (!live.carOnline) {
            if (live.connection === "connecting") return { icon: "circle-notch", title: "Connexion au direct…" }
            if (live.connection !== "connected") {
                return { icon: "wifi-slash", title: "Connexion perdue", text: "Nouvelle tentative en cours…" }
            }
            return { icon: "video-camera-slash", title: "Voiture hors ligne", text: "En attente du flux…" }
        }
        if (!shownCamera.value) return { icon: "video-camera-slash", title: "Aucune caméra diffusée" }
        if (unplayable(shownCamera.value.mimeType)) {
            return {
                icon: "warning-circle",
                title: "Vidéo AV1 non prise en charge",
                text:
                    "Ce navigateur ne sait pas décoder la vidéo de la voiture. Le son, la carte et la télémétrie restent disponibles. " +
                    "Essayez Chrome, Edge ou Firefox ; sur iPhone ou iPad, il faut un modèle récent (iPhone 15 Pro ou plus récent)."
            }
        }
        if (view.audioOnly) {
            return { icon: "headphones", title: "Vidéo en pause", text: "Mode audio seul : aucune vidéo n'est reçue.", resume: true }
        }
        return null
    })

    const thumbnails = computed(() => {
        if (!showsAllCameras(layout.value) || view.audioOnly) return []
        return live.cameras.filter(camera => camera.name !== shown.value && !unplayable(camera.mimeType))
    })

    const swipeable = computed(() => layout.value === "phone" || layout.value === "landscape")

    const soundPrompt = computed(() => live.microphones.length > 0 && !mixer.enabled)

    const speed = computed(() => live.telemetry?.gps?.speed_kmh ?? null)
    const signal = computed(() => live.telemetry?.modem?.signal_quality ?? null)
    const battery = computed(() => live.telemetry?.ups?.percent ?? null)

    /* ── Swipe between cameras (phone) ── */

    let touchX = 0
    let touchY = 0

    function onTouchStart(event: TouchEvent): void {
        const touch = event.changedTouches[0]
        if (!touch) return
        touchX = touch.clientX
        touchY = touch.clientY
    }

    function onTouchEnd(event: TouchEvent): void {
        const touch = event.changedTouches[0]
        if (!touch || !swipeable.value) return
        const dx = touch.clientX - touchX
        const dy = touch.clientY - touchY
        if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
            step(dx < 0 ? 1 : -1)
            showControls()
        }
    }

    /* ── Landscape: controls appear on tap and hide after a few seconds ── */

    const controls = ref(true)
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    function showControls(): void {
        controls.value = true
        clearTimeout(hideTimer)
        hideTimer = setTimeout(() => (controls.value = false), 4000)
    }

    function onHeroClick(): void {
        if (layout.value !== "landscape") return
        if (controls.value) {
            clearTimeout(hideTimer)
            controls.value = false
        } else {
            showControls()
        }
    }

    watch(layout, value => {
        if (value === "landscape") showControls()
    })

    /* ── Fullscreen (desktop and tablet) ── */

    const fullscreenAvailable = document.fullscreenEnabled
    const fullscreen = ref(false)

    function onFullscreenChange(): void {
        fullscreen.value = document.fullscreenElement === hero.value
    }

    function toggleFullscreen(): void {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void hero.value?.requestFullscreen()
    }

    onMounted(() => {
        document.addEventListener("fullscreenchange", onFullscreenChange)
        if (layout.value === "landscape") showControls()
    })

    onBeforeUnmount(() => {
        document.removeEventListener("fullscreenchange", onFullscreenChange)
        clearTimeout(hideTimer)
    })
</script>

<style scoped>
    .stage {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
    }

    .hero {
        position: relative;
        overflow: hidden;
        background: var(--video-bg);
        user-select: none;
        -webkit-user-select: none;
    }

    .stage[data-layout="desktop"] .hero {
        flex: 1;
        min-height: 0;
        border-radius: var(--r-lg);
    }

    .stage[data-layout="phone"] .hero,
    .stage[data-layout="tablet"] .hero {
        aspect-ratio: 16 / 9;
        width: 100%;
    }

    .stage[data-layout="phone"],
    .stage[data-layout="tablet"] {
        gap: 0;
    }

    .stage[data-layout="landscape"] .hero {
        height: 100%;
    }

    .hero:fullscreen {
        border-radius: 0;
    }

    .placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 24px;
        text-align: center;
        color: var(--text-4);
    }

    .placeholder .title {
        font-size: 17px;
        font-weight: 600;
        color: var(--text-2);
    }

    .placeholder .text {
        max-width: 46ch;
        font-size: 14px;
        line-height: 1.45;
    }

    /* ── Overlays ── */

    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: calc(10px + var(--safe-top)) calc(10px + var(--safe-right)) calc(10px + var(--safe-bottom))
            calc(10px + var(--safe-left));
        pointer-events: none;
        transition: opacity 0.25s;
    }

    .overlay.hidden {
        opacity: 0;
    }

    .overlay.hidden * {
        pointer-events: none !important;
    }

    .overlay button {
        pointer-events: auto;
    }

    .top,
    .bottom {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .grow {
        flex: 1;
    }

    .label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 9px;
        border-radius: var(--r-sm);
        font: 500 12px/1.2 var(--font-mono);
        color: var(--text);
        background: var(--scrim);
    }

    .star {
        color: #f5c84c;
    }

    .round {
        display: grid;
        place-items: center;
        width: var(--touch);
        height: var(--touch);
        border-radius: 50%;
        color: var(--text);
        background: var(--scrim);
    }

    .pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        font-size: 13.5px;
        font-weight: 500;
        color: var(--text);
        background: var(--scrim);
        box-shadow: inset 0 0 0 1px var(--line-3);
        pointer-events: auto;
    }

    .switcher {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .dots {
        display: flex;
        gap: 6px;
        padding: 6px 8px;
        border-radius: 999px;
        background: var(--scrim-soft);
    }

    .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--text-5);
    }

    .dot.on {
        background: var(--text);
    }

    .strip {
        align-self: center;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 13px;
        color: var(--text);
        background: var(--scrim);
    }

    .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--stale);
    }

    .live-dot.on {
        background: var(--live);
    }

    .sound {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: inline-flex;
        align-items: center;
        gap: 9px;
        min-height: 48px;
        padding: 0 22px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text);
        background: rgba(93, 82, 148, 0.85);
        box-shadow:
            0 6px 24px rgba(0, 0, 0, 0.45),
            inset 0 0 0 1px var(--accent);
        backdrop-filter: blur(6px);
    }

    /* ── Thumbnails ── */

    .thumbs {
        flex: none;
        display: flex;
        gap: 10px;
        overflow-x: auto;
    }

    .stage[data-layout="desktop"] .thumbs {
        height: clamp(90px, 15vh, 150px);
    }

    .stage[data-layout="tablet"] .thumbs {
        height: 108px;
        padding: 8px 10px;
        background: var(--bg);
    }

    .thumb {
        position: relative;
        flex: none;
        height: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        border-radius: var(--r-md);
        box-shadow: inset 0 0 0 1px var(--line-2);
    }

    .thumb:hover {
        box-shadow: inset 0 0 0 2px var(--accent-line);
    }

    .thumb .label {
        position: absolute;
        left: 6px;
        bottom: 6px;
        font-size: 11px;
    }
</style>
