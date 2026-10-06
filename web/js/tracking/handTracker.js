import {
    assignHands
} from "./handSlots.js"


// MediaPipe Result Processing

export function processHandResults(results) {
    const detectedHands = []

    if(!results || !results.landmarks || results.landmarks.length === 0) {
        assignHands([])

        return detectedHands
    }

    for(let i = 0; i < results.landmarks.length; i++) {

        const landmarks = results.landmarks[i]
        let handedness = null

        if(results.handedness && results.handedness[i] && results.handedness[i].length > 0) {
            handedness = results.handedness[i][0].categoryName
        }

        detectedHands.push({
            landmarks: landmarks,
            handedness: handedness
        })
    }

    assignHands(detectedHands)

    return detectedHands
} 