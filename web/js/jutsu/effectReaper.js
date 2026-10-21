// effectReaper.js

// Track active and timeout state
let reaperActive = false
let reaperTimeout = null


// Initialize the Reaper Seal overlay.

export function initializeReaperSeal() {
    stopReaperSeal()
}


// Trigger, Check, and Stop Reaper Seal 

export function triggerReaperSeal(duration = 10000) {
    if(reaperTimeout !== null) {
        clearTimeout(reaperTimeout)
    }

    reaperActive = true

    reaperTimeout = setTimeout(() => { stopReaperSeal() }, duration)
}

export function stopReaperSeal() {
    if(reaperTimeout !== null) {
        clearTimeout(reaperTimeout)
        reaperTimeout = null
    }

    reaperActive = false
}

export function isReaperSealActive() {
    return reaperActive
}