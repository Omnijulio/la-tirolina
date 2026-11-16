# Intervención de Policía Local — v1.4 (kit) + integración en el juego v0.4

Mecánica nueva basada en las dos referencias del usuario: agente con uniforme azul/negro y banda de damero, y patrulla blanco/azul con bandas de alta visibilidad. Mantiene la estética pixel art del resto del juego.

## En el juego (v0.4)

En `index.html` la intervención ya no depende de los puntos de incidente de la demo, sino de un **nivel de ruido** (`TrolinaRules.NOISE`, barra «RUIDO» bajo el reloj):

| Fuente | Ruido |
| --- | --- |
| Botellín lanzado | 10 + 8 por cada botellín anterior lanzado en los 6 s previos (racha) |
| Botellín que se rompe | 8 |
| Golpe / bloqueo / dardo / KO | 1,5 / 0,5 / 10 / 15 |
| Puntillo de los dos luchadores | +2 por segundo × (puntillo 1 + puntillo 2) |
| Calma | −4 por segundo |

Al llegar a 100 se llama a `PoliceIntervention.trigger('noise')` (con `automatic = false`; los agentes se colocan entre los dos luchadores). La pelea sigue durante aviso, llegada y despliegue; al dar el alto (`onStop`) se bloquea, se separan los luchadores y desaparecen proyectiles. Al terminar la radio (`onResolved`) el juego aplica la consecuencia (`TrolinaRules.policeOutcome`):

- 1.ª y 2.ª intervención seguidas: **multa** a los dos (30 € y 60 €; el jugador paga lo que tenga) y la **pelea se reinicia** desde el primer asalto con lo mismo pedido en la barra (cuenta atrás de 8 s o botón).
- 3.ª seguida: **noche en el calabozo**: los dos personajes quedan bloqueados 1 minuto real (`Save.jail`), con cuenta atrás en la selección. Los avisos vuelven a cero.
- Terminar una pelea normalmente pone la racha a cero.
- Si la pelea acaba antes del alto, la patrulla «llega tarde» y se retira.
- Se desactiva en **Opciones → Policía Local**. «Reducir mareo» quita los destellos.
- La CPU (Normal o más) tira menos botellines cuando el ruido supera 60.

El controlador `src/police.js` y los assets se usan sin cambios. La demo con policía del kit sigue en `fighter-preview.html` / `police-preview.html` (Fighter Lab), generadas con `python3 tools/build_demo.py`.

## Probar ahora

En el Fighter Lab: abre `police-preview.html` o `fighter-preview.html`. La secuencia automática de ataques acaba provocando una intervención. También puedes usar **I** o el botón «Intervención policial» para verla inmediatamente. **R** o «Reiniciar pelea» restablece la escena.

Hay dos controles independientes: «Secuencia automática» reproduce los movimientos del luchador; «Intervención automática» permite que sus acciones avisen a la policía. Desactivar la segunda deja disponible la activación manual. «Destellos azules» desactiva el cambio de luces y la iluminación intermitente sin alterar la mecánica. En la demo se desactivan inicialmente los destellos cuando el navegador solicita movimiento reducido. No hay audio de sirena.

Cuando los agentes dan el alto, los ataques quedan bloqueados, los luchadores vuelven a guardia y desaparecen los proyectiles. La escena termina en **Pelea interrumpida** hasta reiniciarla. No se añade una detención, un ataque de agentes ni un sistema de multas: la consecuencia implementada es detener el combate de la demo.

## Secuencia y valores iniciales

Estos valores son decisiones iniciales configurables, no reglas que haya fijado el usuario.

| Estado | Duración inicial | Qué sucede |
| --- | --- | --- |
| `idle` | Hasta actividad suficiente o activación manual | No hay patrulla ni agentes |
| `warning` | 1200 ms | Aviso de llegada |
| `arriving` | 2200 ms | El patrulla entra desde la derecha y se detiene |
| `deploying` | 2600 ms | Dos instancias del agente caminan desde la derecha hasta el centro |
| `stopping` | 1600 ms | Gesto de alto; se bloquea el combate y se llama `onStop` una sola vez |
| `radio` | 1800 ms | Comunicación por radio; el bloqueo continúa |
| `resolved` | Hasta `reset()` | Fin de la intervención, agentes en posición y combate bloqueado |

