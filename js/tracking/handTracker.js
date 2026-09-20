import {
    assignHands
} from "./handSlots.js"


// MediaPipe Result Processing

export function processHandResults(results) {
    const detectedHands = []

    if(results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {

        for(let i = 0; i < results.multiHandLandmarks.length; i++) {

            const landmarks = results.multiHandLandmarks[i]
            const handedness = results.multiHandedness?.[i]?.label || null

            detectedHands.push({
                landmarks: landmarks,
                handedness: handedness
            })
        }
    }

    assignHands(detectedHands)

    return detectedHands
} 