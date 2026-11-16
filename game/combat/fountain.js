/* Fuente de la terraza (lado izquierdo) y efectos de agua.
 *
 * Arte del paquete «clima, fuente y jardinera» (datos en assets/fountain/fountain-data.js):
 *   back.png  pila trasera y agua (detrás de quien cae dentro)
 *   front.png borde delantero (tapa las piernas de quien está dentro)
 *   jets.png  atlas de chorros: arranque (6), bucle (6), apagado (6); tres surtidores desfasados
 *   assets/fx/water-impact|wet|drip.png: salpicadura, golpe de agua y goteo
 * Estados: encendida/apagada y con/sin luz (la luz solo se nota de noche).
 *
 * Coordenadas: el ancla de la celda (128,176) se coloca en (x, groundY) del mundo 960×540,
 * un poco por detrás de la línea de apoyo de los luchadores (486) para que pasen por delante.
 */
(function (root) {
  const D = () => root.TROLINA_FOUNTAIN_DATA;

  /** Copia de una imagen con un tinte encima (sin leer píxeles: válido en file://). */
  function tinted(img, fill, glow) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    if (fill) { x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height); }
    if (glow) {
      const g = x.createRadialGradient(glow.x, glow.y, 4, glow.x, glow.y, glow.r);
      g.addColorStop(0, glow.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    }
    return c;
  }

  /** Dibuja un fotograma de un efecto de agua (impacto, mojado, goteo). */
  function drawFx(ctx, img, def, frame, x, y, scale, alpha, flip) {
    if (!img || !def) return;
    const [sx, sy] = def.frames[Math.min(def.frames.length - 1, frame)];
    const [w, h] = def.cell, [ax, ay] = def.anchor;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, w, h, Math.round(-ax * scale), Math.round(-ay * scale), Math.round(w * scale), Math.round(h * scale));
    ctx.restore();
  }

  class Fountain {
    constructor({ on = true, lit = true, night = true, x = 172, groundY = 474, scale = 1.4, art = null } = {}) {
      Object.assign(this, { on, lit, night, x, groundY, scale });
      this.t = 0;
      this.drops = [];
      this.fx = [];
      this.art = art || {};
      this.data = D();
      this.jetT = 0;                       // tiempo desde que arrancaron los chorros
      this.mode = !night ? 'day' : lit ? 'lit' : 'dark';
      this.prepare();
    }

    prepare() {
      const a = this.art, d = this.data;
      if (!a.back || !d) return;
      const [ax, ay] = d.anchor;
      const waterGlow = { x: ax, y: ay - 38, r: 120, color: 'rgba(120,225,255,0.55)' };
      if (this.mode === 'dark') {
        this.img = { back: tinted(a.back, 'rgba(6,12,30,0.45)'), front: tinted(a.front, 'rgba(6,12,30,0.45)'), jets: tinted(a.jets, 'rgba(20,34,60,0.35)') };
      } else if (this.mode === 'lit') {
        this.img = { back: tinted(a.back, null, waterGlow), front: tinted(a.front, null, { ...waterGlow, y: ay - 30, color: 'rgba(120,225,255,0.3)' }), jets: tinted(a.jets, 'rgba(150,235,255,0.12)') };
      } else this.img = { back: a.back, front: a.front, jets: a.jets };
    }

    /** cel → mundo */
    wx(cx) { return this.x + (cx - this.data.anchor[0]) * this.scale; }
    wy(cy) { return this.groundY + (cy - this.data.anchor[1]) * this.scale; }

    /** Superficie del agua (centro de la pila) y bordes, en coordenadas del mundo. */
    get waterY() { return this.data ? this.wy(138) : this.groundY - 50; }
    get left() { return this.data ? this.wx(38) : this.x - 150; }
    get right() { return this.data ? this.wx(219) : this.x + 150; }

    update(dt) {
      this.t += dt;
      if (this.on) this.jetT += dt;
      const s = dt / 1000;
      for (const d of this.drops) { d.vy += 1400 * s; d.x += d.vx * s; d.y += d.vy * s; d.t += dt; }
      this.drops = this.drops.filter((d) => d.t < d.life && d.y < this.groundY + 20);
      for (const f of this.fx) f.t += dt;
      this.fx = this.fx.filter((f) => f.t < f.def.frames.length * f.def.ms);
    }

    /** Chapuzón: salpicadura grande en el punto de caída (con chorros o sin ellos). */
    splash(x, power) {
      const d = this.data;
      if (d && this.art.impact) this.fx.push({ img: this.art.impact, def: d.fx['impacto-agua'], x, y: this.waterY + 8, t: 0, scale: 1.5 * Math.min(1.2, power || 1) });
      const n = Math.round(18 * (power || 1));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const v = 240 + Math.random() * 420 * (power || 1);
        this.drops.push({ x: x + (Math.random() - 0.5) * 60, y: this.waterY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 1200, r: 2 + Math.random() * 3 });
      }
    }

    drawGlow(ctx) {
      if (this.mode !== 'lit') return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const y = this.waterY;
      const k = 0.85 + 0.15 * Math.sin(this.t / 500);
      const g = ctx.createRadialGradient(this.x, y - 40, 10, this.x, y - 40, 240);
      g.addColorStop(0, 'rgba(70,190,255,' + (0.26 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(70,190,255,0)');
      ctx.fillStyle = g; ctx.fillRect(this.x - 250, y - 290, 500, 380);
      ctx.restore();
    }

    blit(ctx, img) {
      const d = this.data, [cw, ch] = d.cell, [ax, ay] = d.anchor, s = this.scale;
      ctx.drawImage(img, Math.round(this.x - ax * s), Math.round(this.groundY - ay * s), Math.round(cw * s), Math.round(ch * s));
    }

    /** Fotograma de un surtidor: arranque al empezar y bucle después, desfasado por boquilla. */
    jetFrame(i) {
      const J = this.data.jets.anims, start = J.arranque;
      const startMs = start.frames.length * start.ms;
      const t = this.jetT - i * 70;
      if (t < 0) return null;
      if (t < startMs) return start.frames[Math.floor(t / start.ms)];
      const loop = J.chorro;
      return loop.frames[(Math.floor((t - startMs) / loop.ms) + i * 2) % loop.frames.length];
    }

    drawJets(ctx) {
      if (!this.on) return;
      const j = this.data.jets, [cw, ch] = j.cell, [ax, ay] = j.anchor;
      this.data.nozzles.forEach((n, i) => {
        const fr = this.jetFrame(i);
        if (!fr) return;
        const s = this.scale * n.scale;
        ctx.drawImage(this.img.jets, fr[0], fr[1], cw, ch, Math.round(this.wx(n.x) - ax * s), Math.round(this.wy(n.y) - ay * s), Math.round(cw * s), Math.round(ch * s));
      });
    }

    /** Pila, agua y chorros. withFront: incluir el borde delantero (nadie dentro). */
    drawBack(ctx, withFront) {
      if (!this.img) return;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      this.drawGlow(ctx);
      this.blit(ctx, this.img.back);
      this.drawJets(ctx);
      if (withFront) this.blit(ctx, this.img.front);
      ctx.restore();
    }

    /** Borde delantero encima de quien ha caído dentro, y la salpicadura. */
    drawFront(ctx) {
      if (this.img) { ctx.save(); ctx.imageSmoothingEnabled = false; this.blit(ctx, this.img.front); ctx.restore(); }
      this.drawDrops(ctx);
    }

    drawDrops(ctx) {
      for (const f of this.fx) drawFx(ctx, f.img, f.def, Math.floor(f.t / f.def.ms), f.x, f.y, f.scale, this.mode === 'dark' ? 0.75 : 1);
      if (!this.drops.length) return;
      ctx.save();
      ctx.fillStyle = this.mode === 'dark' ? '#a9c7d6' : '#bff4ff';
      for (const d of this.drops) {
        ctx.globalAlpha = Math.max(0, 1 - d.t / d.life);
        ctx.fillRect(Math.round(d.x), Math.round(d.y), d.r, d.r);
      }
      ctx.restore();
    }
  }

  root.Fountain = Fountain;
  root.trolinaDrawWaterFx = drawFx;
})(window);