La intervención automática se inicia al acumular **5 puntos de incidente**. Puñetazo y patada suman 1 cada uno; lanzamiento de botellín suma 2. La demo notifica acciones aceptadas al iniciarlas, no impactos. Alternativamente se activa a los **20 segundos desde la primera acción**, si sigue en espera. No hay intervención automática si nunca hubo actividad.

La secuencia de aviso a resolución dura 9400 ms con los valores iniciales. El bloqueo empieza al entrar en `stopping`, 6000 ms después del aviso. Los ataques pueden continuar durante aviso, llegada y despliegue. Una vez iniciada una intervención no se generan otras en paralelo. `reset()` permite una nueva.

## Archivos nuevos

| Archivo | Contenido |
| --- | --- |
| `assets/police/officer.png` | Atlas RGBA de 1152×704, seis columnas y cuatro filas |
| `assets/police/frames/idle-*.png` | Seis poses de espera |
| `assets/police/frames/walk-*.png` | Seis poses para caminar |
| `assets/police/frames/stop-*.png` | Seis poses de gesto de alto |
| `assets/police/frames/radio-*.png` | Seis poses de uso de radio |
| `assets/police/patrol.png` | Coche base, PNG transparente de 320×160 |
| `assets/police/patrol-lights.png` | Atlas de cuatro estados de luz, 1280×160 |
| `assets/police/frames/patrol-*.png` | Cuatro estados de luz independientes de 320×160 |
| `assets/police/police.json` | Poses, coordenadas, anclas y configuración de intervención |
| `assets/police/police-data.js` | Los mismos datos disponibles en HTML local sin `fetch` |
| `src/police.js` | Controlador reutilizable de intervención, sin DOM ni audio |
| `police-intervention.gif` | Previsualización de la secuencia con los sprites y el motor reales |
| `assets/police/intervention-preview.png` | Imagen compuesta del gesto de alto |
| `assets/police/sprites-guide.png` | Guía visual de todos los sprites nuevos |
| `source-art/police-*.png` | Originales gráficos para reconstrucción |
| `references/policia-*` | Las dos imágenes nuevas del usuario |

Hay **24 poses nuevas de agente y 4 fotogramas de luces**. Se reutiliza el mismo agente para dos instancias. `hold` es una animación virtual que mantiene el cuarto fotograma de alto; no es otro PNG.

Las celdas del agente miden 192×176 y su ancla es **(80,160)**. Este ancla es distinta de la del luchador, (56,160); el controlador usa la ficha de cada uno. El patrulla mira a la izquierda y tiene ancla **(160,148)**. Las poses de caminar y los gestos del agente se reflejan para las dos orientaciones. No recentres los PNG por su caja visible.

## Integración

Carga primero `Fighter` y después los datos y módulo policial:

```html
<script src="src/fighter.js"></script>
<script src="assets/police/police-data.js"></script>
<script src="src/police.js"></script>
```

Después de cargar las imágenes indicadas en `POLICE_DATA.officer.image` y `POLICE_DATA.patrol.image`:

```js
const police = new PoliceIntervention({
  officer: imagenAtlasAgente,
  patrol: imagenAtlasPatrulla
}, POLICE_DATA, {
  onStop: () => {
    for (const actor of luchadores) actor.play('idle', true);
    botellines.reset();
    // Detener aquí también cualquier reproducción automática de ataques.
  },
  onResolved: () => {
    // Mostrar aquí el resultado de la pelea interrumpida.
  }
});
```

Antes de aceptar ataques, comprueba `police.blocksCombat`. Después de aceptar un ataque, notifica su nombre:

