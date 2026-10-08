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
        element: "Fire",
        signs: [
            "Snake",
            "Ram",
            "Monkey",
            "Boar",
            "Horse",
            "Tiger"
        ], 
        maxDuration: 10000
    }
]