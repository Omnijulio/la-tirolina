# Instrucciones para trabajar en este proyecto

## Contexto inicial

Lee `CONTEXTO_CODEX.md`, `PLAN.md`, `README.md` y `STAGE.md` antes de modificar el juego. Desde v0.2 es un juego de lucha 2D jugable (1 jugador contra la CPU) en HTML, CSS, JavaScript y Canvas, construido sobre el kit v1.3. `CONTEXTO_CODEX.md` distingue funciones existentes de funciones pendientes.

## Fuentes y construcción

- El juego está en `index.html` + `game/` (scripts clásicos sin empaquetador, cargados en orden). Reglas puras en `game/core/rules.js`; datos editables en `game/data/`.
- Edita el motor base en `src/`, datos canónicos en los JSON y el Fighter Lab en `templates/index.template.html`.
- Ejecuta `python3 tools/build_demo.py` después de modificar JSON, `src/` o la plantilla. Regenera los espejos `*-data.js` y `fighter-preview.html`. **No genera `index.html`**, que es el juego.
- `python3 tools/build_characters.py` regenera los atlas de `assets/characters/` a partir de `assets/fighter.png`.
- No uses `fetch` ni `getImageData` en el juego: debe seguir funcionando abriendo `index.html` directamente.
- `references/` contiene fotos de personas reales y está excluida de git para no publicarlas.
- La policía usa `src/police.js` y `assets/police/` sin modificar; la lógica de ruido/multas está en `game/core/rules.js` (`NOISE`, `POLICE`) y `game/combat/match.js`. Ver `POLICE.md`.
- `example.html` es el ejemplo modular editable. No depende de un empaquetador.
- Para reconstruir arte desde los originales proporcionados, usa `python3 tools/rebuild_assets.py`, no solo uno de sus pasos intermedios. Requiere `requirements-art.txt`.
- No se necesita generar de nuevo las imágenes con IA ni disponer de claves para ejecutar o reconstruir lo entregado.
- Los scripts resuelven rutas desde la carpeta del proyecto; conserva esa portabilidad.

## Contratos visuales y de juego

- Conserva la estética pixel art y la identidad/ropa del personaje salvo que la petición cambie esos requisitos.
- Sprites de 192x176, ancla del pie (56,160), atlas 6x4. No recentres cada pose por su caja visible.
- Conserva la transparencia de los PNG y el escalado sin suavizado.
- El botellín Estrella Galicia es un arma común; su lógica no debe depender de un nombre de personaje ni de una fila fija de atlas.
- Orden del escenario: pared, mesas/sillas, suelo frontal, personajes y proyectiles. Los personajes siempre quedan delante de las mesas.
- Las tres imágenes del escenario comparten coordenadas y miden 544x270; ventana lógica 480x270, margen horizontal 32, suelo y=243 nativos. En Canvas 960x540, apoyo y=486.
- `force:true` sirve para inspección de la demo; no debe ser el modo normal de lanzar en una partida.
- No introduzcas frameworks ni dependencias de ejecución para cambios que puedan resolverse con la estructura actual.

## Validación

Ejecuta `npm test` o las dos pruebas de `tests/` con Node. Repite comprobaciones adicionales según el alcance del cambio. Al modificar interfaz, representación o controles, valida en un navegador disponible; esa revisión no se pudo completar en el entorno original. Comprueba consola, carga de recursos, ambas orientaciones, controles y profundidad.

Mantén `CONTEXTO_CODEX.md` y `PLAN.md` actualizados cuando cambien contratos o alcance. No describas como implementadas mecánicas que siguen pendientes (ver «Límites actuales»). Para probar sin jugar a mano: `index.html?autoplay=1&fast=3`.
