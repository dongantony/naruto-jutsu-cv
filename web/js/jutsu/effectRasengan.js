// effectRasengan.js

// Element and Overlay for Video/Rasengan
let videoElement = null
let overlayCanvas = null
let overlayCtx = null

const rasenganImage = new Image()
rasenganImage.src = "/web/images/jutsus/rasengan.png"

// Rasengan appearance and movement.
const RASENGAN_SIZE = 3.75
const PALM_HEIGHT_OFFSET = 0.05
const VERTICAL_HOVER_OFFSET = 0.16
const FOLLOW_SMOOTHING = 0.35

// Spiraling chakra settings.
const SPIRAL_COUNT = 4
const PARTICLE_COUNT = 24
const SPIRAL_SPEED = 2.8
const PARTICLE_SPEED = 2.2
const SPIRAL_RADIUS_X = 0.85
const SPIRAL_RADIUS_Y = 0.55

// Rasengan State
let active = false
let expiresAt = 0
let activationTime = 0
let animationFrame = null

// Target - position calculated from hand landmarks.
// Smoothed - position used to prevent jittering.
let targetX = null
let targetY = null
let smoothedX = null
let smoothedY = null

// Target and Smoothed values for Rasengan size
let targetSize = 0
let smoothedSize = 0


// Initialize the Rasengan overlay.

export function initializeRasenganOverlay(video, canvas) {
    videoElement = video
    overlayCanvas = canvas
    overlayCtx = canvas.getContext("2d")

    resizeCanvas()

    window.addEventListener("resize", resizeCanvas)

    if(animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
    }

    animateRasengan()
}

function resizeCanvas() {
    if(!videoElement || !overlayCanvas) return

    const width = videoElement.videoWidth || 1280
    const height = videoElement.videoHeight || 720

    if(overlayCanvas.width !== width) {
        overlayCanvas.width = width
    }

    if(overlayCanvas.height !== height) {
        overlayCanvas.height = height
    }
}


// Trigger, Check and Updatae Rasengan Functions

export function triggerRasengan(landmarks, duration = 10000) {
    if(!landmarks || landmarks.length < 21) return

    active = true
    activationTime = performance.now()
    expiresAt = activationTime + duration

    updateRasenganHand(landmarks)

    if(smoothedX === null || smoothedY === null) {
        smoothedX = targetX
        smoothedY = targetY
        smoothedSize = targetSize
    }
}

export function updateRasenganHand(landmarks) {
    if(!landmarks || landmarks.length < 21) return

    const wrist = landmarks[0]
    const indexMCP = landmarks[5]
    const middleMCP = landmarks[9]
    const pinkyMCP = landmarks[17]

    const palmCenterX = (wrist.x + middleMCP.x) / 2
    const palmCenterY = (wrist.y + middleMCP.y) / 2

    const palmDirectionX = middleMCP.x - wrist.x
    const palmDirectionY = middleMCP.y - wrist.y

    const hoverX = palmCenterX + palmDirectionX * PALM_HEIGHT_OFFSET
    const hoverY = palmCenterY + palmDirectionY * PALM_HEIGHT_OFFSET - VERTICAL_HOVER_OFFSET

    const width = overlayCanvas?.width || 1280
    const height = overlayCanvas?.height || 720

    targetX = hoverX * width
    targetY = hoverY * height

    const palmWidthX = (indexMCP.x - pinkyMCP.x) * width
    const palmWidthY = (indexMCP.y - pinkyMCP.y) * height
    const palmWidth = Math.hypot(palmWidthX, palmWidthY)

    targetSize = Math.max(55, palmWidth * RASENGAN_SIZE)
}

export function isRasenganActive() {
    return active && performance.now() < expiresAt
}


// Rasengan Animations

function drawSpiral(cx, cy, radiusX, radiusY, angle, alpha, lineWidth) {
    overlayCtx.save()

    overlayCtx.translate(cx, cy)
    overlayCtx.rotate(angle)

    // Outer glow.
    overlayCtx.beginPath()
    overlayCtx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)

    overlayCtx.strokeStyle = `rgba(45, 170, 255, ${alpha * 0.35})`
    overlayCtx.lineWidth = lineWidth * 3
    overlayCtx.shadowColor = "#168bff"
    overlayCtx.shadowBlur = lineWidth * 5
    overlayCtx.stroke()

    // Bright chakra trail.
    overlayCtx.beginPath()
    overlayCtx.ellipse(0, 0, radiusX, radiusY, 0, angle * 0.7, angle * 0.7 + Math.PI * 1.45)

    overlayCtx.strokeStyle = `rgba(105, 220, 255, ${alpha})`
    overlayCtx.lineWidth = lineWidth
    overlayCtx.shadowColor = "#7deaff"
    overlayCtx.shadowBlur = lineWidth * 3
    overlayCtx.stroke()

    overlayCtx.restore()
}

