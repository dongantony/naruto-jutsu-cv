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

import {
    extractHandFeatures
} from "./tracking/handFeatures.js"

import {
    predictHandSign
} from "./tracking/handPrediction.js"

import {
    FilesetResolver,
    HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/+esm"


// Camera Width and Height
const CAMERA_WIDTH = 1280
const CAMERA_HEIGHT = 720

// Hand Detection, Tracking and Presence Confidence Value
const MIN_HAND_DETECTION_CONFIDENCE = 0.60
const MIN_HAND_PRESENCE_CONFIDENCE = 0.60
const MIN_TRACKING_CONFIDENCE = 0.60

// Path to the Hand Landmarker used by Python
const HAND_LANDMARKER_MODEL = "../../hand_landmarker.task"

// 6-7 predictions per second
const PREDICTION_INTERVAL = 150

// Last prediction time.
let lastPredictionTime = 0

// Prevent multiple requests from being active at the same time.
let predictionInProgress = false


// MediaPipe and DOM

const video = document.getElementById('webcam')
const canvas = document.getElementById('output')
const status = document.getElementById('status')
const ctx = canvas.getContext('2d')

const detectionCanvas = document.createElement('canvas')
const detectionCtx = detectionCanvas.getContext('2d')

detectionCanvas.width = 1280
detectionCanvas.height = 720

let handLandmarker = null

async function createHandLandmarker() {
    console.log("Loading MediaPipe and Hand Landmarker...")

    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm")

    handLandmarker = await HandLandmarker.createFromOptions(
        vision,
        {
            baseOptions: { modelAssetPath: HAND_LANDMARKER_MODEL },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: MIN_HAND_DETECTION_CONFIDENCE,
            minHandPresenceConfidence: MIN_HAND_PRESENCE_CONFIDENCE,
            minTrackingConfidence: MIN_TRACKING_CONFIDENCE
        }
    )

    console.log("MediaPipe Hand Landmarker loaded.")
}


// Camera Frame Processing 

let lastVideoTime = -1

function processFrame() {
    
    if(!handLandmarker) {
        requestAnimationFrame(processFrame)
        return
    }
    if(video.readyState < 2) {
        requestAnimationFrame(processFrame)
        return    
    }
    if(video.currentTime === lastVideoTime) {
        requestAnimationFrame(processFrame)
        return
    }

    lastVideoTime = video.currentTime
    
    const timestampMs = performance.now()

    detectionCtx.save()
    detectionCtx.scale(-1, 1)
    detectionCtx.drawImage(video, -detectionCanvas.width, 0, detectionCanvas.width, detectionCanvas.height)
    detectionCtx.restore()

    const results = handLandmarker.detectForVideo(detectionCanvas, timestampMs)

    onResults(results)
    requestAnimationFrame(processFrame)
}

function onResults(results) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert MediaPipe Task result into our internal hand representation and update hand slots.
    const detectedHands = processHandResults(results)

    const handSlots = getHandSlots()

    let visibleHands = 0

    for(let i = 0; i < handSlots.length; i++) {
        const slot = handSlots[i]

        if(!slot.active || !slot.visible || !slot.landmarks) continue

        visibleHands++

        drawHand(ctx, canvas, slot, i)
    }

    // Two-Hand Relationship
    const { left, right } = getVisibleHands()
    const relationship = getHandRelationship(left, right)
    
    if(relationship.available) {
        drawTwoHandInfo(ctx, relationship)
    }

    // Machine Learning Prediction
    const now = performance.now()
    
    if(detectedHands.length > 0 && now - lastPredictionTime >= PREDICTION_INTERVAL && !predictionInProgress) {
        // [Important]: Use Raw MediaPipe landmarks
        // 
        // Do NOT use getVisibleHands() or slot.landmarks since handSlots applies smoothing.
        // Python collect_data.py also uses the raw HandLandmarker result

        lastPredictionTime = now
        predictionInProgress = true

        const features = extractHandFeatures(detectedHands)

        predictHandSign(features).then(result => {
            if(!result) return

            console.log("Predicted Sign:", result.prediction)
            console.log("Probabilities:", result.probabilities)
        })
        .catch(error => {
            console.error("Prediction Error:", error)
        })
        .finally(() => {
            predictionInProgress = false
        })
    }

    // Status
    if(visibleHands === 0) {
        status.innerText = "No hands detected."
    }
    else {
        status.innerText = `${visibleHands} hand${visibleHands === 1 ? "" : "s"} detected`
    }
}


// Camera and Start Application 

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: {
                    ideal: CAMERA_WIDTH
                },

                height: {
                    ideal: CAMERA_HEIGHT
                }
            },
            
            audio: false
        })

        video.srcObject = stream

        await video.play()

        console.log("Camera started:", video.videoWidth, "x", video.videoHeight)
        
        requestAnimationFrame(processFrame)
    }
    catch(error) {
        console.error("Could not start camera:", error)

        status.innerText = "Camera error."
    }
}

async function main() {
    console.log("Initializing Naruto Hand Sign CV...")

    try {
        await createHandLandmarker()
        await startCamera()
    }
    catch(error) {
        console.error("Application startup failed:", error)

        status.innerText = "Hand tracking initialization failed."
    }
}

main()