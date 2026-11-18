# Contexto para continuar en Codex

Estado: **v0.12** (16 de noviembre de 2026): juego jugable de 1 jugador, publicado en GitHub Pages (`Omnijulio/la-tirolina`), construido sobre el kit visual y técnico v1.3 (15/11/2026). Este directorio es un proyecto portátil; no depende de las rutas ni del entorno donde se creó.

## Objetivo del usuario y decisiones aceptadas

Crear un juego de lucha 2D en HTML básico, con estética de arcade de finales de los 90, tipo Street Fighter de la época de PlayStation 1, que se pueda jugar en móvil y en remoto (un amigo desde su casa). El personaje se basa en fotos del usuario y los recursos son archivos concretos utilizables en el juego.

Peticiones incorporadas, en orden:

1. Luchador a partir de dos fotos con puñetazos y patadas, más previsualización HTML.
2. Lanzamiento de botellín común a cualquier personaje (objeto y lógica separados del luchador).
3. Botella Estrella Galicia Especial según la referencia.
4. Terraza nocturna de La Trolina en tres planos: pared, mesas/sillas, suelo con personajes delante.
5. Traslado del proyecto a Codex.
6. **v0.2**: juego jugable en móvil y en remoto; modo 1 jugador contra la CPU con desbloqueo progresivo de personajes y **dificultad ajustable**; mecánica troncal de **comprar botellines antes de cada pelea** (máx. 10 a 2,90 €; más fuerza pero más imprecisión con niebla creciente con el tiempo) y otros objetos que den otros efectos o los contrarresten; **ganar da muchísimo más dinero del necesario**; hueco para **cinemáticas cortas antes de cada combate** (se añadirán después); **selección de personajes** y **tienda**.

7. **v0.3**: mecánica única por personaje empezando por El Barbas: un **ultimate** que se carga encadenando combos y lanza un **dardo ultrapreciso** de mucho daño; **peleas más largas** para poder cargarlo; **joystick** táctil que permite moverse sin levantar el pulgar; **bolsa de azúcar** (60 €: mucha velocidad y sin embriaguez, a los 30 s se pasa y a los 45 s te quedas inconsciente) y **paquete de tabaco** (fumar es una mecánica importante: baja el puntillo).

8. **v0.4 — Policía Local**: aparece según un **nivel de ruido** (sobre todo muchos botellines seguidos), para la pelea, **multa a los dos** y la pelea se reinicia; si pasa **3 veces seguidas**, noche en el **calabozo** (esos personajes no se pueden usar durante 1 minuto). Se puede desactivar. Los sprites del agente y la patrulla y el controlador `src/police.js` vienen del paquete v1.4 del usuario (ver `POLICE.md`).

9. **v0.5 — La fuente**: ultimate de **El Peñista** «Al pilón» (lo tira a una fuente a la izquierda: mucho daño y queda mojado y más lento). La fuente puede estar encendida o apagada y con o sin luz; encendida, su ruido tapa el de los botellines y la policía no viene por ellos. La fuente es provisional (dibujada por código) hasta que lleguen los assets; formato esperado en `FUENTE.md`. Vendrán también fondos nocturnos nuevos.

10. **v0.6 — Modo salvaje (experimental)**: pelea rápida aparte en la que los objetos pegan más y, desde el segundo 30 de partida, el juego se vuelve casi injugable para los dos; cada fallo sale en pantalla con un mensaje pasivo-agresivo.

11. **v0.7 — Arte de la fuente y ambientes**: fuente definitiva con chorros animados, salpicadura, mojado y goteo; cinco ambientes (noche, día, lluvia, nieve, Navidad) y montón opcional en la jardinera. Ver `FUENTE.md`.

12. **v0.8 — Huecos y tabacos**: máximo de 7 bebidas por pelea y 1 hueco para fumar; el Hígado de hierro da +1 bebida por nivel (hasta 10) y la Pitillera de plata un segundo hueco para fumar. Para fumar: Marlboro, Ducados, tabaco de liar, puro, habano y chiflo, cada uno con su tiempo y efectos; fumar devuelve vida. Con la jardinera llena, +2 botellines para lanzar cada uno. Botón de pantalla completa siempre visible.

13. **v0.9 — Multijugador (experimental)**: dos móviles por WebRTC con código de sala (PeerJS), pelea en lockstep con semilla común. Ver `MULTIJUGADOR.md`.

