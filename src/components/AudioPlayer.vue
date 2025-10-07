<template>
    <audio :id="`audio-player-${index}`" controls ref="player" />
</template>

<script setup lang="ts">
import { RemoteTrackPublication } from "livekit-client"
import { ref, onMounted, onBeforeUnmount, defineProps } from "vue"
import { Event, dispatchEvent } from "@types"

const props = defineProps<{
    index: string
}>()

const player = ref(null) as any
let oldAudioTrack: RemoteTrackPublication | null = null

function microphonesHandler(event: any) {
    const audioTracks = event.detail
    const audioTrack = audioTracks[props.index]

    if (oldAudioTrack && oldAudioTrack?.trackSid === audioTrack?.trackSid) {
        return
    }

    if (oldAudioTrack) {
        oldAudioTrack.track?.detach(player.value)
        oldAudioTrack = null
    }

    setTimeout(() => {
        if (audioTrack && audioTrack.track) {
            audioTrack.track.attach(player.value)
            oldAudioTrack = audioTrack
        }
    }, 50)
}

function resumeAudioHandler() {
    if (oldAudioTrack) {
        oldAudioTrack.track?.attach(player.value)
    }
}

function playHandler() {
    dispatchEvent(Event.HIDE_AUDIO_TRIGGER)
}

onMounted(() => {
    document.addEventListener("microphones", microphonesHandler)
    document.addEventListener("resume-audio", resumeAudioHandler)
    player.value.addEventListener("play", playHandler)
})

onBeforeUnmount(() => {
    document.removeEventListener("microphones", microphonesHandler)
    document.removeEventListener("resume-audio", resumeAudioHandler)

    if (player.value) {
        player.value.removeEventListener("play", playHandler)
    }
})
</script>
