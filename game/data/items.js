/* Objetos del juego. Precios en céntimos de euro.
 *
 * BAR_ITEMS: lo que se pide en "La Barra" antes de cada combate. Solo bebida (más el
 *   tabaco, la bolsa de azúcar y las gafas). `icon`: emoji, 'bottle' o 'img:<ruta png>'.
 *   Cada unidad aplica `effect` sobre el objeto de modificadores `m`:
 *     m.hp           vida extra
 *     m.powerPct     % de fuerza extra
 *     m.speedPct     % de velocidad extra (puede ser negativo)
 *     m.intox        "botellines equivalentes" de puntillo (1 botellín = 1)
 *     m.intoxMult    multiplica el puntillo total (café/agua lo bajan)
 *     m.riseMult     multiplica la velocidad a la que sube el puntillo durante la pelea
 *     m.fogMult      multiplica solo el efecto visual de niebla
 *     m.ammo         botellines vacíos disponibles para lanzar en cada asalto
 *     m.cigs         cigarrillos para todo el combate (fumar baja el puntillo)
 *     m.sugar        bolsa de azúcar: subidón 30 s, bajón y desmayo a los 45 s
 *
 * UPGRADES: mejoras permanentes de la tienda, por niveles.
 */
(function (root) {
  const BAR_ITEMS = [
    {
      id: 'botellin', name: 'Botellín Estrella Galicia', short: 'Botellín', icon: 'bottle',
      price: 290, max: 10,
      good: '+7 % fuerza y +1 botellín para lanzar por asalto',
      bad: 'Sube el puntillo: niebla, mareo, golpes al aire y controles con retraso',
      effect: (m) => { m.powerPct += 7; m.intox += 1; m.ammo += 1; }
    },
    {
      id: 'peterete', name: 'Peterete', short: 'Peterete', icon: 'img:assets/icons/drinks/peterete.png',
      price: 450, max: 2,
      good: '+9 % de fuerza y el hielo refresca: −15 % de niebla',
      bad: 'Equivale a 1,5 botellines de puntillo y no da envase',
      effect: (m) => { m.powerPct += 9; m.intox += 1.5; m.fogMult *= 0.85; }
    },
    {
      id: 'jager', name: 'Chupito de Jägermeister', short: 'Jäger', icon: 'img:assets/icons/drinks/jager.png',
      price: 350, max: 3,
      good: '+14 % de fuerza y +4 % de velocidad',
      bad: 'Equivale a 2,5 botellines de puntillo, sube un 10 % más rápido y no da envase',
      effect: (m) => { m.powerPct += 14; m.speedPct += 4; m.intox += 2.5; m.riseMult *= 1.1; }
    },
    {
      id: 'licorcafe', name: 'Chupito de licor café', short: 'Licor café', icon: 'img:assets/icons/drinks/licor-cafe.png',
      price: 300, max: 3,
      good: '+10 % de fuerza y +6 % de velocidad: el café despierta',
      bad: 'Equivale a 2 botellines de puntillo y no da envase',
      effect: (m) => { m.powerPct += 10; m.speedPct += 6; m.intox += 2; }
    },
    {
      id: 'tequila', name: 'Chupito de tequila', short: 'Tequila', icon: 'img:assets/icons/drinks/tequila.png',
      price: 400, max: 3,
      good: '+20 % de fuerza',
      bad: 'Equivale a 3 botellines de puntillo, +25 % de niebla y no da envase',
      effect: (m) => { m.powerPct += 20; m.intox += 3; m.fogMult *= 1.25; }
    },
    {
      id: 'energetica', name: 'Red Bull', short: 'Red Bull', icon: '⚡',
      price: 250, max: 2,
      good: '+12 % de velocidad',
      bad: 'El puntillo sube un 20 % más rápido',
      effect: (m) => { m.speedPct += 12; m.riseMult *= 1.2; }
    },
    {
      id: 'cafe', name: 'Café solo', short: 'Café', icon: '☕',
      price: 130, max: 2,
      good: '−20 % de puntillo y +4 % de velocidad',
      bad: 'Nada, salvo los nervios',
      effect: (m) => { m.intoxMult *= 0.8; m.speedPct += 4; }
    },
    {
      id: 'agua', name: 'Agua mineral', short: 'Agua', icon: '💧',
      price: 100, max: 3,
      good: '−10 % de puntillo y +5 de vida',
      bad: 'Te miran raro en la terraza',
      effect: (m) => { m.intoxMult *= 0.9; m.hp += 5; }
    },
    {
      id: 'tabaco', name: 'Paquete de Marlboro', short: 'Marlboro', icon: '🚬',
      price: 620, max: 1,
      good: '10 cigarrillos para el combate: cada uno que fumas (F) quita un 15 % de puntillo',
      bad: 'Fumar te deja quieto 1,5 s y, a partir del 4.º, entra la tos',
      effect: (m) => { m.cigs += 10; }
    },
    {
      id: 'azucar', name: 'Bolsa de azúcar', short: 'Azúcar', icon: '🍬',
      price: 6000, max: 1,
      good: '+40 % de velocidad, golpes más rápidos y cero puntillo durante 30 s',
      bad: 'A los 30 s se pasa el efecto y a los 45 s te quedas inconsciente unos segundos',
      effect: (m) => { m.sugar = true; }
    },
    {
      id: 'gafas', name: 'Gafas de sol', short: 'Gafas', icon: '🕶️',
      price: 600, max: 1,
      good: 'Reduce a la mitad la niebla que ves',
      bad: 'Solo afecta a la vista: el mareo sigue ahí',
      effect: (m) => { m.fogMult *= 0.5; }
    }
  ];

  const UPGRADES = [
    {
      id: 'higado', name: 'Hígado de hierro', icon: '🫀',
      desc: '+10 % de aguante al alcohol por nivel',
      prices: [12000, 24000, 48000],
      apply: (s, lvl) => { s.tolerance += 0.10 * lvl; }
    },
    {
      id: 'gimnasio', name: 'Bono del gimnasio', icon: '💪',
      desc: '+5 % de fuerza por nivel',
      prices: [15000, 30000, 60000],
      apply: (s, lvl) => { s.power *= 1 + 0.05 * lvl; }
    },
    {
      id: 'zapatillas', name: 'Zapatillas nuevas', icon: '👟',
      desc: '+5 % de velocidad por nivel',
      prices: [10000, 20000, 40000],
      apply: (s, lvl) => { s.speed *= 1 + 0.05 * lvl; }
    },
    {
      id: 'fisio', name: 'Abono del fisio', icon: '🩹',
      desc: '+10 de vida por nivel',
      prices: [10000, 20000, 40000],
      apply: (s, lvl) => { s.hp += 10 * lvl; }
    }
  ];

  root.TROLINA_BAR_ITEMS = BAR_ITEMS;
  root.TROLINA_UPGRADES = UPGRADES;
  if (typeof module !== 'undefined') module.exports = { BAR_ITEMS, UPGRADES };
})(typeof window !== 'undefined' ? window : globalThis);
