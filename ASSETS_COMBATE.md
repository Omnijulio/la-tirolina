# Encargo de arte: Combate 2.0 de La Trolina Fighters

> **Estado (v0.12.4):** integrado todo lo entregado: 12 tiras, 6 efectos y 2 iconos. Copia en `source-art/combate-2.0`; se integra con `tools/integrate_combat_assets.py`. **Falta por entregar:** `combat-doublejump.png`, `fx-doublejump.png` y `ui-dash.png` (sección 3 y 4); mientras, el juego usa poses provisionales para el salto doble.

Documento para pasar tal cual a la IA que genera los gráficos. Explica qué es el juego, qué ha cambiado en el combate y qué imágenes hacen falta, con el formato exacto para que entren sin retoques.

---

## 1. Contexto

**La Trolina Fighters** es un juego de lucha 2D para el móvil y el navegador, con estética de **arcade de finales de los 90 (era PlayStation 1)**: pixel art dibujado a mano, contornos oscuros, paleta limitada con sombreado por bandas y sin suavizado. Se pelea en la terraza nocturna del bar La Trolina: fachada crema, mesas y sillas negras, suelo de piedra mojado con reflejos y una fuente a la izquierda.

El luchador base es **El Barbas**: cara alargada y estrecha, entradas y calva arriba con pelo castaño corto a los lados, barba completa castaño rojiza, sudadera verde oliva con cremallera abierta, camiseta azul intenso, pantalón cargo gris carbón y zapatillas negras con suela marrón. Complexión delgada de adulto. Los demás personajes salen de recolorear su ropa por código, así que **basta con dibujarle a él**: sus poses, proporciones y ropa deben coincidir con el atlas actual (`assets/fighter.png`).

### Qué cambia en el combate (para entender las poses)

Ahora el combate es un piedra-papel-tijera: **el golpe gana al agarre, el agarre gana a la guardia y la guardia gana al golpe**. El salto esquiva el agarre, y un gancho hacia arriba tumba a quien salta.

- **Puño**: rápido y corto. Si el rival salta cerca, sale un **gancho antiaéreo** hacia arriba.
- **Patada**: lenta, larga y fuerte, y empuja al rival hacia atrás.
- **Agarre** (botón nuevo): coge al rival por la sudadera y lo tira al suelo.
- **Guardia**: brazos cubriendo la cara. **Guardia justa** (parry): un bloqueo perfecto en el momento exacto, con destello.
- **Guardia rota**: si te cubres demasiado se acaba el «fuelle» y te quedas **mareado**, con chapas de botellín dando vueltas sobre la cabeza.
- **Fuelle**: si pegas sin parar te quedas **sin aliento**, jadeando.
- **Patada en picado**: en el aire, cae en diagonal hacia abajo con el pie por delante.
- **Derribo**: tras un agarre o un gancho, cae de espaldas al suelo y se levanta.
- **Paso rápido**: un impulso corto hacia delante o hacia atrás.
- **Botón DASH y salto doble** (v0.12.3): con el botón DASH y el joystick hacia arriba, el personaje salta y, al llegar arriba, da un **segundo impulso en el aire** (se encoge, empuja con las piernas y sube más). Sirve para escapar de la esquina o pasar por encima del rival.

Ahora mismo todo eso se ve con poses prestadas de las animaciones que ya existen, giradas por código. Las imágenes de este encargo las sustituyen.

---

## 2. Formato obligatorio (sprites del luchador)

Es el mismo contrato que el atlas actual:

- **Celdas de 192 × 176 px**, PNG con **transparencia real** (alfa), sin fondo, sombra, suelo ni texto.
- **Mirando a la derecha** en todos los fotogramas.
- **Ancla en el pie de apoyo trasero en (56, 160)** de cada celda: ese pie toca la línea y = 160 y su talón está en x = 56. En el aire, el cuerpo sube dentro de la celda, pero se mantiene la posición horizontal de referencia. **No recentres cada pose** por su caja visible.
- **Misma escala, proporciones, identidad y ropa** que `assets/fighter.png` (6 columnas × 4 filas: guardia, puñetazo, patada y lanzar botellín). Úsalo como referencia directa.
- **Pixel art nítido**, contorno oscuro, paleta limitada y sin degradados suaves ni antialias hacia el fondo. Si se genera a más resolución, reducir con vecino más próximo.
- **Manos vacías** (el botellín y el dardo los dibuja el juego).
- **Una tira por animación**: **6 fotogramas en una fila (1152 × 176 px)**, de izquierda a derecha en orden de tiempo. Si una animación necesita menos, deja las celdas sobrantes vacías (transparentes).
- Nombre de archivo: `combat-<nombre>.png` (los nombres de la tabla de abajo).

