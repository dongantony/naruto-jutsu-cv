import {
    getHandSlots,
} from "./tracking/handSlots.js"

import {
    processHandResults
} from "./tracking/handTracker.js"

import {
    extractHandFeatures
} from "./tracking/handFeatures.js"

import {
    predictHandSign
} from "./tracking/handPrediction.js"

import {
    JUTSUS
}   from "./jutsu/jutsuDefinitions.js"

import {
    processJutsuPrediction,
    getJutsuState
} from "./jutsu/jutsuDetector.js"

import {
    initializeFireballOverlay,
    triggerFireball
} from "./jutsu/effectFireball.js" 

import {
    initializeReaperSeal,
    triggerReaperSeal,
    isReaperSealActive
} from "./jutsu/effectReaper.js"

import {
    initializeCloneOverlay,
    triggerShadowClone,
    isShadowCloneActive,
    drawShadowClones
} from "./jutsu/effectClone.js"

import {
    initializeSubstitutionOverlay,
    triggerSubstitution,
    isSubstitutionActive,
    drawSubstitution
} from "./jutsu/effectSubstitution.js"

import {
    initializeChidoriOverlay,
    triggerChidori,
    updateChidoriHand,
    isChidoriActive
} from "./jutsu/effectChidori.js"

import {
    initializeRasenganOverlay,
    triggerRasengan,
    updateRasenganHand,
    isRasenganActive
} from "./jutsu/effectRasengan.js"

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

// Sign Images
const SIGN_IMAGES = {
    Bird: "/web/images/signs/Bird.png",
    Boar: "/web/images/signs/Boar.png",
    Dog: "/web/images/signs/Dog.png",
    Dragon: "/web/images/signs/Dragon.png",
    Hare: "/web/images/signs/Hare.png",
    Horse: "/web/images/signs/Horse.png",
    Monkey: "/web/images/signs/Monkey.png",
    Ox: "/web/images/signs/Ox.png",
    Ram: "/web/images/signs/Ram.png",
    Rat: "/web/images/signs/Rat.png",
    Snake: "/web/images/signs/Snake.png",
    Tiger: "/web/images/signs/Tiger.png",
    ShadowClone: "/web/images/signs/ShadowClone.png",
    Rasengan: "/web/images/jutsus/rasengan.png"
}

// Jutsu Overlays
const fireballCanvas = document.getElementById("fireball-overlay")
const chidoriCanvas = document.getElementById("chidori-overlay")
const rasenganCanvas = document.getElementById("rasengan-overlay")

const reaperBackground = new Image()
reaperBackground.src = "/web/images/jutsus/shinigami.png"

const personCanvas = document.createElement("canvas")
const personCtx = personCanvas.getContext("2d")

let selfieSegmentation = null

// Last prediction time.
let lastPredictionTime = 0

// Prevent multiple requests from being active at the same time.
let predictionInProgress = false

// Selected Jutsu for UI.
let selectedJutsu = null

// Last Displayed Activated Jutsu.
let lastDisplayedActivation = null

// Timer updating the UI state for hand sign cards.
let jutsuUITimer = null


// MediaPipe and DOM

const video = document.getElementById('webcam')
const canvas = document.getElementById('output')
const status = document.getElementById('status')
const ctx = canvas.getContext('2d')

const detectionCanvas = document.createElement('canvas')
const detectionCtx = detectionCanvas.getContext('2d')

const jutsuSelect = document.getElementById("jutsu-select")
const selectedJutsuName = document.getElementById("selected-jutsu-name")
const selectedJutsuDescription = document.getElementById("selected-jutsu-description")
const jutsuSignsContainer = document.getElementById("jutsu-signs")
const signProgress = document.getElementById("sign-progress")
const jutsuNameDisplay = document.getElementById("jutsu-name")

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
let segmentationInProgress = false

async function processFrame() {
    try {
        if(!handLandmarker || !selfieSegmentation || video.readyState < 2 || video.currentTime === lastVideoTime) return

        lastVideoTime = video.currentTime

        const timestampMs = performance.now()

        detectionCtx.save()
        detectionCtx.scale(-1, 1)
        detectionCtx.drawImage(video, -detectionCanvas.width, 0, detectionCanvas.width, detectionCanvas.height)
        detectionCtx.restore()

        const results = handLandmarker.detectForVideo(
            detectionCanvas,
            timestampMs
        )

        onResults(results)

        if(!segmentationInProgress) {
            segmentationInProgress = true

            try {
                await selfieSegmentation.send({ image: video })
            } 
            finally {
                segmentationInProgress = false
            }
        }
    } 
    catch (error) {
        console.error("Frame processing error:", error)
    } 
    finally {
        requestAnimationFrame(processFrame)
    }
}

