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
 *   kind: 'drink' ocupa un hueco de bebida por unidad (7 de base; más con el Hígado de hierro);
 *         'smoke' ocupa el hueco de fumar (1 de base; 2 con la Pitillera) y define `smoke`.
 *     m.sugar        bolsa de azúcar: subidón 30 s, bajón y desmayo a los 45 s
 *
 * UPGRADES: mejoras permanentes de la tienda, por niveles.
 */
(function (root) {
  const BAR_ITEMS = [
    {
      id: 'botellin', kind: 'drink', name: 'Botellín Estrella Galicia', short: 'Botellín', icon: 'bottle',
      price: 290, max: 10,
      good: '+7 % fuerza y +1 botellín para lanzar por asalto',
      bad: 'Sube el puntillo: niebla, mareo, golpes al aire y controles con retraso',
      effect: (m) => { m.powerPct += 7; m.intox += 1; m.ammo += 1; }
    },
    {
      id: 'peterete', kind: 'drink', name: 'Peterete', short: 'Peterete', icon: 'img:assets/icons/drinks/peterete.png',
      price: 450, max: 2,
      good: '+9 % de fuerza y el hielo refresca: −15 % de niebla',
      bad: 'Equivale a 1,5 botellines de puntillo y no da envase',
      effect: (m) => { m.powerPct += 9; m.intox += 1.5; m.fogMult *= 0.85; }
    },
    {
      id: 'jager', kind: 'drink', name: 'Chupito de Jägermeister', short: 'Jäger', icon: 'img:assets/icons/drinks/jager.png',
      price: 350, max: 3,
      good: '+14 % de fuerza y +4 % de velocidad',
      bad: 'Equivale a 2,5 botellines de puntillo, sube un 10 % más rápido y no da envase',
      effect: (m) => { m.powerPct += 14; m.speedPct += 4; m.intox += 2.5; m.riseMult *= 1.1; }
    },
    {
      id: 'licorcafe', kind: 'drink', name: 'Chupito de licor café', short: 'Licor café', icon: 'img:assets/icons/drinks/licor-cafe.png',
      price: 300, max: 3,
      good: '+10 % de fuerza y +6 % de velocidad: el café despierta',
      bad: 'Equivale a 2 botellines de puntillo y no da envase',
      effect: (m) => { m.powerPct += 10; m.speedPct += 6; m.intox += 2; }
    },
    {
      id: 'tequila', kind: 'drink', name: 'Chupito de tequila', short: 'Tequila', icon: 'img:assets/icons/drinks/tequila.png',
      price: 400, max: 3,
      good: '+20 % de fuerza',
      bad: 'Equivale a 3 botellines de puntillo, +25 % de niebla y no da envase',
      effect: (m) => { m.powerPct += 20; m.intox += 3; m.fogMult *= 1.25; }
    },
    {
      id: 'energetica', kind: 'drink', name: 'Red Bull', short: 'Red Bull', icon: '⚡',
      price: 250, max: 2,
      good: '+12 % de velocidad',
      bad: 'El puntillo sube un 20 % más rápido',
      effect: (m) => { m.speedPct += 12; m.riseMult *= 1.2; }
    },
    {
      id: 'cafe', kind: 'drink', name: 'Café solo', short: 'Café', icon: '☕',
      price: 130, max: 2,
      good: '−20 % de puntillo y +4 % de velocidad',
      bad: 'Nada, salvo los nervios',
      effect: (m) => { m.intoxMult *= 0.8; m.speedPct += 4; }
    },
    {
      id: 'agua', kind: 'drink', name: 'Agua mineral', short: 'Agua', icon: '💧',
      price: 100, max: 3,
      good: '−10 % de puntillo y +5 de vida',
      bad: 'Te miran raro en la terraza',
      effect: (m) => { m.intoxMult *= 0.9; m.hp += 5; }
    },
    // ---- Para fumar (hueco aparte). smoke: unidades, tiempo quieto (ms), puntillo que quita,
    //      vida que devuelve (sí, fumar cura), a partir de cuántas tose y efecto extra al acabar.
    {
      id: 'tabaco', kind: 'smoke', name: 'Paquete de Marlboro', short: 'Marlboro', icon: '🚬',
      price: 620, max: 1,
      smoke: { units: 10, ms: 1500, relief: 0.15, heal: 6, coughFrom: 4, look: 'cig' },
      good: '10 cigarrillos (F): cada uno quita un 15 % de puntillo y devuelve 6 de vida',
      bad: 'Quieto 1,5 s por cigarrillo; a partir del 5.º, tos',
      effect: () => {}
    },
    {
      id: 'ducados', kind: 'smoke', name: 'Paquete de Ducados', short: 'Ducados', icon: '🚬',
      price: 500, max: 1,
      smoke: { units: 10, ms: 1500, relief: 0.12, heal: 9, coughFrom: 2, look: 'cig' },
      good: '10 de tabaco negro: −12 % de puntillo y +9 de vida cada uno',
      bad: 'Quieto 1,5 s; la tos llega enseguida (desde el 3.º)',
      effect: () => {}
    },
    {
      id: 'liar', kind: 'smoke', name: 'Tabaco de liar', short: 'De liar', icon: '🌿',
      price: 380, max: 1,
      smoke: { units: 14, ms: 2800, relief: 0.12, heal: 5, coughFrom: 6, look: 'cig' },
      good: '14 cigarrillos y barato: −12 % de puntillo y +5 de vida cada uno',
      bad: 'Hay que liarlo: 2,8 s quieto cada vez',
      effect: () => {}
    },
    {
      id: 'puro', kind: 'smoke', name: 'Puro', short: 'Puro', icon: 'img:assets/icons/smokes/puro.png',
      price: 900, max: 1,
      smoke: { units: 3, ms: 3200, relief: 0.3, heal: 18, coughFrom: 99, look: 'cigar' },
      good: '3 puros: −30 % de puntillo y +18 de vida cada uno, sin tos',
      bad: '3,2 s quieto por puro',
      effect: () => {}
    },
    {
      id: 'habano', kind: 'smoke', name: 'Habano', short: 'Habano', icon: 'img:assets/icons/smokes/habano.png',
      price: 2500, max: 1,
      smoke: { units: 2, ms: 4500, relief: 0.45, heal: 30, coughFrom: 99, look: 'habano', buff: { powerPct: 15, ms: 20000, label: 'HABANO' } },
      good: '2 habanos: −45 % de puntillo, +30 de vida y +15 % de fuerza durante 20 s',
      bad: '4,5 s quieto: te lo fumas con calma, aunque te estén pegando',
      effect: () => {}
    },
    {
      id: 'chiflo', kind: 'smoke', name: 'Chiflo', short: 'Chiflo', icon: 'img:assets/icons/smokes/chiflo.png',
      price: 800, max: 1,
      smoke: { units: 4, ms: 2200, relief: 0.05, heal: 22, coughFrom: 3, look: 'chiflo', buff: { speedPct: -15, ms: 10000, label: 'FLOJO' } },
      good: '4 chiflos: +22 de vida cada uno',
      bad: 'Casi no baja el puntillo y te deja flojo: −15 % de velocidad 10 s',
      effect: () => {}
    },
    {
      id: 'azucar', kind: 'other', name: 'Bolsa de azúcar', short: 'Azúcar', icon: '🍬',
      price: 6000, max: 1,
      good: '+40 % de velocidad, golpes más rápidos y cero puntillo durante 30 s',
      bad: 'A los 30 s se pasa el efecto y a los 45 s te quedas inconsciente unos segundos',
      effect: (m) => { m.sugar = true; }
    },
    {
      id: 'gafas', kind: 'other', name: 'Gafas de sol', short: 'Gafas', icon: '🕶️',
      price: 600, max: 1,
      good: 'Reduce a la mitad la niebla que ves',
      bad: 'Solo afecta a la vista: el mareo sigue ahí',
      effect: (m) => { m.fogMult *= 0.5; }
    }
  ];

  const UPGRADES = [
    {
      id: 'higado', name: 'Hígado de hierro', icon: '🫀',
      desc: '+1 bebida en La Barra por nivel (empiezas con 7)',
      prices: [12000, 24000, 48000],
      slots: (sl, lvl) => { sl.drinks += lvl; },
      apply: () => {}
    },
    {
      id: 'pitillera', name: 'Pitillera de plata', icon: '🚬',
      desc: 'Un segundo hueco para fumar: lleva dos cosas distintas',
      prices: [20000],
      slots: (sl, lvl) => { sl.smokes += lvl; },
      apply: () => {}
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
