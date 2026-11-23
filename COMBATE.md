# Combate 2.0 (v0.12)

Rediseño de la pelea a partir de lo que se notaba jugando:
- la guardia era infinita y no había forma de romperla;
- no compensaba dejar de pegar ni dejar de cubrirse;
- la patada era mejor que el puño en todo;
- golpear saltando no aportaba nada.

## La idea: piedra, papel o tijera

Se ha tomado como referencia de los clásicos que funcionan con pocos botones: **Street Fighter II** (puño rápido contra golpe fuerte, agarre, antiaéreo), **Street Fighter III** y **Garou** (guardia justa), **Super Smash Bros.** (escudo que se gasta y se rompe, agarre que gana al escudo), **Street Fighter 6** (una barra de recurso que, si la vacías, te deja vendido), **Footsies** (pocos golpes con papeles claros y el juego de distancias), **Divekick** (patada en picado) y **Shadow Fight 2** (móvil con joystick y botones).

| Opción | Gana a | Pierde contra |
| --- | --- | --- |
| Golpe (puño/patada) | Agarre (le pilla arrancando), al que se mueve | Guardia (y si es patada, castigo después) |
| Agarre | Guardia (no se puede bloquear) | Cualquier golpe, salto, paso atrás |
| Guardia | Golpes | Agarre, picado (gasta mucho fuelle), quedarse sin fuelle |
| Salto / picado | Agarre y al que se cubre | Gancho (puño contra quien salta cerca) |
| Guardia justa | Un golpe leído a tiempo | Agarre; machacar el joystick no sirve |

## Controles

- **Joystick**: lados = andar; arriba = saltar; **abajo = guardia**. Andar hacia atrás **ya no cubre**.
- **Paso rápido en el móvil**: un **toque rápido** en la zona del joystick (apoyar y soltar sin mover, ≤220 ms) y, en menos de 350 ms, volver a apoyar el pulgar y **deslizarlo hacia un lado** (antes de 450 ms). Tras el toque, la base del joystick se ilumina mientras se puede hacer. Hacia el rival es paso adelante; hacia el otro lado, paso atrás. Tiempos en `DASH` (`touchTapMs`, `touchGapMs`, `touchSwipeMs`).
- **Botón DASH**: se pulsa y el **siguiente movimiento del joystick** decide. Hacia un lado da paso rápido; **hacia arriba, salto doble**: al llegar arriba hay un segundo impulso, se sube más y, en diagonal, se avanza más, para escapar de la esquina o pasar por encima del rival. Hacia abajo no hace nada y sigue armado. Dura 1,2 s armado y, mientras, el botón y el joystick brillan. Si ya vas hacia un lado o arriba al pulsarlo, sale en el acto. El salto doble gasta 8 de fuelle; sin fuelle sale un salto normal. Teclado: E o Mayúsculas y luego ←/→/↑. Ajustes en `DASH` (`armMs`, `highV2`, `highVx`, `highFuelle`).
- **Botones**: PUÑO, PATADA, **AGARRE** (sustituye a GUARDIA), **DASH**, BOTELLÍN, ULTIMATE y FUMAR.
- **Teclado**: J/Z puño, K/X patada, **H/N agarre**, ↓/S/G guardia, L/C botellín, U/V ultimate, F/B fumar. Doble pulsación de ← o → = paso rápido.

## Golpes

Tiempos en `game/data/moves.js` y efectos en `game/core/rules.js` (`MOVES`). Arranque = hasta que el golpe sale; ventaja al bloquear = lo que le sobra al defensor (negativo = castigable).

| Golpe | Arranque | Activo | Recuperación | Daño | Fuelle | Gasta al que bloquea | Ventaja al bloquear | Retroceso (golpe / bloqueo) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Puño | 110 ms | 90 | 150 | 4,5 | 8 | 10 | **+20** (seguro) | 28 / 22 px |
| Patada | 250 ms | 130 | 300 | 9 | 14 | 18 | **−170** (castigable con puño) | 120 / 50 px |
| Gancho (puño contra alguien que salta cerca) | 90 ms | 120 | 270 | 9 + derribo | 8 | 12 | −130 | lanza al aire |
| Puño en el aire | 40 ms | 170 | 110 | 5 | 8 | 14 | — | 30 / 25 px |
| Patada en picado (en el aire, con algo de altura) | 60 ms | hasta tocar suelo | 300 fallada / 420 bloqueada | 8 | 14 | 24 | aterriza vendido | 45 / 15 px |
| Agarre (muy de cerca, 135 px) | 120 ms | 80 | 420 si falla | 11 + derribo | 10 | imbloqueable | — | lo tira lejos |

