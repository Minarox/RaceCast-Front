<template>
    <p :class="{ hide: isHidden }" id="speed">{{ speedText }} km/h</p>
</template>

<script setup lang="ts">
    import { ref, onMounted, onUnmounted } from "vue"
    import { Event, Metadata } from "@types"

    const speedText = ref('0')
    const isHidden = ref(true)

    function metadataHandler(event: any) {
        const metadata: Metadata = event.detail
        const speed = metadata.location.speed
        isHidden.value = speed === null
        speedText.value = speed !== null ? speed.toString() : "0"
    }

    onMounted(() => {
        document.addEventListener(Event.METADATA, metadataHandler)
    })

    onUnmounted(() => {
        document.removeEventListener(Event.METADATA, metadataHandler)
    })
</script>

<style>
    #speed {
        min-height: 28px;
        pointer-events: none;
        transition: opacity 0.5s ease-in-out;
        font-size: 1.4em;
    }
</style>
