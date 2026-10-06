import { describe, expect, it } from "vitest"
import { mount } from "@vue/test-utils"
import Sparkline from "@components/Sparkline.vue"
import type { Series } from "@lib/history"

function series(points: [number, number | null][]): Series {
    return { t: points.map(p => p[0]), v: points.map(p => p[1]), rev: 1 }
}

function path(props: { series: Series; min?: number; max?: number }): string | undefined {
    return mount(Sparkline, { props }).find("path").attributes("d")
}

describe("Sparkline", () => {
    it("draws nothing below two samples", () => {
        expect(
            mount(Sparkline, { props: { series: series([[0, 50]]) } })
                .find("path")
                .exists()
        ).toBe(false)
    })

    it("spans the width from the oldest to the newest sample", () => {
        expect(
            path({
                series: series([
                    [0, 0],
                    [1000, 100]
                ]),
                min: 0,
                max: 100
            })
        ).toBe("M0.00 28.00L100.00 2.00")
    })

    it("lifts the pen over gaps", () => {
        const d = path({
            series: series([
                [0, 10],
                [1000, null],
                [2000, 30],
                [3000, 40]
            ]),
            min: 0,
            max: 100
        })
        expect(d?.match(/M/g)).toHaveLength(2)
        expect(d).toContain("M66.67")
    })

    it("fits the data when no scale is given, and survives a flat line", () => {
        expect(
            path({
                series: series([
                    [0, 50],
                    [1000, 60]
                ])
            })
        ).toBe("M0.00 28.00L100.00 2.00")
        expect(
            path({
                series: series([
                    [0, 7],
                    [1000, 7]
                ])
            })
        ).toBe("M0.00 15.00L100.00 15.00")
    })

    it("clamps values to a fixed scale", () => {
        expect(
            path({
                series: series([
                    [0, -20],
                    [1000, 150]
                ]),
                min: 0,
                max: 100
            })
        ).toBe("M0.00 28.00L100.00 2.00")
    })

    it("takes the tone as a class", () => {
        const wrapper = mount(Sparkline, { props: { series: series([]), tone: "crit" } })
        expect(wrapper.classes()).toContain("crit")
    })
})
