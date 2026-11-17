/* Animaciones del combate (v0.12, «Combate 2.0»).
 *
 * Tiempos, cajas de golpe y poses de cada golpe del juego, construidos sobre el atlas
 * actual de 6×4 (filas: idle, punch, kick, throwBottle; celdas 192×176, ancla 56,160).
 * Lo que daña, cuesta o empuja cada golpe está en game/core/rules.js (MOVES).
 *
 * Mientras no haya arte propio, cada golpe nuevo reutiliza fotogramas existentes con un
 * giro o desplazamiento (`pose`). Cuando llegue el arte (ver ASSETS_COMBATE.md), basta con
 * añadir la animación con ese nombre al atlas/JSON del luchador: si `data.animations[art]`
 * existe se usan sus fotogramas, tiempos y cajas, y se ignoran las poses provisionales.
 *
 * Formato de cada fotograma: [animación de origen, índice, ms, cajas de golpe?, pose?]
 *   cajas: undefined = las del origen · [] = ninguna · [{x,y,w,h}] en coordenadas de celda
 *   pose:  { rot (rad, + = hacia delante/abajo), dy (px nativos), pivot: 'hip' | 'foot' }
 * active: [primer, último] fotograma «activo» (golpe fuera); lo de antes es arranque y lo
 * de después, recuperación (para la contra, el castigo y la IA).
 */
