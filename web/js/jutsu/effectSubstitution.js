// effectSubstitution.js

// Element and Overlay for Video/Substitute
let personCanvas = null
let substitutionStartedAt = 0
let substitutionExpiresAt = 0
let smokeParticles = []

const logImage = new Image()
logImage.src = "/web/images/jutsus/log.png"

// Substitution Animation settings
const SUBSTITUTION_DURATION = 5000
const SMOKE_DURATION = 900
const LOG_REVEAL_DURATION = 300
const LOG_DROP_DURATION = 1000


// Initialize the Substitution overlay.

export function initializeSubstitutionOverlay(segmentedPersonCanvas) {
    personCanvas = segmentedPersonCanvas
}


// Trigger and Check Substitution

export function triggerSubstitution(duration = SUBSTITUTION_DURATION) {
    const now = performance.now()

    substitutionStartedAt = now
    substitutionExpiresAt = now + duration

    smokeParticles = []

    // Create a large cloud that spreads across the entire frame.
    for(let i = 0; i < 180; i++) {
        const angle = Math.random() * Math.PI * 2

        smokeParticles.push({
            angle,
            distance: 0.1 + Math.random() * 0.9,
            radius: 0.035 + Math.random() * 0.075,
            delay: Math.random() * 0.2,
            alpha: 0.2 + Math.random() * 0.4,
            stretchX: 1.2 + Math.random() * 1.8,
            stretchY: 0.6 + Math.random() * 0.8,
            rotation: Math.random() * Math.PI * 2,
            driftX: (Math.random() - 0.5) * 0.18,
            driftY: (Math.random() - 0.5) * 0.18,
            layers: 3 + Math.floor(Math.random() * 3)
        })
    }
}

export function isSubstitutionActive() {
    if(substitutionExpiresAt === 0) return false

    if(performance.now() >= substitutionExpiresAt) {
        substitutionExpiresAt = 0
        smokeParticles = []
        return false
    }

    return true
}


// Smoke Animations

function drawSmoke(ctx, width, height, progress) {
    const centerX = width / 2
    const centerY = height / 2
    const minDimension = Math.min(width, height)
    const coverage = Math.min(1, progress * 1.8)

    ctx.save()
    ctx.globalAlpha = coverage
    ctx.fillStyle = "#777777"
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    for(const particle of smokeParticles) {
        const p = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)))

        if(p <= 0) continue

        const expansion = 0.15 + p * 1.8
        const distance = particle.distance * expansion * minDimension

        const x = centerX + Math.cos(particle.angle) * distance + particle.driftX * width * p
        const y = centerY + Math.sin(particle.angle) * distance + particle.driftY * height * p

        const radius = minDimension * particle.radius * (0.6 + p * 1.4)

        const fade = 1 - p * 0.35

        // Multiple overlapping puffs form an irregular smoke cloud.
        for(let i = 0; i < particle.layers; i++) {
            const layerAngle = particle.rotation + (i / particle.layers) * Math.PI * 2

            const layerDistance = radius * (0.15 + Math.random() * 0.3)

            const puffX = x + Math.cos(layerAngle) * layerDistance
            const puffY = y + Math.sin(layerAngle) * layerDistance
            
            const puffWidth = radius * particle.stretchX * (0.55 + Math.random() * 0.55)
            const puffHeight = radius * particle.stretchY * (0.65 + Math.random() * 0.6)

            ctx.save()
            ctx.translate(puffX, puffY)
            ctx.rotate(particle.rotation + (Math.random() - 0.5) * 1.2)

            ctx.globalAlpha = particle.alpha * fade / particle.layers * 2.2
            ctx.shadowColor = "rgba(235, 235, 235, 0.35)"
            ctx.shadowBlur = radius * 0.45

            // Soft, uneven-looking puff.
            const gradient = ctx.createRadialGradient(-puffWidth * 0.15, -puffHeight * 0.2, radius * 0.02, 0, 0, Math.max(puffWidth, puffHeight))

            gradient.addColorStop(0, "rgba(245, 245, 245, 0.8)")
            gradient.addColorStop(0.35, "rgba(220, 220, 220, 0.65)")
            gradient.addColorStop(0.7, "rgba(180, 180, 180, 0.3)")
            gradient.addColorStop(1, "rgba(130, 130, 130, 0)")

            ctx.fillStyle = gradient
            ctx.beginPath()

            const points = 12

            for(let j = 0; j <= points; j++) {
                const angle = (j / points) * Math.PI * 2

                const irregularity = 0.78 + 0.16 * Math.sin(angle * 3 + particle.rotation) + 0.1 * Math.cos(angle * 5 + particle.angle)

                const px = Math.cos(angle) * puffWidth * irregularity
                const py = Math.sin(angle) * puffHeight * irregularity

                if(j === 0) {
                    ctx.moveTo(px, py)
                } 
                else {
                    ctx.lineTo(px, py)
                }
            }

            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }
    }
}

// Substitution Animations

export function drawSubstitution(ctx, width, height) {
    if(!isSubstitutionActive()) return

    const elapsed = performance.now() - substitutionStartedAt

    // Keep the feed completely hidden after the initial smoke burst. Prevents the underlying video element from showing through.
    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
    ctx.filter = "none"
    ctx.fillStyle = "#777777"
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // Phase 1: full-screen smoke.
    if(elapsed < SMOKE_DURATION) {
        drawSmoke(ctx, width, height, elapsed / SMOKE_DURATION)
    }

    if(!logImage.complete || !logImage.naturalWidth) return

    // Size the log relative to the frame.
    const logWidth = width * 0.65
    const logHeight = logWidth * (logImage.naturalHeight / logImage.naturalWidth)

    // Phase 2: reveal the log after the smoke starts spreading.
    const revealStart = SMOKE_DURATION * 0.55
    const dropStart = Math.max(revealStart + LOG_REVEAL_DURATION, (substitutionExpiresAt - substitutionStartedAt) - LOG_DROP_DURATION)

    if(elapsed < revealStart) return

    const revealProgress = Math.min(1, (elapsed - revealStart) / LOG_REVEAL_DURATION)

    // Phase 3: drop the log during the final second.
    const dropProgress = Math.max(0, Math.min(1, (elapsed - dropStart) / LOG_DROP_DURATION))
    const easedDrop = dropProgress * dropProgress

    const startY = height * 0.5
    const dropDistance = height * 1.15

    const logY = startY + dropDistance * easedDrop

    const dropAlpha = 1 - Math.max(0, Math.min(1, (dropProgress - 0.65) / 0.35))

    ctx.save()

    ctx.globalAlpha = revealProgress * dropAlpha
    ctx.translate(width / 2, logY)
    ctx.rotate(-Math.PI / 5)

    ctx.drawImage(logImage, -logWidth / 2, -logHeight / 2, logWidth, logHeight)

    ctx.restore()
}
