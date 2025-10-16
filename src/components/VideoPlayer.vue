<template>
    <div class="video-player">
        <div :id="`video-player-${index}-loading`" v-html="Loading" ref="loading" />
        <video :id="`video-player-${index}`" controls ref="player" />
    </div>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount } from "vue"
    import Loading from "@assets/loading.svg?raw"
    import { Event, dispatchEvent } from "@types"
    import { RemoteTrackPublication } from "livekit-client"

    const props = defineProps<{
        index: string,
        tracks?: RemoteTrackPublication[]
    }>()

    const loading = ref(null) as any
    const player = ref(null) as any
    let oldVideoTrack: RemoteTrackPublication | null = null
    let preventResend = false

    function camerasHandler(event: any) {
        preventResend = true
        const videoTracks = event.detail
        const videoTrack = videoTracks?.[props.index]

        if (oldVideoTrack && oldVideoTrack?.trackSid === videoTrack?.trackSid) {
            return
        }

        if (oldVideoTrack) {
            oldVideoTrack.track?.detach(player.value)
            loading.value.classList.remove('hidden')
            oldVideoTrack = null
        }

        setTimeout(() => {
            if (videoTrack && videoTrack.track) {
                videoTrack.track.attach(player.value)
                loading.value.classList.add('hidden')
                oldVideoTrack = videoTrack
            }
        }, 50)
    }

    onMounted(() => {
        document.addEventListener(Event.CAMERAS, camerasHandler)

        if (!preventResend || !props.tracks?.length) {
            dispatchEvent(Event.RESEND, Event.CAMERAS)
        }

        if (props.tracks?.length) {
            camerasHandler({ detail: props.tracks })
        }
    })

    onBeforeUnmount(() => {
        if (oldVideoTrack) {
            oldVideoTrack.track?.detach(player.value)
            oldVideoTrack = null
        }
        loading.value.classList.remove('hidden')

        document.removeEventListener(Event.CAMERAS, camerasHandler)
    })
</script>

<style scoped>
    .video-player {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;

        > div {
            z-index: 1;
            pointer-events: none;
            line-height: 0;
            position: absolute;
            transform: scale(3);
            opacity: 1;
            transition: opacity 0.3s ease-in-out;
        }

        > video {
            width: 100%;
            max-height: 100%;
            aspect-ratio: 16/9;
        }
    }
</style>
