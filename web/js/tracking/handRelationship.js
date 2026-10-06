import {
    distance3D,
    subtract,
    normalize,
    dot
} from "../geometry/vectors.js"


// Normalization of coordinates (range: 0 - 1)
const TOUCH_DISTANCE = 0.075

// Palms closer than this are considered to be interacting.
const PALM_INTERACTION_DISTANCE = 0.30


export function getHandRelationship(left, right) {
    if(!left || !right || !left.visible || !right.visible || !left.landmarks || !right.landmarks || !left.palm || !right.palm) {
        return { available: false }
    }

    const leftWrist = left.landmarks[0]
    const rightWrist = right.landmarks[0]

    const leftPalmCenter = left.palm.center
    const rightPalmCenter = right.palm.center

    const wristDistance = distance3D(leftWrist, rightWrist)
    const palmDistance = distance3D(leftPalmCenter, rightPalmCenter)

    const normalDot = dot(left.palm.normal, right.palm.normal)
    const clampedDot = Math.max(-1, Math.min(1, normalDot))

    const palmAngle = Math.acos(clampedDot) * 180 / Math.PI

    const palmPoints = [0, 5, 9, 13, 17]

    let closestDistance = Infinity
    let closestPair = null

    for(const leftIndex of palmPoints) {
        for(const rightIndex of palmPoints) {
            const d = distance3D(
                left.landmarks[leftIndex], 
                right.landmarks[rightIndex]
            )

            if(d < closestDistance) {
                closestDistance = d

                closestPair = {
                    left: leftIndex,
                    right: rightIndex
                }
            }
        }
    }

    const handsTouching = closestDistance <= TOUCH_DISTANCE
    const interacting = palmDistance <= PALM_INTERACTION_DISTANCE

    const leftToRight = normalize(subtract(rightWrist, leftWrist))

    return {
        available: true,
        wristDistance,
        palmDistance,
        closestDistance,
        closestPair,
        touching: handsTouching,
        interacting,
        palmAngle,
        leftToRight
    }
}