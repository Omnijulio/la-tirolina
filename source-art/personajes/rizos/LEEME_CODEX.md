# Rizos — personaje para La Trolina Fighters

Personaje nuevo basado en las cuatro fotos adjuntas. «Rizos» es un nombre provisional editable en `fighter.json`. Se conserva la cara sin barba, el pelo castaño rizado hasta los hombros, el abrigo marrón con cuello y puños de borrego claro, el jersey gris azulado, los vaqueros claros y las botas negras con pequeños detalles plateados.

**Entrega independiente para Codex: imágenes y datos listos para importar. No se ha modificado el juego ni registrado al personaje en su selección.**

## Contenido principal

- `fighter.png`: atlas RGBA completo de **1152 × 2816 px**, seis columnas y dieciséis filas.
- `fighter.json`: treinta secuencias con coordenadas del atlas, duración, bucles, ancla, puntos activos y eventos de lanzamiento.
- `tiras/`: dieciséis PNG transparentes de **1152 × 176 px**, una fila de seis celdas cada uno.
- `guias/`: las mismas tiras sobre fondo de revisión, con ancla verde, puntos activos rosas y puntos del botellín amarillos. No son sprites de producción.
- `portraits/select-128.png`: retrato transparente para selección, 128 × 128.
- `portraits/hud-64.png`: retrato transparente para HUD, 64 × 64.
- `shared/`: copia de los efectos e interfaz comunes ya creados y del botellín Estrella Galicia existente, con sus datos.
- `previews/`: láminas y GIF para revisar las poses, la escala y el personaje junto a El Barbas en la barra.
- `tools/`: utilidades opcionales para comprobar los archivos y reconstruir el atlas a partir de las tiras.
- `referencias/`: las cuatro fotos de identidad aportadas, para futuros ajustes del personaje.

Son **94 poses dibujadas en 96 celdas**. En `grabbed`, las celdas 4 y 5 quedan completamente vacías y transparentes, como en el contrato de Combate 2.0.

## Formato y ancla

- Celdas de **192 × 176 px**; coordenadas e índices desde cero.
- Ancla lógica del actor: **(56,160)**.
- Orientación base: derecha. Para la izquierda, espejar la celda; el punto equivalente en la imagen espejada es **(135,160)**.
- Escala de referencia: unos 141 px de altura en la pose de pie, compatible con el atlas anterior de El Barbas. Las flexiones, pelo en movimiento y brazos levantados alteran la caja visible.
- Alfa de producción binario 0/255; sin fondo, sombra fija, texto ni suelo. Paleta común de 64 colores en las tiras del personaje.
- No recortar ni recentrar automáticamente cada pose por su caja visible. Mantener el lienzo completo y su ancla.
- En las poses estáticas con apoyo, la suela llega a (56,160). Durante la marcha los pies se desplazan respecto al ancla lógica para conservar la continuidad del paso. En el aire, giro, caída y apoyo de rodilla, el ancla continúa representando al actor y no un pie físicamente inmóvil.
- El motor controla el desplazamiento y la física; las imágenes aéreas ya contienen el cambio de postura y una elevación dentro de la celda.

## Filas del atlas

Las primeras cuatro filas mantienen la distribución anterior para facilitar la importación.

| Fila | Tira | Fotogramas |
| --- | --- | --- |
| 0 | `idle` | 0–5 respiración en guardia, bucle |
| 1 | `punch` | 0–2 preparación; 3 puño activo; 4–5 recuperación |
| 2 | `kick` | 0–2 preparación; 3 patada activa; 4–5 recuperación |
| 3 | `throwBottle` | 0–2 cargar; 3 liberar proyectil; 4–5 recuperar |
| 4 | `guard` | 0–1 entrar; 2–3 mantener; 4 bloquear impacto; 5 parry |
| 5 | `hit` | 0–1 flojo; 2–3 fuerte; 4–5 reacción aérea |
| 6 | `grab` | 0 preparar; 1 avanzar; 2 agarrar; 3 sujetar; 4 girar; 5 soltar |
| 7 | `grabbed` | 0 atrapado; 1 levantado; 2 lanzado; 3 cayendo; **4–5 vacías** |
| 8 | `gancho` | 0 agacharse; 1 impulsar; 2 activo; 3 cima; 4 bajar; 5 recuperar |
| 9 | `air` | 0–1 puño aéreo; 2–3 picado; 4–5 aterrizar y recuperar |
| 10 | `knockdown` | 0 caída; 1 impacto; 2 tumbado; 3 girar; 4 rodilla; 5 levantado |
| 11 | `jump` | 0 preparar; 1 subir; 2 cima; 3 bajar; 4 aterrizar; 5 guardia |
| 12 | `dizzy` | 0–3 mareo; 4–5 jadeo sin fuelle |
| 13 | `dash` | 0–2 avance; 3–5 retroceso |
| 14 | `walk` | 0–5 marcha en guardia, bucle |
| 15 | `ko-win` | 0–2 KO; 3–5 victoria |

