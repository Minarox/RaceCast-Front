<template>
    <div v-if="messages.length" class="banners">
        <p v-for="message in messages" :key="message.id" class="banner" :class="message.tone" role="status">
            <Icon :name="message.icon" :size="16" />
            <span class="text">{{ message.text }}</span>
            <button v-if="message.id === 'waiting'" type="button" class="retry" @click="retryNow">Réessayer</button>
        </p>
    </div>
</template>

<script setup lang="ts">
    import { computed } from "vue"
    import type { IconName } from "@assets/icons"
    import { live, localTime, retryNow } from "@lib/live"
    import { now } from "@lib/clock"
    import { ago } from "@lib/format"
    import Icon from "@components/Icon.vue"

    interface Message {
        id: string
        tone: "info" | "warn"
        icon: IconName
        text: string
    }

    const messages = computed<Message[]>(() => {
        const list: Message[] = []

        if (live.connection === "waiting") {
            const seconds = live.retryAt ? Math.max(0, Math.ceil((live.retryAt - now.value) / 1000)) : 0
            list.push({
                id: "waiting",
                tone: "warn",
                icon: "wifi-slash",
                text: `Connexion au direct perdue · nouvelle tentative dans ${seconds}\u00a0s`
            })
        } else if (live.connection === "connected" && !live.carOnline) {
            const updated = localTime(live.telemetry?.ts)
            list.push({
                id: "offline",
                tone: "info",
                icon: "video-camera-slash",
                text: updated
                    ? `Voiture hors ligne · dernière mise à jour ${ago(updated, now.value)}`
                    : "Voiture hors ligne · aucune donnée reçue pour l'instant"
            })
        }

        if (live.unsupportedVersion !== undefined) {
            const version = live.unsupportedVersion === null ? "" : ` (v${live.unsupportedVersion})`
            list.push({
                id: "version",
                tone: "warn",
                icon: "warning-circle",
                text: `Format de télémétrie inconnu${version} : rechargez la page. Si le message reste, le site doit être mis à jour.`
            })
        }

        return list
    })
</script>

<style scoped>
    .banners {
        flex: none;
        display: grid;
        gap: 6px;
        padding: 0 10px 8px;
    }

    .banner {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 12px;
        border-radius: var(--r-md);
        font-size: 13.5px;
        color: var(--text-2);
        background: var(--surface-2);
        box-shadow: inset 0 0 0 1px var(--line-2);
    }

    .banner.warn {
        color: var(--text);
        background: rgba(240, 163, 58, 0.12);
        box-shadow: inset 0 0 0 1px rgba(240, 163, 58, 0.35);
    }

    .banner.warn .icon {
        color: var(--warn);
    }

    .text {
        flex: 1;
    }

    .retry {
        min-height: 32px;
        padding: 0 12px;
        border-radius: var(--r-sm);
        font-size: 13px;
        font-weight: 600;
        background: var(--surface-3);
    }
</style>
