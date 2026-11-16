/* Entrada unificada: teclado + joystick y botones táctiles multitáctiles.
 * held: direcciones mantenidas. queue: acciones puntuales (punch, kick, bottle, special, smoke, jump).
 */
(function (root) {
  const MOVE_KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'block', KeyS: 'block', KeyG: 'block'
  };
  const ACTION_KEYS = {
    KeyJ: 'punch', KeyK: 'kick', KeyL: 'bottle', KeyU: 'special', KeyF: 'smoke',
    KeyZ: 'punch', KeyX: 'kick', KeyC: 'bottle', KeyV: 'special', KeyB: 'smoke'
  };

  class Input {
    constructor() {
      this.held = { left: false, right: false, up: false, block: false };
      this.keys = { left: false, right: false, up: false, block: false };
      this.touch = { left: false, right: false, up: false, block: false };
      this.queue = [];
      this.onPause = null;
      root.addEventListener('keydown', (e) => this.keydown(e));
      root.addEventListener('keyup', (e) => this.keyup(e));
      root.addEventListener('blur', () => this.releaseAll());
    }
    isTyping() {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
    }
    keydown(e) {
      if (this.isTyping()) return;
      if (e.code === 'Escape' || e.code === 'KeyP') { if (this.onPause && !e.repeat) this.onPause(); return; }
      const mv = MOVE_KEYS[e.code];
      if (mv) {
        if (!this.keys[mv] && mv === 'up') this.queue.push('jump');
        this.keys[mv] = true; this.sync();
        if (this.capture) e.preventDefault();
        return;
      }
      const act = ACTION_KEYS[e.code];
      if (act && !e.repeat) { this.queue.push(act); if (this.capture) e.preventDefault(); }
    }
    keyup(e) {
      const mv = MOVE_KEYS[e.code];
      if (mv) { this.keys[mv] = false; this.sync(); }
    }
    sync() {
      for (const k of Object.keys(this.held)) this.held[k] = this.keys[k] || this.touch[k];
    }
    releaseAll() {
      for (const k of Object.keys(this.held)) { this.keys[k] = false; this.touch[k] = false; this.held[k] = false; }
      document.querySelectorAll('.tbtn.on').forEach((b) => b.classList.remove('on'));
      this.btnBlock = false;
      if (this.releaseStick) this.releaseStick();
    }
    take() { const q = this.queue; this.queue = []; return q; }
    clear() { this.queue = []; }

    /**
     * Joystick flotante: al tocar la zona izquierda aparece bajo el pulgar y se
     * maneja arrastrando, sin levantar el dedo. Izquierda/derecha andan (atrás =
     * cubrirse), arriba salta (mantener = seguir saltando, en diagonal salta hacia
     * ese lado) y abajo pone la guardia.
     */
    bindTouch(container) {
      const zone = container.querySelector('.stick-zone');
      const base = zone.querySelector('.stick-base');
      const knob = zone.querySelector('.stick-knob');
      const st = { id: null, cx: 0, cy: 0, r: 60, dir: { left: false, right: false, up: false, down: false } };
      this.stick = st;
      this.btnBlock = false;
      const setDir = (nx, ny) => {
        const d = st.dir, was = { ...d };
        // Umbrales con histéresis para que no tiemble al pasar por el borde.
        d.left = was.left ? nx < -0.22 : nx < -0.35;
        d.right = was.right ? nx > 0.22 : nx > 0.35;
        d.up = was.up ? ny < -0.32 : ny < -0.5;
        d.down = was.down ? ny > 0.4 : ny > 0.55;
        if (d.up && !was.up) this.queue.push('jump');
        this.touch.left = d.left; this.touch.right = d.right; this.touch.up = d.up;
        this.touch.block = d.down || this.btnBlock;
        base.classList.toggle('l', d.left); base.classList.toggle('r', d.right);
        base.classList.toggle('u', d.up); base.classList.toggle('d', d.down);
        this.sync();
      };
      const place = (x, y) => {
        const zr = zone.getBoundingClientRect();
        st.r = base.offsetWidth / 2 || 60;
        // El centro queda donde se apoya el pulgar, sin salirse de la zona.
        st.cx = Math.max(zr.left + st.r, Math.min(zr.right - st.r, x));
        st.cy = Math.max(zr.top + st.r, Math.min(zr.bottom - st.r, y));
        base.style.left = (st.cx - zr.left - st.r) + 'px';
        base.style.top = (st.cy - zr.top - st.r) + 'px';
        base.style.bottom = 'auto';
      };
      const move = (x, y) => {
        let dx = x - st.cx, dy = y - st.cy;
        const len = Math.hypot(dx, dy), max = st.r * 0.9;
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        setDir(dx / st.r, dy / st.r);
      };
      const release = () => {
        st.id = null;
        knob.style.transform = '';
        base.classList.remove('active');
        base.style.left = ''; base.style.top = ''; base.style.bottom = '';
        setDir(0, 0);
      };
      zone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (st.id !== null) return;
        st.id = e.pointerId;
        try { zone.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
        base.classList.add('active');
        place(e.clientX, e.clientY);
        move(e.clientX, e.clientY);
      });
      zone.addEventListener('pointermove', (e) => { if (e.pointerId === st.id) { e.preventDefault(); move(e.clientX, e.clientY); } });
      const end = (e) => { if (e.pointerId === st.id) release(); };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
      zone.addEventListener('lostpointercapture', end);
      this.releaseStick = release;

      container.querySelectorAll('[data-act]').forEach((btn) => {
        const act = btn.dataset.act;
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          try { btn.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
          btn.classList.add('on');
          if (act === 'block') { this.btnBlock = true; this.touch.block = true; this.sync(); } else this.queue.push(act);
          if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) { /* opcional */ }
        });
        const up = () => {
          btn.classList.remove('on');
          if (act === 'block') { this.btnBlock = false; this.touch.block = !!(this.stick && this.stick.dir.down); this.sync(); }
        };
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointercancel', up);
        btn.addEventListener('lostpointercapture', up);
      });
      container.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  root.TrolinaInput = Input;
})(window);
