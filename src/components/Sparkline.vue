<template>
    <svg class="sparkline" :class="tone" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
        <path v-if="path" :d="path" vector-effect="non-scaling-stroke" />
    </svg>
</template>

<script setup lang="ts">
    import { computed } from "vue"
    import { HISTORY_MS, type Series } from "@lib/history"
    import type { Level } from "@lib/telemetry"

    /*
     * The last ten minutes of one value. The right edge is the newest sample
     * (the car's clock), so the curve freezes rather than scrolls away when
     * the car goes offline; the left edge is the oldest sample kept, so the
     * curve spans the width from the first minute. `min`/`max` pin the scale
     * (e.g. 0–100 for percentages); otherwise it fits the data.
     */
    const props = defineProps<{
        series: Series
        min?: number
        max?: number
        tone?: Level | "stale"
    }>()

    const path = computed<string>(() => {
        void props.series.rev
        const { t, v } = props.series
        if (t.length < 2) return ""
        const end = t[t.length - 1]!
        const start = Math.max(t[0]!, end - HISTORY_MS)
        const span = Math.max(1, end - start)

        let low = props.min ?? Infinity
        let high = props.max ?? -Infinity
        if (props.min === undefined || props.max === undefined) {
            for (const value of v) {
                if (value === null) continue
                if (props.min === undefined) low = Math.min(low, value)
                if (props.max === undefined) high = Math.max(high, value)
            }
        }
        if (!Number.isFinite(low) || !Number.isFinite(high)) return ""
        if (high - low < 1e-6) {
            low -= 1
            high += 1
        }

        let d = ""
        let pen = false
        for (let i = 0; i < t.length; i++) {
            const value = v[i]
            if (value === null || value === undefined) {
                pen = false
                continue
            }
            const x = ((t[i]! - start) / span) * 100
            const y = 28 - ((Math.min(high, Math.max(low, value)) - low) / (high - low)) * 26
            d += `${pen ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`
            pen = true
        }
        return d
    })
</script>

<style scoped>
    .sparkline {
        display: block;
        width: 100%;
        height: 30px;
        overflow: visible;
    }

    path {
        fill: none;
        stroke: var(--accent);
        stroke-width: 1.6;
        stroke-linejoin: round;
        stroke-linecap: round;
    }

    .warn path {
        stroke: var(--warn);
    }

    .crit path {
        stroke: var(--crit);
    }

    .stale path {
        stroke: var(--stale);
    }
</style>
