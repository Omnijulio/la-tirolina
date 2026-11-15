/* Entrada unificada: teclado + controles táctiles multitáctiles.
 * held: direcciones mantenidas. queue: acciones puntuales (punch, kick, bottle, jump).
 */
(function (root) {
  const MOVE_KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'block', KeyS: 'block', KeyG: 'block'
  };
  const ACTION_KEYS = { KeyJ: 'punch', KeyK: 'kick', KeyL: 'bottle', KeyZ: 'punch', KeyX: 'kick', KeyC: 'bottle' };

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
      this.dpadPointers && this.dpadPointers.clear();
    }
    take() { const q = this.queue; this.queue = []; return q; }
    clear() { this.queue = []; }

    /** Conecta la cruceta (arrastrable) y los botones de acción táctiles. */
    bindTouch(container) {
      const dpad = container.querySelector('.dpad');
      this.dpadPointers = new Map();
      const recompute = () => {
        const wasUp = this.touch.up;
        let left = false, right = false, up = false;
        const r = dpad.getBoundingClientRect();
        for (const p of this.dpadPointers.values()) {
          const nx = (p.x - r.left) / r.width - 0.5, ny = (p.y - r.top) / r.height - 0.5;
          if (nx < -0.12) left = true;
          if (nx > 0.12) right = true;
          if (ny < -0.16) up = true;
        }
        Object.assign(this.touch, { left, right, up });
        if (up && !wasUp) this.queue.push('jump');
        dpad.querySelector('[data-dir=left]').classList.toggle('on', left);
        dpad.querySelector('[data-dir=right]').classList.toggle('on', right);
        dpad.querySelector('[data-dir=up]').classList.toggle('on', up);
        this.sync();
      };
      dpad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { dpad.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
        this.dpadPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        recompute();
      });
      dpad.addEventListener('pointermove', (e) => {
        if (!this.dpadPointers.has(e.pointerId)) return;
        this.dpadPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        recompute();
      });
      const end = (e) => { if (this.dpadPointers.delete(e.pointerId)) recompute(); };
      dpad.addEventListener('pointerup', end);
      dpad.addEventListener('pointercancel', end);
      dpad.addEventListener('lostpointercapture', end);

      container.querySelectorAll('[data-act]').forEach((btn) => {
        const act = btn.dataset.act;
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          try { btn.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
          btn.classList.add('on');
          if (act === 'block') { this.touch.block = true; this.sync(); } else this.queue.push(act);
          if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) { /* opcional */ }
        });
        const up = () => {
          btn.classList.remove('on');
          if (act === 'block') { this.touch.block = false; this.sync(); }
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
