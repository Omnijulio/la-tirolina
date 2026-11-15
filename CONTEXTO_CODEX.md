# Contexto para continuar en Codex

Estado: **v0.2 — juego jugable de 1 jugador** (16 de noviembre de 2026), construido sobre el kit visual y técnico v1.3 (15/11/2026). Este directorio es un proyecto portátil; no depende de las rutas ni del entorno donde se creó.

## Objetivo del usuario y decisiones aceptadas

Crear un juego de lucha 2D en HTML básico, con estética de arcade de finales de los 90, tipo Street Fighter de la época de PlayStation 1, que se pueda jugar en móvil y en remoto (un amigo desde su casa). El personaje se basa en fotos del usuario y los recursos son archivos concretos utilizables en el juego.

Peticiones incorporadas, en orden:

1. Luchador a partir de dos fotos con puñetazos y patadas, más previsualización HTML.
2. Lanzamiento de botellín común a cualquier personaje (objeto y lógica separados del luchador).
3. Botella Estrella Galicia Especial según la referencia.
4. Terraza nocturna de La Trolina en tres planos: pared, mesas/sillas, suelo con personajes delante.
5. Traslado del proyecto a Codex.
6. **v0.2**: juego jugable en móvil y en remoto; modo 1 jugador contra la CPU con desbloqueo progresivo de personajes y **dificultad ajustable**; mecánica troncal de **comprar botellines antes de cada pelea** (máx. 10 a 2,90 €; más fuerza pero más imprecisión con niebla creciente con el tiempo) y otros objetos que den otros efectos o los contrarresten; **ganar da muchísimo más dinero del necesario**; hueco para **cinemáticas cortas antes de cada combate** (se añadirán después); **selección de personajes** y **tienda**.

El apodo **El Barbas** sigue siendo el nombre del personaje original. Los otros cinco luchadores (El Runner, El Peñista, El Camarero, El Motero, El Dueño) son **variantes de color provisionales** del mismo sprite con estadísticas propias; están pensados para sustituirse por arte propio.

## Cómo está organizado el juego (v0.2)

Sin frameworks ni dependencias de ejecución: scripts clásicos que se cargan en orden desde `index.html` y exponen globales. Funciona servido por HTTP (GitHub Pages, `npm run serve`) y también abriendo `index.html` directamente; no usa `fetch` ni `getImageData`.

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Juego. Carga el kit (`src/`, `assets/*-data.js`) y los módulos de `game/` |
| `game/style.css` | Interfaz, menús, controles táctiles, adaptación a horizontal/vertical |
| `game/core/rules.js` | Reglas puras: dificultades, daños, precios, carga de combate, puntillo, recompensas, pedido de la CPU. Probado con Node |
| `game/data/characters.js` | Plantel, estadísticas, desbloqueo y orden de la historia |
| `game/data/items.js` | Objetos de La Barra (consumibles por combate) y mejoras permanentes de la tienda |
| `game/data/cinematics.js` | Registro de cinemáticas por combate (`story-n` o `vs-<rival>`); admite texto, retrato, imagen o vídeo |
| `game/core/save.js` | Partida en `localStorage` (clave `trolina.save.v1`), con modo en memoria si no se puede guardar |
| `game/core/input.js` | Teclado + cruceta y botones táctiles multitáctiles |
| `game/core/audio.js` | Efectos sintetizados con WebAudio |
| `game/combat/combatant.js` | Luchador jugable sobre `Fighter`: andar, salto, guardia, aturdimiento, KO, victoria, puntillo |
| `game/combat/ai.js` | IA de la CPU |
| `game/combat/match.js` | Asaltos, reloj, colisiones, daño, botellines, cámara, niebla y HUD |
| `game/ui/screens.js` | Pantallas: título, selección, La Barra, cinemática, VS, resultados, pausa, tienda, opciones, ayuda |
| `game/main.js` | Arranque, carga de recursos, bucle y flujo entre pantallas |
| `assets/characters/*.png` | Atlas de los 6 luchadores (mismo formato que `fighter.png`) |
| `assets/icons/` + `manifest.webmanifest` | Icono y manifest para instalar en la pantalla de inicio |

Flujo: Título → (Historia | Pelea rápida) → Selección (luchador; en pelea rápida también rival) + dificultad → **La Barra** (pago) → cinemática si existe → VS → combate → resultados (recompensa, desbloqueos) → siguiente combate / revancha / menú.

### Combate

