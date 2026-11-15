/* Reglas puras del juego: economía, dificultad, carga pre-combate y puntillo.
 * Sin DOM: se puede probar con Node (tests/rules.test.cjs).
 * Dinero siempre en céntimos (enteros) para evitar errores de redondeo.
 */
(function (root) {
  const BOTTLE_PRICE = 290;
  const MAX_BOTTLES = 10;
  const START_COINS = 3000;

  const DIFFICULTIES = {
    facil:     { id: 'facil', name: 'Fácil', reactionMs: 650, aggression: 0.30, block: 0.10, antiAir: 0.05, cpuDamage: 0.75, cpuBottles: [0, 2], reward: 1.0, mistakes: 0.35 },
    normal:    { id: 'normal', name: 'Normal', reactionMs: 420, aggression: 0.50, block: 0.30, antiAir: 0.20, cpuDamage: 1.0, cpuBottles: [1, 4], reward: 1.5, mistakes: 0.18 },
    dificil:   { id: 'dificil', name: 'Difícil', reactionMs: 250, aggression: 0.66, block: 0.50, antiAir: 0.40, cpuDamage: 1.15, cpuBottles: [2, 6], reward: 2.2, mistakes: 0.08 },
    pesadilla: { id: 'pesadilla', name: 'Pesadilla', reactionMs: 150, aggression: 0.80, block: 0.70, antiAir: 0.60, cpuDamage: 1.3, cpuBottles: [3, 8], reward: 3.2, mistakes: 0.03 }
  };
  const DIFFICULTY_ORDER = ['facil', 'normal', 'dificil', 'pesadilla'];

  const MOVES = {
    punch: { damage: 5, hitstun: 300, knockback: 520, blockstun: 180 },
    kick: { damage: 7, hitstun: 380, knockback: 700, blockstun: 230 },
    bottle: { damage: 9, hitstun: 460, knockback: 600, blockstun: 260, chip: 0.25 }
  };

  const ROUND_SECONDS = 60;
  const ROUNDS_TO_WIN = 2;

  function formatMoney(cents) {
    const v = (cents / 100).toFixed(2).replace('.', ',');
    const [ent, dec] = v.split(',');
    return ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec + ' €';
  }

  function itemsById(items) {
    const map = {};
    for (const it of items) map[it.id] = it;
    return map;
  }

  /** Coste total de un pedido {itemId: cantidad}. Las cantidades se recortan a [0,max]. */
  function orderCost(order, items) {
    const map = itemsById(items);
    let total = 0;
    for (const [id, qty] of Object.entries(order || {})) {
      const it = map[id];
      if (!it) continue;
      total += it.price * clampQty(qty, it.max);
    }
    return total;
  }

  function clampQty(qty, max) {
    return Math.max(0, Math.min(max, Math.floor(Number(qty) || 0)));
  }

  function sanitizeOrder(order, items) {
    const map = itemsById(items), out = {};
    for (const [id, qty] of Object.entries(order || {})) {
      if (map[id]) { const q = clampQty(qty, map[id].max); if (q) out[id] = q; }
    }
    return out;
  }

  /** Combina personaje + mejoras permanentes + pedido de la barra en las cifras de combate. */
  function computeLoadout(character, order, upgradesLevels, items, upgrades) {
    const base = { ...character.stats };
    for (const up of upgrades || []) {
      const lvl = (upgradesLevels || {})[up.id] || 0;
      if (lvl) up.apply(base, lvl);
    }
    const m = { hp: 0, powerPct: 0, speedPct: 0, intox: 0, intoxMult: 1, riseMult: 1, fogMult: 1, ammo: 0 };
    const map = itemsById(items);
    const clean = sanitizeOrder(order, items);
    for (const [id, qty] of Object.entries(clean)) {
      for (let i = 0; i < qty; i++) map[id].effect(m);
    }
    const tolerance = Math.max(-0.3, Math.min(0.8, base.tolerance));
    // 10 botellines equivalen a puntillo 1,0 (máximo) para alguien sin aguante extra.
    const intoxLevel = Math.max(0, Math.min(1, m.intox * 0.1 * m.intoxMult * (1 - tolerance)));
    return {
      maxHp: Math.round(base.hp + m.hp),
      power: base.power * (1 + m.powerPct / 100),
      speed: Math.max(0.6, base.speed * (1 + m.speedPct / 100)),
      aim: base.aim,
      tolerance,
      ammo: m.ammo,
      intoxLevel,
      riseMult: m.riseMult,
      fogMult: m.fogMult,
      bottles: clean.botellin || 0,
      order: clean
    };
  }

  /**
   * Puntillo actual (0..1) a partir del tiempo de combate acumulado (s).
   * Empieza en el 30 % del nivel, llega al 100 % a los 45 s y puede subir
   * hasta un 25 % más si la pelea se alarga: cuanto más tiempo, más niebla.
   */
  function intoxAt(loadout, seconds) {
    if (!loadout.intoxLevel) return 0;
    const t = Math.max(0, seconds) * (loadout.riseMult || 1);
    const ramp = 0.3 + 0.7 * Math.min(1, t / 45) + 0.25 * Math.min(1, Math.max(0, t - 45) / 60);
    return Math.max(0, Math.min(1, loadout.intoxLevel * ramp));
  }

  /** Efectos negativos derivados del puntillo y la puntería. */
  function impairment(intox, aim) {
    const a = Math.max(0.5, 2 - (aim || 1));
    return {
      whiffChance: Math.min(0.6, 0.32 * intox * a),
      throwSpread: 0.55 * intox * a,
      inputDelayMs: 170 * intox,
      stumblePerSec: 0.22 * intox,
      wobble: intox
    };
  }

  function damageFor(move, attackerPower, extraMult) {
    return MOVES[move].damage * attackerPower * (extraMult || 1);
  }

  /** Recompensa del combate. Ganar da muchísimo más de lo que cuesta cualquier pedido. */
  function matchReward(r) {
    const diff = DIFFICULTIES[r.difficulty] || DIFFICULTIES.normal;
    const lines = [];
    if (r.won) {
      lines.push({ label: 'Victoria (' + diff.name + ')', cents: Math.round(8000 * diff.reward) });
      if (r.roundsWon) lines.push({ label: 'Asaltos ganados ×' + r.roundsWon, cents: 2000 * r.roundsWon });
      if (r.perfectRounds) lines.push({ label: '¡Perfecto! ×' + r.perfectRounds, cents: 3000 * r.perfectRounds });
      if (r.timeLeft > 0) lines.push({ label: 'Tiempo sobrante', cents: Math.round(r.timeLeft) * 20 });
      if (r.maxCombo >= 3) lines.push({ label: 'Combo de ' + r.maxCombo + ' golpes', cents: 400 * r.maxCombo });
      if (r.bottles > 0) lines.push({ label: 'Valor etílico (' + r.bottles + ' botellines)', cents: 250 * r.bottles });
      if (r.boss) lines.push({ label: 'Jefe derrotado', cents: 10000 });
      if (r.firstClear) lines.push({ label: 'Primera vez', cents: 5000 });
    } else {
      lines.push({ label: 'Por participar', cents: 1200 });
      if (r.roundsWon) lines.push({ label: 'Asaltos ganados ×' + r.roundsWon, cents: 600 * r.roundsWon });
    }
    return { lines, total: lines.reduce((s, l) => s + l.cents, 0) };
  }

  /** Pedido de la CPU según dificultad y personalidad. rng() devuelve [0,1). */
  function cpuOrder(difficulty, character, rng) {
    const d = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const r = rng || Math.random;
    const [lo, hi] = d.cpuBottles;
    let bottles = lo + Math.floor(r() * (hi - lo + 1)) + ((character.cpu && character.cpu.bottles) || 0);
    bottles = Math.max(0, Math.min(MAX_BOTTLES, bottles));
    const order = { botellin: bottles };
    if (bottles >= 5 && r() < 0.5) order.cafe = 1;
    if (r() < 0.3) order.tortilla = 1;
    if (difficulty === 'pesadilla' && r() < 0.5) order.orujo = 1;
    return order;
  }

  function describeOrder(order, items) {
    const map = itemsById(items), parts = [];
    for (const [id, qty] of Object.entries(order || {})) {
      if (!qty || !map[id]) continue;
      if (id === 'botellin') parts.push(qty + (qty === 1 ? ' botellín' : ' botellines'));
      else parts.push((qty > 1 ? qty + '× ' : '') + map[id].short.toLowerCase());
    }
    if (!parts.length) return 'solo agua del grifo';
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
  }

  const Rules = {
    BOTTLE_PRICE, MAX_BOTTLES, START_COINS, DIFFICULTIES, DIFFICULTY_ORDER, MOVES,
    ROUND_SECONDS, ROUNDS_TO_WIN,
    formatMoney, orderCost, sanitizeOrder, computeLoadout, intoxAt, impairment,
    damageFor, matchReward, cpuOrder, describeOrder, clampQty
  };
  root.TrolinaRules = Rules;
  if (typeof module !== 'undefined') module.exports = Rules;
})(typeof window !== 'undefined' ? window : globalThis);
