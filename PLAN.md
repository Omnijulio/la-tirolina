# La Trolina Fighters — plan del proyecto

Estado: **v0.16** (27/11/2026). Un jugador contra la CPU, en navegador de escritorio y móvil, publicado en GitHub Pages.

## Hecho en v0.2

- **Juego completo de 1 jugador**: combates al mejor de 3 asaltos de 60 s, vida, KO, tiempo, cámara, golpes, guardia, salto, retroceso, chispas, combos y sonido sintetizado.
- **IA con 4 dificultades** (Fácil, Normal, Difícil, Pesadilla): reacción, agresividad, guardia, antiaéreos, errores, daño y pedido de botellines de la CPU.
- **Mecánica troncal del botellín**: antes de cada combate, *La Barra* permite pedir hasta 10 botellines a 2,90 €. Cada uno da +7 % de fuerza y un envase para lanzar por asalto, y sube el *puntillo*. El puntillo crece con el tiempo de combate y provoca niebla, visión doble, balanceo de pantalla, tropiezos, golpes al aire, lanzamientos imprecisos y retraso en los controles.
- **Objetos de barra** (solo bebida desde v0.7): Peterete, chupitos de Jägermeister, licor café y tequila, Red Bull, café, agua, paquete de Marlboro, bolsa de azúcar y gafas de sol.
- **Modo historia** de 5 combates con desbloqueo progresivo de personajes y cinemáticas provisionales antes de cada pelea.
- **Pelea rápida** con elección de luchador, rival y dificultad.
- **Tienda**: comprar personajes antes de desbloquearlos y mejoras permanentes (aguante, fuerza, velocidad, vida).
- **Economía generosa**: una victoria da desde 120 € (Fácil) hasta más de 400 € (Pesadilla, jefe, primera vez); el pedido máximo de la barra cuesta 67,10 € y 10 botellines, 29 €.
- **Móvil**: cruceta y botones táctiles multitáctiles, horizontal y vertical, pantalla completa, instalable en la pantalla de inicio (manifest).
- **Guardado** automático en el navegador.
- **6 luchadores** (El Barbas + 5 variantes de color provisionales con estadísticas propias).

## Hecho en v0.3

- **Ultimate de El Barbas: Dardo certero**. Se carga encadenando combos; dardo ultrapreciso que busca al rival, no se puede bloquear y hace muchísimo daño. Congelado de pantalla al activarlo.
- **Combos**: los golpes que conectan se pueden encadenar (puño, puño, patada… y rematar con el dardo).
- **Peleas más largas**: el doble de vida y asaltos de 99 s.
- **Joystick táctil** flotante: moverse, saltar (también en diagonal) y cubrirse sin levantar el pulgar.
- **Bolsa de azúcar** (60 €): 30 s de velocidad sin puntillo, bajón y desmayo a los 45 s.
- **Paquete de tabaco**: fumar en combate baja el puntillo (te deja quieto y da tos si abusas).

## Hecho en v0.4

- **Policía Local**: barra de ruido (sobre todo muchos botellines seguidos); si se llena llega la patrulla, para la pelea, multa a los dos y la pelea se reinicia. A la tercera seguida, **noche en el calabozo**: esos luchadores no se pueden usar durante 1 minuto. Se puede desactivar en Opciones.

## Hecho en v0.5

- **Ultimate de El Peñista: «Al pilón»**: agarra al rival y lo tira a la fuente; mucho daño y lo deja **mojado** y más lento 12 s.
- **Fuente** a la izquierda: encendida/apagada y con/sin luz (aleatoria o fija en Opciones). Encendida, **tapa el ruido de los botellines** para la policía.
- Fuente provisional dibujada por código, lista para cambiar por los assets definitivos (`FUENTE.md`).

## Hecho en v0.6

- **Modo salvaje (experimental)**: los objetos pegan más (para bien y para mal) y, a partir del segundo 30, el caos convierte la pelea en una experiencia horrible para los dos: controles invertidos, golpes cambiados, pasos solos, caídas solo, botellas hacia atrás, micro-siestas y pantalla que no para.
- Cada fallo se anuncia en grande con mensajes pasivo-agresivos («Casi.», «Ya ni ves.», «Le has dado a una mesa.», «Casi te caes solo.»…), también al pedir en La Barra y en los resultados.
- Equilibrio: cuando un golpe entra pega más; los combates acaban. Prima del 50 % por ganar.
- Pendiente de ajustar tras probarlo jugando: frecuencia de cada efecto y de los mensajes.

