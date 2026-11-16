/* Luchador jugable: física, estados y dibujo sobre el reproductor Fighter existente.
 * Fighter (src/fighter.js) sigue gestionando animaciones de ataque, cajas y eventos;
 * aquí se añaden caminar, salto, guardia, aturdimiento, combos, ultimate, fumar,
 * desmayo por azúcar, KO, victoria y el puntillo.
 * Las poses que aún no tienen arte propio (salto, golpe recibido, KO, victoria) se
 * construyen con fotogramas existentes + rotación/desplazamiento.
 */
(function (root) {
  const C = {
    S: 2,            // escala del sprite en el canvas 960x540
    GROUND: 486,     // línea de apoyo (stage.groundY 243 × 2)
    BODY: 40,        // del ancla (pie trasero) al centro del cuerpo, en px de canvas
    PUSH: 80,        // distancia mínima entre centros de cuerpo
    MIN_X: 70, MAX_X: 890,
    GRAVITY: 2700,
    JUMP_V: -940,
    WALK_F: 230, WALK_B: 185,
    FRICTION: 2200,
    MOUTH: { x: 98, y: 43 }   // boca en el fotograma de guardia (coordenadas locales de celda)
  };
  const R = () => root.TrolinaRules;
  const M = () => root.TrolinaMoves;

  const tintCanvas = document.createElement('canvas');
  tintCanvas.width = 192; tintCanvas.height = 176;
  const tintCtx = tintCanvas.getContext('2d');

  /** Dardo en píxeles nativos, apuntando hacia +x, con la punta en (0,0). */
  function drawDartShape(ctx) {
    ctx.fillStyle = '#d9dde3'; ctx.fillRect(-7, -1, 7, 2);          // punta de acero
    ctx.fillStyle = '#20242c'; ctx.fillRect(-17, -2, 10, 4);        // barril
    ctx.fillStyle = '#c99a3a'; ctx.fillRect(-15, -2, 2, 4); ctx.fillRect(-11, -2, 2, 4);
    ctx.fillStyle = '#9aa1ab'; ctx.fillRect(-23, -1, 6, 2);         // varilla
    ctx.fillStyle = '#e8424a';                                     // aletas
    ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(-31, -6); ctx.lineTo(-29, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f8ce73';
    ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(-31, 6); ctx.lineTo(-29, 0); ctx.closePath(); ctx.fill();
  }

  class Combatant {
    constructor({ character, image, data, loadout, isCPU, side }) {
      this.char = character;
      this.image = image;
      this.loadout = loadout;
      this.isCPU = !!isCPU;
      this.side = side;
      this.maxHp = loadout.maxHp;
      this.f = new Fighter(image, data, { x: 0, y: C.GROUND, scale: C.S, facing: 1 });
      this.f.combatant = this;
      this.seed = Math.random() * 1000;
      // Lo que dura todo el combate (no se reinicia entre asaltos).
      this.meter = 0;                   // carga del ultimate (0..100)
      this.score = 0;                   // puntos del combate (todos los asaltos)
      // Lo que lleva para fumar (1 o 2 huecos): cada cosa con sus unidades, tiempo y efectos.
      const bag = loadout.smokes && loadout.smokes.length ? loadout.smokes
        : loadout.cigs ? [{ id: 'tabaco', short: 'Tabaco', units: loadout.cigs, ms: 1500, relief: 0.15, heal: 6, coughFrom: 3, look: 'cig' }] : [];
      this.smokeBag = bag.map((x) => ({ ...x, left: x.units, done: 0 }));
      this.smoked = 0;                  // cosas fumadas
      this.cough = 0;                   // cuántas se ha fumado por encima de lo que aguanta sin toser
      this.relief = 0;                  // puntillo quitado fumando
      this.fainted = false;             // ya ha sufrido el bajón de azúcar
      this.notes = {};
      this.ultimates = 0;
      this.reset(side === 0 ? 320 : 640, side === 0 ? 1 : -1);
    }

    reset(cx, facing) {
      this.cx = cx; this.y = 0; this.vx = 0; this.vy = 0; this.facing = facing;
      this.hp = this.maxHp; this.displayHp = this.maxHp;
      this.state = 'ready';
      this.air = false;
      this.hitstun = 0; this.blockstun = 0; this.stumble = 0; this.stumbleDir = 1;
      this.flash = 0; this.flashColor = '#ffffff';
      this.guard = false; this.walking = false;
      this.koT = 0; this.winT = 0; this.t = 0;
      this.ammo = this.loadout.ammo;
      this.pending = [];
      this.whiff = false; this.lastHitAction = -1; this.hitConfirm = -1; this.chain = 0;
      this.combo = 0; this.noAmmoCooldown = 0;
      this.smoking = null; this.faintT = 0; this.faintTotal = 0; this.buffs = [];
      this.wetT = 0; this.locked = false; this.poseOverride = null; this.grabRot = 0;
      // Combate 2.0: fuelle, guardia justa, guardia rota, derribo, paso rápido, picado.
      this.fuelle = R().FUELLE.max; this.regenAt = 0; this.exhausted = false; this.guardWas = false;
      this.blockInput = false; this.blockPressT = -1e9; this.blockReleaseT = -1e9; this.parryIdle = 1e9; this.parryUsed = false;
      this.dizzyT = 0; this.downT = 0; this.getupT = 0; this.downPending = false;
      this.dashT = 0; this.dashDir = 0; this.dashRec = 0; this.prevDir = 0; this.tapDir = 0; this.tapT = -1e9;
      this.landRecT = 0; this.landRecNext = 0; this.diving = false; this.diveT = 0; this.airAttacked = false;
      this.sweatAt = 0;
      this.f.enabled = true;
      this.f.play('idle', true);
      this.sync();
    }

    sync() {
      this.f.facing = this.facing;
      this.f.x = this.cx - this.facing * C.BODY;
      this.f.y = C.GROUND + this.y;
    }

    get attacking() { return this.f.animation !== 'idle'; }
    get busy() {
      return this.hitstun > 0 || this.blockstun > 0 || this.stumble > 0 || this.faintT > 0 || this.dizzyT > 0 ||
        this.downT > 0 || this.getupT > 0 || this.dashT > 0 || this.dashRec > 0 || this.landRecT > 0;
    }
    /** Tumbado o levantándose: no se le puede pegar ni agarrar. */
    get downed() { return this.downT > 0 || this.getupT > 0; }
    get hasSpecial() { return !!this.char.special; }
    get meterFull() { return this.hasSpecial && this.meter >= R().METER_MAX; }

    /** Combo: un puño que conecta se puede cancelar en otro puño o en una patada. */
    canCancel() {
      return this.f.animation === 'punch' && this.hitConfirm === this.f.actionId &&
        this.f.frameIndex >= 3 && this.chain < R().MAX_CHAIN;
    }
    /** Puño o patada que conecta: se puede rematar con el ultimate. La patada cierra el combo. */
    canCancelSpecial() {
      const a = this.f.animation;
      return (a === 'punch' || a === 'kick') && this.hitConfirm === this.f.actionId && this.f.frameIndex >= 3;
    }

    /** Fase del golpe en curso ('startup', 'active', 'recovery'), 'landing' al aterrizar vendido, o null. */
    attackPhase() {
      if (this.landRecT > 0) return 'landing';
      if (!this.attacking || this.locked) return null;
      const a = this.f.animation;
      if (a === 'throwBottle' || a === 'throwDart' || a === 'throwGrab') return this.f.frameIndex < 3 ? 'startup' : 'recovery';
      return M().phaseOf(this.f.data, a, this.f.frameIndex);
    }
    /** ms que faltan para que salga el golpe en curso. */
    msToActive() { return this.attacking ? M().msToActive(this.f.data, this.f.animation, this.f.frameIndex, this.f.elapsed) : Infinity; }

    /* ---------- fuelle ---------- */

    /** Gasta fuelle para atacar. Sin fuelle no se puede (hasta recuperar el 30 %). */
    canSpend(match) {
      if (!this.exhausted) return true;
      if (!this.noAmmoCooldown) { match.popup(this, '¡SIN FUELLE!', '#ffb37a'); match.sfx('error'); this.noAmmoCooldown = 700; }
      return false;
    }
    spend(cost, match) {
      const F = R().FUELLE;
      this.fuelle = Math.max(0, this.fuelle - (cost || 0));
      this.regenAt = this.t + F.regenDelayMs;
      if (this.fuelle <= 0 && !this.exhausted) {
        this.exhausted = true;
        match.popup(this, '¡SIN FUELLE!', '#ffb37a'); match.sfx('tired');
      }
    }
    updateFuelle(dt) {
      const F = R().FUELLE;
      // Se recupera si no te cubres y ha pasado la espera desde el último ataque.
      if (!this.guard && this.dizzyT <= 0 && this.t >= this.regenAt && this.fuelle < F.max) {
        this.fuelle = Math.min(F.max, this.fuelle + R().fuelleRegen(dt));
      }
      if (this.exhausted && this.fuelle >= F.exhaustedUntil) this.exhausted = false;
    }
    /** Flancos del joystick abajo para la guardia justa. */
    trackBlockInput(held, noParry) {
      if (held && !this.blockInput) { this.parryIdle = this.t - this.blockReleaseT; this.blockPressT = this.t; this.parryUsed = !!noParry; }
      if (!held && this.blockInput) this.blockReleaseT = this.t;
      this.blockInput = !!held;
    }
    canParryNow() {
      return this.blockInput && !this.parryUsed &&
        R().isParry({ heldMs: this.t - this.blockPressT, idleBeforeMs: this.parryIdle, blockstun: this.blockstun });
    }

    /** ctl: {left,right,up,block,actions:[]}. match ofrece intox, bottles, popup y sfx. */
    update(dt, ctl, opp, match) {
      const s = dt / 1000;
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt);
      this.noAmmoCooldown = Math.max(0, this.noAmmoCooldown - dt);
      this.displayHp += (this.hp - this.displayHp) * Math.min(1, s * 3);

      if (this.state === 'ko') return this.updateKO(dt);
      if (this.state === 'win') { this.winT += dt; this.physics(s, false); this.sync(); return; }

      this.hitstun = Math.max(0, this.hitstun - dt);
      this.blockstun = Math.max(0, this.blockstun - dt);
      this.stumble = Math.max(0, this.stumble - dt);
      this.wetT = Math.max(0, this.wetT - dt);
      this.dashRec = Math.max(0, this.dashRec - dt);
      this.landRecT = Math.max(0, this.landRecT - dt);
      if (this.dashT > 0) { this.dashT -= dt; if (this.dashT <= 0) { this.dashT = 0; this.dashRec = R().DASH.recoverMs; this.vx *= 0.3; } }
      if (this.downT > 0) {
        this.downT -= dt;
        if (this.downT <= 0) { this.downT = 0; this.getupT = R().KNOCKDOWN.getupMs; }
      } else if (this.getupT > 0) {
        this.getupT = Math.max(0, this.getupT - dt);
        if (this.getupT === 0) this.f.enabled = true;
      }
      if (this.dizzyT > 0) {
        this.dizzyT = Math.max(0, this.dizzyT - dt);
        if (this.dizzyT === 0) { this.fuelle = Math.max(this.fuelle, R().GUARD_BREAK.refill); this.exhausted = false; }
      }
      if (this.wetT > 0 && this.state === 'fight' && match.drip) match.drip(this);

      // Agarrado o dentro de la fuente: la posición la controla el combate.
      if (this.state === 'grabbed' || this.state === 'soaked') { this.sync(); return; }
      // Ejecutando un ultimate guiado por el combate (carga y lanzamiento a la fuente).
      if (this.locked) { this.f.update(dt); this.sync(); return; }

      if (this.state !== 'fight') {
        this.walking = false; this.guard = false; this.smoking = null; this.diving = false;
        this.physics(s, false); this.sync(); this.f.update(dt); this.sync();
        return;
      }

      this.updateFuelle(dt);
      this.trackBlockInput(ctl.block, ctl.noParry);
      // Mareado (guardia rota), tumbado o levantándose: no hace nada.
      if (this.dizzyT > 0 || this.downT > 0 || this.getupT > 0) {
        this.guard = false; this.guardWas = false; this.walking = false; this.pending = []; this.smoking = null;
        this.physics(s, false, match); this.sync();
        return;
      }

      // Desmayo por el bajón de azúcar: tumbado e indefenso.
      if (this.faintT > 0) {
        this.faintT = Math.max(0, this.faintT - dt);
        this.guard = false; this.walking = false; this.pending = [];
        this.physics(s, false); this.sync();
        if (this.faintT === 0) { if (this.faintReason !== 'fall') match.popup(this, '¡SE DESPIERTA!', '#8bf2ce'); this.f.play('idle', true); }
        return;
      }

      const rules = R();
      const sugar = rules.sugarPhase(this.loadout, match.matchTime);
      if (sugar === 'fading' && !this.notes.fading) { this.notes.fading = true; match.popup(this, '¡BAJÓN DE AZÚCAR!', '#ffb37a'); match.sfx('faintWarn'); }
      if (sugar === 'crashed' && !this.fainted && !this.air) return this.faint(match);
      const wet = this.wetT > 0;
      if (this.buffs.length) this.buffs = this.buffs.filter((b) => b.until > this.t);
      const speed = this.loadout.speed * (sugar === 'boost' ? rules.SUGAR.speedMult : 1) * (wet ? rules.WET.speedMult : 1) * (1 + this.buffPct('speedPct') / 100);
      const animMult = (sugar === 'boost' ? rules.SUGAR.animMult : 1) * (wet ? rules.WET.animMult : 1);

      const intox = match.levelOf ? match.levelOf(this) : match.intoxOf(this);
      const imp = rules.impairment(intox, this.loadout.aim);
      const chaos = match.wild ? match.chaos() : 0;
      this.invertT = Math.max(0, (this.invertT || 0) - dt);
      this.phantomT = Math.max(0, (this.phantomT || 0) - dt);

      // Pequeño búfer: una acción pulsada durante otro movimiento se ejecuta al acabar (≤260 ms).
      // El puntillo retrasa las acciones.
      for (const a of ctl.actions || []) this.pending.push({ a, at: this.t + imp.inputDelayMs });
      this.pending = this.pending.filter((p) => p.at > this.t || this.t - p.at < 260);
      const readyItems = this.pending.filter((p) => p.at <= this.t);
      const ready = readyItems.map((p) => p.a);
      const consume = (a) => { const i = this.pending.indexOf(readyItems[ready.indexOf(a)]); if (i >= 0) this.pending.splice(i, 1); };

      // Fumando: quieto mientras se consume. Baja el puntillo y, irónicamente, cura.
      if (this.smoking) {
        const it = this.smoking.item;
        this.smoking.t += dt;
        this.relief += it.relief * dt / it.ms;
        this.hp = Math.min(this.maxHp, this.hp + it.heal * dt / it.ms);
        if (Math.random() < dt / (it.look === 'cig' ? 70 : 45)) match.smokePuff(this);
        this.guard = false; this.walking = false;
        if (this.smoking.t >= it.ms) {
          this.smoking = null;
          match.popup(this, (it.relief >= 0.1 ? '−' + Math.round(it.relief * 100) + ' % PUNTILLO · ' : '') + '+' + it.heal + ' VIDA', '#c9d3df');
          if (it.buff) {
            this.buffs = this.buffs.filter((b) => b.label !== it.buff.label);
            this.buffs.push({ ...it.buff, until: this.t + it.buff.ms });
          }
        }
        this.physics(s, false); this.sync(); this.f.update(dt); this.sync();
        return;
      }

      // Modo salvaje: controles invertidos, pasos solos y caídas sin que nadie te toque.
      if (chaos > 0) {
        const W = rules.WILD;
        if (!this.invertT && Math.random() < W.invertPerSec * chaos * s) {
          this.invertT = 1500 + Math.random() * 1500;
          match.say(this, 'invert');
        }
        if (!this.air && !this.busy && !this.attacking && !this.phantomT && Math.random() < W.phantomPerSec * chaos * s) {
          this.phantomT = 450; this.phantomDir = Math.random() < 0.5 ? -1 : 1;
          match.say(this, 'phantom');
        }
        if (!this.air && !this.busy && !this.attacking && Math.random() < W.fallPerSec * chaos * s) {
          this.faintTotal = 1100; this.faintT = 1100; this.faintReason = 'fall';
          this.f.play('idle', true); this.pending = [];
          if (!match.say(this, 'fall')) match.popup(this, '¡PUMBA!', '#ffb37a');
          match.sfx('land'); match.dust(this.cx, C.GROUND, 1);
          this.sync();
          return;
        }
      }

      // Tropiezos (puntillo) y tos (tabaco).
      if (!this.air && !this.busy && !this.attacking) {
        if (intox > 0.05 && Math.random() < imp.stumblePerSec * s) {
          this.stumble = 420 + Math.random() * 250;
          this.stumbleDir = Math.random() < 0.5 ? -1 : 1;
          if (!match.say(this, 'stumble')) match.popup(this, '¡HIC!', '#f8ce73');
        } else if (this.cough > 0 && Math.random() < rules.SMOKE.coughPerSec * this.cough * s) {
          this.stumble = 320; this.stumbleDir = -this.facing;
          match.popup(this, '¡COF, COF!', '#c9d3df'); match.sfx('cough');
        }
      }

      let dir = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0);
      if (this.invertT) dir = -dir;                 // izquierda era la otra
      if (this.phantomT) dir = this.phantomDir;     // te vas tú solo
      if (!this.air && !this.attacking && !this.busy) {
        const want = Math.sign(opp.cx - this.cx);
        if (want && Math.abs(opp.cx - this.cx) > 6) this.facing = want;
      }
      // Paso rápido: doble toque del joystick (o de la flecha) hacia el mismo lado.
      let wantDash = 0;
      if (dir !== 0 && this.prevDir === 0) {
        if (dir === this.tapDir && this.t - this.tapT <= rules.DASH.doubleTapMs) { wantDash = dir; this.tapDir = 0; }
        else { this.tapDir = dir; this.tapT = this.t; }
      }
      this.prevDir = dir;
      // Solo cubre el joystick abajo (o ↓/S): andar hacia atrás ya no cubre.
      this.guard = !this.air && (this.blockstun > 0 || (!this.attacking && this.hitstun <= 0 && this.stumble <= 0 &&
        this.dashT <= 0 && this.landRecT <= 0 && !!ctl.block));
      // Ponerse en guardia cuesta un poco de fuelle (machacarla te vacía la barra).
      if (this.guard && !this.guardWas && this.blockstun <= 0) this.fuelle = Math.max(0, this.fuelle - rules.FUELLE.guardEnter);
      this.guardWas = this.guard;
      this.walking = false;

      if (!this.air) {
        if (this.stumble > 0) {
          this.vx = this.stumbleDir * 110 + Math.sin(this.t / 70) * 40;
        } else if (this.dashT > 0) {
          // Deslizándose: la velocidad la puso startDash.
        } else if (!this.busy && !this.attacking) {
          if (wantDash && !ctl.block) this.startDash(wantDash, speed, match);
          else if (ctl.block) this.vx = 0;
          else if (dir) {
            this.vx = dir * (dir === this.facing ? C.WALK_F : C.WALK_B) * speed;
            if (intox > 0.1) this.vx += Math.sin(this.t / 170 + this.seed) * 80 * intox;
            this.walking = true;
          } else this.vx = 0;
          let acted = false;
          for (let a of ready) {
            consume(a); acted = true;
            if (chaos > 0 && (a === 'punch' || a === 'kick') && Math.random() < rules.WILD.swapChance * chaos) {
              a = a === 'punch' ? 'kick' : 'punch';
              match.say(this, 'swap');
            } else if (imp.inputDelayMs > 150 && Math.random() < 0.2) match.say(this, 'delay');
            if (a === 'jump') { this.jump(dir, speed); break; }
            if (a === 'punch') { this.chain = 0; this.startPunch(opp, imp, match); break; }
            if (a === 'kick') { this.chain = 0; this.startAttack('kick', imp, match, false); break; }
            if (a === 'grab') { this.chain = 0; this.startAttack('grab', imp, match, false); break; }
            if (a === 'dashF' || a === 'dashB') { this.startDash(a === 'dashF' ? this.facing : -this.facing, speed, match); break; }
            if (a === 'bottle') { this.tryThrow(match); break; }
            if (a === 'special') { this.trySpecial(match); break; }
            if (a === 'smoke') { this.trySmoke(match); break; }
          }
          // Mantener arriba (joystick o tecla) sigue saltando sin levantar el dedo.
          if (!acted && ctl.up && this.dashT <= 0) this.jump(dir, speed);
        } else if (this.canCancelSpecial()) {
          // Combo: un puño que conecta se cancela en otro puño o en patada; puño o patada, en el ultimate.
          for (const a of ready) {
            if ((a === 'punch' || a === 'kick') && this.canCancel()) { consume(a); this.chain++; this.startAttack(a, imp, match, true); break; }
            if (a === 'special' && this.meterFull) { consume(a); this.trySpecial(match); break; }
          }
        }
      } else if (!this.busy && !this.attacking && !this.airAttacked) {
        // En el aire: PUÑO = puño corto hacia abajo; PATADA = patada en picado (con algo de altura).
        for (const a of ready) {
          if (a === 'punch') { consume(a); this.chain = 0; if (this.startAttack('airPunch', imp, match, false)) this.airAttacked = true; break; }
          if (a === 'kick' && -this.y >= rules.DIVE.minHeight) { consume(a); this.chain = 0; this.startDive(imp, match); break; }
        }
      }
      if (this.diving) {
        // Un instante quieto en el aire y luego cae en diagonal muy rápido.
        this.diveT += dt;
        if (this.diveT < rules.DIVE.startupMs) { this.vx = 0; this.vy = 0; }
        else { this.vx = this.facing * rules.DIVE.vx; this.vy = rules.DIVE.vy; }
      }

      this.physics(s, this.walking || this.stumble > 0 || this.dashT > 0, match);
      this.sync();
      this.f.update(dt * animMult * (this.walking && !this.attacking ? 1.8 : 1));
      this.sync();
    }

    jump(dir, speed) {
      this.air = true; this.airAttacked = false;
      this.vy = C.JUMP_V * (0.92 + 0.08 * Math.min(1.3, speed));
      this.vx = dir * 250 * speed;
      this.walking = false;
    }

    physics(s, keepVx, match) {
      if (this.air) {
        if (!this.diving) this.vy += C.GRAVITY * s;
        this.y += this.vy * s;
        this.cx += this.vx * s;
        if (this.y >= 0) {
          this.y = 0; this.vy = 0; this.air = false; this.airAttacked = false;
          // Aterrizar de un ataque aéreo: si no ha entrado, te quedas vendido un momento.
          const a = this.f.animation;
          if (this.diving || a === 'dive' || a === 'airPunch') {
            const wasDive = this.diving || a === 'dive';
            this.diving = false;
            this.f.play('idle', true);
            this.landRecT = Math.max(this.landRecT, wasDive ? R().DIVE.landWhiffMs : 80);
          }
          if (this.landRecNext) { this.landRecT = Math.max(this.landRecT, this.landRecNext); this.landRecNext = 0; }
          if (this.state !== 'ko') this.vx = this.hitstun > 0 ? this.vx * 0.5 : 0;
          if (this.downPending && this.state === 'fight') {
            // Derribado: al suelo y luego se levanta (sin que le puedan pegar).
            this.downPending = false; this.downT = R().KNOCKDOWN.downMs; this.hitstun = 0; this.vx *= 0.4;
            this.f.play('idle', true); this.f.enabled = false; this.pending = [];
            if (match) { match.dust(this.cx, C.GROUND, 1.4); match.sfx('land'); match.shake = Math.max(match.shake, 6); }
          } else if (match) { match.dust(this.cx, C.GROUND, 0.8); match.sfx('land'); }
        }
      } else {
        if (!keepVx) {
          const dec = C.FRICTION * s;
          this.vx = Math.abs(this.vx) <= dec ? 0 : this.vx - Math.sign(this.vx) * dec;
        }
        this.cx += this.vx * s;
      }
      this.cx = Math.max(C.MIN_X, Math.min(C.MAX_X, this.cx));
    }

    startAttack(kind, imp, match, cancel) {
      if (!this.canSpend(match)) return false;
      if (this.f.play(kind, !!cancel)) {
        this.spend(R().MOVES[kind].fuelle, match);
        this.whiff = kind !== 'grab' && Math.random() < imp.whiffChance;
        this.attackKind = kind;
        match.sfx('swing');
        return true;
      }
      return false;
    }

    /** El puño sale como gancho antiaéreo si el rival está saltando cerca. */
    startPunch(opp, imp, match) {
      const G = R().GANCHO;
      const anti = opp && opp.air && opp.state === 'fight' && Math.abs(opp.cx - this.cx) <= G.range && -opp.y >= G.minHeight;
      return this.startAttack(anti ? 'gancho' : 'punch', imp, match, false);
    }

    startDive(imp, match) {
      if (!this.startAttack('dive', imp, match, true)) return false;
      this.diving = true; this.diveT = 0; this.airAttacked = true;
      return true;
    }

    startDash(dir, speed, match) {
      const D = R().DASH;
      if (this.air || !this.canSpend(match)) return false;
      this.spend(R().FUELLE.dash, match);
      const fwd = dir === this.facing;
      this.dashT = fwd ? D.fwdMs : D.backMs;
      this.dashDir = dir;
      this.vx = dir * (fwd ? D.fwdV : D.backV) * Math.min(1.25, speed);
      this.walking = false;
      match.dust(this.cx - dir * 30, C.GROUND, 0.6);
      match.sfx('dash');
      return true;
    }

    tryThrow(match) {
      if (!this.canSpend(match)) return false;
      if (this.ammo <= 0) {
        if (!this.noAmmoCooldown) {
          match.popup(this, '¡SIN BOTELLINES!', '#ff8a7a');
          match.sfx('error');
          this.noAmmoCooldown = 900;
        }
        return false;
      }
      if (match.bottles.throw(this.f)) { this.ammo--; this.spend(R().MOVES.bottle.fuelle, match); match.sfx('throw'); if (match.onBottleThrown) match.onBottleThrown(this); return true; }
      return false;
    }

    trySpecial(match) {
      if (!this.hasSpecial || this.air) return false;
      if (!this.meterFull) {
        if (!this.noAmmoCooldown) { match.popup(this, this.char.special.short + ' ' + Math.floor(this.meter) + '%', '#9aa1ab'); this.noAmmoCooldown = 700; }
        return false;
      }
      const id = this.char.special.id;
      if (id === 'fuente') {
        if (!match.fountain) return false;
        this.f.play('idle', true);
      } else if (!this.f.play('throwDart', true)) return false;
      this.meter = 0; this.chain = 0; this.ultimates++;
      this.pending = [];
      match.superFlash(this);
      if (id === 'fuente') match.startFountainThrow(this);
      return true;
    }

    /** Cae a la fuente: mucho daño y queda empapado. Devuelve 'hit' o 'ko'. */
    splashHit(damage) {
      this.hp = Math.max(0, this.hp - damage);
      this.flash = 160; this.flashColor = '#9fe6ff';
      this.wetT = R().WET.ms;
      this.state = 'fight';
      if (this.hp <= 0) return this.knockOut(1);
      this.state = 'soaked';
      return 'hit';
    }

    trySmoke(match) {
      if (this.air) return false;
      const it = this.currentSmoke;
      if (!it) {
        if (!this.noAmmoCooldown) { match.popup(this, '¡SIN TABACO!', '#ff8a7a'); match.sfx('error'); this.noAmmoCooldown = 900; }
        return false;
      }
      it.left--; it.done++; this.smoked++;
      if (it.done > it.coughFrom) this.cough++;
      this.smoking = { t: 0, item: it };
      match.say(this, 'smoke');
      this.vx = 0;
      match.sfx('lighter');
      return true;
    }

    /** Cigarrillos (o lo que sea) que quedan en total. */
    get cigs() { return this.smokeBag.reduce((n, x) => n + x.left, 0); }
    /** Lo próximo que se va a fumar: lo del primer hueco hasta que se acabe. */
    get currentSmoke() { return this.smokeBag.find((x) => x.left > 0) || null; }
    /** Suma de un efecto temporal (habano, chiflo…). */
    buffPct(key) { let v = 0; for (const b of this.buffs || []) if (b[key]) v += b[key]; return v; }
    /** Fuerza en este momento (con los efectos temporales). */
    get powerNow() { return this.loadout.power * (1 + this.buffPct('powerPct') / 100); }

    faint(match) {
      this.fainted = true; this.faintReason = 'sugar';
      this.faintTotal = R().SUGAR.faintMs; this.faintT = this.faintTotal;
      this.smoking = null; this.pending = [];
      this.f.play('idle', true);
      this.hitstun = 0; this.blockstun = 0; this.stumble = 0;
      match.popup(this, '¡SE HA QUEDADO FRITO!', '#ff8a7a');
      match.sfx('faint');
      match.dust(this.cx, C.GROUND, 1.3);
    }

    /** opts: {hitstun, knockback, pushMult, knockdown} ya escalados por el combo.
     * Devuelve 'miss', 'parry', 'block', 'break', 'hit' o 'ko'. */
    takeHit(kind, damage, fromX, opts) {
      const rules = R(), mv = rules.MOVES[kind];
      const o = opts || {};
      const away = Math.sign(this.cx - fromX) || -this.facing;
      if (this.downed) return 'miss';
      if (this.faintT > 0) {
        // Desmayado: no se defiende y recibe más daño.
        this.hp = Math.max(0, this.hp - damage * rules.SUGAR.faintDamage);
        this.flash = 140; this.flashColor = '#ffffff';
        if (this.hp <= 0) return this.knockOut(away);
        return 'hit';
      }
      const canGuard = this.guard && !this.air && this.state === 'fight' && !mv.unblockable;
      if (canGuard && this.canParryNow()) {
        // Guardia justa: ni vida ni fuelle, y devuelve un poco.
        this.parryUsed = true;
        this.blockstun = rules.PARRY.defenderStunMs;
        this.fuelle = Math.min(rules.FUELLE.max, this.fuelle + rules.PARRY.refund);
        this.facing = -away; this.vx = 0;
        this.flash = 120; this.flashColor = '#e8fbff';
        return 'parry';
      }
      if (canGuard) {
        this.blockstun = mv.blockstun;
        this.vx = away * rules.pushSpeed((mv.blockPush || 20) * (o.pushMult || 1));
        this.facing = -away;
        // Desgaste: el botellín puede rematar; el resto deja al menos 1 de vida.
        const chip = damage * (mv.chip || 0);
        this.hp = kind === 'bottle' ? Math.max(0, this.hp - chip) : Math.max(Math.min(this.hp, 1), this.hp - chip);
        this.fuelle = Math.max(0, this.fuelle - (mv.guard || 0));
        this.flash = 60; this.flashColor = '#9fd8ff';
        if (this.hp <= 0) return this.knockOut(away);
        if (this.fuelle <= 0) { this.guardBreak(away); return 'break'; }
        return 'block';
      }
      this.hp = Math.max(0, this.hp - damage);
      this.flash = 140; this.flashColor = kind === 'dart' ? '#ffe08a' : '#ffffff';
      this.f.play('idle', true); // interrumpe el ataque (y un lanzamiento aún no soltado)
      this.pending = [];
      this.stumble = 0; this.dashT = 0; this.dashRec = 0; this.landRecT = 0; this.diving = false;
      this.dizzyT = 0;      // un golpe le despierta del mareo
      if (this.smoking) { this.smoking = null; this.dropCig = true; }
      this.hitstun = o.hitstun || mv.hitstun;
      const knock = mv.knockdown || o.knockdown;
      if (this.air || (knock && mv.launch)) {
        // En el aire (o lanzado): sale despedido y cae.
        this.air = true;
        this.vy = Math.min(this.vy, mv.launch || -380);
        this.vx = away * (o.knockback || mv.knockback);
      } else {
        this.vx = away * rules.pushSpeed((mv.push || 20) * (o.pushMult || 1));
      }
      if (knock) this.downPending = true;
      if (this.hp <= 0) return this.knockOut(away);
      return 'hit';
    }

    /** Guardia rota: mareado y sin poder hacer nada un momento. */
    guardBreak(away) {
      this.dizzyT = R().GUARD_BREAK.dizzyMs;
      this.guard = false; this.guardWas = false; this.blockstun = 0; this.fuelle = 0; this.exhausted = false;
      this.vx = away * R().pushSpeed(40);
      this.f.play('idle', true); this.pending = [];
    }

    knockOut(away) {
      this.hp = 0;
      this.state = 'ko'; this.koT = 0;
      this.f.play('idle', true);
      this.f.enabled = false;
      this.smoking = null; this.faintT = 0;
      this.dizzyT = 0; this.downT = 0; this.getupT = 0; this.downPending = false; this.diving = false; this.dashT = 0;
      this.facing = -away;
      this.vx = away * 430; this.vy = -560; this.air = true;
      return 'ko';
    }

    updateKO(dt) {
      this.koT += dt;
      const s = dt / 1000;
      if (this.air) {
        this.vy += C.GRAVITY * s; this.y += this.vy * s; this.cx += this.vx * s;
        if (this.y >= 0) { this.y = 0; this.air = false; this.vy = 0; this.vx *= 0.4; this.landedKO = true; }
      } else {
        const dec = 900 * s;
        this.vx = Math.abs(this.vx) <= dec ? 0 : this.vx - Math.sign(this.vx) * dec;
        this.cx += this.vx * s;
      }
      // El cuerpo tumbado ocupa ~160 px a cada lado: se mantiene dentro de la pantalla.
      this.cx = Math.max(C.MIN_X + 90, Math.min(C.MAX_X - 90, this.cx));
      this.sync();
    }

    setWin() {
      this.state = 'win'; this.winT = 0; this.f.play('idle', true); this.hitstun = 0; this.blockstun = 0; this.stumble = 0; this.smoking = null; this.faintT = 0;
      this.dizzyT = 0; this.downT = 0; this.getupT = 0; this.diving = false; this.dashT = 0; this.landRecT = 0; this.f.enabled = true;
    }

    /** Fotograma y transformaciones de la pose actual. */
    pose() {
      const data = this.f.data, anims = data.animations, Mv = M();
      const st = (name) => Mv.poseFrame(data, name, this.t);
      const art = (name) => Mv.hasArt(data, name);
      let frame, rot = 0, dy = 0, shield = 0, item = null, pivot = null, cig = false, dart = null;
      const lying = (k) => { rot = -k * Math.PI / 2; pivot = { x: 20, y: -70, drop: 45 * k }; };
      if (this.state === 'ko') {
        // Cae de espaldas girando alrededor de la cadera (coordenadas locales desde el ancla).
        frame = anims.idle.frames[0];
        lying(Math.min(1, this.koT / 520));
      } else if (this.state === 'grabbed') {
        frame = st('grabbed');
        rot = this.grabRot;
      } else if (this.state === 'soaked') {
        frame = anims.idle.frames[0];
        lying(1); dy = Math.sin(this.t / 180) * 3;
      } else if (this.poseOverride) {
        frame = this.poseOverride.state ? st(this.poseOverride.state) : anims[this.poseOverride.anim].frames[this.poseOverride.frame];
      } else if (this.faintT > 0) {
        frame = anims.idle.frames[0];
        const since = this.faintTotal - this.faintT;
        lying(Math.min(1, since / 420, this.faintT / 380));
      } else if (this.downT > 0) {
        frame = st('down');
        if (!art('down')) lying(Math.min(1, (R().KNOCKDOWN.downMs - this.downT) / 200 + 0.6));
      } else if (this.getupT > 0) {
        frame = st('getup');
        if (!art('getup')) lying(Math.min(1, this.getupT / R().KNOCKDOWN.getupMs));
      } else if (this.dizzyT > 0) {
        frame = st('dizzy');
        if (!art('dizzy')) { rot = Math.sin(this.t / 140) * 0.08; dy = Math.abs(Math.sin(this.t / 280)) * 3; }
      } else if (this.state === 'win') {
        frame = anims.throwBottle.frames[2];
        dy = -Math.abs(Math.sin(this.winT / 240)) * 10;
        item = frame.itemSocket;
      } else if (this.attacking) {
        frame = this.f.frame;
        if (this.f.animation === 'throwDart' && frame.itemSocket) dart = frame.itemSocket;
        if (frame.pose) {
          rot = frame.pose.rot; dy = frame.pose.dy;
          if (frame.pose.pivot) pivot = { x: frame.pose.pivot.x, y: frame.pose.pivot.y, drop: 0 };
        }
      } else if (this.air) {
        frame = st('jump');
      } else if (this.landRecT > 0) {
        frame = st('land');
        if (!art('land')) dy = 4;
      } else if (this.hitstun > 0) {
        frame = st('hit');
        if (!art('hit')) rot = -0.16 * Math.min(1, this.hitstun / 200);
      } else if (this.blockstun > 0) {
        frame = st('guard'); shield = 1;
      } else if (this.dashT > 0) {
        frame = st('dash');
        if (!art('dash')) rot = this.dashDir === this.facing ? 0.12 : -0.1;
      } else if (this.smoking) {
        frame = anims.idle.frames[0]; cig = true;
        dy = Math.sin(this.smoking.t / 260) * 1.5;
      } else if (this.guard) {
        frame = st('guard'); shield = 0.35;
      } else if (this.exhausted && !this.walking) {
        frame = st('tired');
        if (!art('tired')) dy = 3 + Math.sin(this.t / 190) * 3;
      } else {
        frame = this.f.frame;
        if (this.walking) dy = -Math.abs(Math.sin(this.t / 110)) * 4;
      }
      if (this.stumble > 0) rot = Math.sin(this.t / 55) * 0.09;
      return { frame, rot, dy, shield, item, pivot, cig, dart };
    }

    drawShadow(ctx) {
      const h = Math.min(1, -this.y / 300);
      ctx.fillStyle = 'rgba(12,8,16,0.55)';
      ctx.beginPath();
      ctx.ellipse(this.cx, C.GROUND + 3, 66 * (1 - h * 0.5), 9 * (1 - h * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    draw(ctx, opts) {
      const o = opts || {};
      const p = this.pose();
      const a = this.f.data.anchor, fr = p.frame;
      let src = this.image, sx = fr.x, sy = fr.y;
      if (this.flash > 0 && !o.ghost) {
        tintCtx.clearRect(0, 0, 192, 176);
        tintCtx.globalCompositeOperation = 'source-over';
        tintCtx.drawImage(this.image, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
        tintCtx.globalCompositeOperation = 'source-atop';
        tintCtx.globalAlpha = 0.75;
        tintCtx.fillStyle = this.flashColor;
        tintCtx.fillRect(0, 0, 192, 176);
        tintCtx.globalAlpha = 1;
        tintCtx.globalCompositeOperation = 'source-over';
        src = tintCanvas; sx = 0; sy = 0;
      }
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(this.f.x + (o.dx || 0)), Math.round(this.f.y + p.dy + (o.dy || 0)));
      ctx.scale(C.S * this.facing, C.S);
      if (p.pivot) {
        ctx.translate(p.pivot.x, p.pivot.y + p.pivot.drop);
        ctx.rotate(p.rot);
        ctx.translate(-p.pivot.x, -p.pivot.y);
      } else if (p.rot) ctx.rotate(p.rot);
      ctx.drawImage(src, sx, sy, fr.w, fr.h, -a.x, -a.y, fr.w, fr.h);
      if (this.wetT > 0 && this.flash <= 0 && !o.ghost) {
        // Mojado: brillo azulado sobre el sprite.
        tintCtx.clearRect(0, 0, 192, 176);
        tintCtx.globalCompositeOperation = 'source-over';
        tintCtx.drawImage(this.image, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
        tintCtx.globalCompositeOperation = 'source-atop';
        tintCtx.fillStyle = '#4fb4ff';
        tintCtx.fillRect(0, 0, 192, 176);
        tintCtx.globalCompositeOperation = 'source-over';
        const k = Math.min(1, this.wetT / 2000);
        ctx.globalAlpha = (o.alpha !== undefined ? o.alpha : 1) * (0.28 + 0.08 * Math.sin(this.t / 160)) * k;
        ctx.drawImage(tintCanvas, 0, 0, fr.w, fr.h, -a.x, -a.y, fr.w, fr.h);
        ctx.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
      }
      if (!o.ghost) {
        if (p.cig) {
          // Lo que fuma, en la boca (coordenadas locales de la celda).
          const mx = C.MOUTH.x - a.x, my = C.MOUTH.y - a.y;
          const look = (this.smoking && this.smoking.item.look) || 'cig';
          const ember = Math.sin(this.t / 90) > 0 ? '#ff5a1e' : '#ffb347';
          if (look === 'cigar' || look === 'habano') {
            const len = look === 'habano' ? 15 : 12, h = look === 'habano' ? 4 : 3;
            ctx.fillStyle = '#1b1414'; ctx.fillRect(mx - 1, my - 2, len + 4, h + 2);
            ctx.fillStyle = '#7c4a28'; ctx.fillRect(mx, my - 1, len, h);
            ctx.fillStyle = '#58321a'; ctx.fillRect(mx, my - 1 + h - 1, len, 1);
            if (look === 'habano') { ctx.fillStyle = '#c82828'; ctx.fillRect(mx + 3, my - 1, 2, h); }
            ctx.fillStyle = '#5a5a5a'; ctx.fillRect(mx + len, my - 1, 1, h);
            ctx.fillStyle = ember; ctx.fillRect(mx + len + 1, my - 1, 2, h);
          } else if (look === 'chiflo') {
            ctx.fillStyle = '#1b1414'; ctx.fillRect(mx - 1, my - 2, 15, 5);
            ctx.fillStyle = '#d8c39a'; ctx.fillRect(mx, my, 2, 2);
            ctx.fillStyle = '#f4f0e4'; ctx.fillRect(mx + 2, my, 5, 2); ctx.fillRect(mx + 7, my - 1, 5, 3);
            ctx.fillStyle = ember; ctx.fillRect(mx + 12, my - 1, 2, 3);
          } else {
            ctx.fillStyle = '#1b1414'; ctx.fillRect(mx - 1, my - 1, 12, 4);
            ctx.fillStyle = '#f2efe6'; ctx.fillRect(mx, my, 9, 2);
            ctx.fillStyle = '#c98a4a'; ctx.fillRect(mx, my, 3, 2);
            ctx.fillStyle = ember; ctx.fillRect(mx + 9, my, 2, 2);
          }
        }
        if (p.dart) {
          ctx.save();
          ctx.translate(p.dart.x - a.x, p.dart.y - a.y);
          ctx.rotate((p.dart.rotation || 0) - 0.4);
          drawDartShape(ctx);
          ctx.restore();
        }
      }
      ctx.restore();
      if (p.shield && !o.ghost) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.45 * p.shield;
        ctx.strokeStyle = '#8fd6ff'; ctx.lineWidth = 6;
        ctx.beginPath();
        const cx = this.cx + this.facing * 52, cy = C.GROUND + this.y - 150;
        const mid = this.facing === 1 ? 0 : Math.PI;
        ctx.arc(cx, cy, 78, mid - 1.1, mid + 1.1);
        ctx.stroke();
        ctx.restore();
      }
      if (!o.ghost && this.state === 'fight') {
        const head = { x: this.cx + this.facing * 8, y: C.GROUND + this.y + p.dy - 290 };
        if (this.dizzyT > 0) {
          // Guardia rota: chapas dando vueltas sobre la cabeza.
          ctx.save();
          for (let i = 0; i < 3; i++) {
            const a = this.t / 160 + i * Math.PI * 2 / 3;
            const x = head.x + Math.cos(a) * 46, y = head.y + Math.sin(a) * 12;
            ctx.fillStyle = '#05070c'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = i === 1 ? '#e8424a' : '#f8ce73'; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff6c2'; ctx.fillRect(x - 2, y - 3, 3, 2);
          }
          ctx.restore();
        } else if (this.exhausted) {
          // Sin fuelle: gotas de sudor.
          const k = (this.t % 700) / 700;
          ctx.save(); ctx.globalAlpha = 1 - k;
          ctx.fillStyle = '#9fe6ff'; ctx.strokeStyle = '#05070c'; ctx.lineWidth = 2;
          for (const dx of [-30, 34]) {
            const x = head.x + dx, y = head.y + 30 + k * 26;
            ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.quadraticCurveTo(x + 6, y, x, y + 4); ctx.quadraticCurveTo(x - 6, y, x, y - 9); ctx.fill(); ctx.stroke();
          }
          ctx.restore();
        }
      }
      return p;
    }

    /** Punto de la brasa del cigarrillo en coordenadas del mundo. */
    cigTip() { return this.f.worldPoint({ x: C.MOUTH.x + 11, y: C.MOUTH.y }); }
  }

  root.TrolinaCombat = C;
  root.Combatant = Combatant;
  root.drawDartShape = drawDartShape;
})(window);
