<template>
    <section class="box">
        <div v-if="loading" id="info-loading" v-html="Loading" />
        <div v-else v-html="content" />
    </section>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount } from "vue"
    import { actions } from "astro:actions"
    import Loading from "@assets/loading.svg?raw"

    let refresh: any = null
    const loading = ref(true)
    const content = ref('')

    async function updateContent() {
        content.value = await actions.getInfoBoxContent.orThrow()
    }

    onMounted(() => {
        updateContent()
        refresh = setInterval(updateContent, 300000)
    })

    onBeforeUnmount(() => {
        clearInterval(refresh)
    })
</script>

<style scoped>
    #info-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100px;

        svg {
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
    }

    h2 {
        font-size: 1.4em;
        margin-top: 1rem;

        &:first-of-type {
            margin-top: 0;
        }
    }
</style>