14. **v0.10 — Puntuación y ranking**: puntos en cada combate y ranking (en el dispositivo) con firma opcional premiada.

15. **v0.11 — Ranking compartido**: con Supabase (tabla y reglas en `supabase/ranking.sql`, conectado en `game/data/online-config.js`); sin configuración o sin conexión, sigue el ranking de cada móvil. Ver `SUPABASE.md`.

16. **v0.12 — Combate 2.0**: fuelle, guardia solo con abajo y guardia justa, guardia rota, agarre (botón AGARRE en lugar de GUARDIA), gancho antiaéreo, patada en picado, paso rápido, contra/castigo, retroceso con regla de esquina y derribo. Ver `COMBATE.md` y, para el arte, `ASSETS_COMBATE.md`.

17. **v0.12.2 — Multijugador**: registro de partidas en red (ver/copiar/compartir), instantáneas detalladas cada 0,5 s con diferencias campo a campo, versión y huella obligatorias, fin avisado al rival y trigonometría determinista en la simulación. Ver `MULTIJUGADOR.md`.

18. **v0.12.4 — Arte de Combate 2.0**: atlas 6×16 con 12 tiras nuevas (`source-art/combate-2.0`, `tools/integrate_combat_assets.py`), poses de estado por tiempo en `Combatant.pose()` / `TrolinaMoves.poseFrame`, efectos e iconos (`assets/fx/combat`, `assets/ui`, `assets/fx/combat-fx-data.js`). Ver `COMBATE.md` § Arte.

19. **v0.13 — Rizos, primer luchador con arte propio**. El paquete `la-trolina-personaje-rizos` se integra con `tools/integrate_character.py`:
    - Copia en `source-art/personajes/rizos` y fotos en `references/rizos`.
    - Genera `assets/characters/rizos.png` con las mismas filas que `fighter.png` (poses en el aire bajadas) y `assets/characters/art-data.js` (`window.TROLINA_CHARACTER_ART`: filas, filas vacías, mano del botellín, boca y retrato).
    - Los ajustes a mano van en `source-art/personajes/<id>/juego.json`.

    En el juego:
    - `Match.fighterData(character)` construye los datos de cada luchador por separado: botellín con sus `sockets`, `data.mouth` para el pitillo y fuera las animaciones cuyas filas no tenga su atlas, que pasan a poses provisionales.
    - Tiempos y cajas de golpe son los comunes.
    - `drawFace` en `screens.js` usa su retrato en fichas y listas.
    - `unlock.start` se respeta también en partidas guardadas (`Save.starters`).
    - `art-data.js` entra en la huella del multijugador.

20. **v0.14 — Ultimate de Rizos, entrada en patinete y STAB**.
    - **Segunda hoja de animaciones** (`assets/characters/rizos-extras.png`, celdas 256×224, ancla 72,208, con taburete o patinete dentro). Se dibuja con el punto de enlace `ref` de cada animación en el ancla del luchador: `Combatant.extraPose` → `pose().extra`. Datos en `art-data.js` → `extras` (cuadros `[x,y,ms]`, boca, humo, patinete aparcado y secuencias de la ultimate y la entrada).
    - **Pausa para el piti**: `Match.startSmokeBreak` / `updateTruce` / `cancelTruce`. Durante `this.truce` no corre el reloj ni el puntillo, no hay golpes ni botellines, y el rival solo puede fumar (`Match.controls`). Cura `PITI.heal` y lanza la china (`spawnChina` / `updateChinas`, `MOVES.china`).
    - **Entrada**: `startEntrance` / `updateEntrances` en el primer asalto; alarga `introMs`. El patinete queda en `this.parked`.
    - **Tamaño por luchador** (`character.size`): `Combatant.S` escala el dibujo y las cajas; `MatchBottles` iguala los botellines de quien tiene otro tamaño.
    - **STAB**: `TrolinaRules.STAB`, `stabOf`, `CPU_STAB`; `computeLoadout` multiplica `power` y devuelve `stab`.

