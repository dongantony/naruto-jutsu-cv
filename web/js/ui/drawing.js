// Hand Connections
//
// [MediaPipe Hands Landmark Connections]:
//
//  0 = wrist
//
//  Thumb:   1-2-3-4
//  Index:   5-6-7-8
//  Middle:  9-10-11-12
//  Ring:    13-14-15-16
//  Pinky:   17-18-19-20
//
// [Palm Connections]:
//
//  0-1
//  0-5
//  0-17
//  5-9
//  9-13
//  13-17

const HAND_CONNECTIONS = [
    // Wrist → Thumb
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],

    // Wrist → Index
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],

    // Wrist → Middle
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12],

    // Wrist → Ring
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16],

    // Wrist → Pinky
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20],

    // Palm
    [5, 9],
    [9, 13],
    [13, 17]
]


// Text

export function drawMirroredText(ctx, text, x, y, font = "20px Arial", color = "#FFFFFF") {
    ctx.save()
    ctx.scale(-1, 1)
    ctx.font = font
    ctx.fillStyle = color
    ctx.fillText(text, -x, y)
    ctx.restore()
}


// Draw Hand, Finger, and Palm Information 

export function drawFingerInfo(ctx, slot, x, y) {
    if(!slot.fingers) return

    const fingers = slot.fingers

    const text =
        `T:${fingers.thumb.state} ` +
        `I:${fingers.index.state} ` +
        `M:${fingers.middle.state} ` +
        `R:${fingers.ring.state} ` +
        `P:${fingers.pinky.state}`


    drawMirroredText(ctx, text, x + 10, y + 15, "14px Arial", "#FFFFFF")
}

export function drawPalmInfo(ctx, slot, x, y) {
    if(!slot.palm) return

    const palm = slot.palm
    
    drawMirroredText(ctx, `Palm: ${palm.width.toFixed(3)}`, x + 10, y + 32, "13px Arial", "#00FFFF")
    drawMirroredText(ctx, `Rotation: ${palm.rotation.toFixed(0)}°`, x + 10, y + 48, "13px Arial", "#00FFFF")
}

export function drawHand(ctx, canvas, slot, slotIndex) {
    if(!slot.active || !slot.visible || !slot.landmarks) return

    const landmarks = slot.landmarks

    ctx.save()
    ctx.strokeStyle = "#00FF00"
    ctx.lineWidth = 4

    for(const [startIndex, endIndex] of HAND_CONNECTIONS) {
        const start = landmarks[startIndex]
        const end = landmarks[endIndex]

        if(!start || !end) continue

        const startX = (1 - start.x) * canvas.width
        const startY = start.y * canvas.height

        const endX = (1 - end.x) * canvas.width
        const endY = end.y * canvas.height

        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
    }

    ctx.fillStyle = "#FF0000"

    for(const landmark of landmarks) {
        const x = (1 - landmark.x) * canvas.width
        const y = landmark.y * canvas.height

        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
    }

    ctx.restore()
    
    const wrist = landmarks[0]

    const x = (1 - wrist.x) * canvas.width
    const y = wrist.y * canvas.height
    const label = slot.handedness ? `${slot.handedness} Hand` : `Hand ${slotIndex + 1}`

    drawMirroredText(ctx, label, x + 10, y - 10, "bold 20px Arial", "#FFFFFF")
    drawFingerInfo(ctx, slot, x, y)
    drawPalmInfo(ctx, slot, x, y)
}