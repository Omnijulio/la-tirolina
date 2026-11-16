/* Reglas puras del juego: economía, dificultad, carga pre-combate y puntillo.
 * Sin DOM: se puede probar con Node (tests/rules.test.cjs).
 * Dinero siempre en céntimos (enteros) para evitar errores de redondeo.
 */
(function (root) {
  const BOTTLE_PRICE = 290;
  const MAX_BOTTLES = 10;
  const START_COINS = 3000;

  const DIFFICULTIES = {
    facil:     { id: 'facil', name: 'Fácil', reactionMs: 650, aggression: 0.30, block: 0.10, antiAir: 0.05, combo: 0.10, cpuDamage: 0.75, cpuBottles: [0, 2], reward: 1.0, mistakes: 0.35 },
    normal:    { id: 'normal', name: 'Normal', reactionMs: 420, aggression: 0.50, block: 0.30, antiAir: 0.20, combo: 0.35, cpuDamage: 1.0, cpuBottles: [1, 4], reward: 1.5, mistakes: 0.18 },
    dificil:   { id: 'dificil', name: 'Difícil', reactionMs: 250, aggression: 0.66, block: 0.50, antiAir: 0.40, combo: 0.60, cpuDamage: 1.15, cpuBottles: [2, 6], reward: 2.2, mistakes: 0.08 },
    pesadilla: { id: 'pesadilla', name: 'Pesadilla', reactionMs: 150, aggression: 0.80, block: 0.70, antiAir: 0.60, combo: 0.85, cpuDamage: 1.3, cpuBottles: [3, 8], reward: 3.2, mistakes: 0.03 }
  };
  const DIFFICULTY_ORDER = ['facil', 'normal', 'dificil', 'pesadilla'];

  const MOVES = {
    // Golpes encadenables: el aturdimiento dura más que lo que tarda el siguiente
    // puñetazo en llegar si se cancela al conectar (ver Combatant.update).
    punch: { damage: 5, hitstun: 420, knockback: 260, blockstun: 180 },
    kick: { damage: 7, hitstun: 470, knockback: 420, blockstun: 230 },
    bottle: { damage: 9, hitstun: 480, knockback: 520, blockstun: 260, chip: 0.25 },
    // Ultimate de El Barbas: no se puede bloquear.
    dart: { damage: 30, hitstun: 800, knockback: 950, blockstun: 0, unblockable: true },
    // Ultimate de El Peñista: agarre y chapuzón en la fuente (no se puede bloquear).
    fountain: { damage: 38, hitstun: 300, knockback: 0, blockstun: 0, unblockable: true }
  };

  // Mojado tras caer a la fuente: más lento durante un buen rato.
  const WET = { ms: 12000, speedMult: 0.7, animMult: 0.85 };
  // Fuente: con los chorros encendidos tapa el ruido de los botellines.
  const FOUNTAIN = { masksBottleNoise: true, splashNoise: 10 };

  /* ---------- Modo salvaje (experimental) ----------
   * Los primeros 30 s se juegan normal. Desde el segundo 30 sube el «caos» para los
   * dos luchadores (a tope a los 45 s y un poco más si se alarga): controles que se
   * invierten, golpes que cambian, pasos solos, caídas solo, botellas hacia atrás,
   * micro-siestas… Equilibrio: cuando un golpe entra, pega más fuerte, para que la
   * pelea termine aunque sea un desastre. Los objetos pegan más, para bien y para mal.
   */
  const WILD = {
    chaosStart: 30, chaosFull: 45, chaosExtra: 0.25, chaosExtraSec: 120,
    intoxMult: 1.6, powerMult: 1.4, maxLevel: 1.5, chaosToLevel: 0.9,
    damageBonus: 0.3,                       // +30 % de daño con el caos a tope
    invertPerSec: 0.14, swapChance: 0.3, phantomPerSec: 0.16, fallPerSec: 0.06,
    blackoutPerSec: 0.1, reverseThrow: 0.2, reward: 0.5
  };

  /** Caos del modo salvaje (0 hasta el segundo 30, 1 a los 45, hasta 1,25 si se alarga). */
  function chaosAt(seconds) {
    if (seconds < WILD.chaosStart) return 0;
    const k = Math.min(1, (seconds - WILD.chaosStart) / (WILD.chaosFull - WILD.chaosStart));
    const extra = WILD.chaosExtra * Math.min(1, Math.max(0, seconds - WILD.chaosFull) / WILD.chaosExtraSec);
    return k + extra;
  }

  /** Nivel de torpeza efectivo: puntillo + caos (máx. 1,5). */
  function wildLevel(intox, chaos) {
    return Math.min(WILD.maxLevel, intox + chaos * WILD.chaosToLevel);
  }

  /** Estado de la fuente para un combate: pref 'random' | 'on' | 'off' (luz: 'random' | 'lit' | 'dark'). */
  function pickFountain(pref, lightPref, rng) {
    const r = rng || Math.random;
    const on = pref === 'on' ? true : pref === 'off' ? false : r() < 0.5;
    const lit = lightPref === 'lit' ? true : lightPref === 'dark' ? false : r() < 0.6;
    return { on, lit };
  }

  /* ---------- Puntuación y ranking ----------
   * Puntos por golpe (más si es parte de un combo y más cuanto más puntillo llevas al
   * pegar: «estilo»), por bloquear, por ganar asaltos (perfecto y tiempo de sobra) y por
   * la victoria. Al final se multiplica por la dificultad y por el modo salvaje.
   */
  const SCORE = {
    hit: { punch: 100, kick: 150, bottle: 200, dart: 1500, fountain: 2000 },
    comboStep: 0.5,       // cada golpe más del combo vale un 50 % más
    styleMax: 1,          // hasta +100 % con el puntillo al máximo
    block: 20,
    roundWin: 2000, perfect: 5000, timePerSec: 50,
    matchWin: 5000,
    diffMult: { facil: 0.5, normal: 1, dificil: 1.5, pesadilla: 2 },
    wildMult: 1.5,
    rankSize: 20,
    signBonusCents: 1000  // invitación por firmar en el ranking: 10 €
  };

  function hitPoints(kind, comboN, intox) {
    const base = SCORE.hit[kind] || 0;
    const combo = 1 + SCORE.comboStep * Math.max(0, (comboN || 1) - 1);
    const style = 1 + SCORE.styleMax * Math.max(0, Math.min(1, intox || 0));
    return Math.round(base * combo * style / 10) * 10;
  }

  function roundPoints({ perfect, timeLeft }) {
    return SCORE.roundWin + (perfect ? SCORE.perfect : 0) + Math.max(0, Math.round(timeLeft || 0)) * SCORE.timePerSec;
  }

  /** Puntuación final: los puntos del combate, la victoria y los multiplicadores. */
  function finalScore({ raw, won, difficulty, wild, online }) {
    const lines = [{ label: 'Puntos del combate', pts: Math.round(raw || 0) }];
    let sum = Math.round(raw || 0);
    if (won) { lines.push({ label: 'Victoria', pts: SCORE.matchWin }); sum += SCORE.matchWin; }
    let mult = 1;
    if (!online) {
      const dm = SCORE.diffMult[difficulty] || 1;
      if (dm !== 1) lines.push({ label: 'Dificultad', mult: dm });
      mult *= dm;
    }
    if (wild) { lines.push({ label: 'Modo salvaje', mult: SCORE.wildMult }); mult *= SCORE.wildMult; }
    return { lines, total: Math.round(sum * mult) };
  }

  /** Puesto (1, 2…) que tendría una puntuación en el ranking, o 0 si no entra. */
  function rankPosition(list, score, size) {
    const n = size || SCORE.rankSize;
    const pos = (list || []).filter((e) => e.score >= score).length + 1;
    return pos <= n ? pos : 0;
  }

  /** Mete una entrada en el ranking (de mayor a menor; a igualdad, el más antiguo primero). */
  function rankInsert(list, entry, size) {
    const n = size || SCORE.rankSize;
    const out = (list || []).concat([entry]).sort((a, b) => b.score - a.score || (a.at || 0) - (b.at || 0)).slice(0, n);
    const pos = out.indexOf(entry) + 1;
    return { list: out, position: pos };
  }

  /** Nombre limpio para el ranking: 1–14 caracteres visibles. */
  function cleanName(name) {
    return String(name || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  }

  function formatPoints(n) { return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  /** Ambiente del combate: el fijado en Opciones o uno al azar de la lista. */
  function pickStage(pref, ids, rng) {
    if (ids.includes(pref)) return pref;
    return ids[Math.floor((rng || Math.random)() * ids.length) % ids.length];
  }

  /** Escalado dentro de un combo (n = número de golpe del combo, 1 = primero). */
  function comboScale(n) {
    const k = Math.max(0, (n || 1) - 1);
    return { damage: Math.max(0.4, 1 - 0.12 * k), knockback: 1 + 0.4 * k, hitstun: Math.max(0.6, 1 - 0.08 * k) };
  }
  const MAX_CHAIN = 6;           // a partir de aquí ya no se puede cancelar
  const METER_MAX = 100;
  /** Carga del ultimate por golpe conectado: poco suelto, mucho en combo. */
  function meterGain(n) { return n <= 1 ? 2 : 6 + 4 * (n - 2); }

  const ROUND_SECONDS = 99;
  const ROUNDS_TO_WIN = 2;
  const HP_SCALE = 2.0;          // peleas más largas para poder cargar el ultimate

  // Bolsa de azúcar: subidón, bajón y desmayo (segundos de combate desde el inicio).
  const SUGAR = { boostSec: 30, crashSec: 45, speedMult: 1.4, animMult: 1.2, faintMs: 6000, faintDamage: 1.5 };
  // Tabaco: cada cigarrillo tarda en fumarse y baja el puntillo.
  const SMOKE = { durationMs: 1500, relief: 0.15, heal: 6, coughFrom: 3, coughPerSec: 0.05 };
  const SMOKE_DEFAULTS = { units: 10, ms: 1500, relief: 0.15, heal: 6, coughFrom: 3, look: 'cig' };
  /** Huecos de La Barra: bebidas (cada unidad cuenta) y cosas para fumar (cada paquete cuenta). */
  const SLOTS = { drinks: 7, smokes: 1 };
  /** La CPU también tiene hígado: huecos de bebida según la dificultad. */
  const CPU_DRINK_SLOTS = { facil: 7, normal: 7, dificil: 8, pesadilla: 10 };
  /** Con el montón de botellines en la jardinera, cada uno tiene 2 más para lanzar por asalto. */
  const JARDINERA_AMMO = 2;

  // Ruido de la terraza (0..100). Al llegar a 100 se avisa a la Policía Local.
  // Sobre todo lo provocan muchos botellines seguidos: cada lanzamiento dentro de
  // `streakWindowMs` del anterior suma `bottleStreak` más que el previo.
  const NOISE = {
    max: 100, decayPerSec: 4,
    bottleThrow: 10, bottleBreak: 8, bottleStreak: 8, streakWindowMs: 6000,
    hit: 1.5, block: 0.5, dart: 10, ko: 15,
    drunkPerSec: 2            // × (puntillo de los dos luchadores)
  };
  // Intervención policial: multa a los dos y se reinicia la pelea. A la tercera
  // seguida, noche en el calabozo: esos personajes no se pueden usar durante 1 minuto.
  const POLICE = { fines: [3000, 6000], strikesToJail: 3, jailMs: 60000 };

  /** Ruido que añade un botellín lanzado, según cuántos van seguidos (0 = el primero). */
  function bottleNoise(streak) { return NOISE.bottleThrow + NOISE.bottleStreak * Math.max(0, streak); }

  /** Consecuencia de la intervención número `strike` (1, 2, 3…) sin terminar ninguna pelea. */
  function policeOutcome(strike) {
    const jail = strike >= POLICE.strikesToJail;
    return { strike, jail, fine: jail ? 0 : POLICE.fines[Math.min(strike, POLICE.fines.length) - 1], jailMs: jail ? POLICE.jailMs : 0 };
  }

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

  /** Huecos disponibles con las mejoras compradas. */
  function slotsFor(upgradesLevels, upgrades) {
    const sl = { ...SLOTS };
    for (const up of upgrades || []) {
      const lvl = (upgradesLevels || {})[up.id] || 0;
      if (lvl && up.slots) up.slots(sl, lvl);
    }
    return sl;
  }

  /** Huecos que ocupa un pedido. */
  function orderUsage(order, items) {
    const map = itemsById(items), u = { drinks: 0, smokes: 0 };
    for (const [id, qty] of Object.entries(order || {})) {
      const it = map[id];
      if (!it || !qty) continue;
      if (it.kind === 'drink') u.drinks += qty;
      else if (it.kind === 'smoke') u.smokes += qty;
    }
    return u;
  }

  /**
   * Limpia un pedido: quita lo que ya no existe, respeta el máximo de cada objeto y,
   * si se pasan `slots`, recorta lo que no cabe (por el final de la lista de la barra).
   */
  function sanitizeOrder(order, items, slots) {
    const map = itemsById(items), out = {};
    for (const [id, qty] of Object.entries(order || {})) {
      if (map[id]) { const q = clampQty(qty, map[id].max); if (q) out[id] = q; }
    }
    if (slots) {
      const room = { drinks: slots.drinks, smokes: slots.smokes };
      for (const it of items) {
        const q = out[it.id];
        if (!q || (it.kind !== 'drink' && it.kind !== 'smoke')) continue;
        const key = it.kind === 'drink' ? 'drinks' : 'smokes';
        const keep = Math.max(0, Math.min(q, room[key]));
        room[key] -= keep;
        if (keep) out[it.id] = keep; else delete out[it.id];
      }
    }
    return out;
  }

  /** Combina personaje + mejoras permanentes + pedido de la barra en las cifras de combate. */
  function computeLoadout(character, order, upgradesLevels, items, upgrades, opts) {
    const base = { ...character.stats };
    for (const up of upgrades || []) {
      const lvl = (upgradesLevels || {})[up.id] || 0;
      if (lvl) up.apply(base, lvl);
    }
    const m = { hp: 0, powerPct: 0, speedPct: 0, intox: 0, intoxMult: 1, riseMult: 1, fogMult: 1, ammo: 0, cigs: 0, sugar: false };
    const map = itemsById(items);
    const slots = (opts && opts.slots) || slotsFor(upgradesLevels, upgrades);
    const clean = sanitizeOrder(order, items, slots);
    const smokes = [];
    for (const it of items) {
      const qty = clean[it.id];
      if (!qty) continue;
      for (let i = 0; i < qty; i++) it.effect(m);
      if (it.kind === 'smoke' && it.smoke) smokes.push({ id: it.id, short: it.short, ...SMOKE_DEFAULTS, ...it.smoke });
    }
    if (opts && opts.jardinera) m.ammo += JARDINERA_AMMO;
    if (opts && opts.wild) { m.intox *= WILD.intoxMult; m.powerPct *= WILD.powerMult; }
    const tolerance = Math.max(-0.3, Math.min(0.8, base.tolerance));
    // 10 botellines equivalen a puntillo 1,0 (máximo) para alguien sin aguante extra.
    const intoxLevel = Math.max(0, Math.min(1, m.intox * 0.1 * m.intoxMult * (1 - tolerance)));
    return {
      maxHp: Math.round((base.hp + m.hp) * HP_SCALE),
      power: base.power * (1 + m.powerPct / 100),
      speed: Math.max(0.6, base.speed * (1 + m.speedPct / 100)),
      aim: base.aim,
      tolerance,
      ammo: m.ammo,
      intoxLevel,
      riseMult: m.riseMult,
      fogMult: m.fogMult,
      cigs: m.cigs + smokes.reduce((n, sm) => n + sm.units, 0),
      smokes,
      slots,
      sugar: !!m.sugar,
      bottles: clean.botellin || 0,
      order: clean
    };
  }

  /**
   * Puntillo actual (0..1) a partir del tiempo de combate acumulado (s).
   * Empieza en el 30 % del nivel, llega al 100 % al minuto y puede subir
   * hasta un 25 % más si la pelea se alarga: cuanto más tiempo, más niebla.
   * La bolsa de azúcar lo anula mientras dura el subidón. `relief` es lo que
   * se ha quitado fumando.
   */
  function intoxAt(loadout, seconds, relief) {
    if (!loadout.intoxLevel) return 0;
    if (loadout.sugar && seconds < SUGAR.boostSec) return 0;
    const t = Math.max(0, seconds) * (loadout.riseMult || 1);
    const ramp = 0.3 + 0.7 * Math.min(1, t / 60) + 0.25 * Math.min(1, Math.max(0, t - 60) / 90);
    return Math.max(0, Math.min(1, loadout.intoxLevel * ramp - (relief || 0)));
  }

  /** Fase de la bolsa de azúcar: 'boost' (0–30 s), 'fading' (30–45 s), 'crashed' (45 s+) o null. */
  function sugarPhase(loadout, seconds) {
    if (!loadout.sugar) return null;
    if (seconds < SUGAR.boostSec) return 'boost';
    if (seconds < SUGAR.crashSec) return 'fading';
    return 'crashed';
  }

  /** Efectos negativos derivados del puntillo y la puntería. */
  function impairment(intox, aim) {
    intox = Math.max(0, Math.min(WILD.maxLevel, intox));
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
      lines.push({ label: 'Victoria (' + diff.name + ')', cents: Math.round(12000 * diff.reward) });
      if (r.roundsWon) lines.push({ label: 'Asaltos ganados ×' + r.roundsWon, cents: 3000 * r.roundsWon });
      if (r.ultimates) lines.push({ label: 'Ultimate acertado ×' + r.ultimates, cents: 2500 * r.ultimates });
      if (r.perfectRounds) lines.push({ label: '¡Perfecto! ×' + r.perfectRounds, cents: 3000 * r.perfectRounds });
      if (r.timeLeft > 0) lines.push({ label: 'Tiempo sobrante', cents: Math.round(r.timeLeft) * 20 });
      if (r.maxCombo >= 3) lines.push({ label: 'Combo de ' + r.maxCombo + ' golpes', cents: 400 * r.maxCombo });
      if (r.bottles > 0) lines.push({ label: 'Valor etílico (' + r.bottles + ' botellines)', cents: 250 * r.bottles });
      if (r.boss) lines.push({ label: 'Jefe derrotado', cents: 10000 });
      if (r.firstClear) lines.push({ label: 'Primera vez', cents: 5000 });
      if (r.wild) {
        const sub = lines.reduce((s, l) => s + l.cents, 0);
        lines.push({ label: 'Prima por sobrevivir al modo salvaje', cents: Math.round(sub * WILD.reward) });
      }
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
    const room = cpuSlots(difficulty).drinks;
    bottles = Math.max(0, Math.min(MAX_BOTTLES, room, bottles));
    const order = { botellin: bottles };
    let left = room - bottles;
    const add = (id) => { if (left > 0) { order[id] = (order[id] || 0) + 1; left--; } };
    if (bottles >= 5 && r() < 0.5) add('cafe');
    if (r() < 0.3) add('peterete');
    if (difficulty === 'dificil' && r() < 0.3) add('licorcafe');
    if (difficulty === 'pesadilla' && r() < 0.5) add(r() < 0.5 ? 'jager' : 'tequila');
    // Algo para fumar (un hueco): lo normal es tabaco; en difícil, a veces puro o habano.
    if (bottles >= 3 && r() < 0.6) {
      const k = r();
      order[difficulty === 'pesadilla' && k < 0.4 ? 'habano' : (difficulty === 'dificil' || difficulty === 'pesadilla') && k < 0.7 ? 'puro' : k < 0.5 ? 'tabaco' : k < 0.75 ? 'ducados' : 'liar'] = 1;
    }
    return order;
  }

  function cpuSlots(difficulty) { return { drinks: CPU_DRINK_SLOTS[difficulty] || SLOTS.drinks, smokes: 1 }; }

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
    ROUND_SECONDS, ROUNDS_TO_WIN, HP_SCALE, SUGAR, SMOKE, MAX_CHAIN, METER_MAX, NOISE, POLICE, WET, FOUNTAIN,
    WILD, chaosAt, wildLevel,
    comboScale, meterGain, sugarPhase, bottleNoise, policeOutcome, pickFountain, pickStage,
    SLOTS, JARDINERA_AMMO, slotsFor, orderUsage, cpuSlots,
    SCORE, hitPoints, roundPoints, finalScore, rankPosition, rankInsert, cleanName, formatPoints,
    formatMoney, orderCost, sanitizeOrder, computeLoadout, intoxAt, impairment,
    damageFor, matchReward, cpuOrder, describeOrder, clampQty
  };
  root.TrolinaRules = Rules;
  if (typeof module !== 'undefined') module.exports = Rules;
})(typeof window !== 'undefined' ? window : globalThis);
