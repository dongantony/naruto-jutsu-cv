// overlayClone.js

let personCanvas = null

let cloneActiveUntil = 0

const CLONE_OFFSETS = [
    { x: -0.22, y: 0.05, scale: 1.0, alpha: 1.0 },
    { x:  0.22, y: 0.05, scale: 1.0, alpha: 1.0 },
    { x: -0.42, y: 0.1, scale: 1.0, alpha: 1.0 },
    { x:  0.42, y: 0.1  , scale: 1.0, alpha: 1.0 }
]

/**
 * Initialize the Shadow Clone overlay.
 * Uses the existing segmented-person canvas.
 */
export function initializeCloneOverlay(segmentedCanvas) {
    personCanvas = segmentedCanvas

    console.log("Shadow Clone overlay initialized.")
}

/**
 * Activate Shadow Clone Jutsu.
 * @param {number} maxDuration - Duration in milliseconds.
 */
export function triggerShadowClone(maxDuration = 10000) {
    if(!personCanvas) {
        console.warn("Shadow Clone overlay has not been initialized.")
        return
    }

    cloneActiveUntil = performance.now() + maxDuration

    console.log("Shadow Clone Jutsu activated!")
}

/**
 * Check whether the clone effect is still active.
 */
export function isShadowCloneActive() {
    if(performance.now() >= cloneActiveUntil) {
        cloneActiveUntil = 0
        return false
    }

    return cloneActiveUntil > 0
}

/**
 * Draw copies of the segmented person.
 *
 * The original person is drawn separately by the main application.
 */
export function drawShadowClones(ctx, width, height) {
    if(!isShadowCloneActive() || !personCanvas) return

    ctx.save()

    for (const clone of CLONE_OFFSETS) {
        ctx.filter = "none"
        ctx.save()

        ctx.globalAlpha = clone.alpha
        ctx.filter = "blur(1px)"

        // Move the clone relative to the center of the frame.
        ctx.translate(
            width / 2 + clone.x * width,
            height / 2 + clone.y * height
        )

        ctx.scale(clone.scale, clone.scale)

        ctx.drawImage(
            personCanvas,
            -width / 2,
            -height / 2,
            width,
            height
        )

        ctx.restore()
    }

    ctx.restore()
}
