<template>
    <section id="metadata" class="box">
        <h2>Système</h2>
        <div>
            Dernière mise à jour :
            <div v-if="!lastUpdate" class="loader" v-html="Loading" />
            <span>{{ lastUpdate }}</span>
        </div>
        <div>
            Utilisation :
            <div v-if="!usage" class="loader" v-html="Loading" />
            <span>{{ usage }}</span>
        </div>
        <div>
            Température :
            <div v-if="!internalTemp && !externalTemp" class="loader" v-html="Loading" />
            <ul :class="{ hidden: !internalTemp && !externalTemp }">
                <li v-if="internalTemp">{{ internalTemp }}</li>
                <li v-if="externalTemp">{{ externalTemp }}</li>
            </ul>
        </div>
        <div>
            Connectivité :
            <div v-if="!connectivity" class="loader" v-html="Loading" />
            <span>{{ connectivity }}</span>
        </div>
        <div>
            Batterie :
            <div v-if="!battery" class="loader" v-html="Loading" />
            <span>{{ battery }}</span>
        </div>

        <h2>GPS</h2>
        <div>
            Latitude :
            <div v-if="!latitude" class="loader" v-html="Loading" />
            <span>{{ latitude }}</span>
        </div>
        <div>
            Longitude :
            <div v-if="!longitude" class="loader" v-html="Loading" />
            <span>{{ longitude }}</span>
        </div>
        <div>
            Altitude :
            <div v-if="!altitude" class="loader" v-html="Loading" />
            <span>{{ altitude }}</span>
        </div>
        <div>
            Vitesse :
            <div v-if="!speed" class="loader" v-html="Loading" />
            <span>{{ speed }}</span>
        </div>
        <div>
            Précision :
            <div v-if="!precision" class="loader" v-html="Loading" />
            <span>{{ precision }}</span>
        </div>

        <h2>Diffusion</h2>
        <div>
            Statut :
            <div v-if="!status" class="loader" v-html="Loading" />
            <span>{{ getStateString(status) }}</span>
        </div>
        <div>
            {{ spectatorTitle }} :
            <div v-if="!viewers" class="loader" :v-html="Loading" />
            <span>{{ viewers }}</span>
        </div>
        <div>
            {{ cameraTitle }} :
            <ul>
                <li v-if="cameras.length === 0">Aucune caméra</li>
                <li v-for="(cam, idx) in cameras" :key="idx">
                    <a :href="`/cam/${idx}`">{{ cam.name }}</a>
                    <p>{{ cam.details }}</p>
                </li>
            </ul>
        </div>
        <div>
            {{ microphoneTitle }} :
            <ul>
                <li v-if="microphones.length === 0">Aucun microphone</li>
                <li v-for="(mic, idx) in microphones" :key="idx">
                    <a :href="`/mic/${idx}`">{{ mic.name }}</a>
                    <p>{{ mic.details }}</p>
                </li>
            </ul>
        </div>
    </section>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount, computed } from "vue"
    import { RemoteTrackPublication } from "livekit-client"
    import { Event, State, getStateString, dispatchEvent } from "@types"
    import Loading from "@assets/loading.svg?raw"

    const lastUpdate = ref('')
    const usage = ref('')
    const internalTemp = ref('')
    const externalTemp = ref('')
    const connectivity = ref('')
    const battery = ref('')
    const latitude = ref('')
    const longitude = ref('')
    const altitude = ref('')
    const speed = ref('')
    const precision = ref('')
    const status = ref(State.DISCONNECTED)
    const viewers = ref('')
    const cameras: any = ref([])
    const microphones: any = ref([])

    const spectatorTitle = computed(() => {
        return 'Spectateur' + (viewers.value && Number(viewers.value) > 1 ? 's' : '')
    })

    const cameraTitle = computed(() => {
        return 'Caméra' + (cameras.value && Number(cameras.value) > 1 ? 's' : '')
    })

    const microphoneTitle = computed(() => {
        return 'Microphone' + (microphones.value && Number(microphones.value) > 1 ? 's' : '')
    })

    function cameraDetails(track: RemoteTrackPublication) {
        const trackInfo = track.trackInfo
        const layer = track.trackInfo?.layers[0]
        let string = []

        if (layer?.width && layer?.height) {
            string.push(`${layer.width}x${layer.height}`)
        }

        if (layer?.bitrate) {
            string.push(`${layer.bitrate / 1000000} Mb/s`)
        }

        if (trackInfo?.mimeType) {
            const type = trackInfo.mimeType.split("/")?.[1]
            if (type) {
                string.push(type.toUpperCase())
            }
        }

        return string.length ? `(${string.join(", ")})` : ''
    }

    function microphoneDetails(track: RemoteTrackPublication) {
        const trackInfo = track.trackInfo
        let string = []

        if (trackInfo?.stereo) {
            string.push(`${trackInfo.stereo ? "Stéréo" : "Mono"}`)
        }

        string.push("0.24 Mb/s")

        if (trackInfo?.mimeType) {
            const type = trackInfo.mimeType.split("/")?.[1]
            if (type) {
                string.push(type.toUpperCase())
            }
        }
        return string.length ? `(${string.join(", ")})` : ''
    }

    function remoteStatusHandler(event: any) {
        status.value = event.detail as State
    }

    function camerasHandler(event: any) {
        const videoTracks = event.detail as RemoteTrackPublication[]
        cameras.value = videoTracks.map((track) => ({
            name: track.trackName,
            details: cameraDetails(track)
        }))
    }

    function microphonesHandler(event: any) {
        const audioTracks = event.detail as RemoteTrackPublication[]
        microphones.value = audioTracks.map((track) => ({
            name: track.trackName,
            details: microphoneDetails(track)
        }))
    }

    function viewersHandler(event: any) {
        viewers.value = (event.detail as number).toString()
    }

    function metadataHandler(event: any) {
        const metadata = event.detail
        lastUpdate.value = metadata?.timestamp ? new Date(metadata.timestamp * 1000).toLocaleString() : "Inconnu"
        usage.value = metadata.system.load ? `${metadata.system.load}%${metadata.system.power ? ` (${metadata.system.power}W)` : ''}` : ''
        internalTemp.value = metadata.system.temp ? `Interne : ${metadata.system.temp}°C${metadata.system.fan ? ` (${metadata.system.fan} RPM)` : ''}` : ''
        externalTemp.value = metadata.temp ? `Externe : ${metadata.temp}°C` : ''
        connectivity.value = metadata.modem.tech ? `${metadata.modem.tech.map((name: string) => name.toUpperCase()).join(", ")}${metadata.modem.signal ? ` (${metadata.modem.signal}%)` : ''}` : ''
        battery.value = metadata.ups.capa ? `${metadata.ups.capa}%${metadata.ups.volt ? ` (${metadata.ups.volt}V)` : ''}${metadata.ups.charge ? " (En charge)" : ''}` : ''
        latitude.value = metadata.location?.lat?.toString() || ''
        longitude.value = metadata.location?.lon?.toString() || ''
        altitude.value = metadata.location.alt ? `${metadata.location.alt} mètre${metadata.location.alt > 1 ? "s" : ''}` : ''
        speed.value = metadata.location.speed !== null ? `${metadata.location.speed} km/h` : ''
        precision.value = metadata.location.hdop ? `${metadata.location.hdop}${metadata.location.sat ? ` (${metadata.location.sat} satellite${metadata.location.sat > 1 ? "s" : ""})` : ''}` : ''
    }

    onMounted(() => {
        document.addEventListener(Event.REMOTE_STATUS, remoteStatusHandler)
        document.addEventListener(Event.CAMERAS, camerasHandler)
        document.addEventListener(Event.MICROPHONES, microphonesHandler)
        document.addEventListener(Event.VIEWERS, viewersHandler)
        document.addEventListener(Event.METADATA, metadataHandler)

        dispatchEvent(Event.RESEND, Event.REMOTE_STATUS)
        dispatchEvent(Event.RESEND, Event.CAMERAS)
        dispatchEvent(Event.RESEND, Event.MICROPHONES)
        dispatchEvent(Event.RESEND, Event.VIEWERS)
        dispatchEvent(Event.RESEND, Event.METADATA)
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.REMOTE_STATUS, remoteStatusHandler)
        document.removeEventListener(Event.CAMERAS, camerasHandler)
        document.removeEventListener(Event.MICROPHONES, microphonesHandler)
        document.removeEventListener(Event.VIEWERS, viewersHandler)
        document.removeEventListener(Event.METADATA, metadataHandler)
    })
</script>

<style>
    #metadata {
        display: flex;
        flex-direction: column;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        backdrop-filter: blur(12px);
        font-size: 0.9em;

        > h2 {
            font-size: 1.4em;
            margin-top: 1rem;

            &:first-of-type {
                margin-top: 0;
            }
        }

        > div {
            .loader {
                display: inline-block;
                filter: invert(1);
                line-height: 0;
            }

            > ul {
                margin-top: 0.2rem;
                margin-left: 1.4rem;

                > li > p {
                    font-size: 0.8em;
                }
            }
        }
    }
</style>
