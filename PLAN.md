# La Trolina Fighters — plan del proyecto

Estado: **v0.12.3** (16/11/2026). Un jugador contra la CPU, en navegador de escritorio y móvil, publicado en GitHub Pages.

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

## Próximas fases propuestas

### Fase 1b — Ajustar el combate jugando
- [ ] Jugar v0.12 en móviles reales y ajustar números en `rules.js` (`MOVES`, `FUELLE`, `PARRY`…): duración de los asaltos, cuánto se usa el agarre, si la guardia justa es demasiado fácil o difícil.
- [ ] Integrar el arte de `ASSETS_COMBATE.md` cuando llegue (filas nuevas del atlas + `build_characters.py`).

### Fase 1 — Publicar y probar con amigos
- [ ] Publicar en GitHub Pages (ver `PUBLICAR.md`) y probar en móviles reales.
- [ ] Ajustar equilibrio con lo que digan: daño, duración de asaltos, fuerza de la niebla, precios.

### Fase 2 — Identidad de personajes
- [ ] Arte propio para cada luchador (fotos de cada amigo → sprites como El Barbas).
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
- [ ] Nuevos escenarios (otros bares) con el mismo formato de tres planos.
- [ ] Más objetos de barra y efectos (calimocho, tapa de bravas, chicle de menta…).
- [ ] Música y efectos de sonido grabados.
- [ ] Logros y estadísticas.

### Fase 5 — Multijugador
- [ ] 2 jugadores en el mismo dispositivo (teclado/mandos).
- [ ] Versus online entre casas (WebRTC o servidor WebSocket; ver `PUBLICAR.md`).
