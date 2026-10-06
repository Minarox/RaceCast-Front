import { unplayable } from "@lib/codecs"
import { showsAllCameras, type Layout } from "@lib/layout"

/*
 * Which cameras to receive. Each video costs the viewer about 1.2 Mbit/s and
 * the car sends a single layer, so only the videos on screen are received:
 * every camera on desktop and tablet (big video + thumbnails), the one shown
 * on a phone, none in audio-only mode or when this browser cannot decode them.
 */
export function wantedCameras(
    cameras: readonly { name: string; mimeType: string | undefined }[],
    layout: Layout,
    shown: string | null,
    audioOnly: boolean
): string[] {
    if (audioOnly) return []
    const playable = cameras.filter(camera => !unplayable(camera.mimeType)).map(camera => camera.name)
    if (showsAllCameras(layout)) return playable
    return shown !== null && playable.includes(shown) ? [shown] : []
}
