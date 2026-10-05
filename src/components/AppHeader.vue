<template>
    <header class="header">
        <div class="brand">
            <img src="/favicon.svg" alt="" width="22" height="22" />
            <span class="name">RaceCast</span>
        </div>

        <span class="status" :class="status.tone" role="status">
            <span class="dot" aria-hidden="true" />
            {{ status.label }}
        </span>

        <span v-if="live.connection === 'connected'" class="viewers num" :title="viewersLabel">
            <Icon name="eye" :size="16" />
            {{ live.viewers }}
            <span class="sr-only">{{ viewersLabel }}</span>
        </span>

        <span class="spacer" />

        <button
            type="button"
            class="action"
            :class="{ on: view.audioOnly }"
            :aria-pressed="view.audioOnly"
            title="Audio seul : ne recevoir aucune vidéo"
            @click="view.audioOnly = !view.audioOnly"
        >
            <Icon name="headphones" />
            <span class="wide">Audio seul</span>
        </button>

        <button
            type="button"
            class="action sound"
            :class="{ prompt: needsGesture }"
            :disabled="live.microphones.length === 0"
            :title="soundTitle"
            @click="onSound"
        >
            <Icon :name="audible ? 'speaker-high' : 'speaker-slash'" />
            <span class="wide">{{ soundLabel }}</span>
        </button>
    </header>
</template>

<script setup lang="ts">
    import { computed } from "vue"
    import { live } from "@lib/live"
    import { enableSound, mixer, toggleMasterMute } from "@lib/mixer"
    import { view } from "@lib/view"
    import Icon from "@components/Icon.vue"

    const status = computed<{ label: string; tone: string }>(() => {
        switch (live.connection) {
            case "connecting":
                return { label: "Connexion…", tone: "pending" }
            case "reconnecting":
                return { label: "Reconnexion…", tone: "pending" }
            case "waiting":
                return { label: "Déconnecté", tone: "off" }
        }
        return live.carOnline ? { label: "En direct", tone: "live" } : { label: "Hors ligne", tone: "off" }
    })

    const viewersLabel = computed(() => `${live.viewers} spectateur${live.viewers > 1 ? "s" : ""}`)

    const needsGesture = computed(() => live.microphones.length > 0 && !mixer.enabled)
    const audible = computed(() => mixer.enabled && !mixer.masterMuted)

    const soundLabel = computed(() => {
        if (needsGesture.value) return "Activer le son"
        return mixer.masterMuted ? "Son coupé" : "Son"
    })

    const soundTitle = computed(() => {
        if (live.microphones.length === 0) return "Aucun micro diffusé"
        if (!mixer.enabled) return "Activer le son"
        return mixer.masterMuted ? "Rétablir le son" : "Couper le son"
    })

    function onSound(): void {
        if (!mixer.enabled) void enableSound()
        else toggleMasterMute()
    }
</script>

<style scoped>
    .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 52px;
        padding: calc(6px + var(--safe-top)) 12px 6px;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .name {
        font-weight: 650;
        letter-spacing: 0.01em;
    }

    .status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12.5px;
        font-weight: 600;
        background: var(--surface-2);
        color: var(--text-3);
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--stale);
    }

    .status.live {
        color: var(--text);
        background: rgba(239, 79, 95, 0.14);
    }

    .status.live .dot {
        background: var(--live);
        box-shadow: 0 0 0 3px rgba(239, 79, 95, 0.25);
        animation: pulse 2s ease-in-out infinite;
    }

    .status.pending .dot {
        background: var(--warn);
    }

    @keyframes pulse {
        50% {
            box-shadow: 0 0 0 6px rgba(239, 79, 95, 0);
        }
    }

    .viewers {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 13px;
        color: var(--text-3);
    }

    .spacer {
        flex: 1;
    }

    .action {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: var(--touch);
        min-width: var(--touch);
        justify-content: center;
        padding: 0 10px;
        border-radius: var(--r-md);
        font-size: 13.5px;
        font-weight: 500;
        color: var(--text-2);
        background: var(--surface-2);
    }

    .action:hover:not(:disabled) {
        background: var(--surface-3);
    }

    .action:disabled {
        opacity: 0.45;
        cursor: default;
    }

    .action.on {
        color: var(--accent-soft);
        background: var(--accent-fill-strong);
    }

    .action.prompt {
        color: var(--text);
        background: var(--accent-fill-strong);
        box-shadow: inset 0 0 0 1px var(--accent-line);
    }

    /* Text labels only where there is room for them. */
    @media (max-width: 720px) {
        .wide {
            display: none;
        }

        .action {
            padding: 0;
        }

        .header {
            gap: 9px;
        }
    }

    @media (max-width: 380px) {
        .name {
            display: none;
        }
    }
</style>
