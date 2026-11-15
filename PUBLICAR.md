# Jugar en el móvil y en remoto

El juego es una web estática (HTML + JavaScript + PNG): no necesita servidor propio ni base de datos. Cualquiera de estas opciones vale para que un amigo juegue desde su casa, en el ordenador o en el móvil. La partida (dinero, desbloqueos, mejoras) se guarda en el navegador de cada jugador.

| Opción | Coste | Privacidad | Actualizar | Recomendado para |
| --- | --- | --- | --- | --- |
| **GitHub Pages** | Gratis | El repositorio tiene que ser **público** en el plan gratuito | `git push` y en 1–2 min está online | Opción principal: URL fija tipo `https://omnijulio.github.io/la-trolina/` |
| **itch.io** (proyecto HTML) | Gratis | Puede ser *Draft* con enlace secreto o *Restricted* con contraseña | Subir de nuevo el ZIP | Compartir solo con amigos sin publicar el código |
| **Netlify / Cloudflare Pages** | Gratis | Web pública, código privado | Arrastrar la carpeta o conectar GitHub | Alternativa a GitHub Pages |
| **Red local** (`npm run serve`) | Gratis | Solo tu Wi‑Fi | Inmediato | Probar en tu propio móvil, no sirve para tu amigo |

## Opción recomendada: GitHub Pages

1. En GitHub, crea un repositorio nuevo, por ejemplo `la-trolina` (público).
2. Sube el contenido de esta carpeta. `.gitignore` ya excluye `references/` (las fotos originales de las personas) para que no se publiquen.
3. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. En uno o dos minutos el juego estará en `https://<tu-usuario>.github.io/la-trolina/`. Pasa ese enlace a tu amigo.
5. En el móvil: abrir el enlace → menú del navegador → **Añadir a pantalla de inicio**. Se abre a pantalla completa y en horizontal como una app.

Cada cambio que se suba a `main` se publica solo. El archivo `.nojekyll` evita que GitHub procese la web.

> Al ser público, cualquiera con el enlace puede ver el juego y su código. El botellín usa la imagen de una marca comercial y el personaje está basado en una persona real: para un juego entre amigos no suele ser problema, pero tenlo en cuenta antes de difundirlo.

## Opción privada: itch.io

1. `python3 tools/package_web.py` → genera `build/la-trolina-web.zip` solo con lo necesario para jugar.
2. En itch.io: *Upload new project* → *Kind of project: HTML* → sube el ZIP → marca *This file will be played in the browser*.
3. Tamaño del visor: 960 × 540, con *Mobile friendly* y el botón de pantalla completa activados.
4. Visibilidad: *Draft* y comparte el enlace secreto, o *Restricted* con contraseña (`?password=...` en la URL la rellena sola).

## Probar en tu móvil sin publicar nada

Con el ordenador y el móvil en la misma Wi‑Fi: `npm run serve` (o `python3 -m http.server 8000`) en esta carpeta y abre `http://<IP-del-ordenador>:8000/` en el móvil.

## Más adelante: jugar uno contra otro a distancia

El modo actual es 1 jugador contra la CPU. Para un **versus online** entre dos casas hay dos caminos sin cambiar de hosting:

- **WebRTC entre navegadores** (por ejemplo con PeerJS): uno crea la sala y comparte un código; la web sigue en GitHub Pages. Gratis, pero requiere sincronizar entradas con algo de retardo (rollback/delay).
- **Servidor de partidas** (Node + WebSocket en Render, Fly.io o similar): más robusto, con un pequeño servidor que mantener.

El motor ya separa entradas (`game/core/input.js`) de la lógica (`Combatant.update(dt, controles, …)`), que es la base que necesita cualquiera de las dos opciones.
