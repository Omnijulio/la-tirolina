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
      this.cigs = loadout.cigs || 0;    // cigarrillos que quedan
      this.smoked = 0;                  // cigarrillos fumados
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
      this.smoking = null; this.faintT = 0; this.faintTotal = 0;
      this.wetT = 0; this.locked = false; this.poseOverride = null; this.grabRot = 0;
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
    get busy() { return this.hitstun > 0 || this.blockstun > 0 || this.stumble > 0 || this.faintT > 0; }
    get hasSpecial() { return !!this.char.special; }
    get meterFull() { return this.hasSpecial && this.meter >= R().METER_MAX; }

    /** Se puede cancelar un golpe que ha conectado con otro (combo). */
    canCancel() {
      const a = this.f.animation;
      return (a === 'punch' || a === 'kick') && this.hitConfirm === this.f.actionId &&
        this.f.frameIndex >= 3 && this.chain < R().MAX_CHAIN;
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
      if (this.wetT > 0 && Math.random() < dt / 60 && match.drip) match.drip(this);

      // Agarrado o dentro de la fuente: la posición la controla el combate.
      if (this.state === 'grabbed' || this.state === 'soaked') { this.sync(); return; }
      // Ejecutando un ultimate guiado por el combate (carga y lanzamiento a la fuente).
      if (this.locked) { this.f.update(dt); this.sync(); return; }

      if (this.state !== 'fight') {
        this.walking = false; this.guard = false; this.smoking = null;
        this.physics(s, false); this.sync(); this.f.update(dt); this.sync();
        return;
      }

      // Desmayo por el bajón de azúcar: tumbado e indefenso.
      if (this.faintT > 0) {
        this.faintT = Math.max(0, this.faintT - dt);
        this.guard = false; this.walking = false; this.pending = [];
        this.physics(s, false); this.sync();
        if (this.faintT === 0) { match.popup(this, '¡SE DESPIERTA!', '#8bf2ce'); this.f.play('idle', true); }
        return;
      }

      const rules = R();
      const sugar = rules.sugarPhase(this.loadout, match.matchTime);
      if (sugar === 'fading' && !this.notes.fading) { this.notes.fading = true; match.popup(this, '¡BAJÓN DE AZÚCAR!', '#ffb37a'); match.sfx('faintWarn'); }
      if (sugar === 'crashed' && !this.fainted && !this.air) return this.faint(match);
      const wet = this.wetT > 0;
      const speed = this.loadout.speed * (sugar === 'boost' ? rules.SUGAR.speedMult : 1) * (wet ? rules.WET.speedMult : 1);
      const animMult = (sugar === 'boost' ? rules.SUGAR.animMult : 1) * (wet ? rules.WET.animMult : 1);

      const intox = match.intoxOf(this);
      const imp = rules.impairment(intox, this.loadout.aim);

      // Pequeño búfer: una acción pulsada durante otro movimiento se ejecuta al acabar (≤260 ms).
      // El puntillo retrasa las acciones.
      for (const a of ctl.actions || []) this.pending.push({ a, at: this.t + imp.inputDelayMs });
      this.pending = this.pending.filter((p) => p.at > this.t || this.t - p.at < 260);
      const readyItems = this.pending.filter((p) => p.at <= this.t);
      const ready = readyItems.map((p) => p.a);
      const consume = (a) => { const i = this.pending.indexOf(readyItems[ready.indexOf(a)]); if (i >= 0) this.pending.splice(i, 1); };

      // Fumando: quieto mientras se consume el cigarrillo.
      if (this.smoking) {
        this.smoking.t += dt;
        this.relief += rules.SMOKE.relief * dt / rules.SMOKE.durationMs;
        if (Math.random() < dt / 70) match.smokePuff(this);
        this.guard = false; this.walking = false;
        if (this.smoking.t >= rules.SMOKE.durationMs) {
          this.smoking = null;
          match.popup(this, '−15 % PUNTILLO', '#c9d3df');
        }
        this.physics(s, false); this.sync(); this.f.update(dt); this.sync();
        return;
      }

      // Tropiezos (puntillo) y tos (tabaco).
      if (!this.air && !this.busy && !this.attacking) {
        if (intox > 0.05 && Math.random() < imp.stumblePerSec * s) {
          this.stumble = 420 + Math.random() * 250;
          this.stumbleDir = Math.random() < 0.5 ? -1 : 1;
          match.popup(this, '¡HIC!', '#f8ce73');
        } else if (this.smoked > rules.SMOKE.coughFrom && Math.random() < rules.SMOKE.coughPerSec * (this.smoked - rules.SMOKE.coughFrom) * s) {
          this.stumble = 320; this.stumbleDir = -this.facing;
          match.popup(this, '¡COF, COF!', '#c9d3df'); match.sfx('cough');
        }
      }

      const dir = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0);
      if (!this.air && !this.attacking && !this.busy) {
        const want = Math.sign(opp.cx - this.cx);
        if (want && Math.abs(opp.cx - this.cx) > 6) this.facing = want;
      }
      const holdingBack = dir !== 0 && dir === -this.facing;
      this.guard = !this.air && (this.blockstun > 0 || (!this.attacking && this.hitstun <= 0 && this.stumble <= 0 && (ctl.block || holdingBack)));
      this.walking = false;

      if (!this.air) {
        if (this.stumble > 0) {
          this.vx = this.stumbleDir * 110 + Math.sin(this.t / 70) * 40;
        } else if (!this.busy && !this.attacking) {
          if (ctl.block) this.vx = 0;
          else if (dir) {
            this.vx = dir * (dir === this.facing ? C.WALK_F : C.WALK_B) * speed;
            if (intox > 0.1) this.vx += Math.sin(this.t / 170 + this.seed) * 80 * intox;
            this.walking = true;
          } else this.vx = 0;
          let acted = false;
          for (const a of ready) {
            consume(a); acted = true;
            if (a === 'jump') { this.jump(dir, speed); break; }
            if (a === 'punch' || a === 'kick') { this.chain = 0; this.startAttack(a, imp, match, false); break; }
            if (a === 'bottle') { this.tryThrow(match); break; }
            if (a === 'special') { this.trySpecial(match); break; }
            if (a === 'smoke') { this.trySmoke(match); break; }
          }
          // Mantener arriba (joystick o tecla) sigue saltando sin levantar el dedo.
          if (!acted && ctl.up) this.jump(dir, speed);
        } else if (this.canCancel()) {
          // Combo: un golpe que conecta se puede cancelar en otro o en el ultimate.
          for (const a of ready) {
            if (a === 'punch' || a === 'kick') { consume(a); this.chain++; this.startAttack(a, imp, match, true); break; }
            if (a === 'special' && this.meterFull) { consume(a); this.trySpecial(match); break; }
          }
        }
      } else if (!this.busy && !this.attacking) {
        for (const a of ready) if (a === 'punch' || a === 'kick') { consume(a); this.chain = 0; this.startAttack(a, imp, match, false); break; }
      }

      this.physics(s, this.walking || this.stumble > 0, match);
      this.sync();
      this.f.update(dt * animMult * (this.walking && !this.attacking ? 1.8 : 1));
      this.sync();
    }

    jump(dir, speed) {
      this.air = true;
      this.vy = C.JUMP_V * (0.92 + 0.08 * Math.min(1.3, speed));
      this.vx = dir * 250 * speed;
      this.walking = false;
    }

    physics(s, keepVx, match) {
      if (this.air) {
        this.vy += C.GRAVITY * s;
        this.y += this.vy * s;
        this.cx += this.vx * s;
        if (this.y >= 0) {
          this.y = 0; this.vy = 0; this.air = false;
          if (this.state !== 'ko') this.vx = this.hitstun > 0 ? this.vx * 0.5 : 0;
          if (match) { match.dust(this.cx, C.GROUND, 0.8); match.sfx('land'); }
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
      if (this.f.play(kind, !!cancel)) {
        this.whiff = Math.random() < imp.whiffChance;
        this.attackKind = kind;
        match.sfx('swing');
      }
    }

    tryThrow(match) {
      if (this.ammo <= 0) {
        if (!this.noAmmoCooldown) {
          match.popup(this, '¡SIN BOTELLINES!', '#ff8a7a');
          match.sfx('error');
          this.noAmmoCooldown = 900;
        }
        return false;
      }
      if (match.bottles.throw(this.f)) { this.ammo--; match.sfx('throw'); if (match.onBottleThrown) match.onBottleThrown(this); return true; }
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
      if (this.cigs <= 0) {
        if (!this.noAmmoCooldown) { match.popup(this, '¡SIN TABACO!', '#ff8a7a'); match.sfx('error'); this.noAmmoCooldown = 900; }
        return false;
      }
      this.cigs--; this.smoked++;
      this.smoking = { t: 0 };
      this.vx = 0;
      match.sfx('lighter');
      return true;
    }

    faint(match) {
      this.fainted = true;
      this.faintTotal = R().SUGAR.faintMs; this.faintT = this.faintTotal;
      this.smoking = null; this.pending = [];
      this.f.play('idle', true);
      this.hitstun = 0; this.blockstun = 0; this.stumble = 0;
      match.popup(this, '¡SE HA QUEDADO FRITO!', '#ff8a7a');
      match.sfx('faint');
      match.dust(this.cx, C.GROUND, 1.3);
    }

    /** opts: {hitstun, knockback} ya escalados por el combo. Devuelve 'block', 'hit' o 'ko'. */
    takeHit(kind, damage, fromX, opts) {
      const mv = R().MOVES[kind];
      const o = opts || {};
      const away = Math.sign(this.cx - fromX) || -this.facing;
      if (this.faintT > 0) {
        // Desmayado: no se defiende y recibe más daño.
        this.hp = Math.max(0, this.hp - damage * R().SUGAR.faintDamage);
        this.flash = 140; this.flashColor = '#ffffff';
        if (this.hp <= 0) return this.knockOut(away);
        return 'hit';
      }
      if (this.guard && !this.air && this.state === 'fight' && !mv.unblockable) {
        this.blockstun = mv.blockstun;
        this.vx = away * mv.knockback * 0.55;
        this.facing = -away;
        const chip = kind === 'bottle' ? damage * (mv.chip || 0) : 0;
        this.hp = Math.max(0, this.hp - chip);
        this.flash = 60; this.flashColor = '#9fd8ff';
        if (this.hp <= 0) return this.knockOut(away);
        return 'block';
      }
      this.hp = Math.max(0, this.hp - damage);
      this.flash = 140; this.flashColor = kind === 'dart' ? '#ffe08a' : '#ffffff';
      this.f.play('idle', true); // interrumpe el ataque (y un lanzamiento aún no soltado)
      this.pending = [];
      this.stumble = 0;
      if (this.smoking) { this.smoking = null; this.dropCig = true; }
      this.hitstun = o.hitstun || mv.hitstun;
      this.vx = away * (o.knockback || mv.knockback);
      if (this.air) this.vy = Math.min(this.vy, -380);
      else if (kind === 'dart') { this.air = true; this.vy = -420; }
      if (this.hp <= 0) return this.knockOut(away);
      return 'hit';
    }

    knockOut(away) {
      this.hp = 0;
      this.state = 'ko'; this.koT = 0;
      this.f.play('idle', true);
      this.f.enabled = false;
      this.smoking = null; this.faintT = 0;
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

    setWin() { this.state = 'win'; this.winT = 0; this.f.play('idle', true); this.hitstun = 0; this.blockstun = 0; this.stumble = 0; this.smoking = null; this.faintT = 0; }

    /** Fotograma y transformaciones de la pose actual. */
    pose() {
      const anims = this.f.data.animations;
      let frame, rot = 0, dy = 0, shield = 0, item = null, pivot = null, cig = false, dart = null;
      const lying = (k) => { rot = -k * Math.PI / 2; pivot = { x: 20, y: -70, drop: 45 * k }; };
      if (this.state === 'ko') {
        // Cae de espaldas girando alrededor de la cadera (coordenadas locales desde el ancla).
        frame = anims.idle.frames[0];
        lying(Math.min(1, this.koT / 520));
      } else if (this.state === 'grabbed') {
        frame = anims.idle.frames[0];
        rot = this.grabRot;
      } else if (this.state === 'soaked') {
        frame = anims.idle.frames[0];
        lying(1); dy = Math.sin(this.t / 180) * 3;
      } else if (this.poseOverride) {
        frame = anims[this.poseOverride.anim].frames[this.poseOverride.frame];
      } else if (this.faintT > 0) {
        frame = anims.idle.frames[0];
        const since = this.faintTotal - this.faintT;
        lying(Math.min(1, since / 420, this.faintT / 380));
      } else if (this.state === 'win') {
        frame = anims.throwBottle.frames[2];
        dy = -Math.abs(Math.sin(this.winT / 240)) * 10;
        item = frame.itemSocket;
      } else if (this.attacking) {
        frame = this.f.frame;
        if (this.f.animation === 'throwDart' && frame.itemSocket) dart = frame.itemSocket;
      } else if (this.air) {
        frame = anims.kick.frames[1];
      } else if (this.hitstun > 0) {
        frame = anims.idle.frames[0];
        rot = -0.16 * Math.min(1, this.hitstun / 200);
      } else if (this.blockstun > 0) {
        frame = anims.idle.frames[2]; shield = 1;
      } else if (this.smoking) {
        frame = anims.idle.frames[0]; cig = true;
        dy = Math.sin(this.smoking.t / 260) * 1.5;
      } else {
        frame = this.f.frame;
        if (this.guard) shield = 0.35;
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
          // Cigarrillo en la boca (coordenadas locales de la celda).
          const mx = C.MOUTH.x - a.x, my = C.MOUTH.y - a.y;
          ctx.fillStyle = '#1b1414'; ctx.fillRect(mx - 1, my - 1, 12, 4);
          ctx.fillStyle = '#f2efe6'; ctx.fillRect(mx, my, 9, 2);
          ctx.fillStyle = '#c98a4a'; ctx.fillRect(mx, my, 3, 2);
          ctx.fillStyle = Math.sin(this.t / 90) > 0 ? '#ff5a1e' : '#ffb347'; ctx.fillRect(mx + 9, my, 2, 2);
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
      return p;
    }

    /** Punto de la brasa del cigarrillo en coordenadas del mundo. */
    cigTip() { return this.f.worldPoint({ x: C.MOUTH.x + 11, y: C.MOUTH.y }); }
  }

  root.TrolinaCombat = C;
  root.Combatant = Combatant;
  root.drawDartShape = drawDartShape;
})(window);
