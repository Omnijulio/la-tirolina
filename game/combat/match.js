/* Combate completo: asaltos, tiempo, colisiones, daño, botellines, efectos y HUD. */
(function (root) {
  const C = root.TrolinaCombat;
  const R = root.TrolinaRules;
  const FONT = '"Arial Black", "Arial Bold", Impact, system-ui, sans-serif';
  // Rótulos de arriba (asalto, K.O., victoria, ultimate, frases): una franja fina pegada al
  // marcador, para que el escenario y los luchadores se vean enteros. TOP_Y = primera línea;
  // TOP_Y_POLICE si está el aviso de la policía bajo el reloj.
  const TOP_Y = 188, TOP_Y_POLICE = 214;
  // Detrás de la barra del bar (ultimate de El Peñista): tamaño por la distancia, pie bajo la encimera
  // (se le ve de pecho para arriba) y el salto de vuelta a la sala.
  const BEHIND_BAR = { scale: 0.85, foot: 128, arc: 150, vaultMs: 520, vaultHeight: 170 };
  const BANNER_HOLD = 1700, BANNER_FADE = 450;
  /** '#rgb' o '#rrggbb' → 'rgba(r,g,b,a)' (para degradados que se desvanecen sin oscurecer). */
  function rgba(hex, a) {
    let h = String(hex || '#fff').replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  /** Espaciado entre letras si el navegador lo admite (si no, se queda sin él). */
  function spacing(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
  // Versión corta de cada fallo del modo salvaje, cuando ya hay un mensaje grande en pantalla.
  const SNARK_SHORT = {
    whiff: '¡CASI!', stumble: '¡HIC!', fall: '¡PUMBA!', invert: '¡AL REVÉS!', swap: '¿ESO?',
    phantom: '¿A DÓNDE VAS?', delay: 'YA LLEGARÁS…', bottleBack: '¡HACIA ATRÁS!', bottleMiss: '¡A LA MESA!'
  };

  /** BottleSystem compartido + imprecisión por puntillo y sonido de cristal. */
  class MatchBottles extends BottleSystem {
    constructor(image, config, opts, match) { super(image, config, opts); this.match = match; }
    update(dt, actors, targets) {
      const first = this.nextId;
      super.update(dt, actors, targets);
      for (const p of this.projectiles) {
        if (p.id < first || p.tweaked) continue;
        p.tweaked = true;
        if (p.scale !== C.S) {
          // Un luchador más pequeño (Rizos) lanza igual de lejos que los demás.
          const k = C.S / p.scale;
          p.vx *= k; p.vy *= k; p.gravity *= k; p.radius *= k; p.scale = C.S;
        }
        const c = p.owner && p.owner.combatant;
        if (!c) continue;
        const spread = R.impairment(this.match.levelOf(c), c.loadout.aim).throwSpread;
        if (spread > 0) {
          p.vx *= 1 + (Math.random() * 2 - 1) * 0.35 * spread;
          p.vy += (Math.random() * 2 - 1) * 260 * spread;
        }
        // Modo salvaje: a veces sale hacia atrás.
        const chaos = this.match.chaos();
        if (chaos > 0 && Math.random() < R.WILD.reverseThrow * chaos) {
          p.vx = -p.vx; p.facing = -p.facing;
          this.match.say(c, 'bottleBack');
        }
      }
    }
    breakBottle(p) {
      super.breakBottle(p); this.match.sfx('glass'); this.match.addBottleNoise(R.NOISE.bottleBreak);
      const c = p.owner && p.owner.combatant, m = this.match;
      if (c && m.wild) {
        const opp = c === m.p1 ? m.p2 : m.p1;
        if (Math.abs(p.x - opp.cx) > 140) m.say(c, 'bottleMiss');
      }
    }
  }

  // Animaciones que solo se dibujan (sin cajas de golpe ni eventos): un paquete de arte propio puede alargarlas.
  const DRAW_ONLY = { guardHit: 1, parry: 1 };

  class Match {
    /** Datos de animación de un personaje: los comunes (assets/fighter.json) con el botellín, las
     * ultimates y Combate 2.0 (game/data/moves.js). Si tiene arte propio (assets/characters/art-data.js),
     * su mano del botellín y su boca, y las animaciones que su atlas aún no tiene se quitan para que use las
     * poses provisionales. Tiempos y cajas de golpe son los mismos para todos. */
    static fighterData(character) {
      const art = (root.TROLINA_CHARACTER_ART || {})[character && character.id] || null;
      const data = BottleAttack.install(root.FIGHTER_DATA, art && art.sockets ? { sockets: art.sockets } : undefined);
      if (art) {
        if (art.mouth) data.mouth = art.mouth;   // donde va el pitillo
        const H = data.frameHeight || 176, gone = new Set(art.missingRows || []);
        for (const [name, a] of Object.entries(data.animations)) {
          if (a.frames.some((f) => f.y + f.h > art.rows * H || gone.has(Math.floor(f.y / H)))) delete data.animations[name];
        }
        // Estados solo de dibujo que su paquete alarga (encajar en guardia y guardia justa): [col, fila, ms].
        for (const [name, cells] of Object.entries(art.animations || {})) {
          const a = data.animations[name];
          if (!a || !DRAW_ONLY[name] || !cells.length) continue;
          const W = data.frameWidth || 192, base = a.frames[0];
          a.frames = cells.map(([c, r, ms]) => ({ ...base, x: c * W, y: r * H, duration: ms, hitboxes: [], events: [] }));
        }
      }
      // Ultimate de El Barbas: misma animación de lanzamiento, pero suelta un dardo.
      const dartAnim = JSON.parse(JSON.stringify(data.animations.throwBottle));
      for (const f of dartAnim.frames) for (const e of f.events || []) if (e.type === 'spawn-projectile') e.weapon = 'dart';
      data.animations.throwDart = dartAnim;
      // Ultimate de El Peñista: el mismo gesto de lanzar, sin botellín en la mano.
      const grabAnim = JSON.parse(JSON.stringify(data.animations.throwBottle));
      for (const f of grabAnim.frames) { f.events = []; delete f.itemSocket; }
      data.animations.throwGrab = grabAnim;
      // Combate 2.0: tiempos de puño y patada, gancho, puño aéreo, picado y agarre (game/data/moves.js).
      root.TrolinaMoves.install(data);
      return data;
    }

    /** Suelo de pelea (v0.16). En la terraza, la pantalla (70…890) y la cámara apenas se mueve (±24).
     * En el interior del bar, la panorámica entera: la cámara sigue a los luchadores y, como en la
     * terraza, nunca pueden separarse más de 820 px (el ancho de pantalla útil). */
    static arenaFor(interior) {
      const span = C.MAX_X - C.MIN_X;
      if (!interior) return { minX: C.MIN_X, maxX: C.MAX_X, span, wide: false, cam: [-24, 24] };
      return { minX: interior.arena.minX, maxX: interior.arena.maxX, span, wide: true, cam: [interior.camera.min, interior.camera.max] };
    }

    /** Hasta dónde puede ir un luchador con el rival en `other`: el escenario y, en uno ancho, el borde de la pantalla. */
    limitsFor(other) {
      const A = this.arena;
      return { min: Math.max(A.minX, other.cx - A.span), max: Math.min(A.maxX, other.cx + A.span) };
    }

    clampX(c) {
      const L = this.limitsFor(c === this.p1 ? this.p2 : this.p1);
      return Math.max(L.min, Math.min(L.max, c.cx));
    }

    /** Zona a la que llegan los dos (armas en el suelo, separar a los luchadores). */
    reach() {
      const A = this.arena, lo = Math.min(this.p1.cx, this.p2.cx), hi = Math.max(this.p1.cx, this.p2.cx);
      return { min: Math.max(A.minX, hi - A.span), max: Math.min(A.maxX, lo + A.span) };
    }

    /** x del mundo del borde izquierdo de la pantalla (para lo que se coloca respecto a lo que se ve). */
    viewLeft() { return this.camera * 2; }

    /** Cámara hacia la que va: centrada entre los dos, dentro del escenario. */
    cameraTarget() {
      const mid = (this.p1.cx + this.p2.cx) / 2, [lo, hi] = this.arena.cam;
      return Math.max(lo, Math.min(hi, (mid - 480) / 2));
    }

    /** La ultimate de un luchador, con su nombre de este escenario (El Peñista: al fregadero en el bar). */
    specialOf(c) {
      const sp = c.char.special;
      return sp && this.interior && sp.interior ? { ...sp, ...sp.interior } : sp;
    }

    constructor(opts) {
      this.o = opts;
      this.assets = opts.assets;
      this.diff = R.DIFFICULTIES[opts.difficulty] || R.DIFFICULTIES.normal;
      this.timeScale = opts.timeScale || 1;
      // Animaciones de cada luchador (las comunes, con lo propio de su arte si lo tiene).
      const datas = {};
      const dataFor = (ch) => datas[ch.id] || (datas[ch.id] = Match.fighterData(ch));
      const extrasFor = (ch) => {
        const art = (root.TROLINA_CHARACTER_ART || {})[ch.id], img = this.assets.extras && this.assets.extras[ch.id];
        return art && art.extras && img ? { img: img.sheet, def: art.extras, smoke: img.smoke, scooter: img.scooter, puff: img.puff, puffDef: art.weapon && art.weapon.puff } : null;
      };
      // Arma (v0.15): la suya (character.weapon) o, en pruebas, la elegida (sel.weapon: id o null = ninguna).
      const weaponFor = (ch, sel) => {
        const atlas = this.assets.characters[ch.id];
        const art = (root.TROLINA_CHARACTER_ART || {})[ch.id], aw = art && art.weapon;
        const unarmed = (aw && this.assets.unarmed && this.assets.unarmed[ch.id]) || atlas;
        const wid = sel.weapon === undefined ? (ch.weapon || null) : sel.weapon;
        if (!wid || !R.WEAPONS[wid]) return { images: { armed: unarmed, unarmed }, weapon: null };
        const drawn = !!(aw && aw.id === wid);
        const grips = drawn ? aw.grip : ((root.TROLINA_HANDS || {})[ch.id] || (aw && aw.grip) || null);
        return { images: { armed: drawn ? atlas : unarmed, unarmed }, weapon: { id: wid, drawn, grips, prop: (this.assets.weapons || {})[wid] || null } };
      };
      const mk = (side, sel, isCPU) => {
        const w = weaponFor(sel.character, sel);
        return new Combatant({
          character: sel.character, image: w.images.armed, images: w.images, weapon: w.weapon, data: dataFor(sel.character),
          loadout: sel.loadout, isCPU, side, extras: extrasFor(sel.character)
        });
      };
      this.p1 = mk(0, opts.p1, !!opts.autoplay);
      this.p2 = mk(1, opts.p2, true);
      this.fighters = [this.p1, this.p2];
      // Multijugador (experimental): sin CPU; las entradas de los dos llegan por la red (netInputs).
      this.net = opts.net || null;
      this.brain2 = this.net ? null : new CpuBrain(this.p2, opts.difficulty, opts.p2.character.cpu && opts.p2.character.cpu.style);
      this.brain1 = !this.net && opts.autoplay ? new CpuBrain(this.p1, 'normal', 'balanced') : null;
      this.viewer = this.net && this.net.side === 1 ? this.p2 : this.p1;   // a quién «ve» esta pantalla
      if (this.net) { this.p1.seed = 137; this.p2.seed = 731; this.netStall = 0; this.netDesync = false; }
      this.bottles = new MatchBottles(this.assets.bottle, root.BOTTLE_DATA,
        { groundY: C.GROUND, minX: -80, maxX: 1040, onHit: (h) => this.onBottleHit(h) }, this);
      // Ambiente (noche, día, lluvia, nieve, Navidad) y capa opcional de la jardinera.
      this.stageInfo = opts.stage || { id: 'noche', night: true, weather: null };
      // Interior del bar (v0.16): escenario ancho. Sale de la info del ambiente, no de si cargaron las
      // imágenes, para que en el multijugador los dos tengan el mismo suelo aunque a uno le falle una.
      const ID = root.TROLINA_INTERIOR_DATA;
      this.interior = this.stageInfo.place === 'interior' && ID && root.InteriorScene ? ID : null;
      if (this.interior) {
        this.terrace = new root.InteriorScene(opts.stageImages, ID, this.stageInfo.lighting);
        this.sink = new root.BarSplash(this.assets.fountain);
        // Con las luces apagadas suena la música de la bola de discoteca: tapa los botellines, como la fuente.
        this.music = !!this.stageInfo.music;
      } else {
        let stageImgs = opts.stageImages || this.assets.stage, stageData = root.TERRACE_STAGE_DATA;
        if (opts.jardinera && this.assets.jardinera) {
          stageImgs = { ...stageImgs, jardinera: this.assets.jardinera };
          const L = stageData.layers;
          stageData = { ...stageData, layers: [L[0], L[1], { id: 'jardinera', name: 'Montón de la jardinera', parallax: L[1].parallax }, ...L.slice(2)] };
        }
        this.terrace = new TerraceStage(stageImgs, stageData);
      }
      this.arena = Match.arenaFor(this.interior);
      this.bottles.minX = this.arena.minX - 150; this.bottles.maxX = this.arena.maxX + 150;
      const reduceFx = !!(opts.settings && opts.settings.reduceMotion);
      this.weather = this.stageInfo.weather && root.TrolinaWeather ? new root.TrolinaWeather(this.stageInfo.weather, { reduce: reduceFx }) : null;
      this.waterFx = [];
      this.round = 0; this.wins = [0, 0];
      this.matchTime = 0; this.t = 0;
      this.camera = 0; this.shake = 0; this.hitstop = 0; this.slowmo = 0;
      this.sparks = []; this.popups = []; this.dusts = []; this.smokes = []; this.darts = [];
      this.superFreeze = 0; this.superOwner = null;
      this.truce = null; this.chinas = []; this.pitiFx = []; this.parked = [];   // ultimate de Rizos y su patinete
      this.dropped = []; this.puffs = [];   // armas por el suelo (v0.15) y soplos de la bolsita
      this.stats = { perfectRounds: 0, timeLeft: 0, maxCombo: 0, ultimates: 0 };
      // Policía Local: aparece si el ruido llega a 100 (ver TrolinaRules.NOISE).
      this.noise = 0; this.bottleStreak = -1; this.lastBottleAt = -1e9; this.noiseWarned = false;
      this.police = null; this.separate = null;
      // Fuente a la izquierda: encendida/apagada y con/sin luz.
      // Dentro del bar no hay fuente (la ultimate de El Peñista tira al rival al fregadero).
      const fs = opts.fountain || { on: true, lit: true };
      this.fountain = root.Fountain && !this.interior ? new root.Fountain({ on: fs.on, lit: fs.lit, night: this.stageInfo.night !== false, art: this.assets.fountain }) : null;
      this.grab = null; this.fountainNoted = false;
      this.throwing = null;   // agarre normal en curso (botón AGARRE)
      this.fxAnims = [];      // efectos animados del arte de combate (solo decorado)
      // Modo salvaje (experimental): caos desde el segundo 30 y mensajes pasivo-agresivos.
      this.wild = !!opts.wild;
      this.snark = null; this.snarkCd = {}; this.onsetSaid = false; this.blackout = 0; this.visionAt = 0;
      if (opts.police && this.assets.police && root.PoliceIntervention && root.POLICE_DATA) {
        this.policeData = JSON.parse(JSON.stringify(root.POLICE_DATA));
        this.police = new PoliceIntervention(this.assets.police, this.policeData, {
          onStateChange: (e) => this.onPoliceState(e),
          onStop: () => this.onPoliceStop(),
          onResolved: () => this.onPoliceResolved()
        });
        this.police.automatic = false; // la dispara el ruido del juego, no los contadores de la demo
      }
      this.banner = null;
      this.ended = false;
      this.startRound();
    }

    sfx(name) {
      if (!this.o.sfx) return;
      // El sonido no debe gastar el azar con semilla del multijugador.
      const r = Math.random;
      if (root.__trolinaRealRandom) Math.random = root.__trolinaRealRandom;
      try { this.o.sfx.play(name); } finally { Math.random = r; }
    }
    intoxOf(c) { return R.intoxAt(c.loadout, this.matchTime, c.relief); }
    chaos() { return this.wild ? R.chaosAt(this.matchTime) : 0; }
    /** Torpeza efectiva: el puntillo, más el caos en el modo salvaje. */
    levelOf(c) { const i = this.intoxOf(c); return this.wild ? R.wildLevel(i, this.chaos()) : i; }

    /**
     * Mensaje pasivo-agresivo grande en pantalla (solo modo salvaje). Para la CPU
     * solo de vez en cuando. Devuelve true si se ha mostrado.
     */
    say(c, type, force) {
      if (!this.wild || !root.trolinaSnark) return false;
      if (c && c !== this.p1) { if (Math.random() > 0.15) return false; type = 'cpu'; }
      const now = this.t;
      if (!force && ((now - (this.snarkCd[type] || -1e9) < 2600) || (this.snark && now - this.snark.t0 < 1000))) {
        // No pisamos el mensaje grande, pero el fallo se ve igual encima del luchador.
        const short = SNARK_SHORT[type];
        if (c === this.p1 && short) { this.popup(c, short, '#ffd27a'); return true; }
        return false;
      }
      this.snarkCd[type] = now;
      this.snark = { text: root.trolinaSnark(type), t0: now };
      return true;
    }

    startRound() {
      this.round++;
      this.p1.reset(330, 1);
      this.p2.reset(630, -1);
      if (this.arena.wide) this.camera = this.cameraTarget();   // cada asalto, otra vez en el centro de la barra
      this.cancelGrab();
      this.bottles.reset();
      this.darts = []; this.smokes = []; this.superFreeze = 0;
      this.cancelTruce(); this.chinas = []; this.pitiFx = [];
      this.dropped = []; this.puffs = [];   // reset() ya los ha armado y ha cortado bolsitas y recogidas
      this.timer = R.ROUND_SECONDS;
      this.phase = 'intro'; this.phaseT = 0; this.fightCalled = false;
      // Presentación: «¡PELEA!» a los 950 ms y a pelear a los 1650. Si alguien llega en patinete
      // (primer asalto), se alarga hasta que se baja.
      this.fightCallMs = 950; this.introMs = 1650;
      if (this.round === 1) {
        for (const f of this.fighters) {
          const ms = this.startEntrance(f);
          if (ms) { this.introMs = Math.max(this.introMs, ms + 650); this.fightCallMs = this.introMs - 700; }
        }
      }
      this.roundWinner = null;
      const final = this.wins[0] === R.ROUNDS_TO_WIN - 1 && this.wins[1] === R.ROUNDS_TO_WIN - 1;
      this.setBanner(final ? 'ASALTO FINAL' : 'ASALTO ' + this.round, '#f8ce73');
      this.sfx('bell');
      if (this.o.input) this.o.input.clear();
    }

    /** Rótulo de arriba. Se ve BANNER_HOLD ms y se desvanece solo, para dejar ver la escena. */
    setBanner(text, color, sub) { this.banner = { text, color: color || '#fff', sub: sub || '', t: 0, hold: BANNER_HOLD }; }

    /** Suma puntos a un luchador y los enseña flotando donde ha pasado. */
    addScore(c, pts, x, y, big) {
      if (!pts) return;
      c.score += pts;
      if (x === undefined || !this.isHuman(c)) return;
      this.popups.push({ x, y, text: '+' + R.formatPoints(pts), color: big ? '#ffe08a' : '#fff3b0', t: 0, life: big ? 1400 : 800, small: !big, big });
    }
    /** ¿Lo maneja una persona? (para enseñar su marcador) */
    isHuman(c) { return this.net ? true : c === this.p1; }

    popup(c, text, color) {
      this.popups.push({ x: c.cx, y: C.GROUND + c.y - 330, text, color: color || '#fff', t: 0, life: 900 });
    }
    /** Efecto animado del paquete de Combate 2.0 (si está cargado). Devuelve false si no. */
    fxPlay(key, x, y, opts) {
      const D = root.TROLINA_COMBAT_FX, img = this.assets.combatFx && this.assets.combatFx[key];
      if (!D || !img) return false;
      const def = D.fx[key], o = opts || {};
      this.fxAnims.push({ img, def, x, y, t: 0, row: o.row || 0, scale: o.scale || C.S, flip: o.flip || 1, life: o.life || def.cols * def.ms });
      return true;
    }

    dust(x, y, size) {
      // Con el arte de combate: polvo y salpicadura del suelo mojado (el contacto del dibujo va al suelo).
      if ((size || 1) >= 0.6 && this.fxPlay('dust', x, y, { scale: C.S * Math.min(1.5, Math.max(0.8, size || 1)) })) return;
      const rnd = root.__trolinaRealRandom || Math.random;   // solo decorado: no gasta el azar común del multijugador
      for (let i = 0; i < 6; i++) this.dusts.push({ x: x + (rnd() - 0.5) * 60, y, vx: (rnd() - 0.5) * 120, r: 6 + rnd() * 8 * (size || 1), t: 0, life: 420 });
    }
    spark(x, y, kind) {
      // Con el arte de combate: guardia justa, guardia rota e impactos (flojo / fuerte) son animaciones.
      if (kind === 'parry' && this.fxPlay('parry', x, y)) return;
      if (kind === 'break' && this.fxPlay('guardbreak', x, y)) return;
      if ((kind === 'hit' || kind === 'hitHeavy' || kind === 'bottle') && this.fxPlay('hit', x, y, { row: kind === 'hit' ? 0 : 1 })) return;
      if (kind === 'hitHeavy') kind = 'hit';
      this.sparks.push({ x, y, kind, t: 0, life: kind === 'block' ? 180 : kind === 'dart' ? 420 : kind === 'parry' || kind === 'break' ? 380 : 240, rot: (root.__trolinaRealRandom || Math.random)() * Math.PI });
    }
    smokePuff(c) {
      const p = c.cigTip();
      this.smokes.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 24 + c.facing * 14, r: 4 + Math.random() * 4, t: 0, life: 1300 });
    }

    /* ---------- ruido y Policía Local ---------- */

    addNoise(n) {
      if (!this.police || this.police.active || this.phase !== 'fight') return;
      this.noise = Math.max(0, Math.min(R.NOISE.max, this.noise + n));
      if (this.noise >= 70 && !this.noiseWarned) {
        this.noiseWarned = true;
        this.popups.push({ x: 480 + this.camera * 2, y: 250, text: '¡QUÉ ESCÁNDALO! LOS VECINOS SE QUEJAN', color: '#8fd6ff', t: 0, life: 1600 });
      }
      if (this.noise >= R.NOISE.max) this.callPolice();
    }

    onBottleThrown() {
      this.bottleStreak = this.t - this.lastBottleAt < R.NOISE.streakWindowMs ? this.bottleStreak + 1 : 0;
      this.lastBottleAt = this.t;
      this.addBottleNoise(R.bottleNoise(this.bottleStreak));
    }

    /** Con los chorros encendidos la fuente tapa el ruido de los botellines. Dentro del bar hace lo
     * mismo la música, cuando está la bola de discoteca (luces apagadas). */
    addBottleNoise(n) {
      if (((this.fountain && this.fountain.on) || this.music) && R.FOUNTAIN.masksBottleNoise) {
        if (this.police && !this.fountainNoted && this.phase === 'fight') {
          this.fountainNoted = true;
          const text = this.music ? 'LA MÚSICA TAPA EL RUIDO DE LOS BOTELLINES' : 'LA FUENTE TAPA EL RUIDO DE LOS BOTELLINES';
          this.popups.push({ x: 480 + this.camera * 2, y: 250, text, color: '#9ff0ff', t: 0, life: 1600 });
        }
        return;
      }
      this.addNoise(n);
    }

    /* ---------- ultimate de la fuente (El Peñista) ---------- */

    /** Efecto de agua (mojado/goteo) pegado a un luchador. */
    waterOn(c, kind) {
      const D = root.TROLINA_FOUNTAIN_DATA, A = this.assets.fountain;
      if (!D || !A) return;
      const img = kind === 'mojado' ? A.wet : A.drip;
      if (img) this.waterFx.push({ c, img, def: D.fx[kind], t: 0 });
    }

    drip(c) {
      // Goteo mientras está mojado: una tanda cada ~1,3 s.
      if (this.assets.fountain && this.assets.fountain.drip) {
        if (this.t - (c.dripAt || -1e9) < 1300) return;
        c.dripAt = this.t;
        return this.waterOn(c, 'goteo');
      }
      // Solo decorado: azar real, para no gastar el de la semilla común del multijugador.
      const rnd = root.__trolinaRealRandom || Math.random;
      if (rnd() > 0.27) return;
      const hb = c.f.getHurtbox();
      this.dusts.push({ drop: true, x: hb.x + rnd() * hb.w, y: hb.y + rnd() * hb.h * 0.7, vx: 0, vy: 60, r: 2, t: 0, life: 500 });
    }

    startFountainThrow(att) {
      const def = att === this.p1 ? this.p2 : this.p1;
      att.locked = true;
      att.poseOverride = { anim: 'punch', frame: 3 };
      att.facing = Math.sign(def.cx - att.cx) || att.facing;
      this.grab = { att, def, phase: 'dash', t: 0 };
    }

    cancelGrab() {
      this.cancelThrow();
      const g = this.grab;
      if (!g) return;
      g.att.locked = false; g.att.poseOverride = null;
      if (g.def.state === 'grabbed' || g.def.state === 'soaked') {
        g.def.state = this.phase === 'fight' ? 'fight' : 'ready';
        g.def.y = 0; g.def.air = false; g.def.f.enabled = true; g.def.grabRot = 0;
        g.def.soakUpright = false; g.def.throwPose = null;
        if (g.bar) g.def.cx = this.clampX(g.def);   // si estaba detrás de la barra, vuelve a la sala
      }
      this.grab = null;
    }

    updateGrab(dt) {
      const g = this.grab;
      if (!g) return;
      const { att, def } = g;
      const fo = this.fountain;
      g.t += dt;
      if (g.phase === 'dash') {
        att.cx = Math.max(this.arena.minX, Math.min(this.arena.maxX, att.cx + att.facing * 950 * dt / 1000));
        att.sync();
        if (Math.abs(def.cx - att.cx) <= 130 && def.state === 'fight' && Math.abs(def.y) < 160 && !def.downed) {
          g.phase = 'hold'; g.t = 0;
          def.state = 'grabbed'; def.f.play('idle', true); def.f.enabled = false;
          def.smoking = null; def.faintT = 0; def.pending = []; def.hitstun = 0; def.blockstun = 0;
          if (this.interior) {
            // En el bar: por encima de la barra, al fregadero, un poco más allá del rival (para que se
            // le vea caer y no quede tapado por el Peñista), dentro de lo que se ve.
            const side = Math.sign(def.cx - att.cx) || att.facing;
            g.bar = this.terrace.behindBar(def.cx + side * 170, this.viewLeft());
            if (Math.abs(g.bar.x - att.cx) < 120) g.bar = this.terrace.behindBar(att.cx - side * 200, this.viewLeft());
            att.facing = Math.sign(g.bar.x - att.cx) || att.facing;
          } else att.facing = -1;                       // la fuente está a la izquierda
          att.poseOverride = { anim: 'throwBottle', frame: 1 };
          this.popup(att, this.interior ? '¡AL FREGADERO!' : '¡AL PILÓN!', '#9ff0ff');
          this.sfx('grab'); this.hitstop = 90; this.shake = 6;
        } else if (g.t > 520) {
          att.locked = false; att.poseOverride = null;
          att.stumble = 450; att.stumbleDir = att.facing;
          this.popup(att, '¡SE LE ESCAPA!', '#ff8a7a');
          this.grab = null;
        }
        return;
      }
      if (g.phase === 'hold') {
        // Lo levanta por encima de la cabeza antes de tirarlo.
        const k = Math.min(1, g.t / 260);
        def.cx = att.cx + att.facing * (60 - 40 * k); def.y = -60 - 150 * k - R.dsin(g.t / 60) * 3;
        def.facing = -att.facing; def.grabRot = k * Math.PI / 2;
        att.poseOverride = { anim: 'throwBottle', frame: k < 1 ? 1 : 2 };
        def.sync();
        if (g.t > 420) {
          g.phase = 'throw'; g.t = 0;
          att.poseOverride = null; att.f.play('throwGrab', true);
          g.x0 = def.cx; g.y0 = def.y;
          if (g.bar) { g.x1 = g.bar.x; g.y1 = g.bar.top + BEHIND_BAR.foot - C.GROUND; }
          else { g.x1 = fo.x; g.y1 = fo.waterY - C.GROUND + 50; }
          g.dur = Math.min(1100, 600 + Math.abs(g.x0 - g.x1) * 0.6);
          this.sfx('swing');
        }
        return;
      }
      if (g.bar) return this.updateBarGrab(g, dt);
      if (g.phase === 'throw') {
        const u = Math.min(1, g.t / g.dur);
        def.cx = g.x0 + (g.x1 - g.x0) * u;
        def.y = g.y0 + (g.y1 - g.y0) * u - 230 * 4 * u * (1 - u);
        def.grabRot = Math.PI / 2 - u * Math.PI * 3 * def.facing;
        def.sync();
        if (u >= 1) {
          if (!att.attacking) att.locked = false;
          fo.splash(def.cx, 1.2);
          this.sfx('splash'); this.shake = 14; this.hitstop = 160;
          this.addNoise(R.FOUNTAIN.splashNoise);
          const dmg = R.damageFor('fountain', att.powerNow, att === this.p2 ? this.diff.cpuDamage : 1);
          def.grabRot = 0;
          const res = def.splashHit(dmg);
          this.addScore(att, R.hitPoints('fountain', 1, this.intoxOf(att)), def.cx, fo.waterY - 200, true);
          if (att === this.p1) this.stats.ultimates++;
          this.popups.push({ x: def.cx, y: fo.waterY - 150, text: '¡CALADO!', color: '#9ff0ff', t: 0, life: 1100 });
          if (res === 'ko') {
            att.locked = false; this.grab = null;
            this.onKO(att, def);
            return;
          }
          g.phase = 'soak'; g.t = 0;
        }
        return;
      }
      if (g.phase === 'soak') {
        def.cx = fo.x; def.y = fo.waterY - C.GROUND + 56 + R.dsin(g.t / 160) * 3; def.sync();
        if (!att.attacking) att.locked = false;
        // Con los chorros encendidos le sigue cayendo agua encima.
        if (fo.on && this.t - (g.sprayAt || -1e9) > 700) { g.sprayAt = this.t; fo.fx.push({ img: this.assets.fountain && this.assets.fountain.wet, def: root.TROLINA_FOUNTAIN_DATA && root.TROLINA_FOUNTAIN_DATA.fx.mojado, x: fo.x + (Math.random() - 0.5) * 50, y: fo.waterY + 30, t: 0, scale: 1.5 }); }
        if (g.t > 1100) {
          // Sale de la fuente de un salto, empapado.
          def.state = 'fight'; def.f.enabled = true;
          def.cx = Math.min(C.MAX_X, fo.right + 40); def.y = -30; def.air = true; def.vy = -380; def.vx = 160;
          def.facing = Math.sign(att.cx - def.cx) || 1;
          def.hitstun = 250;
          fo.splash(fo.x + 40, 0.5);
          this.waterOn(def, 'mojado');
          att.locked = false; att.poseOverride = null;
          this.grab = null;
        }
      }
    }

    /** «Al fregadero» (El Peñista en el bar): lo tira por encima de la barra, cae al fregadero, se
     * queda un momento detrás (se le ve de pecho para arriba) y salta de vuelta, empapado. Mismo
     * daño, misma puntuación y mismo «mojado» que la fuente. */
    updateBarGrab(g, dt) {
      const { att, def, bar } = g;
      const B = BEHIND_BAR, footY = bar.top + B.foot - C.GROUND;
      if (g.phase === 'throw') {
        const u = Math.min(1, g.t / g.dur);
        def.cx = g.x0 + (g.x1 - g.x0) * u;
        def.y = g.y0 + (g.y1 - g.y0) * u - B.arc * 4 * u * (1 - u);
        def.grabRot = Math.PI / 2 - u * Math.PI * 3 * def.facing;
        g.scale = 1 - (1 - B.scale) * u;
        g.behind = u > 0.55;                        // ya bajando, por encima de la barra: pasa detrás
        def.sync();
        if (u >= 1) {
          if (!att.attacking) att.locked = false;
          def.grabRot = 0;
          this.sink.splash(def.cx, bar.top, 1.2);
          this.sfx('splash'); this.sfx('glass'); this.shake = 14; this.hitstop = 160;
          this.addNoise(R.FOUNTAIN.splashNoise);
          const dmg = R.damageFor('fountain', att.powerNow, att === this.p2 ? this.diff.cpuDamage : 1);
          const res = def.splashHit(dmg);
          this.addScore(att, R.hitPoints('fountain', 1, this.intoxOf(att)), def.cx, bar.top - 140, true);
          if (att === this.p1) this.stats.ultimates++;
          this.popups.push({ x: def.cx, y: bar.top - 110, text: '¡CALADO!', color: '#9ff0ff', t: 0, life: 1100 });
          if (res === 'ko') {
            // K.O. detrás de la barra: lo saca a la sala para que se vea caer.
            def.y = -200; def.cx = this.clampX(def);
            att.locked = false; this.grab = null;
            this.onKO(att, def);
            return;
          }
          g.phase = 'soak'; g.t = 0; g.tapAt = 0;
          def.soakUpright = true;
        }
        return;
      }
      if (g.phase === 'soak') {
        def.cx = bar.x; def.y = footY + R.dsin(g.t / 140) * 3; def.sync();
        if (!att.attacking) att.locked = false;
        // El grifo sigue echándole agua.
        if (g.t - g.tapAt > 420) { g.tapAt = g.t; this.sink.splash(def.cx + (Math.random() - 0.5) * 30, bar.top, 0.35); }
        if (g.t > 1100) {
          // Salta la barra de vuelta a la sala, alejándose un poco del Peñista.
          g.phase = 'vault'; g.t = 0;
          def.soakUpright = false; def.state = 'grabbed'; def.grabRot = 0;
          const away = Math.sign(def.cx - att.cx) || 1, L = this.limitsFor(att);
          g.x0 = def.cx; g.y0 = def.y;
          g.x1 = Math.max(L.min, Math.min(L.max, def.cx + away * 70));
          def.facing = Math.sign(att.cx - g.x1) || def.facing;
          this.sfx('jump');
        }
        return;
      }
      if (g.phase === 'vault') {
        const u = Math.min(1, g.t / B.vaultMs);
        def.cx = g.x0 + (g.x1 - g.x0) * u;
        def.y = g.y0 * (1 - u) - B.vaultHeight * 4 * u * (1 - u);
        def.throwPose = u < 0.5 ? 'jumpRise' : 'jumpFall';
        g.scale = B.scale + (1 - B.scale) * u;
        g.behind = u < 0.45;
        def.sync();
        if (u >= 1) {
          def.state = 'fight'; def.f.enabled = true; def.throwPose = null;
          def.y = -10; def.air = true; def.vy = 300; def.vx = 0;
          def.facing = Math.sign(att.cx - def.cx) || def.facing;
          def.hitstun = 250;
          this.waterOn(def, 'mojado');
          att.locked = false; att.poseOverride = null;
          this.grab = null;
        }
      }
    }

    /** Quien cae al fregadero se dibuja más pequeño (está más lejos) y, detrás de la barra, antes que los mostradores. */
    barDepth(f) {
      const g = this.grab;
      return this.interior && g && g.bar && g.def === f && g.scale ? { behind: !!g.behind, scale: g.scale } : null;
    }

    scaledDraw(c, f, k, draw) {
      if (k === 1) return draw();
      c.save();
      c.translate(f.f.x, f.f.y); c.scale(k, k); c.translate(-f.f.x, -f.f.y);
      try { return draw(); } finally { c.restore(); }
    }

    /* ---------- Rizos: pausa para el piti y entrada en patinete ---------- */

    /** Cuadro de una animación de la segunda hoja a los `t` ms, con sus tiempos escalados a `total`. */
    extraFrame(anim, t, total) {
      const fr = anim.frames, sum = fr.reduce((n, f) => n + f[2], 0), k = total ? total / sum : 1;
      let acc = 0;
      for (let i = 0; i < fr.length; i++) { acc += fr[i][2] * k; if (t < acc) return i; }
      return anim.loop && !total ? 0 : fr.length - 1;
    }
    /** Punto de una celda de la segunda hoja (coordenadas de celda) en el mundo. */
    extraPoint(c, anim, pt) {
      return { x: c.f.x + (pt[0] - anim.ref[0]) * c.S * c.facing, y: c.f.y + (pt[1] - anim.ref[1]) * c.S };
    }

    /** Ultimate de Rizos. Para la pelea R.PITI.pauseMs: se sienta, fuma, se cura y lanza la china. */
    startSmokeBreak(att) {
      if (this.truce || this.phase !== 'fight' || !att.extras || !att.extras.def.anims['ultimate-sit']) return false;
      const def = att === this.p1 ? this.p2 : this.p1;
      this.cancelThrow();
      att.locked = true; att.f.play('idle', true); att.pending = [];
      att.vx = 0; att.guard = false; att.walking = false; att.dashT = 0;
      att.facing = Math.sign(def.cx - att.cx) || att.facing; att.sync();
      // El rival suelta lo que estuviera haciendo y lo que volaba se cae: nadie hace daño.
      def.f.play('idle', true); def.pending = []; def.guard = false; def.walking = false; def.dashT = 0; def.diving = false;
      this.bottles.reset(); this.darts = [];
      this.truce = { att, def, t: 0, flicked: false, emitted: -1, healed: att.hp };
      this.superText = { text: '¡' + this.specialOf(att).name.toUpperCase() + '!', t: 0, c: att };
      this.sfx('super');
      if (att === this.p1) this.stats.ultimates++;
      return true;
    }

    updateTruce(dt) {
      const tr = this.truce;
      if (!tr) return;
      const P = R.PITI, att = tr.att, A = att.extras.def.anims;
      tr.t += dt;
      const riseMs = Math.max(200, P.pauseMs - P.sitMs - P.smokeMs);
      if (tr.t < P.sitMs) {
        att.extraPose = { anim: 'ultimate-sit', frame: this.extraFrame(A['ultimate-sit'], tr.t, P.sitMs) };
        if (tr.t > P.sitMs - 120 && !tr.lit) { tr.lit = true; this.sfx('lighter'); }
      } else if (tr.t < P.sitMs + P.smokeMs) {
        const sm = A['ultimate-smoke'], i = this.extraFrame(sm, tr.t - P.sitMs, P.smokeMs);
        att.extraPose = { anim: 'ultimate-smoke', frame: i };
        // Fuma: recupera vida y baja el puntillo.
        att.hp = Math.min(att.maxHp, att.hp + P.heal * att.maxHp * dt / P.smokeMs);
        att.relief += P.relief * dt / P.smokeMs;
        if (sm.emit !== undefined && i === sm.emit && tr.emitted !== i) {
          tr.emitted = i;
          const mouth = sm.mouth && sm.mouth[i];
          if (mouth && att.extras.smoke) this.pitiFx.push({ kind: 'smoke', ...this.extraPoint(att, sm, mouth), t: 0, life: att.extras.def.smoke.frames * att.extras.def.smoke.ms, c: att });
        }
      } else {
        const u = tr.t - P.sitMs - P.smokeMs, ri = A['ultimate-rise'];
        att.extraPose = { anim: 'ultimate-rise', frame: this.extraFrame(ri, u, riseMs) };
        if (!tr.popped) { tr.popped = true; this.popup(att, '+' + Math.round(att.hp - tr.healed) + ' VIDA', '#8bf2ce'); }
        if (!tr.flicked && u >= P.flickMs) { tr.flicked = true; this.spawnChina(att, tr.def, this.extraPoint(att, ri, [134, 132])); }
      }
      if (tr.t >= P.sitMs + P.smokeMs + riseMs) this.cancelTruce();
    }

    cancelTruce() {
      const tr = this.truce;
      if (!tr) return;
      tr.att.locked = false; tr.att.extraPose = null; tr.att.f.play('idle', true);
      this.truce = null;
    }

    /** La china del cigarro: vuela recta hacia el rival y, si le da, lo manda para atrás. */
    spawnChina(owner, target, from) {
      const hb = target.f.getHurtbox();
      let dx = hb.x + hb.w / 2 - from.x, dy = hb.y + hb.h * 0.35 - from.y;
      if (Math.sign(dx) !== owner.facing) { dx = owner.facing; dy = 0; }
      const len = R.dhypot(dx, dy) || 1, sp = R.PITI.chinaSpeed;
      this.chinas.push({ owner, target, x: from.x, y: from.y, vx: dx / len * sp, vy: dy / len * sp, age: 0, trail: [] });
      this.sfx('swing');
    }

    updateChinas(dt) {
      for (const d of this.chinas) {
        let left = dt;
        while (left > 0 && !d.dead) {
          const ms = Math.min(16, left); left -= ms;
          const ax = d.x, ay = d.y;
          d.x += d.vx * ms / 1000; d.y += d.vy * ms / 1000; d.age += ms;
          d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > 6) d.trail.shift();
          if (this.phase === 'fight' && d.target.state !== 'ko' && !d.target.downed) {
            const t = BottleSystem.segmentBox(ax, ay, d.x, d.y, d.target.f.getHurtbox(), 6);
            if (t !== null) {
              d.x = ax + (d.x - ax) * t; d.y = ay + (d.y - ay) * t; d.dead = true;
              this.applyHit(d.owner, d.target, 'china', d.x, d.y);
              this.popup(d.target, '¡LA CHINA!', '#ff9a4a');
            }
          }
          if (d.x < this.arena.minX - 190 || d.x > this.arena.maxX + 190 || d.y < -100 || d.y > 560 || d.age > 1500) d.dead = true;
        }
      }
      this.chinas = this.chinas.filter((d) => !d.dead);
    }

    /* ---------- armas (v0.15): desarme, arma por el suelo, recogerla y vuelta ---------- */

    /** Le quitan el arma a `c` (por guardia justa o combo de `by`). Sale volando desde su mano. */
    disarm(c, by, via) {
      if (!c.weapon || !c.armed || c.graceT > 0 || c.state === 'ko' || c.bolsa) return false;
      const W = R.WEAPON, from = c.gripPoint();
      const away = Math.sign(c.cx - by.cx) || -c.facing;
      c.setArmed(false); c.disarmT = 0;
      this.dropped = this.dropped.filter((d) => d.owner !== c);
      this.dropped.push({ owner: c, w: c.weapon, x: from.x, y: from.y, vx: away * W.flyVx, vy: W.flyVy,
        rot: from.rot, vr: away * W.spin, flip: c.facing, state: 'fly', t: 0, bounced: 0 });
      this.popup(c, '¡DESARMADO!', '#ff8a7a');
      this.addScore(by, W.score, from.x, from.y - 40);
      this.addNoise(W.noise);
      this.sfx(via === 'parry' ? 'guardBreak' : 'whiff');
      this.shake = Math.max(this.shake, 6);
      return true;
    }

    /** Recupera el arma: al recogerla ('pickup'), cuando vuelve sola ('return') o con la ultimate ('ult'). */
    rearm(c, via) {
      if (!c.weapon || c.armed) return;
      c.setArmed(true); c.disarmT = 0; c.graceT = R.WEAPON.graceMs;
      this.dropped = this.dropped.filter((d) => d.owner !== c);
      if (via === 'pickup') this.popup(c, '¡' + c.weapon.short + '!', '#8bf2ce');
      else if (via === 'return') this.popup(c, c.weapon.breaks ? '¡OTRO ' + c.weapon.short + '!' : '¡VUELVE EL ' + c.weapon.short + '!', '#8bf2ce');
      if (via !== 'ult') this.sfx('buy');
    }

    /** El arma de `c` por el suelo (o volando), si la hay. */
    droppedOf(c) { return this.dropped.find((d) => d.owner === c) || null; }
    /** Punto medio del arma tumbada (para recogerla al pasar por encima). */
    droppedMid(d) {
      const P = (this.assets.weapons || {})[d.w.id], S = d.owner.S;
      const len = P && P.size ? P.size[1] - P.grip[1] : 40;
      return d.x + d.flip * len * 0.5 * S;
    }

    updateWeapons(dt) {
      const W = R.WEAPON, s = dt / 1000;
      for (const c of this.fighters) {
        c.graceT = Math.max(0, c.graceT - dt);
        c.blindT = Math.max(0, c.blindT - dt);
        if (c.picking) this.updatePicking(c, dt);
        if (!c.weapon || c.armed || this.phase !== 'fight' || c.picking) continue;
        c.disarmT += dt;
        if (c.disarmT < W.returnMs) continue;
        // Vuelve sola: la que está en el suelo vuela a su mano; si se rompió (botellín), le ponen otra.
        const d = this.droppedOf(c);
        if (!d) this.rearm(c, 'return');
        else if (d.state === 'ground') { d.state = 'return'; d.t = 0; d.x0 = d.x; d.y0 = d.y; d.r0 = d.rot; }
      }
      for (const d of this.dropped) {
        d.t += dt;
        if (d.state === 'fly') {
          d.vy += C.GRAVITY * s; d.x += d.vx * s; d.y += d.vy * s; d.rot += d.vr * s;
          // Rebota en los bordes: tiene que caer donde se pueda ir a por ella.
          const L = this.reach();
          if (d.x < L.min || d.x > L.max) { d.x = Math.max(L.min, Math.min(L.max, d.x)); d.vx = -d.vx * 0.5; d.vr = -d.vr; }
          const P = (this.assets.weapons || {})[d.w.id], rest = C.GROUND - (P ? P.grip[0] : 5) * d.owner.S;
          if (d.y >= rest && d.vy > 0) {
            if (d.w.breaks) { d.state = 'gone'; this.shatter(d); }
            else if (d.bounced < 1 && d.vy > 300) {
              d.bounced++; d.y = rest; d.vy = -d.vy * W.bounce; d.vx *= 0.5; d.vr *= 0.5;
              this.sfx('land');
            } else {
              // Tumbada en el suelo, apuntando hacia el centro (siempre a mano de su dueño).
              d.state = 'ground'; d.y = rest; d.vx = 0; d.vy = 0; d.rot = -Math.PI / 2;
              d.flip = d.x < (this.arena.wide ? 480 + this.viewLeft() : 480) ? 1 : -1;
              d.x = Math.max(L.min - 30, Math.min(L.max + 30, d.x));
              this.dust(d.x, C.GROUND, 0.5);
            }
          }
        } else if (d.state === 'ground') {
          // Si pasa por encima, la recoge.
          const o = d.owner;
          if (d.w.pickup && this.phase === 'fight' && o.state === 'fight' && !o.air && !o.locked && !o.busy && !o.attacking &&
              !o.picking && Math.abs(o.cx - this.droppedMid(d)) < W.pickupRange * o.size) this.startPicking(o, d);
        } else if (d.state === 'return') {
          const k = Math.min(1, d.t / W.returnFlyMs), to = d.owner.gripPoint();
          d.x = d.x0 + (to.x - d.x0) * k;
          d.y = d.y0 + (to.y - d.y0) * k - 180 * 4 * k * (1 - k);
          d.rot = d.r0 + (to.rot - d.r0) * k; d.flip = d.owner.facing;
          if (k >= 1) this.rearm(d.owner, 'return');
        } else if (d.state === 'held' && d.owner.picking) {
          // Recogiéndola: se va a su mano mientras se agacha.
          const A = d.owner.extras.def.anims.recoger, i = Math.min(A.hand.length - 1, d.owner.extraPose ? d.owner.extraPose.frame : 0);
          const to = this.extraPoint(d.owner, A, A.hand[i]);
          d.x += (to.x - d.x) * Math.min(1, dt / 60); d.y += (to.y - d.y) * Math.min(1, dt / 60);
        }
      }
      this.dropped = this.dropped.filter((d) => d.state !== 'gone');
      for (const p of this.puffs) p.t += dt;
      this.puffs = this.puffs.filter((p) => p.t < p.life);
    }

    /** Se agacha a recoger el arma (con animación si la tiene; si no, la coge al pasar). */
    startPicking(o, d) {
      const A = o.extras && o.extras.def.anims.recoger;
      if (!A || !o.weaponDrawn) { this.rearm(o, 'pickup'); return; }
      o.picking = { t: 0, done: false, d };
      d.state = 'held';
      o.locked = true; o.vx = 0; o.guard = false; o.walking = false; o.pending = []; o.dashT = 0;
      o.f.play('idle', true);
    }

    updatePicking(c, dt) {
      const P = c.picking, A = c.extras.def.anims.recoger;
      P.t += dt;
      const i = this.extraFrame(A, P.t);
      c.extraPose = { anim: 'recoger', frame: i };
      if (!P.done && i >= A.pickup) { P.done = true; this.rearm(c, 'pickup'); }
      if (P.t >= A.frames.reduce((n, f) => n + f[2], 0)) { c.picking = null; c.locked = false; c.extraPose = null; c.f.play('idle', true); }
    }

    /** Le pegan o le agarran recogiéndola: el arma se queda en el suelo. */
    cancelPicking(c) {
      const P = c.picking;
      if (!P) return;
      if (!P.done && P.d && this.dropped.includes(P.d)) { P.d.state = 'ground'; P.d.y = C.GROUND - (((this.assets.weapons || {})[P.d.w.id] || { grip: [5] }).grip[0]) * c.S; }
      c.picking = null; c.locked = false; c.extraPose = null;
    }

    /** El botellín empuñado se rompe al caer: cristales (solo decorado). */
    shatter(d) {
      const rnd = root.__trolinaRealRandom || Math.random;
      for (let i = 0; i < 8; i++) {
        this.dusts.push({ glass: true, x: d.x, y: C.GROUND - 4, vx: (rnd() - 0.5) * 360, vy: -120 - rnd() * 260, r: 2 + rnd() * 2, t: 0, life: 520 });
      }
      this.sfx('glass');
    }

    /* ---------- ultimate de Sombrero: «La bolsita» ---------- */

    /** Recupera el bastón, saca la bolsa, sopla (MOVES.soplo) y bastonazo (MOVES.remate). No le pueden pegar mientras. */
    startBolsa(att) {
      const X = att.extras && att.extras.def;
      if (this.phase !== 'fight' || this.truce || !X || !X.anims['ultimate-arma']) return false;
      const def = att === this.p1 ? this.p2 : this.p1;
      this.cancelPicking(att);
      if (att.weapon) this.rearm(att, 'ult');
      const name = att.drawnArmed || !X.anims['ultimate-mano'] ? 'ultimate-arma' : 'ultimate-mano';
      att.locked = true; att.f.play('idle', true); att.pending = []; att.vx = 0; att.guard = false; att.walking = false; att.dashT = 0;
      att.facing = Math.sign(def.cx - att.cx) || att.facing; att.sync();
      att.bolsa = { name, def, t: 0, puffed: false, struck: false };
      att.extraPose = { anim: name, frame: 0 };
      this.superFlash(att);
      if (att === this.p1) this.stats.ultimates++;
      return true;
    }

    /** Caja de una celda de la segunda hoja ([x, y, w, h] de celda) en el mundo. */
    extraBox(c, anim, b) {
      const p = this.extraPoint(c, anim, [b[0], b[1]]), q = this.extraPoint(c, anim, [b[0] + b[2], b[1] + b[3]]);
      return { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(q.x - p.x), h: Math.abs(q.y - p.y) };
    }
    reaches(box, def) {
      if (def.state !== 'fight' || def.downed) return false;
      const h = def.f.getHurtbox();
      return box.x < h.x + h.w && box.x + box.w > h.x && box.y < h.y + h.h && box.y + box.h > h.y;
    }

    updateBolsas(dt) {
      for (const att of this.fighters) {
        const b = att.bolsa;
        if (!b) continue;
        if (this.phase !== 'fight') { this.endBolsa(att); continue; }   // se acaba el tiempo o el asalto
        const A = att.extras.def.anims[b.name];
        b.t += dt;
        const i = this.extraFrame(A, b.t);
        att.extraPose = { anim: b.name, frame: i };
        if (!b.puffed && A.puff && i >= A.puff.frame) {
          // Sopla: la nube sale de la boca hacia el rival; si le pilla delante, le deja vendido.
          b.puffed = true;
          const at = this.extraPoint(att, A, A.puff.at);
          const PD = att.extras.puffDef;
          if (att.extras.puff && PD) this.puffs.push({ c: att, x: at.x, y: at.y, facing: att.facing, t: 0, life: PD.ms });
          this.sfx('throw');
          const pb = A.puff.box, box = this.extraBox(att, A, [pb[0], pb[1], pb[2] + R.BOLSA.puffReach, pb[3]]);
          if (this.reaches(box, b.def)) {
            this.applyHit(att, b.def, 'soplo', box.x + box.w / 2, box.y + box.h / 2);
            b.def.blindT = R.BOLSA.blindMs;
            this.popup(b.def, '¡PUAJ!', '#c8f5dc');
          }
        }
        if (!b.struck && A.impact && i >= A.impact.frame) {
          b.struck = true;
          const box = this.extraBox(att, A, A.impact.box);
          if (this.reaches(box, b.def)) this.applyHit(att, b.def, 'remate', att.facing > 0 ? box.x + box.w : box.x, box.y + box.h / 2);
          else { this.popup(att, '¡AL AIRE!', '#f8ce73'); this.sfx('whiff'); }
        }
        if (b.t >= A.frames.reduce((n, f) => n + f[2], 0)) this.endBolsa(att);
      }
    }

    endBolsa(att) {
      if (!att.bolsa) return;
      att.bolsa = null; att.locked = false; att.extraPose = null; att.f.play('idle', true);
    }

    /** Entrada en patinete (primer asalto): devuelve lo que dura, o 0 si no tiene. */
    startEntrance(f) {
      const E = f.extras && f.extras.def.entrance;
      if (!E) return 0;
      // Con su arma dibujada, la entrada con ella; sin ella (o con otra en pruebas), la otra si la hay.
      const A = f.extras.def.anims, seq = E.unarmed && !f.drawnArmed ? E.unarmed : E.sequence;
      const sum = (n) => A[n] ? A[n].frames.reduce((k, fr) => k + fr[2], 0) : 0;
      const e = { t: 0, seq, ride: E.rideMs, brake: sum(seq[1]), off: sum(seq[2]) };
      e.total = e.ride + e.brake + e.off;
      e.dx0 = (f.facing > 0 ? -200 : 1160) - f.f.x;   // empieza fuera de la pantalla, por su lado
      f.entrance = e;
      return e.total;
    }

    updateEntrances(dt) {
      for (const f of this.fighters) {
        const e = f.entrance;
        if (!e) continue;
        e.t += dt;
        const A = f.extras.def.anims;
        if (e.t < e.ride) {
          const u = e.t / e.ride, k = 1 - (1 - u) * (1 - u);       // frena al llegar
          const ride = A[e.seq[0]];
          f.extraPose = { anim: e.seq[0], frame: this.extraFrame(ride, e.t % ride.frames.reduce((n, fr) => n + fr[2], 0)), dx: e.dx0 * (1 - k) };
        } else if (e.t < e.ride + e.brake) {
          f.extraPose = { anim: e.seq[1], frame: this.extraFrame(A[e.seq[1]], e.t - e.ride) };
          if (!e.braked) { e.braked = true; this.sfx('dash'); }
        } else if (e.t < e.total) {
          f.extraPose = { anim: e.seq[2], frame: this.extraFrame(A[e.seq[2]], e.t - e.ride - e.brake) };
        } else {
          // Se baja: el patinete se queda aparcado donde ha frenado (detrás de los luchadores).
          f.entrance = null; f.extraPose = null;
          const S = f.extras.def.scooter, ref = A[e.seq[2]].ref;
          if (S && f.extras.scooter) this.parked.push({ img: f.extras.scooter, def: S, x: f.f.x + (S.at[0] - ref[0]) * f.S * f.facing, flip: f.facing < 0, s: f.S });
        }
      }
    }

    drawParked(c) {
      for (const p of this.parked) {
        c.save(); c.imageSmoothingEnabled = false;
        c.translate(Math.round(p.x), C.GROUND);
        c.scale(p.s * p.def.scale * (p.flip ? -1 : 1), p.s * p.def.scale);
        c.drawImage(p.img, -p.def.anchor[0], -p.def.anchor[1]);
        c.restore();
      }
    }

    drawPiti(c) {
      for (const e of this.pitiFx) {
        const D = e.c.extras.def.smoke, img = e.c.extras.smoke;
        if (!img) continue;
        const i = Math.min(D.frames - 1, Math.floor(e.t / D.ms));
        c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = D.opacity;
        c.translate(Math.round(e.x), Math.round(e.y));
        c.scale(e.c.S * e.c.facing, e.c.S);
        c.drawImage(img, i * D.cell[0], 0, D.cell[0], D.cell[1], -D.anchor[0], -D.anchor[1], D.cell[0], D.cell[1]);
        c.restore();
      }
      // La china: colilla con la brasa encendida y una estela de chispas.
      for (const d of this.chinas) {
        c.save();
        for (let i = 0; i < d.trail.length; i++) {
          const p = d.trail[i], k = (i + 1) / d.trail.length;
          c.fillStyle = 'rgba(255,' + Math.round(120 + 100 * k) + ',60,' + (0.5 * k) + ')';
          c.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        c.translate(d.x, d.y); c.rotate(d.age / 40);
        c.fillStyle = '#1b1414'; c.fillRect(-8, -3, 16, 6);
        c.fillStyle = '#d9913e'; c.fillRect(-7, -2, 6, 4);
        c.fillStyle = '#f2efe6'; c.fillRect(-1, -2, 5, 4);
        c.fillStyle = (this.t % 120) < 60 ? '#ff5a1e' : '#ffb347'; c.fillRect(4, -2, 3, 4);
        c.restore();
      }
    }

    callPolice() {
      if (!this.police || this.police.active) return;
      // Los agentes se colocan entre los dos luchadores. En el bar no hay coche: entran andando por
      // la derecha de la pantalla (las luces azules se ven por las ventanas).
      const v = this.arena.wide ? this.viewLeft() : 0;
      const mid = Math.max(v + 230, Math.min(v + 730, (this.p1.cx + this.p2.cx) / 2));
      this.policeData.settings.officerTargetX = [mid - 50, mid + 50];
      if (this.arena.wide) this.policeData.settings.officerSpawnX = [v + 1010, v + 1130];
      this.noise = R.NOISE.max;
      if (this.police.trigger('noise')) this.sfx('siren');
    }

    onPoliceState(e) {
      if (e.state === 'arriving') this.sfx('siren');
      if (e.state === 'radio') this.sfx('radio');
    }

    onPoliceStop() {
      if (this.phase === 'matchEnd' || this.ended) return;
      this.phase = 'police'; this.phaseT = 0;
      this.setBanner('¡ALTO!', '#8fd6ff', 'POLICÍA LOCAL');
      this.sfx('whistle');
      for (const f of this.fighters) {
        if (f.state !== 'ko') { f.state = 'ready'; f.f.play('idle', true); }
        f.smoking = null; f.faintT = 0; f.pending = [];
      }
      this.cancelGrab(); this.cancelTruce(); this.chinas = [];
      for (const f of this.fighters) { this.endBolsa(f); this.cancelPicking(f); }
      this.bottles.reset(); this.darts = []; this.superFreeze = 0; this.slowmo = 0;
      const [ax, bx] = this.policeData.settings.officerTargetX;
      const mid = (ax + bx) / 2;
      const [l, r] = this.p1.cx <= this.p2.cx ? [this.p1, this.p2] : [this.p2, this.p1];
      this.separate = [[l, Math.max(this.arena.minX, mid - 200)], [r, Math.min(this.arena.maxX, mid + 200)]];
      if (this.o.input) this.o.input.clear();
    }

    onPoliceResolved() {
      if (this.ended) return;
      this.ended = true;
      this.o.onPolice && this.o.onPolice({ p1: this.p1.char, p2: this.p2.char });
    }

    /** Congelado de pantalla al activar el ultimate (como un "super" arcade). */
    superFlash(c) {
      this.superFreeze = 700; this.superOwner = c;
      this.superText = { text: '¡' + this.specialOf(c).name.toUpperCase() + '!', t: 0, c };
      this.sfx('super');
    }

    spawnDart(owner, ev) {
      const target = owner === this.p1 ? this.p2 : this.p1;
      const hb = target.f.getHurtbox();
      const tx = hb.x + hb.w / 2, ty = hb.y + hb.h * 0.35;
      let dx = tx - ev.x, dy = ty - ev.y;
      if (Math.sign(dx) !== owner.facing) { dx = owner.facing; dy = 0; }
      const len = R.dhypot(dx, dy) || 1;
      const speed = 1400;
      this.darts.push({ owner, target, x: ev.x, y: ev.y, vx: dx / len * speed, vy: dy / len * speed, speed, age: 0, trail: [] });
      this.sfx('dart');
    }

    updateDarts(dt) {
      for (const d of this.darts) {
        let remaining = dt;
        while (remaining > 0 && !d.dead) {
          const ms = Math.min(16, remaining); remaining -= ms;
          const s = ms / 1000;
          // Ultrapreciso: corrige la trayectoria hacia el rival mientras vuela.
          if (d.target.state !== 'ko') {
            const hb = d.target.f.getHurtbox();
            // Trigonometría determinista (R.d*): en el multijugador debe dar lo mismo en los dos móviles.
            const want = R.datan2(hb.y + hb.h * 0.35 - d.y, hb.x + hb.w / 2 - d.x);
            let ang = R.datan2(d.vy, d.vx);
            let diff = ((want - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            ang += Math.max(-4 * s, Math.min(4 * s, diff));
            d.vx = R.dcos(ang) * d.speed; d.vy = R.dsin(ang) * d.speed;
          }
          const ax = d.x, ay = d.y;
          d.x += d.vx * s; d.y += d.vy * s; d.age += ms;
          d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > 7) d.trail.shift();
          if (this.phase === 'fight' && d.target.state !== 'ko') {
            const t = BottleSystem.segmentBox(ax, ay, d.x, d.y, d.target.f.getHurtbox(), 6);
            if (t !== null) {
              d.x = ax + (d.x - ax) * t; d.y = ay + (d.y - ay) * t; d.dead = true;
              this.applyHit(d.owner, d.target, 'dart', d.x, d.y);
            }
          }
          if (d.x < this.arena.minX - 190 || d.x > this.arena.maxX + 190 || d.y < -100 || d.y > 560 || d.age > 2000) d.dead = true;
        }
      }
      this.darts = this.darts.filter((d) => !d.dead);
    }

    /** Recoge los eventos de suelta del dardo que BottleSystem deja en la cola del actor. */
    collectDartEvents() {
      for (const c of this.fighters) {
        const keep = [];
        for (const ev of c.f.drainEvents()) {
          if (ev.type === 'spawn-projectile' && ev.weapon === 'dart') this.spawnDart(c, ev);
          else keep.push(ev);
        }
        c.f.events.push(...keep);
      }
    }

    incomingBottle(c) {
      for (const p of this.bottles.projectiles) {
        if (!p.alive || p.owner === c.f) continue;
        const dx = c.cx - p.x;
        if (Math.sign(dx) === Math.sign(p.vx) && Math.abs(dx) < 340) return p;
      }
      return null;
    }

    controls(c, brain, opp, actions, dt) {
      const ctl = this.rawControls(c, brain, opp, actions, dt);
      // Pausa para el piti: el rival no se mueve ni ataca; solo puede fumar.
      if (this.truce && c !== this.truce.att) return { left: false, right: false, up: false, block: false, actions: (ctl.actions || []).filter((a) => a === 'smoke') };
      return ctl;
    }
    rawControls(c, brain, opp, actions, dt) {
      if (this.netInputs) {
        const k = c === this.p1 ? 0 : 1, i = this.netInputs[k];
        this.netConsumed[k] = true;
        return { left: !!i.l, right: !!i.r, up: !!i.u, block: !!i.b, actions: this.phase === 'fight' ? i.a : [] };
      }
      if (brain) return brain.think(dt, opp, this);
      const h = this.o.input ? this.o.input.held : {};
      return { left: !!h.left, right: !!h.right, up: !!h.up, block: !!h.block, actions: this.phase === 'fight' ? actions : [] };
    }

    update(dtRaw) {
      if (this.ended) return;
      const real = dtRaw * this.timeScale;
      this.t += real;
      this.updateEffects(real);
      if (this.banner) this.banner.t += real;
      const actions = this.o.input ? this.o.input.take() : [];
      if (this.superText) this.superText.t += real;
      if (this.fountain) this.fountain.update(real);
      if (this.sink) this.sink.update(real);
      if (this.weather) this.weather.update(real);
      for (const w of this.waterFx) w.t += real;
      this.waterFx = this.waterFx.filter((w) => w.def && w.img && w.t < w.def.frames.length * w.def.ms);
      if (this.superFreeze > 0) {
        this.superFreeze -= real;
        if (actions.length && this.o.input) this.o.input.queue.unshift(...actions);
        return;
      }
      if (this.hitstop > 0) { this.hitstop -= real; return; }
      let dt = real;
      if (this.slowmo > 0) { this.slowmo -= real; dt *= 0.3; }
      this.phaseT += dt;

      if (this.phase === 'intro') {
        this.updateEntrances(dt);
        if (this.phaseT > this.fightCallMs && !this.fightCalled) { this.fightCalled = true; this.setBanner('¡PELEA!', '#ff4d5e'); this.sfx('fight'); }
        if (this.phaseT > this.introMs) {
          this.phase = 'fight';
          // «¡PELEA!» no se corta de golpe: se desvanece mientras empieza la pelea.
          if (this.banner) this.banner.hold = Math.min(this.banner.hold, this.banner.t);
          for (const f of this.fighters) {
            f.state = 'fight';
            // STAB: si lleva su bebida o su tabaco, se avisa al empezar la pelea.
            const st = f.loadout.stab;
            if (this.round === 1 && st && st.mult > 1) this.popup(f, '★ STAB ×' + String(Math.round(st.mult * 100) / 100).replace('.', ',') + ' FUERZA', '#ffd76a');
          }
        }
      } else if (this.phase === 'fight') {
        if (!this.truce) {   // durante la pausa para el piti no corre el reloj
          this.timer = Math.max(0, this.timer - dt / 1000);
          this.matchTime += dt / 1000;
        }
        if (this.timer <= 0) this.timeUp();
        if (this.wild) {
          const ch = this.chaos();
          if (ch > 0 && !this.onsetSaid) { this.onsetSaid = true; this.say(null, 'onset', true); this.sfx('bell'); this.shake = 10; }
          if (ch > 0 && this.blackout <= 0 && Math.random() < R.WILD.blackoutPerSec * ch * dt / 1000) {
            this.blackout = 280 + Math.random() * 380;
            if (Math.random() < 0.5) this.say(null, 'blackout');
          }
          if (this.levelOf(this.p1) > 0.8 && this.t - this.visionAt > 9000) { this.visionAt = this.t; this.say(this.p1, 'vision'); }
        }
      } else if (this.phase === 'ko' || this.phase === 'timeup') {
        if (this.phaseT > 1500 && this.roundWinner && this.roundWinner.state !== 'win') {
          this.roundWinner.setWin();
          this.setBanner('GANA ' + this.roundWinner.char.name.toUpperCase(), this.roundWinner.char.color);
        }
        if (this.phaseT > 3300) this.endRound();
      } else if (this.phase === 'matchEnd') {
        // Si la pelea acaba antes de que den el alto, la patrulla llega tarde y se va.
        if (this.police && this.police.active && !this.police.blocksCombat) this.police.reset();
        if (this.phaseT > 2600 && !this.ended) { this.ended = true; this.o.onEnd && this.o.onEnd(this.result()); }
      }
      if (this.police) {
        if (this.phase === 'fight' && !this.police.active && !this.truce) {
          const drunk = this.intoxOf(this.p1) + this.intoxOf(this.p2);
          this.noise = Math.max(0, this.noise + (R.NOISE.drunkPerSec * drunk - R.NOISE.decayPerSec) * dt / 1000);
          if (this.noise >= R.NOISE.max) this.callPolice();
        }
        this.police.update(dt);
      }
      if (this.separate) {
        for (const [f, x] of this.separate) { f.cx += (x - f.cx) * Math.min(1, dt * 0.004); f.sync(); }
      }

      this.updateGrab(dt);
      this.updateTruce(dt);
      this.updateBolsas(dt);
      const c1 = this.controls(this.p1, this.brain1, this.p2, actions, dt);
      const c2 = this.controls(this.p2, this.brain2, this.p1, [], dt);
      this.updateThrow(dt, c1, c2);
      this.p1.update(dt, c1, this.p2, this);
      this.p2.update(dt, c2, this.p1, this);
      this.resolvePush();
      this.updateWeapons(dt);
      // Durante la pausa para el piti nadie hace daño (solo la china, al final).
      if (this.phase === 'fight' && !this.truce) this.checkMelee();
      const targets = this.phase === 'fight' && !this.truce ? [this.p1.f, this.p2.f] : [];
      this.bottles.update(dt, [this.p1.f, this.p2.f], targets);
      this.collectDartEvents();
      this.updateDarts(dt);
      this.updateChinas(dt);
      for (const e of this.pitiFx) e.t += dt;
      this.pitiFx = this.pitiFx.filter((e) => e.t < e.life);
      for (const c of this.fighters) if (c.dropCig) { c.dropCig = false; this.popup(c, '¡SE LE CAE EL PITILLO!', '#ff8a7a'); }

      this.camera += (this.cameraTarget() - this.camera) * Math.min(1, dt * 0.006);
      if (this.arena.wide) {
        // En el bar la cámara nunca deja a nadie fuera: los dos a más de 70 px del borde.
        const lo = Math.min(this.p1.cx, this.p2.cx), hi = Math.max(this.p1.cx, this.p2.cx);
        this.camera = Math.max(this.arena.cam[0], Math.min(this.arena.cam[1], Math.max((hi - 890) / 2, Math.min((lo - 70) / 2, this.camera))));
      }
      this.shake = Math.max(0, this.shake - real * 0.03);
      this.blackout = Math.max(0, this.blackout - real);
    }

    updateEffects(dt) {
      for (const list of [this.sparks, this.popups, this.dusts, this.smokes, this.fxAnims]) for (const e of list) e.t += dt;
      this.fxAnims = this.fxAnims.filter((e) => e.t < e.life);
      this.smokes = this.smokes.filter((e) => e.t < e.life);
      this.sparks = this.sparks.filter((e) => e.t < e.life);
      this.popups = this.popups.filter((e) => e.t < e.life);
      this.dusts = this.dusts.filter((e) => e.t < e.life);
    }

    resolvePush() {
      const a = this.p1, b = this.p2;
      if (a.state === 'ko' || b.state === 'ko' || this.grab || this.throwing) return;
      if (Math.abs(a.y - b.y) > 150) return; // uno salta por encima del otro
      let dx = b.cx - a.cx;
      const overlap = C.PUSH - Math.abs(dx);
      if (overlap <= 0) return;
      const s = Math.sign(dx) || (a.facing === 1 ? 1 : -1);
      a.cx -= s * overlap / 2; b.cx += s * overlap / 2;
      const A = this.arena, clamp = (v) => Math.max(A.minX, Math.min(A.maxX, v));
      a.cx = clamp(a.cx); b.cx = clamp(b.cx);
      dx = b.cx - a.cx;
      const rest = C.PUSH - Math.abs(dx);
      if (rest > 0) {
        if (a.cx === A.minX || a.cx === A.maxX) b.cx = clamp(b.cx + s * rest);
        else a.cx = clamp(a.cx - s * rest);
      }
      a.sync(); b.sync();
    }

    checkMelee() {
      const STRIKE = { punch: 1, kick: 1, gancho: 1, airPunch: 1, dive: 1 };
      const hits = [];
      for (const [att, def] of [[this.p1, this.p2], [this.p2, this.p1]]) {
        const anim = att.f.animation;
        if (anim === 'grab') { this.checkGrab(att, def); continue; }
        if (!STRIKE[anim]) continue;
        if (att.lastHitAction === att.f.actionId || def.state !== 'fight' || att.state !== 'fight' || att.locked || def.downed) continue;
        // El gancho gana a lo que venga por el aire mientras arranca o tiene el golpe fuera.
        if ((anim === 'airPunch' || anim === 'dive') && def.f.animation === 'gancho' && def.attackPhase() !== 'recovery') continue;
        let hbs = att.f.getHitboxes();
        if (!hbs.length) continue;
        // Con el arma en la mano, el puño (y el gancho) llega más lejos.
        const reach = att.reachFor(anim);
        if (reach) hbs = hbs.map((h) => (att.facing > 0 ? { ...h, w: h.w + reach } : { ...h, x: h.x - reach, w: h.w + reach }));
        const hurt = def.f.getHurtbox();
        const hit = hbs.find((h) => h.x < hurt.x + hurt.w && h.x + h.w > hurt.x && h.y < hurt.y + hurt.h && h.y + h.h > hurt.y);
        if (!hit) continue;
        att.lastHitAction = att.f.actionId;
        if (att.whiff) {
          if (!this.say(att, 'whiff')) this.popup(att, '¡AL AIRE!', '#f8ce73');
          this.sfx('whiff');
          att.stumble = Math.max(att.stumble, 260); att.stumbleDir = att.facing;
          continue;
        }
        const px = att.facing === 1 ? Math.max(hit.x, hurt.x) : Math.min(hit.x + hit.w, hurt.x + hurt.w);
        hits.push([att, def, anim, px, hit.y + hit.h / 2]);
      }
      // Se aplican después de mirar los dos: si se pegan a la vez, entran los dos (intercambio).
      for (const h of hits) if (h[1].state === 'fight') this.applyHit(...h);
    }

    /* ---------- agarre (botón AGARRE) ---------- */

    checkGrab(att, def) {
      if (this.throwing || this.grab || att.state !== 'fight' || att.attackPhase() !== 'active' || att.grabTried === att.f.actionId) return;
      const G = R.GRAB;
      if (Math.abs(def.cx - att.cx) > G.range || Math.sign(def.cx - att.cx) !== att.facing) return;
      if (def.state !== 'fight' || def.air || def.downed || def.bolsa) return;
      att.grabTried = att.f.actionId;
      this.cancelPicking(def);
      // Agarre contra agarre: se zafan los dos.
      if (def.f.animation === 'grab' && def.attackPhase() !== 'recovery') { this.techThrow(att, def); return; }
      // No se puede agarrar a quien está recibiendo o bloqueando un golpe: hay que esperar a que se suelte.
      if (def.hitstun > 0 || def.blockstun > 0) return;
      this.throwing = { att, def, t: 0 };
      att.locked = true; att.poseOverride = { state: 'grabHold' };
      def.state = 'grabbed'; def.f.play('idle', true); def.f.enabled = false;
      def.smoking = null; def.pending = []; def.guard = false; def.hitstun = 0; def.blockstun = 0;
      def.dashT = 0; def.diving = false; def.dizzyT = 0; def.faintT = 0; def.grabRot = 0;
      this.popup(att, '¡AGARRE!', '#ffd27a');
      this.sfx('grab'); this.hitstop = 70; this.shake = 4;
    }

    updateThrow(dt, c1, c2) {
      const g = this.throwing;
      if (!g) return;
      const { att, def } = g;
      const G = R.GRAB;
      g.t += dt;
      // Lo sujeta delante, un poco levantado.
      def.facing = -att.facing;
      def.cx = Math.max(this.arena.minX, Math.min(this.arena.maxX, att.cx + att.facing * 70));
      def.y = -24 - Math.min(1, g.t / 200) * 16; def.grabRot = -0.12; def.sync();
      def.throwPose = g.t < 200 ? 'grabbed' : 'grabbedLift';
      // Zafarse: pulsar AGARRE a tiempo.
      const dctl = def === this.p1 ? c1 : c2;
      if (g.t <= G.techMs && dctl && (dctl.actions || []).includes('grab')) {
        dctl.actions = dctl.actions.filter((a) => a !== 'grab');   // la pulsación se gasta en zafarse
        this.techThrow(att, def); return;
      }
      if (g.t < G.holdMs) return;
      // ¡Lo tira al suelo!
      this.throwing = null;
      att.locked = false; att.poseOverride = null; att.f.play(att.f.data.animations.throw ? 'throw' : 'throwGrab', true);
      def.state = 'fight'; def.f.enabled = true; def.grabRot = 0; def.throwPose = null; def.thrownAt = def.t;
      def.air = true; def.vy = G.throwVy; def.vx = att.facing * G.throwVx; def.downPending = true; def.hitstun = 1500;
      const wildBonus = this.wild ? 1 + R.WILD.damageBonus * Math.min(1, this.chaos()) : 1;
      const dmg = R.damageFor('grab', att.powerNow, att === this.p2 ? this.diff.cpuDamage : 1) * wildBonus;
      def.hp = Math.max(0, def.hp - dmg); def.flash = 140; def.flashColor = '#ffffff';
      this.addNoise(R.NOISE.hit * 2);
      this.sfx('kick'); this.shake = 10; this.hitstop = 90;
      this.spark(def.cx, C.GROUND + def.y - 180, 'hitHeavy');
      this.addScore(att, R.hitPoints('grab', 1, this.intoxOf(att)), def.cx, C.GROUND - 300);
      if (att.hasSpecial && !att.meterFull) {
        att.meter = Math.min(R.METER_MAX, att.meter + R.meterGain(2));
        if (att.meterFull) { this.popup(att, '¡' + this.specialOf(att).short + ' LISTO!', '#f8ce73'); this.sfx('ready'); }
      }
      if (def.hp <= 0) { def.knockOut(att.facing); this.onKO(att, def); }
    }

    /** Los dos se sueltan y se separan. */
    techThrow(att, def) {
      this.throwing = null;
      const G = R.GRAB;
      for (const [c, dir] of [[att, -att.facing], [def, att.facing]]) {
        c.locked = false; c.poseOverride = null;
        if (c.state === 'grabbed') { c.state = 'fight'; c.f.enabled = true; c.y = 0; c.air = false; c.grabRot = 0; c.throwPose = null; }
        c.f.play('idle', true); c.hitstun = 0; c.blockstun = G.techStunMs; c.pending = [];
        c.vx = dir * G.techPush;
        c.sync();
      }
      this.popup(def, '¡SE ZAFA!', '#8fd6ff');
      this.spark((att.cx + def.cx) / 2, C.GROUND - 200, 'block');
      this.sfx('block'); this.hitstop = 60;
      this.addScore(def, R.SCORE.tech);
    }

    cancelThrow() {
      const g = this.throwing;
      if (!g) return;
      this.throwing = null;
      g.att.locked = false; g.att.poseOverride = null;
      if (g.def.state === 'grabbed') {
        g.def.state = this.phase === 'fight' ? 'fight' : 'ready';
        g.def.y = 0; g.def.air = false; g.def.f.enabled = true; g.def.grabRot = 0; g.def.throwPose = null;
      }
    }

    onBottleHit({ owner, target }) {
      const att = owner && owner.combatant, def = target && target.combatant;
      if (!att || !def || this.phase !== 'fight' || def.state === 'ko') return;
      this.applyHit(att, def, 'bottle', def.cx - def.facing * 10, C.GROUND + def.y - 210);
    }

    applyHit(att, def, kind, x, y) {
      if (def.bolsa) return;   // sacando la bolsa no le tocan
      const stunned = def.hitstun > 0;
      const n = stunned ? att.combo + 1 : 1;
      const ult = !!R.ULT_MOVES[kind];   // ultimates a distancia o guiadas: sin escala de combo
      const sc = ult ? { damage: 1, knockback: 1, hitstun: 1 } : R.comboScale(n);
      const mv = R.MOVES[kind];
      const melee = kind !== 'bottle' && !ult;
      // ¿Le pillas arrancando un golpe («contra») o recuperándose de uno («castigo»)?
      const type = !stunned && !mv.unblockable && def.state === 'fight' ? R.hitType(def.attackPhase()) : null;
      const tm = R.hitTypeMult(type);
      const wildBonus = this.wild ? 1 + R.WILD.damageBonus * Math.min(1, this.chaos()) : 1;
      const dmg = R.damageFor(kind, att.powerNow, att === this.p2 ? this.diff.cpuDamage : 1) * sc.damage * wildBonus * tm.damage *
        R.weaponPower(att.weapon, kind, att.armed);   // con el arma en la mano pega más
      if (this.wild && def === this.p1 && this.levelOf(def) > 0.6 && Math.random() < 0.25) this.say(def, 'gotHit');
      const res = def.takeHit(kind, dmg, att.cx, { hitstun: mv.hitstun * sc.hitstun * tm.hitstun, knockback: mv.knockback * sc.knockback, pushMult: sc.knockback });
      if (res === 'miss') return;
      if (res === 'hit' || res === 'ko') this.cancelPicking(def);   // recogiendo el arma: se queda en el suelo
      this.addNoise(res === 'block' || res === 'parry' ? R.NOISE.block : res === 'ko' ? R.NOISE.ko : ult ? R.NOISE.dart : R.NOISE.hit);
      // La patada en picado rebota en el rival (al dar, al bloquearla o al rechazarla).
      const bounce = (k) => {
        if (kind !== 'dive' || !att.air) return;
        att.diving = false; att.f.play('idle', true);
        att.vx = -att.facing * R.DIVE.bounceVx * k; att.vy = R.DIVE.bounceVy * k;
      };
      // Regla de esquina: el retroceso que no cabe hasta el borde lo recibe el que pega.
      if (melee && (res === 'hit' || res === 'block' || res === 'break') && !def.air && !att.air && !att.locked) {
        const px = (res === 'hit' ? mv.push : res === 'break' ? 40 : mv.blockPush) * (res === 'hit' ? sc.knockback : 1);
        const away = Math.sign(def.cx - att.cx) || att.facing;
        const L = this.limitsFor(att);   // el borde del escenario o, en el bar, el de la pantalla
        const room = away > 0 ? L.max - def.cx : def.cx - L.min;
        const sp = R.splitPush(px || 0, Math.max(0, room - 2));
        if (sp.att > 4) att.vx = -away * R.pushSpeed(sp.att);
      }
      if (res === 'parry') {
        this.spark(x, y, 'parry'); this.sfx('parry'); this.hitstop = 120;
        if (melee) {
          att.hitstun = Math.max(att.hitstun, R.PARRY.attackerStunMs);
          att.f.play('idle', true); att.pending = []; att.dashT = 0;
          bounce(0.4);
        }
        att.combo = 0;
        this.popup(def, '¡JUSTA!', '#e8fbff');
        this.addScore(def, R.SCORE.parry, x, y - 40);
        // Guardia justa a un golpe con el arma: se le cae.
        if (melee && att.armed && R.disarms('parry', 0, kind)) this.disarm(att, def, 'parry');
        if (def.hasSpecial && !def.meterFull) def.meter = Math.min(R.METER_MAX, def.meter + 8);
        return;
      }
      if (res === 'block') {
        this.spark(x, y, 'block'); this.sfx('block'); this.hitstop = 45;
        this.addScore(def, R.SCORE.block);
        att.combo = 0;
        if (kind === 'dive' && att.air) {
          // Bloqueada: deja de picar y cae casi encima, para aterrizar vendido a tiro.
          att.diving = false; att.f.play('idle', true);
          att.vx = att.facing * 120; att.vy = 220; att.landRecNext = R.DIVE.landBlockMs;
        }
        if (def.hp <= 0) this.onKO(att, def);
        return;
      }
      if (res === 'break') {
        this.spark(x, y, 'break'); this.sfx('guardBreak'); this.hitstop = 150; this.shake = 12;
        this.popup(def, '¡GUARDIA ROTA!', '#ff8a7a');
        this.addScore(att, R.SCORE.guardBreak, x, y - 40);
        att.combo = 0;
        bounce(1);
        return;
      }
      if (kind === 'punch' || kind === 'kick') att.hitConfirm = att.f.actionId;
      this.spark(x, y, kind === 'bottle' ? 'bottle' : kind === 'dart' ? 'dart' : kind === 'punch' || kind === 'airPunch' ? 'hit' : 'hitHeavy');
      this.sfx(kind === 'kick' || kind === 'dive' || kind === 'gancho' ? 'kick' : ult ? 'dartHit' : 'punch');
      if (type) { this.popup(def, type === 'counter' ? '¡CONTRA!' : '¡CASTIGO!', type === 'counter' ? '#ffb347' : '#ff6a5a'); this.sfx('counter'); }
      bounce(1);
      att.combo = n;
      this.addScore(att, Math.round(R.hitPoints(kind, n, this.intoxOf(att)) * (type ? 1 + R.SCORE.counterBonus : 1) / 10) * 10, x, y - 40);
      if (n >= 2) this.popup(att, n + ' GOLPES', '#8bf2ce');
      if (att === this.p1) this.stats.maxCombo = Math.max(this.stats.maxCombo, n);
      // El golpe número R.WEAPON.disarmCombo de un combo le quita el arma.
      if (res !== 'ko' && def.armed && R.disarms('combo', n, kind)) this.disarm(def, att, 'combo');
      // El ultimate se carga encadenando golpes.
      if (att.hasSpecial && !ult && !att.meterFull) {
        att.meter = Math.min(R.METER_MAX, att.meter + R.meterGain(n));
        if (att.meterFull) { this.popup(att, '¡' + this.specialOf(att).short + ' LISTO!', '#f8ce73'); this.sfx('ready'); }
      }
      if (kind === 'dart' && att === this.p1) this.stats.ultimates++;
      this.hitstop = res === 'ko' ? 170 : kind === 'dart' || kind === 'remate' ? 220 : kind === 'china' ? 150 : kind === 'gancho' ? 120 : kind === 'kick' || type ? 95 : kind === 'dive' ? 80 : 65;
      this.shake = res === 'ko' || ult ? 14 : kind === 'punch' || kind === 'airPunch' ? 5 : 8;
      if (res === 'ko') this.onKO(att, def);
    }

    onKO(winner, loser) {
      if (this.phase !== 'fight') return;
      this.phase = 'ko'; this.phaseT = 0; this.slowmo = 900;
      this.roundWinner = winner;
      const wi = winner === this.p1 ? 0 : 1;
      this.wins[wi]++;
      this.addScore(winner, R.roundPoints({ perfect: winner.hp >= winner.maxHp - 0.01, timeLeft: this.timer }), winner.cx, C.GROUND + winner.y - 400, true);
      if (winner === this.p1) {
        if (winner.hp >= winner.maxHp - 0.01) { this.stats.perfectRounds++; this.setBanner('K.O.', '#ff4d5e', '¡PERFECTO!'); }
        else this.setBanner('K.O.', '#ff4d5e');
        this.stats.timeLeft += this.timer;
      } else this.setBanner('K.O.', '#ff4d5e');
      this.sfx('ko');
      this.dust(loser.cx, C.GROUND, 1.5);
      for (const f of this.fighters) if (f !== loser) { f.state = 'ready'; f.f.play('idle', true); }
    }

    timeUp() {
      this.cancelGrab();
      this.phase = 'timeup'; this.phaseT = 0;
      const r1 = this.p1.hp / this.p1.maxHp, r2 = this.p2.hp / this.p2.maxHp;
      for (const f of this.fighters) { f.state = 'ready'; f.f.play('idle', true); }
      if (Math.abs(r1 - r2) < 0.001) { this.roundWinner = null; this.setBanner('¡TIEMPO!', '#f8ce73', 'EMPATE'); }
      else {
        this.roundWinner = r1 > r2 ? this.p1 : this.p2;
        this.wins[this.roundWinner === this.p1 ? 0 : 1]++;
        this.addScore(this.roundWinner, R.roundPoints({ perfect: false, timeLeft: 0 }), this.roundWinner.cx, C.GROUND + this.roundWinner.y - 400, true);
        this.setBanner('¡TIEMPO!', '#f8ce73');
      }
      this.sfx('bell');
    }

    endRound() {
      const need = R.ROUNDS_TO_WIN;
      if (this.wins[0] >= need || this.wins[1] >= need || this.round >= 5) {
        this.phase = 'matchEnd'; this.phaseT = 0;
        const won = this.wins[0] > this.wins[1];
        this.setBanner(won ? '¡VICTORIA!' : 'DERROTA', won ? '#8bf2ce' : '#ff4d5e');
        this.sfx(won ? 'win' : 'lose');
        if (won && this.p1.state !== 'win') this.p1.setWin();
        if (!won && this.p2.state !== 'win' && this.p2.state !== 'ko') this.p2.setWin();
        return;
      }
      this.startRound();
    }

    result() {
      return {
        won: this.wins[0] > this.wins[1],
        wins: this.wins.slice(),
        roundsWon: this.wins[0], roundsLost: this.wins[1],
        perfectRounds: this.stats.perfectRounds,
        timeLeft: Math.round(this.stats.timeLeft),
        maxCombo: this.stats.maxCombo,
        ultimates: this.stats.ultimates,
        bottles: this.p1.loadout.bottles,
        score: this.viewer.score,
        scores: [this.p1.score, this.p2.score],
        difficulty: this.o.difficulty,
        wild: this.wild,
        matchSeconds: Math.round(this.matchTime)
      };
    }

    /* ---------- dibujo ---------- */

    /** behind: las que están en el suelo (detrás de los luchadores); si no, las que vuelan (delante). */
    drawDropped(c, behind) {
      for (const d of this.dropped) {
        if ((d.state === 'ground' || d.state === 'held') !== !!behind) continue;
        const P = (this.assets.weapons || {})[d.w.id];
        if (!P || !P.img) continue;
        c.save(); c.imageSmoothingEnabled = false;
        c.translate(Math.round(d.x), Math.round(d.y));
        c.scale(d.owner.S * d.flip, d.owner.S);
        c.rotate(d.rot);
        c.drawImage(P.img, -P.grip[0], -P.grip[1], P.size ? P.size[0] : P.img.width, P.size ? P.size[1] : P.img.height);
        c.restore();
      }
    }

    /** El soplo y la nube que se le queda al rival en la cara. */
    drawPuffs(c) {
      const draw = (owner, x, y, facing, i, alpha, scale) => {
        const img = owner.extras && owner.extras.puff, PD = owner.extras && owner.extras.puffDef;
        if (!img || !PD) return;
        const fr = PD.frames[Math.max(0, Math.min(PD.frames.length - 1, i))];
        c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha;
        c.translate(Math.round(x), Math.round(y));
        c.scale(owner.S * facing * scale, owner.S * scale);
        c.drawImage(img, fr[0], fr[1], fr[2], fr[3], 0, -fr[3] / 2, fr[2], fr[3]);
        c.restore();
      };
      for (const p of this.puffs) {
        const PD = p.c.extras.puffDef, k = p.t / PD.ms;
        draw(p.c, p.x + p.facing * PD.travel * p.c.S * k, p.y, p.facing, Math.floor(k * PD.frames.length), 1 - Math.max(0, k - 0.75) * 2, 1);
      }
      for (const v of this.fighters) {
        if (v.blindT <= 0 || v.state !== 'fight') continue;
        const owner = v === this.p1 ? this.p2 : this.p1;
        const hb = v.f.getHurtbox(), k = v.blindT / R.BOLSA.blindMs;
        const x = hb.x + hb.w / 2 - 50 * owner.S * 0.6, y = hb.y + 28 + Math.sin(this.t / 160) * 3;
        draw(owner, x, y, 1, 2, 0.75 * k, 0.6);
      }
    }


    draw(ctx) {
      const I = this.levelOf(this.viewer);
      const W = this.wild ? 1.8 : 1;   // en el modo salvaje todo se mueve el doble
      const reduce = this.o.settings && this.o.settings.reduceMotion;
      ctx.save();
      ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, 960, 540);
      if (this.shake > 0 && !reduce) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      if (I > 0.04) {
        const sway = reduce ? 0.3 : 1;
        ctx.translate(480, 300);
        ctx.rotate(Math.sin(this.t / 1300) * 0.028 * I * sway * W);
        const z = 1 + 0.07 * I * sway * W + (this.wild ? Math.max(0, Math.sin(this.t / 600)) * 0.04 * this.chaos() : 0);
        ctx.scale(z, z);
        ctx.translate(-480 + Math.sin(this.t / 900) * 10 * I * sway * W, -300);
      }
      const behind = this.grab && this.grab.behind && this.barDepth(this.grab.def);
      if (this.interior) this.terrace.reduce = !!reduce;
      this.terrace.draw(ctx, {
        cameraX: this.camera, t: this.t,
        drawBehind: behind ? (c) => this.scaledDraw(c, this.grab.def, behind.scale, () => this.grab.def.draw(c, this.assets.combatFx ? { fx: true } : undefined)) : null,
        drawActors: (c) => {
          if (this.superFreeze > 0 && this.superOwner) this.drawSuperBack(c);
          if (this.police && !this.interior) this.police.drawBack(c, { flashes: !reduce });
          const soaking = this.grab && this.grab.phase === 'soak';
          if (this.fountain) this.fountain.drawBack(c, !soaking);
          if (this.parked.length) this.drawParked(c);
          for (const f of this.fighters) if (f.state !== 'soaked' && f.state !== 'grabbed') f.drawShadow(c);
          if (this.dropped.length) this.drawDropped(c, true);
          if (this.sink) this.sink.draw(c);
          if (I > 0.15) {
            const g = { ghost: true, alpha: Math.min(0.45, 0.32 * I), dx: Math.sin(this.t / 420) * 22 * I * W, dy: Math.cos(this.t / 610) * 6 * I * W };
            if (!this.barDepth(this.p2)) this.p2.draw(c, g);
            if (!this.barDepth(this.p1)) this.p1.draw(c, { ...g, dx: -g.dx });
          }
          const order = this.p1.attacking ? [this.p2, this.p1] : [this.p1, this.p2];
          for (const f of order) {
            const bd = this.barDepth(f);
            if (bd && bd.behind) continue;
            this.scaledDraw(c, f, bd ? bd.scale : 1, () => {
              const p = f.draw(c, this.assets.combatFx ? { fx: true } : undefined);
              if (p.item) {
                const w = f.f.worldPoint(p.item);
                this.bottles.drawItem(c, w.x, w.y + p.dy, f.S, p.item.rotation || 0, f.facing);
              }
            });
          }
          this.bottles.draw(c, [this.p1.f, this.p2.f]);
          if (this.dropped.length) this.drawDropped(c, false);
          this.drawPuffs(c);
          this.drawDarts(c);
          this.drawPiti(c);
          if (this.fountain) { if (soaking) this.fountain.drawFront(c); else this.fountain.drawDrops(c); }
          if (this.police) this.police.drawFront(c);
          this.drawWorldFx(c);
          this.drawWaterFx(c);
        }
      });
      if (this.weather) this.weather.draw(ctx);
      ctx.restore();
      this.drawFog(ctx, Math.min(1.4, I * this.viewer.loadout.fogMult));
      this.drawPoliceLights(ctx, reduce);
      if (this.wild) this.drawChaos(ctx, reduce);
      ctx.save();
      if (this.wild && this.chaos() > 0 && !reduce) {
        // Hasta el marcador se mueve.
        const ch = this.chaos();
        ctx.translate(Math.sin(this.t / 700) * 7 * ch, Math.cos(this.t / 950) * 4 * ch);
      }
      this.drawHud(ctx, I);
      ctx.restore();
      this.drawTopTexts(ctx);
      if (this.net) this.drawNetStatus(ctx);
    }

    /** Multijugador: aviso si el otro no responde o si las dos partidas se separan. */
    drawNetStatus(ctx) {
      ctx.save();
      ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#05070c';
      if (this.netStall > 400) {
        ctx.fillStyle = 'rgba(5,7,12,0.55)'; ctx.fillRect(0, 230, 960, 70);
        ctx.font = 'bold 26px ' + FONT; ctx.fillStyle = '#f8ce73';
        const dots = '.'.repeat(1 + Math.floor(this.netStall / 400) % 3);
        ctx.strokeText('ESPERANDO A TU RIVAL' + dots, 480, 274); ctx.fillText('ESPERANDO A TU RIVAL' + dots, 480, 274);
      }
      ctx.font = 'bold 11px ' + FONT; ctx.fillStyle = this.netDesync ? '#ff6a5a' : '#8bf2ce';
      const t = this.netDesync ? '⚠ DESINCRONIZADO' : 'MULTIJUGADOR · EXPERIMENTAL';
      ctx.strokeText(t, 480, 150); ctx.fillText(t, 480, 150);
      ctx.restore();
    }

    drawWaterFx(c) {
      const draw = root.trolinaDrawWaterFx;
      if (!draw) return;
      for (const w of this.waterFx) {
        const f = w.c;
        if (f.state === 'soaked' || f.state === 'grabbed') continue;
        draw(c, w.img, w.def, Math.floor(w.t / w.def.ms), f.cx, C.GROUND + f.y, f.S, 0.9, f.facing < 0);
      }
    }

    /** Modo salvaje: tintes que cambian, apagones y viñeta de mareo. */
    drawChaos(ctx, reduce) {
      const ch = this.chaos();
      if (ch > 0 && !reduce) {
        ctx.save();
        const hue = Math.floor(this.t / 1600) % 3;
        ctx.globalAlpha = (0.06 + 0.06 * Math.sin(this.t / 400)) * ch;
        ctx.fillStyle = ['#7a2cff', '#2cff8a', '#ff2c6a'][hue];
        ctx.fillRect(0, 0, 960, 540);
        ctx.restore();
      }
      if (this.blackout > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.9, this.blackout / 300) + ')';
        ctx.fillRect(0, 0, 960, 540);
        ctx.restore();
      }
    }

    /**
     * Rótulos de arriba, apilados bajo el marcador en este orden: nombre de la ultimate,
     * rótulo del asalto (ASALTO, ¡PELEA!, K.O., GANA…, ¡VICTORIA!, ¡ALTO!) y frase del modo
     * salvaje. Pequeños, sin cajas y con fundido: la escena se tiene que ver.
     */
    drawTopTexts(ctx) {
      let y = this.police && this.police.active && this.phase !== 'police' ? TOP_Y_POLICE : TOP_Y;
      const st = this.superText;
      if (st && st.t < 1300) {
        this.drawHeadline(ctx, { text: st.text, color: '#f8ce73', accent: st.c.char.color, t: st.t, hold: 1000, fade: 300, y, from: st.c === this.p1 ? -1 : 1 });
        y += 40;
      }
      const b = this.banner;
      if (b && b.t < b.hold + BANNER_FADE) {
        this.drawHeadline(ctx, { text: b.text, color: b.color, accent: b.color, sub: b.sub, t: b.t, hold: b.hold, fade: BANNER_FADE, y, from: 0 });
        y += b.sub ? 62 : 40;
      }
      this.drawSnark(ctx, y);
    }

    /** Una línea de rótulo: letras espaciadas, filetes finos a los lados y entrada/salida suaves. */
    drawHeadline(ctx, o) {
      const fin = Math.min(1, o.t / 240);
      const fout = o.t > o.hold ? Math.max(0, 1 - (o.t - o.hold) / o.fade) : 1;
      const a = fin * fout;
      if (a <= 0) return;
      const ease = 1 - Math.pow(1 - fin, 3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(480 + o.from * (1 - ease) * 70, o.y - (1 - ease) * 10);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let size = 34;
      ctx.font = 'bold ' + size + 'px ' + FONT; spacing(ctx, 3);
      let w = ctx.measureText(o.text).width;
      if (w > 600) { size = Math.floor(size * 600 / w); ctx.font = 'bold ' + size + 'px ' + FONT; w = ctx.measureText(o.text).width; }
      // Filetes a los lados, que crecen al entrar.
      const len = 120 * ease;
      for (const s of [-1, 1]) {
        const x0 = s * (w / 2 + 16), x1 = x0 + s * len;
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, rgba(o.accent, 0.85)); g.addColorStop(1, rgba(o.accent, 0));
        ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), -1, len, 2);
      }
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
      ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0a0610';
      ctx.strokeText(o.text, 0, 0);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = o.color; ctx.fillText(o.text, 0, 0);
      if (o.sub) {
        ctx.font = 'bold 16px ' + FONT; spacing(ctx, 2);
        ctx.lineWidth = 4; ctx.strokeText(o.sub, 0, 30);
        ctx.fillStyle = '#ffffff'; ctx.fillText(o.sub, 0, 30);
      }
      ctx.restore();
    }

    /** Frase pasivo-agresiva del modo salvaje: una línea en cursiva sobre un velo suave, sin caja. */
    drawSnark(ctx, y) {
      const sn = this.snark;
      if (!sn) return;
      const age = this.t - sn.t0, life = 1900;
      if (age > life) { this.snark = null; return; }
      const fin = Math.min(1, age / 160), out = age > life - 350 ? (life - age) / 350 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fin * out);
      ctx.translate(480, y - (1 - fin) * 6);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let size = 22;
      ctx.font = 'italic bold ' + size + 'px ' + FONT;
      let w = ctx.measureText(sn.text).width;
      if (w > 640) { size = Math.floor(size * 640 / w); ctx.font = 'italic bold ' + size + 'px ' + FONT; w = ctx.measureText(sn.text).width; }
      const half = w / 2 + 80;
      const g = ctx.createLinearGradient(-half, 0, half, 0);
      g.addColorStop(0, 'rgba(8,5,14,0)'); g.addColorStop(0.22, 'rgba(8,5,14,0.4)');
      g.addColorStop(0.78, 'rgba(8,5,14,0.4)'); g.addColorStop(1, 'rgba(8,5,14,0)');
      ctx.fillStyle = g; ctx.fillRect(-half, -16, half * 2, 32);
      ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0a0610';
      ctx.strokeText(sn.text, 0, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillText(sn.text, 0, 1);
      ctx.restore();
    }

    /** Destellos azules/rojos de la patrulla sobre la escena (se desactivan con «Reducir mareo»). */
    drawPoliceLights(ctx, reduce) {
      if (!this.police || reduce) return;
      const st = this.police.state;
      if (st === 'idle' || st === 'warning') return;
      const on = Math.floor(this.t / 180) % 2;
      ctx.save();
      const g = ctx.createRadialGradient(on ? 860 : 700, 300, 40, on ? 860 : 700, 300, 520);
      g.addColorStop(0, on ? 'rgba(40,110,255,0.22)' : 'rgba(255,40,70,0.14)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
      ctx.restore();
    }

    drawSuperBack(c) {
      const k = Math.min(1, (700 - this.superFreeze) / 120);
      c.save();
      c.fillStyle = 'rgba(6,4,14,' + (0.72 * k) + ')';
      c.fillRect(this.viewLeft() - 100, -50, 1160, 700);
      const o = this.superOwner;
      const g = c.createRadialGradient(o.cx, C.GROUND - 170, 10, o.cx, C.GROUND - 170, 260);
      g.addColorStop(0, 'rgba(248,206,115,' + (0.55 * k) + ')'); g.addColorStop(1, 'rgba(248,206,115,0)');
      c.fillStyle = g; c.fillRect(o.cx - 260, C.GROUND - 430, 520, 520);
      c.strokeStyle = 'rgba(255,240,190,' + (0.5 * k) + ')'; c.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2 + this.t / 400;
        c.beginPath();
        c.moveTo(o.cx + Math.cos(a) * 90, C.GROUND - 170 + Math.sin(a) * 90);
        c.lineTo(o.cx + Math.cos(a) * 240, C.GROUND - 170 + Math.sin(a) * 240);
        c.stroke();
      }
      c.restore();
    }

    drawDarts(c) {
      for (const d of this.darts) {
        c.save();
        for (let i = 0; i < d.trail.length; i++) {
          const p = d.trail[i];
          c.globalAlpha = (i + 1) / d.trail.length * 0.5;
          c.fillStyle = '#fff3c4';
          c.fillRect(p.x - 3, p.y - 2, 6, 4);
        }
        c.globalAlpha = 1;
        c.translate(d.x, d.y);
        c.rotate(Math.atan2(d.vy, d.vx));
        c.scale(C.S, C.S);
        drawDartShape(c);
        c.restore();
      }
    }

    drawWorldFx(c) {
      const D = root.TROLINA_COMBAT_FX, FX = this.assets.combatFx;
      const cell = (img, def, i, row, x, y, sc, flip, alpha) => {
        c.save(); c.imageSmoothingEnabled = false;
        if (alpha !== undefined) c.globalAlpha = alpha;
        c.translate(Math.round(x), Math.round(y)); c.scale(sc * (flip || 1), sc);
        c.drawImage(img, i * def.w, row * def.h, def.w, def.h, -def.ax, -def.ay, def.w, def.h);
        c.restore();
      };
      if (D && FX) {
        for (const e of this.fxAnims) {
          const i = Math.min(e.def.cols - 1, Math.floor(e.t / e.def.ms) % (e.def.loop ? e.def.cols : 1e9));
          cell(e.img, e.def, i, e.row, e.x, e.y, e.scale, e.flip);
        }
        for (const f of this.fighters) {
          if (f.state !== 'fight') continue;
          const head = f.f.worldPoint({ x: 84, y: 14 });
          // Guardia rota: chapas dando vueltas sobre la cabeza. Sin fuelle: sudor.
          if (f.dizzyT > 0 && FX.chapas) { const d = D.fx.chapas; cell(FX.chapas, d, Math.floor(f.t / d.ms) % d.cols, 0, head.x, head.y - 16, f.S); }
          else if (f.exhausted && FX.sweat) { const d = D.fx.sweat; cell(FX.sweat, d, Math.floor(f.t / d.ms) % d.cols, 0, head.x + f.facing * 26, head.y + 30, f.S); }
        }
      }
      for (const sm of this.smokes) {
        const k = sm.t / sm.life;
        c.fillStyle = 'rgba(225,225,232,' + (0.6 * (1 - k)) + ')';
        c.beginPath(); c.arc(sm.x + sm.vx * sm.t / 1000 + Math.sin(sm.t / 200) * 4, sm.y - k * 70, sm.r * (1 + 2.2 * k), 0, Math.PI * 2); c.fill();
      }
      for (const d of this.dusts) {
        const k = d.t / d.life;
        if (d.drop) {
          c.fillStyle = 'rgba(160,220,255,' + (0.85 * (1 - k)) + ')';
          c.fillRect(Math.round(d.x), Math.round(d.y + d.vy * d.t / 1000 + 300 * (d.t / 1000) ** 2), 2, 3);
          continue;
        }
        if (d.glass) {
          // Cristales del botellín empuñado que se rompe al caer.
          const s = d.t / 1000, gy = Math.min(C.GROUND, d.y + d.vy * s + 1300 * s * s);
          c.fillStyle = 'rgba(' + (d.r > 3 ? '120,90,40' : '210,190,120') + ',' + (1 - k) + ')';
          c.fillRect(Math.round(d.x + d.vx * s), Math.round(gy), Math.ceil(d.r), Math.ceil(d.r));
          continue;
        }
        c.fillStyle = 'rgba(190,180,170,' + (0.45 * (1 - k)) + ')';
        c.beginPath(); c.arc(d.x + d.vx * d.t / 1000, d.y - 6 - k * 18, d.r * (1 + k), 0, Math.PI * 2); c.fill();
      }
      for (const s of this.sparks) {
        const k = s.t / s.life;
        const col = s.kind === 'block' ? '#8fd6ff' : s.kind === 'bottle' ? '#ffd27a' : s.kind === 'dart' ? '#ffe08a' : s.kind === 'parry' ? '#e8fbff' : s.kind === 'break' ? '#ff8a7a' : '#fff6c2';
        if (s.kind === 'parry' || s.kind === 'break') {
          // Guardia justa: aro blanco que se abre. Guardia rota: aro rojo que estalla en trozos.
          c.save(); c.globalAlpha = 1 - k; c.strokeStyle = col; c.lineWidth = 6 * (1 - k) + 2;
          c.beginPath(); c.arc(s.x, s.y, 20 + 70 * k, 0, Math.PI * 2); c.stroke();
          if (s.kind === 'break') {
            c.fillStyle = '#8fd6ff';
            for (let i = 0; i < 9; i++) { const a = s.rot + i * 0.7; const r = 30 + 110 * k; c.fillRect(s.x + Math.cos(a) * r - 4, s.y + Math.sin(a) * r + 60 * k * k - 4, 8, 8); }
          }
          c.restore();
        }
        if (s.kind === 'dart') { c.save(); c.translate(s.x, s.y); c.scale(1.8, 1.8); c.translate(-s.x, -s.y); }
        c.save(); c.translate(s.x, s.y); c.rotate(s.rot);
        c.globalAlpha = 1 - k; c.strokeStyle = col; c.lineWidth = 5 - 3 * k;
        const n = s.kind === 'block' ? 6 : 8;
        for (let i = 0; i < n; i++) {
          const a = i * Math.PI * 2 / n, r0 = 8 + 30 * k, r1 = r0 + 22 * (1 - k) + 10;
          c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke();
        }
        c.fillStyle = col; c.globalAlpha = (1 - k) * 0.8;
        c.beginPath(); c.arc(0, 0, 12 * (1 - k) + 2, 0, Math.PI * 2); c.fill();
        c.restore();
        if (s.kind === 'dart') c.restore();
      }
      for (const p of this.popups) {
        const k = p.t / p.life;
        c.save(); c.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
        c.font = 'bold ' + (p.small ? 18 : p.big ? 30 : 24) + 'px ' + FONT; c.textAlign = 'center';
        c.lineWidth = 5; c.strokeStyle = '#120a14'; c.fillStyle = p.color;
        const y = p.y - (p.small ? 30 : 40) * k;
        c.strokeText(p.text, p.x, y); c.fillText(p.text, p.x, y);
        c.restore();
      }
    }

    drawFog(ctx, v) {
      if (v <= 0.02) return;
      ctx.save();
      ctx.fillStyle = 'rgba(196,186,214,' + (0.16 * v) + ')';
      ctx.fillRect(0, 0, 960, 540);
      for (let i = 0; i < 8; i++) {
        const speed = 14 + i * 6;
        const x = ((i * 191 + this.t * speed / 1000) % 1380) - 210;
        const y = 110 + ((i * 97) % 330) + Math.sin(this.t / 1700 + i) * 34;
        const r = 170 + (i % 3) * 70;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(226,220,236,' + (0.4 * v) + ')');
        g.addColorStop(1, 'rgba(226,220,236,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      const vg = ctx.createRadialGradient(480, 270, 160, 480, 270, 620);
      vg.addColorStop(0, 'rgba(8,4,14,0)');
      vg.addColorStop(1, 'rgba(8,4,14,' + (0.72 * v) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, 960, 540);
      ctx.restore();
    }

    drawHud(ctx, playerIntox) {
      ctx.save();
      const bars = [[this.p1, 40, 1], [this.p2, 540, -1]];
      for (const [c, x, side] of bars) {
        const w = 380, y = 22, h = 24;
        ctx.fillStyle = 'rgba(5,7,12,0.85)'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
        ctx.fillStyle = '#3a0e16'; ctx.fillRect(x, y, w, h);
        const rd = Math.max(0, c.displayHp / c.maxHp), rh = Math.max(0, c.hp / c.maxHp);
        ctx.fillStyle = '#ff6a3d';
        if (side === 1) ctx.fillRect(x, y, w * rd, h); else ctx.fillRect(x + w * (1 - rd), y, w * rd, h);
        const grd = ctx.createLinearGradient(0, y, 0, y + h);
        grd.addColorStop(0, rh < 0.25 ? '#ff8a7a' : '#fff1a0'); grd.addColorStop(1, rh < 0.25 ? '#d8283c' : '#f2b830');
        ctx.fillStyle = grd;
        if (side === 1) ctx.fillRect(x, y, w * rh, h); else ctx.fillRect(x + w * (1 - rh), y, w * rh, h);
        ctx.strokeStyle = '#f2f4ea'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
        // fuelle (pegar y cubrirse lo gastan): bajo la vida
        {
          const F = R.FUELLE, fw = 260, fh = 9, fy = y + h + 5;
          const fx = side === 1 ? x : x + w - fw;
          const k = Math.max(0, Math.min(1, c.fuelle / F.max));
          ctx.fillStyle = 'rgba(5,7,12,0.85)'; ctx.fillRect(fx - 2, fy - 2, fw + 4, fh + 4);
          const blink = (this.t % 360) < 180;
          ctx.fillStyle = c.dizzyT > 0 ? (blink ? '#ff4d5e' : '#7a1d28') : c.exhausted ? (blink ? '#ff8a5a' : '#ffd0a8') : c.guard ? '#5fb8ff' : k < 0.3 ? '#f8ce73' : '#8bf2ce';
          if (side === 1) ctx.fillRect(fx, fy, fw * k, fh); else ctx.fillRect(fx + fw * (1 - k), fy, fw * k, fh);
          // marca del 30 %: por debajo, si te quedas sin fuelle no puedes pegar hasta pasarla
          ctx.fillStyle = '#05070c';
          const mk = side === 1 ? fx + fw * F.exhaustedUntil / F.max : fx + fw * (1 - F.exhaustedUntil / F.max);
          ctx.fillRect(mk - 1, fy, 2, fh);
          ctx.font = 'bold 11px ' + FONT; ctx.lineWidth = 3; ctx.strokeStyle = '#05070c';
          ctx.textAlign = side === 1 ? 'left' : 'right';
          const fl = c.dizzyT > 0 ? 'GUARDIA ROTA' : c.exhausted ? 'SIN FUELLE' : 'FUELLE';
          ctx.fillStyle = c.dizzyT > 0 || c.exhausted ? '#ffd0c8' : '#dff7ef';
          let lx = side === 1 ? fx + fw + 8 : fx - 8;
          const icon = this.assets.combatUi && this.assets.combatUi.fuelle;
          if (icon) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(icon, side === 1 ? lx : lx - 16, fy - 4, 16, 16);
            lx += side * 20;
          }
          ctx.strokeText(fl, lx, fy + 9); ctx.fillText(fl, lx, fy + 9);
        }
        const yo = 14;   // lo de debajo baja para dejar sitio al fuelle
        // nombre
        ctx.font = 'bold 20px ' + FONT; ctx.textAlign = side === 1 ? 'left' : 'right';
        ctx.lineWidth = 4; ctx.strokeStyle = '#05070c'; ctx.fillStyle = '#fff';
        const nx = side === 1 ? x : x + w;
        const label = c.char.name.toUpperCase() + (c.loadout.stab && c.loadout.stab.mult > 1 ? ' ★' : '') + (this.net ? (c === this.viewer ? '  · TÚ' : '  · RIVAL') : c === this.p2 ? '  · CPU' : '');
        ctx.strokeText(label, nx, y + h + 24 + yo); ctx.fillText(label, nx, y + h + 24 + yo);
        // marcador de puntos (solo de quien juega)
        if (this.isHuman(c)) {
          ctx.font = 'bold 17px ' + FONT; ctx.textAlign = side === 1 ? 'right' : 'left';
          ctx.lineWidth = 4; ctx.strokeStyle = '#05070c'; ctx.fillStyle = '#ffe08a';
          const sx2 = side === 1 ? x + w - 66 : x + 66, txt = R.formatPoints(c.score) + ' PTS';
          ctx.strokeText(txt, sx2, y + h + 23 + yo); ctx.fillText(txt, sx2, y + h + 23 + yo);
        }
        // asaltos ganados
        const wi = c === this.p1 ? 0 : 1;
        for (let i = 0; i < R.ROUNDS_TO_WIN; i++) {
          const cx = side === 1 ? x + w - 12 - i * 22 : x + 12 + i * 22;
          ctx.beginPath(); ctx.arc(cx, y + h + 17 + yo, 7, 0, Math.PI * 2);
          ctx.fillStyle = i < this.wins[wi] ? '#f8ce73' : 'rgba(255,255,255,0.15)'; ctx.fill();
          ctx.strokeStyle = '#05070c'; ctx.lineWidth = 2; ctx.stroke();
        }
        // puntillo y munición (en el modo salvaje incluye el caos y puede pasar del 100 %)
        const intox = this.wild ? this.levelOf(c) : this.intoxOf(c);
        const my = y + h + 36 + yo, mw = 150;
        const mx = side === 1 ? x : x + w - mw;
        ctx.fillStyle = 'rgba(5,7,12,0.75)'; ctx.fillRect(mx - 2, my - 2, mw + 4, 14);
        const ig = ctx.createLinearGradient(mx, 0, mx + mw, 0);
        ig.addColorStop(0, '#f8ce73'); ig.addColorStop(1, '#c2402e');
        ctx.fillStyle = ig; ctx.fillRect(mx, my, mw * Math.min(1, intox), 10);
        ctx.font = 'bold 12px ' + FONT; ctx.fillStyle = intox > 0.5 ? '#ffb37a' : '#f3e6c4'; ctx.textAlign = side === 1 ? 'left' : 'right';
        ctx.lineWidth = 3; ctx.strokeStyle = '#05070c';
        const ptxt = 'PUNTILLO ' + Math.round(intox * 100) + '%';
        ctx.strokeText(ptxt, side === 1 ? mx : mx + mw, my + 27); ctx.fillText(ptxt, side === 1 ? mx : mx + mw, my + 27);
        const ax = side === 1 ? mx + mw + 12 : mx - 12;
        const bw = 12, bh = 16;
        if (c.ammo > 0) {
          const n = c.ammo > 5 ? 1 : c.ammo;
          ctx.imageSmoothingEnabled = false;
          for (let i = 0; i < n; i++) {
            const bx = side === 1 ? ax + i * (bw + 2) : ax - (i + 1) * (bw + 2);
            ctx.drawImage(this.assets.bottle, bx - 6, my - 8, 24, 32);
          }
          if (c.ammo > 5) {
            ctx.font = 'bold 16px ' + FONT; ctx.fillStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeStyle = '#05070c';
            const tx = side === 1 ? ax + bw + 6 : ax - bw - 6;
            ctx.strokeText('×' + c.ammo, tx, my + 12); ctx.fillText('×' + c.ammo, tx, my + 12);
          }
        } else {
          ctx.font = 'bold 11px ' + FONT; ctx.fillStyle = '#8a8f99';
          ctx.fillText('SIN BOTELLINES', ax, my + 9);
        }
        // fila de estado: tabaco y azúcar
        ctx.font = 'bold 12px ' + FONT; ctx.lineWidth = 3; ctx.strokeStyle = '#05070c';
        let sx = side === 1 ? mx + 112 : mx + mw - 112;
        const status = (txt, col) => {
          ctx.fillStyle = col; ctx.textAlign = side === 1 ? 'left' : 'right';
          ctx.strokeText(txt, sx, my + 27); ctx.fillText(txt, sx, my + 27);
          sx += side * (ctx.measureText(txt).width + 12);
        };
        if (c.loadout.cigs) {
          const ix = side === 1 ? sx : sx - 16;
          ctx.fillStyle = '#f2efe6'; ctx.fillRect(ix, my + 19, 12, 4);
          ctx.fillStyle = '#ff7a2e'; ctx.fillRect(ix + (side === 1 ? 12 : -2), my + 19, 3, 4);
          sx += side * 20;
          const cur = c.currentSmoke, rest = cur ? c.cigs - cur.left : 0;
          status(cur ? cur.short.toUpperCase() + ' ×' + cur.left + (rest ? ' (+' + rest + ')' : '') : '×0', c.smoking ? '#ffb347' : '#e8e6df');
        }
        if (c.wetT > 0) status('MOJADO ' + Math.ceil(c.wetT / 1000) + 's', '#9ff0ff');
        if (c.weapon) {
          // Arma (v0.15): icono y, si se le ha caído, lo que le falta para que vuelva sola.
          const P = (this.assets.weapons || {})[c.weapon.id], isz = 18;
          if (P && (P.hud || P.img)) {
            const ix = side === 1 ? sx : sx - isz;
            ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = c.armed ? 1 : 0.35;
            if (P.hud) ctx.drawImage(P.hud, ix, my + 12, isz, isz);
            else ctx.drawImage(P.img, ix + 3, my + 11, 12, 16);
            ctx.restore();
            sx += side * (isz + 4);
          }
          if (c.armed) status(c.weapon.short, c.graceT > 0 ? '#8bf2ce' : '#e8d2a8');
          else status('SIN ' + c.weapon.short + ' ' + Math.max(1, Math.ceil((R.WEAPON.returnMs - c.disarmT) / 1000)) + 's', (this.t % 500) < 250 ? '#ff8a7a' : '#ffd0c8');
        }
        for (const b of c.buffs || []) status(b.label + ' ' + Math.ceil((b.until - c.t) / 1000) + 's', b.powerPct > 0 ? '#ffd27a' : '#b7c4ff');
        if (c.invertT > 0) status('⇄ AL REVÉS', (this.t % 400) < 200 ? '#ff4d5e' : '#ffb3a8');
        if (c.loadout.sugar) {
          const ph = R.sugarPhase(c.loadout, this.matchTime);
          if (c.faintT > 0) status('FRITO ' + Math.ceil(c.faintT / 1000) + 's', '#ff6a5a');
          else if (ph === 'boost') status('AZÚCAR ' + Math.ceil(R.SUGAR.boostSec - this.matchTime) + 's', '#9ee6ff');
          else if (ph === 'fading') status('BAJÓN ' + Math.ceil(R.SUGAR.crashSec - this.matchTime) + 's', (this.t % 400) < 200 ? '#ff8a7a' : '#ffd0c8');
        }
        // medidor del ultimate
        if (c.hasSpecial) {
          const ey = my + 38, ew = 150;
          const ex = side === 1 ? x : x + w - ew;
          const full = c.meterFull;
          ctx.fillStyle = 'rgba(5,7,12,0.8)'; ctx.fillRect(ex - 2, ey - 2, ew + 4, 12);
          const eg = ctx.createLinearGradient(ex, 0, ex + ew, 0);
          eg.addColorStop(0, '#5fd3ff'); eg.addColorStop(1, full ? '#ffffff' : '#8bf2ce');
          ctx.fillStyle = eg; ctx.fillRect(ex, ey, ew * c.meter / R.METER_MAX, 8);
          for (let i = 1; i < 4; i++) { ctx.fillStyle = '#05070c'; ctx.fillRect(ex + ew * i / 4, ey, 2, 8); }
          ctx.textAlign = side === 1 ? 'left' : 'right';
          ctx.font = 'bold 12px ' + FONT;
          const short = this.specialOf(c).short;
          const label = full ? '¡' + short + ' LISTO!' + (c === this.p1 && !this.o.autoplay ? ' (U)' : '') : short + ' ' + Math.floor(c.meter) + '%';
          ctx.fillStyle = full ? ((this.t % 500) < 250 ? '#f8ce73' : '#ffffff') : '#bfe9f5';
          const lx = side === 1 ? ex + ew + 10 : ex - 10;
          ctx.strokeText(label, lx, ey + 9); ctx.fillText(label, lx, ey + 9);
        }
      }
      // reloj
      ctx.fillStyle = 'rgba(5,7,12,0.9)'; ctx.fillRect(446, 12, 68, 52);
      ctx.strokeStyle = '#f8ce73'; ctx.lineWidth = 2; ctx.strokeRect(446, 12, 68, 52);
      ctx.font = 'bold 34px ' + FONT; ctx.textAlign = 'center';
      ctx.fillStyle = this.timer <= 10 ? '#ff4d5e' : '#fff';
      ctx.fillText(String(Math.ceil(this.timer)).padStart(2, '0'), 480, 52);
      if (this.truce) {
        // Pausa para el piti: el reloj está parado.
        ctx.font = 'bold 13px ' + FONT; ctx.lineWidth = 3; ctx.strokeStyle = '#05070c';
        ctx.fillStyle = (this.t % 600) < 300 ? '#f8ce73' : '#fff';
        ctx.strokeText('⏸ PAUSA · NO CORRE EL RELOJ', 480, 136); ctx.fillText('⏸ PAUSA · NO CORRE EL RELOJ', 480, 136);
      }
      if (this.police) {
        // Medidor de ruido bajo el reloj.
        const nw = 120, nx = 420, ny = 108, k = this.noise / R.NOISE.max;
        ctx.fillStyle = 'rgba(5,7,12,0.8)'; ctx.fillRect(nx - 2, ny - 2, nw + 4, 12);
        ctx.fillStyle = k > 0.7 ? ((this.t % 400) < 200 ? '#ff4d5e' : '#ff9a6a') : k > 0.4 ? '#f8ce73' : '#7fd88f';
        ctx.fillRect(nx, ny, nw * k, 8);
        ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#05070c';
        ctx.fillStyle = '#dfe7f0';
        const rlabel = this.fountain && this.fountain.on ? 'RUIDO · FUENTE ON' : this.music ? 'RUIDO · MÚSICA A TOPE' : 'RUIDO';
        ctx.strokeText(rlabel, 480, ny + 22); ctx.fillText(rlabel, 480, ny + 22);
        if (this.police.active && this.phase !== 'police') {
          const label = this.police.getStatus().label.toUpperCase();
          ctx.font = 'bold 16px ' + FONT;
          const tw = ctx.measureText(label).width + 30;
          ctx.fillStyle = 'rgba(7,24,40,0.9)'; ctx.fillRect(480 - tw / 2, 150, tw, 30);
          ctx.strokeStyle = (this.t % 360) < 180 ? '#3d8bff' : '#ff4d5e'; ctx.lineWidth = 2; ctx.strokeRect(480 - tw / 2, 150, tw, 30);
          ctx.fillStyle = '#cfe8ff'; ctx.fillText('🚨 ' + label, 480, 171);
        }
      }
      if (this.wild) {
        const ch = this.chaos();
        ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#05070c';
        const wl = ch > 0 ? 'MODO SALVAJE · CAOS ' + Math.round(ch * 100) + '%' : 'MODO SALVAJE · CAOS EN ' + Math.ceil(R.WILD.chaosStart - this.matchTime) + 's';
        ctx.fillStyle = ch > 0 ? ((this.t % 500) < 250 ? '#ff4d5e' : '#ffb3a8') : '#f8ce73';
        ctx.strokeText(wl, 480, 144); ctx.fillText(wl, 480, 144);
      }
      if (playerIntox > 0.55 && !(this.police && this.police.active) && !this.wild) {
        ctx.font = 'bold 13px ' + FONT; ctx.fillStyle = '#f8ce73'; ctx.textAlign = 'center';
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t / 200);
        ctx.fillText('VAS FINO…', 480, 152);
      }
      ctx.restore();
    }
  }

  root.Match = Match;
})(window);
