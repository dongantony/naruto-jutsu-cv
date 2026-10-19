let reaperActive = false
let reaperTimeout = null

export function initializeReaperSeal() {
    stopReaperSeal()
}

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