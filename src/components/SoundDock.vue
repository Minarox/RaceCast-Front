<template>
    <div ref="dock" class="dock">
        <div ref="bar" class="bar">
            <button
                ref="toggle"
                type="button"
                class="toggle"
                :aria-expanded="view.soundOpen"
                aria-controls="sound-popover"
                :title="view.soundOpen ? 'Replier le mixeur' : 'Ouvrir le mixeur'"
                @click="view.soundOpen = !view.soundOpen"
            >
                <span class="lab">Son</span>
                <span v-if="live.microphones.length" class="minis" aria-hidden="true">
                    <span
                        v-for="microphone in live.microphones"
                        :key="microphone.name"
                        class="mini"
                        :data-meter="microphone.name"
                        :title="microphone.name"
                    >
                        <span class="fill" />
                    </span>
                </span>
                <span v-else class="none">aucun micro</span>
                <Icon name="caret-down" :size="16" class="caret" />
            </button>
            <button
                type="button"
                class="speaker"
                :class="{ prompt: needsGesture }"
                :disabled="live.microphones.length === 0"
                :title="speakerTitle"
                :aria-label="speakerTitle"
                @click="onSpeaker"
            >
                <Icon :name="audible ? 'speaker-high' : 'speaker-slash'" :size="17" />
            </button>
        </div>

        <div v-show="view.soundOpen" id="sound-popover" class="popover" role="region" aria-label="Mixeur">
            <MixerPanel />
            <button type="button" class="close" title="Replier le mixeur" @click="close">
                <Icon name="caret-down" :size="16" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref } from "vue"
    import { live } from "@lib/live"
    import { enableSound, mixer, toggleMasterMute } from "@lib/mixer"
    import { useMeters } from "@lib/meters"
    import { view } from "@lib/view"
    import Icon from "@components/Icon.vue"
    import MixerPanel from "@components/MixerPanel.vue"

    /*
     * Desktop only: the mixer folded into a bar at the bottom of the right
     * column, so the video gets the full height on the left. The bar shows a
     * small level meter per microphone and the master speaker button; the
     * mixer unfolds upwards over the telemetry and folds back with its caret,
     * Escape, or a click anywhere else. Open or closed is remembered.
     */

    const dock = ref<HTMLElement>()
    const bar = ref<HTMLElement>()
    const toggle = ref<HTMLButtonElement>()

    useMeters(bar)

    const needsGesture = computed(() => live.microphones.length > 0 && !mixer.enabled)
    const audible = computed(() => mixer.enabled && !mixer.masterMuted)

    const speakerTitle = computed(() => {
        if (live.microphones.length === 0) return "Aucun micro diffusé"
        if (!mixer.enabled) return "Activer le son"
        return mixer.masterMuted ? "Rétablir le son" : "Couper le son"
    })

    function onSpeaker(): void {
        if (!mixer.enabled) void enableSound()
        else toggleMasterMute()
    }

    function close(): void {
        view.soundOpen = false
        toggle.value?.focus()
    }

    function onPointerDown(event: PointerEvent): void {
        if (view.soundOpen && dock.value && !dock.value.contains(event.target as Node)) view.soundOpen = false
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (event.key === "Escape" && view.soundOpen) close()
    }

    onMounted(() => {
        document.addEventListener("pointerdown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
    })

    onBeforeUnmount(() => {
        document.removeEventListener("pointerdown", onPointerDown)
        document.removeEventListener("keydown", onKeyDown)
    })
</script>

<style scoped>
    .dock {
        position: relative;
    }

    .bar {
        display: flex;
        align-items: center;
        gap: 4px;
        min-height: 48px;
        padding: 4px;
        border-radius: var(--r-lg);
        background: var(--surface);
        box-shadow: inset 0 0 0 1px var(--line);
    }

    .toggle {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: var(--touch);
        padding: 0 10px 0 12px;
        border-radius: var(--r-md);
    }

    .toggle:hover {
        background: var(--surface-2);
    }

    .minis {
        flex: 1;
        min-width: 0;
        display: flex;
        gap: 6px;
    }

    .mini {
        --level: 0;
        position: relative;
        flex: 0 1 44px;
        min-width: 14px;
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        background: var(--surface-3);
    }

    /* Same scale as the mixer's meters: green, then amber, then red. */
    .fill {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, var(--ok) 0 70%, var(--warn) 70% 90%, var(--crit) 90%);
        clip-path: inset(0 calc((1 - var(--level)) * 100%) 0 0);
    }

    .none {
        flex: 1;
        text-align: left;
        font-size: 12.5px;
        color: var(--text-5);
    }

    .caret {
        color: var(--text-4);
        transform: rotate(180deg);
    }

    .speaker {
        flex: none;
        display: grid;
        place-items: center;
        width: var(--touch);
        height: var(--touch);
        border-radius: var(--r-md);
        color: var(--text-2);
        background: var(--surface-2);
    }

    .speaker:hover:not(:disabled) {
        background: var(--surface-3);
    }

    .speaker:disabled {
        opacity: 0.45;
        cursor: default;
    }

    .speaker.prompt {
        color: var(--text);
        background: var(--accent-fill-strong);
        box-shadow: inset 0 0 0 1px var(--accent-line);
    }

    /* Unfolds upwards over the telemetry, covering the bar. */
    .popover {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        max-height: calc(100dvh - 140px);
        overflow-y: auto;
        border-radius: var(--r-lg);
        background: var(--surface-2);
        box-shadow:
            0 14px 44px rgba(0, 0, 0, 0.55),
            inset 0 0 0 1px var(--line-2);
    }

    .close {
        position: absolute;
        top: 8px;
        right: 8px;
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: var(--r-md);
        color: var(--text-3);
    }

    .close:hover {
        background: var(--surface-3);
    }
</style>