## Hecho en v0.7

- Fuente definitiva: chorros con arranque y bucle, salpicadura al caer, agua encima mientras está dentro, goteo al salir. Con luz / sin luz.
- Cinco ambientes: noche, día, lluvia (con lluvia animada), nieve (con copos) y Navidad. Aleatorio o fijo en Opciones.
- Montón de botellines, vasos y tabaco en la jardinera (opción; fijo en el Modo salvaje).
- La Barra solo sirve bebida: fuera tortilla, bocata y orujo; entran el **Peterete** (vaso verde lima con hielo), chupitos de **Jägermeister**, **licor café** y **tequila**; la energética es un **Red Bull** y el tabaco un **paquete de Marlboro** (6,20 €).

## Hecho en v0.8

- **Huecos en La Barra**: hasta 7 bebidas por pelea y 1 cosa para fumar. En la Tienda: **Hígado de hierro** (+1 bebida por nivel, hasta 10) y **Pitillera de plata** (segundo hueco para fumar).
- **Cosas para fumar**: Marlboro, Ducados, tabaco de liar, puro, habano y chiflo, con distinto tiempo quieto, alivio del puntillo y efectos (el habano da fuerza; el chiflo deja flojo). **Fumar devuelve vida.**
- **Jardinera llena**: +2 botellines para lanzar cada uno.
- **Pantalla completa**: botón siempre visible mientras no lo esté (en iPhone, instrucciones para añadir a inicio).

## Hecho en v0.9

- **Multijugador (experimental)**: sala con código de 4 letras (o enlace), cada uno en su móvil, barra libre, todos los luchadores, revancha. Ver `MULTIJUGADOR.md`.

## Hecho en v0.10

- **Puntuación** en cada combate: golpes (más con combos y con puntillo: «estilo»), ultimates, bloqueos, asaltos (perfecto y tiempo), victoria; ×dificultad y ×modo salvaje. Marcador en pantalla y desglose al final.
- **Ranking** (top 20 en este dispositivo) con firma opcional: se recuerda el nombre, te dice qué puesto conseguirías y la casa invita a una ronda (+10 €) por firmar. Pantalla Ranking en el menú con filtros por modo.
- **Ranking compartido** («🌍 La Trolina») con Supabase (v0.11), conectado al proyecto `la-tirolina` (ver `SUPABASE.md`).

## Hecho en v0.12 — Combate 2.0

Rediseño de la pelea (detalle y números en `COMBATE.md`):

- **Piedra, papel o tijera.** El golpe gana al agarre, el agarre a la guardia y la guardia al golpe. El salto esquiva el agarre y el gancho tumba al que salta. Referencias: Street Fighter II/III/6, Garou, Smash Bros., Footsies, Divekick y Shadow Fight 2.
- **Fuelle.** Una barra bajo la vida para pegar y para cubrirse:
  - Se vacía con unos 10 golpes mezclados y se llena en ~3 s, empezando 1,2 s después del último ataque.
  - Cubriéndote no se recupera.
  - A 0 pegando: «¡SIN FUELLE!», no puedes atacar hasta el 30 %.
  - A 0 cubriéndote: «¡GUARDIA ROTA!», mareado 1,1 s.
- **Guardia solo con el joystick abajo** (andar hacia atrás ya no cubre); bloquear desgasta un poco de vida.
- **Guardia justa (parry)**: bajar el joystick ≤140 ms antes del golpe. Para que no se abuse de ella:
  - Solo cuenta si llevabas ≥300 ms sin cubrirte.
  - No cuenta en mitad de un bloqueo.
  - Ponerse en guardia cuesta fuelle.
