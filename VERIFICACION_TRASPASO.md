# Verificación del proyecto v1.4 con policía

Entrega actualizada el 16 de noviembre de 2026.

- El paquete conserva el luchador, el botellín Estrella Galicia y el escenario de tres planos, y añade la intervención policial.
- Se incluyen 24 PNG individuales de agente, cuatro estados de luces del patrulla, tres PNG de atlas/base policial, JSON, controlador, referencias y originales gráficos.
- `python3 tools/rebuild_assets.py` reconstruye los assets a partir de los originales locales y vuelve a crear las tres demos autónomas.
- `npm test` ejecuta cuatro suites: luchador/botellín, escenario, policía e integración de la demo.
- Las comprobaciones policiales cubren actividad y temporizador, activación manual, ausencia de avisos sin actividad, orden de fases, entrada de agentes, bloqueo, una sola resolución, reinicio y equivalencia con pasos de tiempo grandes.
- El test de integración ejecuta los scripts reales del HTML con un adaptador DOM/Canvas de Node: comprueba carga de imágenes incrustadas, teclas, limpieza de proyectiles, bloqueo de nuevos ataques, reinicio y selección de capas. No es una prueba de distribución visual en navegador.
- Se verifican dimensiones, alfa, anclas y transparencia de sprites, sintaxis Python/JavaScript y la integridad del ZIP mediante CRC y hashes de todos sus archivos.
- `police-intervention.gif` y las imágenes de revisión proceden de los mismos estados del controlador entregado. Se inspeccionó visualmente la composición.

La interfaz HTML todavía necesita revisión visual y de controles en un navegador disponible en el entorno de destino. Este entorno no permitió completar esa revisión. No confundir el adaptador de Node ni el GIF con una prueba de navegador.

`MANIFEST.json` corresponde a esta entrega. `python3 tools/verify_manifest.py` permite comprobarla antes de editar; después de cambios deliberados, el snapshot dejará de coincidir. Las dependencias opcionales para arte/GIF están en `requirements-art.txt`; el juego no requiere paquetes npm.
