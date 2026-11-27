/* Interior del bar (v0.16): panorámica ancha que la cámara recorre siguiendo a los luchadores.
 *
 * Datos en assets/stages/interior/interior-data.js (tools/integrate_interior.py). Las imágenes ya
 * vienen a 2 px por unidad (1620×540), así que se pintan sin escalar:
 *   bg       fondo con el futbolín y los taburetes ya puestos
 *   counters los dos mostradores (tapan a quien está detrás de la barra)
 *   props    futbolín y taburetes (van encima de los mostradores)
 *   glow     solo con las luces apagadas: los reflejos de la bola de discoteca, sacados del fondo.
 *            Se suman («lighter») y giran: por paredes y techo hacia un lado y por el suelo hacia el
 *            otro, con destellos que saltan en los reflejos y en la propia bola.
 * Coordenadas del mundo como en la terraza (canvas 960×540, suelo y=486): la panorámica empieza en
 * x = worldX y Match.camera va en unidades (pantalla = mundo − cámara×2).
 * Misma interfaz que TerraceStage.draw, más drawBehind: lo que va detrás de los mostradores
 * (quien cae al fregadero con la ultimate de El Peñista), recortado por debajo de la barra.
 */
(function (root) {
  class InteriorScene {
    constructor(images, data, lighting) {
      this.images = images || {};
      this.data = data;
      this.lighting = data.lightings[lighting] ? lighting : Object.keys(data.lightings)[0];
      this.L = data.lightings[this.lighting];
      // Pie de los mostradores: por debajo no se ve a quien está detrás.
      this.clipY = Math.min(...data.counters.map((c) => c.bottom));
      this.topY = Math.min(...data.counters.map((c) => c.top));
      this.disco = this.L.disco && this.images.glow ? this.L.disco : null;
      this.glints = []; this.lastT = null; this.reduce = false;
    }

    /** Desplazamiento de la cámara en px (redondeado: suelo y luchadores se mueven juntos, sin temblar). */
    offset(cameraX) {
      const c = this.data.camera;
      return Math.round(Math.max(c.min, Math.min(c.max, cameraX || 0)) * this.data.scale);
    }

    draw(ctx, { cameraX = 0, drawBehind = null, drawActors = () => {}, t = 0 } = {}) {
      const d = this.data, I = this.images, off = this.offset(cameraX), x0 = d.worldX - off;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (I.bg) ctx.drawImage(I.bg, x0, 0);
      else {
        // Si no cargó la imagen (raro): una sala oscura con suelo, para poder seguir peleando.
        ctx.fillStyle = '#1a1210'; ctx.fillRect(0, 0, 960, 540);
        ctx.fillStyle = '#3a2418'; ctx.fillRect(0, 440, 960, 100);
      }
      if (drawBehind) {
        ctx.save();
        ctx.translate(-off, 0);
        // Se ve por encima de las encimeras y, por debajo, solo donde lo tapan los mostradores
        // (nunca por el hueco del paso de personal ni por el suelo de delante).
        ctx.beginPath();
        ctx.rect(off - 100, -100, 1160, this.topY + 100);
        for (const c of d.counters) ctx.rect(c.x0, this.topY, c.x1 - c.x0, c.bottom - this.topY);
        ctx.clip();
        drawBehind(ctx);
        ctx.restore();
        if (I.counters) ctx.drawImage(I.counters, x0 + this.L.counters.x, this.L.counters.y);
        if (I.props) ctx.drawImage(I.props, x0 + this.L.props.x, this.L.props.y);
      }
      if (this.disco) this.drawDisco(ctx, x0, t);
      ctx.save();
      ctx.translate(-off, 0);
      drawActors(ctx, { scale: d.scale, groundY: 486 });
      ctx.restore();
      ctx.restore();
    }

    /** Desplazamiento de los reflejos a los t ms: paredes y techo hacia la derecha, suelo hacia la
     * izquierda y más rápido (está más cerca), como una bola que gira sobre sí misma. */
    discoShift(t, floor) {
      const W = this.data.width, v = (floor ? -0.05 : 0.032) * (this.reduce ? 0.5 : 1);
      return ((t * v) % W + W) % W;
    }

    drawDisco(ctx, x0, t) {
      const D = this.disco, img = this.images.glow, W = this.data.width;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.88 + 0.12 * Math.sin(t / 650);
      for (const floor of [false, true]) {
        const s = this.discoShift(t, floor);
        ctx.save();
        ctx.beginPath();
        if (floor) ctx.rect(x0, D.floorY, W, 540 - D.floorY); else ctx.rect(x0, -10, W, D.floorY + 10);
        ctx.clip();
        ctx.drawImage(img, x0 + D.x + s - W, D.y);
        ctx.drawImage(img, x0 + D.x + s, D.y);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      this.drawBall(ctx, x0, t);
      this.updateGlints(t);
      for (const g of this.glints) {
        const k = g.age / g.life, a = Math.sin(Math.PI * k);
        const x = x0 + (g.ball ? g.x : (g.x + this.discoShift(t, g.floor)) % W), r = g.r * (0.6 + 0.4 * a);
        star(ctx, Math.round(x), g.y, r, a, g.color);
      }
      ctx.restore();
    }

    /** La bola: reflejos de las facetas pasando de lado (gira) y algún destello. */
    drawBall(ctx, x0, t) {
      const B = this.disco.ball, cx = x0 + B.x, cy = B.y;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, B.r - 1, 0, Math.PI * 2); ctx.clip();
      const sp = this.reduce ? 0.02 : 0.04;
      for (let i = 0; i < 4; i++) {
        const u = ((t * sp / B.r + i / 4) % 1);            // 0 → 1 de izquierda a derecha
        const x = cx - B.r + u * 2 * B.r, w = 3 + 5 * Math.sin(Math.PI * u);
        ctx.globalAlpha = 0.22 * Math.sin(Math.PI * u);
        ctx.fillStyle = i % 2 ? '#bfe8ff' : '#ffffff';
        ctx.fillRect(Math.round(x - w / 2), cy - B.r, Math.round(w), B.r * 2);
      }
      ctx.restore();
    }

    updateGlints(t) {
      const dt = this.lastT === null ? 0 : Math.max(0, Math.min(100, t - this.lastT));
      this.lastT = t;
      for (const g of this.glints) g.age += dt;
      this.glints = this.glints.filter((g) => g.age < g.life);
      if (!dt) return;
      const rnd = root.__trolinaRealRandom || Math.random, D = this.disco, B = D.ball;
      const colors = ['#ffffff', '#cfeeff', '#9fd8ff', '#b8ffd0'];
      // Unos 12 destellos por segundo en los reflejos y 4 en la bola (la mitad con «reducir mareo»).
      const rate = this.reduce ? 0.5 : 1;
      if (D.spots.length && rnd() < dt * 0.012 * rate && this.glints.length < 24) {
        const sp = D.spots[Math.floor(rnd() * D.spots.length)], floor = sp[1] >= D.floorY;
        // Guardado sin el desplazamiento de ahora: así el destello viaja con su reflejo.
        this.glints.push({ x: sp[0], y: sp[1], floor, age: 0, life: 260 + rnd() * 260, r: 4 + rnd() * 4, color: colors[Math.floor(rnd() * colors.length)] });
      }
      if (rnd() < dt * 0.004 * rate) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (B.r - 4);
        this.glints.push({ ball: true, x: B.x + Math.cos(a) * d, y: Math.round(B.y + Math.sin(a) * d), floor: null, age: 0, life: 220 + rnd() * 200, r: 6 + rnd() * 5, color: '#ffffff' });
      }
    }

    /** Sitio detrás de la barra principal más cercano a x, dentro de lo que se ve (para el fregadero). */
    behindBar(x, viewLeft) {
      const b = this.data.counters[0];
      // Lejos de los extremos: girando en el aire o de pie, tiene que quedar entero tras la barra.
      const lo = Math.max(b.x0 + 150, viewLeft + 140), hi = Math.min(b.x1 - 150, viewLeft + 820);
      return { x: Math.max(lo, Math.min(hi, x)), top: b.top, bottom: b.bottom };
    }
  }

  /** Destello de cuatro puntas (cruz con centro brillante). */
  function star(ctx, x, y, r, a, color) {
    if (a <= 0.02) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    const L = Math.max(2, Math.round(r));
    ctx.fillRect(x - L, y, L * 2 + 1, 1);
    ctx.fillRect(x, y - L, 1, L * 2 + 1);
    ctx.globalAlpha = a * 0.6;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.globalAlpha = a * 0.35;
    const l = Math.max(1, Math.round(L * 0.45));
    ctx.fillRect(x - l, y - l, 1, 1); ctx.fillRect(x + l, y - l, 1, 1);
    ctx.fillRect(x - l, y + l, 1, 1); ctx.fillRect(x + l, y + l, 1, 1);
  }

  /** Chapuzón en el fregadero: la salpicadura de la fuente, asomando por encima de la barra. */
  class BarSplash {
    constructor(art) { this.art = art || {}; this.fx = []; this.drops = []; }

    splash(x, y, power) {
      const D = root.TROLINA_FOUNTAIN_DATA, rnd = root.__trolinaRealRandom || Math.random;
      if (D && this.art.impact) this.fx.push({ def: D.fx['impacto-agua'], x, y: y + 6, t: 0, scale: 1.3 * (power || 1) });
      const n = Math.round(16 * (power || 1));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (rnd() - 0.5) * 1.9, v = 260 + rnd() * 380 * (power || 1);
        this.drops.push({ x: x + (rnd() - 0.5) * 70, y, floor: y + 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 1100, r: 2 + rnd() * 3 });
      }
    }

    update(dt) {
      const s = dt / 1000;
      for (const d of this.drops) { d.vy += 1400 * s; d.x += d.vx * s; d.y += d.vy * s; d.t += dt; }
      // Las gotas que vuelven a caer detrás de la barra desaparecen tras ella.
      this.drops = this.drops.filter((d) => d.t < d.life && !(d.vy > 0 && d.y > d.floor));
      for (const f of this.fx) f.t += dt;
      this.fx = this.fx.filter((f) => f.def && f.t < f.def.frames.length * f.def.ms);
    }

    draw(ctx) {
      const drawFx = root.trolinaDrawWaterFx;
      for (const f of this.fx) if (drawFx) drawFx(ctx, this.art.impact, f.def, Math.floor(f.t / f.def.ms), f.x, f.y, f.scale);
      if (!this.drops.length) return;
      ctx.save();
      ctx.fillStyle = '#bff4ff';
      for (const d of this.drops) {
        ctx.globalAlpha = Math.max(0, 1 - d.t / d.life);
        ctx.fillRect(Math.round(d.x), Math.round(d.y), d.r, d.r);
      }
      ctx.restore();
    }
  }

  root.InteriorScene = InteriorScene;
  root.BarSplash = BarSplash;
  if (typeof module !== 'undefined') module.exports = { InteriorScene, BarSplash };
})(typeof window !== 'undefined' ? window : globalThis);
