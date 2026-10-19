// Jutsu Defintions

// id - Unique identifier for the jutsu.
// name - Display name for the jutsu.
// element - Chakra/Nature element associated with the jutsu.
// signs - Hand sign sequence required to activate the jutsu, in order.
// maxDuration - Maximum amount of time the jutsu can remain active, in milliseconds.


export const JUTSUS = [
    {
        id: "fireball-jutsu",
        name:  "Fire Style: Fireball Jutsu",
        type: "Fire",
        signs: [
            "Snake",
            "Ram",
            "Monkey",
            "Boar",
            "Horse",
            "Tiger"
        ], 
        maxDuration: 5000
    },
    {
        id: "reaper-death-seal",
        name: "Dead Demon Consuming Seal",
        type: "Sealing",
        signs: [
            "Snake",
            "Boar",
            "Ram",
            "Hare",
            "Dog",
            "Rat",
            "Bird",
            "Horse",
            "Snake"
        ],
        maxDuration: 10000
    },
    {
        id: "shadow-clone-jutsu",
        name: "Multi-Shadow Clone Jutsu",
        type: "Shadow Clone",
        signs: [
            "ShadowClone"
        ],
        maxDuration: 10000
    }
]