# Multijugador (experimental)

Dos jugadores, cada uno en su móvil (o navegador), uno contra otro.

## Cómo se juega

1. Los dos abren https://omnijulio.github.io/la-tirolina/ (mejor en horizontal; pulsad **Pantalla completa**).
2. Móvil A: **Multijugador → Crear sala**. Sale un código de 4 letras (y un botón para compartir el enlace).
3. Móvil B: **Multijugador**, escribe el código y **Unirse** (o abre el enlace compartido, que entra solo).
4. Al conectar, cada uno elige luchador (todos disponibles) y pide en **La Barra**, que es libre. Pulsad **¡Listo!**.
5. Cuando los dos están listos: pantalla VS y a pelear. El que crea la sala es el de la izquierda.
6. Al acabar: **Revancha** (los dos) o **Salir**.

Requisitos: internet en los dos (mejor la misma wifi). No hay pausa. Si uno cierra o pierde la conexión, el otro vuelve al menú con un aviso.

## Cómo funciona

- **Conexión**: PeerJS 1.5.5 (`game/vendor/peerjs.min.js`, licencia MIT en `game/vendor/PEERJS-LICENSE.txt`), cargado solo al entrar en el multijugador. Su servidor público gratuito sirve para presentarse (ID `trolina-fighters-v1-<CÓDIGO>`); después los dos navegadores hablan por WebRTC (con los STUN/TURN públicos de PeerJS si hace falta).
- **Pelea en lockstep** (`game/net/net.js`): los dos simulan la misma pelea a 60 pasos por segundo. Cada uno manda lo que pulsa para 5 pasos después (≈83 ms) y solo avanza cuando tiene las entradas del otro («ESPERANDO A TU RIVAL» si no llegan). El azar del combate sale de una semilla común (`Math.random` se sustituye solo dentro de cada paso; el sonido y el clima usan el azar real).
- **Comprobación**: cada 0,5 s (30 pasos) comparan una instantánea detallada de la pelea: vida, posición, velocidad, fuelle, animación, aturdimientos, munición, botellines en el aire, reloj y tiradas de azar gastadas. Si no coincide se muestra «⚠ DESINCRONIZADO» y los dos se mandan su instantánea para apuntar qué campos difieren.
- **Misma versión**: al conectar, cada móvil manda su versión (`TrolinaRules.GAME_VERSION`) y una **huella** del código y los datos que deciden la pelea (`TrolinaNet.FINGERPRINT`). Si no coinciden (por ejemplo, un móvil con la versión anterior en caché), no se deja pelear y se pide recargar en los dos.
- **Fin de la pelea**: el que termina avisa al otro (`end`). Si el otro no ha terminado (desincronizado), termina con el resultado del primero, en vez de quedarse «ESPERANDO A TU RIVAL». Si el rival no manda nada durante 20 s, se cancela.
- **Trigonometría determinista**: lo que mueve la pelea usa `dsin`, `dcos`, `datan2` y `dhypot` de `rules.js` (solo sumas, productos, divisiones y raíz cuadrada), porque `Math.sin` y compañía no dan exactamente lo mismo en iPhone y en Android. `tests/net.test.cjs` comprueba que no se cuele `Math.sin` en la simulación.
- **Reglas**: sin policía ni modo salvaje; ambiente, fuente y jardinera los decide el anfitrión. Cada uno usa sus propios huecos de La Barra (mejoras compradas). No da dinero ni desbloqueos (solo cuenta victorias en `stats.online`).
- **Pruebas sin internet**: `?nettest=1` en dos pestañas del mismo navegador (BroadcastChannel en lugar de PeerJS).

## Registro y diagnóstico (v0.12.2)

Cada partida en red deja un **registro** en el móvil (`localStorage`, clave `trolina-netlog`):

- **Datos de la partida:** versión y huella, lado, semilla, móvil (navegador), ambiente y pedidos.
- **Esperas:** en qué paso y cuánto duraron.
- **Desincronización:** el primer paso, las dos instantáneas y la lista de **diferencias campo a campo** (por ejemplo, `P1.x: aquí 268.66 / rival 270.1`).
- **Errores de JavaScript** y el **final** (normal, cerrado con el resultado del rival, o rival sin respuesta).
- **Lo último de la pelea:** las 40 últimas instantáneas y las entradas de los últimos 900 pasos, unos 15 s.

Para verlo:

- **En los resultados** de una partida en red, botón **📋 Registro**.
- **En la pantalla de Multijugador**, **📋 Registro de la última partida**.
- **Compartir** lo manda como archivo `.txt` (WhatsApp, correo…); **Copiar**, como texto.

Para encontrar un fallo hace falta el registro de **los dos móviles**: la primera línea `DIFERENCIAS` dice qué se separó y en qué paso.

## Límites conocidos

- Si un móvil se va a segundo plano, el otro se queda esperando.
- Entre navegadores muy distintos (por ejemplo iPhone y Android) la trigonometría ya no se usa en la simulación; si aun así aparece el aviso, el registro dirá qué campo se separa.
- Con redes muy restrictivas (algunas wifi de empresa) la conexión directa puede fallar.
