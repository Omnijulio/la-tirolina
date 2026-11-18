/* Generado por tools/integrate_character.py: personajes con arte propio. */
window.TROLINA_CHARACTER_ART = {
  "rizos": {
    "mouth": {
      "x": 95,
      "y": 41
    },
    "name": "Rizos",
    "source": "source-art/personajes/rizos",
    "rows": 16,
    "missingRows": [],
    "portrait": "assets/characters/rizos-retrato.png",
    "sockets": [
      {
        "x": 83,
        "y": 63,
        "rotation": -0.15
      },
      {
        "x": 41,
        "y": 54,
        "rotation": -0.8
      },
      {
        "x": 51,
        "y": 32,
        "rotation": -1.1
      },
      {
        "x": 149,
        "y": 48,
        "rotation": 0.2
      }
    ],
    "loweredAirborne": {
      "hit:4": 20,
      "hit:5": 27,
      "grabbed:1": 15,
      "grabbed:2": 19,
      "grabbed:3": 7,
      "air:0": 21,
      "air:1": 27,
      "air:2": 45,
      "air:3": 25,
      "jump:1": 10,
      "jump:2": 42,
      "jump:3": 13
    },
    "extras": {
      "image": "assets/characters/rizos-extras.png",
      "cell": [
        256,
        224
      ],
      "anchor": [
        72,
        208
      ],
      "anims": {
        "ultimate-sit": {
          "loop": false,
          "ref": [
            118,
            208
          ],
          "frames": [
            [
              0,
              0,
              120
            ],
            [
              256,
              0,
              120
            ],
            [
              512,
              0,
              140
            ],
            [
              768,
              0,
              180
            ],
            [
              1024,
              0,
              160
            ],
            [
              1280,
              0,
              180
            ]
          ]
        },
        "ultimate-smoke": {
          "loop": true,
          "ref": [
            118,
            208
          ],
          "frames": [
            [
              0,
              224,
              300
            ],
            [
              256,
              224,
              400
            ],
            [
              512,
              224,
              300
            ],
            [
              768,
              224,
              300
            ],
            [
              1024,
              224,
              400
            ],
            [
              1280,
              224,
              300
            ]
          ],
          "mouth": [
            [
              109,
              80
            ],
            [
              109,
              80
            ],
            [
              109,
              80
            ],
            [
              110,
              80
            ],
            [
              110,
              80
            ],
            [
              110,
              80
            ]
          ],
          "emit": 3
        },
        "ultimate-rise": {
          "loop": false,
          "ref": [
            118,
            208
          ],
          "frames": [
            [
              0,
              448,
              100
            ],
            [
              256,
              448,
              120
            ],
            [
              512,
              448,
              120
            ],
            [
              768,
              448,
              150
            ],
            [
              1024,
              448,
              120
            ],
            [
              1280,
              448,
              150
            ]
          ]
        },
        "scooter-ride": {
          "loop": true,
          "ref": [
            98,
            208
          ],
          "frames": [
            [
              0,
              672,
              120
            ],
            [
              256,
              672,
              120
            ],
            [
              512,
              672,
              120
            ],
            [
              768,
              672,
              120
            ],
            [
              1024,
              672,
              120
            ],
            [
              1280,
              672,
              120
            ]
          ]
        },
        "scooter-brake": {
          "loop": false,
          "ref": [
            98,
            208
          ],
          "frames": [
            [
              0,
              896,
              100
            ],
            [
              256,
              896,
              100
            ],
            [
              512,
              896,
              100
            ],
            [
              768,
              896,
              100
            ],
            [
              1024,
              896,
              100
            ],
            [
              1280,
              896,
              100
            ]
          ]
        },
        "scooter-dismount": {
          "loop": false,
          "ref": [
            98,
            208
          ],
          "frames": [
            [
              0,
              1120,
              120
            ],
            [
              256,
              1120,
              120
            ],
            [
              512,
              1120,
              120
            ],
            [
              768,
              1120,
              120
            ]
          ]
        }
      },
      "smoke": {
        "image": "assets/characters/rizos-humo.png",
        "cell": [
          96,
          128
        ],
        "anchor": [
          17,
          87
        ],
        "frames": 6,
        "ms": 90,
        "opacity": 0.75
      },
      "scooter": {
        "image": "assets/characters/rizos-patinete.png",
        "cell": [
          192,
          176
        ],
        "anchor": [
          96,
          160
        ],
        "scale": 0.775,
        "at": [
          121.1,
          208
        ]
      },
      "entrance": {
        "sequence": [
          "scooter-ride",
          "scooter-brake",
          "scooter-dismount"
        ],
        "rideMs": 1200
      },
      "ultimate": {
        "sequence": [
          "ultimate-sit",
          "ultimate-smoke",
          "ultimate-smoke",
          "ultimate-rise"
        ]
      }
    }
  }
};