Opcional pero muy útil: una imagen de guía por tira (`combat-<nombre>-guia.png`) con un punto en la mano o el pie que golpea en el fotograma activo.

---

## 3. Lista de animaciones

**Prioridad A**: se notan en cada pelea. **Prioridad B**: mejoran mucho la lectura. **Prioridad C**: pulido.

| Prio | Archivo | Fotogramas (6 por tira) | Notas |
| --- | --- | --- | --- |
| A | `combat-guard.png` | 0–1 entrar en guardia · 2–3 guardia mantenida (bucle suave) · 4 encajar un golpe (empujado un poco atrás) · 5 **guardia justa** (antebrazos que se abren hacia fuera con firmeza, pecho adelante) | Antebrazos delante de la cara, codos cerrados, peso atrás. La guardia justa debe leerse como «¡zas, desviado!», no como recibir. |
| A | `combat-hit.png` | 0–1 golpe flojo (cabeza hacia atrás) · 2–3 golpe fuerte (cuerpo doblado, un paso atrás) · 4–5 golpe en el aire (cuerpo arqueado, piernas sueltas) | Expresión de dolor; los pies siguen en el ancla en 0–3. |
| A | `combat-grab.png` | 0 preparar (brazos abiertos) · 1 lanzarse a coger · 2 **agarra la sudadera del rival** (fotograma activo, brazos adelante a la altura del pecho) · 3 sujeta y levanta un poco · 4 giro para lanzar · 5 suelta y termina | Las manos agarran el aire (el rival se dibuja aparte). Brazos a unos 70 px de su cuerpo. |
| A | `combat-grabbed.png` | 0 agarrado por la ropa (de puntillas, tenso) · 1 levantado · 2 lanzado girando · 3 cayendo de espaldas · 4–5 vacías | Lo que ve el que recibe el agarre. |
| A | `combat-gancho.png` | 0 agacharse · 1 impulso · 2 **puño arriba en vertical, pies casi despegados** (activo) · 3 arriba del todo · 4 bajando · 5 recuperar guardia | El puño acaba por encima de la cabeza y algo adelante: es para golpear a quien salta. |
| A | `combat-air.png` | 0 puño aéreo (preparar) · 1 **puño aéreo hacia abajo y adelante** (activo) · 2 picado: recogerse · 3 **patada en picado: cuerpo en diagonal, pierna estirada hacia abajo-adelante unos 45°** (activo, se mantiene hasta tocar suelo) · 4 aterrizaje del picado (agachado, desequilibrado) · 5 levantarse | En 0–3 está en el aire: dibujarlo más alto dentro de la celda. En el 3, el pie que golpea es lo más bajo y adelantado de la figura. |
| A | `combat-knockdown.png` | 0 cayendo de espaldas · 1 golpe contra el suelo · 2 tumbado boca arriba · 3 girarse · 4 de rodillas · 5 de pie | Tumbado en 2: cuerpo horizontal sobre la línea y = 160. |
| B | `combat-jump.png` | 0 agacharse para saltar · 1 subiendo (rodillas arriba) · 2 en lo alto · 3 bajando · 4 aterrizaje (amortigua) · 5 vuelta a la guardia | Hoy el salto usa un fotograma de patada; queda raro. |
| B | `combat-dizzy.png` | 0–3 mareado (balanceo, ojos en espiral, brazos caídos; en bucle) · 4–5 sin fuelle (inclinado, manos en las rodillas, jadeando; en bucle) | El mareado es tras la guardia rota y el jadeo, al quedarse sin fuelle. |
| B | `combat-doublejump.png` | 0 **segundo impulso**: piernas estiradas hacia abajo empujando el aire, brazos arriba · 1 encogido, rodillas al pecho · 2–3 vuelta en el aire (de lado y boca abajo, en bucle mientras sube) · 4 se abre para caer · 5 cayendo | Todo en el aire: dibujarlo más alto dentro de la celda, como el salto. Es nuevo desde el botón DASH. |
| B | `combat-dash.png` | 0–2 paso rápido adelante (inclinado hacia delante, pierna trasera empujando) · 3–5 paso atrás (inclinado hacia atrás, saltito) | Lectura rápida: 180–200 ms en total. |
| C | `combat-walk.png` | 6 fotogramas de andar con la guardia alta (bucle) | Hoy se anda con la animación de guardia. |
| C | `combat-ko-win.png` | 0–2 KO (cae y queda tumbado) · 3–5 victoria (brazo arriba, sonriente) | Pendiente del plan general. |

### Frases de ejemplo para el generador (inglés)

> Same pixel-art man as the reference atlas (long narrow face, bald top with short brown hair at the sides, full reddish-brown beard, open olive-green zip hoodie over a vivid blue T-shirt, charcoal cargo trousers, black sneakers with brown soles). Original late-1990s PlayStation-1-era 2D arcade fighter, hand-pixelled, dark outlines, limited shaded palette, no anti-aliasing. Facing right. Six frames in one row, each 192×176, real transparent background, no shadow, floor or text. Rear supporting foot at (56,160) in every cell; do not recentre poses.

