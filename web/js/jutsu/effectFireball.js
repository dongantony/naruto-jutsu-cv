// effectFireball.js

// Duration of each phase of the Fireball Jutsu animation (milliseconds)
const CHARGE_DURATION = 600
const LAUNCH_DURATION = 1000
const IMPACT_DURATION = 500

// Fireball Radius
const INITIAL_SIZE_RATIO = 0.035
const MAX_CHARGE_SIZE_RATIO = 0.12

// Element and Overlay for Video/Fireball
let videoElement = null
let overlayCanvas = null
let ctx = null
let fireballImage = null

// Fireball Position and Start Time (null = no fireball animation is active) 
let activeFireball = null

// ID of the scheduled animation frame. Prevents multiple animation loops.
let animationFrameId = null


// Initialize the Fireball overlay.

export function initializeFireballOverlay(video, canvas) {
    videoElement = video
    overlayCanvas = canvas
    ctx = canvas.getContext("2d")

    fireballImage = new Image()
    fireballImage.src = "/web/images/jutsus/fireball.png"

    resizeFireballOverlay()

    window.addEventListener("resize", resizeFireballOverlay)

    return true
}

export function resizeFireballOverlay() {
    if(!videoElement || !overlayCanvas) return

    const width = videoElement.videoWidth || 1280
    const height = videoElement.videoHeight || 720

    if(overlayCanvas.width !== width || overlayCanvas.height !== height) {
        overlayCanvas.width = width
        overlayCanvas.height = height
    }
}


/**
 *  [ANIMATION CONTROL]
 * 
 *  Starts the complete fireball animation:
*   1. Charge — the fireball forms and grows at the hand.
 *  2. Launch — the fireball moves toward the center and grows.
 *  3. Impact — the fireball expands into a screen-filling flash.
 *
 *  Landmarks are optional. Without valid landmarks, the fireball begins at the center of the screen. 
 */

export function triggerFireball(landmarks = null) {
    if(!ctx || !overlayCanvas) {
        console.error("Fireball overlay has not been initialized.")
        return
    }

    resizeFireballOverlay()

    let startX = 0.5
    let startY = 0.5

    if(landmarks && landmarks.length >= 21) {
        const palmPoints = [
            landmarks[0],  // Wrist
            landmarks[5],  // Index finger base
            landmarks[9],  // Middle finger base
            landmarks[13], // Ring finger base
            landmarks[17]  // Pinky finger base
        ]

        startX = palmPoints.reduce((sum, point) => sum + point.x, 0) / palmPoints.length
        startY = palmPoints.reduce((sum, point) => sum + point.y, 0) / palmPoints.length
    }

    activeFireball = {
        startX,
        startY,
        startedAt: performance.now()
    }

    if(animationFrameId === null) {
        animationFrameId = requestAnimationFrame(animateFireball)
    }
}

export function stopFireball() {
    activeFireball = null

    if(animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
    }

    clearOverlay()
}


// Fireball Animations

function animateFireball() {
    animationFrameId = null

    if(!ctx || !overlayCanvas || !activeFireball) {
        clearOverlay()
        return
    }

    const now = performance.now()
    const elapsed = now - activeFireball.startedAt

    const totalDuration = CHARGE_DURATION + LAUNCH_DURATION + IMPACT_DURATION

    if(elapsed >= totalDuration) {
        activeFireball = null
        clearOverlay()
        return
    }

    const width = overlayCanvas.width
    const height = overlayCanvas.height
    const screenSize = Math.min(width, height)
    const diagonal = Math.hypot(width, height)

    ctx.clearRect(0, 0, width, height)

    const chargeEnd = CHARGE_DURATION
    const launchEnd = chargeEnd + LAUNCH_DURATION

    let x
    let y
    let radius
    let alpha = 1
    let impactProgress = 0

    if(elapsed < chargeEnd) {
        // PHASE 1: The fireball forms and grows at the palm.
        const t = clamp(elapsed / CHARGE_DURATION)
        const growth = easeOutCubic(t)
        const pulse = 1 + Math.sin(now * 0.025) * 0.06

        x = activeFireball.startX * width
        y = activeFireball.startY * height

        radius = screenSize * lerp(INITIAL_SIZE_RATIO, MAX_CHARGE_SIZE_RATIO, growth) * pulse
    } 
    else if(elapsed < launchEnd) {
        // PHASE 2: The fireball accelerates toward the viewer.
        const t = clamp((elapsed - chargeEnd) / LAUNCH_DURATION)
        const progress = easeInCubic(t)

        // It rushes toward the center of the camera view.
        x = lerp(activeFireball.startX * width, width * 0.5, progress)
        y = lerp(activeFireball.startY * height, height * 0.5, progress)

        // Rapid perspective growth creates the forward-motion effect.
        radius = screenSize * lerp(MAX_CHARGE_SIZE_RATIO, 0.85, progress)

        // A subtle fade as the fireball passes extremely close.
        alpha = 1 - Math.max(0, t - 0.8) * 0.8
    } 
    else {
        // PHASE 3: Huge fireball impact / screen flash.
        impactProgress = clamp((elapsed - launchEnd) / IMPACT_DURATION)

        const progress = easeOutCubic(impactProgress)

        x = width * 0.5
        y = height * 0.5

        // Grow beyond the screen's diagonal to fill the view.
        radius = lerp(screenSize * 0.85, diagonal * 1.5, progress)

        alpha = 1 - progress
    }

    ctx.save()

    // Brief fiery screen flash at impact.
    if(elapsed >= launchEnd) {
        const flashAlpha = Math.sin(impactProgress * Math.PI) * 0.45

        ctx.fillStyle = `rgba(255, 105, 0, ${flashAlpha})`
        ctx.fillRect(0, 0, width, height)
    }

    ctx.globalAlpha = clamp(alpha)

    drawFlameRays(ctx, x, y, radius, now, elapsed)
    drawFireball(ctx, x, y, radius, now)

    ctx.restore()

    animationFrameId = requestAnimationFrame(animateFireball)
}