(function (root) {
  const HIP = { x: 24, y: -65 };   // cadera respecto al ancla (pie trasero), px nativos

  const ANIMS = {
    // Puño: 110 ms de arranque, 90 activo, 150 de recuperación (+20 ms al bloquearlo).
    punch: { active: [3, 3], frames: [
      ['punch', 0, 40], ['punch', 1, 45], ['punch', 2, 25], ['punch', 3, 90], ['punch', 4, 70], ['punch', 5, 80]
    ] },
    // Patada: 250 ms de arranque, 130 activo, 300 de recuperación (−170 ms al bloquearla).
    kick: { active: [3, 3], frames: [
      ['kick', 0, 70], ['kick', 1, 100], ['kick', 2, 80], ['kick', 3, 130], ['kick', 4, 130], ['kick', 5, 170]
    ] },
    // Gancho antiaéreo (el puño cuando el rival salta cerca): gana a lo que venga por el aire.
    gancho: { art: 'gancho', active: [3, 3], frames: [
      ['punch', 0, 30], ['punch', 1, 30], ['punch', 2, 30, [], { rot: -0.18, pivot: 'hip' }],
      ['punch', 3, 120, [{ x: 96, y: -24, w: 62, h: 96 }], { rot: -0.32, dy: -12, pivot: 'hip' }],
      ['punch', 4, 120, [], { rot: -0.22, dy: -6, pivot: 'hip' }], ['punch', 5, 150]
    ] },
    // Puño en el aire: corto, hacia abajo.
    airPunch: { art: 'airPunch', active: [1, 1], frames: [
      ['punch', 1, 40, [], { rot: 0.2, pivot: 'hip' }],
      ['punch', 3, 170, [{ x: 112, y: 70, w: 46, h: 46 }], { rot: 0.35, pivot: 'hip' }],
      ['punch', 4, 110, [], { rot: 0.25, pivot: 'hip' }]
    ] },
    // Patada en picado: un instante de arranque y activa hasta tocar el suelo (lo acaba el combate).
    dive: { art: 'dive', active: [1, 1], frames: [
      ['kick', 2, 60, [], { rot: 0.35, pivot: 'hip' }],
      ['kick', 3, 5000, [{ x: 118, y: 82, w: 50, h: 50 }], { rot: 0.7, pivot: 'hip' }]
    ] },
    // Agarre: 120 ms de arranque (algo más lento que el puño: si los dos pulsáis a la vez, gana el
    // golpe); si no pilla a nadie, recuperación larga (420 ms).
    grab: { art: 'grab', active: [2, 2], frames: [
      ['punch', 1, 60, []], ['punch', 2, 60, []], ['punch', 3, 80, [], { rot: 0.06, dy: 2 }],
      ['punch', 4, 160, []], ['punch', 5, 260, []]
    ] }
  };

  /* Poses de estado (sin golpe). `art` es la animación propia (assets/fighter.json, arte de
   * Combate 2.0 desde v0.12.4); si no existe, `from` toma un fotograma del atlas original y
   * el combate añade giros provisionales. Las animaciones de arte con `loop` se repiten; el
   * resto se quedan en su último fotograma. */
  const POSES = {
    jump: { art: 'jumpApex', from: ['kick', 1] },
    jumpRise: { art: 'jumpRise', from: ['kick', 1] },
    jumpApex: { art: 'jumpApex', from: ['kick', 1] },
    jumpFall: { art: 'jumpFall', from: ['kick', 1] },
    jumpLand: { art: 'jumpLand', from: ['idle', 0] },
    doubleJump: { art: 'doubleJump', from: ['kick', 1] },   // tras el segundo impulso del salto doble
    hit: { art: 'hit', from: ['idle', 0] },
    hitHeavy: { art: 'hitHeavy', from: ['idle', 0] },
    hitAir: { art: 'hitAir', from: ['idle', 0] },
    fall: { art: 'fall', from: ['idle', 0] },
    thrown: { art: 'thrown', from: ['idle', 0] },
    guard: { art: 'guard', from: ['idle', 2] },
    guardEnter: { art: 'guardEnter', from: ['idle', 2] },
    guardHit: { art: 'guardHit', from: ['idle', 2] },
    parry: { art: 'parry', from: ['idle', 2] },
    dizzy: { art: 'dizzy', from: ['idle', 0] },
    down: { art: 'down', from: ['idle', 0] },
    getup: { art: 'getup', from: ['idle', 0] },
    dash: { art: 'dash', from: ['idle', 3] },
    backdash: { art: 'backdash', from: ['idle', 3] },
    land: { art: 'land', from: ['kick', 5] },
    tired: { art: 'tired', from: ['idle', 0] },
    walk: { art: 'walk', from: ['idle', 0] },
    grabHold: { art: 'grabHold', from: ['throwBottle', 1] },
    grabbed: { art: 'grabbed', from: ['idle', 0] },
    grabbedLift: { art: 'grabbedLift', from: ['idle', 0] },
    ko: { art: 'ko', from: ['idle', 0] },
    win: { art: 'win', from: ['throwBottle', 2] }
  };

  function frameOf(data, anim, i) {
    const a = data.animations[anim];
    if (!a) throw new Error('Falta la animación de origen: ' + anim);
    return a.frames[Math.max(0, Math.min(a.frames.length - 1, i))];
  }

  /** Añade/ajusta en `data` (copia del atlas del luchador) las animaciones del combate. */
  function install(data) {
    const src = JSON.parse(JSON.stringify(data.animations));
    const meta = {};
    for (const [name, def] of Object.entries(ANIMS)) {
      const art = def.art && src[def.art] ? src[def.art] : null;
      if (art) {
        // Arte propio: se respeta tal cual (sus tiempos y cajas mandan).
        data.animations[name] = JSON.parse(JSON.stringify(art));
        meta[name] = { active: art.active || def.active, art: true };
        continue;
      }
      const frames = def.frames.map(([anim, i, ms, hit, pose]) => {
        const f = JSON.parse(JSON.stringify(frameOf({ animations: src }, anim, i)));
        f.duration = ms;
        if (hit !== undefined) f.hitboxes = hit;
        if (anim !== 'throwBottle') { delete f.events; delete f.itemSocket; }
        if (pose) f.pose = { rot: pose.rot || 0, dy: pose.dy || 0, pivot: pose.pivot === 'hip' ? HIP : null };
        return f;
      });
      data.animations[name] = { loop: false, next: 'idle', frames };
      meta[name] = { active: def.active };
    }
    data.combatMeta = meta;
    return data;
  }

  /** Fotograma de una pose de estado a los `tMs` de empezar: el del arte propio si existe
   * (en bucle si la animación lo es; si no, se queda en el último), o el provisional.
   * `reverse` recorre el bucle al revés (andar hacia atrás). */
  function poseFrame(data, name, tMs, reverse) {
    const p = POSES[name];
    if (!p) return frameOf(data, 'idle', 0);
    const art = data.animations[p.art];
    if (art && art.frames && art.frames.length) {
      const total = art.frames.reduce((n, f) => n + f.duration, 0);
      let t = Math.max(0, tMs || 0);
      if (art.loop) { t %= total; if (reverse) t = total - 1 - t; }
      for (const f of art.frames) { if (t < f.duration) return f; t -= f.duration; }
      return art.frames[art.frames.length - 1];
    }
    return frameOf(data, p.from[0], p.from[1]);
  }
  /** ¿Hay arte propio para esa pose? (entonces no se aplican giros provisionales). */
  function hasArt(data, name) { const p = POSES[name]; return !!(p && data.animations[p.art]); }

  /** Fase de un golpe en curso: 'startup', 'active' o 'recovery'. */
  function phaseOf(data, anim, frameIndex) {
    const m = data.combatMeta && data.combatMeta[anim];
    let first, last;
    if (m && m.active) [first, last] = m.active;
    else {
      const fr = data.animations[anim].frames;
      first = fr.findIndex((f) => (f.hitboxes || []).length || (f.events || []).length);
      if (first < 0) first = 3;
      last = first;
    }
    return frameIndex < first ? 'startup' : frameIndex <= last ? 'active' : 'recovery';
  }

  /** Milisegundos que faltan para que el golpe salga (0 si ya ha salido). */
  function msToActive(data, anim, frameIndex, elapsed) {
    const m = data.combatMeta && data.combatMeta[anim];
    const first = m && m.active ? m.active[0] : 3;
    if (frameIndex >= first) return 0;
    const fr = data.animations[anim].frames;
    let ms = -(elapsed || 0);
    for (let i = frameIndex; i < first; i++) ms += fr[i].duration;
    return Math.max(0, ms);
  }

  root.TrolinaMoves = { ANIMS, POSES, HIP, install, poseFrame, hasArt, phaseOf, msToActive };
  if (typeof module !== 'undefined') module.exports = root.TrolinaMoves;
})(typeof window !== 'undefined' ? window : globalThis);
