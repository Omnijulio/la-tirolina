# Sombrero · La Trolina Fighters

Copia `con-baston/`, `sin-baston/`, `extras/` y `portraits/` como carpetas hermanas. Cada variante tiene su propio `fighter.json`, atlas y 16 tiras transparentes. Las claves y el orden de las filas coinciden con Rizos. Los nombres `combat-*.png` coinciden con el encargo de arte. `shared/` contiene el botellín y los efectos comunes por si el proyecto de destino necesita esas copias.

## Las 16 tiras

| Fila | PNG | Orden de las celdas |
| --- | --- | --- |
| 0 | `idle.png` | Guardia, bucle |
| 1 | `punch.png` | Preparación, contacto en 3, recuperación. Bastonazo con bastón y puñetazo sin él. |
| 2 | `kick.png` | Preparación, patada en 3, recuperación |
| 3 | `throwBottle.png` | Preparación, suelta el botellín en 3, recuperación |
| 4 | `combat-guard.png` | 0–1 entrada, 2–3 guardia, 4 bloqueo, 5 guardia justa |
| 5 | `combat-hit.png` | 0–1 impacto leve, 2–3 fuerte, 4–5 aéreo |
| 6 | `combat-grab.png` | Preparar, avanzar, agarrar, sujetar, girar, soltar |
| 7 | `combat-grabbed.png` | Capturado, levantado, lanzado, cayendo. Celdas 4 y 5 vacías. |
| 8 | `combat-gancho.png` | Agacharse, impulso, gancho activo en 2, cima, bajar, recuperar |
| 9 | `combat-air.png` | 0–1 puño en el aire, 2–3 picado, 4–5 aterrizaje |
| 10 | `combat-knockdown.png` | Caída de espaldas, contacto, tumbado, giro, rodilla, levantamiento |
| 11 | `combat-jump.png` | Preparar, subir, cima, bajar, amortiguar, guardia |
| 12 | `combat-dizzy.png` | 0–3 mareo, 4–5 sin fuelle |
| 13 | `combat-dash.png` | 0–2 avance, 3–5 retroceso |
| 14 | `combat-walk.png` | Seis fotogramas de marcha |
| 15 | `combat-ko-win.png` | 0–2 KO de lado, 3–5 victoria |

Cada tira mide **1152 × 176** y cada atlas **1152 × 2816**. Las celdas son **192 × 176** con alfa 0/255. Ambos atlas usan el ancla **(56,160)**, los mismos índices, fases y duraciones. El píxel verde de las guías marca ese ancla. Las poses aéreas o en caída y los pasos mantienen el mismo origen lógico durante el movimiento.

## Mano, bastón y extras

- `handSocket` marca la mano en cada fotograma de ataque. `activePoint` marca el contacto en los fotogramas activos. En las guías son círculos amarillos y rosas respectivamente. `caneSocket` localiza el agarre para iniciar la caída del bastón. Los puntos son locales a la celda, con origen en la esquina superior izquierda. Aplica el mismo reflejo que al personaje.
- `extras/baston.png` es el PNG suelto de la entrega anterior. El motor puede rotarlo al caer alrededor de `cane.grip` en `extras/extras.json`.
- `extras/ui-baston.png` es el icono transparente de **32 × 32** del marcador.
- La recogida tiene tres celdas, **576 × 176**. Usa `recoger-baston-sin-baston.png` para inclinarse y alcanzar la pieza. Al entrar en la tercera celda dispara `cane-pickup`, retira el bastón del suelo y muestra el último dibujo de `recoger-baston-con-baston.png`. La mano está marcada en las tres poses.
- Para activar la ultimate, equipa el bastón y retira su sprite del suelo antes de la primera pose. La bolsa blanca y su hilo verde están integrados en los dibujos. `ultimate-puff` y `ultimate-impact` marcan los momentos del soplo y el golpe posterior. La hoja del soplo y los PNG de bolsa cerrada y abierta también están disponibles por separado.
- `extras/entrada.json` conserva la entrada en bicicleta y referencia sus dos variantes. El botellín se dibuja siempre aparte con `itemSocket`.

Abre `index.html` para revisar la demo autónoma. **D** suelta el bastón, **P** lo recoge y **U** ejecuta la ultimate. «Ver animación» ofrece los estados de combate. El HTML de revisión lleva sus hojas embebidas. Para importar arte usa las carpetas de las variantes y `extras/extras.json`.

`python3 tools/validate_assets.py` comprueba el formato con Pillow. `previews/ultimate.gif` muestra la secuencia de la bolsa y el bastonazo.
