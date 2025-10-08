<template>
    <section id="speed-history" class="box">
        <h2>Vitesse</h2>
        <canvas />
    </section>
</template>

<script setup lang="ts">
    import { onMounted, onBeforeUnmount } from "vue"
    import { Event, Metadata } from "@types"
    import Chart, { ChartItem } from "chart.js/auto"

    const speedHistoryLimit = 45
    const speedValues: { speed: number | null; date: number}[] = []
    let chart: Chart | null = null

    function metadataHandler(event: any): void {
        if (chart) {
            const metadata: Metadata = event.detail

            speedValues.push({ speed: metadata.location.speed, date: metadata.timestamp || new Date().getTime() / 1000 })

            if (speedValues.length > speedHistoryLimit) {
                speedValues.shift()
            }

            const lastValues = speedValues.slice(-speedHistoryLimit)
            chart.data.labels = lastValues.map(row => new Date(row.date * 1000).toLocaleTimeString())
            if (chart.data.datasets[0]) {
                chart.data.datasets[0].data = lastValues.map(row => row?.speed ?? 0)
            }
            chart.update()
        }
    }

    onMounted(() => {
        const wrapper: HTMLElement = document.getElementById("speed-history")!
        const canvas: HTMLCanvasElement = wrapper.querySelector("canvas")!

        chart = new Chart(
            canvas as ChartItem,
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            data: [],
                            borderColor: function(context) {
                                const chart = context.chart
                                const { ctx, chartArea } = chart

                                if (!chartArea) {
                                    return
                                }

                                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
                                gradient.addColorStop(0, 'rgb(54, 162, 235)')
                                gradient.addColorStop(0.5, 'rgb(255, 205, 86)')
                                gradient.addColorStop(1, 'rgb(255, 99, 132)')
                                return gradient
                            }
                        }
                    ]
                },
                options: {
                    spanGaps: true,
                    interaction: {
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            display: false
                        },
                        y: {
                            display: true,
                            suggestedMin: 0,
                            suggestedMax: 200
                        }
                    }
                }
            }
        )


        document.addEventListener(Event.METADATA, metadataHandler)
    })

    onBeforeUnmount(() => {
        if (chart) {
            chart.destroy()
            chart = null
        }

        document.removeEventListener(Event.METADATA, metadataHandler)
    })
</script>

<style scoped>
    #speed-history > h2 {
        font-size: 1.4em;
        margin-bottom: 8px;
    }
</style>
