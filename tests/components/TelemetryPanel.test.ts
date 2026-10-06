import { beforeEach, describe, expect, it, vi } from "vitest"
import { mount } from "@vue/test-utils"
import TelemetryPanel from "@components/TelemetryPanel.vue"
import * as liveModule from "@lib/live"
import type { Telemetry, Ups } from "@lib/telemetry"
import { now } from "@lib/clock"
import { telemetry } from "../fixtures"

vi.mock("@lib/live", async () => {
    const { reactive } = await import("vue")
    return {
        live: reactive({ carOnline: true, telemetry: null as Telemetry | null }),
        localTime: (iso: string | null | undefined) => (iso ? Date.parse(iso) : null)
    }
})

const live = liveModule.live as unknown as { carOnline: boolean; telemetry: Telemetry | null }

const AT = "2026-10-05T12:00:00.000Z"

function withUps(ups: Partial<Ups>): void {
    const doc = telemetry(AT)
    doc.ups = { ...doc.ups!, ...ups }
    live.telemetry = doc
}

function batteryLine(): string {
    const card = mount(TelemetryPanel)
        .findAll(".card")
        .find(c => c.find("h2").text() === "Batterie")!
    return card.find(".sub").text().replace(/\s+/g, " ")
}

beforeEach(() => {
    live.carOnline = true
    live.telemetry = telemetry(AT)
    now.value = Date.parse(AT) + 1_000
})

describe("battery charging state", () => {
    it("says when the battery charges", () => {
        withUps({ current_a: 1.41, power_w: 15.2, power_state: "charging" })
        expect(batteryLine()).toMatch(/1,41\s?A · 15,2\s?W En charge$/)
    })

    it("says when the Jetson is plugged in with a full battery", () => {
        withUps({ current_a: 0, power_w: 0, power_state: "full" })
        expect(batteryLine()).toMatch(/Branchée$/)
    })

    it("says when the Jetson runs on its battery", () => {
        withUps({ power_state: "discharging" })
        expect(batteryLine()).toMatch(/Sur batterie$/)
    })

    it("shows nothing when the state is unknown or not sent by the car", () => {
        withUps({ power_state: null })
        expect(batteryLine()).not.toMatch(/charge|Branchée|batterie/)
        const doc = telemetry(AT)
        delete doc.ups!.power_state
        live.telemetry = doc
        expect(batteryLine()).not.toMatch(/charge|Branchée|batterie/)
    })
})

describe("Jetson card", () => {
    it("shows the encoder clock instead of the idle GPU, which stays in the details", () => {
        const card = mount(TelemetryPanel)
            .findAll(".card")
            .find(c => c.find("h2").text() === "Jetson")!
        expect(card.find(".sub").text()).toMatch(/Encodeur 704\s?MHz/)
        expect(card.find(".sub").text()).not.toContain("GPU")
        expect(card.find("dl").text()).toContain("Charge GPU")
    })
})