- **Puño**: rápido y seguro; abre los combos. Contra alguien que salta cerca sale como **gancho antiaéreo**, que lo tira.
- **Patada**: larga y fuerte, pero bloqueada de cerca o fallada se castiga.
- **Agarre**: botón **AGARRE** en lugar de GUARDIA. Es imbloqueable, tira al suelo y se escapa de él pulsando AGARRE a tiempo.
- **Patada en picado** en el aire.
- **Paso rápido**: en el móvil, toque rápido en el joystick y enseguida deslizar hacia un lado; en teclado, doble pulsación de ← o →.
- **¡CONTRA!** y **¡CASTIGO!**: más daño al pillar al rival arrancando un golpe o recuperándose de uno.
- **Retroceso** en golpes y bloqueos. **Regla de esquina**: si el rival está contra el borde, retrocede el que pega.
- **Derribo** con levantarse invulnerable.
- **CPU por dificultad**: agarra al que se cubre, castiga, hace guardia justa, se zafa, usa el picado y respeta su fuelle.
- **«Cómo se pelea»** en el menú y en Pausa, y avisos grandes en pelea.
- **Pruebas del diseño** en `tests/combat.test.cjs`.
- **Arte provisional** para los golpes nuevos (poses giradas). El encargo del arte definitivo está en `ASSETS_COMBATE.md`.

## Hecho en v0.12.2 — Multijugador: diagnóstico y arreglos de sincronía

- **Registro** de cada partida en red. Se puede ver, copiar o compartir desde los resultados o desde la pantalla de Multijugador. Guarda:
  - versión, huella, semilla y móvil;
  - esperas y errores;
  - la primera desincronización, con las **diferencias campo a campo** entre los dos móviles;
  - las últimas instantáneas y entradas.
- **Comprobación** de una instantánea detallada cada 0,5 s (antes eran cuatro números cada 2 s), con el contador de tiradas de azar.
- **Misma versión obligatoria**: los móviles comparan versión y huella del código al conectar. Archivos con `?v=` para no mezclar caché vieja y nueva.
- **Nadie se queda «esperando a tu rival»** si las partidas se separan: el que termina avisa y el otro cierra con su resultado. Sin respuesta en 20 s, se cancela.
- **Trigonometría determinista** en todo lo que mueve la pelea (tropiezos, bamboleo del puntillo, dardo, agarre del pilón), porque iPhone y Android no calculan `Math.sin` exactamente igual.

## Hecho en v0.12.3

- **Botón DASH**: lo pulsas y el siguiente movimiento del joystick decide. Hacia un lado da paso rápido; hacia arriba, **salto doble** (segundo impulso arriba, más alto y más lejos). Hacia abajo no hace nada. Teclado: E o Mayúsculas.

## Hecho en v0.12.4 — Arte de Combate 2.0

- **Arte integrado:**
  - **Animaciones:** 12 tiras nuevas de El Barbas, recoloreadas para los 6 luchadores. Cubren guardia y guardia justa, recibir golpe, agarre y lanzamiento, gancho, puño aéreo y picado, caída y levantarse, salto, mareo y sin fuelle, paso rápido, andar, KO y victoria.
  - **Efectos:** destello de guardia justa, guardia rota, chapas del mareo, impactos, polvo y sudor.
  - **Iconos:** AGARRE y fuelle.
- **Atlas** de 6×16 celdas. Herramienta `tools/integrate_combat_assets.py` para repetir la integración con nuevas entregas.
- **Pendiente de arte:** salto doble (`combat-doublejump.png`, `fx-doublejump.png`) e icono de DASH (`ui-dash.png`).

## Hecho en v0.13 — Rizos, primer luchador con arte propio

- **Rizos** (nombre provisional): melena rizada, abrigo de borrego, vaqueros y botas. Paquete `la-trolina-personaje-rizos` integrado con `tools/integrate_character.py`:
  - 16 tiras con todas las animaciones de Combate 2.0.
  - Copia en `source-art/personajes/rizos` y fotos de referencia en `references/rizos` (fuera de git).
