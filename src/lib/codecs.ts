/*
 * The car publishes AV1 only (a deliberate choice: quality on a weak uplink
 * over compatibility). Chrome, Edge and Firefox decode it; Safari only on
 * hardware with an AV1 decoder (iPhone 15 Pro, M3 Macs and later). Without a
 * decoder the video would just stay black, so the UI checks first and says so.
 */

let cached: boolean | undefined

export function canDecodeAv1(): boolean {
    if (cached !== undefined) return cached
    try {
        const codecs = RTCRtpReceiver.getCapabilities?.("video")?.codecs ?? []
        cached = codecs.some(codec => codec.mimeType.toLowerCase() === "video/av1")
    } catch {
        cached = false
    }
    return cached
}

/** True when this browser cannot play a track published with this MIME type. */
export function unplayable(mimeType: string | undefined): boolean {
    return mimeType?.toLowerCase() === "video/av1" && !canDecodeAv1()
}
