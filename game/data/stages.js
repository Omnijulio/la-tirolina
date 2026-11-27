/* Escenarios y ambientes.
 *
 * La terraza (place 'terraza'): misma composición de tres planos (544×270, ver STAGE.md) y la fuente
 * a la izquierda. «noche» es el escenario original.
 *   night:   la luz de la fuente solo se nota de noche; de día se ve al natural.
 *   weather: partículas animadas encima de la escena ('rain' | 'snow' | null).
 *
 * El interior del bar (place 'interior', v0.16): panorámica ancha que la cámara recorre, con las luces
 * encendidas o apagadas (y la bola de discoteca girando). Sin fuente: la ultimate de El Peñista tira
 * al rival al fregadero, detrás de la barra. Datos en assets/stages/interior/interior-data.js.
 *   lighting: 'encendidas' | 'apagadas'; layers: las imágenes de esa luz (fondo, mostradores, muebles
 *             y, a oscuras, los reflejos de la bola).
 *   music:    con la bola de discoteca suena la música, que tapa el ruido de los botellines para la
 *             policía (como la fuente encendida en la terraza).
 */
(function (root) {
  const layers = (dir) => ({ wall: dir + '01-wall.png', tables: dir + '02-tables.png', arena: dir + '03-arena-floor.png' });
  const I = root.TROLINA_INTERIOR_DATA;
  const bar = (light) => {
    const L = I && I.lightings[light];
    if (!L) return null;
    const out = { bg: L.image, counters: L.counters.image, props: L.props.image };
    if (L.disco) out.glow = L.disco.image;
    return out;
  };
  root.TROLINA_PLACES = [
    { id: 'terraza', name: 'La terraza', icon: '⛲' },
    { id: 'interior', name: 'El interior del bar', icon: '🍺' }
  ];
  root.TROLINA_STAGES = [
    { id: 'noche', place: 'terraza', name: 'Noche', icon: '🌙', night: true, weather: null, layers: layers('assets/stage/') },
    { id: 'dia', place: 'terraza', name: 'Día', icon: '☀️', night: false, weather: null, layers: layers('assets/stages/dia/') },
    { id: 'lluvia', place: 'terraza', name: 'Lluvia', icon: '🌧️', night: true, weather: 'rain', layers: layers('assets/stages/lluvia/') },
    { id: 'nieve', place: 'terraza', name: 'Nieve', icon: '❄️', night: true, weather: 'snow', layers: layers('assets/stages/nieve/') },
    { id: 'navidad', place: 'terraza', name: 'Navidad', icon: '🎄', night: true, weather: null, layers: layers('assets/stages/navidad/') },
    { id: 'interior', place: 'interior', name: 'Interior · luces encendidas', icon: '💡', lighting: 'encendidas', night: true, weather: null, layers: bar('encendidas') },
    { id: 'interior-apagado', place: 'interior', name: 'Interior · luces apagadas y bola de discoteca', icon: '✨', lighting: 'apagadas', music: true, night: true, weather: null, layers: bar('apagadas') }
  ].filter((s) => s.layers);
  /** Capa opcional: montón de botellines, vasos y tabaco sobre la jardinera central. */
  root.TROLINA_STAGE_EXTRAS = { jardinera: 'assets/stages/extra-jardinera.png' };
})(window);