- Canvas lógico 960×540, escala de sprite 2, apoyo y=486, cámara −24…24 nativos (sin cambios respecto al kit).
- `Combatant` guarda la posición como **centro del cuerpo** (`cx`), a 40 px del ancla del pie en la dirección en que mira; así el giro al cruzarse no desplaza el sprite. `Fighter.x/y/facing` se sincronizan desde `Combatant`.
- Movimientos: andar adelante/atrás, salto, puñetazo, patada (también en el aire), lanzamiento de botellín y guardia (mantener atrás o botón de guardia). Pequeño búfer de entrada de 260 ms.
- Golpes: daño × fuerza (personaje, mejoras, botellines; la CPU además × dificultad), aturdimiento, retroceso, pausa de impacto, temblor, chispas y combos. La guardia anula el daño cuerpo a cuerpo; el botellín hace un 25 % de daño a través de la guardia.
- Poses sin arte propio: salto = fotograma 1 de la patada; golpe recibido = guardia inclinada; KO = caída girando sobre la cadera; victoria = fotograma 2 del lanzamiento con el botellín en alto.
- Asaltos de 60 s, gana quien llegue a 2 (máx. 5). Al acabar el tiempo gana quien tenga más vida en porcentaje.
- El botellín sigue siendo el `BottleSystem` compartido, ahora con **munición**: botellines pedidos = lanzamientos por asalto. `MatchBottles` añade imprecisión al lanzar según el puntillo y la puntería.

### La Barra y el puntillo (mecánica troncal)

- Botellín: 2,90 €, máximo 10. Cada uno: +7 % de fuerza, +1 lanzamiento por asalto y +1 "botellín equivalente" de puntillo.
- Nivel de puntillo = botellines equivalentes × 0,1 × multiplicadores (café, agua) × (1 − aguante). Durante la pelea empieza en el 30 % de ese nivel, llega al 100 % a los 45 s de combate acumulado y puede subir un 25 % más si se alarga: **cuanto más tiempo, más niebla**.
- Efectos (`TrolinaRules.impairment`): niebla y viñeta, visión doble, balanceo de pantalla, tropiezos (“¡HIC!”), golpes al aire (“¡AL AIRE!”), dispersión del lanzamiento y retraso de controles. La puntería del personaje reduce fallos y dispersión.
- Objetos: café (−20 % puntillo, +4 % velocidad), agua (−10 % puntillo, +5 vida), tortilla (+12 vida, sube 30 % más lento), bocata (+25 vida, −8 % velocidad), orujo (+15 % fuerza, 2,5 de puntillo, sin envase), energética (+12 % velocidad, sube 20 % más rápido), gafas de sol (mitad de niebla visual).
- La CPU también pide en la barra según dificultad y personalidad; se muestra en la pantalla VS.

### Economía, progreso y dificultad

- Dinero en céntimos. Se empieza con 30 €. Victoria: 80 € × multiplicador de dificultad (1 / 1,5 / 2,2 / 3,2) + 20 € por asalto ganado + perfectos, tiempo sobrante, combos, “valor etílico” por botellines, jefe y primera vez. Derrota: 12 € + 6 € por asalto ganado.
- Historia: Runner → Peñista → Camarero → Motero → Dueño (jefe). Ganar a cada uno lo desbloquea. Tienda: personajes (120–800 €) y 4 mejoras permanentes de 3 niveles.
- Dificultad elegible en la selección y en Opciones; afecta a reacción, agresividad, guardia, antiaéreos, errores, daño y pedido de la CPU y a la recompensa.

## Kit base (v1.3, sigue vigente)

### Personaje

Hombre adulto delgado, entradas/calvicie superior, barba castaña rojiza, chaqueta verde oliva sobre camiseta azul, pantalón cargo oscuro y zapatillas negras con suela marrón. 24 poses PNG transparentes; atlas 1152×704, celdas 192×176, ancla del pie **(56,160)**, mirando a la derecha.

| Animación | Fila | Duración | Comportamiento |
| --- | --- | --- | --- |
| `idle` | 0 | 900 ms | Bucle de guardia |
| `punch` | 1 | 465 ms | Caja activa en el 4.º fotograma |
| `kick` | 2 | 585 ms | Caja activa en el 4.º fotograma |
| `throwBottle` | 3 | 620 ms | Suelta a los 290 ms |

Las variantes de `assets/characters/` se generan con `tools/build_characters.py` recoloreando chaqueta, camiseta y pantalón; conservan celdas, ancla y cajas.

### Arma compartida