function drawFireball(ctx, x, y, radius, now) {
    if(radius <= 0) return

    ctx.save()

    ctx.globalCompositeOperation = "lighter"

    // Large orange/red aura.
    const glow = ctx.createRadialGradient(x, y, radius * 0.05, x, y, radius * 1.5)

    glow.addColorStop(0, "rgba(255,255,220,0.95)")
    glow.addColorStop(0.2, "rgba(255,210,65,0.85)")
    glow.addColorStop(0.48, "rgba(255,90,0,0.65)")
    glow.addColorStop(0.75, "rgba(255,25,0,0.25)")
    glow.addColorStop(1, "rgba(255,0,0,0)")

    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Draw the transparent fireball artwork.
    if(fireballImage?.complete && fireballImage.naturalWidth > 0) {
        ctx.drawImage(fireballImage, x - radius, y - radius, radius * 2, radius * 2)
    } 
    else {
        // Fallback when no image is available.
        const core = ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.25, radius * 0.04, x, y, radius)

        core.addColorStop(0, "#ffffff")
        core.addColorStop(0.2, "#fff9c4")
        core.addColorStop(0.42, "#ffca28")
        core.addColorStop(0.7, "#ff5700")
        core.addColorStop(1, "rgba(255,20,0,0)")

        ctx.fillStyle = core
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
    }

    // Bright center helps the effect read as a hot fireball.
    const coreRadius = radius * 0.22

    const coreGlow = ctx.createRadialGradient(x, y, 0, x, y, coreRadius)

    coreGlow.addColorStop(0, "rgba(255,255,240,0.9)")
    coreGlow.addColorStop(0.45, "rgba(255,230,130,0.45)")
    coreGlow.addColorStop(1, "rgba(255,180,0,0)")

    ctx.fillStyle = coreGlow
    ctx.beginPath()
    ctx.arc(x, y, coreRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
}

function drawFlameRays(ctx, x, y, radius, now, elapsed) {
    if(radius <= 2) return

    const rayCount = 16
    const rotation = now * 0.0015

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.lineCap = "round"

    for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + rotation

        const flicker = 0.75 + 0.25 * Math.sin(now * 0.012 + i * 2.4)

        const innerRadius = radius * 0.65
        const outerRadius = radius * (1.05 + 0.35 * flicker)

        const x1 = x + Math.cos(angle) * innerRadius
        const y1 = y + Math.sin(angle) * innerRadius

        const x2 = x + Math.cos(angle) * outerRadius
        const y2 = y + Math.sin(angle) * outerRadius

        ctx.strokeStyle = i % 2 === 0 ? "rgba(255,220,100,0.65)" : "rgba(255,75,0,0.7)"

        ctx.lineWidth = Math.max(1, radius * 0.035 * flicker)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    }

    ctx.restore()
}


//  Helper Functions (Math and Cleanup)

function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value))
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - clamp(t), 3)
}

function easeInCubic(t) {
    return Math.pow(clamp(t), 3)
}

function lerp(start, end, t) {
    return start + (end - start) * t
}

function clearOverlay() {
    if(!ctx || !overlayCanvas) return

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
}