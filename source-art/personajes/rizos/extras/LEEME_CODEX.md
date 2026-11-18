# Rizos: ultimate del taburete y entrada en patinete

Paquete independiente de imágenes, datos y vistas para importar con Codex. Incluye la entrega anterior completa de Rizos en `personaje-base/` y las dos acciones nuevas. El proyecto del juego y la carpeta anterior permanecen sin cambios.

## Acciones nuevas

| Tira | Contenido | Cuadros |
| --- | --- | --- |
| `ultimate-sit` | Acercarse, apoyarse, sentarse, sacar el cigarrillo | 6 |
| `ultimate-smoke` | Llevar el cigarrillo a los labios, calada, exhalación y descanso | 6, bucle |
| `ultimate-rise` | Bajar la mano, guardar el cigarrillo, levantarse y recuperar guardia | 6 |
| `scooter-ride` | Impulso y rodaje hacia la derecha | 6, bucle |
| `scooter-brake` | Frenar, bajar una bota y parar | 6 |
| `scooter-dismount` | Apoyarse en el suelo y soltar el manillar | 4; celdas 4 y 5 vacías |

Son **34 poses nuevas**, además de las 94 poses del paquete base incluido. La bajada termina con el evento de retorno a la guardia `idle` del personaje base.

## Archivos de producción

- `extras-atlas.png`: atlas RGBA de **1536 × 1344**, seis columnas y seis filas.
- `tiras/`: seis tiras de **1536 × 224**, con seis celdas cada una.
- `extension.json`: coordenadas, tiempos orientativos, anclas, secuencias y eventos.
- `objetos/taburete.png`: taburete completo de madera oscura, asiento redondo, cuatro patas curvas y aro reposapiés. Celda 128 × 144, ancla (64,136).
- `objetos/patinete.png`: patinete eléctrico gris oscuro con cable rojo y reflector naranja. Celda 192 × 176, ancla (96,160). El manillar y la rueda delantera están a la derecha.
- `objetos/kit-cigarrillo.png`: atlas de seis accesorios, celdas de 48 × 48: cigarrillo apagado, encendido, brasa durante calada, mechero cerrado, mechero con llama y ceniza.
- `efectos/humo.png`: seis fases de exhalación, celdas de 96 × 128; ancla emisora (17,87), duración sugerida 90 ms/cuadro y opacidad 0,75.

Los sprites de las acciones **ya contienen personaje y objeto juntos** para conservar sus contactos al reproducirlos. El pequeño cigarrillo también está dibujado en las poses correspondientes. El humo se mantiene completamente separado. Los objetos independientes permiten otros usos o una implementación con objetos propios. No superponer el taburete o el patinete independiente encima de un cuadro que ya lo incluye.

## Cambio de tamaño y ancla

Las acciones nuevas tienen **celdas 256 × 224 y ancla (72,208)**, que representa el apoyo del objeto en el suelo. La ampliación del lienzo deja espacio para el taburete y el patinete; el cuerpo mantiene aproximadamente la escala anterior. Los márgenes transparentes son parte de la colocación y no deben recortarse.

El personaje base sigue usando **192 × 176 y ancla (56,160)**. Cargar `extras-atlas.png` como una segunda hoja, cambiando el tamaño de celda y el ancla al entrar en estas acciones. No pegar estas filas directamente al atlas anterior: sus celdas tienen otro tamaño.

Las rectas de dibujo del JSON son relativas a la esquina superior izquierda de la celda. Para dibujar una acción con su raíz en (x,y), desplazar el cuadro a (x−72,y−208). Para espejar los píxeles de esta celda, la referencia equivalente es (183,208).

El taburete queda a la izquierda de la figura al iniciar la ultimate. La raíz de la composición no coincide con el pie del personaje. Los eventos `return-to-base` incluyen `actorAnchorInCell` para trasladar al luchador a su ancla normal sin tomar como origen el taburete o la rueda. Son puntos de enlace visual para revisar al integrarlos.

## Reproducción de la ultimate

1. Reproducir `ultimate-sit` una vez.
2. Reproducir `ultimate-smoke` en bucle el tiempo que establezca el diseño. La vista de ejemplo usa dos vueltas.
3. Al entrar en el cuadro 3 de `ultimate-smoke`, consumir una sola vez el evento `emit-effect`. Colocar el ancla del humo sobre `mouthSocket`, que contiene el punto de boca de ese cuadro. El efecto continúa sus seis fases independientemente de que cambie el cuadro del personaje.
4. Reproducir `ultimate-rise` una vez y volver a `personaje-base` / `idle` con el punto de enlace indicado.

El mechero y las variantes del cigarrillo son accesorios opcionales. La secuencia principal funciona directamente con el cigarrillo ya dibujado; no necesita sobreponer esos iconos.

## Entrada en patinete

1. Iniciar `scooter-ride` a la izquierda de la vista y desplazar la raíz de la composición hacia la posición inicial de la pelea, mirando a la derecha. Las imágenes contienen la postura de conducción, no un desplazamiento horizontal ya fijado.
2. Mantener `scooter-ride` en bucle mientras se desplaza. `timelines.entrance` propone un recorrido visual desde x = −160 hasta x = 180 durante 1200 ms; ajustar al tamaño del escenario.
3. Detener el desplazamiento y reproducir `scooter-brake` una vez.
4. Reproducir los cuatro cuadros válidos de `scooter-dismount`, omitiendo las dos celdas transparentes.
5. Consumir el evento de retorno a `idle`. La vista de ejemplo retira la composición de entrada y dibuja al luchador base en guardia. El patinete independiente queda disponible si se desea mantenerlo aparcado como objeto de escenario.

La integración define el efecto de la ultimate en el combate, su activación y sus reglas. Estos archivos proporcionan la animación; los tiempos y trayectorias del JSON son propuestas visuales, no una modificación del motor.

## Vistas y contexto

- `previews/ultimate.gif`: sentarse, fumar con humo separado y levantarse.
- `previews/entrada-patinete.gif`: entrada desde fuera de la pantalla, frenada, bajada y enlace a la guardia anterior.
- `previews/ultimate-en-la-barra.png`: ejemplo en el escenario de la barra.
- `previews/todas-las-poses.png`: las seis tiras nuevas, con las celdas vacías visibles como tales.
- `previews/objetos.png`: los objetos por separado.
- `guias/`: origen verde, punto de humo rosa y punto de retorno al luchador base amarillo. Fondo opaco solo de revisión.
- `referencias/`: las dos imágenes de objetos aportadas.
- `personaje-base/`: entrega anterior completa, con sus sprites, datos, retratos, efectos y documentación. Las instrucciones de este documento definen la nueva ultimate y complementan las de aquel paquete.
- `PROMPTS_GENERACION.json`: registro de los prompts usados con la generación integrada.
- `COMPROBACION.json` y `MANIFEST_SHA256.txt`: validación e integridad.

El alfa de los objetos y de las composiciones del personaje es binario 0/255. El humo conserva translucidez. Las vistas incluyen fondos de prueba; los assets de producción no contienen el escenario.
