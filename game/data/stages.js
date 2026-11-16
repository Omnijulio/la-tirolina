/* Ambientes de la terraza de La Trolina. Todos usan la misma composición de tres planos
 * (544×270, ver STAGE.md) y la fuente a la izquierda. «noche» es el escenario original.
 *   night:   la luz de la fuente solo se nota de noche; de día se ve al natural.
 *   weather: partículas animadas encima de la escena ('rain' | 'snow' | null).
 */
(function (root) {
  const layers = (dir) => ({ wall: dir + '01-wall.png', tables: dir + '02-tables.png', arena: dir + '03-arena-floor.png' });
  root.TROLINA_STAGES = [
    { id: 'noche', name: 'Noche', icon: '🌙', night: true, weather: null, layers: layers('assets/stage/') },
    { id: 'dia', name: 'Día', icon: '☀️', night: false, weather: null, layers: layers('assets/stages/dia/') },
    { id: 'lluvia', name: 'Lluvia', icon: '🌧️', night: true, weather: 'rain', layers: layers('assets/stages/lluvia/') },
    { id: 'nieve', name: 'Nieve', icon: '❄️', night: true, weather: 'snow', layers: layers('assets/stages/nieve/') },
    { id: 'navidad', name: 'Navidad', icon: '🎄', night: true, weather: null, layers: layers('assets/stages/navidad/') }
  ];
  /** Capa opcional: montón de botellines, vasos y tabaco sobre la jardinera central. */
  root.TROLINA_STAGE_EXTRAS = { jardinera: 'assets/stages/extra-jardinera.png' };
})(window);
