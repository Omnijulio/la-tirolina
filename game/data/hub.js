/* Menú del bar (pantalla de inicio): a dónde lleva cada sitio de la escena.
 *
 * Coordenadas de la escena: las vistas de assets/menu miden 1672×941.
 *
 * floor: perspectiva del suelo, medida en la imagen. Un punto del suelo (X, Z) a la altura de
 * «nivel» peldaños se ve en  u = u0 + f·X/Z,  v = vh + f·(1 − nivel·step)/Z  (X a la derecha,
 * Z hacia el fondo, en alturas de la cámara). u0, vh: punto de fuga del pasillo; step: altura
 * de un peldaño de la escalera del comedor.
 *
 * paths: las flechas son cintas de luz pegadas al suelo. nodes = [X, Z, nivel]: al cambiar de
 * nivel, la cinta sube el peldaño en vertical (sigue la contrahuella). La escalera: las aristas
 * de los peldaños son X = −1,159 (1.º), −1,258 (2.º) y −1,357 (rellano).
 *
 * destinations: en orden de izquierda a derecha (el teclado las recorre así).
 *   kind 'path' → se enciende su flecha; kind 'object' → se ilumina el objeto (assets/menu).
 *   anchor: adonde apunta el letrero. focus: centro del foco que oscurece el resto.
 *   La acción de cada uno está en game/ui/screens.js (pantalla title).
 */
(function (root) {
  root.TROLINA_HUB = {
    floor: { u0: 1001, vh: 318, f: 850, step: 0.0837 },
    hours: {
      // Hora del bar según el mes (1–12): [empieza la tarde, empieza la noche, acaba la noche].
      // Fuera de eso, de día.
      byMonth: { 1: [17, 19, 8], 2: [17.5, 19.5, 8], 3: [18, 20, 8], 4: [19, 21, 7.5], 5: [20, 22, 7], 6: [20.5, 22.5, 7],
        7: [20.5, 22.5, 7], 8: [20, 22, 7.5], 9: [19, 21, 8], 10: [18, 20, 8], 11: [17, 19, 8], 12: [17, 19, 8.5] }
    },
    paths: {
      comedor: {
        width: 0.17, spacing: 0.2, smooth: 2,
        nodes: [[-0.86, 1.62, 0], [-1.159, 1.62, 0], [-1.258, 1.62, 1], [-1.357, 1.62, 2], [-1.6, 1.66, 3], [-1.78, 1.82, 3], [-1.93, 2.0, 3]]
      },
      barra: {
        width: 0.18, spacing: 0.24, smooth: 2,
        nodes: [[-0.655, 1.46, 0], [-0.832, 1.764, 0], [-1.038, 2.157, 0]]
      },
      pasillo: {
        width: 0.2, spacing: 0.34, smooth: 2,
        nodes: [[-0.165, 1.46, 0], [-0.05, 2.64, 0], [0.015, 6.4, 0]]
      }
    },
    destinations: [
      { id: 'darts', kind: 'path', path: 'comedor', anchor: [176, 606], focus: [210, 640, 300], soon: true },
      { id: 'quick', kind: 'object', object: 'tele', anchor: [578, 226], focus: [578, 310, 210] },
      { id: 'help', kind: 'object', object: 'carta', anchor: [580, 404], focus: [583, 446, 150] },
      { id: 'shop', kind: 'path', path: 'barra', anchor: [596, 684], focus: [610, 640, 280] },
      { id: 'wild', kind: 'object', object: 'bola', anchor: [834, 198], focus: [834, 260, 260], lights: 0.08 },
      { id: 'story', kind: 'path', path: 'pasillo', anchor: [1004, 296], focus: [1000, 440, 300] },
      { id: 'online', kind: 'object', object: 'futbolin', anchor: [1030, 383], focus: [1030, 405, 150] },
      { id: 'ranking', kind: 'object', object: 'cuadros', anchor: [1192, 254], focus: [1192, 312, 170] },
      { id: 'options', kind: 'object', object: 'reloj', anchor: [1509, 152], focus: [1509, 232, 190] }
    ],
    first: 'story'
  };
})(window);
