<template>
    <section id="audio-grid">
        <AudioPlayer v-for="i in nbMicrophones" :key="i" :index="(i - 1).toString()" :tracks="audioTracks" />
    </section>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount } from "vue"
    import AudioPlayer from "@components/AudioPlayer.vue"
    import { Event } from "@types"

    const nbMicrophones = ref(0)
    const audioTracks = ref([])

    function microphonesHandler(event: any) {
        audioTracks.value = event.detail
        nbMicrophones.value = audioTracks.value.length
    }

    onMounted(() => {
        document.addEventListener(Event.MICROPHONES, microphonesHandler)
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.MICROPHONES, microphonesHandler)
    })
</script>

<style scoped>
    #audio-grid {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-flow: row wrap;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        gap: 1rem;
    }
</style>
