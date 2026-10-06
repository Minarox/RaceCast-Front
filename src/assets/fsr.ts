/**
 * fsr.ts — WebGL2 video quality enhancement
 *
 * Two-pass pipeline inspired by AMD FidelityFX Super Resolution 1.0:
 *   Pass 1 (EASU): Catmull-Rom 9-tap spatial upsampling
 *                  Sharper edge preservation vs bilinear. When srcSize == dstSize
 *                  the filter acts as a mild sharpening pre-pass for RCAS.
 *   Pass 2 (RCAS): Contrast-Adaptive Sharpening
 *                  Sharpens texture detail while limiting amplification on
 *                  hard edges to prevent ringing artefacts.
 *
 * Typical use: AV1 stream at 720p decoded by the browser, canvas at 1080p
 * (display resolution). EASU upscales with edge-aware filtering; RCAS adds
 * perceptual sharpness lost during compression.
 */

// ─── Shared vertex shader ────────────────────────────────────────────────────
// Full-screen triangle via gl_VertexID — no vertex buffers, no VAO required.
// FLIP_Y is set on the texture upload, so UV (0,0) = bottom of video frame.
const VERT = /* glsl */ `#version 300 es
out vec2 v_uv;
void main() {
    float x = float(gl_VertexID & 1) * 4.0 - 1.0;
    float y = float(gl_VertexID >> 1) * 4.0 - 1.0;
    v_uv = vec2(x + 1.0, y + 1.0) * 0.5;
    gl_Position = vec4(x, y, 0.0, 1.0);
}`

// ─── Pass 1: EASU ────────────────────────────────────────────────────────────
// Catmull-Rom 9-tap upsampler with the bilinear optimisation (16 → 9 taps).
// u_rcpSrcSize: vec2(1/srcW, 1/srcH) — reciprocal of source texture dimensions.
//
// v_uv spans [0,1]×[0,1] over the output canvas.
// pixel = v_uv * srcSize gives the continuous source-texel coordinate.
// Catmull-Rom weights (B=0, C=0.5 Mitchell-Netravali) preserve sharp edges
// while negative lobes prevent blur that bilinear/bicubic would introduce.
const EASU_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D u_tex;
uniform vec2      u_rcpSrcSize;

in  vec2 v_uv;
out vec4 fragColor;

vec4 catmullRom(vec2 uv) {
    // Continuous source-texel position
    vec2 pixel = uv / u_rcpSrcSize;

    // Centre of the top-left texel in the 2×2 block
    vec2 p = floor(pixel - 0.5) + 0.5;
    vec2 f = pixel - p;  // fractional offset within [0, 1)

    // Catmull-Rom (B=0, C=0.5) cubic weights
    vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
    vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
    vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
    vec2 w3 = f * f * (-0.5 + 0.5 * f);

    // Merge the two centre taps (w1 + w2) into one bilinear sample
    vec2 w12   = w1 + w2;
    vec2 off12 = w2 / w12;

    vec2 uv0  = (p - 1.0)   * u_rcpSrcSize;
    vec2 uv12 = (p + off12) * u_rcpSrcSize;
    vec2 uv3  = (p + 2.0)   * u_rcpSrcSize;

    return
        texture(u_tex, vec2(uv0.x,  uv0.y))  * (w0.x  * w0.y)  +
        texture(u_tex, vec2(uv12.x, uv0.y))  * (w12.x * w0.y)  +
        texture(u_tex, vec2(uv3.x,  uv0.y))  * (w3.x  * w0.y)  +
        texture(u_tex, vec2(uv0.x,  uv12.y)) * (w0.x  * w12.y) +
        texture(u_tex, vec2(uv12.x, uv12.y)) * (w12.x * w12.y) +
        texture(u_tex, vec2(uv3.x,  uv12.y)) * (w3.x  * w12.y) +
        texture(u_tex, vec2(uv0.x,  uv3.y))  * (w0.x  * w3.y)  +
        texture(u_tex, vec2(uv12.x, uv3.y))  * (w12.x * w3.y)  +
        texture(u_tex, vec2(uv3.x,  uv3.y))  * (w3.x  * w3.y);
}

