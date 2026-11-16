/* Multijugador EXPERIMENTAL: dos navegadores conectados por WebRTC.
 *
 * NetLink: conexión entre dos jugadores con un código de sala de 4 letras. Usa PeerJS
 * (game/vendor/peerjs.min.js, licencia MIT) y su servidor público gratuito solo para
 * presentarse; después los móviles hablan directamente entre sí. Con ?nettest=1 usa un
 * BroadcastChannel (dos pestañas del mismo navegador) para probar sin internet.
 *
 * Lockstep: los dos simulan la misma pelea a 60 pasos por segundo con las entradas de
 * ambos. Cada uno manda lo que pulsa para 5 pasos después (≈83 ms de retardo) y solo
 * avanza cuando tiene las entradas del otro. La aleatoriedad del combate sale de una
 * semilla común, así que en los dos móviles pasa exactamente lo mismo.
 */
(function (root) {
  const REAL_RANDOM = Math.random;
  root.__trolinaRealRandom = REAL_RANDOM;
  const PREFIX = 'trolina-fighters-v1-';
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const TICK = 1000 / 60;
  const DELAY = 5;
  const NEUTRAL = { l: 0, r: 0, u: 0, b: 0, a: [] };

  function randomCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += LETTERS[Math.floor(REAL_RANDOM() * LETTERS.length)];
    return c;
  }

  /** Generador pseudoaleatorio con semilla (mulberry32): mismo resultado en los dos móviles. */
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let libPromise = null;
  function loadPeerJs() {
    if (root.Peer) return Promise.resolve(root.Peer);
    if (!libPromise) {
      libPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'game/vendor/peerjs.min.js';
        s.onload = () => (root.Peer ? resolve(root.Peer) : reject(new Error('PeerJS no cargó')));
        s.onerror = () => { libPromise = null; reject(new Error('No se pudo cargar la librería de red')); };
        document.head.append(s);
      });
    }
    return libPromise;
  }

  /** Transporte de prueba: BroadcastChannel entre pestañas del mismo navegador. */
  class LocalPeer {
    constructor(id) {
      this.id = id || 'local-' + Math.floor(REAL_RANDOM() * 1e9);
      this.handlers = {};
      this.ch = new BroadcastChannel('trolina-nettest');
      this.ch.onmessage = (e) => this.onRaw(e.data);
      setTimeout(() => this.emit('open', this.id), 30);
    }
    on(ev, fn) { this.handlers[ev] = fn; return this; }
    emit(ev, x) { if (this.handlers[ev]) this.handlers[ev](x); }
    onRaw(m) {
      if (m.to !== this.id) return;
      if (m.kind === 'hello') {
        const c = new LocalConn(this, m.from); this.emit('connection', c);
        this.ch.postMessage({ kind: 'welcome', from: this.id, to: m.from });
        setTimeout(() => c.emit('open'), 10);
      } else if (m.kind === 'welcome') { if (this.pending) this.pending.emit('open'); }
      else if (m.kind === 'data' && this.conn) this.conn.emit('data', m.data);
      else if (m.kind === 'close' && this.conn) this.conn.emit('close');
    }
    connect(id) {
      const c = new LocalConn(this, id); this.pending = c;
      this.ch.postMessage({ kind: 'hello', from: this.id, to: id });
      setTimeout(() => { if (!c.open) this.emit('error', { type: 'peer-unavailable' }); }, 2500);
      return c;
    }
    destroy() { if (this.conn) this.conn.close(); this.ch.close(); }
  }
  class LocalConn {
    constructor(peer, other) { this.peer = peer; this.other = other; this.open = false; this.handlers = {}; peer.conn = this; }
    on(ev, fn) { this.handlers[ev] = fn; return this; }
    emit(ev, x) { if (ev === 'open') this.open = true; if (ev === 'close') this.open = false; if (this.handlers[ev]) this.handlers[ev](x); }
    send(data) { this.peer.ch.postMessage({ kind: 'data', from: this.peer.id, to: this.other, data }); }
    close() { if (!this.open) return; this.peer.ch.postMessage({ kind: 'close', from: this.peer.id, to: this.other }); this.emit('close'); }
  }

  class NetLink {
    constructor({ test = false } = {}) {
      this.test = test;
      this.peer = null; this.conn = null;
      this.isHost = false; this.code = null;
      this.status = 'idle';
      this.listeners = {};
    }
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return () => this.off(ev, fn); }
    off(ev, fn) { this.listeners[ev] = (this.listeners[ev] || []).filter((f) => f !== fn); }
    emit(ev, x) { for (const f of (this.listeners[ev] || []).slice()) f(x); }
    setStatus(s, info) { this.status = s; this.emit('status', { status: s, info }); }

    async makePeer(id) {
      if (this.test) return new LocalPeer(id);
      const Peer = await loadPeerJs();
      return new Peer(id, { debug: 0 });
    }

    /** Crea una sala y espera a que alguien se una con el código. */
    async host(tries = 0) {
      this.isHost = true;
      this.code = randomCode();
      this.setStatus('creating');
      const peer = await this.makePeer(PREFIX + this.code);
      this.peer = peer;
      peer.on('open', () => this.setStatus('waiting', this.code));
      peer.on('connection', (c) => {
        if (this.conn && this.conn.open) { try { c.close(); } catch (e) { /* sala llena */ } return; }
        this.attach(c);
      });
      peer.on('error', (err) => {
        if (err && err.type === 'unavailable-id' && tries < 4) { this.destroyPeer(); this.host(tries + 1); return; }
        this.fail(err);
      });
      peer.on('disconnected', () => { if (this.status === 'waiting') this.setStatus('error', 'Se perdió la conexión con el servidor de salas'); });
    }

    /** Se une a la sala de otro jugador. */
    async join(code) {
      this.isHost = false;
      this.code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      if (this.code.length !== 4) { this.setStatus('error', 'El código tiene 4 letras'); return; }
      this.setStatus('joining', this.code);
      const peer = await this.makePeer();
      this.peer = peer;
      peer.on('open', () => {
        const c = this.test ? peer.connect(PREFIX + this.code) : peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' });
        this.attach(c);
      });
      peer.on('error', (err) => this.fail(err));
    }

    attach(c) {
      this.conn = c;
      c.on('open', () => { this.setStatus('connected'); this.emit('connected'); });
      c.on('data', (m) => { if (m && m.type) { this.emit('msg', m); this.emit('msg:' + m.type, m); } });
      c.on('close', () => { if (this.status !== 'closed') { this.setStatus('closed'); this.emit('closed'); } });
      c.on('error', (err) => this.fail(err));
    }

    fail(err) {
      const t = err && err.type;
      const msg = t === 'peer-unavailable' ? 'No hay ninguna sala con ese código (¿está abierta en el otro móvil?)'
        : t === 'network' || t === 'server-error' || t === 'socket-error' ? 'No se puede contactar con el servidor de salas: revisa la conexión a internet'
        : t === 'browser-incompatible' ? 'Este navegador no admite el multijugador'
        : 'Error de conexión' + (t ? ' (' + t + ')' : '');
      this.setStatus('error', msg);
      this.emit('error', msg);
    }

    get connected() { return !!(this.conn && this.conn.open); }
    send(m) { if (this.connected) { try { this.conn.send(m); } catch (e) { /* conexión caída */ } } }

    destroyPeer() { try { if (this.peer) this.peer.destroy(); } catch (e) { /* ya cerrada */ } this.peer = null; }
    close() {
      this.status = 'closed';
      try { if (this.conn) this.conn.close(); } catch (e) { /* ya cerrada */ }
      this.conn = null;
      this.destroyPeer();
      this.listeners = {};
    }
  }

  /** Pelea sincronizada por pasos. side 0 = izquierda (anfitrión), 1 = derecha (invitado). */
  class Lockstep {
    constructor({ link, match, side, seed, input, early }) {
      Object.assign(this, { link, match, side, input });
      this.gid = seed;
      this.rng = seeded(seed);
      this.tick = 0; this.acc = 0;
      this.local = new Map(); this.remote = new Map();
      this.carry = [[], []];
      this.stallMs = 0;
      this.myHash = new Map(); this.theirHash = new Map();
      this.off = link.on('msg', (m) => this.receive(m));
      // Lo que mandó el otro antes de que esta pelea arrancase aquí (iba por delante).
      for (const m of early || []) this.receive(m);
    }

    receive(m) {
      if (m.g !== this.gid) return;
      if (m.type === 'in') this.remote.set(m.t, m.i);
      else if (m.type === 'hash') { this.theirHash.set(m.t, m.h); this.compare(m.t); }
    }

    sample() {
      const h = this.input.held, a = this.input.take();
      return { l: h.left ? 1 : 0, r: h.right ? 1 : 0, u: h.up ? 1 : 0, b: h.block ? 1 : 0, a };
    }

    /** Llamar en cada fotograma con el tiempo real transcurrido. */
    frame(dt) {
      const m = this.match;
      if (m.ended) return;
      this.acc += Math.min(dt, 100);
      let steps = 0, stalled = false;
      while (this.acc >= TICK && steps < 5 && !m.ended) {
        const t = this.tick, tf = t + DELAY;
        if (!this.local.has(tf)) {
          const i = this.sample();
          this.local.set(tf, i);
          this.link.send({ type: 'in', g: this.gid, t: tf, i });
        }
        const mine = t < DELAY ? NEUTRAL : this.local.get(t);
        const theirs = t < DELAY ? NEUTRAL : this.remote.get(t);
        if (!theirs) { stalled = true; break; }
        this.step(mine, theirs);
        this.local.delete(t); this.remote.delete(t);
        this.tick++; this.acc -= TICK; steps++;
      }
      if (stalled) { this.stallMs += dt; this.acc = Math.min(this.acc, TICK * 2); } else if (steps) this.stallMs = 0;
      m.netStall = this.stallMs;
    }

    step(mine, theirs) {
      const m = this.match;
      const pair = this.side === 0 ? [mine, theirs] : [theirs, mine];
      const inputs = pair.map((x, k) => ({ l: x.l, r: x.r, u: x.u, b: x.b, a: this.carry[k].concat(x.a || []) }));
      m.netInputs = inputs; m.netConsumed = [false, false];
      Math.random = this.rng;
      try { m.update(TICK); } finally { Math.random = REAL_RANDOM; }
      // Lo pulsado durante una pausa del juego (congelado del ultimate, golpe) se guarda para el siguiente paso.
      for (const k of [0, 1]) this.carry[k] = m.netConsumed[k] ? [] : inputs[k].a.slice(-4);
      if (this.tick % 120 === 0) {
        const h = this.hash();
        this.myHash.set(this.tick, h);
        this.link.send({ type: 'hash', g: this.gid, t: this.tick, h });
        this.compare(this.tick);
      }
    }

    hash() {
      const m = this.match, r = (v) => Math.round(v * 10);
      return [m.p1.hp, m.p1.cx, m.p1.y, m.p2.hp, m.p2.cx, m.p2.y, m.timer, m.round].map(r).join(',');
    }

    compare(t) {
      if (!this.myHash.has(t) || !this.theirHash.has(t)) return;
      if (this.myHash.get(t) !== this.theirHash.get(t)) {
        this.match.netDesync = true;
        if (root.console) console.warn('[multijugador] desincronizado en el paso', t, this.myHash.get(t), this.theirHash.get(t));
      }
      this.myHash.delete(t); this.theirHash.delete(t);
    }

    stop() { if (this.off) this.off(); this.off = null; }
  }

  root.TrolinaNet = { NetLink, Lockstep, seeded, randomCode, TICK, DELAY, loadPeerJs };
})(window);
