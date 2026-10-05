<template>
    <article class="card" :class="{ stale }">
        <header class="head">
            <h2 class="lab">{{ title }}</h2>
            <span v-if="updated !== undefined" class="age num" :title="stale ? 'Valeurs anciennes' : undefined">
                {{ ago(updated, now) }}
            </span>
        </header>

        <slot />

        <details v-if="$slots.details" class="details">
            <summary>
                <Icon name="caret-down" :size="14" class="caret" />
                {{ detailsLabel ?? "Détails" }}
            </summary>
            <dl class="grid">
                <slot name="details" />
            </dl>
        </details>
    </article>
</template>

<script setup lang="ts">
    import { now } from "@lib/clock"
    import { ago } from "@lib/format"
    import Icon from "@components/Icon.vue"

    /*
     * One telemetry section: title, age of its sample, a main block, and an
     * optional fold-out list of the remaining fields. Stale sections (car
     * offline, or sample too old) are dimmed but stay readable.
     */
    defineProps<{
        title: string
        /** Sample time (epoch ms), or null if unknown; omit to hide the age. */
        updated?: number | null
        stale?: boolean
        detailsLabel?: string
    }>()
</script>

<style scoped>
    .card {
        display: grid;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--line);
        transition: opacity 0.3s;
    }

    .card.stale {
        opacity: 0.55;
    }

    .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
    }

    .age {
        font-size: 11.5px;
        color: var(--text-5);
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

    .grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 14px;
        margin-top: 6px;
        font-size: 13px;
    }

    .grid :deep(dt) {
        color: var(--text-4);
    }

    .grid :deep(dd) {
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: var(--text-2);
    }
</style>
