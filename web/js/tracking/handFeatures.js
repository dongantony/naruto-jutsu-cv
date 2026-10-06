// ML Hand Feature Extraction

// [MUST MATCH]: collect_data.py
//
// Python:
// One Hand — 21 landmarks × 3 coordinates = 63 features
//
//  Left = 63
//  Right = 63 
//  Total = 126 features 
//
// Normalization:
//   1. Wrist becomes origin
//   2. Find maximum 3D distance from wrist
//   3. Divide every coordinate by that distance


// Landmark Count
const LANDMARK_COUNT = 21

// Features per Landmark or Coordinates (x, y, z)
const FEATURES_PER_LANDMARK = 3

// Feature Count per Hand — 21 × 3 
const HAND_FEATURE_COUNT = LANDMARK_COUNT * FEATURES_PER_LANDMARK

// Total Features
const TOTAL_FEATURE_COUNT = HAND_FEATURE_COUNT * 2


// Normalize One Hand

function normalizeHand(handLandmarks) {
    if(!handLandmarks || handLandmarks.length !== LANDMARK_COUNT) {
        return new Array(HAND_FEATURE_COUNT).fill(0)
    }

    // Step 1 - Move wrist to the origin

    const wrist = handLandmarks[0]
    const translated = []

    for(const point of handLandmarks) {
        translated.push({
            x: point.x - wrist.x,
            y: point.y - wrist.y,
            z: point.z - wrist.z
        })
    }

    // Step 2 - Find the maximum distance from the wrist

    let maxDistance = 0.0

    for(const point of translated) {
        const distance = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
        
        if(distance > maxDistance) {
            maxDistance = distance
        }
    }

    if(maxDistance === 0) {
        maxDistance = 1.0
    }

    // Step 3 - Scale every coordinate

    const normalized = []

    for(const point of translated) {
        normalized.push(
            point.x / maxDistance,
            point.y / maxDistance,
            point.z / maxDistance
        )
    }

    return normalized
}


// Empty Hand

function emptyHandFeatures() {
    return new Array(HAND_FEATURE_COUNT).fill(0)
}


// Extract Left/Right Features

export function extractHandFeatures(detectedHands) {
    let leftFeatures = emptyHandFeatures()
    let rightFeatures = emptyHandFeatures()

    for(const hand of detectedHands) {
        
        if(!hand || !hand.landmarks) continue

        const features = normalizeHand(hand.landmarks)

        if(hand.handedness === "Left") {
            leftFeatures = features
        }
        else if(hand.handedness === "Right") {
            rightFeatures = features
        }
    }

    const features = [
        ...leftFeatures,
        ...rightFeatures
    ]

    // Safety Check

    if(features.length !== TOTAL_FEATURE_COUNT) {
        console.error("Invalid feature count:", features.length)
    }

    return features
}