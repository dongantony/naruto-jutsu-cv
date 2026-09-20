import {
    distance
} from "../geometry/vectors.js"

import {
    analyzeFingers,
    analyzePalm
} from "./handAnalysis.js"


// Tracking Settings

// Landmark smoothing.
// 0.0 = very slow / heavily smoothed
// 1.0 = no smoothing
const SMOOTHING = 0.35

// Maximum wrist distance used when handedness cannot identify the correct hand.
const MAX_HAND_DISTANCE = 0.20

// Number of frames we remember a hand after MediaPipe temporarily loses it.
const MAX_LOST_FRAMES = 12

// After this many missing frames, we consider the old landmark position too old to use.
const MAX_STALE_FRAMES = 6


// Hand Slots

// Each slot represents a physical hand.
// Slot identity is primarily determined by handedness:
//
//     Left  -> Left slot
//     Right -> Right slot

const handSlots = [
    createHandSlot(),
    createHandSlot()
]

export function createHandSlot() {
    return {
        active: false,
        visible: false,
        landmarks: null,
        wrist: null,
        handedness: null,
        fingers: null,
        palm: null,
        lostFrames: 0,
        staleFrames: 0
    }
}


// Landmark functions

export function copyLandmarks(landmarks) {
    return landmarks.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z
    }))
}

export function smoothLandmarks(previous, current) {
    // No previous landmarks.
    if(!previous) return copyLandmarks(current)

    return current.map((point, index) => {
        const oldPoint = previous[index]

        return {
            x: oldPoint.x + (point.x - oldPoint.x) * SMOOTHING,
            y: oldPoint.y + (point.y - oldPoint.y) * SMOOTHING,
            z: oldPoint.z + (point.z - oldPoint.z) * SMOOTHING
        }
    })
}


// Slot Functions

export function clearSlot(slot) {
    slot.active = false
    slot.visible = false
    slot.landmarks = null
    slot.wrist = null
    slot.handedness = null
    slot.fingers = null
    slot.palm = null
    slot.lostFrames = 0
    slot.staleFrames = 0
}

export function findSlotByHandedness(handedness) {
    if(!handedness) return -1

    for(let i = 0; i < handSlots.length; i++) {
        const slot = handSlots[i]

        if(slot.active && slot.handedness === handedness) return i
    }

    return -1
}

export function findEmptySlot() {
    for(let i = 0; i < handSlots.length; i++) {

        if(!handSlots[i].active) return i
    }

    return -1
}

export function findClosestSlot(detected) {
    let bestSlot = -1
    let bestDistance = Infinity

    for(let i = 0; i < handSlots.length; i++) {
        const slot = handSlots[i]

        if(!slot.active || !slot.wrist) continue

        const dist = distance(slot.wrist, detected.landmarks[0])

        if(dist < bestDistance) {
            bestDistance = dist
            bestSlot = i
        }
    }

    if(bestDistance <= MAX_HAND_DISTANCE) return bestSlot

    return -1
}


// Slot Initialization and Update

export function initializeSlot(slotIndex, detected) {
    const slot = handSlots[slotIndex]
    slot.active = true
    slot.visible = true
    slot.landmarks = copyLandmarks(detected.landmarks)
    slot.wrist = slot.landmarks[0]
    slot.handedness = detected.handedness
    slot.lostFrames = 0
    slot.staleFrames = 0

    analyzeHand(slot)
}

export function updateSlot(slotIndex, detected) {
    const slot = handSlots[slotIndex]

    if(slot.staleFrames > MAX_STALE_FRAMES) {
        slot.landmarks = copyLandmarks(detected.landmarks)

    }
    else {
        slot.landmarks = smoothLandmarks(slot.landmarks, detected.landmarks)
    }

    slot.wrist = slot.landmarks[0]
    slot.handedness = detected.handedness
    slot.active = true
    slot.visible = true
    slot.lostFrames = 0
    slot.staleFrames = 0

    analyzeHand(slot)
}

export function markSlotLost(slot) {
    if(!slot.active) return

    slot.visible = false
    slot.lostFrames++
    slot.staleFrames++

    if(slot.lostFrames > MAX_LOST_FRAMES) {
        clearSlot(slot)

        return
    }
}

export function matchDetectedHand(detected, usedSlots) {
    // step 1 - try handedness first
    let slotIndex = findSlotByHandedness(detected.handedness)
    if(slotIndex !== -1 && !usedSlots.has(slotIndex)) return slotIndex
    
    // step 2 - use distance 
    slotIndex = findClosestSlot(detected)
    if(slotIndex !== -1 && !usedSlots.has(slotIndex)) return slotIndex
    
    // step 3 - use empty slot
    slotIndex = findEmptySlot()
    if(slotIndex !== -1) return slotIndex

    // no available slot
    return -1
}

export function assignHands(detectedHands) {
    const matchedSlots = new Set();

    // no hands detected
    if(detectedHands.length === 0) {
        for(const slot of handSlots) {
            if(!slot.active) continue

            markSlotLost(slot)
        }

        return
    }

    // one or two hands detected
    for(const detected of detectedHands) {
        const slotIndex = matchDetectedHand(detected, matchedSlots)

        if(slotIndex === -1) continue

        const slot = handSlots[slotIndex]

        if(slot.active) {
            updateSlot(slotIndex, detected)
        }
        else {
            initializeSlot(slotIndex, detected)
        }

        matchedSlots.add(slotIndex)
    }

    for(let i = 0; i < handSlots.length; i++) {
        const slot = handSlots[i]

        if(!slot.active) continue
        if(!matchedSlots.has(i)) markSlotLost(slot)
    }
}


// Hand Functions

export function analyzeHand(slot) {
    if(!slot.landmarks || !slot.visible) return


    slot.fingers = analyzeFingers(slot.landmarks)
    slot.palm = analyzePalm(slot.landmarks)
}

export function getVisibleHands() {
    let left = null
    let right = null


    for(const slot of handSlots) {
        if(!slot.active || !slot.visible || !slot.landmarks) continue

        if(slot.handedness === "Left") left = slot
        else if(slot.handedness === "Right") right = slot
    }

    return {left, right}
}

export function getHandSlots() {
    return handSlots
}