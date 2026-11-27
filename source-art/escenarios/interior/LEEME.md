# La Trolina Fighters · Interior del bar

Extrae el ZIP completo y abre `visor.html`. El visor permite alternar las luces, mostrar u ocultar el mobiliario y explorar la panorámica con la cámara de juego.

| Ruta | Contenido |
|---|---|
| `fondos/encendidas.png` | Panorámica aprobada, 2172 × 724 px. |
| `fondos/apagadas.png` | Mismo encuadre, con reflejos de la bola de disco y luz tenue en la barra. |
| `composiciones/` | Las dos panorámicas con el futbolín y los dos taburetes ya colocados, a resolución completa. |
| `sprites/` | Futbolín verde, taburete negro y taburete granate, en PNG con alfa. Cada uno tiene una variante para luces apagadas. |
| `planos/encendidas/` y `planos/apagadas/` | Siete recortes transparentes por iluminación. Incluyen los dos tramos de barra, el paso de personal, la sala trasera de dardos, el hueco de servicio, el rincón elevado y el entorno. |
| `planos/profundidad.png` | Máscara de clases de profundidad en escala de grises. |
| `planos/siluetas.json` | Coordenadas de los recortes por plano en el lienzo original. |
| `escenario.json` | Rutas, posiciones, dimensiones, cámara, orden de dibujo y anclajes. |
| `interior-stage.js` | Renderizador Canvas sin dependencias. |

## Uso en el juego

Las texturas conservan la resolución de 2172 × 724. El escenario usa 810 × 270 unidades lógicas y la ventana de juego recomendada mide 480 × 270. El eje Y crece hacia abajo. La cámara se desplaza entre x=0 y x=330 y la línea de combate está en y=247. Los sprites se colocan por el centro inferior y se ordenan según la posición de sus pies.

Para un fondo estático, carga cualquiera de los dos PNG de `fondos/`. Para colocar personajes detrás de la barra, usa los PNG de `planos/` con sus coordenadas `rect` de `escenario.json`. Dibuja primero los planos de la sala, luego los personajes que estén detrás de la barra, luego los dos mostradores y, por último, el mobiliario y los personajes de la sala principal. Los recortes de cada estado recomponen su fondo completo.

```js
const stage = await InteriorStage.load(window.LA_TROLINA_INTERIOR);
stage.draw(ctx, {
  lighting: 'apagadas',
  cameraX: stage.clampCamera(player.x - 240),
  drawActors: (world, { groundY }) => drawFighters(world, groundY),
});
```

La opción `drawBackActors` dibuja detrás de los mostradores. La opción `actors` acepta entradas con `y` y `draw(world, frame)` para intercalar personajes con los sprites según la altura de sus pies. El visor usa las posiciones iniciales del manifiesto y el renderizador desactiva el suavizado.

El mapa de profundidad identifica zonas que existen en la vista frontal. Los valores por plano están en `depthValue` del manifiesto. Sirve para ordenar y ocultar elementos con las siluetas visibles. La geometría oculta detrás del mobiliario y las colisiones quedan fuera del pack.