- **Combos**: un puño que conecta se cancela en otro puño o en una patada; la patada cierra el combo (solo se cancela en el ultimate).
- **¡CONTRA!**: pillar al rival mientras arranca un golpe o lo tiene fuera: ×1,25 de daño y ×1,3 de aturdimiento.
- **¡CASTIGO!**: pillarlo recuperándose de un golpe fallado o bloqueado, o aterrizando de un picado: ×1,2 de daño y ×1,25 de aturdimiento.
- **Gancho**: mientras arranca y tiene el golpe fuera, gana a cualquier ataque en el aire (puño aéreo o picado).
- **Agarre**: no agarra a quien está recibiendo o bloqueando un golpe (hay que esperar a que se suelte), ni en el aire ni en el suelo. Agarre contra agarre: se zafan los dos. El agarrado se zafa pulsando AGARRE en los primeros 260 ms («¡SE ZAFA!»).
- **Derribo** (agarre, gancho y dardo): tumbado 650 ms y levantándose 320 ms; mientras, no se le puede pegar ni agarrar y los botellines le pasan por encima.

## Fuelle

Una sola barra, bajo la vida, para pegar y para cubrirse.

- Pegar gasta (puño 8, patada 14, picado 14, agarre 10, botellín 5, paso rápido 5): unos **10 golpes mezclados**.
- Se recupera entera en **unos 3 s**. Empieza **1,2 s después del último ataque**.
- **Cubriéndote no se recupera.** Al soltar la guardia empieza enseguida, salvo que acabes de pegar.
- **A 0 por pegar: «¡SIN FUELLE!»**. No puedes atacar, agarrar, dar pasos rápidos ni lanzar hasta pasar del **30 %** (la marca de la barra). Te puedes cubrir, pero con tan poco fuelle uno o dos golpes bloqueados te rompen la guardia.
- **Bloquear gasta** (tabla de arriba) y **ponerse en guardia cuesta 4**. Bloquear gasta algo más que pegar, así que quien solo se cubre pierde la guerra del fuelle.
- **A 0 cubriéndote: «¡GUARDIA ROTA!»**. Mareado 1,1 s sin poder hacer nada (con chapas dando vueltas sobre la cabeza). Al despertar recupera hasta el 35 %. Un golpe le despierta.
- **Desgaste**: cada golpe bloqueado quita el 12 % de su daño. No puede dejarte a 0, salvo el botellín.

## Guardia justa

Bajar el joystick **como mucho 140 ms antes** del golpe. Para que no sea fácil de abusar:

1. Solo cuenta si llevabas **al menos 300 ms sin cubrirte** antes de bajarlo (subir y bajar el joystick sin parar no sirve).
2. No cuenta si ya estás bloqueando una serie (en bloqueo): solo se puede con el primer golpe.
3. Ponerse en guardia cuesta fuelle, así que machacarla te vacía la barra.
4. Una pulsación vale para un golpe.

Efecto: no gasta vida ni fuelle, **devuelve 10 de fuelle**, el defensor solo queda 70 ms bloqueando y el atacante, **vendido 300 ms**. Da tiempo de sobra a meter un puñetazo. No funciona contra el agarre.

## Retroceso y esquina

- Todos los golpes empujan al que los recibe, también al bloquearlos. La patada y la ultimate empujan mucho. Dentro de un combo el empuje crece un 40 % por golpe, así que los combos se acaban solos.
- **Regla de esquina**: si el que recibe ya está contra el borde, el retroceso que no le cabe lo recibe el que pega. Nadie se queda encerrado sin remedio.
- Consecuencia buscada (juego de distancias): una patada bloqueada **de cerca** se castiga con un puño; bloqueada **a su alcance máximo**, el retroceso deja al rival fuera del alcance del puño.

## CPU

Por dificultad (`DIFFICULTIES` en `rules.js`):

- `grab`: agarra al que se cubre.
- `punish`: castiga golpes fallados o bloqueados.
- `parry`: hace guardia justa.
- `tech`: se zafa de los agarres.
- `dive`: usa la patada en picado.
- `rest`: respeta su fuelle; se aparta a respirar cuando se queda sin él.

En Fácil casi no hace nada de esto; en Pesadilla castiga casi todo y hace guardia justa una de cada cuatro veces que puede. Las guardias «normales» de la CPU nunca cuentan como guardia justa por casualidad.

## Armas (v0.15)

Algunos luchadores llevan un arma (`weapon` en `game/data/characters.js`): de momento, **El Sombrerero** y su bastón. En desarrollo se puede dar el bastón o un botellín empuñado a El Barbas y Rizos desde la elección de luchador («Arma (pruebas)»).

