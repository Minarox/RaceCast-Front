<template>
    <section :class="gridClass" id="video-grid">
        <VideoPlayer v-for="i in nbCameras" :key="i" :index="(i - 1).toString()" :tracks="videoTracks" :speed="i === 1" />
    </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import VideoPlayer from '@components/VideoPlayer.vue'
import { Event } from 'src/types'

const props = defineProps<{
    list?: boolean
}>();

const nbCameras = ref(0);
const videoTracks = ref([]);

const gridClass = computed(() => {
    if (props.list) {
        return 'list';
    }

    return '';
});

function camerasHandler(event: any) {
    videoTracks.value = event.detail;
    nbCameras.value = videoTracks.value.length;
}

onMounted(() => {
    document.addEventListener(Event.CAMERAS, camerasHandler)
});

onBeforeUnmount(() => {
    document.removeEventListener(Event.CAMERAS, camerasHandler)
});
</script>

<style scoped>
#video-grid {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;

    &.list {
        display: flex;
        flex-flow: row wrap;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        gap: 1rem;
    }

    &:not(.list) {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        grid-template-rows: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
    }

    @media screen and (max-width: 768px) {
        height: 100%;
        overflow-y: auto;

        &:not(.list) {
            display: flex;
            flex-direction: column;

            > .video-player {
                width: unset;
                height: unset;
            }
        }
    }
}
</style>
