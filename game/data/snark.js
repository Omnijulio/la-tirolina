/* Mensajes pasivo-agresivos del Modo salvaje. Uno al azar por tipo de fallo.
 * Editables libremente: cada clave es un tipo de evento del combate.
 */
(function (root) {
  const SNARK = {
    onset: ['Segundo 30. A partir de aquí, tú verás.', 'Se acabó lo fácil. Ánimo. O no.', 'Ahora empieza lo bueno. Para nosotros.'],
    whiff: ['Casi.', 'Casi. Bueno, no.', 'Le has dado a una mesa.', 'Eso era una silla, campeón.', 'Al aire. Precioso.', 'Muy bien pegado. Al viento.', 'El rival te lo agradece.', 'Le has dado a una mesa. Otra vez.'],
    stumble: ['Casi te caes solo.', 'Tranquilo, el suelo no se mueve. Tú sí.', '¿Te ayudo o te apañas?', 'Sin empujones y todo.', 'Elegante, como siempre.'],
    fall: ['Te has caído solo. Enhorabuena.', 'Nadie te ha tocado. Que conste.', 'El suelo: 1. Tú: 0.'],
    invert: ['Izquierda era la otra.', '¿Hacia dónde ibas?', 'Tus piernas tienen otra opinión.', 'Ese no es el lado. Ya sabes cuál.'],
    swap: ['Pediste puñetazo. Te sirvo patada.', 'Eso no era lo que querías, ¿verdad?', 'Tu cuerpo ha decidido por ti.'],
    phantom: ['Te vas tú solo.', '¿A dónde vas? Ah, a ningún sitio.', 'Paseíto, ¿eh?'],
    delay: ['Ya llegarás.', 'Cuando puedas, eh.', 'Tu mano va a su ritmo.', 'Sin prisa. Ninguna.'],
    vision: ['Ya ni ves.', '¿Cuántos dedos hay aquí?', 'Todo borroso. Como tus decisiones.', '¿Cuál de los dos es el de verdad?'],
    blackout: ['Micro-siesta.', 'Has parpadeado un poco largo.', 'Bienvenido de vuelta.'],
    bottleBack: ['Hacia atrás. Interesante elección.', 'La botella tenía otros planes.', 'Ni siquiera hacia delante. Bravo.'],
    bottleMiss: ['Le has dado a una mesa.', 'Ni a un metro.', 'Esa botella merecía más.', 'Un desperdicio de cerveza. Y de brazo.'],
    gotHit: ['Lo has visto venir, ¿no?', 'Bien esquivado. Es broma.', 'Eso ha dolido. A nosotros no.'],
    smoke: ['Claro, fúmate otro. Eso lo arregla todo.', 'Pausa para fumar. En plena pelea. Normal.'],
    cpu: ['Hasta la máquina va fina.', 'La máquina también: casi.', 'Ni la CPU se aclara.'],
    win: ['Has ganado. No sabemos cómo.', 'Victoria. Por pura casualidad, pero victoria.', 'Felicidades. Supongo.'],
    lose: ['Era previsible.', 'Nadie lo vio venir. Bueno, todos.', 'Mañana más. O no.'],
    // Comentarios al pedir en La Barra del modo salvaje.
    bar: {
      botellin: ['Otro. Claro que sí.', 'Tú sabrás.', 'Muy buena idea. Seguro.', 'Así, sin pensarlo.'],
      cafe: ['Un café. Qué responsable, de repente.'],
      agua: ['Agua. Valiente.', 'Agua. Qué emoción.'],
      tortilla: ['Tortilla. Algo sensato, por fin.'],
      bocata: ['Un bocata antes de pelear. Profesional.'],
      orujo: ['Orujo. Perfecto, lo que faltaba.', 'Orujo. Ya puestos…'],
      energetica: ['Bebida energética con todo lo demás. Sin riesgos.'],
      gafas: ['Gafas de sol de noche. Con estilo.'],
      tabaco: ['Fumar arregla todo, ¿no?'],
      azucar: ['60 € en azúcar. Normal.', 'Azúcar. Muy de deportista.']
    }
  };

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  root.TROLINA_SNARK = SNARK;
  root.trolinaSnark = (type) => pick(SNARK[type] || ['…']);
  root.trolinaBarSnark = (id) => pick((SNARK.bar[id]) || ['Tú mismo.']);
})(typeof window !== 'undefined' ? window : globalThis);