- **Atlas** `assets/characters/rizos.png` con la misma distribución de filas que El Barbas y las poses en el aire bajadas igual que las suyas.
- **Datos propios** en `assets/characters/art-data.js`: mano del botellín, boca para el pitillo y retrato de selección. Los ajustes a mano van en `source-art/personajes/rizos/juego.json`.
- **Mismos tiempos y cajas de golpe** que el resto: sus golpes caen dentro de las cajas comunes (lo comprueba la herramienta). El equilibrio lo marcan las stats (provisionales: vida 96, fuerza 1,05, velocidad 1,08, aguante 0,05, puntería 0,95).
- **Disponible desde el principio**, también en partidas guardadas de antes; no sale en la historia. **Sin ultimate** todavía.
- **Retrato propio** en la selección, la tienda, el ranking, la policía y los desbloqueos.
- Si el atlas común gana filas (p. ej. el salto doble) y el suyo no, el combate le pone las poses provisionales en vez de dejarlo invisible.

## Hecho en v0.14 — Ultimate de Rizos, entrada en patinete y STAB

- **Ultimate de Rizos: «Pausa para el piti».** La pelea se para 2 s y el reloj no corre:
  - Rizos se sienta en un taburete, se fuma un cigarro y recupera el 45 % de su vida.
  - Al levantarse le lanza **la china** al rival, que no se puede bloquear: poco daño, pero lo manda para atrás y lo tumba.
  - Mientras dura, el rival no puede moverse ni pegar, solo **fumar** (la CPU también lo hace).
  - Ajustes en `PITI` y `MOVES.china` (`rules.js`). La CPU la usa cuando ya ha recibido.
- **Entrada en patinete** en el primer asalto: llega desde fuera de la pantalla, frena, se baja y el patinete se queda aparcado detrás de los luchadores. La presentación se alarga lo que dura la entrada.
- **Rizos bajito y muy tanque**: dibujado al 85 % (`size`), con sus cajas de golpe también al 85 %. Vida 150, aguante 0,4, más lento (0,86) y fuerza 0,95. Sus botellines vuelan como los de todos.
- **STAB** (como en Pokémon): cada luchador tiene su bebida y su tabaco. Si los lleva, su fuerza se multiplica ×1,5 por cada uno (×2,25 con los dos).
  - **Rizos**: destornillador y Ducados negros.
  - **El Barbas**: Red Label con cola y Camel.
  - Bebidas y tabaco nuevos en La Barra, con sus iconos: destornillador, Red Label con cola y Camel; el Ducados pasa a «Ducados negros» con cajetilla azul y blanca.
  - Avisos con ★ en La Barra, la selección, el VS, el marcador y al empezar la pelea.
  - La CPU pide sus cosas más cuanto más difícil (`CPU_STAB`).
- **Arte integrado** con `tools/integrate_character.py la-trolina-rizos-ultimate-patinete`:
  - Segunda hoja de 256×224 con ancla (72,208), con el objeto dibujado dentro.
  - Humo, patinete suelto y punto de enlace con el luchador.
  - Copia en `source-art/personajes/rizos/extras`.

## Hecho en v0.14.1 — Rótulos discretos

- Los rótulos de la pelea ya no tapan el escenario. Antes salían en grande en el centro; ahora van en una franja fina justo bajo el marcador:
  - asalto, «¡PELEA!», K.O., «GANA…», victoria, derrota y la policía;
  - el nombre de la ultimate;
  - las frases del modo salvaje.
- Son más pequeños, con letras espaciadas y filetes finos a los lados, sin cajas oscuras. Las frases llevan solo un velo suave para leerse sobre la nieve o de día.
- Se desvanecen solos a los 1,7 s. Así queda un momento para ver dónde se pelea, al presentar el asalto y en la entrada en patinete, y dónde se ha peleado, al final.
- Si coinciden varios, se apilan hacia abajo; con el aviso de la policía bajo el reloj, empiezan más abajo. Posición y tiempos en `TOP_Y`, `BANNER_HOLD` y `BANNER_FADE` (`game/combat/match.js`).

## Hecho en v0.15 — El Sombrerero y las armas

- **El Sombrerero** (nombre provisional; `sombrero` en los archivos). Gorro de pescador, chaqueta gris y bastón de paseo. Disponible desde el principio.
  - Paquete `la-trolina-sombrero-combate` con las 16 tiras del juego en **dos versiones, con y sin bastón**. Se integra con `tools/integrate_character.py`, que ahora entiende paquetes con arma.
  - Copia en `source-art/personajes/sombrero` (`sin-arma/` y `arma/`).
  - Encajar en guardia y guardia justa con 3 fotogramas propios.
  - Flojo a pelo y fuerte con el bastón: fuerza 0,85 (×1,35 con el bastón ≈ 1,15), vida 96, velocidad 1,0. Sin STAB todavía.
  - **Entrada en bici** (BH Gacela blanca) en el primer asalto, con y sin bastón. La bici se queda aparcada detrás.
