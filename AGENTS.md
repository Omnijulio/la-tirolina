# Instrucciones para trabajar en este proyecto

## Contexto inicial

Lee `CONTEXTO_CODEX.md`, `PLAN.md`, `README.md` y `STAGE.md` antes de modificar el juego. Desde v0.2 es un juego de lucha 2D jugable (1 jugador contra la CPU) en HTML, CSS, JavaScript y Canvas, construido sobre el kit v1.3. `CONTEXTO_CODEX.md` distingue funciones existentes de funciones pendientes.

## Fuentes y construcción

- El juego está en `index.html` + `game/` (scripts clásicos sin empaquetador, cargados en orden). Reglas puras en `game/core/rules.js`; datos editables en `game/data/`.
- Combate (v0.12): diseño y números en `COMBATE.md`; tiempos, cajas y poses de los golpes en `game/data/moves.js` (no toques `assets/fighter.json` para retocar tiempos del juego); `tests/combat.test.cjs` comprueba que los números cumplen el diseño. Arte pendiente: `ASSETS_COMBATE.md`.
- Edita el motor base en `src/`, datos canónicos en los JSON y el Fighter Lab en `templates/index.template.html`.
- Ejecuta `python3 tools/build_demo.py` después de modificar JSON, `src/` o la plantilla. Regenera los espejos `*-data.js` y `fighter-preview.html`. **No genera `index.html`**, que es el juego.
- `python3 tools/build_characters.py` regenera los atlas de `assets/characters/` a partir de `assets/fighter.png`.
- El multijugador experimental (`game/net/`, ver `MULTIJUGADOR.md`) es la única dependencia externa: PeerJS incluido en `game/vendor/` y su servidor público de señalización. La pelea en red es lockstep: no metas en `Match.update` nada que dependa de ajustes locales, ni `Math.sin/cos/atan2/hypot/pow` en lo que simula (usa `R.dsin`, `R.dcos`, `R.datan2`, `R.dhypot`), ni azar que no sea `Math.random` dentro del paso (lo decorativo, con `root.__trolinaRealRandom`).
- **Al publicar una versión nueva**: sube `GAME_VERSION` en `game/core/rules.js` y el `?v=` de todos los archivos en `index.html` (los dos iguales; `tests/net.test.cjs` lo comprueba). Así ningún móvil mezcla archivos viejos en caché con nuevos y el multijugador detecta versiones distintas.
- `fetch` solo para el ranking compartido (`game/net/ranking-online.js`, API remota de Supabase; ver `SUPABASE.md`), nunca para cargar archivos del propio juego.
- No uses `fetch` ni `getImageData` en el juego: debe seguir funcionando abriendo `index.html` directamente.
- `references/` contiene fotos de personas reales y está excluida de git para no publicarlas.
- La policía usa `src/police.js` y `assets/police/` sin modificar; la lógica de ruido/multas está en `game/core/rules.js` (`NOISE`, `POLICE`) y `game/combat/match.js`. Ver `POLICE.md`.
- `example.html` es el ejemplo modular editable. No depende de un empaquetador.
- Para reconstruir arte desde los originales proporcionados, usa `python3 tools/rebuild_assets.py`, no solo uno de sus pasos intermedios. Requiere `requirements-art.txt`.
- No se necesita generar de nuevo las imágenes con IA ni disponer de claves para ejecutar o reconstruir lo entregado.
- Los scripts resuelven rutas desde la carpeta del proyecto; conserva esa portabilidad.

## Contratos visuales y de juego