function drawSpiralingChakra(cx, cy, size, elapsed) {
    const rotation = elapsed * SPIRAL_SPEED

    const radiusX = size * SPIRAL_RADIUS_X
    const radiusY = size * SPIRAL_RADIUS_Y

    // [Draw]: Orbiting Chakra Rings
    for(let i = 0; i < SPIRAL_COUNT; i++) {
        const angle = rotation + (i * Math.PI * 2) / SPIRAL_COUNT

        const scale = 0.72 + (i % 2) * 0.32
        const offsetX = Math.cos(angle * 0.65 + i) * size * 0.08
        const offsetY = Math.sin(angle * 0.8 + i) * size * 0.07

        drawSpiral(cx + offsetX, cy + offsetY, radiusX * scale, radiusY * scale, angle, 0.7, Math.max(1.5, size * 0.018))
    }

    // [Draw]: Additional sweeping blue-white streaks
    for(let i = 0; i < 3; i++) {
        const angle = -rotation * 1.3 + i * (Math.PI * 2 / 3)

        overlayCtx.save()
        overlayCtx.translate(cx, cy)
        overlayCtx.rotate(angle)

        overlayCtx.beginPath()
        overlayCtx.ellipse(0, 0, size * 0.95, size * 0.30, 0, -Math.PI * 0.38, Math.PI * 0.38)

        overlayCtx.strokeStyle = "rgba(185, 245, 255, 0.85)"
        overlayCtx.lineWidth = Math.max(1.5, size * 0.012)
        overlayCtx.shadowColor = "#36caff"
        overlayCtx.shadowBlur = size * 0.12
        overlayCtx.stroke()

        overlayCtx.restore()
    }
}

function drawEnergyParticles(cx, cy, size, elapsed) {
    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const progress = i / PARTICLE_COUNT

        // Each particle has a different orbital phase and speed.
        const angle = progress * Math.PI * 2 + elapsed * PARTICLE_SPEED * (i % 2 === 0 ? 1 : -1)
        const orbit = size * (0.48 + 0.42 * (0.5 + 0.5 * Math.sin(elapsed * 1.5 + i)))

        const x = cx + Math.cos(angle) * orbit
        const y = cy + Math.sin(angle * 1.35) * orbit * 0.58

        const particleSize = Math.max(1.5, size * (0.012 + 0.008 * Math.sin(elapsed * 4 + i)))

        const alpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 5 + i))

        overlayCtx.save()

        overlayCtx.globalAlpha = alpha
        overlayCtx.fillStyle = i % 3 === 0 ? "#ffffff" : "#63dfff"
        overlayCtx.shadowColor = "#27aaff"
        overlayCtx.shadowBlur = particleSize * 5

        overlayCtx.beginPath()
        overlayCtx.arc(x, y, particleSize, 0, Math.PI * 2)
        overlayCtx.fill()

        overlayCtx.restore()
    }
}

function animateRasengan() {
    if(!overlayCanvas || !overlayCtx) {
        animationFrame = requestAnimationFrame(animateRasengan)
        return
    }

    resizeCanvas()

    const width = overlayCanvas.width
    const height = overlayCanvas.height
    const now = performance.now()

    overlayCtx.clearRect(0, 0, width, height)

    if(active && now >= expiresAt) {
        active = false
    }

    if(active && targetX !== null && targetY !== null && rasenganImage.complete && rasenganImage.naturalWidth > 0) {
        smoothedX += (targetX - smoothedX) * FOLLOW_SMOOTHING
        smoothedY += (targetY - smoothedY) * FOLLOW_SMOOTHING
        smoothedSize += (targetSize - smoothedSize) * FOLLOW_SMOOTHING

        const elapsed = (now - activationTime) / 1000

        // Give the sphere a subtle pulsing effect.
        const pulse = 1 + Math.sin(now * 0.006) * 0.045
        const imageWidth = smoothedSize * pulse
        const imageHeight =imageWidth * (rasenganImage.naturalHeight / rasenganImage.naturalWidth)

        const cx = smoothedX
        const cy = smoothedY

        // Outer aura around the entire chakra effect.
        overlayCtx.save()

        const aura = overlayCtx.createRadialGradient(cx, cy, imageWidth * 0.08, cx, cy, imageWidth * 1.05)

        aura.addColorStop(0, "rgba(60, 175, 255, 0.22)")
        aura.addColorStop(0.5, "rgba(35, 130, 255, 0.10)")
        aura.addColorStop(1, "rgba(20, 100, 255, 0)")

        overlayCtx.fillStyle = aura
        overlayCtx.beginPath()
        overlayCtx.arc(cx, cy, imageWidth * 1.05, 0, Math.PI * 2)
        overlayCtx.fill()

        overlayCtx.restore()

        // Back trails create depth behind the sphere.
        drawSpiralingChakra(cx, cy, imageWidth, elapsed)

        // Energy particles orbit around the sphere.
        drawEnergyParticles(cx, cy, imageWidth, elapsed)

        // Draw the actual Rasengan on top of the trails.
        overlayCtx.save()

        overlayCtx.globalAlpha = 0.98
        overlayCtx.shadowColor = "#39aaff"
        overlayCtx.shadowBlur = imageWidth * 0.25

        overlayCtx.drawImage(rasenganImage, cx - imageWidth / 2, cy - imageHeight / 2, imageWidth, imageHeight)

        overlayCtx.restore()

        // Front streaks make the chakra appear to wrap around the orb.
        overlayCtx.save()
        overlayCtx.globalAlpha = 0.75
        overlayCtx.translate(cx, cy)
        overlayCtx.rotate(-elapsed * SPIRAL_SPEED * 0.8)

        overlayCtx.beginPath()
        overlayCtx.ellipse(0, 0, imageWidth * 0.78, imageWidth * 0.23, 0, Math.PI * 0.12, Math.PI * 1.05)

        overlayCtx.strokeStyle = "#8ceaff"
        overlayCtx.lineWidth = Math.max(2, imageWidth * 0.018)
        overlayCtx.shadowColor = "#3abfff"
        overlayCtx.shadowBlur = imageWidth * 0.12
        overlayCtx.stroke()

        overlayCtx.restore()
    }

    animationFrame = requestAnimationFrame(animateRasengan)
}