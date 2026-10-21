import {
    getHandSlots,
    getVisibleHands
} from "./tracking/handSlots.js"

import {
    processHandResults
} from "./tracking/handTracker.js"

import {
    drawHand
} from "./ui/drawing.js"

import {
    extractHandFeatures
} from "./tracking/handFeatures.js"

import {
    predictHandSign
} from "./tracking/handPrediction.js"

import {
    FilesetResolver,
    HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs"


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

// Status and Reset Time
const NO_HANDS_RESET_TIME = 5000
let noHandsSince = null

// Frames per second
let fpsFrames = 0
let fpsLastUpdate = performance.now()


// MediaPipe and DOM

const video = document.getElementById('webcam')
const canvas = document.getElementById('output')
const status = document.getElementById('status')
const ctx = canvas.getContext('2d')

const detectionCanvas = document.createElement('canvas')
const detectionCtx = detectionCanvas.getContext('2d')

const predictionElement = document.getElementById("prediction")
const predictionConfidence = document.getElementById("prediction-confidence")
const predictionConfidenceBar = document.getElementById("prediction-confidence-bar")
const probabilityList = document.getElementById("probability-list")

const modelStatus = document.getElementById("model-status")
const modelStatusText = document.getElementById("model-status-text")
const cameraState = document.getElementById("camera-state")
const cameraMessage = document.getElementById("camera-message")
const cameraStatusCopy = document.querySelector(".camera-status-copy")

const hudTracking = document.getElementById("hud-tracking")
const handCount = document.getElementById("hand-count")
const fpsCounter = document.getElementById("fps-counter")
const cameraResolution = document.getElementById("camera-resolution")

const landmarkStatus = document.getElementById("landmark-status")
const predictionEngineStatus = document.getElementById("prediction-engine-status")
const predictionDescription = document.getElementById("prediction-description")

detectionCanvas.width = 1280
detectionCanvas.height = 720

let handLandmarker = null


async function createHandLandmarker() {
    console.log("Loading MediaPipe and Hand Landmarker...")

    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm")

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
    updateFPS()

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

            // Prediction Console Logs
            // console.log("Predicted Sign:", result.prediction)
            // console.log("Probabilities:", result.probabilities)
            
            updatePredictionUI(result)
        })
        .catch(error => {
            console.error("Prediction Error:", error)
        })
        .finally(() => {
            predictionInProgress = false
        })
    }

    // Status

    handCount.textContent = `${visibleHands} HAND${visibleHands === 1 ? "" : "S"} DETECTED`

    if(visibleHands === 0) {
        status.textContent = "No hands detected. Show your hand to the camera."

        setCameraState("waiting", "WAITING")
        hudTracking.textContent = "STANDBY"
        landmarkStatus.textContent = "SEARCHING"

        noHandsSince ??= performance.now()

        if(performance.now() - noHandsSince >= NO_HANDS_RESET_TIME) {
            resetPredictionUI()
        }
    } 
    else {
        status.textContent = `${visibleHands} hand${visibleHands === 1 ? "" : "s"} detected`

        setCameraState("tracking", "TRACKING")
        hudTracking.textContent = "ACTIVE"
        landmarkStatus.textContent = "ACTIVE"

        noHandsSince = null
        hideCameraMessage()
    }
}


// Prediction UI

function updatePredictionUI(result) {
    const prediction = result.prediction
    const probabilities = result.probabilities ?? {}

    const confidence = Math.max(0, Math.min(1, Number(probabilities[prediction]) || 0))

    const confidencePercent = confidence * 100

    predictionElement.textContent = prediction
    predictionDescription.textContent = "Sign recognized by the prediction model."

    predictionConfidence.textContent = `${confidencePercent.toFixed(1)}%`
    predictionConfidenceBar.style.width = `${confidencePercent}%`

    predictionEngineStatus.textContent = "ACTIVE"

    // Rank predictions from highest to lowest.
    const sortedProbabilities = Object.entries(probabilities)
        .filter(([, value]) => Number.isFinite(Number(value)))
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 5)

    probabilityList.replaceChildren()

    sortedProbabilities.forEach(([sign, probability], index) => {

        const percent = Math.max(0, Math.min(100, Number(probability) * 100))

        const row = document.createElement("div")
        row.className = "probability-row"

        if(index === 0) {
            row.classList.add("is-top-prediction")
        }

        const info = document.createElement("div")
        info.className = "probability-info"

        const name = document.createElement("span")
        name.className = "sign-name"
        name.textContent = sign

        const value = document.createElement("span")
        value.className = "sign-probability"
        value.textContent = `${percent.toFixed(1)}%`

        info.append(name, value)

        const bar = document.createElement("div")
        bar.className = "probability-bar"

        const fill = document.createElement("div")
        fill.className = "probability-fill"
        fill.style.width = `${percent}%`

        bar.appendChild(fill)
        row.append(info, bar)
        probabilityList.appendChild(row)
    })
}

function resetPredictionUI() {
    predictionElement.textContent = "Waiting..."
    predictionDescription.textContent = "Perform a hand sign to begin analysis."

    predictionConfidence.textContent = "0%"
    predictionConfidenceBar.style.width = "0%"

    predictionEngineStatus.textContent = "STANDBY"

    probabilityList.replaceChildren()

    const empty = document.createElement("div")
    empty.className = "empty-predictions"

    const line = document.createElement("span")
    line.className = "empty-prediction-line"

    const message = document.createElement("p")
    message.textContent = "Waiting for model output..."

    empty.append(line, message)
    probabilityList.appendChild(empty)
}


// UI Helper Functions

function setModelStatus(state, message) {
    modelStatus.dataset.state = state
    modelStatusText.textContent = message
}

function setCameraState(state, message) {
    cameraState.dataset.state = state
    cameraState.innerHTML = `
        <span class="live-dot"></span>
        ${message}
    `
    cameraStatusCopy.dataset.state = state
}

function updateFPS() {
    fpsFrames++

    const now = performance.now()

    if(now - fpsLastUpdate >= 1000) {
        const fps = fpsFrames * 1000 / (now - fpsLastUpdate)

        fpsCounter.textContent = `${Math.round(fps)} FPS`

        fpsFrames = 0
        fpsLastUpdate = now
    }
}

function showCameraMessage(title, description) {
    cameraMessage.querySelector("strong").textContent = title
    cameraMessage.querySelector("p").textContent = description
    cameraMessage.classList.remove("is-hidden")
}

function hideCameraMessage() {
    cameraMessage.classList.add("is-hidden")
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

        hideCameraMessage()

        cameraResolution.textContent = `${video.videoWidth} × ${video.videoHeight}`
        setCameraState("waiting", "WAITING")
        status.textContent = "Camera connected. Waiting for hands."

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

    setModelStatus("loading", "LOADING MODEL")
    landmarkStatus.textContent = "LOADING"
    predictionEngineStatus.textContent = "STANDBY"

    try {
        await createHandLandmarker()

        landmarkStatus.textContent = "READY"
        setModelStatus("ready", "MODEL READY")

        await startCamera()

        if(video.srcObject) {
            setModelStatus("ready", "SYSTEM READY")
        }
    } 
    catch (error) {
        console.error("Application startup failed:", error)

        status.textContent = "Hand tracking initialization failed."

        setModelStatus("error", "INITIALIZATION ERROR")
        setCameraState("error", "ERROR")

        landmarkStatus.textContent = "ERROR"

        showCameraMessage("Initialization failed", "Check the model path, network connection, and browser console.")
    }
}

main()