function onResults(results) {
    const detectedHands = processHandResults(results)
    const handSlots = getHandSlots()

    let visibleHands = 0

    if(isChidoriActive() && detectedHands.length > 0) {
        updateChidoriHand(detectedHands[0].landmarks)
    }
    if (isRasenganActive() && detectedHands.length > 0) {
        updateRasenganHand(detectedHands[0].landmarks)
    }

    for(let i = 0; i < handSlots.length; i++) {
        const slot = handSlots[i]

        if(!slot.active || !slot.visible || !slot.landmarks) continue

        visibleHands++
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

            const jutsuState = processJutsuPrediction(result.prediction, result.probabilities[result.prediction] ?? 0)

            if(selectedJutsu) {
                renderJutsuSigns(jutsuState.sequence)

                if(jutsuState.activeJutsu) {
                    startJutsuUITimer()
                }
            }

            if(jutsuState.lastJutsu && jutsuState.lastJutsu.timestamp !== lastDisplayedActivation) {
                lastDisplayedActivation = jutsuState.lastJutsu.timestamp

                const activatedJutsu = jutsuState.lastJutsu

                if(selectedJutsu && activatedJutsu.id === selectedJutsu.id) {
                    renderJutsuSigns(selectedJutsu.signs)
                    startJutsuUITimer()

                    jutsuNameDisplay.textContent = activatedJutsu.name

                    if(activatedJutsu.id === "fireball-jutsu") {
                        triggerFireball(detectedHands[0]?.landmarks)
                    }
                    if (activatedJutsu.id === "lightning-blade") {
                        triggerChidori(detectedHands[0]?.landmarks, activatedJutsu.maxDuration)
                    }
                    if (activatedJutsu.id === "spiral-sphere") {
                        triggerRasengan(detectedHands[0]?.landmarks, activatedJutsu.maxDuration)
                    }
                    if(activatedJutsu.id === "reaper-death-seal") {
                        triggerReaperSeal(activatedJutsu.maxDuration)
                    }
                    if(activatedJutsu.id === "shadow-clone-jutsu") {
                        triggerShadowClone(activatedJutsu.maxDuration)
                    }
                    if(activatedJutsu.id === "body-replacement") {
                        triggerSubstitution(activatedJutsu.maxDuration)
                    }
                }
            }
        })
        .catch(error => {
            console.error("Prediction Error:", error)
        })
        .finally(() => {
            predictionInProgress = false
        })
    }
    else if(detectedHands.length === 0) {
        processJutsuPrediction(null)
    }
}


// Jutsu UI (Populate the dropdown and display the selected jutsu and required signs)

function populateJutsuSelector() {
    for (const jutsu of JUTSUS) {
        const option = document.createElement("option")

        option.value = jutsu.id
        option.textContent = jutsu.name

        jutsuSelect.appendChild(option)
    }
}

function selectJutsu(jutsuID) {
    if (jutsuUITimer !== null) {
        clearInterval(jutsuUITimer)
        jutsuUITimer = null
    }
    
    selectedJutsu = JUTSUS.find(jutsu => jutsu.id === jutsuID) ?? null

    if(!selectedJutsu) {
        selectedJutsuName.textContent = "Choose a Jutsu"
        selectedJutsuDescription.textContent = "Select a jutsu to see the required hand signs."

        jutsuSignsContainer.replaceChildren()
        signProgress.textContent = "0 / 0 signs completed"
        return
    }

    selectedJutsuName.textContent = selectedJutsu.name
    selectedJutsuDescription.textContent = ``

    renderJutsuSigns([])
}

