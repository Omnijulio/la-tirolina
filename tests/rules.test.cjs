/* Pruebas de reglas del juego (economía, puntillo, recompensas). Sin dependencias. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const R = require(path.join(__dirname, '../game/core/rules.js'));
const { BAR_ITEMS, UPGRADES } = require(path.join(__dirname, '../game/data/items.js'));
const { CHARACTERS, STORY } = require(path.join(__dirname, '../game/data/characters.js'));
const barbas = CHARACTERS.find((c) => c.id === 'barbas');

test('el botellín cuesta 2,90 € y se pueden pedir 10 como máximo', () => {
  const bottle = BAR_ITEMS.find((i) => i.id === 'botellin');
  assert.equal(bottle.price, 290);
  assert.equal(bottle.max, 10);
  assert.equal(R.orderCost({ botellin: 10 }, BAR_ITEMS), 2900);
  assert.equal(R.orderCost({ botellin: 25 }, BAR_ITEMS), 2900, 'se recorta al máximo');
  assert.equal(R.formatMoney(290), '2,90 €');
  assert.equal(R.formatMoney(123456), '1.234,56 €');
});

test('cada botellín da fuerza y munición pero sube el puntillo', () => {
  const none = R.computeLoadout(barbas, {}, {}, BAR_ITEMS, UPGRADES);
  const five = R.computeLoadout(barbas, { botellin: 5 }, {}, BAR_ITEMS, UPGRADES);
  assert.equal(none.intoxLevel, 0);
  assert.equal(none.ammo, 0);
  assert.equal(five.ammo, 5);
  assert.ok(five.power > none.power);
  assert.ok(five.intoxLevel > 0);
});

test('el puntillo crece con el tiempo de combate', () => {
  const lo = R.computeLoadout(barbas, { botellin: 6 }, {}, BAR_ITEMS, UPGRADES);
  const a = R.intoxAt(lo, 0), b = R.intoxAt(lo, 30), c = R.intoxAt(lo, 90);
  assert.ok(a > 0 && a < b && b < c, `${a} < ${b} < ${c}`);
  assert.ok(c <= 1);
});

test('café, agua, Peterete y gafas contrarrestan al botellín', () => {
  const base = R.computeLoadout(barbas, { botellin: 5 }, {}, BAR_ITEMS, UPGRADES);
  const cafe = R.computeLoadout(barbas, { botellin: 5, cafe: 2 }, {}, BAR_ITEMS, UPGRADES);
  const agua = R.computeLoadout(barbas, { botellin: 5, agua: 2 }, {}, BAR_ITEMS, UPGRADES);
  const gafas = R.computeLoadout(barbas, { botellin: 5, gafas: 1 }, {}, BAR_ITEMS, UPGRADES);
  assert.ok(cafe.intoxLevel < base.intoxLevel);
  assert.ok(R.intoxAt(agua, 30) < R.intoxAt(base, 30));
  assert.ok(agua.maxHp > base.maxHp);
  assert.ok(gafas.fogMult < base.fogMult);
});

test('el aguante del personaje reduce el puntillo', () => {
  const penista = CHARACTERS.find((c) => c.id === 'penista');
  const runner = CHARACTERS.find((c) => c.id === 'runner');
  const p = R.computeLoadout(penista, { botellin: 6 }, {}, BAR_ITEMS, UPGRADES);
  const r = R.computeLoadout(runner, { botellin: 6 }, {}, BAR_ITEMS, UPGRADES);
  assert.ok(p.intoxLevel < r.intoxLevel);
});

test('huecos: 7 bebidas y 1 para fumar; el Hígado de hierro y la Pitillera dan más', () => {
  assert.deepEqual(R.slotsFor({}, UPGRADES), { drinks: 7, smokes: 1 });
  assert.deepEqual(R.slotsFor({ higado: 3, pitillera: 1 }, UPGRADES), { drinks: 10, smokes: 2 });
  const seven = R.computeLoadout(barbas, { botellin: 10 }, {}, BAR_ITEMS, UPGRADES);
  const ten = R.computeLoadout(barbas, { botellin: 10 }, { higado: 3 }, BAR_ITEMS, UPGRADES);
  assert.equal(seven.bottles, 7);
  assert.equal(ten.bottles, 10);
  // Las bebidas comparten huecos: 5 botellines + 3 chupitos = 8 > 7.
  const mixed = R.computeLoadout(barbas, { botellin: 5, tequila: 3 }, {}, BAR_ITEMS, UPGRADES);
  assert.equal(R.orderUsage(mixed.order, BAR_ITEMS).drinks, 7);
  // Un solo hueco para fumar: con dos paquetes se queda el primero de la lista.
  const one = R.computeLoadout(barbas, { tabaco: 1, puro: 1 }, {}, BAR_ITEMS, UPGRADES);
  assert.deepEqual(one.smokes.map((x) => x.id), ['tabaco']);
  const two = R.computeLoadout(barbas, { tabaco: 1, puro: 1 }, { pitillera: 1 }, BAR_ITEMS, UPGRADES);
  assert.deepEqual(two.smokes.map((x) => x.id), ['tabaco', 'puro']);
  assert.equal(two.cigs, 13);
  // Gafas y azúcar no ocupan huecos.
  assert.deepEqual(R.orderUsage({ gafas: 1, azucar: 1 }, BAR_ITEMS), { drinks: 0, smokes: 0 });
  // La CPU también respeta sus huecos.
  for (let i = 0; i < 50; i++) for (const d of R.DIFFICULTY_ORDER) {
    const o = R.cpuOrder(d, barbas);
    const u = R.orderUsage(o, BAR_ITEMS);
    assert.ok(u.drinks <= R.cpuSlots(d).drinks && u.smokes <= 1, d + ' ' + JSON.stringify(o));
  }
});

test('cada cosa para fumar tiene su tiempo y sus efectos; fumar cura', () => {
  const smokes = BAR_ITEMS.filter((i) => i.kind === 'smoke');
  assert.ok(['tabaco', 'ducados', 'liar', 'puro', 'habano', 'chiflo'].every((id) => smokes.some((s) => s.id === id)));
  for (const s of smokes) assert.ok(s.smoke.heal > 0 && s.smoke.ms > 0 && s.smoke.units > 0, s.id);
  const by = Object.fromEntries(smokes.map((s) => [s.id, s.smoke]));
  assert.ok(by.habano.ms > by.puro.ms && by.puro.ms > by.tabaco.ms, 'el habano es lo más lento');
  assert.ok(by.habano.relief > by.puro.relief && by.puro.relief > by.tabaco.relief);
  assert.ok(by.chiflo.buff.speedPct < 0 && by.habano.buff.powerPct > 0);
});

test('con el montón de la jardinera, 2 botellines más para lanzar', () => {
  const a = R.computeLoadout(barbas, { botellin: 3 }, {}, BAR_ITEMS, UPGRADES);
  const b = R.computeLoadout(barbas, { botellin: 3 }, {}, BAR_ITEMS, UPGRADES, { jardinera: true });
  assert.equal(b.ammo - a.ammo, R.JARDINERA_AMMO);
  assert.equal(R.JARDINERA_AMMO, 2);
});

test('la imprecisión aumenta con el puntillo y la puntería la reduce', () => {
  const sober = R.impairment(0, 1), drunk = R.impairment(0.8, 1), aimed = R.impairment(0.8, 1.3);
  assert.equal(sober.whiffChance, 0);
  assert.ok(drunk.whiffChance > 0 && drunk.inputDelayMs > 0 && drunk.throwSpread > 0);
  assert.ok(aimed.whiffChance < drunk.whiffChance);
});

test('ganar da muchísimo más de lo que cuesta el pedido máximo', () => {
  // El pedido más caro posible con todos los huecos comprados (10 bebidas, 2 para fumar y lo demás).
  const units = (kind) => BAR_ITEMS.filter((i) => i.kind === kind).flatMap((i) => Array(i.max).fill(i.price)).sort((a, b) => b - a);
  const maxOrder = units('drink').slice(0, 10).reduce((a, b) => a + b, 0) + units('smoke').slice(0, 2).reduce((a, b) => a + b, 0)
    + BAR_ITEMS.filter((i) => i.kind === 'other').reduce((s, it) => s + it.price * it.max, 0);
  for (const difficulty of R.DIFFICULTY_ORDER) {
    const win = R.matchReward({ won: true, difficulty, roundsWon: 2, roundsLost: 1, perfectRounds: 0, timeLeft: 0, maxCombo: 0, bottles: 0 });
    assert.ok(win.total >= maxOrder, `${difficulty}: ${win.total} vs ${maxOrder}`);
    assert.ok(win.total >= 4 * R.BOTTLE_PRICE * R.MAX_BOTTLES, 'cubre de sobra 10 botellines');
  }
  const lose = R.matchReward({ won: false, difficulty: 'normal', roundsWon: 1 });
  const win = R.matchReward({ won: true, difficulty: 'normal', roundsWon: 2 });
  assert.ok(win.total > lose.total * 5);
});

test('la dificultad escala reacción, daño y recompensa', () => {
  const order = R.DIFFICULTY_ORDER.map((id) => R.DIFFICULTIES[id]);
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i].reactionMs < order[i - 1].reactionMs);
    assert.ok(order[i].cpuDamage > order[i - 1].cpuDamage);
    assert.ok(order[i].reward > order[i - 1].reward);
  }
});

test('el pedido de la CPU respeta el máximo de botellines', () => {
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const c of CHARACTERS) for (const d of R.DIFFICULTY_ORDER) {
    const o = R.cpuOrder(d, c, rng);
    assert.ok(o.botellin >= 0 && o.botellin <= R.MAX_BOTTLES);
  }
});

test('el modo historia desbloquea a cada rival en orden', () => {
  // Todos salen en la historia salvo los que están desde el principio (El Barbas, Rizos).
  assert.equal(STORY.length, CHARACTERS.filter((c) => !c.unlock.start).length);
  STORY.forEach((id, i) => {
    const c = CHARACTERS.find((x) => x.id === id);
    assert.equal(c.unlock.story, i);
    assert.ok(c.unlock.price > 0);
  });
  assert.ok(barbas.unlock.start);
});

test('la bolsa de azúcar: 60 €, sin puntillo 30 s, bajón y desmayo a los 45 s', () => {
  const azucar = BAR_ITEMS.find((i) => i.id === 'azucar');
  assert.equal(azucar.price, 6000);
  const lo = R.computeLoadout(barbas, { botellin: 8, azucar: 1 }, {}, BAR_ITEMS, UPGRADES);
  assert.equal(lo.sugar, true);
  assert.equal(R.intoxAt(lo, 10), 0);
  assert.equal(R.intoxAt(lo, 29.9), 0);
  assert.ok(R.intoxAt(lo, 31) > 0, 'al pasarse el efecto vuelve el puntillo');
  assert.equal(R.sugarPhase(lo, 5), 'boost');
  assert.equal(R.sugarPhase(lo, 35), 'fading');
  assert.equal(R.sugarPhase(lo, 45), 'crashed');
  assert.equal(R.sugarPhase(R.computeLoadout(barbas, {}, {}, BAR_ITEMS, UPGRADES), 50), null);
});

test('el tabaco da cigarrillos y fumar baja el puntillo', () => {
  const lo = R.computeLoadout(barbas, { botellin: 8, tabaco: 1 }, {}, BAR_ITEMS, UPGRADES);
  assert.equal(lo.cigs, 10);
  const before = R.intoxAt(lo, 60);
  const after = R.intoxAt(lo, 60, R.SMOKE.relief);
  assert.ok(Math.abs(before - after - R.SMOKE.relief) < 1e-9);
  assert.equal(R.intoxAt(lo, 60, 5), 0, 'nunca baja de 0');
});

test('combos: más carga del ultimate cuanto más largos, con daño decreciente', () => {
  assert.ok(R.meterGain(3) > R.meterGain(2) && R.meterGain(2) > R.meterGain(1));
  assert.ok(R.comboScale(4).damage < R.comboScale(1).damage);
  assert.ok(R.comboScale(4).knockback > R.comboScale(1).knockback);
  const c3 = R.meterGain(1) + R.meterGain(2) + R.meterGain(3);
  assert.ok(c3 < R.METER_MAX, 'un solo combo corto no llena la barra');
  assert.ok(R.MOVES.dart.unblockable && R.MOVES.dart.damage > 3 * R.MOVES.kick.damage);
  assert.ok(barbas.special && barbas.special.id === 'dardo');
});

test('peleas más largas: más vida y asaltos de 99 s', () => {
  const lo = R.computeLoadout(barbas, {}, {}, BAR_ITEMS, UPGRADES);
  assert.equal(lo.maxHp, Math.round(barbas.stats.hp * R.HP_SCALE));
  assert.equal(R.ROUND_SECONDS, 99);
});

test('policía: el ruido de botellines seguidos crece y a la tercera, calabozo', () => {
  assert.ok(R.bottleNoise(3) > R.bottleNoise(1) && R.bottleNoise(1) > R.bottleNoise(0));
  // Cinco botellines seguidos superan el umbral aunque el ruido baje con el tiempo.
  let n = 0; for (let i = 0; i < 5; i++) n += R.bottleNoise(i) + R.NOISE.bottleBreak;
  assert.ok(n - R.NOISE.decayPerSec * 15 >= R.NOISE.max);
  // Un botellín suelto cada 10 s no la llama nunca.
  assert.ok(R.bottleNoise(0) + R.NOISE.bottleBreak < R.NOISE.decayPerSec * 10);
  const a = R.policeOutcome(1), b = R.policeOutcome(2), c = R.policeOutcome(3);
  assert.ok(a.fine > 0 && !a.jail);
  assert.ok(b.fine >= a.fine && !b.jail);
  assert.ok(c.jail && c.jailMs === 60000);
});

test('fuente: el pilón quita mucha vida, deja mojado y más lento; encendida tapa los botellines', () => {
  const penista = CHARACTERS.find((c) => c.id === 'penista');
  assert.equal(penista.special.id, 'fuente');
  assert.ok(R.MOVES.fountain.unblockable && R.MOVES.fountain.damage > R.MOVES.dart.damage);
  assert.ok(R.WET.ms >= 10000 && R.WET.speedMult < 1 && R.WET.animMult < 1);
  assert.ok(R.FOUNTAIN.masksBottleNoise);
  assert.deepEqual(R.pickFountain('on', 'lit'), { on: true, lit: true });
  assert.deepEqual(R.pickFountain('off', 'dark'), { on: false, lit: false });
  const seen = new Set();
  for (let i = 0; i < 200; i++) { const f = R.pickFountain('random', 'random'); seen.add(f.on + '-' + f.lit); }
  assert.equal(seen.size, 4, 'en aleatorio salen las cuatro combinaciones');
});

test('modo salvaje: normal hasta el segundo 30 y caos después; objetos exagerados', () => {
  assert.equal(R.chaosAt(0), 0);
  assert.equal(R.chaosAt(29.9), 0);
  assert.ok(R.chaosAt(37.5) > 0.4 && R.chaosAt(37.5) < 0.6);
  assert.equal(R.chaosAt(45), 1);
  assert.ok(R.chaosAt(500) <= 1 + R.WILD.chaosExtra + 1e-9);
  const normal = R.computeLoadout(barbas, { botellin: 5 }, {}, BAR_ITEMS, UPGRADES);
  const wild = R.computeLoadout(barbas, { botellin: 5 }, {}, BAR_ITEMS, UPGRADES, { wild: true });
  assert.ok(wild.intoxLevel > normal.intoxLevel && wild.power > normal.power);
  const sober = R.impairment(R.wildLevel(0, 0), 1), chaos = R.impairment(R.wildLevel(0, 1), 1), worst = R.impairment(R.wildLevel(1, 1.25), 1);
  assert.equal(sober.whiffChance, 0);
  assert.ok(chaos.whiffChance > 0.2 && chaos.inputDelayMs > 100, 'solo con el caos ya es horrible');
  assert.ok(worst.whiffChance <= 0.6 && worst.inputDelayMs > chaos.inputDelayMs);
  const won = R.matchReward({ won: true, difficulty: 'normal', roundsWon: 2, wild: true });
  assert.ok(won.lines.some((l) => /salvaje/.test(l.label)));
});

test('La Barra solo sirve bebida: chupitos, Peterete, Red Bull y Marlboro a 6,20 €', () => {
  const ids = BAR_ITEMS.map((i) => i.id);
  for (const food of ['tortilla', 'bocata']) assert.ok(!ids.includes(food), food + ' no debería estar');
  for (const id of ['jager', 'licorcafe', 'tequila', 'peterete', 'energetica', 'tabaco']) assert.ok(ids.includes(id), id);
  const byId = Object.fromEntries(BAR_ITEMS.map((i) => [i.id, i]));
  assert.equal(byId.tabaco.price, 620);
  assert.match(byId.tabaco.name, /Marlboro/);
  assert.equal(byId.energetica.name, 'Red Bull');
  const base = R.computeLoadout(barbas, { botellin: 1 }, {}, BAR_ITEMS, UPGRADES);
  for (const id of ['jager', 'licorcafe', 'tequila']) {
    const lo = R.computeLoadout(barbas, { [id]: 1 }, {}, BAR_ITEMS, UPGRADES);
    assert.ok(lo.power > base.power && lo.intoxLevel > base.intoxLevel && lo.ammo === 0, id + ': más fuerza y puntillo que un botellín, sin envase');
  }
  const pet = R.computeLoadout(barbas, { peterete: 1 }, {}, BAR_ITEMS, UPGRADES);
  assert.ok(pet.fogMult < base.fogMult && pet.ammo === 0);
  // Pedidos viejos con comida se limpian solos.
  assert.deepEqual(R.sanitizeOrder({ tortilla: 1, bocata: 1, botellin: 2 }, BAR_ITEMS), { botellin: 2 });
});

test('puntuación: combos y puntillo suben los puntos; multiplicadores al final', () => {
  assert.equal(R.hitPoints('punch', 1, 0), 100);
  assert.ok(R.hitPoints('punch', 3, 0) > R.hitPoints('punch', 1, 0), 'combo');
  assert.ok(R.hitPoints('kick', 1, 1) === 2 * R.hitPoints('kick', 1, 0), 'estilo: el doble con el puntillo a tope');
  assert.ok(R.hitPoints('fountain', 1, 0) > R.hitPoints('dart', 1, 0));
  assert.ok(R.roundPoints({ perfect: true, timeLeft: 30 }) > R.roundPoints({ perfect: false, timeLeft: 30 }));
  const easy = R.finalScore({ raw: 10000, won: true, difficulty: 'facil' });
  const hard = R.finalScore({ raw: 10000, won: true, difficulty: 'pesadilla', wild: true });
  assert.equal(easy.total, Math.round((10000 + R.SCORE.matchWin) * 0.5));
  assert.equal(hard.total, Math.round((10000 + R.SCORE.matchWin) * 2 * 1.5));
  assert.equal(R.finalScore({ raw: 777, won: false, online: true }).total, 777);
});

test('ranking: orden, puesto, tope de 20 y nombres limpios', () => {
  let list = [];
  for (let i = 0; i < 25; i++) list = R.rankInsert(list, { name: 'J' + i, score: i * 100, at: i }).list;
  assert.equal(list.length, 20);
  assert.equal(list[0].score, 2400);
  assert.equal(R.rankPosition(list, 99999), 1);
  assert.equal(R.rankPosition(list, 0), 0, 'no entra');
  const r = R.rankInsert(list, { name: 'Nuevo', score: 1850, at: 99 });
  assert.equal(r.position, 7);
  assert.equal(R.cleanName('   Julio   el   Barbas   de   La Trolina '), 'Julio el Barba');
  assert.equal(R.cleanName('<script>'), 'script');
  assert.equal(R.formatPoints(1234567), '1.234.567');
});
