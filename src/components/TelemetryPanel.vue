<template>
    <div class="telemetry">
        <TelemetryCard title="Voiture" :stale="!live.carOnline">
            <p class="recording" :class="{ on: car?.recording }">
                <Icon name="record-fill" :size="14" />
                {{ car ? (car.recording ? "Enregistrement en cours" : "Enregistrement arrêté") : "État inconnu" }}
            </p>
            <ul v-if="car" class="devices">
                <li v-for="camera in car.cameras" :key="camera.name">
                    <Icon name="video-camera" :size="15" />
                    <span class="device">{{ camera.name }}</span>
                    <Icon v-if="camera.name === car.main_camera" name="star-fill" :size="12" class="star" />
                    <span class="state" :class="{ off: !camera.streaming }">
                        {{ camera.streaming ? "diffusée" : "non diffusée" }}
                    </span>
                </li>
                <li v-for="microphone in car.microphones" :key="microphone.name">
                    <Icon name="microphone" :size="15" />
                    <span class="device">{{ microphone.name }}</span>
                    <span class="state" :class="{ off: !microphone.streaming }">
                        {{ microphone.streaming ? "diffusé" : "non diffusé" }}
                    </span>
                </li>
            </ul>
        </TelemetryCard>

        <TelemetryCard title="Réseau" :updated="modemAt" :stale="stale('modem', modemAt)" details-label="Détails radio">
            <template v-if="modem">
                <div class="main">
                    <p class="big num" :class="levels.signal(modem.signal_quality)">
                        {{ num(modem.signal_quality) }}<span class="unit">%</span>
                    </p>
                    <Sparkline
                        class="spark"
                        :series="history.signal"
                        :min="0"
                        :max="100"
                        :tone="stale('modem', modemAt) ? 'stale' : levels.signal(modem.signal_quality)"
                    />
                </div>
                <p class="sub">
                    <span class="chip" :class="modemTone">{{ modemState }}</span>
                    {{ technology(modem.access_tech) }} · {{ text(modem.operator) }}
                </p>
                <!-- Only when the modem says so: unknown (null) is not an alert. -->
                <p v-if="modem.ip_connected === false" class="alert" role="status">
                    <Icon name="warning-circle" :size="15" />
                    Données mobiles coupées
                </p>
            </template>
            <p v-else class="empty">Aucune donnée du modem.</p>

            <template v-if="modem" #details>
                <dt>RSRP LTE / NR</dt>
                <dd>{{ num(modem.lte_rsrp_dbm) }} / {{ num(modem.nr_rsrp_dbm, 0, "dBm") }}</dd>
                <dt>RSRQ LTE / NR</dt>
                <dd>{{ num(modem.lte_rsrq_db) }} / {{ num(modem.nr_rsrq_db, 0, "dB") }}</dd>
                <dt>SINR LTE / NR</dt>
                <dd>{{ num(modem.lte_sinr_db) }} / {{ num(modem.nr_sinr_db, 0, "dB") }}</dd>
                <dt>RSSI LTE</dt>
                <dd>{{ num(modem.lte_rssi_dbm, 0, "dBm") }}</dd>
                <dt>Cellule · TAC</dt>
                <dd>{{ text(modem.cell_id) }} · {{ text(modem.tac) }}</dd>
            </template>
        </TelemetryCard>

        <TelemetryCard title="Batterie" :updated="upsAt" :stale="stale('ups', upsAt)">
            <template v-if="ups">
                <div class="main">
                    <p class="big num" :class="levels.battery(ups.percent)">
                        {{ num(ups.percent) }}<span class="unit">%</span>
                    </p>
                    <Sparkline
                        class="spark"
                        :series="history.battery"
                        :min="0"
                        :max="100"
                        :tone="stale('ups', upsAt) ? 'stale' : levels.battery(ups.percent)"
                    />
                </div>
                <div class="bar" :class="levels.battery(ups.percent)">
                    <span :style="{ width: `${Math.max(0, Math.min(100, ups.percent ?? 0))}%` }" />
                </div>
                <p class="sub num">
                    {{ num(ups.load_voltage_v, 2, "V") }} · {{ num(ups.current_a, 2, "A") }} ·
                    {{ num(ups.power_w, 1, "W") }}
                    <span v-if="power" class="power" :class="power.tone" :title="power.title">
                        <Icon :name="power.icon" :size="13" />
                        {{ power.label }}
                    </span>
                </p>
            </template>
            <p v-else class="empty">Aucune donnée de la batterie.</p>
        </TelemetryCard>

        <TelemetryCard title="Jetson" :updated="systemAt" :stale="stale('system', systemAt)">
            <template v-if="system">
                <div class="main">
                    <p class="big num" :class="levels.junction(system.tj_temp_c)">
                        {{ num(system.tj_temp_c) }}<span class="unit">°C</span>
                    </p>
                    <Sparkline
                        class="spark"
                        :series="history.junction"
                        :tone="stale('system', systemAt) ? 'stale' : levels.junction(system.tj_temp_c)"
                    />
                </div>
                <p class="sub num">
                    <!--
                        The video never runs on the GPU (decoder, VIC and NVENC are separate
                        blocks), so its load stays at 0: the encoder clock is the video load.
                    -->
                    CPU {{ num(system.cpu_load_pct, 0, "%") }} · Encodeur {{ num(system.nvenc_mhz, 0, "MHz") }} ·
                    <span :class="levels.disk(system.disk_free_gb)">
                        Disque {{ num(system.disk_free_gb, 0, "Go") }}
                    </span>
                </p>
            </template>
            <p v-else class="empty">Aucune donnée du Jetson.</p>

            <template v-if="system" #details>
                <dt>Température CPU / GPU</dt>
                <dd>{{ num(system.cpu_temp_c, 1) }} / {{ num(system.gpu_temp_c, 1, "°C") }}</dd>
                <dt>Mémoire utilisée</dt>
                <dd>{{ num(system.ram_used_mb === null ? null : system.ram_used_mb / 1024, 1, "Go") }}</dd>
                <dt>Charge GPU</dt>
                <dd>{{ num(system.gpu_load_pct, 0, "%") }}</dd>
                <dt>Espace libre</dt>
                <dd :class="levels.disk(system.disk_free_gb)">{{ num(system.disk_free_gb, 1, "Go") }}</dd>
                <dt>Mode d'alimentation</dt>
                <dd>{{ text(system.power_mode) }}</dd>
                <dt>Caméras · micros</dt>
                <dd>{{ num(system.cameras) }} · {{ num(system.mics) }}</dd>
            </template>
        </TelemetryCard>
    </div>
