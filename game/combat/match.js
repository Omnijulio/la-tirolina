/* Combate completo: asaltos, tiempo, colisiones, daño, botellines, efectos y HUD. */
(function (root) {
  const C = root.TrolinaCombat;
  const R = root.TrolinaRules;
  const FONT = '"Arial Black", "Arial Bold", Impact, system-ui, sans-serif';
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

  class Match {
    constructor(opts) {
      this.o = opts;
      this.assets = opts.assets;
      this.diff = R.DIFFICULTIES[opts.difficulty] || R.DIFFICULTIES.normal;
      this.timeScale = opts.timeScale || 1;
      const data = BottleAttack.install(root.FIGHTER_DATA);
      // Ultimate de El Barbas: misma animación de lanzamiento, pero suelta un dardo.
      const dartAnim = JSON.parse(JSON.stringify(data.animations.throwBottle));
      for (const f of dartAnim.frames) for (const e of f.events || []) if (e.type === 'spawn-projectile') e.weapon = 'dart';
      data.animations.throwDart = dartAnim;
      // Ultimate de El Peñista: el mismo gesto de lanzar, sin botellín en la mano.
      const grabAnim = JSON.parse(JSON.stringify(data.animations.throwBottle));
      for (const f of grabAnim.frames) { f.events = []; delete f.itemSocket; }
      data.animations.throwGrab = grabAnim;
      const mk = (side, sel, isCPU) => new Combatant({
        character: sel.character, image: this.assets.characters[sel.character.id], data,
        loadout: sel.loadout, isCPU, side
      });
      this.p1 = mk(0, opts.p1, !!opts.autoplay);
      this.p2 = mk(1, opts.p2, true);
      this.fighters = [this.p1, this.p2];
      this.brain2 = new CpuBrain(this.p2, opts.difficulty, opts.p2.character.cpu && opts.p2.character.cpu.style);
      this.brain1 = opts.autoplay ? new CpuBrain(this.p1, 'normal', 'balanced') : null;
      this.bottles = new MatchBottles(this.assets.bottle, root.BOTTLE_DATA,
        { groundY: C.GROUND, minX: -80, maxX: 1040, onHit: (h) => this.onBottleHit(h) }, this);
      this.terrace = new TerraceStage(this.assets.stage, root.TERRACE_STAGE_DATA);
      this.round = 0; this.wins = [0, 0];
      this.matchTime = 0; this.t = 0;
      this.camera = 0; this.shake = 0; this.hitstop = 0; this.slowmo = 0;
      this.sparks = []; this.popups = []; this.dusts = []; this.smokes = []; this.darts = [];
      this.superFreeze = 0; this.superOwner = null;
      this.stats = { perfectRounds: 0, timeLeft: 0, maxCombo: 0, ultimates: 0 };
      // Policía Local: aparece si el ruido llega a 100 (ver TrolinaRules.NOISE).
      this.noise = 0; this.bottleStreak = -1; this.lastBottleAt = -1e9; this.noiseWarned = false;
      this.police = null; this.separate = null;
      // Fuente a la izquierda: encendida/apagada y con/sin luz.
      const fs = opts.fountain || { on: true, lit: true };
      this.fountain = root.Fountain ? new root.Fountain({ on: fs.on, lit: fs.lit }) : null;
      this.grab = null; this.fountainNoted = false;
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

    sfx(name) { if (this.o.sfx) this.o.sfx.play(name); }
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
      this.cancelGrab();
      this.bottles.reset();
      this.darts = []; this.smokes = []; this.superFreeze = 0;
      this.timer = R.ROUND_SECONDS;
      this.phase = 'intro'; this.phaseT = 0; this.fightCalled = false;
      this.roundWinner = null;
      const final = this.wins[0] === R.ROUNDS_TO_WIN - 1 && this.wins[1] === R.ROUNDS_TO_WIN - 1;
      this.setBanner(final ? 'ASALTO FINAL' : 'ASALTO ' + this.round, '#f8ce73');
      this.sfx('bell');
      if (this.o.input) this.o.input.clear();
    }

    setBanner(text, color, sub) { this.banner = { text, color: color || '#fff', sub: sub || '', t: 0 }; }

    popup(c, text, color) {
      this.popups.push({ x: c.cx, y: C.GROUND + c.y - 330, text, color: color || '#fff', t: 0, life: 900 });
    }
    dust(x, y, size) {
      for (let i = 0; i < 6; i++) this.dusts.push({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 120, r: 6 + Math.random() * 8 * (size || 1), t: 0, life: 420 });
    }
    spark(x, y, kind) {
      this.sparks.push({ x, y, kind, t: 0, life: kind === 'block' ? 180 : kind === 'dart' ? 420 : 240, rot: Math.random() * Math.PI });
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

    /** Con los chorros encendidos la fuente tapa el ruido de los botellines. */
    addBottleNoise(n) {
      if (this.fountain && this.fountain.on && R.FOUNTAIN.masksBottleNoise) {
        if (this.police && !this.fountainNoted && this.phase === 'fight') {
          this.fountainNoted = true;
          this.popups.push({ x: 480 + this.camera * 2, y: 250, text: 'LA FUENTE TAPA EL RUIDO DE LOS BOTELLINES', color: '#9ff0ff', t: 0, life: 1600 });
        }
        return;
      }
      this.addNoise(n);
    }

    /* ---------- ultimate de la fuente (El Peñista) ---------- */

    drip(c) {
      const hb = c.f.getHurtbox();
      this.dusts.push({ drop: true, x: hb.x + Math.random() * hb.w, y: hb.y + Math.random() * hb.h * 0.7, vx: 0, vy: 60, r: 2, t: 0, life: 500 });
    }

    startFountainThrow(att) {
      const def = att === this.p1 ? this.p2 : this.p1;
      att.locked = true;
      att.poseOverride = { anim: 'punch', frame: 3 };
      att.facing = Math.sign(def.cx - att.cx) || att.facing;
      this.grab = { att, def, phase: 'dash', t: 0 };
    }

    cancelGrab() {
      const g = this.grab;
      if (!g) return;
      g.att.locked = false; g.att.poseOverride = null;
      if (g.def.state === 'grabbed' || g.def.state === 'soaked') {
        g.def.state = this.phase === 'fight' ? 'fight' : 'ready';
        g.def.y = 0; g.def.air = false; g.def.f.enabled = true; g.def.grabRot = 0;
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
        att.cx = Math.max(C.MIN_X, Math.min(C.MAX_X, att.cx + att.facing * 950 * dt / 1000));
        att.sync();
        if (Math.abs(def.cx - att.cx) <= 130 && def.state === 'fight' && Math.abs(def.y) < 160) {
          g.phase = 'hold'; g.t = 0;
          def.state = 'grabbed'; def.f.play('idle', true); def.f.enabled = false;
          def.smoking = null; def.faintT = 0; def.pending = []; def.hitstun = 0; def.blockstun = 0;
          att.facing = -1;                              // la fuente está a la izquierda
          att.poseOverride = { anim: 'throwBottle', frame: 1 };
          this.popup(att, '¡AL PILÓN!', '#9ff0ff');
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
        def.cx = att.cx + att.facing * (60 - 40 * k); def.y = -60 - 150 * k - Math.sin(g.t / 60) * 3;
        def.facing = -att.facing; def.grabRot = k * Math.PI / 2;
        att.poseOverride = { anim: 'throwBottle', frame: k < 1 ? 1 : 2 };
        def.sync();
        if (g.t > 420) {
          g.phase = 'throw'; g.t = 0;
          att.poseOverride = null; att.f.play('throwGrab', true);
          g.x0 = def.cx; g.y0 = def.y;
          g.x1 = fo.x; g.y1 = fo.waterY - C.GROUND + 10;
          g.dur = Math.min(1100, 600 + Math.abs(g.x0 - g.x1) * 0.6);
          this.sfx('swing');
        }
        return;
      }
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
          const dmg = R.damageFor('fountain', att.loadout.power, att === this.p2 ? this.diff.cpuDamage : 1);
          def.grabRot = 0;
          const res = def.splashHit(dmg);
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
        def.cx = fo.x; def.y = fo.waterY - C.GROUND + 18; def.sync();
        if (!att.attacking) att.locked = false;
        if (g.t > 1100) {
          // Sale de la fuente de un salto, empapado.
          def.state = 'fight'; def.f.enabled = true;
          def.cx = Math.min(C.MAX_X, fo.right + 40); def.y = -30; def.air = true; def.vy = -380; def.vx = 160;
          def.facing = Math.sign(att.cx - def.cx) || 1;
          def.hitstun = 250;
          fo.splash(fo.x + 40, 0.5);
          att.locked = false; att.poseOverride = null;
          this.grab = null;
        }
      }
    }

    callPolice() {
      if (!this.police || this.police.active) return;
      // Los agentes se colocan entre los dos luchadores.
      const mid = Math.max(230, Math.min(730, (this.p1.cx + this.p2.cx) / 2));
      this.policeData.settings.officerTargetX = [mid - 50, mid + 50];
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
      this.cancelGrab();
      this.bottles.reset(); this.darts = []; this.superFreeze = 0; this.slowmo = 0;
      const [ax, bx] = this.policeData.settings.officerTargetX;
      const mid = (ax + bx) / 2;
      const [l, r] = this.p1.cx <= this.p2.cx ? [this.p1, this.p2] : [this.p2, this.p1];
      this.separate = [[l, Math.max(C.MIN_X, mid - 200)], [r, Math.min(C.MAX_X, mid + 200)]];
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
      this.superText = { text: '¡' + c.char.special.name.toUpperCase() + '!', t: 0, c };
      this.sfx('super');
    }

    spawnDart(owner, ev) {
      const target = owner === this.p1 ? this.p2 : this.p1;
      const hb = target.f.getHurtbox();
      const tx = hb.x + hb.w / 2, ty = hb.y + hb.h * 0.35;
      let dx = tx - ev.x, dy = ty - ev.y;
      if (Math.sign(dx) !== owner.facing) { dx = owner.facing; dy = 0; }
      const len = Math.hypot(dx, dy) || 1;
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
            const want = Math.atan2(hb.y + hb.h * 0.35 - d.y, hb.x + hb.w / 2 - d.x);
            let ang = Math.atan2(d.vy, d.vx);
            let diff = ((want - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            ang += Math.max(-4 * s, Math.min(4 * s, diff));
            d.vx = Math.cos(ang) * d.speed; d.vy = Math.sin(ang) * d.speed;
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
          if (d.x < -120 || d.x > 1080 || d.y < -100 || d.y > 560 || d.age > 2000) d.dead = true;
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
        if (this.phaseT > 950 && !this.fightCalled) { this.fightCalled = true; this.setBanner('¡PELEA!', '#ff4d5e'); this.sfx('fight'); }
        if (this.phaseT > 1650) { this.phase = 'fight'; this.banner = null; for (const f of this.fighters) f.state = 'fight'; }
      } else if (this.phase === 'fight') {
        this.timer = Math.max(0, this.timer - dt / 1000);
        this.matchTime += dt / 1000;
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
        if (this.phase === 'fight' && !this.police.active) {
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
      const c1 = this.controls(this.p1, this.brain1, this.p2, actions, dt);
      const c2 = this.controls(this.p2, this.brain2, this.p1, [], dt);
      this.p1.update(dt, c1, this.p2, this);
      this.p2.update(dt, c2, this.p1, this);
      this.resolvePush();
      if (this.phase === 'fight') this.checkMelee();
      const targets = this.phase === 'fight' ? [this.p1.f, this.p2.f] : [];
      this.bottles.update(dt, [this.p1.f, this.p2.f], targets);
      this.collectDartEvents();
      this.updateDarts(dt);
      for (const c of this.fighters) if (c.dropCig) { c.dropCig = false; this.popup(c, '¡SE LE CAE EL PITILLO!', '#ff8a7a'); }

      const mid = (this.p1.cx + this.p2.cx) / 2;
      const target = Math.max(-24, Math.min(24, (mid - 480) / 2));
      this.camera += (target - this.camera) * Math.min(1, dt * 0.006);
      this.shake = Math.max(0, this.shake - real * 0.03);
      this.blackout = Math.max(0, this.blackout - real);
    }

    updateEffects(dt) {
      for (const list of [this.sparks, this.popups, this.dusts, this.smokes]) for (const e of list) e.t += dt;
      this.smokes = this.smokes.filter((e) => e.t < e.life);
      this.sparks = this.sparks.filter((e) => e.t < e.life);
      this.popups = this.popups.filter((e) => e.t < e.life);
      this.dusts = this.dusts.filter((e) => e.t < e.life);
    }

    resolvePush() {
      const a = this.p1, b = this.p2;
      if (a.state === 'ko' || b.state === 'ko' || this.grab) return;
      if (Math.abs(a.y - b.y) > 150) return; // uno salta por encima del otro
      let dx = b.cx - a.cx;
      const overlap = C.PUSH - Math.abs(dx);
      if (overlap <= 0) return;
      const s = Math.sign(dx) || (a.facing === 1 ? 1 : -1);
      a.cx -= s * overlap / 2; b.cx += s * overlap / 2;
      const clamp = (v) => Math.max(C.MIN_X, Math.min(C.MAX_X, v));
      a.cx = clamp(a.cx); b.cx = clamp(b.cx);
      dx = b.cx - a.cx;
      const rest = C.PUSH - Math.abs(dx);
      if (rest > 0) {
        if (a.cx === C.MIN_X || a.cx === C.MAX_X) b.cx = clamp(b.cx + s * rest);
        else a.cx = clamp(a.cx - s * rest);
      }
      a.sync(); b.sync();
    }

    checkMelee() {
      for (const [att, def] of [[this.p1, this.p2], [this.p2, this.p1]]) {
        const anim = att.f.animation;
        if (anim !== 'punch' && anim !== 'kick') continue;
        if (att.lastHitAction === att.f.actionId || def.state !== 'fight' || att.state !== 'fight' || att.locked) continue;
        const hbs = att.f.getHitboxes();
        if (!hbs.length) continue;
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
        this.applyHit(att, def, anim, px, hit.y + hit.h / 2);
      }
    }

    onBottleHit({ owner, target }) {
      const att = owner && owner.combatant, def = target && target.combatant;
      if (!att || !def || this.phase !== 'fight' || def.state === 'ko') return;
      this.applyHit(att, def, 'bottle', def.cx - def.facing * 10, C.GROUND + def.y - 210);
    }

    applyHit(att, def, kind, x, y) {
      const stunned = def.hitstun > 0;
      const n = kind === 'dart' ? (stunned ? att.combo + 1 : 1) : stunned ? att.combo + 1 : 1;
      const sc = kind === 'dart' ? { damage: 1, knockback: 1, hitstun: 1 } : R.comboScale(n);
      const mv = R.MOVES[kind];
      const wildBonus = this.wild ? 1 + R.WILD.damageBonus * Math.min(1, this.chaos()) : 1;
      const dmg = R.damageFor(kind, att.loadout.power, att === this.p2 ? this.diff.cpuDamage : 1) * sc.damage * wildBonus;
      if (this.wild && def === this.p1 && this.levelOf(def) > 0.6 && Math.random() < 0.25) this.say(def, 'gotHit');
      const res = def.takeHit(kind, dmg, att.cx, { hitstun: mv.hitstun * sc.hitstun, knockback: mv.knockback * sc.knockback });
      this.addNoise(res === 'block' ? R.NOISE.block : res === 'ko' ? R.NOISE.ko : kind === 'dart' ? R.NOISE.dart : R.NOISE.hit);
      if (res === 'block') {
        this.spark(x, y, 'block'); this.sfx('block'); this.hitstop = 45;
        att.combo = 0;
        if (def.hp <= 0) this.onKO(att, def);
        return;
      }
      if (kind === 'punch' || kind === 'kick') att.hitConfirm = att.f.actionId;
      this.spark(x, y, kind === 'bottle' ? 'bottle' : kind === 'dart' ? 'dart' : 'hit');
      this.sfx(kind === 'kick' ? 'kick' : kind === 'dart' ? 'dartHit' : 'punch');
      att.combo = n;
      if (n >= 2) this.popup(att, n + ' GOLPES', '#8bf2ce');
      if (att === this.p1) this.stats.maxCombo = Math.max(this.stats.maxCombo, n);
      // El ultimate se carga encadenando golpes.
      if (att.hasSpecial && kind !== 'dart' && !att.meterFull) {
        att.meter = Math.min(R.METER_MAX, att.meter + R.meterGain(n));
        if (att.meterFull) { this.popup(att, '¡' + att.char.special.short + ' LISTO!', '#f8ce73'); this.sfx('ready'); }
      }
      if (kind === 'dart' && att === this.p1) this.stats.ultimates++;
      this.hitstop = res === 'ko' ? 170 : kind === 'dart' ? 220 : kind === 'kick' ? 85 : 65;
      this.shake = res === 'ko' || kind === 'dart' ? 14 : kind === 'punch' ? 5 : 8;
      if (res === 'ko') this.onKO(att, def);
    }

    onKO(winner, loser) {
      if (this.phase !== 'fight') return;
      this.phase = 'ko'; this.phaseT = 0; this.slowmo = 900;
      this.roundWinner = winner;
      const wi = winner === this.p1 ? 0 : 1;
      this.wins[wi]++;
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
        roundsWon: this.wins[0], roundsLost: this.wins[1],
        perfectRounds: this.stats.perfectRounds,
        timeLeft: Math.round(this.stats.timeLeft),
        maxCombo: this.stats.maxCombo,
        ultimates: this.stats.ultimates,
        bottles: this.p1.loadout.bottles,
        difficulty: this.o.difficulty,
        wild: this.wild,
        matchSeconds: Math.round(this.matchTime)
      };
    }

    /* ---------- dibujo ---------- */

    draw(ctx) {
      const I = this.levelOf(this.p1);
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
      this.terrace.draw(ctx, {
        cameraX: this.camera, drawActors: (c) => {
          if (this.superFreeze > 0 && this.superOwner) this.drawSuperBack(c);
          if (this.police) this.police.drawBack(c, { flashes: !reduce });
          const soaking = this.grab && this.grab.phase === 'soak';
          if (this.fountain) this.fountain.drawBack(c, !soaking);
          for (const f of this.fighters) if (f.state !== 'soaked' && f.state !== 'grabbed') f.drawShadow(c);
          if (I > 0.15) {
            const g = { ghost: true, alpha: Math.min(0.45, 0.32 * I), dx: Math.sin(this.t / 420) * 22 * I * W, dy: Math.cos(this.t / 610) * 6 * I * W };
            this.p2.draw(c, g); this.p1.draw(c, { ...g, dx: -g.dx });
          }
          const order = this.p1.attacking ? [this.p2, this.p1] : [this.p1, this.p2];
          for (const f of order) {
            const p = f.draw(c);
            if (p.item) {
              const w = f.f.worldPoint(p.item);
              this.bottles.drawItem(c, w.x, w.y + p.dy, C.S, p.item.rotation || 0, f.facing);
            }
          }
          this.bottles.draw(c, [this.p1.f, this.p2.f]);
          this.drawDarts(c);
          if (this.fountain) { if (soaking) this.fountain.drawFront(c); else this.fountain.drawDrops(c); }
          if (this.police) this.police.drawFront(c);
          this.drawWorldFx(c);
        }
      });
      ctx.restore();
      this.drawFog(ctx, Math.min(1.4, I * this.p1.loadout.fogMult));
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
      this.drawBanner(ctx);
      this.drawSnark(ctx);
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

    /** Mensaje pasivo-agresivo actual, grande y claro. */
    drawSnark(ctx) {
      const sn = this.snark;
      if (!sn) return;
      const age = this.t - sn.t0, life = 1900;
      if (age > life) { this.snark = null; return; }
      const k = Math.min(1, age / 140), out = age > life - 350 ? (life - age) / 350 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, out);
      ctx.translate(480, 262);
      ctx.rotate(Math.sin(sn.t0) * 0.04);
      const s = 0.85 + 0.15 * k;
      ctx.scale(s, s);
      ctx.font = 'italic bold 38px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let w = ctx.measureText(sn.text).width;
      if (w > 860) { ctx.font = 'italic bold ' + Math.floor(38 * 860 / w) + 'px ' + FONT; w = ctx.measureText(sn.text).width; }
      ctx.fillStyle = 'rgba(10,6,16,0.72)';
      ctx.fillRect(-w / 2 - 22, -32, w + 44, 64);
      ctx.fillStyle = '#f8ce73'; ctx.fillRect(-w / 2 - 22, -32, 6, 64);
      ctx.lineWidth = 6; ctx.strokeStyle = '#0a0610';
      ctx.strokeText(sn.text, 0, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillText(sn.text, 0, 2);
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
      c.fillRect(-100, -50, 1160, 700);
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
        c.fillStyle = 'rgba(190,180,170,' + (0.45 * (1 - k)) + ')';
        c.beginPath(); c.arc(d.x + d.vx * d.t / 1000, d.y - 6 - k * 18, d.r * (1 + k), 0, Math.PI * 2); c.fill();
      }
      for (const s of this.sparks) {
        const k = s.t / s.life;
        const col = s.kind === 'block' ? '#8fd6ff' : s.kind === 'bottle' ? '#ffd27a' : s.kind === 'dart' ? '#ffe08a' : '#fff6c2';
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
        c.font = 'bold 24px ' + FONT; c.textAlign = 'center';
        c.lineWidth = 5; c.strokeStyle = '#120a14'; c.fillStyle = p.color;
        const y = p.y - 40 * k;
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
        // nombre
        ctx.font = 'bold 20px ' + FONT; ctx.textAlign = side === 1 ? 'left' : 'right';
        ctx.lineWidth = 4; ctx.strokeStyle = '#05070c'; ctx.fillStyle = '#fff';
        const nx = side === 1 ? x : x + w;
        const label = c.char.name.toUpperCase() + (c === this.p2 ? '  · CPU' : '');
        ctx.strokeText(label, nx, y + h + 24); ctx.fillText(label, nx, y + h + 24);
        // asaltos ganados
        const wi = c === this.p1 ? 0 : 1;
        for (let i = 0; i < R.ROUNDS_TO_WIN; i++) {
          const cx = side === 1 ? x + w - 12 - i * 22 : x + 12 + i * 22;
          ctx.beginPath(); ctx.arc(cx, y + h + 17, 7, 0, Math.PI * 2);
          ctx.fillStyle = i < this.wins[wi] ? '#f8ce73' : 'rgba(255,255,255,0.15)'; ctx.fill();
          ctx.strokeStyle = '#05070c'; ctx.lineWidth = 2; ctx.stroke();
        }
        // puntillo y munición (en el modo salvaje incluye el caos y puede pasar del 100 %)
        const intox = this.wild ? this.levelOf(c) : this.intoxOf(c);
        const my = y + h + 36, mw = 150;
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
          status('×' + c.cigs, c.smoking ? '#ffb347' : '#e8e6df');
        }
        if (c.wetT > 0) status('MOJADO ' + Math.ceil(c.wetT / 1000) + 's', '#9ff0ff');
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
          const label = full ? '¡' + c.char.special.short + ' LISTO!' + (c === this.p1 && !this.o.autoplay ? ' (U)' : '') : c.char.special.short + ' ' + Math.floor(c.meter) + '%';
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
      if (this.police) {
        // Medidor de ruido bajo el reloj.
        const nw = 120, nx = 420, ny = 108, k = this.noise / R.NOISE.max;
        ctx.fillStyle = 'rgba(5,7,12,0.8)'; ctx.fillRect(nx - 2, ny - 2, nw + 4, 12);
        ctx.fillStyle = k > 0.7 ? ((this.t % 400) < 200 ? '#ff4d5e' : '#ff9a6a') : k > 0.4 ? '#f8ce73' : '#7fd88f';
        ctx.fillRect(nx, ny, nw * k, 8);
        ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#05070c';
        ctx.fillStyle = '#dfe7f0';
        const rlabel = this.fountain && this.fountain.on ? 'RUIDO · FUENTE ON' : 'RUIDO';
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

    drawSuperText(ctx) {
      const st = this.superText;
      if (!st || st.t > 1300) return;
      const k = Math.min(1, st.t / 160), out = st.t > 1000 ? 1 - (st.t - 1000) / 300 : 1;
      ctx.save();
      ctx.globalAlpha = out;
      const y = 190;
      ctx.fillStyle = 'rgba(5,7,12,0.75)'; ctx.fillRect(0, y - 34, 960, 62);
      ctx.fillStyle = st.c.char.color; ctx.fillRect(0, y - 34, 960, 3); ctx.fillRect(0, y + 25, 960, 3);
      ctx.font = 'bold 44px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const x = 480 + (1 - k) * (st.c === this.p1 ? -400 : 400);
      ctx.lineWidth = 8; ctx.strokeStyle = '#0a0610'; ctx.strokeText(st.text, x, y);
      ctx.fillStyle = '#f8ce73'; ctx.fillText(st.text, x, y);
      ctx.restore();
    }

    drawBanner(ctx) {
      this.drawSuperText(ctx);
      const b = this.banner;
      if (!b) return;
      const k = Math.min(1, b.t / 180);
      ctx.save();
      ctx.translate(480, 250);
      const s = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3));
      ctx.scale(s, s);
      ctx.globalAlpha = k;
      ctx.font = 'bold 76px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 12; ctx.strokeStyle = '#0a0610'; ctx.strokeText(b.text, 0, 0);
      ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0);
      if (b.sub) {
        ctx.font = 'bold 30px ' + FONT; ctx.lineWidth = 7;
        ctx.strokeText(b.sub, 0, 62); ctx.fillStyle = '#fff'; ctx.fillText(b.sub, 0, 62);
      }
      ctx.restore();
    }
  }

  root.Match = Match;
})(window);
