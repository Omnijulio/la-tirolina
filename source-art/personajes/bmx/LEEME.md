# BMX · La Trolina Fighters

«BMX» es el nombre provisional del luchador. Extrae el ZIP y abre `visor.html` para reproducir la entrada y el ultimate en los dos escenarios.

| Archivo | Contenido |
|---|---|
| `fighter.png` y `fighter.json` | Atlas de combate de 1152 × 2816 px y 30 secuencias configuradas. Las secuencias usan poses clave que se reutilizan entre cuadros. |
| `portraits/` | Retratos transparentes para el selector y el HUD. |
| `tiras/` | Tiras de combate, entrada en BMX y acciones del ultimate. |
| `objetos/` | BMX independiente, andamios exterior e interior, sus fases de montaje, ladrillo y puro. |
| `efectos/` | Humo y destello de curación, separados para poder animar su posición y opacidad. |
| `extension.json` | Anclajes, plataformas, tiempos de animación y eventos de la entrada y el ultimate. |

## Entrada y combate

El luchador mira a la derecha. El atlas de combate usa celdas de **192 × 176 px** y ancla **(56,160)**. El atlas puede cargarse con la misma estructura de secuencias usada por Rizos. El personaje usa el botellín común del juego en el ataque ordinario `throwBottle`. Los rangos de impacto y tiempos son valores iniciales para probar en el motor.

La entrada usa celdas de **256 × 224 px** y ancla **(108,208)**. Desplaza el conjunto de personaje y bicicleta durante `bmx-rodar`, reproduce `bmx-frenar` y después `bmx-bajar`. El último cuadro contiene `return-to-base` con el punto desde el que enlazar a `idle`. Puedes dibujar el sprite de la BMX aparcada después de ese enlace. Las poses de entrada ya incluyen la bicicleta.

Para mirar a la izquierda, refleja cada celda sobre su ancla y refleja también los puntos de mano y boca. Mantén el filtrado de vecino más próximo al escalar. Las dimensiones, eventos y posiciones de cada cuadro están en los JSON.

## Ultimate del andamio

1. El escenario elige `andamio-exterior` para la fachada y `andamio-interior` para el bar. Planta el sprite por su anclaje inferior. `platforms` indica los apoyos disponibles en coordenadas de imagen. El ultimate usa el segundo piso fuera y el piso único dentro.
2. Reproduce `montar-andamio`. Cada evento `scaffold-build` cambia el PNG de montaje. Usa la misma posición y escala en los tres pasos. Lleva al actor a la plataforma con la pose `trepar`.
3. Reproduce `lanzar-ladrillo`. El evento `spawn-projectile` del cuadro de suelta inicia el proyectil independiente en la mano. El ladrillo ya aparece en las poses de preparación. La trayectoria de demostración es un arco animado de videojuego.
4. Reproduce `fumar-puro`. La calada emite `humo` desde la boca y un único evento `heal` por activación. El valor inicial propuesto es **12 % de la vida máxima**, con límite en la vida máxima. El motor decide qué cantidad aplicar y puede dibujar `curacion` como confirmación.
5. Baja al personaje y vuelve a `idle`. El andamio y el personaje son imágenes separadas, lo que permite cambiar el orden de dibujo y colocar la estructura junto a la pared del escenario.

El visor muestra la secuencia y el momento de curación. La integración en la partida, el daño, los controles, las colisiones y el balance se configuran en el motor del juego.