El apodo **El Barbas** sigue siendo el nombre del personaje original. **Rizos** (v0.13, nombre provisional, disponible desde el principio, ultimate «Pausa para el piti» desde v0.14) tiene arte propio. Los otros cinco luchadores (El Runner, El Peñista, El Camarero, El Motero, El Dueño) son **variantes de color provisionales** del mismo sprite con estadísticas propias; están pensados para sustituirse por arte propio.

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
| `game/main.js` | Arranque, carga de recursos, bucle y flujo entre pantallas (incluida la consecuencia policial) |
| `src/police.js`, `assets/police/` | Controlador y sprites de la intervención policial (paquete v1.4) |
| `assets/characters/*.png` | Atlas de los 7 luchadores (mismo formato y filas que `fighter.png`) y retrato de Rizos |
| `assets/characters/art-data.js` | Generado por `tools/integrate_character.py`: lo propio de los luchadores con arte propio |
| `assets/icons/` + `manifest.webmanifest` | Icono y manifest para instalar en la pantalla de inicio |

Flujo: Título → (Historia | Pelea rápida) → Selección (luchador; en pelea rápida también rival) + dificultad → **La Barra** (pago) → cinemática si existe → VS → combate → resultados (recompensa, desbloqueos) → siguiente combate / revancha / menú.

### Combate

> **Desde v0.12 (Combate 2.0) manda `COMBATE.md`.** Lo de abajo describe la base de v0.2–v0.3; donde no coincida (guardia con atrás, combos de patada, tiempos de puño y patada), vale `COMBATE.md`. Tiempos y cajas de los golpes en `game/data/moves.js` (se instalan sobre el atlas en `Match`); daños, fuelle y reglas en `MOVES`, `FUELLE`, `PARRY`… de `game/core/rules.js`; agarre normal en `Match.checkGrab/updateThrow/techThrow`; contra, castigo, guardia justa, guardia rota y regla de esquina en `Match.applyHit`; estados nuevos (`fuelle`, `dizzyT`, `downT`/`getupT`, `dashT`, `diving`, `landRecT`) en `Combatant`.

- Canvas lógico 960×540, escala de sprite 2, apoyo y=486, cámara −24…24 nativos (sin cambios respecto al kit).
- `Combatant` guarda la posición como **centro del cuerpo** (`cx`), a 40 px del ancla del pie en la dirección en que mira; así el giro al cruzarse no desplaza el sprite. `Fighter.x/y/facing` se sincronizan desde `Combatant`.
- Movimientos: andar adelante/atrás, salto, puñetazo, patada (también en el aire), lanzamiento de botellín y guardia (mantener atrás o botón de guardia). Pequeño búfer de entrada de 260 ms.
- Golpes: daño × fuerza (personaje, mejoras, botellines; la CPU además × dificultad), aturdimiento, retroceso, pausa de impacto, temblor, chispas y combos. La guardia anula el daño cuerpo a cuerpo; el botellín hace un 25 % de daño a través de la guardia.
- Poses sin arte propio: salto = fotograma 1 de la patada; golpe recibido = guardia inclinada; KO = caída girando sobre la cadera; victoria = fotograma 2 del lanzamiento con el botellín en alto.
- **Combos (v0.3)**: si un puñetazo o una patada conecta, desde su fotograma activo se puede cancelar en otro golpe o en el ultimate (`Combatant.canCancel`, máx. 6 encadenados). El aturdimiento (420/470 ms) cubre el arranque del siguiente golpe. Dentro de un combo el daño baja un 12 % por golpe (mín. 40 %), el retroceso sube un 40 % y el aturdimiento baja (`TrolinaRules.comboScale`), así que los combos terminan solos.
- **Ultimate de El Barbas — Dardo certero**: medidor 0–100 que dura todo el combate y se carga al conectar golpes (+2 suelto; en combo +6, +10, +14…: `meterGain`). Con la barra llena (U/V o botón DARDO, también al final de un combo) congela la pantalla 0,7 s y lanza un dardo (`throwDart`, misma animación que el botellín con evento `weapon:'dart'`) a 1400 px/s que corrige su trayectoria hacia el rival, no se puede bloquear y hace 30 de daño base × fuerza. La CPU también lo usa si juega con El Barbas. Los demás personajes muestran «Ultimate: próximamente»; se definen con `special` en `game/data/characters.js`.
- **Peleas más largas**: vida × 2 (`HP_SCALE`) y asaltos de 99 s. En pruebas CPU contra CPU un asalto en Normal dura unos 50–60 s y da para cargar un ultimate.
- Asaltos de 99 s, gana quien llegue a 2 (máx. 5). Al acabar el tiempo gana quien tenga más vida en porcentaje.
- El botellín sigue siendo el `BottleSystem` compartido, ahora con **munición**: botellines pedidos = lanzamientos por asalto. `MatchBottles` añade imprecisión al lanzar según el puntillo y la puntería.

