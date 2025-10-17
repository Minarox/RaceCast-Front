<template>
    <section id="info-box" class="box">
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
        loading.value = false
    }

    onMounted(() => {
        updateContent()
        refresh = setInterval(updateContent, 300000)
    })

    onBeforeUnmount(() => {
        clearInterval(refresh)
    })
</script>

<style>
    #info-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100px;

        svg {
            width: 50px;
            height: 50px;
            filter: invert(1);
        }
    }

    #info-box {
        h2 {
            font-size: 1.4rem;
            margin: 1rem 0 0.4rem;

            &:first-child {
                margin-top: 0;
            }
        }

        ul {
            margin: 0.3rem 0;

            li {
                margin-left: 1.2rem;
                margin-bottom: 0.2rem;
            }
        }

        hr {
			margin: 1rem 0;
			border: none;
			border-top: 1px solid black;
		}
    }
</style>
