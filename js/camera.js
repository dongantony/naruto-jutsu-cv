import {
    getHandSlots,
    getVisibleHands
} from "./tracking/handSlots.js"

import {
    processHandResults
} from "./tracking/handTracker.js"

import {
    drawHand,
    drawTwoHandInfo
} from "./ui/drawing.js"

import {
    getHandRelationship
} from "./tracking/handRelationship.js"


// MediaPipe and DOM
const video = document.getElementById('webcam')
const canvas = document.getElementById('output')
const status = document.getElementById('status')
const ctx = canvas.getContext('2d')

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    }
})

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.60,
    minTrackingConfidence: 0.60
})

hands.onResults(onResults)


function onResults(results) {
    canvas.width = results.image.width;
    canvas.height = results.image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    processHandResults(results)

    const handSlots = getHandSlots()

    let visibleHands = 0

    for(let i = 0; i < handSlots.length; i++) {
        const slot = handSlots[i]

        if(!slot.active || !slot.visible || !slot.landmarks) continue

        visibleHands++

        drawHand(ctx, canvas, slot, i)
    }

    const {left, right} = getVisibleHands()
    const relationship = getHandRelationship(left, right)

    if(relationship.available) {
        drawTwoHandInfo(ctx, relationship)
    }

    if(visibleHands === 0) {
        status.innerText = "No hands detected."
    }
    else {
        status.innerText = `${visibleHands} hand${visibleHands === 1 ? "" : "s"} detected`
    }
}


// Camera

const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video })
    },

    width: 1280,
    height: 720
})

camera.start()