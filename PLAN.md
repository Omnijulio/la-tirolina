# La Trolina Fighters — plan del proyecto

Estado: **v0.4** (16/11/2026). Un jugador contra la CPU, en navegador de escritorio y móvil, publicado en GitHub Pages.

## Hecho en v0.2

- **Juego completo de 1 jugador**: combates al mejor de 3 asaltos de 60 s, vida, KO, tiempo, cámara, golpes, guardia, salto, retroceso, chispas, combos y sonido sintetizado.
- **IA con 4 dificultades** (Fácil, Normal, Difícil, Pesadilla): reacción, agresividad, guardia, antiaéreos, errores, daño y pedido de botellines de la CPU.
- **Mecánica troncal del botellín**: antes de cada combate, *La Barra* permite pedir hasta 10 botellines a 2,90 €. Cada uno da +7 % de fuerza y un envase para lanzar por asalto, y sube el *puntillo*. El puntillo crece con el tiempo de combate y provoca niebla, visión doble, balanceo de pantalla, tropiezos, golpes al aire, lanzamientos imprecisos y retraso en los controles.
- **Objetos de barra** que lo compensan o dan otros efectos: café, agua, tortilla, bocata, orujo, bebida energética y gafas de sol.
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

## Próximas fases propuestas

### Fase 1 — Publicar y probar con amigos
- [ ] Publicar en GitHub Pages (ver `PUBLICAR.md`) y probar en móviles reales.
- [ ] Ajustar equilibrio con lo que digan: daño, duración de asaltos, fuerza de la niebla, precios.

### Fase 2 — Identidad de personajes
- [ ] Arte propio para cada luchador (fotos de cada amigo → sprites como El Barbas).
- [ ] Animaciones que faltan: caminar, salto, recibir golpe, caída/KO, victoria, beber.
- [ ] Ultimate propio para el resto de personajes (la estructura `special` ya existe; p. ej. bandeja del Camarero, sprint del Runner).
- [ ] Pose propia de fumar y de lanzar el dardo.

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