### La Barra y el puntillo (mecánica troncal)

- Botellín: 2,90 €, máximo 10. Cada uno: +7 % de fuerza, +1 lanzamiento por asalto y +1 "botellín equivalente" de puntillo.
- Nivel de puntillo = botellines equivalentes × 0,1 × multiplicadores (café, agua) × (1 − aguante). Durante la pelea empieza en el 30 % de ese nivel, llega al 100 % a los 45 s de combate acumulado y puede subir un 25 % más si se alarga: **cuanto más tiempo, más niebla**.
- Efectos (`TrolinaRules.impairment`): niebla y viñeta, visión doble, balanceo de pantalla, tropiezos (“¡HIC!”), golpes al aire (“¡AL AIRE!”), dispersión del lanzamiento y retraso de controles. La puntería del personaje reduce fallos y dispersión.
- **Tabaco** (5,50 €): 10 cigarrillos para todo el combate. Fumar (F/B o botón FUMAR) deja quieto 1,5 s y quita 0,15 de puntillo de forma progresiva (`relief`); si te golpean mientras fumas se cae el cigarrillo. A partir del 4.º cigarrillo hay tos ocasional (tropiezo «¡COF, COF!»). La CPU fuma cuando va cargada y está lejos.
- **Bolsa de azúcar** (60 €): 0–30 s de combate sin puntillo, +40 % de velocidad y animaciones un 20 % más rápidas; 30–45 s vuelve el puntillo («¡BAJÓN DE AZÚCAR!»); a los 45 s el personaje se desmaya 6 s, tumbado e indefenso, y recibe un 50 % más de daño. Se puede cambiar a «pierde el asalto» en `faint()` de `combatant.js` si se prefiere más duro.
- Objetos (v0.7, solo bebida): Peterete (+9 % fuerza, 1,5 de puntillo, −15 % niebla), chupito de Jägermeister (+14 % fuerza, +4 % velocidad, 2,5 de puntillo, sube un 10 % más rápido), licor café (+10 % fuerza, +6 % velocidad, 2 de puntillo), tequila (+20 % fuerza, 3 de puntillo, +25 % niebla); los chupitos y el Peterete no dan envase. Red Bull (+12 % velocidad, sube 20 % más rápido), café (−20 % puntillo, +4 % velocidad), agua (−10 % puntillo, +5 vida), paquete de Marlboro (6,20 €, 10 cigarrillos), bolsa de azúcar y gafas de sol (mitad de niebla visual). Iconos de las bebidas nuevas: `tools/build_drink_icons.py` → `assets/icons/drinks/`.
- La CPU también pide en la barra según dificultad y personalidad; se muestra en la pantalla VS.

### Puntuación y ranking (v0.10)

- `rules.js`: `SCORE` (puntos por golpe, combo, «estilo» por puntillo, bloqueo, asalto, perfecto, tiempo, victoria, multiplicadores por dificultad y modo salvaje, tamaño del ranking, premio por firmar), `hitPoints`, `roundPoints`, `finalScore`, `rankPosition`, `rankInsert`, `cleanName`, `formatPoints`.
- `Combatant.score` (todo el combate); `Match.addScore()` suma y enseña «+puntos» de los luchadores humanos; marcador «N PTS» junto al nombre. `result()` incluye `score` (de quien mira) y `scores`.
- Ranking local en `localStorage` con clave propia `trolina.ranking.v1` (`Save.ranking`, `loadRanking`, `saveRanking`): «Borrar progreso» no lo borra. `Game.saveRanking(nombre, total, entrada)` da `SCORE.signBonusCents` (10 €) al firmar.
- Pantallas: bloque de puntuación y formulario de firma en `results` y `netresults` (`UI.scoreBlock`, `UI.rankForm`), pantalla `ranking` con filtros por modo, entrada en el menú con el líder actual.

### Ranking compartido (v0.11)

Ver `SUPABASE.md`. `TrolinaOnlineRanking` (`enabled`, `top`, `position`, `submit`, `flush`); `Game.onlineRanking()` y `Game.saveRanking()` (lo firmado va a `Save.ranking.pending` y se sube; si falla, se reintenta al arrancar y al abrir el ranking). La columna del luchador en la base se llama `fighter`.

