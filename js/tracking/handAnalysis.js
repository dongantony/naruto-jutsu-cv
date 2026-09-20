import {
    distance3D,
    subtract, 
    add,
    multiply,
    normalize,
    cross,
    jointAngle
} from "../geometry/vectors.js"


// A finger is considered extended when its joints are straight.
const FINGER_EXTENDED_ANGLE = 155

// Used to prevent a curled finger from being classified as extended. 
const FINGER_EXTENSION_RATIO = 1.05

// Thumb uses slightly differently geometry. 
const THUMB_EXTENDED_ANGLE = 145


// Finger Recognition - numbers for MediaPipe landmarks
//
// Wrist: 0
// Thumb: 1 CMC, 2 MCP, 3 IP, 4 TIP
// Index: 5 MCP, 6 PIP, 7 DIP, 8 TIP
// Middle: 9 MCP, 10 PIP, 11 DIP, 12 TIP
// Ring: 13 MCP, 14 PIP, 15 DIP, 16 TIP
// Pinky: 17 MCP, 18 PIP, 19 DIP, 20 TIP

export function analyzeFinger(landmarks, mcpIndex, pipIndex, dipIndex, tipIndex) {
    const mcp = landmarks[mcpIndex]
    const pip = landmarks[pipIndex]
    const dip = landmarks[dipIndex]
    const tip = landmarks[tipIndex]
    const wrist = landmarks[0]

    const pipAngle = jointAngle(mcp, pip, dip)
    const dipAngle = jointAngle(pip, dip, tip)
    const wristToTip = distance3D(wrist, tip)
    const wristToPip = distance3D(wrist, pip)

    const isStraight = pipAngle >= FINGER_EXTENDED_ANGLE && dipAngle >= FINGER_EXTENDED_ANGLE
    const isLongEnough = wristToTip > wristToPip * FINGER_EXTENSION_RATIO

    let state = 'folded'

    if(isStraight && isLongEnough) {
        state = 'extended'
    }
    else if(pipAngle > 120 || dipAngle > 120) {
        state = 'bent'
    }

    return {
        state: state,
        extended: state === 'extended',
        pipAngle: pipAngle,
        dipAngle: dipAngle,
        wristToTip: wristToTip,
        wristToPip: wristToPip
    }
}

export function analyzeThumb(landmarks) {
    const wrist = landmarks[0]
    const mcp = landmarks[2]
    const ip = landmarks[3]
    const tip = landmarks[4]

    const ipAngle = jointAngle(mcp, ip, tip)
    const wristToTip = distance3D(wrist, tip)
    const wristToMcp = distance3D(wrist, mcp)

    const isStraight = ipAngle >= THUMB_EXTENDED_ANGLE
    const isLongEnough = wristToTip > wristToMcp * 1.15

    let state = 'folded'

    if(isStraight && isLongEnough) {
        state = 'extended'
    }
    else if(ipAngle > 110) {
        state = 'bent'
    }

    return {
        state: state,
        extended: state === 'extended',
        ipAngle: ipAngle,
        wristToTip: wristToTip,
        wristToMcp: wristToMcp
    }
}

export function analyzeFingers(landmarks) {
    const thumb = analyzeThumb(landmarks)
    const index = analyzeFinger(landmarks, 5, 6, 7, 8)
    const middle = analyzeFinger(landmarks, 9, 10, 11, 12)
    const ring = analyzeFinger(landmarks, 13, 14, 15, 16)
    const pinky = analyzeFinger(landmarks, 17, 18, 19, 20)

    return {
        thumb,
        index,
        middle,
        ring,
        pinky
    }
}

// Palm Recognition - Use the wrist and the MCP joints to estimate the palm.
//
//               middle MCP
//                    9
//                   /
//                  /
//         5 ------/------ 17
//          \              /
//           \            /
//                 0
//
// Returns: normal vector calculated from the palm plane

export function analyzePalm(landmarks) {
    const wrist = landmarks[0]
    const indexMCP = landmarks[5]
    const middleMCP = landmarks[9]
    const pinkyMCP = landmarks[17]

    // Approximate palm center.
    let center = {
        x: 0,
        y: 0,
        z: 0
    }

    const palmPoints = [
        wrist,
        indexMCP,
        middleMCP,
        landmarks[13],
        pinkyMCP
    ]

    for(const point of palmPoints) {
        center = add(center, point)
    }

    center = multiply(center, 1 / palmPoints.length)

    // Create two vectors across the palm.
    const wristToIndex = subtract(indexMCP, wrist)
    const wristToPinky = subtract(pinkyMCP, wrist)

    // Palm normal.
    let normal = cross(wristToIndex, wristToPinky)
    normal = normalize(normal)

    // Direction from wrist toward middle finger.
    const palmDirection = normalize(subtract(middleMCP, wrist))

    // Approximate palm width.
    const palmWidth = distance3D(indexMCP, pinkyMCP)

    // Approximate palm length.
    const palmLength = distance3D(wrist, middleMCP)

    // 2D palm rotation.
    const rotation = Math.atan2(middleMCP.y - wrist.y, middleMCP.x - wrist.x) * 180 / Math.PI

    return {
        center: center,
        normal: normal,
        direction: palmDirection,
        width: palmWidth,
        length: palmLength,
        rotation: rotation
    }
}