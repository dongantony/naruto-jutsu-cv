const video = document.getElementById("webcam")
const canvas = document.getElementById("output")
const status = document.getElementById("status")
const ctx = canvas.getContext("2d")

//
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    }
})

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
})

hands.onResults(onResults)


//
function onResults(results) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    if(results.multiHandLandmarks) {
        status.innerHTML = ""

        for(let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i]
            const handedness = results.multiHandedness[i].label

            status.innerText += handedness + " Hand "

            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 4
            })

            drawLandmarks(ctx, landmarks, {
                color: "#FF0000",
                lineWidth: 2,
                radius: 5
            })

            console.clear()
            console.log(handedness)
            console.table(
                landmarks.map((p, index) => ({
                    id: index,
                    x: p.x.toFixed(3),
                    y: p.y.toFixed(3),
                    z: p.z.toFixed(3)
                }))
            )
        }
    }
    else {
        status.innerText = "No hands detected."
    }
}


// 
const camera = new Camera(video, {
    onFrame: async() => {
        await hands.send({
            image: video
        })
    },
    width: 800,
    height: 600
})

camera.start()