<template>
    <div ref="root" class="mixer">
        <h2 class="lab">Son</h2>

        <p v-if="!live.microphones.length" class="empty">Aucun micro diffusé pour l'instant.</p>

        <template v-else>
            <div class="channels">
                <div
                    v-for="microphone in live.microphones"
                    :key="microphone.name"
                    class="strip"
                    :class="{ muted: settings(microphone.name).muted }"
                >
                    <div class="row">
                        <span class="name" :title="microphone.name">{{ microphone.name }}</span>
                        <span class="meter" :data-meter="microphone.name" aria-hidden="true">
                            <span class="fill" />
                        </span>
                        <span class="db num" :data-db="microphone.name">—</span>
                    </div>
                    <div class="row">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            :value="Math.round(settings(microphone.name).volume * 100)"
                            :aria-label="`Volume de ${microphone.name}`"
                            @input="setVolume(microphone.name, Number(($event.target as HTMLInputElement).value) / 100)"
                        />
                        <span class="percent num">{{ Math.round(settings(microphone.name).volume * 100) }}&nbsp;%</span>
                        <button
                            type="button"
                            class="mute"
                            :aria-pressed="settings(microphone.name).muted"
                            :title="
                                settings(microphone.name).muted
                                    ? `Rétablir ${microphone.name}`
                                    : `Couper ${microphone.name}`
                            "
                            @click="toggleMute(microphone.name)"
                        >
                            M
                        </button>
                    </div>
                </div>
            </div>

            <div class="strip master" :class="{ muted: mixer.masterMuted }">
                <div class="row">
                    <span class="name">Général</span>
                </div>
                <div class="row">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        :value="Math.round(mixer.master * 100)"
                        aria-label="Volume général"
                        @input="setMaster(Number(($event.target as HTMLInputElement).value) / 100)"
                    />
                    <span class="percent num">{{ Math.round(mixer.master * 100) }}&nbsp;%</span>
                    <button
                        type="button"
                        class="mute"
                        :aria-pressed="mixer.masterMuted"
                        :title="mixer.masterMuted ? 'Rétablir le son' : 'Couper le son'"
                        @click="toggleMasterMute"
                    >
                        <Icon :name="mixer.masterMuted ? 'speaker-slash' : 'speaker-high'" :size="16" />
                    </button>
                </div>
            </div>
        </template>

        <p v-if="live.microphones.length && !mixer.enabled" class="hint">
            Le son est coupé tant qu'il n'est pas activé (bouton sur la vidéo ou dans l'en-tête) ; les niveaux
            s'affichent ensuite.
        </p>
    </div>
</template>

<script setup lang="ts">
    import { ref } from "vue"
    import { live } from "@lib/live"
    import { channelSettings as settings, mixer, setMaster, setVolume, toggleMasterMute, toggleMute } from "@lib/mixer"
    import { useMeters } from "@lib/meters"
    import Icon from "@components/Icon.vue"

    /*
     * One strip per microphone: name, VU meter (pre-fader, so a muted
     * microphone still shows activity), volume and mute; then the master.
     * Shown in the "Son" tab on phones and tablets, and in the sound dock
     * (SoundDock.vue) on desktop.
     */

    const root = ref<HTMLElement>()

    useMeters(root)
</script>

<style scoped>
    .mixer {
        display: grid;
        gap: 12px;
        padding: 14px 16px;
    }

    .empty,
    .hint {
        font-size: 13px;
        color: var(--text-5);
    }

    /* auto-fit collapses unused columns, so two microphones share the width. */
    .channels {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px 24px;
    }

    /*
     * minmax(0, 1fr): an auto column would never shrink below the full
     * microphone name, so the rows overflowed into the next strip; this way
     * the name ellipsizes instead.
     */
    .strip {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 500 12.5px/1.3 var(--font-mono);
        color: var(--text-2);
    }

    .meter {
        --level: 0;
        position: relative;
        flex: none;
        width: 96px;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        background: var(--surface-3);
    }

    /* Green to amber to red along the scale; the fill reveals it. */
    .fill {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, var(--ok) 0 70%, var(--warn) 70% 90%, var(--crit) 90%);
        clip-path: inset(0 calc((1 - var(--level)) * 100%) 0 0);
    }

    .db {
        flex: none;
        width: 48px;
        text-align: right;
        font-size: 11.5px;
        color: var(--text-4);
    }

    input[type="range"] {
        flex: 1;
        min-width: 0;
        height: 32px;
        accent-color: var(--accent);
        background: transparent;
        cursor: pointer;
    }

    .percent {
        flex: none;
        width: 44px;
        text-align: right;
        font-size: 12.5px;
        color: var(--text-3);
    }

    .mute {
        flex: none;
        display: grid;
        place-items: center;
        width: var(--touch);
        height: 34px;
        border-radius: var(--r-sm);
        font-size: 13px;
        font-weight: 700;
        color: var(--text-3);
        background: var(--surface-3);
    }

    .mute[aria-pressed="true"] {
        color: var(--bg);
        background: var(--warn);
    }

    .strip.muted input[type="range"],
    .strip.muted .percent {
        opacity: 0.45;
    }

    .master {
        padding-top: 10px;
        border-top: 1px solid var(--line);
    }
</style>
