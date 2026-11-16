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
- **Comprobación**: cada 2 s comparan un resumen (vida, posiciones, reloj). Si no coincide se muestra «⚠ DESINCRONIZADO».
- **Reglas**: sin policía ni modo salvaje; ambiente, fuente y jardinera los decide el anfitrión. Cada uno usa sus propios huecos de La Barra (mejoras compradas). No da dinero ni desbloqueos (solo cuenta victorias en `stats.online`).
- **Pruebas sin internet**: `?nettest=1` en dos pestañas del mismo navegador (BroadcastChannel en lugar de PeerJS).

## Límites conocidos

- Si un móvil se va a segundo plano, el otro se queda esperando.
- Entre navegadores muy distintos (por ejemplo iPhone y Android) podría haber desincronizaciones por diferencias de coma flotante; si aparece el aviso, avisa.
- Con redes muy restrictivas (algunas wifi de empresa) la conexión directa puede fallar.