### Multijugador (v0.9, experimental)

Ver `MULTIJUGADOR.md`. `game/net/net.js` (`TrolinaNet.NetLink`, `TrolinaNet.Lockstep`); `Match` con `opts.net = { side }` no crea CPU, lee `netInputs` en `controls()`, dibuja desde `viewer` y marca `netStall`/`netDesync`. Flujo en `main.js` (`netOpen`, `netEnter`, `netReady`, `netMaybeStart`, `startNetMatch`, `beginNetFight`, `endNetMatch`, `netAgain`, `netLeave`) y pantallas `online`, `netwait`, `netresults`. Regla para no romper la sincronía: todo lo que cambie el combate debe ocurrir dentro de `Match.update` y no depender de ajustes locales (sonido, reducir mareo); el azar decorativo fuera de la simulación debe usar `root.__trolinaRealRandom`.

### Huecos, cosas para fumar y pantalla completa (v0.8)

- `items.js`: cada objeto tiene `kind` (`drink`, `smoke`, `other`). Las cosas para fumar definen `smoke: { units, ms, relief, heal, coughFrom, look, buff? }`.
- `rules.js`: `SLOTS` (7 bebidas, 1 para fumar), `slotsFor(upgrades)`, `orderUsage(order)`, `sanitizeOrder(order, items, slots)` recorta lo que no cabe; `computeLoadout` devuelve `smokes` y `slots`, y acepta `opts.slots` (CPU: `cpuSlots(dificultad)`) y `opts.jardinera` (+`JARDINERA_AMMO` = 2 botellines por asalto).
- Mejoras: `higado` ya no da aguante, da huecos (`slots(sl, lvl)`); nueva `pitillera`.
- `Combatant`: `smokeBag` (lo de cada hueco, en orden), `currentSmoke`, `cigs` (total), `buffs` temporales (`buffPct`, `powerNow`). Al fumar baja el puntillo y sube la vida poco a poco; al acabar aplica el efecto extra.
- Pantalla completa: `#fsBtn` fijo, visible siempre que no se esté a pantalla completa (`Game.setupFullscreen`); en iPhone explica cómo añadir a la pantalla de inicio.

### Fuente y ambientes (v0.7)

Ver `FUENTE.md`. `Fountain` (`game/combat/fountain.js`) usa `TROLINA_FOUNTAIN_DATA` y las imágenes de `Game.assets.fountain`; tintes de luz con lienzos auxiliares (sin `getImageData`). `Match` recibe `stage` (de `TROLINA_STAGES`), `stageImages` y `jardinera`; `Game.loadStage(id)` carga las capas bajo demanda y cae en la noche si fallan. `?stage=<id>` fuerza un ambiente en las URL de prueba.

### Modo salvaje (v0.6, experimental)

- Entrada propia en el título (`beginWild`, `session.wild`); `?wild=1` en las URL de prueba. Revancha conserva el modo; Pelea rápida e Historia lo desactivan.
- Reglas en `TrolinaRules.WILD`, `chaosAt(s)` (0 hasta 30 s, 1 a los 45 s, hasta 1,25 si se alarga) y `wildLevel(intox, caos)` (máx. 1,5). `computeLoadout(..., {wild:true})`: puntillo ×1,6 y fuerza de los objetos ×1,4. `Match.levelOf(c)` sustituye a `intoxOf` para la torpeza y la percepción.
- Efectos con caos (para los dos luchadores, en `Combatant.update`): controles invertidos 1,5–3 s, puñetazo/patada cambiados, pasos solos, caídas solo (1,1 s en el suelo, cuentan como desmayo), botellas hacia atrás, micro-siestas (pantalla en negro), tintes que cambian, mareo ×1,8 y marcador que se mueve. Equilibrio: +30 % de daño con el caos a tope y prima del 50 % al ganar.
- Mensajes en `game/data/snark.js` (editables): `Match.say(c, tipo)` muestra uno grande en el centro; si ya hay otro, una versión corta encima del luchador. De la CPU solo comenta alguno. En La Barra, cada pedido tiene su comentario.

### La fuente y «Al pilón» (v0.5)

