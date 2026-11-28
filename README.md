# La Trolina Fighters — v0.18.0

Juego de lucha 2D arcade (estilo finales de los 90) en la terraza de La Trolina. **1 jugador contra la CPU**, en navegador de escritorio y móvil.

## Jugar

- **Local**: abre `index.html`, o ejecuta `npm run serve` y entra en `http://localhost:8000/`.
- **En remoto / en el móvil de un amigo**: publícalo como web estática. Opciones y pasos en [`PUBLICAR.md`](PUBLICAR.md) (recomendado: GitHub Pages).
- Teclado: ←/→ andar (doble pulsación = paso rápido; en el móvil, toque rápido en el joystick y deslizar), ↑ saltar, ↓ o G guardia, J puñetazo, K patada (en el aire: en picado), H agarre, E dash (luego ←/→ paso rápido, ↑ salto doble), L botellín, U ultimate, F fumar, Esc pausa. En pantallas táctiles aparecen joystick (abajo = guardia) y botones.

Qué incluye: modo historia con desbloqueo progresivo de 5 rivales, pelea rápida, 4 dificultades, **La Barra** (pedir hasta 10 botellines a 2,90 € antes de cada combate: más fuerza, pero más *puntillo*, niebla e imprecisión cuanto más dura la pelea; y objetos que lo compensan), tienda de personajes y mejoras, cinemáticas provisionales y guardado automático. En v0.3: combos encadenables, ultimate de El Barbas (dardo certero), tabaco y bolsa de azúcar, joystick táctil y peleas más largas. En v0.4: la **Policía Local** (ruido, multas y calabozo; ver [`POLICE.md`](POLICE.md)). En v0.5: la **fuente** y el ultimate de El Peñista «Al pilón» (ver [`FUENTE.md`](FUENTE.md)). En v0.6: el **Modo salvaje** experimental (caos desde el segundo 30 y comentarios pasivo-agresivos; textos en `game/data/snark.js`). En v0.7: la fuente definitiva y cinco **ambientes** (noche, día, lluvia, nieve, Navidad). En v0.8: **huecos** en La Barra (7 bebidas y 1 para fumar, ampliables en la Tienda), tabacos, puros, habanos y chiflos, y botón de pantalla completa siempre visible. En v0.9: **Multijugador experimental** entre dos móviles (ver [`MULTIJUGADOR.md`](MULTIJUGADOR.md)). En v0.10: **puntuación** en los combates y **ranking** con firma opcional. En v0.11: ranking compartido entre móviles con Supabase (ver [`SUPABASE.md`](SUPABASE.md)). En v0.12: **Combate 2.0** (fuelle, guardia justa, guardia rota, agarre, gancho, patada en picado, paso rápido, contra/castigo y retroceso; ver [`COMBATE.md`](COMBATE.md) y el encargo de arte [`ASSETS_COMBATE.md`](ASSETS_COMBATE.md)). En v0.13: **Rizos**, primer luchador con arte propio (`tools/integrate_character.py`). En v0.14: su ultimate **Pausa para el piti**, su entrada en patinete y el **STAB** (bebida y tabaco propios de cada luchador que le multiplican la fuerza). En v0.15: **El Sombrerero**, con bastón y entrada en bici. Se le puede **desarmar** con una guardia justa o un combo de 3, recoge el bastón al pasar por encima o le vuelve solo, y su ultimate es **La bolsita**. En pruebas, El Barbas y Rizos pueden llevar el bastón o un botellín empuñado. En v0.16: **el interior del bar**, un escenario ancho que la cámara recorre, con las luces encendidas o apagadas (y la bola de discoteca girando); allí la ultimate de El Peñista es **¡Al fregadero!**. En v0.17: **el menú del bar**. La pantalla de inicio es La Trolina vista desde la puerta, de día, de tarde o de noche. Las flechas de luz van por el suelo hasta la barra (Tienda), el pasillo (Modo historia) y la escalera del comedor (Dianas, próximamente), y la tele, el futbolín, la bola, los cuadros, la carta y el reloj se iluminan para llevar al resto. Se integra con `tools/integrate_menu_bar.py`. En v0.18: **BMX**, que llega en su bici y cuya ultimate es **El andamio**: monta un andamio, sube, le tira un ladrillo al rival y se fuma un puro que le devuelve algo de vida. Detalles técnicos en [`CONTEXTO_CODEX.md`](CONTEXTO_CODEX.md); hoja de ruta en [`PLAN.md`](PLAN.md).

## Kit base (v1.3)

Personaje original basado en las fotos facilitadas. Pixel art de lucha arcade de finales de los 90: barba castaña rojiza, entradas/calvicie superior, chaqueta verde oliva, camiseta azul, pantalón cargo oscuro y zapatillas negras con suela marrón.

Incluye **24 sprites y cuatro movimientos**, más un **botellín Estrella Galicia Especial compartido por todos los personajes**, basado en la referencia facilitada. La versión de juego conserva la chapa negra y los bloques de etiqueta negros, blancos y rojos; los textos se simplifican a escala de sprite.