</template>

<script setup lang="ts">
    import { computed } from "vue"
    import { live, localTime } from "@lib/live"
    import { now } from "@lib/clock"
    import { history } from "@lib/history"
    import { levels, STALE_AFTER_MS } from "@lib/telemetry"
    import { num, text } from "@lib/format"
    import type { IconName } from "@assets/icons"
    import Icon from "@components/Icon.vue"
    import Sparkline from "@components/Sparkline.vue"
    import TelemetryCard from "@components/TelemetryCard.vue"

    const car = computed(() => live.telemetry?.car)
    const modem = computed(() => live.telemetry?.modem)
    const ups = computed(() => live.telemetry?.ups)
    const system = computed(() => live.telemetry?.system)

    const modemAt = computed(() => localTime(modem.value?.ts))
    const upsAt = computed(() => localTime(ups.value?.ts))
    const systemAt = computed(() => localTime(system.value?.ts))

    function stale(section: keyof typeof STALE_AFTER_MS, at: number | null): boolean {
        return !live.carOnline || at === null || now.value - at > STALE_AFTER_MS[section]
    }

    const TECHNOLOGIES: Record<string, string> = {
        "5gnr": "5G",
        lte: "4G",
        umts: "3G",
        hsdpa: "3G+",
        hsupa: "3G+",
        hspa: "3G+",
        "hspa-plus": "H+",
        edge: "2G",
        gprs: "2G",
        gsm: "2G"
    }

    /** "lte+5gnr" → "5G NSA (LTE + NR)", "lte" → "4G". */
    function technology(raw: string | null): string {
        if (!raw) return "—"
        const parts = raw
            .toLowerCase()
            .split(/[+|,\s]+/)
            .filter(Boolean)
        if (parts.includes("lte") && parts.includes("5gnr")) return "5G NSA"
        if (parts.length === 1 && TECHNOLOGIES[parts[0]!]) return TECHNOLOGIES[parts[0]!]!
        return raw.toUpperCase()
    }

    const STATES: Record<string, [string, "ok" | "warn" | "crit"]> = {
        connected: ["Connecté", "ok"],
        connecting: ["Connexion…", "warn"],
        disconnecting: ["Déconnexion…", "warn"],
        registered: ["Enregistré", "warn"],
        searching: ["Recherche réseau", "warn"],
        enabled: ["Activé", "warn"],
        enabling: ["Activation…", "warn"],
        initializing: ["Initialisation", "warn"],
        disabled: ["Désactivé", "crit"],
        disabling: ["Désactivation…", "crit"],
        locked: ["SIM verrouillée", "crit"],
        failed: ["En échec", "crit"],
        absent: ["Modem absent", "crit"]
    }

    const modemState = computed(() => {
        const state = modem.value?.state
        return state ? (STATES[state]?.[0] ?? state) : "État inconnu"
    })

    const modemTone = computed(() => {
        const state = modem.value?.state
        return state ? (STATES[state]?.[1] ?? "warn") : "none"
    })

    const POWER_STATES: Record<string, { label: string; title: string; icon: IconName; tone: string }> = {
        charging: {
            label: "En charge",
            title: "Secteur branché, batterie en charge",
            icon: "lightning-fill",
            tone: "ok"
        },
        full: { label: "Branchée", title: "Secteur branché, batterie chargée", icon: "plug", tone: "plugged" },
        discharging: {
            label: "Sur batterie",
            title: "Secteur débranché : le Jetson fonctionne sur sa batterie",
            icon: "battery-medium",
            tone: "battery"
        }
    }

    /** Charging state; nothing when unknown (UPS unreadable, or a car that does not send it). */
    const power = computed(() => {
        const state = ups.value?.power_state
        return state ? (POWER_STATES[state] ?? null) : null
    })