Ver `FUENTE.md`. `game/combat/fountain.js` dibuja la fuente (capa trasera antes de los luchadores; murete delantero encima de quien cae dentro). `Match.startFountainThrow/updateGrab` controlan carga → agarre → lanzamiento → chapuzón → salida; los luchadores implicados usan los estados `grabbed`/`soaked` y `locked`. `Combatant.wetT` aplica `TrolinaRules.WET`. `Match.addBottleNoise` ignora el ruido de botellines con la fuente encendida. El estado se elige en `main.preFight` con `TrolinaRules.pickFountain` (opciones `settings.fountain` y `settings.fountainLight`) y se conserva al reiniciar por la policía.

### Policía Local (v0.4)

Detalles y tabla de ruido en `POLICE.md`. Resumen: `Match` acumula `noise` (0–100) con botellines (racha de 6 s), roturas, golpes, KO y el puntillo de ambos, y lo reduce 4/s. Al llegar a 100 dispara `PoliceIntervention` (patrulla detrás de los luchadores, agentes delante, destellos). En el alto se bloquea el combate; al acabar la radio `main.js → onPolice` aplica `TrolinaRules.policeOutcome`: multas de 30 € y 60 € con reinicio de la pelea, y a la tercera seguida calabozo de 1 minuto para los dos personajes (`save.police.jail`, comprobado en selección, historia y La Barra). La racha (`save.police.strikes`) vuelve a 0 al terminar una pelea. Opción `settings.police`.

### Economía, progreso y dificultad

- Dinero en céntimos. Se empieza con 30 €. Victoria: 120 € × multiplicador de dificultad (1 / 1,5 / 2,2 / 3,2) + 30 € por asalto ganado + perfectos, tiempo sobrante, combos, ultimates acertados, “valor etílico” por botellines, jefe y primera vez. Derrota: 12 € + 6 € por asalto ganado.
- Historia: Runner → Peñista → Camarero → Motero → Dueño (jefe). Ganar a cada uno lo desbloquea. El Barbas y Rizos están desde el principio. Tienda: personajes (120–800 €) y 4 mejoras permanentes de 3 niveles.
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

- Teclado: ←/→ o A/D andar (atrás = cubrirse), ↑/W saltar (mantener = seguir saltando), ↓/S/G guardia, J/Z puñetazo, K/X patada, L/C botellín, U/V ultimate, F/B fumar, Esc/P pausa.
- Táctil (aparece en dispositivos táctiles o forzándolo en Opciones): **joystick flotante** a la izquierda (aparece donde se apoya el pulgar y se maneja arrastrando sin levantarlo: lados = andar, arriba = saltar, en diagonal salta hacia ese lado, abajo = guardia; umbrales con histéresis) y botones Fumar, Botellín, Dardo (con aro de carga), Guardia, Patada y Puño a la derecha. Dardo y Fumar se ocultan si el personaje no tiene ultimate o no hay tabaco. En vertical los controles van debajo del combate.
- `fighter-preview.html`: el antiguo Fighter Lab (inspección de animaciones, cajas y capas). `example.html`: integración mínima del kit.

## Fuentes de verdad y construcción

| Ubicación | Qué editar |
| --- | --- |
| `game/**` | Juego |
| `src/fighter.js`, `src/bottle.js`, `src/stage.js` | Motor base compartido (el juego lo usa sin modificarlo) |
| `assets/*.json`, `assets/stage/stage.json`, `assets/police/police.json` | Datos canónicos; `python3 tools/build_demo.py` regenera los espejos `*-data.js`, `fighter-preview.html` y `police-preview.html` |
| `templates/index.template.html` | Fuente del Fighter Lab (`fighter-preview.html`). **`index.html` ya no se genera**: es el juego |
| `tools/build_characters.py` | Regenera los atlas de variantes desde `assets/fighter.png` (Pillow + NumPy); no toca los de arte propio |
| `tools/integrate_character.py` | Integra un paquete de personaje con arte propio (`python3 tools/integrate_character.py <carpeta>`; sin carpeta, reintegra `source-art/personajes/*`) |
| `tools/package_web.py` | ZIP solo con lo necesario para jugar (itch.io, Netlify) |
| `references/`, `source-art/` | Fotos del usuario y originales gráficos. `references/` está en `.gitignore` para no publicarse |

`MANIFEST.json` y `tools/verify_manifest.py` describen el snapshot v1.3; tras los cambios de v0.2 la verificación indicará archivos cambiados, como estaba previsto.

## Cómo arrancar

