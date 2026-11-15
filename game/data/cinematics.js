/* Cinemáticas cortas antes de cada combate.
 *
 * El reproductor (game/ui/screens.js -> Cinematic) busca, por este orden:
 *   1. 'story-<n>'   combate n del modo historia (0..4)
 *   2. 'vs-<rival>'  cualquier combate contra ese rival (pelea rápida incluida)
 * Si no encuentra nada, pasa directamente a la pantalla VS.
 *
 * Cada escena admite:
 *   speaker  id de personaje (muestra su retrato) o null
 *   side     'left' | 'right'  (lado del retrato)
 *   text     texto que aparece con efecto máquina de escribir
 *   image    ruta opcional a una ilustración de fondo (p. ej. assets/cinematics/x.png)
 *   video    ruta opcional a un vídeo corto (mp4/webm); avanza al terminar
 *   bg       color CSS de fondo si no hay imagen
 *   duration ms antes de avanzar solo (por defecto según longitud del texto)
 *
 * Los textos actuales son PROVISIONALES: sirven de plantilla hasta que se
 * añadan las cinemáticas definitivas.
 */
(function (root) {
  const CINEMATICS = {
    'story-0': [
      { speaker: null, bg: '#0b0f1a', text: 'Viernes, medianoche. La terraza de La Trolina está a reventar.' },
      { speaker: 'runner', side: 'right', text: '¿Otra ronda? Yo solo vengo a hidratarme después de correr… ¡Quítate de mi mesa!' }
    ],
    'story-1': [
      { speaker: 'penista', side: 'right', text: '¡Que se acaban las fiestas y aquí no ha cantado nadie! Tú y yo, ahora.' }
    ],
    'story-2': [
      { speaker: 'camarero', side: 'right', text: 'Ya os he dicho que cerramos. El último botellín lo lanzo yo.' }
    ],
    'story-3': [
      { speaker: 'motero', side: 'right', text: 'Has aparcado encima de mi moto. Eso se paga.' }
    ],
    'story-4': [
      { speaker: null, bg: '#1a0710', text: 'Se apaga el letrero rojo. Alguien baja la persiana a medias.' },
      { speaker: 'dueno', side: 'right', text: 'Mi terraza, mis normas. Si quieres la última ronda, gánatela.' }
    ]
  };
  root.TROLINA_CINEMATICS = CINEMATICS;
  if (typeof module !== 'undefined') module.exports = CINEMATICS;
})(typeof window !== 'undefined' ? window : globalThis);
