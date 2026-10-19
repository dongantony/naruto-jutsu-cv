import {
    JUTSUS
} from "./jutsuDefinitions.js"


// How long a prediction must remain stable before it is accepted as a hand sign.
const STABLE_SIGN_TIME = 250

// How long an incomplete sequence can remain active.
const DEFAULT_SEQUENCE_TIMEOUT = 25000


class JutsuDetector {

    constructor() {
        this.sequence = []
        this.currentPrediction = null
        this.predictionSince = null
        this.lastAcceptedSign = null
        this.lastAcceptedTime = 0
        this.sequenceStarted = null
        this.activeJutsu = null
        this.lastJutsu = null        
    }

    update(prediction) {
        const now = performance.now()

        if (this.activeJutsu) {
            if (now < this.activeJutsu.expiresAt) {
                return this.getState()
            }

            this.activeJutsu = null
        }

        if(!prediction) {
            this.currentPrediction = null
            this.predictionSince = null

            return this.getState()
        }

        if(prediction !== this.currentPrediction) {
            this.currentPrediction = prediction
            this.predictionSince = now

            return this.getState()
        }

        if(now - this.predictionSince < STABLE_SIGN_TIME) {
            return this.getState()
        }

        if(prediction === this.lastAcceptedSign) {
            return this.getState()
        }

        this.acceptSign(prediction, now)

        return this.getState()
    }

    acceptSign(sign, now) {
        this.lastAcceptedSign = sign
        this.lastAcceptedTime = now

        if(this.sequence.length == 0) {
            this.sequenceStarted = now
        }

        if(this.sequenceStarted !== null && now - this.sequenceStarted > DEFAULT_SEQUENCE_TIMEOUT) {
            this.resetSequence()
            this.sequenceStarted = now
        }

        this.sequence.push(sign)
        
        const jutsu = this.findMatchingJutsu()

        if (jutsu) {
            this.lastJutsu = {
                ...jutsu,
                timestamp: now
            }

            this.activeJutsu = {
                ...jutsu,
                activatedAt: now,
                expiresAt: now + jutsu.maxDuration
            }

            this.resetSequence()
            return
        }

        this.removeInvalidPrefix()
    }

    findMatchingJutsu() {
        for(const jutsu of JUTSUS) {
            if(this.sequence.length !== jutsu.signs.length) continue

            const matches = this.sequence.every((sign, index) => sign === jutsu.signs[index])

            if(matches) {
                return jutsu
            }
        }

        return null
    }

    removeInvalidPrefix() {
        while(this.sequence.length > 0) {
            const couldMatch = JUTSUS.some(jutsu => {
                
                if(this.sequence.length > jutsu.signs.length) {
                    return false
                }

                return this.sequence.every((sign, index) => sign === jutsu.signs[index])
            })

            if(couldMatch) return

            this.sequence.shift()
        }
    }

    resetSequence() {
        this.sequence = []
        this.sequenceStarted = null
    }

    reset() {
        this.sequence = []
        this.currentPrediction = null
        this.predictionSince = null
        this.lastAcceptedSign = null
        this.lastAcceptedTime = 0
        this.sequenceStarted = null
        this.activeJutsu = null
        this.lastJutsu = null
    }

    getState() {
        const now = performance.now()

        if (this.activeJutsu && now >= this.activeJutsu.expiresAt) {
            this.activeJutsu = null
        }

        return {
            sequence: [...this.sequence],
            currentPrediction: this.currentPrediction,
            lastJutsu: this.lastJutsu,
            activeJutsu: this.activeJutsu,
            remainingDuration: this.activeJutsu ? Math.max(0, this.activeJutsu.expiresAt - now) : 0,
            active: this.sequence.length > 0
        }
    }

    getSequence() {
        return [...this.sequence]
    }

    getLastJutsu() {
        return this.lastJutsu
    }
}


// Create one detector for the application
const jutsuDetector = new JutsuDetector()

export function processJutsuPrediction(prediction, confidence = 0) {
    return jutsuDetector.update(prediction, confidence)
}

export function getJutsuState() {
    return jutsuDetector.getState()
}

export function getJutsuSequence() {
    return jutsuDetector.getSequence()
}

export function getLastJutsu() {
    return jutsuDetector.getLastJutsu()
}

export function resetJutsu() {
    jutsuDetector.reset()
}