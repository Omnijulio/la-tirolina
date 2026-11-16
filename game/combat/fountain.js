/* Fuente de la terraza (lado izquierdo del escenario).
 *
 * Estados: encendida (chorros) / apagada, y con luz / sin luz.
 * Mientras no haya arte definitivo se dibuja una fuente PROVISIONAL en pixel art
 * generada por código a resolución nativa (×2 en el canvas, sin suavizado).
 * Cuando lleguen los PNG, basta con rellenar TROLINA_FOUNTAIN_ART (ver FUENTE.md):
 * si las imágenes están cargadas se usan en lugar del dibujo provisional.
 *
 * Capas: drawBack() se pinta detrás de los luchadores (pila, agua, columna, chorros);
 * drawFront() es el murete delantero, que se pinta encima de quien haya caído dentro.
 */
(function (root) {
  const W = 128, H = 100;          // lienzo nativo de la fuente
  const BX = 64, BY = 96;          // ancla nativa: centro de la base, a ras de suelo
  const RIM_Y = 74, RIM_RX = 58, RIM_RY = 8, WALL = 20;
  const WATER_RX = 51, WATER_RY = 5;

  function ellipseRows(ctx, cx, cy, rx, ry, color, from, to) {
    ctx.fillStyle = color;
    for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
      const t = (y - cy) / ry;
      if (from !== undefined && t < from) continue;
      if (to !== undefined && t > to) continue;
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      ctx.fillRect(cx - hw, y, hw * 2, 1);
    }
  }

  class Fountain {
    constructor({ on = true, lit = true, x = 150, groundY = 472, scale = 2.5, art = null } = {}) {
      Object.assign(this, { on, lit, x, groundY, scale });
      this.t = 0;
      this.drops = [];
      this.art = art;
      this.back = document.createElement('canvas'); this.back.width = W; this.back.height = H;
      this.front = document.createElement('canvas'); this.front.width = W; this.front.height = H;
      this.bctx = this.back.getContext('2d'); this.fctx = this.front.getContext('2d');
    }

    /** Superficie del agua en coordenadas del mundo (canvas 960×540). */
    get waterY() { return this.groundY - (BY - RIM_Y - 2) * this.scale; }
    get left() { return this.x - RIM_RX * this.scale; }
    get right() { return this.x + RIM_RX * this.scale; }

    update(dt) {
      this.t += dt;
      const s = dt / 1000;
      for (const d of this.drops) { d.vy += 1400 * s; d.x += d.vx * s; d.y += d.vy * s; d.t += dt; }
      this.drops = this.drops.filter((d) => d.t < d.life && d.y < this.groundY + 10);
    }

    /** Chapuzón: lluvia de gotas en el punto de caída. */
    splash(x, power) {
      const n = Math.round(46 * (power || 1));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const v = 260 + Math.random() * 520 * (power || 1);
        this.drops.push({ x: x + (Math.random() - 0.5) * 50, y: this.waterY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 1400, r: 2 + Math.random() * 3 });
      }
      this.ripple = { t: 0, x };
    }

    palette() {
      const lit = this.lit;
      return {
        stone: lit ? '#a59a87' : '#7a7266', stoneLo: lit ? '#7f7565' : '#58524a', stoneDk: '#38342f', stoneHi: lit ? '#d2c6ad' : '#9a9183',
        water: lit ? '#2b98c2' : '#173845', waterLo: lit ? '#1b6f99' : '#10262f', ripple: lit ? '#9ff0ff' : '#355f6e',
        jet: lit ? '#d4fbff' : '#a9c0cc', jetLo: lit ? '#7fe0ff' : '#6f8796'
      };
    }

    paint() {
      const p = this.palette(), b = this.bctx, f = this.fctx, t = this.t / 1000;
      b.clearRect(0, 0, W, H); f.clearRect(0, 0, W, H);
      // Borde trasero del pilón (mitad superior del anillo).
      ellipseRows(b, BX, RIM_Y, RIM_RX, RIM_RY, p.stoneDk, -1, 0.1);
      ellipseRows(b, BX, RIM_Y, RIM_RX - 2, RIM_RY - 1, p.stoneHi, -1, -0.55);
      // Agua.
      ellipseRows(b, BX, RIM_Y + 1, WATER_RX, WATER_RY, p.water);
      ellipseRows(b, BX, RIM_Y + 2, WATER_RX - 6, WATER_RY - 2, p.waterLo, 0.1, 1);
      b.fillStyle = p.ripple;
      const n = this.on ? 7 : 3;
      for (let i = 0; i < n; i++) {
        const ph = (t * (this.on ? 0.9 : 0.25) + i / n) % 1;
        const rx = 6 + ph * (WATER_RX - 10), y = RIM_Y + 1 + Math.round(Math.sin(i * 1.7) * 2);
        b.globalAlpha = 1 - ph;
        b.fillRect(BX - rx, y, 3, 1); b.fillRect(BX + rx - 3, y, 3, 1);
      }
      if (this.ripple) {
        this.ripple.t += 16;
        const k = Math.min(1, this.ripple.t / 900);
        b.globalAlpha = 1 - k; b.fillStyle = '#ffffff';
        const rx = 6 + k * 40, cx = Math.round((this.ripple.x - this.x) / this.scale) + BX;
        b.fillRect(cx - rx, RIM_Y + 1, 4, 1); b.fillRect(cx + rx - 4, RIM_Y + 1, 4, 1);
        b.fillRect(cx - rx * 0.6, RIM_Y + 3, 3, 1); b.fillRect(cx + rx * 0.6 - 3, RIM_Y + 3, 3, 1);
        if (k >= 1) this.ripple = null;
      }
      b.globalAlpha = 1;
      // Columna, taza superior y remate.
      b.fillStyle = p.stoneLo; b.fillRect(BX - 5, 44, 10, RIM_Y - 44);
      b.fillStyle = p.stone; b.fillRect(BX - 5, 44, 4, RIM_Y - 44);
      b.fillStyle = p.stoneDk; b.fillRect(BX + 3, 44, 2, RIM_Y - 44);
      b.fillStyle = p.stone; b.fillRect(BX - 8, RIM_Y - 4, 16, 3);
      ellipseRows(b, BX, 44, 18, 4, p.stoneDk);
      ellipseRows(b, BX, 43, 17, 3, p.stoneHi, -1, 0);
      ellipseRows(b, BX, 44, 14, 2, p.water);
      b.fillStyle = p.stoneLo; b.fillRect(BX - 6, 46, 12, 3);
      b.fillStyle = p.stone; b.fillRect(BX - 2, 34, 4, 8); b.fillRect(BX - 3, 32, 6, 2);
      b.fillStyle = p.stoneHi; b.fillRect(BX - 1, 30, 2, 2);
      // Chorros.
      if (this.on) {
        const drop = (x, y, c) => { b.fillStyle = c; b.fillRect(Math.round(x), Math.round(y), 2, 2); };
        for (let i = 0; i < 14; i++) {         // surtidor central
          const s = (i / 14 + t * 1.6) % 1;
          const y = 30 - Math.sin(s * Math.PI) * 26;
          drop(BX - 1 + Math.sin(i * 2.3) * (s * 2), y, i % 3 ? p.jet : p.jetLo);
        }
        for (const side of [-1, 1]) {           // cortinas de la taza al pilón
          for (let i = 0; i < 16; i++) {
            const s = (i / 16 + t * 1.2 + (side > 0 ? 0.5 : 0)) % 1;
            const x = BX + side * (15 + s * 20), y = 44 + s * s * (RIM_Y - 44);
            drop(x, y, i % 2 ? p.jet : p.jetLo);
          }
          for (let i = 0; i < 3; i++) {         // salpicón al caer
            const ph = (t * 3 + i * 0.33) % 1;
            b.globalAlpha = 1 - ph; drop(BX + side * (35 + (i - 1) * 3), RIM_Y - ph * 5, p.jet); b.globalAlpha = 1;
          }
        }
      } else {
        // Apagada: un hilillo que gotea de la taza.
        const ph = (t * 0.8) % 1;
        b.fillStyle = p.jetLo; b.fillRect(BX + 15, 46 + ph * (RIM_Y - 48), 1, 2);
      }
      // Murete delantero (capa frontal): mitad inferior del anillo y pared.
      f.fillStyle = p.stoneLo; f.fillRect(BX - RIM_RX, RIM_Y, RIM_RX * 2, WALL);
      ellipseRows(f, BX, RIM_Y + WALL, RIM_RX, RIM_RY, p.stoneLo, 0, 1);
      ellipseRows(f, BX, RIM_Y, RIM_RX, RIM_RY, p.stone, 0, 1);
      ellipseRows(f, BX, RIM_Y, RIM_RX - 3, RIM_RY - 3, p.water, 0, 0.8);
      ellipseRows(f, BX, RIM_Y, RIM_RX - 3, RIM_RY - 3, p.waterLo, 0.5, 1);
      f.fillStyle = p.stoneHi; f.fillRect(BX - RIM_RX, RIM_Y, 3, WALL); f.fillRect(BX - RIM_RX + 10, RIM_Y + 2, RIM_RX * 2 - 20, 1);
      f.fillStyle = p.stoneDk;
      for (let x = BX - RIM_RX + 14; x < BX + RIM_RX - 8; x += 18) f.fillRect(x, RIM_Y + 4, 1, WALL - 2);
      f.fillRect(BX + RIM_RX - 3, RIM_Y, 3, WALL);
      // Brillo de los focos sobre el agua.
      if (this.lit) {
        f.globalAlpha = 0.5 + 0.2 * Math.sin(t * 3);
        f.fillStyle = '#c8fbff';
        for (let i = -2; i <= 2; i++) f.fillRect(BX + i * 18 - 2, RIM_Y + WALL - 3, 4, 2);
        f.globalAlpha = 1;
      }
    }

    blit(ctx, canvas) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const s = this.scale;
      ctx.drawImage(canvas, Math.round(this.x - BX * s), Math.round(this.groundY - BY * s), W * s, H * s);
      ctx.restore();
    }

    drawGlow(ctx) {
      if (!this.lit) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const y = this.waterY;
      const g = ctx.createRadialGradient(this.x, y - 30, 10, this.x, y - 30, 210);
      g.addColorStop(0, 'rgba(70,190,255,0.3)'); g.addColorStop(1, 'rgba(70,190,255,0)');
      ctx.fillStyle = g; ctx.fillRect(this.x - 220, y - 250, 440, 340);
      ctx.restore();
    }

    /** Pila, agua, columna y chorros. withFront: incluir también el murete (nadie dentro). */
    drawBack(ctx, withFront) {
      this.paint();
      this.drawGlow(ctx);
      this.blit(ctx, this.back);
      if (withFront) this.blit(ctx, this.front);
    }

    drawFront(ctx) {
      this.blit(ctx, this.front);
      this.drawDrops(ctx);
    }

    drawDrops(ctx) {
      if (!this.drops.length) return;
      ctx.save();
      ctx.fillStyle = this.lit ? '#bff4ff' : '#a9c7d6';
      for (const d of this.drops) {
        ctx.globalAlpha = Math.max(0, 1 - d.t / d.life);
        ctx.fillRect(Math.round(d.x), Math.round(d.y), d.r, d.r);
      }
      ctx.restore();
    }
  }

  root.Fountain = Fountain;
})(window);