Después, una línea por tira. Por ejemplo:

- **guard**: *Frames: raising forearms to guard; guard; guard breathing; guard breathing; absorbing a blow pushed slightly back; perfect parry with forearms snapping outward.*
- **grab**: *Frames: arms open; lunging to grab; both hands gripping an opponent's hoodie at chest height (empty-handed, opponent not drawn); lifting; twisting to throw; release and recover.*
- **gancho**: *Frames: crouch; spring up; rising uppercut with fist straight above head, feet almost off the ground; peak; coming down; back to guard.*
- **air**: *Frames: airborne punch wind-up; airborne punch angled down-forward; tucking in mid-air; diving kick, body diagonal and leg extended down-forward at 45 degrees; landing crouched off-balance; standing up.*
- **knockdown**: *Frames: falling backwards; hitting the ground; lying flat on his back; rolling over; kneeling; standing.*
- **doublejump**: *All frames airborne. Frames: second mid-air push with legs thrust down and arms up; tucked with knees to chest; somersault side view; somersault upside down; opening up to fall; falling.*

---

## 4. Efectos y elementos de interfaz

Mismo estilo pixel art, PNG transparente y tiras horizontales.

| Prio | Archivo | Celda × fotogramas | Qué es |
| --- | --- | --- | --- |
| A | `fx-parry.png` | 128 × 128 × 6 | Destello de guardia justa: aro blanco azulado que se abre con chispas cortas. Limpio y «caro». |
| A | `fx-guardbreak.png` | 160 × 160 × 6 | Guardia rota: escudo azul translúcido que se agrieta y estalla en trozos, con un fogonazo rojo. |
| A | `fx-chapas.png` | 96 × 48 × 8 | Mareo: **tres chapas de botellín** (doradas y una roja, sin marcas ni logotipos) girando en círculo plano, en bucle. Va sobre la cabeza. |
| B | `fx-hit.png` | 96 × 96 × 6 (dos filas: flojo y fuerte) | Chispas de impacto: el flojo, pequeño y amarillo claro; el fuerte, grande, naranja y con líneas de velocidad. |
| B | `fx-dust.png` | 96 × 48 × 6 | Polvo y salpicadura del suelo mojado al aterrizar o dar el paso rápido. |
| B | `fx-sweat.png` | 32 × 32 × 4 | Gota de sudor que cae (sin fuelle). |
| B | `fx-doublejump.png` | 96 × 48 × 6 | Salto doble: anillo de aire o ráfaga blanca que se abre y se deshace bajo los pies, en el aire (sin suelo). |
| C | `ui-agarre.png` | 64 × 64 | Icono del botón AGARRE: mano abierta agarrando, trazo blanco grueso sobre transparente. |
| C | `ui-fuelle.png` | 32 × 32 | Icono pequeño para la barra de fuelle (unos pulmones o una ráfaga de aire). |
| C | `ui-dash.png` | 64 × 64 | Icono del botón DASH: dos flechas o líneas de velocidad hacia un lado y una hacia arriba, mismo trazo que `ui-agarre`. |

Los textos («¡CONTRA!», «¡CASTIGO!», «¡JUSTA!», «¡GUARDIA ROTA!», «¡AGARRE!», «¡SE ZAFA!», «¡SIN FUELLE!») los escribe el juego: **no hace falta dibujarlos**.

---

## 5. Entrega y comprobación

- Entrega todo en una carpeta `la-trolina-assets-combate/` con las tiras, las guías opcionales y un `LEEME.txt` que diga qué archivo es qué y si alguna celda va vacía.
- **Comprueba** antes de entregar:
  - El fondo es transparente de verdad, sin un blanco o gris «casi transparente».
  - El pie trasero cae en (56,160) en las poses de suelo.
  - Al poner las tiras junto a `assets/fighter.png`, la escala coincide.
  - No hay logotipos, texto ni marcas.
- Integración (la hace el código, no la IA de gráficos):
  - Las tiras se añaden como filas nuevas al atlas `assets/fighter.png`, que pasa de 6×4 a 6×N con las mismas celdas.
  - Se regeneran los recoloreados con `python3 tools/build_characters.py`.
  - Se registran en el JSON del luchador con los nombres `guard`, `hit`, `grab`, `grabHold`, `grabbed`, `gancho`, `airPunch`, `dive`, `land`, `down`, `getup`, `jump`, `doubleJump`, `dizzy`, `tired`, `dash` y `walk`.
  - El juego ya busca esas animaciones (`game/data/moves.js`): en cuanto existen, deja de usar las poses provisionales.
