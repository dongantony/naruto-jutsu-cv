// effectClone.js

// Clone Canvas
let personCanvas = null

// Timestamp indicating when clone effect should stop.
let cloneActiveUntil = 0

// Smoke Settings
let smokeStartedAt = 0
let smokeParticles = []
const SMOKE_DURATION = 700

// Configuration for the four shadow clones surrounding the original person.
// 
// [x]     -  Horizontal offset relative to the person's position.
// [y]     -  Vertical offset relative to the person's position.
// [scale] -  Size multiplier for the clone.
// [alpha] -  Opacity multiplier, where 1.0 is fully opaque.

const CLONE_OFFSETS = [
    { x: -0.22, y: 0.05, scale: 1.0, alpha: 1.0 },
    { x:  0.22, y: 0.05, scale: 1.0, alpha: 1.0 },
    { x: -0.42, y: 0.10, scale: 1.0, alpha: 1.0 },
    { x:  0.42, y: 0.10, scale: 1.0, alpha: 1.0 }
]


 // Initialize the Shadow Clone overlay. 

export function initializeCloneOverlay(segmentedCanvas) {
    personCanvas = segmentedCanvas
}


/** 
 * Tigger Shadow Clone overlay.
 * @param {number} maxDuration - Duration in milliseconds.
 **/

export function triggerShadowClone(maxDuration = 10000) {
    if(!personCanvas) {
        console.warn("Shadow Clone overlay has not been initialized.")
        return
    }

    cloneActiveUntil = performance.now() + maxDuration

    // Start a new smoke animation.
    smokeStartedAt = performance.now()
    smokeParticles = []

    // Create several puffs around each clone position.
    for(const clone of CLONE_OFFSETS) {
        for(let i = 0; i < 12; i++) {
            smokeParticles.push({
                x: clone.x,
                y: clone.y,

                // Randomized starting positions within the smoke cloud.
                offsetX: (Math.random() - 0.5) * 0.10,
                offsetY: (Math.random() - 0.5) * 0.08,

                // Smoke expands and drifts upward.
                driftX: (Math.random() - 0.5) * 0.10,
                driftY: -(0.03 + Math.random() * 0.12),

                radius: 0.025 + Math.random() * 0.045,
                delay: Math.random() * 0.12,
                alpha: 0.35 + Math.random() * 0.35
            })
        }
    }

    console.log("Shadow Clone Jutsu activated!")
}


// Check Active State

export function isShadowCloneActive() {
    if(cloneActiveUntil === 0) {
        return false
    }

    if(performance.now() >= cloneActiveUntil) {
        cloneActiveUntil = 0
        return false
    }

    return true
}


// Smoke Animations

function drawSmoke(ctx, width, height, particle, progress) {
    const localProgress = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)))

    if(localProgress <= 0 || localProgress >= 1) {
        return
    }

    // Expand rapidly, then slowly dissipate.
    const expansion = 0.5 + localProgress * 1.5
    const fadeOut = 1 - localProgress

    const centerX = width / 2 + particle.x * width + (particle.offsetX + particle.driftX * localProgress) * width
    const centerY = height / 2 + particle.y * height + (particle.offsetY + particle.driftY * localProgress) * height

    const radius = Math.min(width, height) * particle.radius * expansion
    const alpha = particle.alpha * fadeOut

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.globalCompositeOperation = "source-over"

    // Soft gray-white smoke with a transparent outer edge.
    const gradient = ctx.createRadialGradient(centerX - radius * 0.2, centerY - radius * 0.2, radius * 0.05, centerX, centerY, radius)

    gradient.addColorStop(0, "rgba(245, 245, 245, 0.95)")
    gradient.addColorStop(0.35, "rgba(205, 205, 205, 0.75)")
    gradient.addColorStop(0.70, "rgba(145, 145, 145, 0.30)")
    gradient.addColorStop(1, "rgba(110, 110, 110, 0)")

    ctx.fillStyle = gradient

    // Slightly irregular overlapping puffs create a cloud effect.
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radius * 1.1, radius * 0.85, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
}


// Shadow Clone Animations

export function drawShadowClones(ctx, width, height) {
    if(!isShadowCloneActive() || !personCanvas) return

    ctx.save()

    // Draw the clone silhouettes.
    for(const clone of CLONE_OFFSETS) {
        ctx.save()
        ctx.globalAlpha = clone.alpha
        ctx.filter = "blur(1px)"

        ctx.translate(width / 2 + clone.x * width, height / 2 + clone.y * height)
        ctx.scale(clone.scale, clone.scale)
        ctx.drawImage(personCanvas, -width / 2, -height / 2, width, height)

        ctx.restore()
    }

    // Draw smoke over the clones while they materialize.
    const elapsed = performance.now() - smokeStartedAt

    if(elapsed < SMOKE_DURATION) {
        const progress = elapsed / SMOKE_DURATION

        for(const particle of smokeParticles) {
            drawSmoke(ctx, width, height, particle, progress)
        }
    } 
    else {
        // Release particles once the smoke animation finishes.
        smokeParticles = []
    }

    ctx.restore()
}
