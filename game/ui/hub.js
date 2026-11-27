/* Menú del bar: la pantalla de inicio es La Trolina vista desde la puerta.
 *
 * Dibuja en su propio canvas, a pantalla completa y a la resolución del móvil (no en el de
 * 960×540 de la pelea): el fondo según la hora, el encendido de las luces, las bombillas que
 * titilan, el foco y el halo del sitio elegido, las flechas de luz en perspectiva (cintas sobre
 * el suelo que suben la escalera) y la cámara, que se acerca suave a cada sitio.
 *
 * Los botones, letreros y textos son HTML (game/ui/screens.js, pantalla title), colocados con
 * Hub.toScreen. Datos: assets/menu/menu-data.js (generado) y game/data/hub.js (diseño).
 * Sin getImageData ni fetch: funciona abriendo index.html.
 */
(function (root) {
  const D = () => root.TROLINA_MENU_DATA;
  const HUB = () => root.TROLINA_HUB;
  const SW = 1672, SH = 941;                 // tamaño de la escena
  const TEAL = [72, 238, 226];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (dt, rate) => 1 - Math.exp(-dt * rate);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- geometría de las flechas ---------- */

  function project(X, Z, lv) {
    const F = HUB().floor;
    return [F.u0 + F.f * X / Z, F.vh + F.f * (1 - lv * F.step) / Z];
  }

  function chaikin(pts, it) {
    for (let k = 0; k < it; k++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        out.push({ X: a.X * 0.75 + b.X * 0.25, Z: a.Z * 0.75 + b.Z * 0.25, lv: a.lv });
        out.push({ X: a.X * 0.25 + b.X * 0.75, Z: a.Z * 0.25 + b.Z * 0.75, lv: a.lv });
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return pts;
  }

  /** Cinta de la flecha: puntos con las contrahuellas metidas, tramos horizontales y bordes. */
  function buildPath(def) {
    // Tramos a un mismo nivel (se suavizan); entre tramos, la subida en vertical.
    const runs = [];
    for (const [X, Z, lv] of def.nodes) {
      const last = runs[runs.length - 1];
      if (!last || last.lv !== lv) runs.push({ lv, pts: last ? [{ X: last.pts[last.pts.length - 1].X, Z: last.pts[last.pts.length - 1].Z, lv }] : [] });
      runs[runs.length - 1].pts.push({ X, Z, lv });
    }
    const pts = [];
    for (const r of runs) {
      const p = r.pts.length > 2 ? chaikin(r.pts, def.smooth || 0) : r.pts;
      if (pts.length) pts.push(p[0]);              // arriba de la contrahuella (mismo X, Z)
      for (let i = pts.length ? 1 : 0; i < p.length; i++) pts.push(p[i]);
      r.pts = p;
    }
    // Dirección horizontal y normal en cada punto.
    const dirOf = (a, b) => { const dx = b.X - a.X, dz = b.Z - a.Z, l = Math.hypot(dx, dz); return l > 1e-9 ? [dx / l, dz / l] : null; };
    const w = def.width / 2;
    const L = [], Rr = [];
    for (let i = 0; i < pts.length; i++) {
      let sx = 0, sz = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
        if (a < 0 || b >= pts.length) continue;
        const d = dirOf(pts[a], pts[b]);
        if (d) { sx += d[0]; sz += d[1]; }
      }
      const l = Math.hypot(sx, sz) || 1; const nx = -sz / l, nz = sx / l;
      const p = pts[i];
      L.push(project(p.X + nx * w, p.Z + nz * w, p.lv));
      Rr.push(project(p.X - nx * w, p.Z - nz * w, p.lv));
    }
    // Tramos horizontales con su longitud, para las flechitas.
    const flat = runs.map((r) => {
      const seg = []; let len = 0;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const d = Math.hypot(r.pts[i + 1].X - r.pts[i].X, r.pts[i + 1].Z - r.pts[i].Z);
        seg.push(d); len += d;
      }
      return { lv: r.lv, pts: r.pts, seg, len };
    });
    let total = 0; for (const f of flat) { f.from = total; total += f.len; }
    const end = pts[pts.length - 1], prev = pts[pts.length - 2];
    const dEnd = dirOf(prev, end) || [0, 1];
    const center = pts.map((p) => project(p.X, p.Z, p.lv));
    return { def, pts, L, Rr, flat, total, end, dEnd, center, hw: w };
  }

  /** Punto a una distancia s de un tramo horizontal, y su dirección. */
  function along(run, s) {
    let i = 0;
    while (i < run.seg.length - 1 && s > run.seg[i]) { s -= run.seg[i]; i++; }
    const a = run.pts[i], b = run.pts[i + 1], k = run.seg[i] ? clamp(s / run.seg[i], 0, 1) : 0;
    const dx = b.X - a.X, dz = b.Z - a.Z, l = Math.hypot(dx, dz) || 1;
    return { X: a.X + dx * k, Z: a.Z + dz * k, dx: dx / l, dz: dz / l };
  }

  /** Flechita (chevrón) en el suelo: polígono en la escena. */
  function chevron(c, lv, a) {
    const nx = -c.dz, nz = c.dx, w = 0.5 * a, h = 0.46 * a, th = 0.3 * a;
    const loc = [[-w, -h], [0, 0], [w, -h], [w, -h - th], [0, -th], [-w, -h - th]];
    return loc.map(([ac, al]) => project(c.X + ac * nx + al * c.dx, c.Z + ac * nz + al * c.dz, lv));
  }

  function ringPoly(X, Z, lv, r, n) {
    const out = [];
    for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; out.push(project(X + Math.cos(t) * r, Z + Math.sin(t) * r, lv)); }
    return out;
  }

  function polyPath(ctx, pts, close) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  }

  function distToPolyline(x, y, pts) {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
      best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return best;
  }

  /* ---------- sprites auxiliares (sin getImageData) ---------- */

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function dotSprite(rgb, size) {
    const c = canvas(size, size), x = c.getContext('2d'), r = size / 2;
    const g = x.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.25, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }
  /** Silueta de un objeto teñida (sale de objetos.png, blanca con alfa). */
  function tinted(img, src, color) {
    const [sx, sy, w, h] = src; const c = canvas(w, h), x = c.getContext('2d');
    x.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, w, h);
    return c;
  }
  /** El propio objeto recortado del fondo (para «encenderlo» al elegirlo). */
  function lifted(sil, src, at, view) {
    const [sx, sy, w, h] = src; const c = canvas(w, h), x = c.getContext('2d');
    x.drawImage(sil, sx, sy, w, h, 0, 0, w, h);
    x.globalCompositeOperation = 'source-in';
    x.drawImage(view, at[0], at[1], w, h, 0, 0, w, h);
    return c;
  }

  /** Icono del Modo salvaje (el paquete no trae): una bola de discoteca en pixel art, 48×48. */
  function discoIcon() {
    const c = canvas(24, 24), x = c.getContext('2d');
    x.fillStyle = '#c9c3b6'; x.fillRect(11, 0, 2, 4);
    const cols = ['#e9f4ff', '#9fd3ff', '#5b8fe0', '#c8b6ff', '#ffffff', '#3d5fa8', '#86e6ff'];
    for (let yy = 4; yy < 24; yy++) for (let xx = 0; xx < 24; xx++) {
      const dx = xx + 0.5 - 12, dy = yy + 0.5 - 13.5, r = Math.hypot(dx, dy);
      if (r > 9.6) continue;
      if (r > 8.6) { x.fillStyle = '#1b2540'; x.fillRect(xx, yy, 1, 1); continue; }
      const cell = ((Math.floor((xx + 1) / 3) * 7 + Math.floor((yy + 1) / 3) * 3) % cols.length);
      const shade = dx < -2 && dy < -1 ? 0 : dx > 3 || dy > 4 ? 5 : cell;
      x.fillStyle = (xx % 3 === 0 || yy % 3 === 1) ? '#24345c' : cols[shade];
      x.fillRect(xx, yy, 1, 1);
    }
    x.fillStyle = '#ffffff'; x.fillRect(6, 8, 2, 2); x.fillRect(19, 5, 1, 3); x.fillRect(18, 6, 3, 1);
    const big = canvas(48, 48), y = big.getContext('2d');
    y.imageSmoothingEnabled = false; y.drawImage(c, 0, 0, 48, 48);
    return big.toDataURL('image/png');
  }

  /* ---------- el menú ---------- */

  const Hub = {
    ready: false, visible: false, mode: 'hidden',
    canvas: null, ctx: null, cssW: 0, cssH: 0, dpr: 1,
    hour: 'noche', views: {}, img: {},
    t: 0, lights: 1, lightsGoal: 1, intro: null, fade: 0, fadeGoal: 0,
    sel: null, focus: {}, press: null, wildK: 0, reduce: false,
    cam: { x: SW / 2, y: SH / 2, z: 1 }, camGoal: { x: SW / 2, y: SH / 2, z: 1 }, camRate: 5, safe: null,
    paths: {}, dests: {}, objects: {}, bulbs: [], dust: [], spots: [], glints: [],

    /** Qué imágenes hay que cargar al arrancar (la hora actual). */
    jobs(game, hour) {
      const d = D();
      if (!d || !root.TROLINA_HUB) return [];
      this.game = game;
      this.hour = hour;
      const v = d.views[hour];
      return [
        [v.encendidas, (img) => { this.view(hour).on = img; }],
        [v.apagadas, (img) => { this.view(hour).off = img; }],
        [d.sprites.objetos, (img) => { this.img.sil = img; }],
        [d.sprites.halos, (img) => { this.img.halo = img; }]
      ];
    },
    view(h) { return this.views[h] || (this.views[h] = {}); },

    /** Con las imágenes cargadas: prepara el canvas, las flechas y el ambiente. */
    init() {
      const d = D(), H = HUB(), v = this.views[this.hour];
      if (!d || !H || !v || !v.on || !v.off || !this.img.sil || !this.img.halo) return false;
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'hub';
      this.canvas.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(this.canvas, document.getElementById('ui'));
      this.ctx = this.canvas.getContext('2d');
      for (const [id, def] of Object.entries(H.paths)) this.paths[id] = buildPath(def);
      for (const dst of H.destinations) this.dests[dst.id] = dst;
      for (const [id, o] of Object.entries(d.objects)) {
        this.objects[id] = { ...o, halo: null, glow: null };
      }
      this.objects.neveras.glow = tinted(this.img.sil, d.objects.neveras.src, '#3f7bff');
      this.objects.tele.glow = tinted(this.img.sil, d.objects.tele.src, '#9b8cff');
      this.prepareView(this.hour);
      this.sprites = { warm: dotSprite('255,214,150', 64), white: dotSprite('255,250,235', 64), teal: dotSprite('110,255,240', 64),
        disco: ['120,220,255', '150,255,170', '255,140,225', '255,255,255', '130,150,255'].map((c) => dotSprite(c, 64)) };
      const rnd = Math.random;
      this.bulbs = d.bulbs.map(([x, y, r]) => ({ x, y, r, w: 1.2 + rnd() * 2.8, p: rnd() * 6.28, k: 0.6 + rnd() * 0.4 }));
      for (let i = 0; i < 42; i++) this.dust.push(this.newDust(true));
      for (let i = 0; i < 70; i++) {
        this.spots.push({ lon: rnd() * Math.PI * 2, lat: (rnd() * 2 - 1) * 1.2, s: 5 + rnd() * 9, c: (rnd() * 5) | 0, tw: rnd() * 6.28 });
      }
      try { document.documentElement.style.setProperty('--disco-icon', `url(${discoIcon()})`); } catch (e) { /* sin icono */ }
      root.addEventListener('resize', () => this.resize());
      root.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
      this.resize();
      this.ready = true;
      return true;
    },

    /** Objetos «encendidos» con los colores de la vista de esta hora. */
    prepareView(h) {
      const d = D(), v = this.views[h];
      for (const [id, o] of Object.entries(this.objects)) {
        if (id === 'neveras') continue;
        o.lift = lifted(this.img.sil, o.src, o.at, v.on);
      }
    },

    /** Cambia la hora (carga la vista si hace falta). */
    setHour(h) {
      if (!this.ready || h === this.hour || !D().views[h]) return;
      const v = this.view(h), d = D().views[h];
      const go = () => { if (v.on && v.off) { this.hour = h; this.prepareView(h); } };
      if (v.on && v.off) return go();
      const load = (src, k) => { const im = new Image(); im.onload = () => { v[k] = im; go(); }; im.src = src; };
      load(d.encendidas, 'on'); load(d.apagadas, 'off');
    },

    newDust(any) {
      const r = Math.random;
      return { x: 260 + r() * 1150, y: any ? 140 + r() * 600 : 760 + r() * 40, vx: (r() - 0.5) * 4, vy: -(3 + r() * 6),
        s: 0.8 + r() * 1.8, p: r() * 6.28, life: any ? r() * 18 : 0, max: 14 + r() * 10 };
    },

    resize() {
      if (!this.canvas) return;
      const w = root.innerWidth, h = root.innerHeight;
      let dpr = Math.min(root.devicePixelRatio || 1, 2);
      if (w * h * dpr * dpr > 4.2e6) dpr = Math.sqrt(4.2e6 / (w * h));
      this.cssW = w; this.cssH = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    },

    get portrait() { return this.cssH > this.cssW * 1.05; },
    base() { return Math.max(this.cssW / SW, this.cssH / SH); },

    /** Zona de la pantalla que no tapa la interfaz (la cámara encuadra ahí lo elegido). */
    setSafe(r) { this.safe = r; },

    /* ---------- estado ---------- */

    show() { if (this.canvas && !this.visible) { this.visible = true; this.canvas.style.display = 'block'; } },
    hide() { if (this.canvas && this.visible) { this.visible = false; this.canvas.style.display = 'none'; } },

    /** Pantalla de inicio. first: la primera vez se encienden las luces. */
    enterTitle(opts) {
      const o = opts || {};
      this.mode = 'title';
      this.press = null;
      this.reduce = !!o.reduceMotion;
      if (o.intro && !this.introDone) {
        this.introDone = true;
        this.lights = 0; this.fade = 1; this.fadeGoal = 0;
        this.intro = { t: 0 };
        this.cam = { x: SW / 2, y: SH / 2 + 30, z: 1.12 };
      } else {
        this.fadeGoal = 0;
      }
      this.camRate = 3.2;
      this.updateGoal();
    },

    /** Otras pantallas del menú: el bar se queda detrás, más cerca del sitio de donde vienes. */
    enterBackdrop(id) {
      this.mode = 'backdrop';
      this.sel = null; this.press = null;
      const dst = id && this.dests[id];
      const f = dst ? dst.focus : [SW / 2, SH / 2, 0];
      this.camGoal = this.fit(f[0], f[1], 1.5);
      this.camRate = 2.4;
      this.lightsGoal = 1;
      this.fadeGoal = 0;
    },

    select(id) {
      if (this.sel === id) return;
      this.sel = id;
      this.camRate = this.reduce ? 12 : 4.2;
      this.updateGoal();
    },

    /** Entrar en un sitio: destello, la cámara avanza y se funde a negro. Devuelve una promesa. */
    confirm(id) {
      this.sel = id;
      this.press = { id, t: 0 };
      const dst = this.dests[id];
      this.camGoal = this.fit(dst.anchor[0], (dst.anchor[1] + dst.focus[1]) / 2, this.portrait ? 1.7 : 1.9);
      this.camRate = 3.6;
      this.fadeGoal = 0.85;
      return new Promise((res) => setTimeout(res, this.reduce ? 120 : 430));
    },

    updateGoal() {
      if (this.mode !== 'title') return;
      const dst = this.sel && this.dests[this.sel];
      const portrait = this.portrait;
      if (!dst) { this.camGoal = this.fit(SW / 2, SH / 2, 1); return; }
      const [fx, fy] = dst.focus;
      if (portrait) this.camGoal = this.fit(fx, fy, 1.0);
      else {
        // Un poco hacia lo elegido, sin dejar de ver el bar entero.
        const z = 1.06;
        this.camGoal = this.fit(lerp(SW / 2, fx, 0.32), lerp(SH / 2, fy, 0.15), z);
      }
      this.lightsGoal = dst.lights != null ? dst.lights : 1;
    },

    /** Encuadre que pone (x, y) en el centro de la zona libre, sin salirse de la imagen. */
    fit(x, y, z) {
      const s = this.base() * z;
      const safe = this.safe || { x: 0, y: 0, w: this.cssW, h: this.cssH };
      // Centro de la cámara para que (x, y) caiga en el centro de la zona segura.
      let cx = x - (safe.x + safe.w / 2 - this.cssW / 2) / s;
      let cy = y - (safe.y + safe.h / 2 - this.cssH / 2) / s;
      const hw = this.cssW / (2 * s), hh = this.cssH / (2 * s);
      cx = clamp(cx, hw, SW - hw); cy = clamp(cy, hh, SH - hh);
      return { x: cx, y: cy, z };
    },

    /** De la escena a la pantalla (px CSS). */
    toScreen(x, y) {
      const s = this.base() * this.cam.z;
      return [(x - this.cam.x) * s + this.cssW / 2, (y - this.cam.y) * s + this.cssH / 2];
    },
    toScene(px, py) {
      const s = this.base() * this.cam.z;
      return [(px - this.cssW / 2) / s + this.cam.x, (py - this.cssH / 2) / s + this.cam.y];
    },
    scale() { return this.base() * this.cam.z; },

    /** ¿Qué sitio hay bajo el dedo o el ratón? Con el ratón (whole = false) las flechas solo
     * cuentan cerca del final: así, ir con el ratón hasta la carta no cambia lo elegido. */
    hitTest(px, py, whole) {
      const [x, y] = this.toScene(px, py);
      const tol = 14 / this.scale();
      let best = null, bd = Infinity;
      for (const dst of HUB().destinations) {
        let d = Infinity;
        if (dst.kind === 'object') {
          const b = this.objects[dst.object].box;
          const dx = Math.max(b[0] - x, 0, x - b[2]), dy = Math.max(b[1] - y, 0, y - b[3]);
          d = Math.hypot(dx, dy);
        } else {
          const p = this.paths[dst.path];
          const part = whole ? p.center : p.center.slice(Math.floor(p.center.length * 0.62));
          d = Math.max(0, distToPolyline(x, y, part) - 26);
          const [ex, ey] = project(p.end.X, p.end.Z, p.end.lv);
          d = Math.min(d, Math.max(0, Math.hypot(x - ex, y - ey) - 40));
        }
        if (d <= tol && d < bd) { bd = d; best = dst.id; }
      }
      return best;
    },

    /* ---------- cada fotograma ---------- */

    frame(dt) {
      if (!this.ready || !this.visible) return;
      const s = Math.min(dt, 50) / 1000;
      this.t += s;
      this.step(s);
      this.draw();
    },

    step(s) {
      // Encendido de luces (la primera vez): parpadeo de fluorescente.
      if (this.intro) {
        // Con el reloj de verdad (no con el paso limitado), para ir a la par que el CSS.
        const it = this.intro, now = performance.now();
        if (it.start == null) it.start = now;
        const k = it.t = (now - it.start) / 1000;
        const seq = [[0, 0], [0.62, 1], [0.68, 0.12], [0.78, 0.9], [0.82, 0.25], [0.97, 1]];
        let v = 0; for (const [at, val] of seq) if (k >= at) v = val;
        if (this.reduce) v = smooth(0.2, 0.7, k);
        this.lights = v;
        if (!it.sound && k >= 0.62) { it.sound = true; if (root.TrolinaSfx) root.TrolinaSfx.play('lightsOn'); }
        if (k > 1.1) { this.intro = null; this.lightsGoal = this.lightsGoalOf(); }
      } else {
        this.lights = lerp(this.lights, this.lightsGoal, ease(s, 3.5));
      }
      this.fade = lerp(this.fade, this.fadeGoal, ease(s, this.press ? 7 : 4));
      const c = this.cam, g = this.camGoal, k = ease(s, this.camRate);
      // Respiración de la cámara (muy leve).
      const sway = this.reduce || this.mode !== 'title' ? 0 : 1;
      c.x = lerp(c.x, g.x + Math.sin(this.t * 0.21) * 5 * sway, k);
      c.y = lerp(c.y, g.y + Math.sin(this.t * 0.17) * 3 * sway, k);
      c.z = lerp(c.z, g.z + Math.sin(this.t * 0.13) * 0.006 * sway, k);
      // Que la cámara nunca enseñe fuera de la imagen.
      const sc = this.base() * c.z, hw = this.cssW / (2 * sc), hh = this.cssH / (2 * sc);
      c.x = clamp(c.x, hw, SW - hw); c.y = clamp(c.y, hh, SH - hh);
      // Brillo de cada sitio (entra y sale suave).
      for (const id in this.dests) {
        const want = this.mode === 'title' && this.sel === id ? 1 : 0;
        this.focus[id] = lerp(this.focus[id] || 0, want, ease(s, want ? 7 : 5));
      }
      this.wildK = this.focus.wild || 0;
      if (this.press) this.press.t += s;
      for (const p of this.dust) {
        p.life += s; p.x += (p.vx + Math.sin(this.t * 0.7 + p.p) * 3) * s; p.y += p.vy * s;
        if (p.life > p.max || p.y < 120) Object.assign(p, this.newDust(false));
      }
      if (Math.random() < s * (1.2 + this.wildK * 4)) {
        const a = Math.random() * 6.28, r = Math.random() * 30;
        this.glints.push({ x: 834 + Math.cos(a) * r, y: 238 + Math.sin(a) * r * 0.9, t: 0, max: 0.35 + Math.random() * 0.3 });
      }
      this.glints = this.glints.filter((gl) => (gl.t += s) < gl.max);
    },

    lightsGoalOf() { const dst = this.sel && this.dests[this.sel]; return dst && dst.lights != null && this.mode === 'title' ? dst.lights : 1; },

    draw() {
      const ctx = this.ctx, dpr = this.dpr, v = this.views[this.hour];
      const sc = this.base() * this.cam.z;
      const ox = this.cssW / 2 - this.cam.x * sc, oy = this.cssH / 2 - this.cam.y * sc;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
      // Fondo: apagado debajo, encendido encima según la luz.
      const L = clamp(this.lights, 0, 1);
      if (L < 0.999) ctx.drawImage(v.off, 0, 0);
      if (L > 0.001) { ctx.globalAlpha = L; ctx.drawImage(v.on, 0, 0); ctx.globalAlpha = 1; }

      this.drawAmbient(ctx, L);
      this.drawSpot(ctx);
      for (const dst of HUB().destinations) if (dst.kind === 'object') this.drawObject(ctx, dst);
      for (const dst of HUB().destinations) if (dst.kind === 'path') this.drawPath(ctx, dst);
      this.drawDust(ctx, L);

      // Pantalla: viñeta y fundido.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = this.cssW, h = this.cssH;
      const vg = ctx.createRadialGradient(w / 2, h * 0.52, Math.min(w, h) * 0.35, w / 2, h * 0.52, Math.max(w, h) * 0.78);
      vg.addColorStop(0, 'rgba(4,3,8,0)'); vg.addColorStop(1, `rgba(4,3,8,${this.mode === 'title' ? 0.62 : 0.4})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      if (this.fade > 0.003) { ctx.fillStyle = `rgba(4,6,12,${clamp(this.fade, 0, 1)})`; ctx.fillRect(0, 0, w, h); }
    },

    drawAmbient(ctx, L) {
      const t = this.t, sp = this.sprites;
      ctx.globalCompositeOperation = 'lighter';
      // Bombillas de las guirnaldas.
      if (L > 0.02) {
        for (const b of this.bulbs) {
          const tw = 0.5 + 0.5 * Math.sin(t * b.w + b.p);
          const a = L * b.k * (0.18 + 0.42 * tw * tw);
          const r = b.r * (3.4 + tw * 1.6);
          ctx.globalAlpha = a; ctx.drawImage(sp.warm, b.x - r, b.y - r, r * 2, r * 2);
        }
      }
      // Neveras y tele.
      const nev = this.objects.neveras;
      ctx.globalAlpha = 0.06 + 0.05 * Math.sin(t * 2.1) + (Math.sin(t * 23) > 0.96 ? 0.05 : 0);
      ctx.drawImage(nev.glow, nev.at[0], nev.at[1]);
      const tv = this.objects.tele;
      ctx.globalAlpha = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
      ctx.drawImage(tv.glow, tv.at[0], tv.at[1]);
      // Destellos en la bola de discoteca.
      for (const g of this.glints) {
        const k = Math.sin(Math.PI * g.t / g.max), r = 5 + 9 * k;
        ctx.globalAlpha = 0.5 * k + 0.4 * this.wildK * k;
        ctx.drawImage(sp.white, g.x - r, g.y - r, r * 2, r * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.7 * k})`;
        ctx.fillRect(g.x - r * 1.2, g.y - 0.6, r * 2.4, 1.2); ctx.fillRect(g.x - 0.6, g.y - r * 1.2, 1.2, r * 2.4);
      }
      // Modo salvaje: luces fuera y la bola reparte reflejos por todo el bar.
      const wk = this.wildK;
      if (wk > 0.02) {
        const rot = t * 0.35;
        for (const s of this.spots) {
          const lon = s.lon + rot, x = 834 + Math.sin(lon) * 1100, z = Math.cos(lon);
          if (z < -0.15) continue;
          const y = 238 + s.lat * 420 + (s.lat > 0 ? 160 : 0) * Math.abs(Math.sin(lon));
          const r = s.s * (0.7 + 0.5 * z);
          ctx.globalAlpha = wk * (0.35 + 0.3 * Math.sin(t * 3 + s.tw)) * clamp(z + 0.15, 0, 1);
          ctx.drawImage(sp.disco[s.c], x - r * 2, y - r, r * 4, r * 2.2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },

    /** Foco: oscurece el resto del bar alrededor de lo elegido. */
    drawSpot(ctx) {
      let best = null, k = 0;
      for (const id in this.focus) if (this.focus[id] > k) { k = this.focus[id]; best = id; }
      if (!best || k < 0.01) return;
      const [x, y, r] = this.dests[best].focus;
      const g = ctx.createRadialGradient(x, y, r * 0.45, x, y, r * 2.4);
      g.addColorStop(0, 'rgba(3,2,8,0)'); g.addColorStop(1, `rgba(3,2,8,${0.34 * k})`);
      ctx.fillStyle = g; ctx.fillRect(-20, -20, SW + 40, SH + 40);
    },

    drawObject(ctx, dst) {
      const f = this.focus[dst.id] || 0;
      const pr = this.press && this.press.id === dst.id ? Math.max(0, 1 - this.press.t / 0.35) : 0;
      if (f < 0.01 && !pr) return;
      const o = this.objects[dst.object], [sx, sy, w, h] = o.src;
      const pulse = 0.78 + 0.22 * Math.sin(this.t * 4.2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(f * 0.3 + pr * 0.6, 0, 1);
      ctx.drawImage(o.lift, o.at[0], o.at[1]);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = clamp(f * pulse + pr, 0, 1);
      ctx.drawImage(this.img.halo, sx, sy, w, h, o.at[0], o.at[1], w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(f * 0.45 * pulse + pr * 0.8, 0, 1);
      ctx.drawImage(this.img.halo, sx, sy, w, h, o.at[0], o.at[1], w, h);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },

    drawPath(ctx, dst) {
      const P = this.paths[dst.path], def = P.def;
      const f = this.focus[dst.id] || 0;
      const pr = this.press && this.press.id === dst.id ? Math.max(0, 1 - this.press.t / 0.4) : 0;
      const idle = this.mode === 'title' ? 1 : 0.4;
      const on = clamp(f + pr, 0, 1);
      const t = this.t, sc = this.base() * this.cam.z, dpr = this.dpr;
      const poly = P.L.concat(P.Rr.slice().reverse());
      // Sombra debajo (para que se lea sobre el suelo claro) y relleno de luz.
      polyPath(ctx, poly, true);
      ctx.fillStyle = `rgba(2,14,18,${(0.06 * idle + 0.2 * on)})`; ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${TEAL},${0.03 * idle + 0.14 * on + 0.25 * pr})`; ctx.fill();
      // Bordes.
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(${TEAL},0.95)`; ctx.shadowBlur = (4 + 14 * on) * dpr;
      ctx.strokeStyle = `rgba(170,255,246,${0.1 * idle + 0.6 * on})`;
      ctx.lineWidth = (1.1 + 0.9 * on) / Math.max(0.35, sc) * 0.9;
      polyPath(ctx, P.L, false); ctx.stroke();
      polyPath(ctx, P.Rr, false); ctx.stroke();
      // Flechitas: una ola de luz que va de la puerta al sitio, y avanzan despacio.
      const a = def.width * 0.82, wave = ((t * 0.75) % 1.35) / 1.1 * P.total;
      for (const run of P.flat) {
        if (run.len < 1e-6) continue;
        const items = [], short = run.len < def.spacing * 1.4;
        // En un peldaño cabe una sola, entera dentro de la huella.
        const aa = short ? Math.min(a, run.len * 0.92 / 0.76) : a;
        if (short) items.push(run.len / 2 + 0.38 * aa);
        else {
          const off = this.reduce ? 0 : (t * 0.16) % def.spacing;
          for (let s = off + def.spacing * 0.5; s < run.len - a * 0.3; s += def.spacing) items.push(s);
        }
        for (const s of items) {
          const g = run.from + s;
          const edge = short ? 1 : smooth(0, 0.12, s) * smooth(0, 0.12, run.len - s);
          const wv = Math.exp(-Math.pow((g - wave) / 0.22, 2));
          const alpha = edge * (0.16 * idle + on * (0.4 + 0.6 * wv) + pr * 0.6);
          if (alpha < 0.01) continue;
          const c = along(run, s);
          const pts = chevron(c, run.lv, aa * (1 + (short ? 0 : 0.12 * wv * on)));
          polyPath(ctx, pts, true);
          ctx.shadowBlur = (3 + 12 * on * (0.5 + wv)) * dpr;
          ctx.fillStyle = `rgba(${Math.round(200 + 55 * wv)},255,${Math.round(246 + 9 * wv)},${clamp(alpha, 0, 1)})`;
          ctx.fill();
        }
      }
      // Punta: la cinta se ensancha en una cabeza de flecha (mismo estilo) con una flechita dentro.
      const e = P.end, [dx, dz] = P.dEnd, nx = -dz, nz = dx, hl = def.width * 1.05, hw = def.width * 0.82;
      const at = (f, g) => project(e.X + dx * f + nx * g, e.Z + dz * f + nz * g, e.lv);
      const head = [at(0, P.hw), at(0, hw), at(hl, 0), at(0, -hw), at(0, -P.hw)];
      polyPath(ctx, head, true);
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(${TEAL},${0.05 * idle + 0.2 * on + 0.3 * pr})`; ctx.fill();
      ctx.shadowBlur = (4 + 14 * on) * dpr;
      ctx.strokeStyle = `rgba(170,255,246,${0.12 * idle + 0.75 * on})`; ctx.stroke();
      const arrive = Math.exp(-Math.pow((P.total - wave) / 0.3, 2));
      const hc = chevron({ X: e.X + dx * hl * 0.72, Z: e.Z + dz * hl * 0.72, dx, dz }, e.lv, def.width * 0.95);
      polyPath(ctx, hc, true);
      ctx.shadowBlur = (4 + 18 * on * (0.6 + arrive)) * dpr;
      ctx.fillStyle = `rgba(225,255,252,${clamp(0.15 * idle + on * (0.6 + 0.4 * arrive) + pr, 0, 1)})`; ctx.fill();
      if (on > 0.02) {
        const ph = (t * 0.9) % 1;
        for (const k of [ph, (ph + 0.5) % 1]) {
          const r = def.width * (0.55 + 1.05 * k);
          const ring = ringPoly(e.X + dx * hl * 0.35, e.Z + dz * hl * 0.35, e.lv, r, 28);
          polyPath(ctx, ring, true);
          ctx.strokeStyle = `rgba(${TEAL},${on * 0.7 * (1 - k)})`;
          ctx.lineWidth = 1.6 / Math.max(0.35, sc);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
      ctx.globalCompositeOperation = 'source-over';
    },

    drawDust(ctx, L) {
      if (this.reduce) return;
      ctx.globalCompositeOperation = 'lighter';
      const sp = this.sprites.warm;
      for (const p of this.dust) {
        const k = Math.sin(Math.PI * clamp(p.life / p.max, 0, 1));
        const a = (0.12 + 0.18 * L) * k * (0.6 + 0.4 * Math.sin(this.t * 2 + p.p));
        if (a < 0.01) continue;
        ctx.globalAlpha = a;
        const r = p.s * 2.2;
        ctx.drawImage(sp, p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  };

  /** Hora del bar según el reloj del móvil (o la de Opciones). */
  Hub.hourFor = function (setting, date) {
    if (setting && setting !== 'auto') return setting;
    const d = date || new Date(), H = root.TROLINA_HUB;
    const [tarde, noche, dawn] = H.hours.byMonth[d.getMonth() + 1];
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= noche || h < dawn) return 'noche';
    if (h >= tarde) return 'tarde';
    return 'dia';
  };

  Hub._test = { project, buildPath, along, chevron };
  root.TrolinaHub = Hub;
})(window);
