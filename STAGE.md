# La Trolina — escenario con tres planos

Escenario original de pixel art recreado a partir de las dos fotografías de la terraza. Se mantiene la fachada nocturna, las entradas de madera, el letrero iluminado, la farola, el mobiliario metálico y el pavimento mojado. Se adapta la perspectiva a un juego de lucha lateral.

| Plano, de atrás hacia delante | Archivo | Contenido |
| --- | --- | --- |
| 1. Fondo | `assets/stage/01-wall.png` | Pared, balcones, puertas, luces y pavimento de fondo detrás de las mesas |
| 2. Intermedio | `assets/stage/02-tables.png` | Mesas, sillas y jardinera, con transparencia real entre los objetos y en los huecos de las sillas |
| 3. Primer plano | `assets/stage/03-arena-floor.png` | Suelo libre de combate; los personajes y proyectiles se dibujan encima de este plano |

**Los personajes siempre quedan delante de las mesas.** No están incrustados en los PNG del escenario. El segundo actor de las vistas de ejemplo es otra instancia del luchador disponible; puedes sustituirlo por cualquier otro personaje.

## Tamaños y coordenadas

Los tres PNG tienen exactamente **544 × 270 px** y comparten origen y escala. La ventana de juego lógica mide **480 × 270 px**. Los 32 px adicionales a cada lado permiten mover la cámara sin mostrar bordes vacíos. Con cámara centrada se dibujan los PNG en `x=-32, y=0`, o se recorta el rectángulo `(32,0,480,270)`.

Para un Canvas de **960 × 540 px**, el módulo aplica escala 2. La línea de apoyo de los personajes está en `y=243` nativos, es decir, **y=486** en ese Canvas. La franja del suelo frontal comienza en y=210 nativos; la zona de combate prevista va de y=215 a y=258. Las mesas no ocupan esa zona. El suelo frontal se extrajo del mismo pavimento del fondo para que encaje al centrar la cámara.

No recortes cada PNG a su contenido visible: perderías la alineación entre capas. Las mesas son decorado detrás del combate; no se usan como obstáculos ni reciben daño.

## Integración con HTML básico

Carga estos scripts:

```html
<script src="assets/stage/stage-data.js"></script>
<script src="src/stage.js"></script>
```

Después carga las imágenes y crea el escenario:

```js
async function cargarEscenario() {
  const images = {};
  await Promise.all(TERRACE_STAGE_DATA.layers.map(layer => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images[layer.id] = img; resolve(); };
    img.onerror = reject;
    img.src = layer.image;
  })));
  return new TerraceStage(images, TERRACE_STAGE_DATA);
}
```

En cada dibujo, con Canvas de 960 × 540 y personajes en coordenadas de ese Canvas:

```js
escenario.draw(ctx, {
  cameraX: 0,
  view: 'all',
  drawActors: c => {
    // Esta función se ejecuta DESPUÉS de las mesas y del suelo frontal.
    for (const actor of personajes) actor.draw(c);
    botellines.draw(c, personajes);
  }
});
```

El módulo conserva el contexto Canvas y aplica el desplazamiento de cámara a los personajes y proyectiles dentro de `drawActors`. Las coordenadas físicas de estos objetos no cambian al mover la cámara. Para otras resoluciones, el segundo argumento del callback entrega `{scale,groundY}`; `groundY` se expresa en las coordenadas locales del área de juego.

## Cámara y revisión de capas

`cameraX` se expresa en píxeles nativos y se limita a **−24…24**. Los factores de movimiento son 0,18 para pared, 0,55 para mesas y 1 para suelo/personajes. Ese movimiento relativo produce paralaje.

`view` admite `all`, `wall`, `tables` o `arena`. En la vista aislada, el módulo utiliza un damero para mostrar la transparencia. `arena` muestra el suelo frontal y llama a `drawActors`. La demo `index.html` incluye selector de capa y control de cámara.

## Archivos de revisión

- `assets/stage/stage.json`: tamaños, capas, orden, factores de paralaje, línea de suelo y puntos de aparición.
- `assets/stage/stage-data.js`: los mismos datos en JavaScript, sin necesidad de `fetch`.
- `assets/stage/stage-composite.png`: escenario compuesto sin personajes.
- `assets/stage/stage-with-fighters.png`: muestra estática de dos actores delante de las mesas.
- `assets/stage/stage-layers-guide.png`: guía visual de los tres PNG.
- `fighter-animation.gif`: previsualización de los movimientos en el nuevo escenario.

Las imágenes de revisión son composiciones de las capas reales que se entregan. Las fotografías de referencia están en `references/` en la carpeta local (excluida de git para no publicarlas).

## Verificación

Ejecuta `node tests/stage.test.cjs` desde la carpeta del paquete. Comprueba orden de capas, personajes delante, aislamiento, línea de suelo, límites de cámara y cobertura horizontal. También se verificaron dimensiones, transparencia y composición sin huecos. La vista HTML no pudo comprobarse en el navegador de este entorno.


## Elementos policiales de v1.4

El coche y los agentes son elementos dinámicos del plano delantero. Orden recomendado: pared, mesas, suelo frontal, patrulla, luchadores/proyectiles, agentes. El mensaje policial se dibuja fuera del desplazamiento de cámara. Ningún elemento policial se incrusta en los tres PNG de fondo. Consulta `POLICE.md`.