| | Bastón | Botellín empuñado |
| --- | --- | --- |
| Fuerza cuerpo a cuerpo | ×1,35 | ×1,2 |
| Alcance de más del puño | 25 px nativos (la punta del bastonazo) | 8 px |
| Fuelle al cubrirse | −30 % | igual |
| Si se le cae | se queda en el suelo: lo recoge al pasar por encima o vuelve solo a los 10 s | se rompe; le ponen otro a los 10 s |

- **Cómo se le quita**: con una **guardia justa** a un golpe suyo cuerpo a cuerpo, o con el **3.er golpe seguido de un combo**. Es la piedra que faltaba: contra el armado hay que cubrirse a tiempo o encadenar.
- **Al recuperarlo**: 3 s en los que no se lo pueden quitar, para que no haya bucles de desarme. Cualquier ultimate se lo devuelve.
- **Recogerlo** cuesta 0,44 s agachado: si le pegan o le agarran mientras, el bastón se queda en el suelo.
- **Equilibrio**: El Sombrerero es el que menos pega sin bastón (0,85) y queda por encima de la media con él (≈1,15).
- **La bolsita** (su ultimate) le devuelve el bastón:
  - el soplo (`soplo`) le deja al rival 1,1 s sin poder hacer nada;
  - el bastonazo (`remate`) llega antes de que se recupere, no se puede bloquear y lo tumba;
  - mientras dura no le pueden pegar ni agarrar;
  - si el rival está lejos o salta, el soplo y el bastonazo se pierden.
- **CPU**: contra un rival armado busca más el combo (×1,25) y la guardia justa (×1,6); sin su arma, va a por ella si el rival no está encima.

Dónde se ajusta: `WEAPONS`, `WEAPON`, `WEAPON_MELEE`, `WEAPON_REACH`, `BOLSA` y `MOVES.soplo` / `MOVES.remate` en `game/core/rules.js`; desarme en `Match.applyHit`, arma por el suelo en `Match.updateWeapons`, la bolsita en `Match.updateBolsas`. Pruebas en `tests/weapons.test.cjs`.

## Dónde se ajusta

| Qué | Dónde |
| --- | --- |
| Daño, coste de fuelle, gasto al bloquear, desgaste, retroceso | `MOVES` en `game/core/rules.js` |
| Fuelle, guardia rota, guardia justa, contra/castigo, derribo, paso rápido, agarre, picado, gancho | `FUELLE`, `GUARD_BREAK`, `PARRY`, `COUNTER`, `KNOCKDOWN`, `DASH`, `GRAB`, `DIVE`, `GANCHO` en `rules.js` |
| Tiempos y cajas de cada golpe, poses provisionales | `game/data/moves.js` |
| Ultimate de Rizos (pausa para el piti) y la china | `PITI` y `MOVES.china` en `rules.js`; lógica en `Match.startSmokeBreak` / `updateTruce` |
| STAB (bebida y tabaco propios: ×fuerza) | `STAB` y `CPU_STAB` en `rules.js`; `stab` de cada luchador en `game/data/characters.js` |
| IA | `game/combat/ai.js` y `DIFFICULTIES` |
| Comprobaciones del diseño | `tests/combat.test.cjs` (si cambias un número y rompe la idea, falla) |

## Arte

Desde v0.12.4 el combate usa el **arte propio de Combate 2.0** (paquete en `source-art/combate-2.0`, encargo en [`ASSETS_COMBATE.md`](ASSETS_COMBATE.md)):

- **Golpes:** gancho, puño aéreo, patada en picado y agarre, con los mismos tiempos de la tabla y cajas de golpe ajustadas a la mano o al pie de cada dibujo.
- **Estados:** guardia (entrar, mantener, encajar y guardia justa), recibir golpe (flojo, fuerte, en el aire), agarrado y lanzado, caída de espaldas, en el suelo y levantarse, salto (subir, cima, bajar, amortiguar), aterrizaje vendido, mareo, sin fuelle, paso rápido adelante y atrás, andar (al revés si retrocede), KO y victoria.
- **Efectos:** destello de guardia justa, guardia rota, chapas del mareo, impactos flojo y fuerte, polvo del suelo y sudor. **Iconos** de AGARRE y del fuelle.

Lo que aún va con pose provisional: el **salto doble** (voltereta con la pose de cima) y el **icono de DASH**, que se encargaron después (`combat-doublejump.png`, `fx-doublejump.png`, `ui-dash.png`). Al añadir una animación con su nombre al atlas, el juego la usa sola (`TrolinaMoves.install` / `poseFrame`).

## Multijugador

Todo es determinista: el agarre y el paso rápido viajan como acciones, y la guardia como la dirección abajo. Funciona en el modo en red sin cambios en el protocolo.
