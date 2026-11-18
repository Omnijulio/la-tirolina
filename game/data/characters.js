/* Plantel de personajes.
 * Todos comparten las animaciones de assets/fighter.json (celdas 192x176, ancla 56,160).
 * Las variantes son recoloreados PROVISIONALES generados con tools/build_characters.py.
 * Arte propio (desde v0.13, Rizos): tools/integrate_character.py genera su atlas con la misma
 * distribución de filas y assets/characters/art-data.js con su retrato y la mano del botellín.
 * Tiempos y cajas de golpe son comunes: el equilibrio lo marcan las stats.
 *
 * stats:
 *   hp         vida base
 *   power      multiplicador de daño
 *   speed      multiplicador de velocidad al andar/saltar
 *   tolerance  aguante al alcohol (0 = normal, positivo reduce el "puntillo")
 *   aim        puntería: reduce fallos e imprecisión del lanzamiento (1 = normal)
 * special: ultimate propio del personaje (se carga encadenando golpes).
 *   id 'dardo' (El Barbas) o 'fuente' (El Peñista). El resto lo recibirá más adelante.
 * unlock:
 *   start: true  -> disponible desde el principio (también en partidas guardadas de antes)
 *   story: n     -> se desbloquea al ganar el combate n del modo historia
 *   price: cents -> precio en la tienda para desbloquearlo antes
 */
(function (root) {
  const CHARACTERS = [
    {
      id: 'barbas', name: 'El Barbas', color: '#9fb35e',
      atlas: 'assets/characters/barbas.png',
      tagline: 'El de toda la vida. Equilibrado y fiel a la terraza.',
      stats: { hp: 100, power: 1.0, speed: 1.0, tolerance: 0.10, aim: 1.0 },
      unlock: { start: true, price: 0 },
      special: {
        id: 'dardo', name: 'Dardo certero', short: 'DARDO',
        desc: 'Lanza un dardo ultrapreciso que busca al rival, no se puede bloquear y hace muchísimo daño. Se carga encadenando combos.'
      },
      cpu: { bottles: 0, style: 'balanced' }
    },
    {
      // Arte propio (source-art/personajes/rizos). Nombre y stats provisionales; ultimate pendiente.
      id: 'rizos', name: 'Rizos', color: '#c98a52',
      atlas: 'assets/characters/rizos.png',
      tagline: 'Melena al viento y abrigo de borrego. Ágil y con buena pegada.',
      stats: { hp: 96, power: 1.05, speed: 1.08, tolerance: 0.05, aim: 0.95 },
      unlock: { start: true, price: 0 },
      cpu: { bottles: 1, style: 'rushdown' }
    },
    {
      id: 'runner', name: 'El Runner', color: '#3fd0d4',
      atlas: 'assets/characters/runner.png',
      tagline: 'Sale a correr… y acaba en el bar. Rápido pero frágil.',
      stats: { hp: 86, power: 0.9, speed: 1.22, tolerance: -0.10, aim: 1.05 },
      unlock: { story: 0, price: 12000 },
      cpu: { bottles: -1, style: 'rushdown' }
    },
    {
      id: 'penista', name: 'El Peñista', color: '#e8424a',
      atlas: 'assets/characters/penista.png',
      tagline: 'Lleva desde las fiestas sin dormir. Pega muy fuerte.',
      stats: { hp: 104, power: 1.15, speed: 0.94, tolerance: 0.30, aim: 0.9 },
      unlock: { story: 1, price: 20000 },
      special: {
        id: 'fuente', name: 'Al pilón', short: 'PILÓN',
        desc: 'Se lanza a por el rival, lo agarra y lo tira a la fuente de la izquierda: le quita muchísima vida y lo deja empapado y más lento un buen rato. No se puede bloquear. Se carga encadenando combos.'
      },
      cpu: { bottles: 2, style: 'brawler' }
    },
    {
      id: 'camarero', name: 'El Camarero', color: '#e9e6dc',
      atlas: 'assets/characters/camarero.png',
      tagline: 'Lanza botellines con precisión de bandeja.',
      stats: { hp: 108, power: 1.0, speed: 1.02, tolerance: 0.15, aim: 1.3 },
      unlock: { story: 2, price: 30000 },
      cpu: { bottles: 1, style: 'zoner' }
    },
    {
      id: 'motero', name: 'El Motero', color: '#b07a45',
      atlas: 'assets/characters/motero.png',
      tagline: 'Duro como el asfalto. Lento, pero aguanta lo que le echen.',
      stats: { hp: 122, power: 1.2, speed: 0.86, tolerance: 0.25, aim: 0.85 },
      unlock: { story: 3, price: 45000 },
      cpu: { bottles: 2, style: 'brawler' }
    },
    {
      id: 'dueno', name: 'El Dueño', color: '#c2406f', boss: true,
      atlas: 'assets/characters/dueno.png',
      tagline: 'Jefe final de La Trolina. Aquí se hace lo que él dice.',
      stats: { hp: 128, power: 1.18, speed: 1.05, tolerance: 0.35, aim: 1.15 },
      unlock: { story: 4, price: 80000 },
      cpu: { bottles: 1, style: 'balanced' }
    }
  ];

  // Orden de rivales del modo historia. El índice coincide con unlock.story.
  // Los personajes con unlock.start no están en la historia.
  const STORY = ['runner', 'penista', 'camarero', 'motero', 'dueno'];

  root.TROLINA_CHARACTERS = CHARACTERS;
  root.TROLINA_STORY = STORY;
  if (typeof module !== 'undefined') module.exports = { CHARACTERS, STORY };
})(typeof window !== 'undefined' ? window : globalThis);
