<template>
    <div class="view">
        <video
            ref="element"
            autoplay
            muted
            playsinline
            disablepictureinpicture
            @loadeddata="onFrame"
            @resize="onFrame"
            @playing="onFrame"
        />
        <div v-if="!hasFrame" class="loading" aria-hidden="true">
            <Icon name="circle-notch" :size="small ? 20 : 30" class="spin" />
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
    import type { RemoteTrack } from "livekit-client"
    import { live, videoTrack } from "@lib/live"
    import Icon from "@components/Icon.vue"

    /*
     * One camera in one <video>. Attaches the track when the subscription is
     * ready and always detaches the previous one first: a track left attached
     * to an element it no longer shows keeps adaptive stream thinking it is
     * on screen.
     */

    const props = defineProps<{ name: string; small?: boolean }>()

    const element = ref<HTMLVideoElement>()
    const hasFrame = ref(false)

    const camera = computed(() => live.cameras.find(c => c.name === props.name))

    let attached: RemoteTrack | undefined

    function bind(): void {
        const track = camera.value?.ready ? videoTrack(props.name) : undefined
        if (track === attached || !element.value) return
        attached?.detach(element.value)
        attached = track
        hasFrame.value = false
        track?.attach(element.value)
    }

    function onFrame(): void {
        hasFrame.value = (element.value?.videoWidth ?? 0) > 0
    }

    watch(() => [props.name, camera.value?.sid, camera.value?.ready], bind)
    onMounted(bind)
    onBeforeUnmount(() => {
        if (element.value) attached?.detach(element.value)
        attached = undefined
    })
</script>

<style scoped>
    .view {
        position: relative;
        width: 100%;
        height: 100%;
        background: var(--video-bg);
    }

    video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .loading {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: var(--text-4);
    }

    .spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
