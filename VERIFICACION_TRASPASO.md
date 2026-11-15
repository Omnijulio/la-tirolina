# Verificación del paquete para Codex

Comprobaciones ejecutadas al preparar esta entrega:

- El HTML adjunto por el usuario coincide byte por byte con la última demo del proyecto.
- `python3 tools/rebuild_assets.py` reconstruye los PNG, el atlas, los datos y la demo desde las fuentes portátiles.
- La reconstrucción conserva exactamente los archivos del kit original, incluido el HTML, el atlas y las tres capas. Se modificó únicamente la documentación de entrada para el traslado.
- `python3 tools/render_preview.py` reconstruye el GIF con un resultado idéntico al entregado.
- `npm test` pasa las dos suites: botellín/personaje y escenario.
- Se comprobaron la sintaxis de los scripts de ambas páginas y de las herramientas Python, y la ausencia de rutas absolutas al entorno de creación en herramientas, plantilla y módulos.
- `MANIFEST.json` enumera los archivos, tamaños y hashes del paquete. `python3 tools/verify_manifest.py` permite revisar su integridad antes de editarlo; después de cambios deliberados, los hashes del snapshot dejarán de coincidir.

Entorno usado para estas comprobaciones: Python 3.12.14, Node 24.22.1, Pillow 13.0.0, NumPy 2.3.5 y SciPy 1.17.0. Las dependencias gráficas están en `requirements-art.txt`. Ejecutar el juego solo requiere un navegador; las pruebas requieren Node 18 o posterior.

La interfaz HTML no pudo verificarse visualmente en un navegador en el entorno original. Continúa pendiente esa comprobación en el proyecto de destino. Las imágenes y el GIF se revisaron como composiciones generadas a partir de los recursos y estados reales; no equivalen a una prueba de la interfaz en navegador.
