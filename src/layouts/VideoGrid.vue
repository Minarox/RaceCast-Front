<template>
    <section v-if="props.list" id="video-grid" class="list">
        <VideoPlayer v-for="i in nbCameras" :key="i" :index="(i - 1).toString()" :tracks="videoTracks" />
    </section>

    <section v-else id="video-grid" :class="gridClass">
        <VideoPlayer v-if="nbCameras" index="0" :tracks="videoTracks" />
        <article>
            <Speed v-if="settings.speed.show" :class="speedPosition" />
            <div :class="mapPosition">
                <section>
                    <template v-if="settings.showOtherCameras && nbCameras > 1">
                        <VideoPlayer v-for="i in nbCameras - 1" :key="i + 1" :index="(i).toString()" :tracks="videoTracks" />
                    </template>
                </section>
                <Map v-if="settings.map.show" />
            </div>
        </article>
    </section>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount, computed } from "vue"
    import VideoPlayer from "@components/VideoPlayer.vue"
    import Map from "@components/OpenMap.vue"
    import Speed from "@components/Speed.vue"
    import { Event, getSettings, Position } from "@types"
    import DefaultSettings from "@assets/settings.json"

    const props = defineProps<{
        list?: boolean
    }>()

    const nbCameras = ref(0)
    const videoTracks = ref([])
    const settings = ref(DefaultSettings)

    const gridClass = computed(() => {
        const classList: string[] = []

        if (settings.value.sidebar.sticky) classList.push('sidebar-opened')
        if (settings.value.sidebar.position === Position.RIGHT) classList.push('reverse')

        return classList.join(' ')
    })

    const speedPosition = computed(() => {
        return settings.value.speed.position === Position.RIGHT && "reverse" || ''
    })

    const mapPosition = computed(() => {
        return settings.value.map.position === Position.RIGHT && "reverse" || ''
    })

    function camerasHandler(event: any) {
        videoTracks.value = event.detail
        nbCameras.value = videoTracks.value.length
    }

    function settingsHandler() {
		settings.value = getSettings()
    }

    onMounted(() => {
        document.addEventListener(Event.CAMERAS, camerasHandler)
        document.addEventListener(Event.SETTINGS, settingsHandler)
        settingsHandler()
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.SETTINGS, settingsHandler)
        document.removeEventListener(Event.CAMERAS, camerasHandler)
    })
</script>

<style scoped>
    #video-grid {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        position: relative;
        transition: width 0.3s ease-in-out, margin 0.3s ease-in-out;

        &:not(.list) {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;

            &.sidebar-opened {
                width: calc(100vw - 394px);

                &.reverse {
                    margin-right: 394px;
                }

                @media screen and (max-width: 768px) {
                    margin-left: 0;
                    width: 100vw;
                }
            }

            > article {
                position: absolute;
                bottom: 1rem;
                left: 1rem;
                right: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.6rem;
                height: 200px;

                > p:first-child {
                    padding-inline: 0.4rem;

                    &.reverse {
                        align-self: flex-end;
                    }
                }

                > div {
                    width: 100%;
                    flex-grow: 1;
                    display: flex;
                    gap: 0.4rem;
                    justify-content: space-between;
                    flex-direction: row;
                    overflow-x: auto;

                    &.reverse {
                        flex-direction: row-reverse;
                    }

                    > section {
                        flex-grow: 1;
                        display: flex;
                        gap: 0.4rem;
                        flex-direction: row;
                        justify-content: space-between;
                        overflow-x: auto;
                        min-width: max-content;

                        > .video-player {
                            width: unset;
                            border-radius: 8px !important;
                            flex-shrink: 0;
                            overflow: hidden;
                        }
                    }

                    > div {
                        width: 180px;
                        flex-shrink: 0;
                        border-radius: 8px;
                    }
                }
            }
        }

        &.list {
            display: flex;
            flex-flow: row wrap;
            justify-content: center;
            align-items: center;
            gap: 0.4rem;
            overflow-y: auto;

            > .video-player {
                flex: 0 1 calc(50% - 0.6rem);
                min-width: 300px;
                width: unset;
                height: unset;
            }
        }

        @media screen and (max-width: 768px) {
            &:not(.list) {
                flex-direction: column;
                justify-content: flex-start;
                overflow-y: auto;

                .video-player {
                    height: unset;
                    border-radius: unset;
                }

                > article {
                    position: unset;
                    width: 100vw;
                    height: 100%;

                    > p:first-child {
                        align-self: center;
                        padding-top: 0.4rem;
                    }

                    > div {
                        width: inherit;
                        flex-direction: column !important;
                        gap: 2.4rem;
                        min-height: max-content;

                        > section {
                            flex-direction: column !important;
                            min-width: unset;
                            min-height: max-content;
                            flex-grow: 0;
                        }

                        > div {
                            width: 100%;
                            height: 40vw;
                            min-height: 180px;
                        }
                    }
                }
            }
        }
    }
</style>