function renderJutsuSigns(sequence = []) {
    if(!selectedJutsu) return

    const state = getJutsuState()
    const active = state.activeJutsu?.id === selectedJutsu.id

    // Count how many signs match the selected sequence in order.
    let completed = 0

    if(active) {
        completed = selectedJutsu.signs.length
    }
    else {
        for (let i = 0; i < sequence.length; i++) {
            if(sequence[i] !== selectedJutsu.signs[i]) break
            completed++
        }
    }

    // During activation, show the final sign.
    // Otherwise, show the next sign the user needs to perform.
    
    const signIndex = active ? selectedJutsu.signs.length - 1 : Math.min(completed, selectedJutsu.signs.length - 1)

    const sign = selectedJutsu.signs[signIndex]

    jutsuSignsContainer.replaceChildren()

    const card = document.createElement("div")
    card.className = "sign-card"

    const number = document.createElement("span")
    number.className = "sign-number"
    number.textContent = `Sign ${signIndex + 1} of ${selectedJutsu.signs.length}`

    const image = document.createElement("img")
    image.className = "sign-image"
    image.src = SIGN_IMAGES[sign] ?? ""
    image.alt = `${sign} hand sign`
    image.loading = "lazy"

    image.addEventListener("error", () => {
        image.alt = `${sign} image not found`
        image.classList.add("image-error")
    }, { once: true })

    const signState = document.createElement("span")
    signState.className = "sign-state"

    if(active) {
        card.classList.add("jutsu-active")
        signState.textContent = `Jutsu active · ${Math.ceil(state.remainingDuration / 1000)}s`
    } 
    else if(completed > signIndex) {
        card.classList.add("completed")
        signState.textContent = "Completed"
    } 
    else {
        card.classList.add("current")
        signState.textContent = `Perform: ${sign}`
    }

    card.append(number, image, signState)
    jutsuSignsContainer.appendChild(card)

    signProgress.textContent = active
        ? `Jutsu active · ${Math.ceil(state.remainingDuration / 1000)}s until ready`
        : `${completed} / ${selectedJutsu.signs.length} signs completed`
}

function startJutsuUITimer() {
    if(jutsuUITimer !== null) {
        clearInterval(jutsuUITimer)
    }

    jutsuUITimer = setInterval(() => {
        if(!selectedJutsu) return

        const state = getJutsuState()

        if(state.activeJutsu) {
            renderJutsuSigns(state.sequence)
        } 
        else {
            renderJutsuSigns(state.sequence)
            clearInterval(jutsuUITimer)
            jutsuUITimer = null
        }
    }, 100)
}

jutsuSelect.addEventListener("change", () => {
    selectJutsu(jutsuSelect.value)
})


// Selfie Segmentation

async function createSelfieSegmentation() {
    selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    })

    selfieSegmentation.setOptions({
        modelSelection: 1
    })

    selfieSegmentation.onResults(drawSegmentedFrame)

    console.log("Selfie Segmentation loaded.")
}

function drawSegmentedFrame(results) {
    if(!video.videoWidth || !video.videoHeight) return

    const width = video.videoWidth
    const height = video.videoHeight

    if(canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height

        personCanvas.width = width
        personCanvas.height = height
    }

    // Extract the person using the segmentation mask.
    personCtx.clearRect(0, 0, width, height)
    personCtx.drawImage(results.image, 0, 0, width, height)

    personCtx.save()
    personCtx.filter = "blur(3px)"
    personCtx.globalCompositeOperation = "destination-in"
    personCtx.drawImage(results.segmentationMask, 0, 0, width, height)
    personCtx.restore()

    personCtx.globalCompositeOperation = "source-over"
    personCtx.filter = "none"

    ctx.clearRect(0, 0, width, height)

    // Shadow Clone mode.
    if(isShadowCloneActive()) {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(results.image, 0, 0, width, height)
        ctx.drawImage(personCanvas, 0, 0, width, height)
        drawShadowClones(ctx, width, height)

        return
    }

    // Substitution Jutsu mode.
    if(isSubstitutionActive()) {
        ctx.clearRect(0, 0, width, height)
        drawSubstitution(ctx, width, height)

        return
    }

    // Normal camera mode.
    if(!isReaperSealActive()) {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(results.image, 0, 0, width, height)
        return
    }

    // Reaper Seal mode.
    if(!reaperBackground.complete || !reaperBackground.naturalWidth) {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(results.image, 0, 0, width, height)
        return
    }

    ctx.clearRect(0, 0, width, height)

    // Draw the Reaper background and the segmented person in front of it.
    ctx.drawImage(reaperBackground, 0, 0, width, height)
    ctx.drawImage(personCanvas, 0, 0, width, height)
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

        initializeFireballOverlay(video, fireballCanvas)
        initializeChidoriOverlay(video, chidoriCanvas)
        initializeRasenganOverlay(video, rasenganCanvas)
        initializeReaperSeal()
        initializeCloneOverlay(personCanvas)
        initializeSubstitutionOverlay(personCanvas)

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
        await createSelfieSegmentation()
        await startCamera()
    }
    catch(error) {
        console.error("Application startup failed:", error)

        status.innerText = "Hand tracking initialization failed."
    }
}

populateJutsuSelector()
main()