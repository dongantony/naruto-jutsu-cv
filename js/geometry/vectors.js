// Basic Vector Functions

export function distance(a, b) {
    if(!a || !b) return Infinity

    const dx = a.x - b.x
    const dy = a.y - b.y

    return Math.sqrt(dx * dx + dy * dy)
}

export function distance3D(a, b) {
    if(!a || !b) return Infinity

    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = (a.z || 0) - (b.z || 0)
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: (a.z || 0) + (b.z || 0) 
    }
}

export function subtract(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: (a.z || 0) - (b.z || 0)
    }
}

export function multiply(v, scalar) {
    return {
        x: v.x * scalar,
        y: v.y * scalar,
        z: v.z * scalar
    }
}

export function magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

export function normalize(v) {
    const length = magnitude(v)

    if(length === 0) {
        return {
            x: 0,
            y: 0,
            z: 0
        }
    }

    return {
        x: v.x / length,
        y: v.y / length,
        z: v.z / length
    }
}

export function dot(a, b) {
    return (a.x * b.x + a.y * b.y + a.z * b.z)
}

export function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z, 
        z: a.x * b.y - a.y * b.x
    }
}

export function angleBetween(a, b) {
    const magA = magnitude(a)
    const magB = magnitude(b)

    if(magA === 0 || magB === 0) return 0

    let cosine = dot(a, b) / (magA * magB)

    cosine = Math.max(-1, Math.min(1, cosine))

    return Math.acos(cosine) * 180 / Math.PI
}

// Angle formed by three landmarks. 
// 
//    A 
//     \ 
//       B 
//        \ 
//          C 
// 
// Returns: angle at B

export function jointAngle(a, b, c) {
    const ba = subtract(a, b) 
    const bc = subtract(c, b) 
    
    return angleBetween(ba, bc)
}