- Jugar en local: abrir `index.html`, o `npm run serve` y `http://localhost:8000/`.
- Pruebas: `npm test` (botellín, escenario y reglas del juego).
- Utilidades de depuración por URL: `?autoplay=1&fast=3` (CPU contra CPU, acelerado), `?autoplay=story`, `?screen=barra|shop|options|help|vs|cinematic|fight`, parámetros `p1`, `p2`, `diff`, `bottles`.
- Publicación y opciones para jugar en remoto: `PUBLICAR.md`. Hoja de ruta: `PLAN.md`.

## Validación realizada en v0.6

- `npm test`: 21 pruebas (nueva: caos del modo salvaje, objetos exagerados, prima).
- Chrome sin interfaz, CPU contra CPU en modo salvaje (3 combates): normal hasta el segundo 30, luego mensajes cada 1–2 s; los combates terminan (≈2–3 min de partida). Menú, Barra (comentarios al pedir) y resultados en móvil horizontal. Sin errores de consola.

## Validación realizada en v0.5

- `npm test`: 20 pruebas (nueva: fuente, mojado y estados aleatorios).
- Chrome sin interfaz: los cuatro estados de la fuente; 5 botellines seguidos con la fuente encendida no suben el ruido (con la apagada 4 llaman a la patrulla); «Al pilón» completo (carga, levantar, lanzamiento, chapuzón dentro del pilón, salida mojado y más lento, unos 60 de daño con 6 botellines); la CPU con El Peñista lo usa en combate. Sin errores de consola.

## Validación realizada en v0.4

- `npm test`: 5 suites (botellín, escenario, policía y Fighter Lab del paquete v1.4, y 15 pruebas de reglas, incluida la de ruido/multa/calabozo).
- Chrome sin interfaz: 4 botellines seguidos llaman a la patrulla; llegada, agentes entre los luchadores, alto, multa de 30 € con reinicio automático, segunda multa de 60 €, calabozo a la tercera con cuenta atrás y selección bloqueada; policía desactivada desde Opciones; pantalla en móvil horizontal. Fighter Lab con policía sin errores.

## Validación realizada en v0.3

- `npm test`: 16 pruebas (nuevas: azúcar, tabaco, combos/medidor y duración).
- Chrome sin interfaz: combo de 4 golpes con teclado, medidor, activación del dardo con congelado e impacto (−30), fumar (baja el puntillo), desmayo por azúcar a los 45 s; joystick en móvil horizontal y vertical (derecha anda, diagonal arriba salta, abajo guardia, al soltar se para); combates CPU contra CPU con El Barbas usando el ultimate. Sin errores de consola.

## Validación realizada en v0.2

- `npm test`: 12 pruebas (incluidas 10 de reglas: precios, máximo de botellines, puntillo creciente, objetos que contrarrestan, aguante, imprecisión, recompensas frente a costes, escalado de dificultad, pedido de la CPU y orden de desbloqueo).
- Navegador (Chrome sin interfaz): sin errores de consola en todas las pantallas; capturas revisadas a 1280×720, móvil horizontal 844×390 y vertical 390×844 con pantalla táctil; combate manual con teclado (andar, salto, puñetazo, patada, lanzamiento con impacto, KO y pose de victoria); combates completos CPU contra CPU en varias dificultades; modo historia encadenando 3 combates con desbloqueos y guardado.
- **Pendiente**: probar en móviles reales (iOS Safari y Android Chrome), afinar el equilibrio con jugadores y revisar el rendimiento en móviles antiguos.

## Límites actuales

- Las variantes de personaje son recoloreados con la misma cara; solo Rizos tiene arte propio (sin salto doble propio).
- No hay animaciones dedicadas de caminar, salto, recibir golpe, caída ni victoria (se simulan con poses existentes).
- Solo El Barbas (dardo), El Peñista (pilón) y Rizos (pausa para el piti) tienen ultimate; no hay agacharse ni especiales con comandos.
- Solo El Barbas y Rizos tienen bebida y tabaco propios (STAB).
- Lluvia y nieve son visuales: no cambian la jugabilidad.
- Cinemáticas: solo texto y retratos provisionales.
- Sin música; los efectos de sonido son sintéticos.
- Sin multijugador (ni local ni online).

## Siguiente trabajo recomendado

Ver `PLAN.md`. Prioridad: publicar (GitHub Pages) y probar con amigos en móviles reales; después arte propio por personaje y cinemáticas. Mantener el botellín como arma compartida, la terraza en tres planos y la estética pixel art.
