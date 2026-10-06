import { beforeEach, describe, expect, it, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { nextTick } from "vue"
import StatusBanner from "@components/StatusBanner.vue"
import { now } from "@lib/clock"
import * as liveModule from "@lib/live"

vi.mock("@lib/live", async () => {
    const { reactive } = await import("vue")
    return {
        live: reactive({
            connection: "connected",
            retryAt: null as number | null,
            carOnline: true,
            telemetry: null as { ts: string } | null,
            unsupportedVersion: undefined as number | null | undefined
        }),
        localTime: (iso: string | null | undefined) => (iso ? Date.parse(iso) : null),
        retryNow: vi.fn()
    }
})

const live = liveModule.live as unknown as {
    connection: string
    retryAt: number | null
    carOnline: boolean
    telemetry: { ts: string } | null
    unsupportedVersion: number | null | undefined
}

const NOW = Date.parse("2026-10-05T12:00:00Z")

beforeEach(() => {
    Object.assign(live, {
        connection: "connected",
        retryAt: null,
        carOnline: true,
        telemetry: null,
        unsupportedVersion: undefined
    })
    now.value = NOW
})

describe("StatusBanner", () => {
    it("stays empty while everything is live", () => {
        expect(mount(StatusBanner).find(".banner").exists()).toBe(false)
    })

    it("gives the age of the last data when the car is offline", () => {
        live.carOnline = false
        live.telemetry = { ts: "2026-10-05T11:57:00Z" }
        expect(mount(StatusBanner).text()).toContain("Voiture hors ligne · dernière mise à jour il y a 3\u00a0min")
    })

    it("says when no data ever came", () => {
        live.carOnline = false
        expect(mount(StatusBanner).text()).toContain("aucune donnée reçue pour l'instant")
    })

    it("counts down to the next attempt and offers to retry now", async () => {
        live.connection = "waiting"
        live.retryAt = NOW + 5_000
        const wrapper = mount(StatusBanner)
        expect(wrapper.text()).toContain("nouvelle tentative dans 5\u00a0s")
        now.value = NOW + 2_000
        await nextTick()
        expect(wrapper.text()).toContain("dans 3\u00a0s")
        await wrapper.find("button.retry").trigger("click")
        expect(liveModule.retryNow).toHaveBeenCalledOnce()
    })

    it("does not call the car offline while the viewer itself is reconnecting", () => {
        live.connection = "reconnecting"
        live.carOnline = false
        expect(mount(StatusBanner).text()).not.toContain("Voiture hors ligne")
    })

    it("reports a metadata format this page does not know", () => {
        live.unsupportedVersion = 2
        expect(mount(StatusBanner).text()).toContain("Format de télémétrie inconnu (v2)")
    })
})