- **Armas** (`WEAPONS` y `WEAPON` en `rules.js`; dibujo en `game/data/weapons.js`):
  - Con el arma en la mano: más fuerza cuerpo a cuerpo, el puño llega más lejos y cubrirse gasta menos fuelle.
    - Bastón: ×1,35 de fuerza, +25 px de alcance (la punta del bastonazo) y un 30 % menos de fuelle al cubrirse.
    - Botellín empuñado: ×1,2 de fuerza.
  - **Desarme**: con una guardia justa a un golpe suyo cuerpo a cuerpo o con el 3.er golpe seguido de un combo.
  - En el suelo, el bastón se **recoge al pasar por encima** (se agacha 0,44 s; si le pegan, se queda en el suelo). Si no, **vuelve solo a los 10 s** volando a su mano.
  - El botellín se rompe al caer y a los 10 s le ponen otro.
  - Al recuperarlo, 3 s en los que no se lo pueden quitar. La ultimate se lo devuelve al instante.
  - Marcador: icono del arma y «SIN BASTÓN 7s» con la cuenta atrás. Desarmar da 500 puntos.
  - La CPU busca más el combo y la guardia justa contra un rival armado, y va a por su bastón si se le cae.
  - Multijugador: el estado del arma entra en la comprobación de sincronía. Cada uno lleva la suya (sin opción de pruebas).
- **Ultimate de El Sombrerero: «La bolsita»**:
  - recupera el bastón;
  - saca una bolsa blanca atada con hilo verde, la abre y le sopla en la cara al rival (`MOVES.soplo`: si le pilla delante, le deja vendido 1,1 s con la nube en la cara);
  - le arrea un **bastonazo** que no se puede bloquear y lo tumba (`MOVES.remate`).
  - Mientras dura no le pueden pegar ni agarrar. Ajustes en `BOLSA`.
- **Solo en desarrollo**: en la elección de luchador, **«Arma (pruebas)»** para El Sombrerero, El Barbas y Rizos: ninguna, bastón o botellín.
  - Quien no tiene el arma dibujada la lleva dibujada encima, en la mano de cada celda (`assets/characters/hands-data.js`, `tools/build_hands.py`; aproximado).
  - Se quita con `TROLINA_DEV.weaponPicker.enabled = false`. Para probar sin menús: `?autoplay=1&p1=barbas&arma1=baston&arma2=botellin`.
- **Pruebas**: `tests/weapons.test.cjs`.

## Hecho en v0.16 — El interior del bar

- **Nuevo escenario: el interior de La Trolina.** Panorámica del paquete `la-trolina-interior-assets` (barra principal, cafetera, paso de personal, escalera al rincón, futbolín y taburetes), integrada con `tools/integrate_interior.py`. Copia en `source-art/escenarios/interior`.
- **Misma pelea que en la terraza**, pero en una sala más ancha:
  - la cámara sigue a los luchadores de la escalera al futbolín;
  - nunca pueden separarse más que en la terraza (820 px): el borde de la pantalla hace de pared;
  - cada asalto empieza delante de la barra.
- **Luces encendidas o apagadas** (aleatorio o fijo en Opciones). Con las luces apagadas está encendida la **bola de discoteca**:
  - sus reflejos están separados del fondo y giran: por paredes y techo hacia un lado y por el suelo hacia el otro;
  - destellos en los reflejos y en la propia bola;
  - suena la música, que **tapa el ruido de los botellines** para la policía, como la fuente encendida en la terraza.