- Conserva la estética pixel art y la identidad/ropa del personaje salvo que la petición cambie esos requisitos.
- Sprites de 192x176, ancla del pie (56,160), atlas 6x16 desde v0.12.4: filas 0–3 originales (idle, punch, kick, throwBottle) y 4–15 el arte de Combate 2.0 (guard, hit, grab, grabbed, gancho, air, knockdown, jump, dizzy, dash, walk, ko-win). No recentres cada pose por su caja visible.
- El arte de Combate 2.0 está en `source-art/combate-2.0` y se integra con `python3 tools/integrate_combat_assets.py` (amplía `assets/fighter.png` y `assets/fighter.json`, copia efectos e iconos y escribe `assets/fx/combat-fx-data.js`) seguido de `python3 tools/build_characters.py` y `python3 tools/build_demo.py`. Las poses en el aire se bajan dentro de su celda: la altura la pone la física.
- Personajes con arte propio (desde v0.13, Rizos): se integran con `python3 tools/integrate_character.py <carpeta-del-paquete>`. Su atlas usa las mismas filas que `assets/fighter.png` y comparte tiempos y cajas de golpe. Lo propio (mano del botellín, boca, retrato) va en `assets/characters/art-data.js`, que se genera; los ajustes a mano, en `source-art/personajes/<id>/juego.json`. `build_characters.py` no los recolorea. Si el atlas común gana filas, vuelve a integrar sus paquetes con la tira nueva.
- Paquetes de extras de un personaje (con `extension.json`, como la ultimate y la entrada en patinete de Rizos): se integran con la misma herramienta. Van en una segunda hoja con otro tamaño de celda y otra ancla; **no se pegan al atlas base**. Se dibujan con el punto de enlace del luchador base (`ref`). El humo va aparte, y el objeto (taburete, patinete) ya viene dentro del cuadro: no dibujes encima el objeto suelto.
- Paquetes completos (v0.18, BMX): atlas y `extension.json` con `actions` en la misma carpeta. Misma herramienta. Sus animaciones extra van a una segunda hoja de 256×224 con el pie de todas en y=208 (`ref` por animación). Los andamios y efectos se copian aparte. Lo que se ajusta a mano (boca y, en `andamio`, piso, escalera y fase final de cada andamio) va en `source-art/personajes/<id>/juego.json`. La ultimate del andamio usa la tregua de Rizos (`truce.kind`); todo lo que la mueve está en `Match.update`, sin azar ni trigonometría.
- Armas (v0.15): un paquete con arma (`con-baston/` y `sin-baston/` más `extras/`, como El Sombrerero) se integra con la misma herramienta. Da dos atlas con las mismas celdas, el agarre del arma por celda (`art-data.js` → `weapon.grip`) y una segunda hoja 192×176 (ultimate, recoger, entrada). Las reglas van en `WEAPONS`/`WEAPON` (`rules.js`) y el dibujo en `game/data/weapons.js`. El arma de quien no la tiene dibujada se pinta en la mano de `assets/characters/hands-data.js` (`python3 tools/build_hands.py` si cambia un atlas). La opción «Arma (pruebas)» es solo de desarrollo (`TROLINA_DEV`) y no se usa en el multijugador.
- `character.size` escala el dibujo y las cajas de un luchador (Rizos: 0,85). Usa `Combatant.S` en vez de `C.S` para todo lo que se dibuja con el luchador.
- STAB: la bebida y el tabaco de cada luchador (`stab` en `characters.js`) multiplican su fuerza (`TrolinaRules.STAB`). Los iconos de bebidas y tabaco se dibujan con `tools/build_drink_icons.py`, sin logotipos.
- Conserva la transparencia de los PNG y el escalado sin suavizado.
- El botellín Estrella Galicia es un arma común; su lógica no debe depender de un nombre de personaje ni de una fila fija de atlas.
- Orden del escenario: pared, mesas/sillas, suelo frontal, personajes y proyectiles. Los personajes siempre quedan delante de las mesas.
- Las tres imágenes del escenario comparten coordenadas y miden 544x270; ventana lógica 480x270, margen horizontal 32, suelo y=243 nativos. En Canvas 960x540, apoyo y=486.
- Interior del bar (v0.16): panorámica 1620×540 ya a escala del canvas (`assets/stages/interior/`, se genera con `python3 tools/integrate_interior.py`; no edites esos PNG ni `interior-data.js` a mano). Es un escenario ancho: lo que dependa de dónde acaba el suelo usa `Match.arena`, `limitsFor`, `clampX`, `reach` y `viewLeft`, nunca `C.MIN_X/MAX_X` ni 480/960 como centro o borde del mundo. Los luchadores nunca se separan más de `arena.span` (820) y la cámara (en unidades, ×2 en el canvas) es parte de la simulación. En la terraza todo da lo mismo que antes. Quien está detrás de la barra se dibuja en `drawBehind` (antes de los mostradores).
- Menú del bar (v0.17): la pantalla de inicio. Se integra con `python3 tools/integrate_menu_bar.py` (originales en `source-art/menu-bar`). No edites `assets/menu/` a mano.
  - **Sitios, flechas y perspectiva**: `game/data/hub.js`. Las flechas son nodos `[X, Z, nivel]` sobre el suelo; ajusta ahí, no en píxeles.
  - **Dibujo**: `game/ui/hub.js`, con su propio canvas a pantalla completa (no el de 960×540).
  - **Botones y textos**: HTML en la pantalla `hub` de `screens.js`.
  - Si una silueta sale mal, retoca su PNG en `source-art/menu-bar/mascaras/` y vuelve a integrar.
- `force:true` sirve para inspección de la demo; no debe ser el modo normal de lanzar en una partida.
- No introduzcas frameworks ni dependencias de ejecución para cambios que puedan resolverse con la estructura actual.

## Validación

Ejecuta `npm test` o las dos pruebas de `tests/` con Node. Repite comprobaciones adicionales según el alcance del cambio. Al modificar interfaz, representación o controles, valida en un navegador disponible; esa revisión no se pudo completar en el entorno original. Comprueba consola, carga de recursos, ambas orientaciones, controles y profundidad.

Mantén `CONTEXTO_CODEX.md` y `PLAN.md` actualizados cuando cambien contratos o alcance. No describas como implementadas mecánicas que siguen pendientes (ver «Límites actuales»). Para probar sin jugar a mano: `index.html?autoplay=1&fast=3` (con armas: `&p1=sombrero` o `&arma1=baston&arma2=botellin`).
