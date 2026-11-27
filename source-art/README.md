# Originales gráficos seleccionados

Imágenes ya generadas durante el trabajo, conservadas para volver a empaquetar los assets sin solicitar nuevas generaciones.

| Archivo | Uso |
| --- | --- |
| `fighter-base.png` | 18 poses originales de guardia, puño y patada |
| `fighter-throw.png` | 6 poses originales para lanzamiento, con manos sin botella |
| `bottle-estrella-galicia.png` | Botellín pixel art correspondiente a la última referencia |
| `stage-wall.png` | Fachada y pavimento sin mobiliario |
| `stage-tables.png` | Mobiliario sobre transparencia |

`tools/rebuild_assets.py` reconstruye los recursos finales a partir de estos originales. Los ajustes de recorte, ancla, escala y extracción de la franja frontal están codificados en los scripts. La dirección visual está descrita en `ART_DIRECTION.txt`.

## Originales policiales de v1.4

- `police-officer.png`: 24 poses del agente sobre transparencia; espera, caminar, alto y radio.
- `police-patrol.png`: coche base sin escena ni personas. Los cuatro estados geométricos de luz se empaquetan desde este original.

`tools/build_police.py` produce los PNG y metadatos. No necesita una nueva generación de imágenes.

## Interior del bar (v0.16)

`escenarios/interior/`: lo necesario del paquete `la-trolina-interior-assets` (fondos, mostradores, muebles, `escenario.json` y `LEEME.md`). `tools/integrate_interior.py` lo reescala y escribe `assets/stages/interior/`. Sin argumentos usa esta copia.

## Menú del bar (v0.17)

`menu-bar/`:

| Carpeta o archivo | Contenido |
| --- | --- |
| `paquete/` | El paquete `la-trolina-assets-menu-bar`: capas del menú, interfaz, **objetos jugables y efectos para el interior** (aún sin usar) y `LEEME.txt` |
| `vistas/` | Las seis vistas de `la-trolina-vista-entrada` |
| `alineacion.json` | Cómo pasan las capas del paquete a las vistas |
| `mascaras/` | Siluetas de los objetos que se iluminan; se pueden retocar a mano |

`tools/integrate_menu_bar.py` escribe `assets/menu/`.

