/* Generado por tools/integrate_character.py: personajes con arte propio. */
window.TROLINA_CHARACTER_ART = {
  "bmx": {
    "mouth": {
      "x": 95,
      "y": 44
    },
    "name": "BMX",
    "source": "source-art/personajes/bmx",
    "rows": 16,
    "missingRows": [],
    "portrait": "assets/characters/bmx-retrato.png",
    "sockets": [
      {
        "x": 102,
        "y": 66,
        "rotation": -0.15
      },
      {
        "x": 124,
        "y": 69,
        "rotation": -0.8
      },
      {
        "x": 124,
        "y": 69,
        "rotation": -1.1
      },
      {
        "x": 154,
        "y": 68,
        "rotation": 0.2
      }
    ],
    "loweredAirborne": {
      "hit:4": 18,
      "hit:5": 14,
      "grabbed:1": 19,
      "grabbed:2": 14,
      "grabbed:3": 18,
      "air:0": 23,
      "air:1": 20,
      "air:2": 15,
      "air:3": 15,
      "jump:1": 20,
      "jump:2": 20,
      "jump:3": 20
    },
    "extras": {
      "image": "assets/characters/bmx-extras.png",
      "cell": [
        256,
        224
      ],
      "anims": {
        "bmx-rodar": {
          "loop": true,
          "ref": [
            34,
            208
          ],
          "frames": [
            [
              0,
              0,
              125
            ],
            [
              256,
              0,
              125
            ]
          ]
        },
        "bmx-frenar": {
          "loop": false,
          "ref": [
            34,
            208
          ],
          "frames": [
            [
              0,
              224,
              185
            ],
            [
              256,
              224,
              240
            ]
          ]
        },
        "bmx-bajar": {
          "loop": false,
          "ref": [
            34,
            208
          ],
          "frames": [
            [
              0,
              448,
              230
            ],
            [
              256,
              448,
              250
            ]
          ]
        },
        "montar-andamio": {
          "loop": false,
          "ref": [
            56,
            208
          ],
          "frames": [
            [
              0,
              672,
              245
            ],
            [
              256,
              672,
              245
            ],
            [
              512,
              672,
              265
            ]
          ],
          "build": [
            1,
            2,
            3
          ]
        },
        "trepar": {
          "loop": true,
          "ref": [
            56,
            208
          ],
          "frames": [
            [
              0,
              896,
              170
            ],
            [
              256,
              896,
              170
            ]
          ]
        },
        "lanzar-ladrillo": {
          "loop": false,
          "ref": [
            56,
            208
          ],
          "frames": [
            [
              0,
              1120,
              175
            ],
            [
              256,
              1120,
              180
            ],
            [
              512,
              1120,
              105
            ],
            [
              768,
              1120,
              200
            ]
          ],
          "release": {
            "frame": 2,
            "at": [
              167,
              117
            ]
          }
        },
        "fumar-puro": {
          "loop": false,
          "ref": [
            56,
            208
          ],
          "frames": [
            [
              0,
              1344,
              230
            ],
            [
              256,
              1344,
              410
            ],
            [
              512,
              1344,
              525
            ],
            [
              768,
              1344,
              240
            ]
          ],
          "emit": {
            "frame": 2,
            "at": [
              114,
              93
            ]
          },
          "heal": {
            "frame": 2,
            "fraction": 0.12
          }
        }
      },
      "entrance": {
        "sequence": [
          "bmx-rodar",
          "bmx-frenar",
          "bmx-bajar"
        ],
        "rideMs": 1050
      },
      "scooter": {
        "image": "assets/characters/bmx-bici.png",
        "cell": [
          162,
          113
        ],
        "anchor": [
          81,
          112
        ],
        "scale": 0.841,
        "at": [
          129.9,
          208
        ]
      },
      "ultimate": {
        "kind": "andamio",
        "sequence": [
          "montar-andamio",
          "trepar",
          "lanzar-ladrillo",
          "fumar-puro"
        ]
      },
      "scaffold": {
        "exterior": {
          "image": "assets/characters/bmx-andamio-exterior.png",
          "cell": [
            195,
            183
          ],
          "anchor": [
            97,
            182
          ],
          "frames": 4,
          "level": 2,
          "at": -8,
          "rise": 152,
          "deck": [
            -96,
            98
          ]
        },
        "interior": {
          "image": "assets/characters/bmx-andamio-interior.png",
          "cell": [
            153,
            95
          ],
          "anchor": [
            76,
            94
          ],
          "frames": 4,
          "level": 1,
          "at": 9,
          "rise": 62,
          "deck": [
            -71,
            72
          ]
        }
      },
      "fx": {
        "ladrillo": {
          "image": "assets/characters/bmx-ladrillo.png",
          "size": [
            32,
            26
          ],
          "anchor": [
            16,
            13
          ]
        },
        "humo": {
          "image": "assets/characters/bmx-humo.png",
          "size": [
            32,
            47
          ],
          "anchor": [
            16,
            46
          ]
        },
        "curacion": {
          "image": "assets/characters/bmx-curacion.png",
          "size": [
            46,
            44
          ],
          "anchor": [
            23,
            43
          ]
        }
      }
    }
  },
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
  },
  "sombrero": {
    "name": "Sombrero",
    "source": "source-art/personajes/sombrero",
    "rows": 16,
    "missingRows": [],
    "portrait": "assets/characters/sombrero-retrato.png",
    "sockets": [
      {
        "x": 120,
        "y": 75,
        "rotation": 0.08
      },
      {
        "x": 51,
        "y": 99,
        "rotation": -0.45
      },
      {
        "x": 61,
        "y": 37,
        "rotation": -0.8
      },
      {
        "x": 139,
        "y": 50,
        "rotation": 0.75
      }
    ],
    "loweredAirborne": {
      "hit:4": 22,
      "hit:5": 9,
      "grabbed:1": 15,
      "grabbed:2": 9,
      "grabbed:3": 9,
      "air:0": 9,
      "air:1": 9,
      "air:2": 46,
      "air:3": 26,
      "jump:1": 9,
      "jump:2": 46,
      "jump:3": 3
    },
    "extras": {
      "image": "assets/characters/sombrero-extras.png",
      "cell": [
        192,
        176
      ],
      "anchor": [
        56,
        160
      ],
      "anims": {
        "ultimate-arma": {
          "loop": false,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              0,
              0,
              155
            ],
            [
              192,
              0,
              195
            ],
            [
              384,
              0,
              155
            ],
            [
              576,
              0,
              130
            ],
            [
              768,
              0,
              220
            ],
            [
              960,
              0,
              120
            ],
            [
              1152,
              0,
              65
            ],
            [
              1344,
              0,
              45
            ],
            [
              1536,
              0,
              105
            ],
            [
              1728,
              0,
              90
            ],
            [
              1920,
              0,
              110
            ]
          ],
          "puff": {
            "frame": 4,
            "at": [
              112,
              53
            ],
            "box": [
              113,
              34,
              103,
              53
            ]
          },
          "impact": {
            "frame": 8,
            "box": [
              137,
              60,
              45,
              16
            ]
          }
        },
        "ultimate-mano": {
          "loop": false,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              0,
              176,
              155
            ],
            [
              192,
              176,
              195
            ],
            [
              384,
              176,
              155
            ],
            [
              576,
              176,
              130
            ],
            [
              768,
              176,
              220
            ],
            [
              960,
              176,
              120
            ],
            [
              1152,
              176,
              65
            ],
            [
              1344,
              176,
              45
            ],
            [
              1536,
              176,
              105
            ],
            [
              1728,
              176,
              90
            ],
            [
              1920,
              176,
              110
            ]
          ],
          "puff": {
            "frame": 4,
            "at": [
              112,
              53
            ],
            "box": [
              113,
              34,
              103,
              53
            ]
          },
          "impact": {
            "frame": 8,
            "box": [
              137,
              60,
              45,
              16
            ]
          }
        },
        "recoger": {
          "loop": false,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              0,
              352,
              120
            ],
            [
              192,
              352,
              145
            ],
            [
              384,
              528,
              175
            ]
          ],
          "pickup": 2,
          "hand": [
            [
              139,
              125
            ],
            [
              124,
              155
            ],
            [
              76,
              97
            ]
          ]
        },
        "entrada-pedal-arma": {
          "loop": true,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              0,
              704,
              114
            ],
            [
              192,
              704,
              114
            ],
            [
              384,
              704,
              114
            ]
          ]
        },
        "entrada-freno-arma": {
          "loop": false,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              576,
              704,
              215
            ]
          ]
        },
        "entrada-bajar-arma": {
          "loop": false,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              768,
              704,
              220
            ],
            [
              960,
              704,
              260
            ]
          ]
        },
        "entrada-pedal-mano": {
          "loop": true,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              0,
              880,
              114
            ],
            [
              192,
              880,
              114
            ],
            [
              384,
              880,
              114
            ]
          ]
        },
        "entrada-freno-mano": {
          "loop": false,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              576,
              880,
              215
            ]
          ]
        },
        "entrada-bajar-mano": {
          "loop": false,
          "ref": [
            56,
            160
          ],
          "frames": [
            [
              768,
              880,
              220
            ],
            [
              960,
              880,
              260
            ]
          ]
        }
      },
      "entrance": {
        "sequence": [
          "entrada-pedal-arma",
          "entrada-freno-arma",
          "entrada-bajar-arma"
        ],
        "unarmed": [
          "entrada-pedal-mano",
          "entrada-freno-mano",
          "entrada-bajar-mano"
        ],
        "rideMs": 1200
      },
      "ultimate": {
        "sequence": [
          "ultimate-arma"
        ],
        "unarmed": [
          "ultimate-mano"
        ]
      },
      "scooter": {
        "image": "assets/characters/sombrero-bici.png",
        "cell": [
          149,
          78
        ],
        "anchor": [
          0,
          78
        ],
        "scale": 1,
        "at": [
          36,
          161
        ]
      }
    },
    "weapon": {
      "id": "baston",
      "unarmed": "assets/characters/sombrero-sin-arma.png",
      "missingRowsUnarmed": [],
      "grip": {
        "0,0": [
          87,
          71,
          -0.558
        ],
        "1,0": [
          86,
          69,
          -0.524
        ],
        "2,0": [
          82,
          65,
          -0.489
        ],
        "3,0": [
          92,
          67,
          -0.454
        ],
        "4,0": [
          86,
          76,
          -0.558
        ],
        "5,0": [
          84,
          71,
          -0.506
        ],
        "0,1": [
          90,
          94,
          -0.593
        ],
        "1,1": [
          80,
          75,
          -0.698
        ],
        "2,1": [
          62,
          54,
          2.513
        ],
        "3,1": [
          133,
          66,
          -1.501
        ],
        "4,1": [
          120,
          92,
          -0.785
        ],
        "5,1": [
          88,
          94,
          -0.558
        ],
        "0,2": [
          88,
          67,
          -0.593
        ],
        "1,2": [
          92,
          72,
          -0.593
        ],
        "2,2": [
          73,
          69,
          -0.489
        ],
        "3,2": [
          53,
          71,
          -0.506
        ],
        "4,2": [
          61,
          66,
          -0.489
        ],
        "5,2": [
          85,
          66,
          -0.506
        ],
        "0,3": [
          85,
          73,
          -0.768
        ],
        "1,3": [
          117,
          68,
          -0.663
        ],
        "2,3": [
          114,
          68,
          -0.698
        ],
        "3,3": [
          112,
          79,
          -0.366
        ],
        "4,3": [
          109,
          68,
          -0.628
        ],
        "5,3": [
          85,
          66,
          -0.593
        ],
        "0,4": [
          86,
          69,
          -0.524
        ],
        "1,4": [
          91,
          69,
          -0.768
        ],
        "2,4": [
          104,
          65,
          -1.03
        ],
        "3,4": [
          93,
          63,
          -0.96
        ],
        "4,4": [
          107,
          52,
          -1.117
        ],
        "5,4": [
          74,
          68,
          -0.943
        ],
        "0,5": [
          94,
          69,
          -0.733
        ],
        "1,5": [
          94,
          87,
          -0.785
        ],
        "2,5": [
          64,
          88,
          0.733
        ],
        "3,5": [
          91,
          111,
          -0.873
        ],
        "4,5": [
          85,
          86,
          0.646
        ],
        "5,5": [
          103,
          75,
          -0.925
        ],
        "0,6": [
          90,
          76,
          -0.768
        ],
        "1,6": [
          120,
          84,
          -0.506
        ],
        "2,6": [
          143,
          68,
          -0.541
        ],
        "3,6": [
          109,
          65,
          -0.733
        ],
        "4,6": [
          147,
          58,
          0.593
        ],
        "5,6": [
          91,
          76,
          -0.663
        ],
        "0,7": [
          94,
          87,
          -0.785
        ],
        "1,7": [
          77,
          82,
          0.558
        ],
        "2,7": [
          107,
          84,
          0.471
        ],
        "3,7": [
          103,
          75,
          -0.925
        ],
        "0,8": [
          91,
          95,
          -0.541
        ],
        "1,8": [
          90,
          79,
          -0.681
        ],
        "2,8": [
          91,
          86,
          -0.576
        ],
        "3,8": [
          89,
          75,
          -0.541
        ],
        "4,8": [
          82,
          77,
          -0.611
        ],
        "5,8": [
          88,
          72,
          -0.628
        ],
        "0,9": [
          86,
          72,
          -0.75
        ],
        "1,9": [
          84,
          74,
          -0.838
        ],
        "2,9": [
          93,
          108,
          -0.943
        ],
        "3,9": [
          47,
          77,
          1.222
        ],
        "4,9": [
          55,
          114,
          0.838
        ],
        "5,9": [
          86,
          69,
          -0.524
        ],
        "0,10": [
          103,
          66,
          -0.925
        ],
        "1,10": [
          94,
          95,
          -1.03
        ],
        "2,10": [
          86,
          154,
          -1.658
        ],
        "3,10": [
          50,
          151,
          -1.693
        ],
        "4,10": [
          117,
          111,
          -1.047
        ],
        "5,10": [
          82,
          65,
          -0.489
        ],
        "0,11": [
          94,
          105,
          -0.646
        ],
        "1,11": [
          86,
          72,
          -0.75
        ],
        "2,11": [
          93,
          108,
          -0.943
        ],
        "3,11": [
          86,
          72,
          -0.75
        ],
        "4,11": [
          55,
          114,
          0.838
        ],
        "5,11": [
          84,
          71,
          -0.506
        ],
        "0,12": [
          86,
          106,
          -0.698
        ],
        "1,12": [
          74,
          108,
          -0.611
        ],
        "2,12": [
          64,
          88,
          0.733
        ],
        "3,12": [
          87,
          74,
          -0.75
        ],
        "4,12": [
          74,
          111,
          -0.611
        ],
        "5,12": [
          76,
          114,
          0.785
        ],
        "0,13": [
          122,
          94,
          -0.768
        ],
        "1,13": [
          85,
          103,
          1.1
        ],
        "2,13": [
          100,
          84,
          -0.785
        ],
        "3,13": [
          62,
          72,
          -0.698
        ],
        "4,13": [
          66,
          69,
          -1.082
        ],
        "5,13": [
          68,
          70,
          -0.925
        ],
        "0,14": [
          94,
          71,
          -0.698
        ],
        "1,14": [
          89,
          72,
          -0.681
        ],
        "2,14": [
          93,
          72,
          -0.681
        ],
        "3,14": [
          89,
          73,
          -0.716
        ],
        "4,14": [
          88,
          73,
          -0.716
        ],
        "5,14": [
          91,
          73,
          -0.716
        ],
        "0,15": [
          64,
          63,
          1.222
        ],
        "1,15": [
          118,
          141,
          -1.606
        ],
        "2,15": [
          129,
          154,
          -1.641
        ],
        "3,15": [
          82,
          65,
          -0.489
        ],
        "4,15": [
          70,
          82,
          -0.663
        ],
        "5,15": [
          89,
          72,
          -0.663
        ],
        "4,7": [
          103,
          75,
          -0.925
        ],
        "5,7": [
          103,
          75,
          -0.925
        ]
      },
      "prop": {
        "image": "assets/characters/sombrero-baston.png",
        "grip": [
          5,
          28
        ]
      },
      "hud": "assets/characters/sombrero-ui-baston.png",
      "puff": {
        "image": "assets/characters/sombrero-soplo.png",
        "ms": 490,
        "travel": 37,
        "frames": [
          [
            0,
            0,
            38,
            41
          ],
          [
            120,
            0,
            94,
            65
          ],
          [
            240,
            0,
            112,
            65
          ]
        ]
      }
    },
    "animations": {
      "guardHit": [
        [
          3,
          4,
          50
        ],
        [
          4,
          4,
          100
        ],
        [
          2,
          4,
          75
        ]
      ],
      "parry": [
        [
          1,
          4,
          55
        ],
        [
          5,
          4,
          87
        ],
        [
          2,
          4,
          75
        ]
      ]
    }
  }
};
