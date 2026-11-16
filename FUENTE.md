# La fuente y el ultimate «Al pilón» (v0.5)

## Qué hay ya

- **Fuente a la izquierda de la terraza** (`game/combat/fountain.js`). Cuatro estados: encendida/apagada × con luz/sin luz. Por defecto es aleatoria en cada pelea; se fija en **Opciones → Fuente / Luz de la fuente**. La pantalla VS indica el estado.
- **Ultimate de El Peñista — «Al pilón»** (`special.id = 'fuente'` en `game/data/characters.js`). Con la barra llena: congelado de pantalla, carga hacia el rival (hasta ~0,5 s), lo agarra, lo levanta por encima de la cabeza y lo lanza en parábola a la fuente. Chapuzón: **38 de daño base** × fuerza (no se puede bloquear), salpicadura, y el rival queda **mojado 12 s**: un 30 % más lento al moverse y un 15 % en sus animaciones, con brillo azulado y gotas (`TrolinaRules.WET`). Si la carga no llega, «¡SE LE ESCAPA!» y se pierde la barra. La CPU lo usa cuando está cerca.
- **Fuente encendida = ruido de agua**: los botellines (lanzar y romper) **no suman ruido** para la Policía Local (`TrolinaRules.FOUNTAIN.masksBottleNoise`). El resto de ruidos sí cuentan. Suena un rumor de agua mientras está encendida.

La fuente actual es **provisional**: se dibuja por código en pixel art (resolución nativa ×2,5) hasta que lleguen los assets definitivos.

## Assets que necesita la versión definitiva

Para sustituir el dibujo provisional sin tocar la lógica, el formato más sencillo es el mismo que el del escenario:

| Archivo | Contenido |
| --- | --- |
| `assets/fountain/back-off-dark.png`, `back-off-lit.png` | Fuente apagada (pilón trasero, agua quieta, columna) sin y con luz |
| `assets/fountain/back-on-dark-00..05.png`, `back-on-lit-00..05.png` | Encendida: 4–6 fotogramas en bucle de los chorros |
| `assets/fountain/front-dark.png`, `front-lit.png` | Murete delantero del pilón (se pinta encima del personaje que cae dentro) |

- PNG transparentes **alineados con el escenario** (lienzo 544×270, mismas coordenadas que `assets/stage/*.png`), o bien sprites sueltos indicando el punto de apoyo en el suelo.
- Indicar la **línea del agua** (y nativa) y el centro del pilón para el punto de caída.
- Si la fuente pasa a formar parte de nuevos fondos/escenarios nocturnos, cada escenario puede declarar su fuente (posición y estados) en su JSON.

Con eso, `Fountain.drawBack/drawFront` cargan las imágenes en lugar del dibujo procedural; el resto (agarre, daño, mojado, ruido) no cambia.