`fighter-preview.html` es el **Fighter Lab**: inspección de movimientos, hitboxes, capas y cámara (J/K/L/G, flechas para orientación). Se genera con `python3 tools/build_demo.py` desde `templates/index.template.html`.

`example.html` utiliza archivos separados y demuestra **dos instancias** del personaje que comparten el arma, con lanzamientos en ambos sentidos. L lanza desde A y P desde B.

`fighter-animation.gif` ofrece una previsualización rápida de los cuatro movimientos, incluido el vuelo del botellín.

## Escenario de tres planos

La terraza de las fotos se incluye como tres PNG alineados: pared al fondo, mesas y sillas en medio, suelo y personajes delante. Las capas están en `assets/stage/`; el módulo reutilizable es `src/stage.js`. Consulta `STAGE.md` para tamaños, orden de dibujo, paralaje y código de integración.

Desde v0.16 también se pelea en **el interior del bar** (`assets/stages/interior/`, `game/combat/interior.js`): una panorámica de 1620×540 que la cámara recorre, con las luces encendidas o apagadas. Se integra con `tools/integrate_interior.py`; ver `STAGE.md`.

## Assets

| Archivo | Uso |
| --- | --- |
| `assets/fighter.png` | Atlas RGBA transparente de 1152 × 704 px, 6 columnas × 4 filas |
| `assets/frames/*.png` | 24 poses independientes de 192 × 176 px |
| `assets/fighter.json` | Rectángulos, tiempos, ancla, hurtbox, hitboxes y eventos de animación |
| `assets/fighter-data.js` | Datos del personaje como `window.FIGHTER_DATA`; evita `fetch` al abrir HTML local |
| `assets/bottle.png` | Botellín Estrella Galicia Especial transparente de 24 × 32 px, independiente del personaje |
| `assets/bottle-estrella-galicia-4x.png` | Versión de 96 × 128 px para mostrar el objeto a mayor tamaño |
| `assets/bottle.json` | Parámetros comunes del proyectil y punto de agarre |
| `assets/bottle-data.js` | Los mismos parámetros como `window.BOTTLE_DATA` |
| `src/fighter.js` | Reproductor Canvas 2D con eventos de fotograma |
| `src/bottle.js` | Movimiento y sistema de proyectiles compartidos, sin nombres ni filas de personaje fijos |
| `example.html` | Ejemplo de dos actores usando el mismo arma |
| `index.html` | **El juego** (carga `game/`, `src/` y los assets) |
| `fighter-preview.html` | Fighter Lab autónomo con recursos incrustados |
| `assets/characters/*.png` | Atlas de los 9 luchadores jugables (variantes de color de El Barbas; Rizos, El Sombrerero y BMX, con arte propio; El Sombrerero también sin bastón) |
| `game/` | Código del juego: reglas, datos, combate, IA, menús |
| `assets/stage/*.png` | Tres planos del escenario y vistas de revisión |
| `src/stage.js` | Renderizado de profundidad y paralaje |
| `STAGE.md` | Guía de integración del escenario |
| `tests/bottle.test.cjs` | Pruebas del motor sin dependencias; ejecutar con Node |

Todos los sprites miran a la derecha; el controlador los refleja al mirar a la izquierda. Celda: **192 × 176 px**. Ancla del pie de apoyo: **(56,160)**. Coloca esa ancla en `(fighter.x,fighter.y)`; no centres cada PNG por su caja visible. El escenario y las sombras solo pertenecen a la demo.

## Movimientos

Filas y fotogramas indexados desde cero.

| Clave | Fila | Poses | Duraciones en ms | Comportamiento |
| --- | --- | --- | --- | --- |
| `idle` | 0 | 6 | 150,150,150,150,150,150 | Bucle de 900 ms |
| `punch` | 1 | 6 | 60,80,45,100,80,100 | 465 ms; vuelve a guardia |
| `kick` | 2 | 6 | 70,100,65,140,100,110 | 585 ms; vuelve a guardia |
| `throwBottle` | 3 | 6 | 80,110,100,80,120,130 | 620 ms; suelta a los 290 ms y vuelve a guardia |

Puño y patada tienen hitbox activa en el cuarto fotograma (`frameIndex === 3`). El lanzamiento genera **un solo proyectil**, también al entrar en su cuarto fotograma, incluso si una actualización grande cruza varios fotogramas. La botella continúa volando después de volver a guardia. Las posiciones de mano `itemSocket` permiten dibujar el mismo objeto compartido en las poses de preparación. Los PNG del cuerpo no llevan la botella incrustada.

## Incorporarlo a cualquier personaje

Carga los cuatro scripts en este orden:

```html
<script src="assets/fighter-data.js"></script>
<script src="assets/bottle-data.js"></script>
<script src="src/fighter.js"></script>
<script src="src/bottle.js"></script>
```

Después de cargar las imágenes:

```js
// otroPersonajeData y otraImagen pueden ser distintos para cada luchador.
const datos = BottleAttack.install(otroPersonajeData);
const actor = new Fighter(otraImagen, datos, {x:150, y:405, scale:2});
const botellines = new BottleSystem(imagenBotellin, BOTTLE_DATA, {
  groundY:405, minX:-60, maxX:860,
  onHit:({owner,target,damage}) => {
    // Aplicar aquí el daño a target, según las reglas de tu juego.
  }
});
botellines.throw(actor);

// En cada actualización, usar el mismo delta en milisegundos:
actor.update(deltaMs);
botellines.update(deltaMs, [actor], objetivos);
actor.draw(ctx);
botellines.draw(ctx, [actor]);
```

Usa **una sola instancia de `BottleSystem`** para todos los luchadores de una partida. En `update` pásale todos los actores que puedan lanzar. Sus botellas compartirán arte, física, daño y colisiones; cada actor conserva su propio tiempo de espera.

`BottleAttack.install(data)` devuelve una copia y añade el movimiento `throwBottle` al personaje. Utiliza su animación específica si existe. Si falta, reutiliza sus poses de `punch` para que el lanzamiento ya sea funcional. Para un acabado visual propio, cada personaje debe aportar sus poses de lanzamiento y sus posiciones de mano; no es necesario duplicar el sprite ni la física del botellín.

Puedes indicar otro movimiento base, el fotograma de suelta y las posiciones de mano:

```js
const datos = BottleAttack.install(otroPersonajeData, {
  sourceAnimation:'punch',
  releaseFrame:3,
  sockets:[
    {x:105,y:60,rotation:0},
    {x:65,y:55,rotation:-0.5},
    {x:60,y:33,rotation:-0.8},
    {x:145,y:52,rotation:0.8},
    {x:150,y:70,rotation:1.1},
    {x:105,y:60,rotation:0}
  ]
});
```

Las posiciones de mano están en píxeles locales de cada celda, con origen arriba a la izquierda, antes de escala/reflejo. La rotación está en radianes. Ajusta esos valores a las manos de cada personaje.

## Botellín y colisiones

Parámetros iniciales compartidos en `assets/bottle.json`:

| Parámetro | Valor |
| --- | --- |
| Velocidad horizontal | 180 px/s nativos |
| Velocidad vertical inicial | −65 px/s nativos |
| Gravedad | 250 px/s² nativos |
| Giro | 9 rad/s |
| Radio aproximado de impacto | 7 px nativos |
| Daño comunicado a `onHit` | 10 |
| Tiempo entre lanzamientos por actor | 1000 ms |
| Vida máxima del proyectil | 2500 ms |

Velocidades, gravedad y radio se multiplican por `actor.scale`. Los objetivos pueden ser actores que tengan `getHurtbox()` u objetos `{rect:{x,y,w,h}}` en coordenadas de mundo. La botella ignora a su propietario, impacta una sola vez, desaparece al chocar con un objetivo o con el suelo y muestra fragmentos. También se retira al salir de los límites o agotar su tiempo. Hay colisión por barrido para que un proyectil rápido no atraviese una caja estrecha entre actualizaciones.

`onHit` recibe `{owner,target,damage,projectileId}`. El módulo comunica el impacto; tu juego decide cómo aplicar vida, equipos, bloqueo o invulnerabilidad. Las cajas del personaje son aproximaciones iniciales para ajustar al equilibrio de tu juego.

`botellines.throw(actor)` devuelve `false` si el actor está ocupado o sigue en espera. La demo usa `{force:true}` para repetir libremente movimientos al inspeccionarlos; en una partida usa la llamada normal. `botellines.reset()` elimina proyectiles y efectos visibles. Consume los eventos de botellín y conserva otros eventos en la cola del actor para otros manejadores.

## API del personaje

- `play('punch')`, `play('kick')`: ataques cuerpo a cuerpo cuando está en guardia.
- `play('idle',true)`: fuerza un cambio y cancela los eventos aún no consumidos del ataque anterior.
- `facing = -1` / `1`: izquierda / derecha.
- `draw(ctx,true)`: cajas de impacto y ancla.
- `getHitboxes()`, `getHurtbox()`: cajas en coordenadas del mundo, escaladas y reflejadas.
- `worldPoint(socket)`: convierte un punto local en coordenadas de mundo.
- `drainEvents()`: devuelve y vacía la cola de eventos de fotograma; el sistema de botellines lo usa internamente.

Mantén `imageSmoothingEnabled=false` y `image-rendering:pixelated`; una escala entera conserva mejor los píxeles. No se incluyen caminar, saltar, recibir daño, caída ni victoria.

## Comprobaciones

Ejecuta `npm test` (o `node tests/bottle.test.cjs`, `tests/stage.test.cjs` y `tests/rules.test.cjs`) desde esta carpeta. Verifica suelta única, tiempos, retorno a guardia, compensación al saltarse fotogramas, varios actores, adaptación de otro personaje, enfriamiento independiente, reflejo, colisión, inmunidad al propio proyectil, cancelación y rotura en el suelo. En v0.2 el juego se revisó en Chrome sin interfaz a escritorio y móvil (horizontal y vertical).

Sprites creados con ImageGen integrado a partir de las fotos y del atlas original, recortados, alineados y empaquetados para el juego. Dirección visual en `ART_DIRECTION.txt`.