- **Opciones**: *Escenario* (aleatorio, terraza o interior), *Ambiente de la terraza* y *Luces del interior*. Para probar: `?stage=interior` o `?stage=interior-apagado`.
- **El Peñista sin fuente: «Al fregadero».** Lo tira por encima de la barra, cae al fregadero y se le ve detrás del mostrador, de pecho para arriba. Luego salta de vuelta, empapado. Mismo daño, puntos y «mojado» que «Al pilón».
- **Policía**: dentro no hay coche. Los agentes entran andando por la derecha y las luces azules se ven por las ventanas.
- **Multijugador**: el escenario lo elige el anfitrión. La cámara entra en la comprobación de sincronía y el interior en la huella del código.
- **Pruebas**: `tests/interior.test.cjs`.

## Próximas fases propuestas

### Fase 1b — Ajustar el combate jugando
- [ ] Jugar v0.12 en móviles reales y ajustar números en `rules.js` (`MOVES`, `FUELLE`, `PARRY`…): duración de los asaltos, cuánto se usa el agarre, si la guardia justa es demasiado fácil o difícil.
- [x] Integrar el arte de `ASSETS_COMBATE.md` (v0.12.4).
- [ ] Encargar e integrar el salto doble y el icono de DASH.

### Fase 1 — Publicar y probar con amigos
- [ ] Publicar en GitHub Pages (ver `PUBLICAR.md`) y probar en móviles reales.
- [ ] Ajustar equilibrio con lo que digan: daño, duración de asaltos, fuerza de la niebla, precios.

### Fase 2 — Identidad de personajes
- [ ] Arte propio para cada luchador (fotos de cada amigo → sprites como El Barbas). Hecho: **Rizos** (v0.13) y **El Sombrerero** (v0.15); el resto, con `tools/integrate_character.py`.
- [ ] Ajustar las armas jugando (`WEAPON`, `WEAPONS`): si el combo de 3 y la guardia justa desarman demasiado o demasiado poco, los 10 s de vuelta y la fuerza del bastón. Nombre definitivo de El Sombrerero y de «La bolsita», y su bebida y tabaco (STAB).
- [ ] ¿Más luchadores con arma (p. ej. la bandeja del Camarero, de defensa)? Con arte con y sin ella, como El Sombrerero.
- [ ] Quitar la opción «Arma (pruebas)» cuando acaben las pruebas (`game/data/weapons.js`).
- [x] Ultimate de Rizos (v0.14). Pendiente: ajustar curación, empuje y daño jugando, y su nombre definitivo.
- [ ] Ajustar el STAB (×1,5 por cosa) y el tanque de Rizos jugando; dar bebida y tabaco al resto de luchadores.
- [ ] Salto doble de Rizos cuando se entregue el de El Barbas (misma tira, `combat-doublejump.png`).
- [ ] Animaciones que faltan: caminar, salto, recibir golpe, caída/KO, victoria, beber (las del combate, encargadas en `ASSETS_COMBATE.md`).
- [ ] Ultimate propio para el resto de personajes (la estructura `special` ya existe; p. ej. bandeja del Camarero, sprint del Runner).
- [ ] Pose propia de fumar y de lanzar el dardo.

### Fase 2b — Fuente y fondos nocturnos (assets en camino)
- [x] Fuente definitiva.
- [x] Ambientes noche, día, lluvia, nieve y Navidad.
- [ ] ¿Ambientes ligados a combates de la historia?

### Fase 3 — Cinemáticas
- [ ] Ilustraciones o vídeos cortos por combate en `assets/cinematics/` y registrarlos en `game/data/cinematics.js` (ya admite `image` y `video`).
- [ ] Final del modo historia.

### Fase 4 — Más contenido
- [x] El interior del bar (v0.16), con cámara que recorre la sala.
- [ ] Ajustar el interior jugando: si la sala ancha cambia mucho las peleas (huir, botellines a distancia), la velocidad de la bola de discoteca y si la música debe tapar los botellines.
- [ ] Más escenarios (otros bares): terraza de tres planos (`TerraceStage`) o panorámica ancha como el interior (`tools/integrate_interior.py`).
- [ ] Más objetos de barra y efectos (calimocho, tapa de bravas, chicle de menta…).
- [ ] Música y efectos de sonido grabados.
- [ ] Logros y estadísticas.

### Fase 5 — Multijugador
- [ ] 2 jugadores en el mismo dispositivo (teclado/mandos).
- [ ] Versus online entre casas (WebRTC o servidor WebSocket; ver `PUBLICAR.md`).
