// effectChidori.js

// Video and Canvas State
let video = null
let canvas = null
let ctx = null

// Effect State
let activeUntil = 0
let handLandmarks = null
let animationFrame = null

// Chidori Colors
const CHIDORI_COLOR = "#65D9FF"
const CHIDORI_CORE = "#FFFFFF"


// Initialize the Chidori overlay.

export function initializeChidoriOverlay(videoElement, canvasElement) {
    video = videoElement
    canvas = canvasElement
    ctx = canvas.getContext("2d")

    function resizeCanvas() {
        const width = video.videoWidth || 1280
        const height = video.videoHeight || 720

        if(canvas.width !== width) canvas.width = width
        if(canvas.height !== height) canvas.height = height
    }

    function animate() {
        if(!ctx || !canvas) return

        resizeCanvas()
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if(performance.now() < activeUntil && handLandmarks) {
            drawChidori()
        }

        animationFrame = requestAnimationFrame(animate)
    }

    if(animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
    }

    animate()
}


// Trigger Chidori

export function triggerChidori(landmarks, duration = 10000) {
    if(!landmarks || landmarks.length < 21) return

    handLandmarks = landmarks
    activeUntil = performance.now() + duration
}


// Chidori Animations

function drawChidori() {
    const width = canvas.width
    const height = canvas.height

    // MediaPipe landmark 9 is near the center of the palm.
    const palm = handLandmarks[9]

    const x = palm.x * width
    const y = palm.y * height

    const time = performance.now() / 1000

    const radius = Math.min(width, height) * 0.14

    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    // Outer blue aura.
    const glow = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 1.8)

    glow.addColorStop(0, "rgba(100, 210, 255, 0.6)")
    glow.addColorStop(0.4, "rgba(40, 140, 255, 0.25)")
    glow.addColorStop(1, "rgba(20, 100, 255, 0)")

    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2)
    ctx.fill()

    // Lightning bolts radiating around the palm.
    const boltCount = 15

    for(let i = 0; i < boltCount; i++) {
        const angle = (i / boltCount) * Math.PI * 2 + Math.sin(time * 12 + i) * 0.3
        const length = radius * (1.2 + 0.5 * Math.abs(Math.sin(time * 18 + i)))

        drawLightningBolt(x, y, angle, length, radius * 0.5, time + i)
    }

    // Short inner arcs.
    for(let i = 0; i < 7; i++) {
        const angle = time * 3 + i * Math.PI * 2 / 7
        const startX = x + Math.cos(angle) * radius * 0.25
        const startY = y + Math.sin(angle) * radius * 0.25

        drawLightningBolt(startX, startY, angle + Math.sin(time * 15 + i) * 0.8, radius * 0.65, radius * 0.2, time * 2 + i)
    }

    // Bright Chidori core.
    const core = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.65)

    core.addColorStop(0, "#FFFFFF")
    core.addColorStop(0.2, CHIDORI_CORE)
    core.addColorStop(0.5, CHIDORI_COLOR)
    core.addColorStop(1, "rgba(50, 130, 255, 0)")

    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(x, y, radius * 0.65, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

function drawLightningBolt(x, y, angle, length, jitter, seed) {
    const segments = 6
    const endX = x + Math.cos(angle) * length
    const endY = y + Math.sin(angle) * length

    const points = [{ x, y }]

    for(let i = 1; i < segments; i++) {
        const t = i / segments
        const offset = Math.sin(seed * 17 + i * 9.3) * jitter

        points.push({
            x: x + (endX - x) * t + Math.cos(angle + Math.PI / 2) * offset,
            y: y + (endY - y) * t + Math.sin(angle + Math.PI / 2) * offset
        })
    }

    points.push({ x: endX, y: endY })

    // Soft blue glow beneath the bolt.
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for(let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }

    ctx.strokeStyle = CHIDORI_COLOR
    ctx.lineWidth = 5
    ctx.shadowColor = "#168CFF"
    ctx.shadowBlur = 18
    ctx.stroke()

    // White-hot lightning center.
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for(let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }

    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 8
    ctx.stroke()

    ctx.shadowBlur = 0
}


// Helper Functions

export function updateChidoriHand(landmarks) {
    if(!isChidoriActive() || !landmarks || landmarks.length < 21) return

    handLandmarks = landmarks
}

export function isChidoriActive() {
    return performance.now() < activeUntil
}