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

test('café, agua, tortilla y gafas contrarrestan al botellín', () => {
  const base = R.computeLoadout(barbas, { botellin: 8 }, {}, BAR_ITEMS, UPGRADES);
  const cafe = R.computeLoadout(barbas, { botellin: 8, cafe: 2 }, {}, BAR_ITEMS, UPGRADES);
  const tortilla = R.computeLoadout(barbas, { botellin: 8, tortilla: 1 }, {}, BAR_ITEMS, UPGRADES);
  const gafas = R.computeLoadout(barbas, { botellin: 8, gafas: 1 }, {}, BAR_ITEMS, UPGRADES);
  assert.ok(cafe.intoxLevel < base.intoxLevel);
  assert.ok(R.intoxAt(tortilla, 30) < R.intoxAt(base, 30));
  assert.ok(tortilla.maxHp > base.maxHp);
  assert.ok(gafas.fogMult < base.fogMult);
});

test('el aguante del personaje y el hígado de hierro reducen el puntillo', () => {
  const penista = CHARACTERS.find((c) => c.id === 'penista');
  const runner = CHARACTERS.find((c) => c.id === 'runner');
  const p = R.computeLoadout(penista, { botellin: 6 }, {}, BAR_ITEMS, UPGRADES);
  const r = R.computeLoadout(runner, { botellin: 6 }, {}, BAR_ITEMS, UPGRADES);
  const h = R.computeLoadout(runner, { botellin: 6 }, { higado: 3 }, BAR_ITEMS, UPGRADES);
  assert.ok(p.intoxLevel < r.intoxLevel);
  assert.ok(h.intoxLevel < r.intoxLevel);
});

test('la imprecisión aumenta con el puntillo y la puntería la reduce', () => {
  const sober = R.impairment(0, 1), drunk = R.impairment(0.8, 1), aimed = R.impairment(0.8, 1.3);
  assert.equal(sober.whiffChance, 0);
  assert.ok(drunk.whiffChance > 0 && drunk.inputDelayMs > 0 && drunk.throwSpread > 0);
  assert.ok(aimed.whiffChance < drunk.whiffChance);
});

test('ganar da muchísimo más de lo que cuesta el pedido máximo', () => {
  const maxOrder = BAR_ITEMS.reduce((s, it) => s + it.price * it.max, 0);
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
  assert.equal(STORY.length, CHARACTERS.length - 1);
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