```js
if (!police.blocksCombat && actor.play('punch')) {
  police.notifyAction('punch');
}
if (!police.blocksCombat && botellines.throw(actor)) {
  police.notifyAction('throwBottle');
}
```

El módulo comunica el bloqueo y sus eventos; tu integración debe respetarlos. La demo principal ya lo hace. No uses `force:true` para saltarte el bloqueo de policía.

En cada actualización:

```js
police.update(deltaMs);
for (const actor of luchadores) actor.update(deltaMs);
botellines.update(deltaMs, luchadores, luchadores);
```

Los agentes tienen su propia actualización dentro del módulo: no vuelvas a actualizar `police.officers` desde fuera. La demo no los incluye como objetivos de los botellines. El coche y los agentes son NPC/decorado de intervención, no nuevos luchadores seleccionables.

En el plano delantero del escenario:

```js
escenario.draw(ctx, {
  cameraX,
  view: 'all',
  drawActors: c => {
    police.drawBack(c, {flashes:true}); // Patrulla detrás de los luchadores.
    for (const actor of luchadores) actor.draw(c);
    botellines.draw(c, luchadores);
    police.drawFront(c);               // Agentes delante.
  }
});
police.drawOverlay(ctx, {flashes:true}); // Mensaje, fuera del desplazamiento de cámara.
```

Se conserva el escenario de tres planos. El patrulla, luchadores, agentes y proyectiles son elementos dinámicos del tercer plano; no están incrustados en la pared ni en las mesas. Las coordenadas iniciales están pensadas para Canvas 960×540, con pies en y=486. El coche se apoya en y=426 para quedar un poco detrás de los personajes.

## API

- `notifyAction('punch'|'kick'|'throwBottle')`: añade puntos cuando está en espera; ignora acciones desconocidas o posteriores a la activación.
- `trigger(reason='manual')`: activa si está en `idle`; devuelve `false` si ya hay una intervención.
- `automatic = true/false`: permite/desactiva el disparo por actividad. No cancela una intervención que ya comenzó.
- `update(deltaMs)`: avanza la secuencia y los agentes; maneja actualizaciones grandes sin omitir fases.
- `blocksCombat`: se activa al dar el alto y permanece hasta reiniciar.
- `active`: indica que dejó de estar en espera.
- `reset()`: retira patrulla/agentes y borra incidentes y temporizador. Conserva la opción `automatic`.
- `getStatus()`: estado, texto, incidentes, umbral y bloqueo.
- `snapshot()`: estado de patrulla/agentes para previsualización y herramientas; no aplica daño.
- Callbacks: `onStateChange`, `onStop`, `onResolved`, `onReset`.

Los parámetros están en `POLICE_DATA.settings`, dentro de `assets/police/police.json`. Cambia JSON y ejecuta `python3 tools/build_demo.py`. La reconstrucción de imágenes conserva los ajustes existentes de `settings`.

## Reconstruir y comprobar

`python3 tools/build_police.py` recorta y empaqueta los originales de agente/patrulla, sin llamadas externas ni claves. `python3 tools/rebuild_assets.py` incluye este paso dentro de la reconstrucción completa. `python3 tools/build_demo.py` incorpora datos, código e imágenes a las tres salidas HTML autónomas.

`python3 tools/render_police_preview.py` obtiene estados del mismo controlador mediante Node y renderiza el GIF con Pillow. Requiere las dependencias opcionales de `requirements-art.txt`.

`npm test` ejecuta cuatro suites: luchador/botellín, escenario, policía e integración de la demo. Se comprueban activación automática/manual, temporizador, orden de fases, movimientos, bloqueo, limpieza de proyectiles, reinicio y recursos incrustados.

La integración se ha probado ejecutando los scripts reales con un adaptador DOM/Canvas en Node. Eso comprueba conexiones y estados, pero no sustituye la revisión visual y de controles en un navegador. La revisión en navegador sigue pendiente en este entorno. El GIF y la composición estática sí se inspeccionaron visualmente.
