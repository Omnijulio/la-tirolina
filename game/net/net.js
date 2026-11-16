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
 *
 * Diagnóstico (v0.12.2):
 *   - Huella del código (FINGERPRINT): si los dos móviles no tienen la misma versión del
 *     juego, no se deja pelear (una versión vieja en caché desincroniza seguro).
 *   - Cada 30 pasos (medio segundo) se compara una instantánea detallada de la pelea. Si no
 *     coincide, los dos se mandan su instantánea y el registro apunta qué campos difieren.
 *   - Registro (TrolinaNetLog): configuración, entradas de los últimos pasos, instantáneas,
 *     esperas, errores y final. Se guarda en el móvil y se puede copiar o compartir desde
 *     los resultados o desde la pantalla de Multijugador.
 *   - Si el rival termina la pelea y aquí no (desincronizado), aquí también se termina con su
 *     resultado en vez de quedarse «esperando». Sin respuesta durante 20 s, se cancela.
 */
(function (root) {
  const REAL_RANDOM = Math.random;
  root.__trolinaRealRandom = REAL_RANDOM;
  const PREFIX = 'trolina-fighters-v1-';
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const TICK = 1000 / 60;
  const DELAY = 5;
  const NEUTRAL = { l: 0, r: 0, u: 0, b: 0, a: [] };
  const HASH_EVERY = 30;       // pasos entre comprobaciones (0,5 s)
  const GIVE_UP_MS = 20000;    // sin entradas del rival durante tanto tiempo: se cancela

  /** FNV-1a de 32 bits en hexadecimal. */
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  /** Huella del código y los datos que deciden la pelea. Se calcula al cargar, antes de que nada los toque. */
  function computeFingerprint() {
    try {
      const R = root.TrolinaRules, parts = [R.GAME_VERSION];
      for (const k of Object.keys(R).sort()) { const v = R[k]; parts.push(k + '=' + (typeof v === 'function' ? v.toString() : JSON.stringify(v))); }
      for (const c of [root.Combatant, root.Match, root.BottleSystem, root.BottleAttack, root.Fighter, root.Fountain]) parts.push(c ? c.toString() : '-');
      const M = root.TrolinaMoves;
      parts.push(M ? JSON.stringify(M.ANIMS) + M.install.toString() : '-');
      parts.push(JSON.stringify(root.FIGHTER_DATA || null), JSON.stringify(root.BOTTLE_DATA || null), JSON.stringify(root.TROLINA_CHARACTERS || null));
      return fnv(parts.join('\n'));
    } catch (e) { return 'error'; }
  }
  const FINGERPRINT = computeFingerprint();

  /* ---------- Registro del multijugador ---------- */
  const NetLog = {
    KEY: 'trolina-netlog',
    cur: null,
    begin(head) {
      this.cur = { t0: Date.now(), head, lines: [], inputs: [], snaps: [] };
      this.add('INICIO', 'partida en red');
    },
    stamp() {
      if (!this.cur) return '';
      const ms = Date.now() - this.cur.t0;
      return '[' + String(Math.floor(ms / 60000)).padStart(2, '0') + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + '.' + String(ms % 1000).padStart(3, '0') + ']';
    },
    add(tag, text) {
      if (!this.cur) return;
      this.cur.lines.push(this.stamp() + ' ' + tag + ' ' + text);
      if (this.cur.lines.length > 400) this.cur.lines.splice(1, 1);
    },
    input(tick, mine, theirs) {
      if (!this.cur) return;
      const enc = (x) => (x.l ? 'L' : '·') + (x.r ? 'R' : '·') + (x.u ? 'U' : '·') + (x.b ? 'B' : '·') + (x.a && x.a.length ? ' ' + x.a.join(',') : '');
      this.cur.inputs.push(tick + '  yo ' + enc(mine) + '  | rival ' + enc(theirs));
      if (this.cur.inputs.length > 900) this.cur.inputs.shift();
    },
    snap(tick, h, s) {
      if (!this.cur) return;
      this.cur.snaps.push(tick + ' #' + h + ' ' + s);
      if (this.cur.snaps.length > 40) this.cur.snaps.shift();
    },
    text() {
      const c = this.cur;
      if (!c) return this.last() || '';
      return ['REGISTRO MULTIJUGADOR · La Trolina Fighters', c.head, '',
        '== EVENTOS ==', ...c.lines, '',
        '== ÚLTIMAS INSTANTÁNEAS (cada ' + HASH_EVERY + ' pasos) ==', ...c.snaps, '',
        '== ÚLTIMAS ENTRADAS (paso · yo · rival) ==', ...c.inputs].join('\n');
    },
    save() {
      if (!this.cur) return;
      try { localStorage.setItem(this.KEY, this.text().slice(-250000)); } catch (e) { /* sin espacio */ }
    },
    last() { try { return localStorage.getItem(this.KEY); } catch (e) { return null; } }
  };
  root.addEventListener('error', (e) => {
    if (NetLog.cur && NetLog.active) { NetLog.add('ERROR', (e.message || e) + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : '')); NetLog.save(); }
  });

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
    constructor({ link, match, side, seed, input, early, head }) {
      Object.assign(this, { link, match, side, input });
      this.gid = seed;
      // Azar común con contador: si los dos móviles gastan distinto número de tiradas, se ve en el registro.
      const base = seeded(seed);
      this.rngCalls = 0;
      this.rng = () => { this.rngCalls++; return base(); };
      this.snaps = new Map(); this.firstDesync = -1; this.peerEnd = null; this.stallLogged = false;
      this.onPeerEnd = null; this.onGiveUp = null;
      NetLog.begin(head || '');
      NetLog.active = true;
      NetLog.add('VERSION', (root.TrolinaRules && root.TrolinaRules.GAME_VERSION) + ' · huella ' + FINGERPRINT + ' · lado ' + (side === 0 ? 'anfitrión (izquierda)' : 'invitado (derecha)') + ' · semilla ' + seed);
      NetLog.add('MOVIL', (navigator.userAgent || '?').slice(0, 160));
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
      else if (m.type === 'dump') this.theirDump(m);
      else if (m.type === 'end') {
        this.peerEnd = { t: m.t, wins: m.wins };
        NetLog.add('RIVAL', 'ha terminado la pelea en el paso ' + m.t + ' (' + (m.wins || []).join('-') + '); aquí vamos por el ' + this.tick + (this.match.ended ? ' (también terminada)' : ''));
        NetLog.save();
      }
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
      if (stalled) {
        this.stallMs += dt; this.acc = Math.min(this.acc, TICK * 2);
        if (this.stallMs > 400 && !this.stallLogged) { this.stallLogged = true; NetLog.add('ESPERA', 'sin entradas del rival en el paso ' + this.tick + (this.remote.size ? ' (hay ' + this.remote.size + ' pasos suyos más adelante)' : '')); }
        // El rival ya terminó y no van a llegar más entradas: aquí la pelea va por otro lado.
        if (this.peerEnd && !m.ended && this.onPeerEnd) {
          NetLog.add('FIN', 'el rival terminó y aquí no: partida desincronizada, se cierra con su resultado');
          m.netDesync = true; NetLog.save();
          const pe = this.peerEnd; this.peerEnd = null;
          this.onPeerEnd(pe);
          return;
        }
        if (this.stallMs > GIVE_UP_MS && this.onGiveUp) {
          NetLog.add('FIN', 'el rival no responde desde hace ' + Math.round(this.stallMs / 1000) + ' s (paso ' + this.tick + ')');
          NetLog.save();
          const f = this.onGiveUp; this.onGiveUp = null; f();
          return;
        }
      } else if (steps) {
        if (this.stallLogged) NetLog.add('ESPERA', 'se reanuda tras ' + Math.round(this.stallMs) + ' ms (paso ' + this.tick + ')');
        this.stallMs = 0; this.stallLogged = false;
      }
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
      NetLog.input(this.tick, mine, theirs);
      if (this.tick % HASH_EVERY === 0) {
        const s = this.snapshot(), h = fnv(s);
        this.myHash.set(this.tick, h);
        this.snaps.set(this.tick, s);
        if (this.snaps.size > 24) this.snaps.delete(this.snaps.keys().next().value);
        NetLog.snap(this.tick, h, s);
        this.link.send({ type: 'hash', g: this.gid, t: this.tick, h });
        this.compare(this.tick);
      }
    }

    /** Estado detallado de la pelea en este paso (lo que se compara entre los dos móviles). */
    snapshot() {
      const m = this.match, r = (v, d) => (typeof v === 'number' ? Number(v.toFixed(d === undefined ? 2 : d)) : v);
      const f = (c) => ['hp=' + r(c.hp), 'x=' + r(c.cx), 'y=' + r(c.y), 'vx=' + r(c.vx), 'vy=' + r(c.vy), 'fu=' + r(c.fuelle),
        'st=' + c.state, 'an=' + c.f.animation + ':' + c.f.frameIndex, 'hs=' + r(c.hitstun, 0), 'bs=' + r(c.blockstun, 0),
        'dz=' + r(c.dizzyT, 0), 'dw=' + r(c.downT + c.getupT, 0), 'da=' + r(c.dashT, 0), 'gu=' + (c.guard ? 1 : 0),
        'am=' + c.ammo, 'me=' + r(c.meter, 1), 'co=' + c.combo, 'fa=' + c.facing].join(' ');
      const b = (m.bottles.projectiles || []).filter((p) => p.alive).map((p) => r(p.x, 0) + '/' + r(p.y, 0)).join(',');
      return ['t=' + this.tick, 'rng=' + this.rngCalls, 'fase=' + m.phase, 'reloj=' + r(m.timer), 'asalto=' + m.round, 'gana=' + m.wins.join('-'),
        'bot=[' + b + ']', 'dardos=' + m.darts.length, 'agarre=' + (m.throwing ? 1 : 0) + (m.grab ? 'p' : ''),
        '| P1 ' + f(m.p1), '| P2 ' + f(m.p2)].join(' ');
    }

    compare(t) {
      if (!this.myHash.has(t) || !this.theirHash.has(t)) return;
      if (this.myHash.get(t) !== this.theirHash.get(t)) {
        this.match.netDesync = true;
        if (root.console) console.warn('[multijugador] desincronizado en el paso', t, this.myHash.get(t), this.theirHash.get(t));
        if (this.firstDesync < 0) {
          // Primera vez: se apunta y se manda la instantánea para ver qué difiere.
          this.firstDesync = t;
          NetLog.add('DESINCRONIZADO', 'en el paso ' + t + ' (' + this.myHash.get(t) + ' aquí, ' + this.theirHash.get(t) + ' en el rival)');
          NetLog.add('MIA', this.snaps.get(t) || '?');
          this.link.send({ type: 'dump', g: this.gid, t, s: this.snaps.get(t) || '' });
          NetLog.save();
        }
      }
      this.myHash.delete(t); this.theirHash.delete(t);
    }

    theirDump(m) {
      NetLog.add('SUYA', 'paso ' + m.t + ': ' + m.s);
      const mine = this.snaps.get(m.t);
      if (mine) {
        // Campo a campo: lo que no coincide.
        const parse = (s) => { const out = {}; let who = ''; for (const tok of String(s).split(' ')) { if (tok === 'P1' || tok === 'P2') who = tok + '.'; else if (tok.includes('=')) { const i = tok.indexOf('='); out[who + tok.slice(0, i)] = tok.slice(i + 1); } } return out; };
        const a = parse(mine), b = parse(m.s), diff = [];
        for (const k of Object.keys(a)) if (a[k] !== b[k]) diff.push(k + ': aquí ' + a[k] + ' / rival ' + b[k]);
        NetLog.add('DIFERENCIAS', diff.length ? diff.join(' · ') : 'ninguna en lo apuntado');
      }
      // Si el rival detectó la diferencia antes, también mandamos la nuestra.
      if (this.firstDesync < 0) { this.firstDesync = m.t; this.match.netDesync = true; if (mine) this.link.send({ type: 'dump', g: this.gid, t: m.t, s: mine }); }
      NetLog.save();
    }

    stop(reason) {
      if (this.off) this.off();
      this.off = null;
      NetLog.add('FIN', (reason || 'pelea terminada') + ' en el paso ' + this.tick + ' · tiradas de azar ' + this.rngCalls + (this.firstDesync >= 0 ? ' · DESINCRONIZADA desde el paso ' + this.firstDesync : ' · sincronizada'));
      NetLog.active = false;
      NetLog.save();
    }
  }

  root.TrolinaNet = { NetLink, Lockstep, seeded, randomCode, TICK, DELAY, loadPeerJs, FINGERPRINT, fnv, computeFingerprint };
  root.TrolinaNetLog = NetLog;
})(window);
