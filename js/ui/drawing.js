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

    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 4 })
    drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2, radius: 5 })

    const wrist = landmarks[0]
    const x = wrist.x * canvas.width
    const y = wrist.y * canvas.height

    const label = slot.handedness ? `${slot.handedness} Hand` : `Hand ${slotIndex + 1}`
    drawMirroredText(ctx, label, x + 10, y - 10, "bold 20px Arial", "#FFFFFF")

    drawFingerInfo(ctx, slot, x, y)
    drawPalmInfo(ctx, slot, x, y)
}

export function drawTwoHandInfo(ctx, relationship) {
    if(!relationship.available) return

    let y = 30

    let text = `Wrist: ${relationship.wristDistance.toFixed(3)}`
    drawMirroredText(ctx, text, 10, y, "bold 18px Arial", "#FFFF00") 

    y += 22
    text = `Palm: ${relationship.palmDistance.toFixed(3)}`
    drawMirroredText(ctx, text, 10, y, "bold 18px Arial", "#FFFF00") 

    y += 22
    text = `Palm Angle: ${relationship.palmAngle.toFixed(1)}°`
    drawMirroredText(ctx, text, 10, y, "bold 18px Arial", "#FFFF00") 


    y += 22
    text = relationship.touching 
            ? "Hands: TOUCHING"
            : relationship.interacting
            ? "Hands: INTERACTING"
            : "Hands: SEPARATED"
    
    drawMirroredText(ctx, text, 10, y, "bold 18px Arial", "#FFFF00")        
}