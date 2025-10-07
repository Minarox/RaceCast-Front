import type { APIRoute } from "astro"
import { readFile } from "node:fs/promises"
import path from "node:path"

/**
 * @description Expose LiveKit client for Emitter
 * @method GET
 * @endpoint GET /livekit-client
 * @returns {Promise<Response>} LiveKit client package
 */
export const GET: APIRoute = async (): Promise<Response> => {
    const livekitPath = path.resolve(
        process.cwd(),
        "node_modules",
        "livekit-client",
        "dist",
        "livekit-client.umd.js"
    )
    const packageJsonPath = path.resolve(
        process.cwd(),
        "package.json"
    )

    try {
        const livekitClient = await readFile(livekitPath)
        const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"))

        return new Response(new Uint8Array(livekitClient), {
            headers: {
                "Content-Type": "application/javascript",
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": "inline; filename=\"livekit-client.umd.js\"",
                "Content-Length": livekitClient.byteLength.toString(),
                "X-Version": packageJson.dependencies["livekit-client"]
            }
        })
    } catch (err) {
        return new Response("File not found", { status: 404 })
    }
}