</script>

<style scoped>
    .telemetry {
        display: grid;
    }

    .main {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: end;
        gap: 14px;
    }

    .big {
        font-size: 30px;
        font-weight: 650;
        line-height: 1;
        letter-spacing: -0.01em;
    }

    .unit {
        margin-left: 3px;
        font-size: 15px;
        font-weight: 500;
        color: var(--text-4);
    }

    .spark {
        align-self: center;
    }

    .sub {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-3);
    }

    /* Charging state: small, pushed to the right end of the V · A · W line. */
    .power {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
    }

    .power.ok {
        color: var(--ok);
    }

    .power.plugged {
        color: var(--accent-soft);
    }

    .power.battery {
        color: var(--text-4);
    }

    .alert {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 10px;
        border-radius: var(--r-sm);
        font-size: 13px;
        font-weight: 600;
        color: var(--crit);
        background: rgba(239, 79, 95, 0.12);
        box-shadow: inset 0 0 0 1px rgba(239, 79, 95, 0.35);
    }

    .empty {
        font-size: 13px;
        color: var(--text-5);
    }

    .warn {
        color: var(--warn);
    }

    .crit {
        color: var(--crit);
    }

    .chip {
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-2);
        background: var(--surface-3);
    }

    .chip.ok {
        color: var(--ok);
        background: rgba(76, 195, 138, 0.12);
    }

    .chip.warn {
        background: rgba(240, 163, 58, 0.12);
    }

    .chip.crit {
        background: rgba(239, 79, 95, 0.14);
    }

    .bar {
        height: 6px;
        border-radius: 3px;
        background: var(--surface-3);
        overflow: hidden;
    }

    .bar span {
        display: block;
        height: 100%;
        border-radius: 3px;
        background: var(--ok);
        transition: width 0.6s;
    }

    .bar.warn span {
        background: var(--warn);
    }

    .bar.crit span {
        background: var(--crit);
    }

    .recording {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-3);
    }

    .recording .icon {
        color: var(--stale);
    }

    .recording.on {
        color: var(--text);
    }

    .recording.on .icon {
        color: var(--live);
    }

    .devices {
        display: grid;
        gap: 6px;
        list-style: none;
        font-size: 13px;
    }

    .devices li {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--text-4);
    }

    .device {
        font-family: var(--font-mono);
        font-size: 12.5px;
        color: var(--text-2);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .star {
        color: #f5c84c;
    }

    .state {
        margin-left: auto;
        flex: none;
        font-size: 12px;
        color: var(--ok);
    }

    .state.off {
        color: var(--text-5);
    }
</style>
