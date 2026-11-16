/* Lluvia y nieve animadas encima de la escena (los fondos ya traen el clima pintado;
 * esto añade movimiento). Coordenadas de pantalla 960×540. Sin imágenes.
 */
(function (root) {
  // Solo es decorado: usa siempre el azar real, también en el multijugador (que fija el del combate).
  const rnd = Math.random;
  class Weather {
    constructor(kind, { reduce = false } = {}) {
      this.kind = kind;
      this.t = 0;
      const n = kind === 'rain' ? (reduce ? 60 : 130) : (reduce ? 40 : 90);
      this.p = Array.from({ length: n }, () => this.spawn(true));
      this.splashes = [];
    }

    spawn(anywhere) {
      const y = anywhere ? rnd() * 540 : -20 - rnd() * 60;
      if (this.kind === 'rain') return { x: rnd() * 1060 - 50, y, v: 900 + rnd() * 400, len: 10 + rnd() * 12, a: 0.18 + rnd() * 0.25, gy: 430 + rnd() * 110 };
      return { x: rnd() * 1000 - 20, y, v: 35 + rnd() * 55, r: rnd() < 0.25 ? 3 : 2, ph: rnd() * 6.28, a: 0.55 + rnd() * 0.4, gy: 420 + rnd() * 120 };
    }

    update(dt) {
      this.t += dt;
      const s = dt / 1000;
      for (let i = 0; i < this.p.length; i++) {
        const q = this.p[i];
        if (this.kind === 'rain') {
          q.y += q.v * s; q.x -= q.v * 0.12 * s;
          if (q.y > q.gy) {
            if (rnd() < 0.35) this.splashes.push({ x: q.x, y: q.gy, t: 0 });
            this.p[i] = this.spawn(false);
          }
        } else {
          q.y += q.v * s; q.x += Math.sin(this.t / 900 + q.ph) * 18 * s;
          if (q.y > q.gy) this.p[i] = this.spawn(false);
        }
      }
      for (const sp of this.splashes) sp.t += dt;
      this.splashes = this.splashes.filter((sp) => sp.t < 220);
    }

    draw(ctx) {
      ctx.save();
      if (this.kind === 'rain') {
        ctx.strokeStyle = '#bcd6ff'; ctx.lineWidth = 2;
        for (const q of this.p) {
          ctx.globalAlpha = q.a;
          ctx.beginPath(); ctx.moveTo(Math.round(q.x), Math.round(q.y)); ctx.lineTo(Math.round(q.x + q.len * 0.12), Math.round(q.y - q.len)); ctx.stroke();
        }
        ctx.fillStyle = '#d8e8ff';
        for (const sp of this.splashes) {
          const k = sp.t / 220;
          ctx.globalAlpha = 0.5 * (1 - k);
          ctx.fillRect(Math.round(sp.x - 4 - k * 6), Math.round(sp.y - k * 4), 2, 2);
          ctx.fillRect(Math.round(sp.x + 2 + k * 6), Math.round(sp.y - k * 4), 2, 2);
        }
      } else {
        ctx.fillStyle = '#f4f8ff';
        for (const q of this.p) {
          ctx.globalAlpha = q.a;
          ctx.fillRect(Math.round(q.x), Math.round(q.y), q.r, q.r);
        }
      }
      ctx.restore();
    }
  }
  root.TrolinaWeather = Weather;
})(window);
