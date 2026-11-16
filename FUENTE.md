# La fuente, los ambientes y «Al pilón»

## La fuente (arte definitivo, v0.7)

Del paquete `la-trolina-assets-clima-fuente` (integrado; el paquete original queda fuera de git):

| En el juego | Original | Uso |
| --- | --- | --- |
| `assets/fountain/back.png` | `fuente/base-trasera.png` | Pila trasera y agua, detrás de quien cae dentro |
| `assets/fountain/front.png` | `fuente/borde-delantero.png` | Borde delantero, encima de quien está dentro |
| `assets/fountain/jets.png` | `fuente/chorros-atlas.png` | Chorros: arranque (6), bucle (6), apagado (6) |
| `assets/fx/water-impact.png` | `efectos/impacto-agua-atlas.png` | Salpicadura al caer en la pila |
| `assets/fx/water-wet.png` | `efectos/mojado-atlas.png` | Agua que le cae al que está dentro / al salir |
| `assets/fx/water-drip.png` | `efectos/goteo-atlas.png` | Goteo mientras está mojado |
| `assets/fountain/fountain-data.js` | `assets.json` | Celdas, anclas, boquillas, zona de agua y tiempos |

- Colocación: ancla (128,176) en x=172, y=474 del canvas 960×540 (un poco detrás de la línea de apoyo 486, para que los luchadores pasen por delante) a escala 1,4.
- Encendida: los tres surtidores arrancan al empezar la pelea y siguen en bucle, desfasados. Apagada: agua quieta.
- Luz: con luz, brillo azul sobre el agua y el suelo; sin luz, la fuente se oscurece. De día se ve al natural.
- Orden de dibujo: pila trasera → chorros → (luchador dentro) → borde delantero → salpicadura y gotas.

## Ambientes (v0.7)

`game/data/stages.js`: **noche** (el escenario original), **día**, **lluvia**, **nieve** y **Navidad**, con las mismas tres capas de 544×270 (`assets/stages/<id>/`). Aleatorio en cada pelea o fijo en Opciones; se cargan bajo demanda antes de la pantalla VS. Lluvia y nieve añaden partículas animadas (`game/combat/weather.js`).

Extra: `assets/stages/extra-jardinera.png`, montón de botellines, vasos y tabaco sobre la jardinera central. Opción en Opciones; siempre visible en el Modo salvaje.

## Ultimate de El Peñista — «Al pilón»

Con la barra llena: carga hacia el rival, lo agarra, lo levanta y lo lanza a la fuente. **38 de daño base** × fuerza, imbloqueable, y queda **mojado 12 s** (30 % más lento, brillo azulado y goteo). Con la fuente encendida le sigue cayendo agua mientras está dentro.

Fuente encendida = ruido de agua: los botellines no suman ruido para la Policía Local (`TrolinaRules.FOUNTAIN.masksBottleNoise`).
