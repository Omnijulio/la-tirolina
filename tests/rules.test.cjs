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
    assert.ok(win.total >= 1.5 * maxOrder, `${difficulty}: ${win.total} vs ${maxOrder}`);
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
