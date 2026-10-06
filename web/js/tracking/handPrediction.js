// ML Hand Sign Prediction

const PREDICTION_URL = "http://127.0.0.1:5000/predict"


// Predict Hand Sign

export async function predictHandSign(features) {
    try {
        const response = await fetch(
            PREDICTION_URL, 
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    features: features
                })
            }
        )

        if(!response.ok) {
            throw new Error(`Prediction server returned ${response.status}`)
        }

        const result = await response.json()

        return result
    }
    catch(error) {
        console.error("Hand sign prediction failed:", error)
        return null
    }
}