void main() {
    fragColor = catmullRom(v_uv);
}`

// ─── Pass 2: RCAS ────────────────────────────────────────────────────────────
// Contrast-Adaptive Sharpening (FSR 1.0 RCAS).
// u_rcpSize:   vec2(1/dstW, 1/dstH) — reciprocal of this texture's dimensions.
// u_sharpness: 0.0 = strongest sharpening, 2.0 = lightest.
//              Maps to rcasPeak = exp2(-sharpness) ∈ [1.0, 0.25].
//
// The adaptive weight divides by (1 + localContrast × 4) so that sharpening
// is strong in uniform areas and reduced near high-contrast edges,
// which prevents the ringing that fixed unsharp-mask would produce.
const RCAS_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D u_tex;
uniform vec2      u_rcpSize;
uniform float     u_sharpness;

in  vec2 v_uv;
out vec4 fragColor;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec3 c  = texture(u_tex, v_uv).rgb;
    vec3 n  = texture(u_tex, v_uv + vec2( 0.0,          u_rcpSize.y)).rgb;
    vec3 s  = texture(u_tex, v_uv + vec2( 0.0,         -u_rcpSize.y)).rgb;
    vec3 e  = texture(u_tex, v_uv + vec2( u_rcpSize.x,  0.0        )).rgb;
    vec3 ww = texture(u_tex, v_uv + vec2(-u_rcpSize.x,  0.0        )).rgb;

    float cL = luma(c);
    float nL = luma(n), sL = luma(s), eL = luma(e), wL = luma(ww);

    float mnL = min(min(cL, nL), min(min(sL, eL), wL));
    float mxL = max(max(cL, nL), max(max(sL, eL), wL));

    // rcasPeak ∈ [1.0, 0.25]: scales sharpening budget
    float rcasPeak = exp2(-u_sharpness);
    // Local contrast: reduces sharpening on hard edges to prevent ringing
    float localContrast = mxL - mnL;
    float amt = rcasPeak / (1.0 + localContrast * 4.0);

    // Unsharp mask: center + amt × (center − 4-tap lowpass)
    vec3 lowpass = (n + s + e + ww) * 0.25;
    fragColor = vec4(clamp(c + (c - lowpass) * amt, 0.0, 1.0), 1.0);
}`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(`FSR shader compile: ${gl.getShaderInfoLog(s)}`)
    return s
}

function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
    const p = gl.createProgram()!
    gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vertSrc))
    gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(`FSR program link: ${gl.getProgramInfoLog(p)}`)
    return p
}

function makeTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class FSRRenderer {
    private gl: WebGL2RenderingContext
    private video: HTMLVideoElement

    private easuProg: WebGLProgram
    private rcasProg: WebGLProgram

    // Cached uniform locations
    private uEasuRcpSrcSize: WebGLUniformLocation
    private uRcasRcpSize: WebGLUniformLocation
    private uRcasSharpness: WebGLUniformLocation

    private videoTex: WebGLTexture
    private fboTex: WebGLTexture
    private fbo: WebGLFramebuffer

    private active = false
    private lastDstW = 0
    private lastDstH = 0
    private sharpness = 1.0

    private readonly vfcSupported: boolean

    constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
        this.video = video

        const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false })
        if (!gl) throw new Error('WebGL2 not supported')
        this.gl = gl

        this.easuProg = createProgram(gl, VERT, EASU_FRAG)
        this.rcasProg = createProgram(gl, VERT, RCAS_FRAG)

        // Cache all uniform locations once at construction time
        this.uEasuRcpSrcSize = gl.getUniformLocation(this.easuProg, 'u_rcpSrcSize')!
        this.uRcasRcpSize    = gl.getUniformLocation(this.rcasProg, 'u_rcpSize')!
        this.uRcasSharpness  = gl.getUniformLocation(this.rcasProg, 'u_sharpness')!

        // Bind texture unit 0 for both programs once
        gl.useProgram(this.easuProg)
        gl.uniform1i(gl.getUniformLocation(this.easuProg, 'u_tex'), 0)
        gl.useProgram(this.rcasProg)
        gl.uniform1i(gl.getUniformLocation(this.rcasProg, 'u_tex'), 0)

        this.videoTex = makeTexture(gl)
        this.fboTex   = makeTexture(gl)

        // FBO for the EASU → RCAS intermediate buffer
        this.fbo = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.vfcSupported = 'requestVideoFrameCallback' in HTMLVideoElement.prototype
    }

    // ── Render one frame ───────────────────────────────────────────────────
    private doRender(): void {
        const gl    = this.gl
        const video = this.video
        const canvas = gl.canvas as HTMLCanvasElement

        if (video.readyState < 2) return  // no decoded frame available yet

        const srcW = video.videoWidth,  srcH = video.videoHeight
        const dstW = canvas.width,      dstH = canvas.height
        if (!srcW || !srcH || !dstW || !dstH) return

        // Resize the intermediate FBO texture when canvas dimensions change
        if (dstW !== this.lastDstW || dstH !== this.lastDstH) {
            gl.bindTexture(gl.TEXTURE_2D, this.fboTex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dstW, dstH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
            this.lastDstW = dstW
            this.lastDstH = dstH
        }

        // Upload current video frame to the input texture.
        // FLIP_Y aligns the video's top-left with UV (0,1) in standard OpenGL convention.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.videoTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

        // ── Pass 1: EASU — video texture (srcSize) → FBO (dstSize) ──────────
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
        gl.viewport(0, 0, dstW, dstH)
        gl.useProgram(this.easuProg)
        gl.uniform2f(this.uEasuRcpSrcSize, 1.0 / srcW, 1.0 / srcH)
        gl.drawArrays(gl.TRIANGLES, 0, 3)

        // ── Pass 2: RCAS — FBO texture → canvas ──────────────────────────────
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, dstW, dstH)
        gl.useProgram(this.rcasProg)
        gl.bindTexture(gl.TEXTURE_2D, this.fboTex)
        gl.uniform2f(this.uRcasRcpSize,   1.0 / dstW, 1.0 / dstH)
        gl.uniform1f(this.uRcasSharpness, this.sharpness)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // ── Scheduling ─────────────────────────────────────────────────────────
    // requestVideoFrameCallback fires exactly when a new decoded frame is ready,
    // avoiding redundant renders between video frames (e.g. 30fps stream on
    // a 60Hz display). Falls back to requestAnimationFrame when unavailable.

    private scheduleRender(): void {
        if (!this.active) return
        if (this.vfcSupported) {
            ;(this.video as any).requestVideoFrameCallback(this.onFrame)
        } else {
            requestAnimationFrame(this.onFrame)
        }
    }

    private onFrame = (): void => {
        if (!this.active) return
        this.doRender()
        this.scheduleRender()
    }

    /** Start the per-frame rendering loop. Safe to call multiple times. */
    start(): void {
        this.active = true
        this.scheduleRender()
    }

    /** Pause rendering without releasing GPU resources. */
    stop(): void {
        this.active = false
    }

    /**
     * Set RCAS sharpening strength.
     * @param v 0.0 = strongest / 2.0 = weakest (default: 1.0)
     */
    setSharpness(v: number): void {
        this.sharpness = Math.max(0, Math.min(2, v))
    }

    /** Stop rendering and release all WebGL resources. */
    destroy(): void {
        this.stop()
        const gl = this.gl
        gl.deleteTexture(this.videoTex)
        gl.deleteTexture(this.fboTex)
        gl.deleteFramebuffer(this.fbo)
        gl.deleteProgram(this.easuProg)
        gl.deleteProgram(this.rcasProg)
    }
}
