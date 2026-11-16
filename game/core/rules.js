/* Reglas puras del juego: economía, dificultad, carga pre-combate y puntillo.
 * Sin DOM: se puede probar con Node (tests/rules.test.cjs).
 * Dinero siempre en céntimos (enteros) para evitar errores de redondeo.
 */
(function (root) {
  const BOTTLE_PRICE = 290;
  const MAX_BOTTLES = 10;
  const START_COINS = 3000;

  const DIFFICULTIES = {
    // grab: agarra al que se cubre · punish: castiga golpes fallados o bloqueados ·
    // parry: guardia justa · tech: se zafa de agarres · dive: patada en picado · rest: respeta su fuelle
    facil:     { id: 'facil', name: 'Fácil', reactionMs: 650, aggression: 0.30, block: 0.10, antiAir: 0.05, combo: 0.10, cpuDamage: 0.75, cpuBottles: [0, 2], reward: 1.0, mistakes: 0.35, grab: 0.08, punish: 0.10, parry: 0, tech: 0.05, dive: 0.10, rest: 0.2 },
    normal:    { id: 'normal', name: 'Normal', reactionMs: 420, aggression: 0.50, block: 0.30, antiAir: 0.20, combo: 0.35, cpuDamage: 1.0, cpuBottles: [1, 4], reward: 1.5, mistakes: 0.18, grab: 0.25, punish: 0.35, parry: 0.04, tech: 0.2, dive: 0.25, rest: 0.5 },
    dificil:   { id: 'dificil', name: 'Difícil', reactionMs: 250, aggression: 0.66, block: 0.50, antiAir: 0.40, combo: 0.60, cpuDamage: 1.15, cpuBottles: [2, 6], reward: 2.2, mistakes: 0.08, grab: 0.45, punish: 0.6, parry: 0.12, tech: 0.45, dive: 0.35, rest: 0.75 },
    pesadilla: { id: 'pesadilla', name: 'Pesadilla', reactionMs: 150, aggression: 0.80, block: 0.70, antiAir: 0.60, combo: 0.85, cpuDamage: 1.3, cpuBottles: [3, 8], reward: 3.2, mistakes: 0.03, grab: 0.65, punish: 0.85, parry: 0.25, tech: 0.7, dive: 0.4, rest: 0.9 }
  };
  const DIFFICULTY_ORDER = ['facil', 'normal', 'dificil', 'pesadilla'];

  /* Golpes (v0.12, «Combate 2.0»). Los tiempos de cada animación están en
   * game/data/moves.js; aquí lo que pasa al conectar.
   *   fuelle: lo que cuesta hacerlo · guard: lo que gasta al que lo bloquea (algo más que
   *   pegar: quien solo se cubre pierde la guerra del fuelle)
   *   chip: parte del daño que quita aunque lo bloqueen (desgaste)
   * Piedra-papel-tijera: golpe > agarre > guardia > golpe; salto > agarre y guardia;
   * gancho (puño contra alguien en el aire) > salto.
   */
  const MOVES = {
    // Puño: rápido y seguro al bloquearlo; empieza los combos.
    punch: { damage: 4.5, hitstun: 400, knockback: 220, blockstun: 260, fuelle: 8, guard: 10, chip: 0.12, push: 28, blockPush: 22 },
    // Patada: más alcance y casi el doble de daño, pero bloqueada o fallada te deja vendido.
    kick: { damage: 9, hitstun: 520, knockback: 420, blockstun: 260, fuelle: 14, guard: 18, chip: 0.12, push: 120, blockPush: 50 },
    // Gancho: el puño contra un rival que salta cerca. Gana a los ataques en el aire y lo tira.
    gancho: { damage: 9, hitstun: 600, knockback: 300, blockstun: 260, fuelle: 8, guard: 12, chip: 0.12, push: 40, blockPush: 30, knockdown: true, launch: -560 },
    // En el aire: puño corto y patada en picado (cae en diagonal muy rápido).
    airPunch: { damage: 5, hitstun: 450, knockback: 200, blockstun: 240, fuelle: 8, guard: 14, chip: 0.12, push: 30, blockPush: 25 },
    dive: { damage: 8, hitstun: 520, knockback: 260, blockstun: 280, fuelle: 14, guard: 24, chip: 0.12, push: 45, blockPush: 15 },
    // Agarre: no se puede bloquear y tira al suelo; pierde contra cualquier golpe o salto.
    grab: { damage: 11, hitstun: 0, knockback: 380, blockstun: 0, fuelle: 10, guard: 0, unblockable: true, knockdown: true },
    bottle: { damage: 9, hitstun: 480, knockback: 520, blockstun: 260, chip: 0.25, fuelle: 5, guard: 15, push: 60, blockPush: 35 },
    // Ultimate de El Barbas: no se puede bloquear.
    dart: { damage: 30, hitstun: 800, knockback: 950, blockstun: 0, unblockable: true, knockdown: true, launch: -420 },
    // Ultimate de El Peñista: agarre y chapuzón en la fuente (no se puede bloquear).
    fountain: { damage: 38, hitstun: 300, knockback: 0, blockstun: 0, unblockable: true }
  };

  /* Fuelle: una sola barra para pegar y para cubrirse.
   * Pegar gasta (unos 10 golpes mezclados); se recupera entero en ~3 s empezando
   * 1,2 s después del último ataque. Cubriéndote no se recupera; al soltar la guardia
   * empieza enseguida (salvo que acabes de pegar). A 0 por pegar: «¡SIN FUELLE!» y no
   * puedes atacar hasta el 30 %. A 0 mientras te cubres: «¡GUARDIA ROTA!».
   */
  const FUELLE = { max: 100, regenDelayMs: 1200, regenFullMs: 3000, guardEnter: 4, exhaustedUntil: 30, dash: 5 };
  // Guardia rota: mareado sin poder hacer nada; al despertar recupera algo de fuelle.
  const GUARD_BREAK = { dizzyMs: 1100, refill: 35 };
  /* Guardia justa (parry): bajar el joystick como mucho `windowMs` antes del golpe,
   * habiendo estado al menos `lockoutMs` sin cubrirse y sin estar ya bloqueando una serie.
   * No gasta fuelle ni vida, devuelve `refund` y deja al atacante vendido. */
  const PARRY = { windowMs: 140, lockoutMs: 300, refund: 10, defenderStunMs: 70, attackerStunMs: 300 };
  // Contra (le pillas arrancando o con el golpe fuera) y castigo (recuperándose de un golpe fallado o bloqueado).
  const COUNTER = { counterDamage: 1.25, counterHitstun: 1.3, punishDamage: 1.2, punishHitstun: 1.25 };
  // Derribo (agarre y gancho): tumbado y luego levantándose, sin que le puedan pegar.
  const KNOCKDOWN = { downMs: 650, getupMs: 320 };
  // Paso rápido: doble toque del joystick hacia delante o hacia atrás.
  const DASH = { fwdMs: 180, fwdV: 640, backMs: 200, backV: 560, recoverMs: 90, doubleTapMs: 260 };
  // Agarre: muy de cerca y con el rival en el suelo, libre y sin estar bloqueando o aturdido.
  const GRAB = { range: 135, holdMs: 320, techMs: 260, throwVx: 380, throwVy: -520, techPush: 360, techStunMs: 260 };
  // Patada en picado: desde un poco de altura; bloqueada o fallada aterrizas vendido.
  const DIVE = { minHeight: 50, startupMs: 60, vx: 760, vy: 980, landBlockMs: 420, landWhiffMs: 300, bounceVx: 200, bounceVy: -440 };
  // El puño sale como gancho si el rival está en el aire a esta distancia (y altura mínima).
  const GANCHO = { range: 300, minHeight: 30 };

  /** Fuelle que se recupera en `dtMs` (sin contar la espera). */
  function fuelleRegen(dtMs) { return FUELLE.max * dtMs / FUELLE.regenFullMs; }
  /** ¿Cuenta como guardia justa? heldMs: tiempo desde que bajó el joystick; idleBeforeMs: lo que llevaba sin cubrirse antes. */
  function isParry({ heldMs, idleBeforeMs, blockstun }) {
    return heldMs >= 0 && heldMs <= PARRY.windowMs && idleBeforeMs >= PARRY.lockoutMs && !(blockstun > 0);
  }
  /** Tipo de golpe según en qué estaba el que lo recibe: 'counter', 'punish' o null. */
  function hitType(phase) {
    if (phase === 'startup' || phase === 'active') return 'counter';
    if (phase === 'recovery' || phase === 'landing') return 'punish';
    return null;
  }
  /** Multiplicadores de daño y aturdimiento por contra/castigo. */
  function hitTypeMult(type) {
    if (type === 'counter') return { damage: COUNTER.counterDamage, hitstun: COUNTER.counterHitstun };
    if (type === 'punish') return { damage: COUNTER.punishDamage, hitstun: COUNTER.punishHitstun };
    return { damage: 1, hitstun: 1 };
  }
  /** Arranque, golpe activo y recuperación (ms) de una animación con cajas de golpe. */
  function frameData(frames, activeRange) {
    let first = -1, last = -1;
    frames.forEach((f, i) => { if ((f.hitboxes || []).length) { if (first < 0) first = i; last = i; } });
    if (activeRange) [first, last] = activeRange;
    const sum = (a, b) => frames.slice(a, b).reduce((n, f) => n + f.duration, 0);
    return { startup: sum(0, first), active: sum(first, last + 1), recovery: sum(last + 1, frames.length), total: sum(0, frames.length) };
  }
  /** Ventaja al ser bloqueado (ms): positivo = el atacante se recupera antes. Peor caso: bloqueado al empezar el golpe. */
  function blockAdvantage(kind, fd) { return MOVES[kind].blockstun - (fd.active + fd.recovery); }

  /* Retroceso: `push`/`blockPush` son los píxeles que se desliza por el suelo el que
   * recibe (al recibir / al bloquear). En el aire se usa `knockback` (velocidad).
   * Regla de esquina: si el que recibe está contra el borde y no le cabe el retroceso,
   * el que pega sale rebotado lo que falta, para que nadie quede encerrado. */
  const PUSH = { friction: 2200, cornerShare: 1 };
  /** Velocidad inicial para deslizarse `px` píxeles frenando con `friction`. */
  function pushSpeed(px, friction) { return Math.sqrt(2 * (friction || PUSH.friction) * Math.max(0, px)); }
  /** Reparte un retroceso: lo que no cabe hasta el borde (room) lo recibe el atacante. */
  function splitPush(px, room) { const def = Math.max(0, Math.min(px, room)); return { def, att: (px - def) * PUSH.cornerShare }; }

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
    hit: { punch: 100, kick: 150, gancho: 250, airPunch: 120, dive: 200, grab: 250, bottle: 200, dart: 1500, fountain: 2000 },
    comboStep: 0.5,       // cada golpe más del combo vale un 50 % más
    styleMax: 1,          // hasta +100 % con el puntillo al máximo
    block: 20,
    parry: 300, guardBreak: 400, tech: 150, counterBonus: 0.5,   // contra/castigo: +50 %
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
    FUELLE, GUARD_BREAK, PARRY, COUNTER, KNOCKDOWN, DASH, GRAB, DIVE, GANCHO,
    fuelleRegen, isParry, hitType, hitTypeMult, frameData, blockAdvantage, PUSH, pushSpeed, splitPush,
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
