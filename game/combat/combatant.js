/* Luchador jugable: física, estados y dibujo sobre el reproductor Fighter existente.
 * Fighter (src/fighter.js) sigue gestionando animaciones de ataque, cajas y eventos;
 * aquí se añaden caminar, salto, guardia, aturdimiento, KO, victoria y el puntillo.
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
    FRICTION: 2200
  };

  const tintCanvas = document.createElement('canvas');
  tintCanvas.width = 192; tintCanvas.height = 176;
  const tintCtx = tintCanvas.getContext('2d');

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
      this.whiff = false; this.lastHitAction = -1;
      this.combo = 0; this.noAmmoCooldown = 0;
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
    get busy() { return this.hitstun > 0 || this.blockstun > 0 || this.stumble > 0; }

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

      if (this.state !== 'fight') {
        this.walking = false; this.guard = false;
        this.physics(s, false); this.sync(); this.f.update(dt); this.sync();
        return;
      }

      const intox = match.intoxOf(this);
      const imp = TrolinaRules.impairment(intox, this.loadout.aim);

      // Retraso de controles por el puntillo: las acciones se ejecutan más tarde.
      // Pequeño búfer: una acción pulsada durante otro movimiento se ejecuta al acabar (≤260 ms).
      for (const a of ctl.actions || []) this.pending.push({ a, at: this.t + imp.inputDelayMs });
      this.pending = this.pending.filter((p) => p.at > this.t || this.t - p.at < 260);
      const readyItems = this.pending.filter((p) => p.at <= this.t);
      const ready = readyItems.map((p) => p.a);
      const consume = (a) => { const i = this.pending.indexOf(readyItems[ready.indexOf(a)]); if (i >= 0) this.pending.splice(i, 1); };

      // Tropiezos aleatorios cuando hay puntillo.
      if (!this.air && !this.busy && !this.attacking && intox > 0.05 && Math.random() < imp.stumblePerSec * s) {
        this.stumble = 420 + Math.random() * 250;
        this.stumbleDir = Math.random() < 0.5 ? -1 : 1;
        match.popup(this, '¡HIC!', '#f8ce73');
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
            this.vx = dir * (dir === this.facing ? C.WALK_F : C.WALK_B) * this.loadout.speed;
            if (intox > 0.1) this.vx += Math.sin(this.t / 170 + this.seed) * 80 * intox;
            this.walking = true;
          } else this.vx = 0;
          for (const a of ready) {
            consume(a);
            if (a === 'jump') {
              this.air = true;
              this.vy = C.JUMP_V * (0.92 + 0.08 * this.loadout.speed);
              this.vx = dir * 250 * this.loadout.speed;
              this.walking = false;
              break;
            }
            if (a === 'punch' || a === 'kick') { this.startAttack(a, imp, match); break; }
            if (a === 'bottle') { this.tryThrow(match); break; }
          }
        }
      } else if (!this.busy && !this.attacking) {
        for (const a of ready) if (a === 'punch' || a === 'kick') { consume(a); this.startAttack(a, imp, match); break; }
      }

      this.physics(s, this.walking || this.stumble > 0, match);
      this.sync();
      this.f.update(this.walking && !this.attacking ? dt * 1.8 : dt);
      this.sync();
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

    startAttack(kind, imp, match) {
      if (this.f.play(kind)) {
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
      if (match.bottles.throw(this.f)) { this.ammo--; match.sfx('throw'); return true; }
      return false;
    }

    /** Devuelve 'block', 'hit' o 'ko'. */
    takeHit(kind, damage, fromX) {
      const mv = TrolinaRules.MOVES[kind];
      const away = Math.sign(this.cx - fromX) || -this.facing;
      if (this.guard && !this.air && this.state === 'fight') {
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
      this.flash = 140; this.flashColor = '#ffffff';
      this.f.play('idle', true); // interrumpe el ataque (y un lanzamiento aún no soltado)
      this.pending = [];
      this.stumble = 0;
      this.hitstun = mv.hitstun;
      this.vx = away * mv.knockback;
      if (this.air) this.vy = Math.min(this.vy, -380);
      if (this.hp <= 0) return this.knockOut(away);
      return 'hit';
    }

    knockOut(away) {
      this.hp = 0;
      this.state = 'ko'; this.koT = 0;
      this.f.play('idle', true);
      this.f.enabled = false;
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

    setWin() { this.state = 'win'; this.winT = 0; this.f.play('idle', true); this.hitstun = 0; this.blockstun = 0; this.stumble = 0; }

    /** Fotograma y transformaciones de la pose actual. */
    pose() {
      const anims = this.f.data.animations;
      let frame, rot = 0, dy = 0, shield = 0, item = null;
      let pivot = null;
      if (this.state === 'ko') {
        // Cae de espaldas girando alrededor de la cadera (coordenadas locales desde el ancla).
        frame = anims.idle.frames[0];
        const k = Math.min(1, this.koT / 520);
        rot = -k * Math.PI / 2;
        pivot = { x: 20, y: -70, drop: 45 * k };
      } else if (this.state === 'win') {
        frame = anims.throwBottle.frames[2];
        dy = -Math.abs(Math.sin(this.winT / 240)) * 10;
        item = frame.itemSocket;
      } else if (this.attacking) {
        frame = this.f.frame;
      } else if (this.air) {
        frame = anims.kick.frames[1];
      } else if (this.hitstun > 0) {
        frame = anims.idle.frames[0];
        rot = -0.16 * Math.min(1, this.hitstun / 200);
      } else if (this.blockstun > 0) {
        frame = anims.idle.frames[2]; shield = 1;
      } else {
        frame = this.f.frame;
        if (this.guard) shield = 0.35;
        if (this.walking) dy = -Math.abs(Math.sin(this.t / 110)) * 4;
      }
      if (this.stumble > 0) rot = Math.sin(this.t / 55) * 0.09;
      return { frame, rot, dy, shield, item, pivot };
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
  }

  root.TrolinaCombat = C;
  root.Combatant = Combatant;
})(window);
