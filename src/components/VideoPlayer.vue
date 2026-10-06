<template>
    <div class="video-player">
        <div :id="`video-player-${index}-loading`" v-html="Loading" ref="loading" />
        <!-- FSR injects its output via player.srcObject = canvas.captureStream(),
             so the native <video> always holds the displayed stream.
             Fullscreen, browser controls and mobile playback work natively. -->
        <video :id="`video-player-${index}`" controls ref="player" />
    </div>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount } from "vue"
    import Loading from "@assets/loading.svg?raw"
    import { Event, dispatchEvent, getSettings } from "@types"
    import { RemoteTrackPublication } from "livekit-client"
    import { FSRRenderer } from "@assets/fsr"

    const props = defineProps<{
        index: string,
        tracks?: RemoteTrackPublication[]
    }>()

    const loading = ref(null) as any
    const player = ref(null) as any
    let oldVideoTrack: RemoteTrackPublication | null = null
    let preventResend = false

    // ── FSR state ────────────────────────────────────────────────────────────
    // srcVideo: hidden <video> appended to <body> that receives the LiveKit
    // stream while FSR is active, freeing player from the WebRTC srcObject.
    // fsrCanvas: detached HTMLCanvasElement (never in DOM) used as the WebGL
    // render target. Its captureStream() is fed into player.srcObject so the
    // native <video> always displays the FSR-processed output.
    let srcVideo:    HTMLVideoElement  | null = null
    let fsrCanvas:   HTMLCanvasElement | null = null
    let fsrRenderer: FSRRenderer       | null = null

    /** Returns the element that should receive LiveKit track attachment. */
    function attachTarget(): HTMLVideoElement {
        return srcVideo ?? player.value
    }

    function cleanupFSRAssets() {
        if (srcVideo) {
            srcVideo.srcObject = null
            srcVideo.remove()
            srcVideo = null
        }
        fsrCanvas = null
    }

    function enableFSR(sharpness: number) {
        if (!player.value || fsrCanvas) return  // already active

        // Hidden source video — receives the LiveKit WebRTC stream.
        const sv = document.createElement('video')
        sv.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0;pointer-events:none'
        sv.setAttribute('playsinline', '')
        sv.muted = true
        sv.autoplay = true
        document.body.appendChild(sv)
        srcVideo = sv

        // Re-route active LiveKit track from the visible player to the hidden source.
        if (oldVideoTrack?.track) {
            oldVideoTrack.track.detach(player.value)
            oldVideoTrack.track.attach(sv)
        }

        // Detached canvas — WebGL renders here at the upscale target resolution.
        // 1920×1080: ×2 from 540p source, RCAS-only sharpening from 1080p source.
        const canvas = document.createElement('canvas')
        canvas.width  = 1920
        canvas.height = 1080
        fsrCanvas = canvas

        try {
            fsrRenderer = new FSRRenderer(canvas, sv)
        } catch (e) {
            console.warn('[FSR] WebGL2 init failed:', e)
            // Roll back: restore direct LiveKit attachment.
            if (oldVideoTrack?.track) {
                oldVideoTrack.track.detach(sv)
                oldVideoTrack.track.attach(player.value)
            }
            cleanupFSRAssets()
            return
        }

        fsrRenderer.setSharpness(sharpness)
        fsrRenderer.start()

        // Inject FSR canvas output into the visible <video> as a local MediaStream.
        // captureStream(30) matches the 30 fps source; the native player receives
        // the processed frames and supports fullscreen / controls as usual.
        player.value.srcObject = canvas.captureStream(30)
        player.value.play().catch(() => {})
    }

    function disableFSR() {
        if (!fsrCanvas) return  // not active

        fsrRenderer?.destroy()
        fsrRenderer = null

        // Remove the captureStream before LiveKit re-attaches its own srcObject.
        if (player.value) player.value.srcObject = null

        if (oldVideoTrack?.track && srcVideo && player.value) {
            oldVideoTrack.track.detach(srcVideo)
            oldVideoTrack.track.attach(player.value)
        }

        cleanupFSRAssets()
    }

    function settingsHandler() {
        const settings = getSettings()
        if (settings.fsr.enabled) {
            enableFSR(settings.fsr.sharpness)
        } else {
            disableFSR()
        }
    }

    function camerasHandler(event: any) {
        preventResend = true
        const videoTracks = event.detail
        const videoTrack = videoTracks?.[props.index]

        if (oldVideoTrack && oldVideoTrack?.trackSid === videoTrack?.trackSid) {
            return
        }

        if (oldVideoTrack) {
            oldVideoTrack.track?.detach(attachTarget())
            loading.value.classList.remove('hidden')
            oldVideoTrack = null
        }

        setTimeout(() => {
            if (videoTrack && videoTrack.track) {
                videoTrack.track.attach(attachTarget())
                loading.value.classList.add('hidden')
                oldVideoTrack = videoTrack
            }
        }, 50)
    }

    onMounted(() => {
        document.addEventListener(Event.CAMERAS, camerasHandler)
        document.addEventListener(Event.SETTINGS, settingsHandler)
        settingsHandler()

        if (!preventResend || !props.tracks?.length) {
            dispatchEvent(Event.RESEND, Event.CAMERAS)
        }

        if (props.tracks?.length) {
            camerasHandler({ detail: props.tracks })
        }
    })

    onBeforeUnmount(() => {
        if (oldVideoTrack) {
            oldVideoTrack.track?.detach(attachTarget())
            oldVideoTrack = null
        }
        loading.value.classList.remove('hidden')

        if (player.value) player.value.srcObject = null
        fsrRenderer?.destroy()
        fsrRenderer = null
        cleanupFSRAssets()

        document.removeEventListener(Event.CAMERAS, camerasHandler)
        document.removeEventListener(Event.SETTINGS, settingsHandler)
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
