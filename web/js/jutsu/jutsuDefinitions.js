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
        signs: ["ShadowClone"],
        maxDuration: 5000
    },
    {
        id: "body-replacement",
        name: "Substitution Jutsu",
        signs: ["Rat"],
        maxDuration: 5000
    },
    {
        id: "lightning-blade",
        name: "Lightning Release: Chidori",
        signs: [
            "Ox",
            "Hare",
            "Monkey"
        ],
        maxDuration: 10000
    },
    {
        id: "spiral-sphere",
        name: "Rasengan",
        signs: ["Rasengan"],
        maxDuration: 10000
    }
]