## Treinta secuencias configuradas

`idle`, `punch`, `kick`, `throwBottle`, `guardEnter`, `guard`, `guardHit`, `parry`, `hit`, `hitHeavy`, `hitAir`, `grab`, `grabHold`, `grabbed`, `gancho`, `airPunch`, `dive`, `land`, `down`, `getup`, `jump`, `crouch`, `dizzy`, `tired`, `dash`, `backdash`, `walk`, `walkBack`, `ko`, `win`.

Cada secuencia referencia los dibujos de las tiras; las variantes no duplican imágenes. `crouch` mantiene la preparación agachada del salto. `walkBack` recorre al revés las seis poses de marcha. `grabHold` mantiene el cuadro 3 del agarre. `dive`, `down`, `ko` y `win` solicitan mantener su último cuadro hasta que el motor cambie el estado.

El JSON usa los campos `x`, `y`, `w`, `h`, `duration`, `hurtbox`, `hitboxes`, `itemSocket` y `events`, siguiendo la estructura del atlas previo. La duración está en milisegundos. Las cajas de golpe y recepción son una propuesta visual inicial para ajustar al balance del juego; los puntos de las guías permiten verificarlas. El agarre señala su contacto mediante `grab-active`.

## Botellín universal y efectos comunes

La animación de lanzamiento tiene las manos vacías porque el botellín se dibuja por separado. `itemSocket` marca la mano en los cuadros 0–3 y el cuadro 3 emite un evento `spawn-projectile` con `weapon: "bottle"`. El integrador debe consumir ese evento una sola vez al entrar en el cuadro. No repetirlo en cada actualización mientras el cuadro esté visible.

`shared/bottle.json` conserva los datos del botellín común y apunta a los PNG incluidos. `shared/effects.json` describe parry, rotura de guardia, las tres chapas del mareo, impacto flojo/fuerte, polvo/salpicadura, sudor y los iconos de agarre/fuelle. Las rutas de estos JSON son relativas a la raíz del paquete.

Si esos recursos ya existen en el proyecto de destino, se pueden reutilizar sus copias y ajustar las rutas. Los efectos comunes no están incrustados en los sprites del luchador. Este paquete entrega la cobertura de animación conocida del juego; no asigna al personaje un ultimate nuevo ni modifica las mecánicas globales de policía o fuente.

## Importación con Codex

1. Copiar la carpeta del personaje a la ubicación de personajes elegida por el proyecto.
2. Registrar su `id: "rizos"`, nombre provisional, retratos y `fighter.json` en el selector.
3. Cargar el atlas completo o, alternativamente, las tiras separadas. No dibujar ambos.
4. Enlazar los nombres de estado del motor con las secuencias del JSON y conservar el ancla al espejar.
5. Conectar los eventos del botellín y del agarre, los recursos comunes y las transiciones `holdLastFrame` con la lógica existente.
6. Revisar tiempos, cajas de colisión y balance en el juego de destino.

Las utilidades requieren Python 3 y Pillow. Desde esta carpeta:

```sh
python3 tools/validate_assets.py
python3 tools/rebuild_atlas.py
```

Las vistas de `previews/` contienen fondos y, en la prueba de escala, otro luchador únicamente para revisión. El GIF repasa las poses; no es una simulación de la física ni de las transiciones de combate. Los PNG de producción contienen solo al personaje o el recurso correspondiente.

`PROMPTS_GENERACION.json` conserva los prompts de la generación integrada. `COMPROBACION.json` resume los controles y `MANIFEST_SHA256.txt` permite verificar la integridad de la entrega. El proyecto anterior mantiene sus 134 archivos sin cambios.
