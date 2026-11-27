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

## Interior del bar (v0.16)

Segundo escenario: el interior de La Trolina, una **panorámica ancha** que la cámara recorre siguiendo a los luchadores. A diferencia de la terraza, el fondo es una sola imagen (el suelo va pintado en ella): fondo y luchadores se mueven juntos con la cámara, sin paralaje.

| Archivo (`assets/stages/interior/`) | Contenido |
| --- | --- |
| `encendidas.png`, `apagadas.png` | Fondo de **1620 × 540 px** con el futbolín y los taburetes ya colocados. Con las luces apagadas, sin los reflejos de la bola |
| `barra-<luz>.png` | Los dos mostradores, recortados: se dibujan encima de quien está detrás de la barra |
| `muebles-<luz>.png` | Futbolín y taburetes, recortados: encima de los mostradores |
| `brillos-apagadas.png` | Reflejos de la bola de discoteca, lo que suman al fondo (se pintan con `lighter`) |
| `interior-data.js` | `TROLINA_INTERIOR_DATA`: posiciones, cámara, suelo, mostradores y bola |

Todo se genera con `python3 tools/integrate_interior.py <carpeta-del-paquete>` (sin carpeta, desde la copia de `source-art/escenarios/interior`). El paquete trae la panorámica a 2172 × 724 para un escenario de 810 × 270 unidades. La herramienta la reescala una vez, con buen filtro, a 2 px por unidad, la misma escala que la terraza en el canvas de 960 × 540. Así en el juego se pinta sin escalar.

### Coordenadas

- **Mundo**: el de siempre (canvas 960 × 540, apoyo y = 486). El borde izquierdo de la panorámica está en x = `worldX` = −330, así que su centro cae en 480, donde empiezan los asaltos (luchadores en 330 y 630, delante de la barra principal).
- **Cámara**: `Match.camera`, en unidades como en la terraza (pantalla = mundo − cámara × 2), de −165 a 165. Va al centro entre los dos luchadores y nunca deja a ninguno a menos de 70 px del borde.
- **Suelo de pelea**: de −260 a 1220 (70 px dentro de cada pared). Los luchadores **no pueden separarse más de 820 px**, lo mismo que en la terraza: el borde de la pantalla hace de pared (cuenta para la regla de esquina).
- **Línea de apoyo**: el paquete propone y = 247 unidades; el juego usa 243 (486 en el canvas) para no desplazar la imagen. Sigue dentro de la franja del suelo del paquete (232–260).

### Orden de dibujo

`InteriorScene.draw(ctx, { cameraX, t, drawBehind, drawActors })`:

1. Fondo (con los muebles).
2. Si hay alguien detrás de la barra (`drawBehind`): esa persona, recortada (se ve por encima de las encimeras y, por debajo, solo donde la tapan los mostradores), luego los mostradores y luego los muebles.
3. Con las luces apagadas, los reflejos de la bola girando y sus destellos.
4. Luchadores, botellines y efectos (`drawActors`, con la cámara aplicada).

Los muebles están más al fondo que la línea de apoyo: los luchadores siempre pasan por delante.

### Bola de discoteca

Con las luces apagadas, `tools/integrate_interior.py` busca los reflejos pintados en el fondo: manchas pequeñas, muy saturadas y más claras que lo que las rodea. Hay zonas excluidas porque tienen luces propias: pantallas, neveras, el mosaico, las botellas y las pegatinas de la barra.

- **Fondo**: los quita y rellena el hueco en gris.
- **Capa de brillos**: guarda lo que cada reflejo suma. Pintada con `lighter` en su sitio, sale la imagen original.
- **En el juego**: la capa se desplaza en bucle hacia la derecha por paredes y techo, y hacia la izquierda y más rápido por el suelo, como una bola que gira. Saltan destellos en los reflejos y en la propia bola.

### El Peñista, al fregadero

Dentro no hay fuente. Su ultimate lo tira por encima de la barra principal, siempre a un sitio que se vea y lejos de los extremos. Detrás de la barra se le dibuja al 85 % (está más lejos) con los pies bajo la encimera, así que se le ve de pecho para arriba. Luego salta de vuelta. Los números están en `BEHIND_BAR` (`game/combat/match.js`).
