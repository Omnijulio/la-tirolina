/* Armas (v0.15): lo que se ve de cada una. Sus reglas (fuerza, alcance, desarme, vuelta) están en
 * game/core/rules.js (WEAPONS, WEAPON).
 *
 * Un luchador con el arma dibujada en su atlas (Sombrero y su bastón) cambia de atlas al perderla
 * (assets/characters/art-data.js → weapon). Si no la tiene dibujada (el botellín empuñado, o el bastón
 * en otros luchadores en pruebas), el arma se dibuja encima, en la mano de cada celda
 * (assets/characters/hands-data.js, tools/build_hands.py).
 *
 * image/grip/size: el objeto suelto, su punto de agarre y su tamaño (px nativos). El agarre es también el eje con el
 * que gira. El tamaño va aquí y no se lee de la imagen: lo usa la simulación (multijugador).
 * hud: icono del marcador (si no hay, se dibuja el objeto pequeño).
 */
(function (root) {
  root.TROLINA_WEAPON_ART = {
    baston: { image: 'assets/characters/sombrero-baston.png', grip: [5, 28], size: [28, 89], hud: 'assets/characters/sombrero-ui-baston.png' },
    botellin: { image: 'assets/bottle.png', grip: [12, 10], size: [24, 32] }
  };

  /* Solo durante el desarrollo: en la elección de luchador (no en el multijugador) aparece «Arma (pruebas)»
   * para darle a estos personajes el bastón, el botellín o nada. Para quitarlo: enabled: false. */
  root.TROLINA_DEV = {
    weaponPicker: { enabled: true, characters: ['sombrero', 'barbas', 'rizos'], weapons: ['baston', 'botellin'] }
  };
})(typeof window !== 'undefined' ? window : globalThis);