`assets/bottle.png` (Estrella Galicia Especial, 24×32) y versión 4×. `BottleAttack.install(data)` configura `throwBottle` en cualquier ficha; una sola instancia de `BottleSystem` sirve a todos. Velocidad 180 px/s, vertical −65 px/s, gravedad 250 px/s², giro 9 rad/s, radio 7, espera 1000 ms, vida 2500 ms (magnitudes × `actor.scale`). `force:true` es solo para inspección; el juego usa el lanzamiento normal.

### Escenario

Tres PNG alineados de 544×270 (pared 0,18 / mesas 0,55 / suelo y personajes 1 de paralaje), vista 480×270, suelo y=243 nativos. **Los personajes siempre delante de las mesas.** `TerraceStage.draw` llama a `drawActors` dentro del plano delantero.

## Controles

- Teclado: ←/→ o A/D andar (atrás = cubrirse), ↑/W saltar, ↓/S/G guardia, J/Z puñetazo, K/X patada, L/C botellín, Esc/P pausa.
- Táctil (aparece en dispositivos táctiles o forzándolo en Opciones): cruceta arrastrable a la izquierda (arriba = saltar) y botones Puño, Patada, Botellín y Guardia a la derecha. En vertical los controles van debajo del combate.
- `fighter-preview.html`: el antiguo Fighter Lab (inspección de animaciones, cajas y capas). `example.html`: integración mínima del kit.

## Fuentes de verdad y construcción

| Ubicación | Qué editar |
| --- | --- |
| `game/**` | Juego |
| `src/fighter.js`, `src/bottle.js`, `src/stage.js` | Motor base compartido (el juego lo usa sin modificarlo) |
| `assets/*.json`, `assets/stage/stage.json` | Datos canónicos; `python3 tools/build_demo.py` regenera los espejos `*-data.js` y `fighter-preview.html` |
| `templates/index.template.html` | Fuente del Fighter Lab (`fighter-preview.html`). **`index.html` ya no se genera**: es el juego |
| `tools/build_characters.py` | Regenera los atlas de variantes desde `assets/fighter.png` (Pillow + NumPy) |
| `tools/package_web.py` | ZIP solo con lo necesario para jugar (itch.io, Netlify) |
| `references/`, `source-art/` | Fotos del usuario y originales gráficos. `references/` está en `.gitignore` para no publicarse |

`MANIFEST.json` y `tools/verify_manifest.py` describen el snapshot v1.3; tras los cambios de v0.2 la verificación indicará archivos cambiados, como estaba previsto.

## Cómo arrancar

- Jugar en local: abrir `index.html`, o `npm run serve` y `http://localhost:8000/`.
- Pruebas: `npm test` (botellín, escenario y reglas del juego).
- Utilidades de depuración por URL: `?autoplay=1&fast=3` (CPU contra CPU, acelerado), `?autoplay=story`, `?screen=barra|shop|options|help|vs|cinematic|fight`, parámetros `p1`, `p2`, `diff`, `bottles`.
- Publicación y opciones para jugar en remoto: `PUBLICAR.md`. Hoja de ruta: `PLAN.md`.

## Validación realizada en v0.2

- `npm test`: 12 pruebas (incluidas 10 de reglas: precios, máximo de botellines, puntillo creciente, objetos que contrarrestan, aguante, imprecisión, recompensas frente a costes, escalado de dificultad, pedido de la CPU y orden de desbloqueo).
- Navegador (Chrome sin interfaz): sin errores de consola en todas las pantallas; capturas revisadas a 1280×720, móvil horizontal 844×390 y vertical 390×844 con pantalla táctil; combate manual con teclado (andar, salto, puñetazo, patada, lanzamiento con impacto, KO y pose de victoria); combates completos CPU contra CPU en varias dificultades; modo historia encadenando 3 combates con desbloqueos y guardado.
- **Pendiente**: probar en móviles reales (iOS Safari y Android Chrome), afinar el equilibrio con jugadores y revisar el rendimiento en móviles antiguos.

## Límites actuales

- Las variantes de personaje son recoloreados con la misma cara; no hay arte propio por personaje.
- No hay animaciones dedicadas de caminar, salto, recibir golpe, caída ni victoria (se simulan con poses existentes).
- No hay agacharse, agarres, especiales ni barra de súper.
- Cinemáticas: solo texto y retratos provisionales.
- Sin música; los efectos de sonido son sintéticos.
- Sin multijugador (ni local ni online).

## Siguiente trabajo recomendado

Ver `PLAN.md`. Prioridad: publicar (GitHub Pages) y probar con amigos en móviles reales; después arte propio por personaje y cinemáticas. Mantener el botellín como arma compartida, la terraza en tres planos y la estética pixel art.
