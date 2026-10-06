import type { Telemetry } from "@lib/telemetry"

/** A complete PROTOCOL.md v1 document, every section sampled at `at`. */
export function telemetry(at = "2026-10-05T12:00:00.000Z", overrides: Partial<Telemetry> = {}): Telemetry {
    return {
        v: 1,
        ts: at,
        car: {
            recording: true,
            main_camera: "cam-front",
            cameras: [
                { name: "cam-front", main: true, streaming: true },
                { name: "cam-rear", main: false, streaming: true }
            ],
            microphones: [{ name: "mic-driver", streaming: true }]
        },
        gps: {
            ts: at,
            fix: "3d",
            lat: 48.1173,
            lon: 11.5166667,
            alt_m: 520,
            speed_kmh: 87.5,
            course_deg: 245,
            satellites: 11,
            hdop: 0.8,
            gps_time: at
        },
        modem: {
            ts: at,
            state: "connected",
            access_tech: "lte+5gnr",
            operator: "Orange F",
            signal_quality: 72,
            lte_rssi_dbm: -67,
            lte_rsrp_dbm: -94,
            lte_rsrq_db: -11,
            lte_sinr_db: 9,
            nr_rsrp_dbm: -98,
            nr_rsrq_db: -12,
            nr_sinr_db: 6,
            cell_id: "1A2B3C4",
            tac: "B4F2",
            ip_connected: true
        },
        ups: { ts: at, load_voltage_v: 12.492, current_a: -1.2, power_w: 15, percent: 84, power_state: "discharging" },
        system: {
            ts: at,
            cpu_temp_c: 52.2,
            gpu_temp_c: 50.1,
            tj_temp_c: 61,
            cpu_load_pct: 34,
            gpu_load_pct: 61,
            ram_used_mb: 5320,
            nvenc_mhz: 704,
            disk_free_gb: 45.2,
            recording: true,
            cameras: 2,
            mics: 1,
            livekit_connected: true,
            power_mode: "15W"
        },
        ...overrides
    }
}
