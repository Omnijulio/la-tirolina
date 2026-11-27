/* Arranque, bucle principal y flujo entre pantallas. */
(function (root) {
  const R = root.TrolinaRules, Save = root.TrolinaSave, Sfx = root.TrolinaSfx, UI = root.TrolinaUI;
  const params = new URLSearchParams(root.location.search);

  const Game = {
    params,
    assets: { characters: {}, portraits: {}, extras: {}, unarmed: {}, weapons: {}, stage: {}, bottle: null, fountain: null, jardinera: null },
    stageCache: {},
    match: null, paused: false, last: null,
    session: { mode: 'quick', p1: 'barbas', p2: null, difficulty: 'normal', order: {}, cpuOrder: {}, storyIndex: 0 },

    charById(id) { return root.TROLINA_CHARACTERS.find((c) => c.id === id); },

    async boot() {
      Save.load();
      this.save = Save;
      this.session.difficulty = Save.data.difficulty;
      this.session.p1 = Save.isUnlocked(Save.data.selected) ? Save.data.selected : 'barbas';
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.input = new root.TrolinaInput();
      this.input.onPause = () => this.togglePause();
      this.input.bindTouch(document.getElementById('touch'));
      document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
      const unlock = () => Sfx.unlock();
      root.addEventListener('pointerdown', unlock, { capture: true });
      root.addEventListener('keydown', unlock, { capture: true });
      root.addEventListener('resize', () => this.layout());
      root.addEventListener('orientationchange', () => setTimeout(() => this.layout(), 200));
      document.addEventListener('visibilitychange', () => {
        this.last = null;
        if (document.hidden && this.match && !this.match.ended && !this.paused && !this.lockstep) this.pause();
      });
      this.applySettings();
      this.setupFullscreen();
      UI.init(this);
      UI.show('loading');
      try {
        await this.loadAssets((k) => {
          const bar = document.getElementById('loadbar');
          if (bar) bar.style.width = Math.round(k * 100) + '%';
        });
      } catch (err) {
        const t = document.getElementById('loadtxt');
        if (t) t.textContent = 'No se pudo cargar: ' + err.message;
        throw err;
      }
      this.attract = this.makeAttract();
      if (root.TrolinaHub) { try { root.TrolinaHub.init(); } catch (e) { console.warn('Menú del bar:', e); } }
      if (this.onlineRanking()) this.onlineRanking().flush(Save).catch(() => {});
      requestAnimationFrame((t) => this.loop(t));
      if (params.has('autoplay')) this.debugQuick(true);
      else if (params.get('sala')) UI.show('online', { join: params.get('sala') });
      else if (params.get('screen')) this.debugScreen(params.get('screen'));
      else UI.show('title');
    },

    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(src));
        img.src = src;
      });
    },

    async loadAssets(onProgress) {
      const jobs = [];
      for (const layer of root.TERRACE_STAGE_DATA.layers) jobs.push([layer.image, (img) => { this.assets.stage[layer.id] = img; }]);
      jobs.push([root.BOTTLE_DATA.image, (img) => { this.assets.bottle = img; }]);
      for (const c of root.TROLINA_CHARACTERS) jobs.push([c.atlas, (img) => { this.assets.characters[c.id] = img; }]);
      // Retratos propios (personajes con arte propio, assets/characters/art-data.js).
      for (const [id, art] of Object.entries(root.TROLINA_CHARACTER_ART || {})) {
        if (art.portrait) jobs.push([art.portrait, (img) => { this.assets.portraits[id] = img; }]);
        // Segunda hoja (ultimate, entrada en patinete), humo y patinete suelto.
        const ex = art.extras;
        if (ex) {
          const box = this.assets.extras[id] = {};
          jobs.push([ex.image, (img) => { box.sheet = img; }]);
          if (ex.smoke) jobs.push([ex.smoke.image, (img) => { box.smoke = img; }]);
          if (ex.scooter) jobs.push([ex.scooter.image, (img) => { box.scooter = img; }]);
          if (art.weapon && art.weapon.puff) jobs.push([art.weapon.puff.image, (img) => { box.puff = img; }]);
        }
        // Arma dibujada (v0.15): su atlas sin ella.
        if (art.weapon && art.weapon.unarmed) jobs.push([art.weapon.unarmed, (img) => { this.assets.unarmed[id] = img; }]);
      }
      // Armas sueltas (al caer, en la mano de quien no la tiene dibujada) y sus iconos.
      for (const [wid, wa] of Object.entries(root.TROLINA_WEAPON_ART || {})) {
        const box = this.assets.weapons[wid] = { grip: wa.grip, size: wa.size || null };
        jobs.push([wa.image, (img) => { box.img = img; }]);
        if (wa.hud) jobs.push([wa.hud, (img) => { box.hud = img; }]);
      }
      if (root.TROLINA_FOUNTAIN_DATA) {
        this.assets.fountain = {};
        for (const [k, src] of Object.entries(root.TROLINA_FOUNTAIN_DATA.images)) jobs.push([src, (img) => { this.assets.fountain[k] = img; }]);
      }
      if (root.TROLINA_STAGE_EXTRAS) jobs.push([root.TROLINA_STAGE_EXTRAS.jardinera, (img) => { this.assets.jardinera = img; }]);
      // Efectos e iconos del arte de Combate 2.0 (si faltan, el combate dibuja los suyos).
      if (root.TROLINA_COMBAT_FX) {
        this.assets.combatFx = {}; this.assets.combatUi = {};
        for (const [k, src] of Object.entries(root.TROLINA_COMBAT_FX.images)) jobs.push([src, (img) => { this.assets.combatFx[k] = img; }]);
        for (const [k, src] of Object.entries(root.TROLINA_COMBAT_FX.ui)) jobs.push([src, (img) => { this.assets.combatUi[k] = img; }]);
      }
      // Menú del bar: las vistas de la hora actual, las siluetas y los halos. Si algo falla,
      // el juego arranca igual con el menú de siempre (Hub.init devuelve false).
      const Hub = root.TrolinaHub;
      const hubJobs = Hub ? Hub.jobs(this, Hub.hourFor(params.get('hora') || Save.data.settings.menuHour)) : [];
      if (root.POLICE_DATA) {
        this.assets.police = {};
        jobs.push([root.POLICE_DATA.officer.image, (img) => { this.assets.police.officer = img; }]);
        jobs.push([root.POLICE_DATA.patrol.image, (img) => { this.assets.police.patrol = img; }]);
      }
      let done = 0;
      const all = jobs.length + hubJobs.length;
      await Promise.all(jobs.map(([src, set]) => this.loadImage(src).then((img) => { set(img); onProgress(++done / all); }))
        .concat(hubJobs.map(([src, set]) => this.loadImage(src).then(set, () => console.warn('Menú del bar: no se pudo cargar ' + src)).then(() => onProgress(++done / all)))));
      this.stageCache.noche = this.assets.stage;
    },

    /** ¿Sale el montón de botellines en la jardinera? (opción, o siempre en el Modo salvaje) */
    jardinera() {
      if (this.session.mode === 'online') return !!(this.netCfg && this.netCfg.jardinera);
      return !!(Save.data.settings.jardinera || this.session.wild);
    },

    stageById(id) { return (root.TROLINA_STAGES || []).find((s) => s.id === id) || { id: 'noche', name: 'Noche', night: true, weather: null }; },

    /** Carga (una vez) las capas de un ambiente (las tres de la terraza o las del interior). Si falla, se queda la noche. */
    loadStage(id) {
      if (this.stageCache[id]) return Promise.resolve(this.stageCache[id]);
      const st = this.stageById(id), imgs = {};
      const jobs = Object.entries(st.layers || {}).map(([k, src]) => this.loadImage(src).then((img) => { imgs[k] = img; }));
      return Promise.all(jobs).then(() => (this.stageCache[id] = imgs)).catch(() => this.assets.stage);
    },

    /** Escenario (terraza o interior del bar) y ambiente, según Opciones. Para probar: ?stage=interior-apagado. */
    pickStage() {
      const stages = root.TROLINA_STAGES || [{ id: 'noche' }], ids = stages.map((s) => s.id);
      return params.get('stage') && ids.includes(params.get('stage')) ? params.get('stage') : R.pickArena(Save.data.settings, stages);
    },

    applySettings() {
      const st = Save.data.settings;
      Sfx.enabled = !!st.sound;
      Sfx.setVolume(st.volume);
      this.layout();
    },

    layout() {
      const b = document.body;
      const portrait = root.innerHeight > root.innerWidth;
      b.classList.toggle('portrait', portrait);
      b.classList.toggle('landscape', !portrait);
      const mode = Save.data.settings.touch;
      const coarse = root.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in root;
      b.classList.toggle('touch', mode === 'always' || (mode === 'auto' && coarse));
    },

    /**
     * Botón de pantalla completa siempre visible (en todas las pantallas, también peleando)
     * mientras no esté a pantalla completa. En iPhone, el navegador no lo permite: explica
     * cómo añadir el juego a la pantalla de inicio, que se abre a pantalla completa.
     */
    setupFullscreen() {
      const btn = document.getElementById('fsBtn');
      if (!btn) return;
      const doc = document;
      const canFs = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
      const standalone = () => (root.matchMedia && root.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) || root.navigator.standalone === true;
      const update = () => {
        const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement) || standalone();
        btn.hidden = isFs;
        doc.body.classList.toggle('is-fullscreen', isFs);
      };
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        Sfx.unlock();
        if (canFs) this.toggleFullscreen(); else this.showFullscreenHelp();
      });
      for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) doc.addEventListener(ev, () => { update(); this.layout(); });
      root.addEventListener('resize', update);
      update();
    },

    showFullscreenHelp() {
      if (document.querySelector('.fs-help')) return;
      const box = document.createElement('div');
      box.className = 'fs-help';
      box.innerHTML = '<div><b>Pantalla completa en iPhone</b><p>Safari no deja poner una web a pantalla completa. Pulsa <b>Compartir</b> (el cuadrado con la flecha) → <b>Añadir a pantalla de inicio</b> y abre La Trolina desde ese icono: se verá a pantalla completa y en horizontal.</p><button class="primary">Entendido</button></div>';
      box.addEventListener('click', () => box.remove());
      document.body.append(box);
    },

    toggleFullscreen() {
      const doc = document, el = document.documentElement;
      const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
      try {
        if (isFs) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
        else {
          const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
          if (p && p.then) p.then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {});
        }
      } catch (e) { /* no disponible */ }
    },

    /* ---------- flujo ---------- */

    beginStory(skipSelect) {
      const d = Save.data;
      if (d.story.stage >= root.TROLINA_STORY.length) d.story.stage = 0;
      Object.assign(this.session, { mode: 'story', wild: false, storyIndex: d.story.stage, p2: root.TROLINA_STORY[d.story.stage], difficulty: d.difficulty });
      if (skipSelect) UI.show('barra'); else UI.show('select', { step: 'p1' });
    },

    beginQuick() {
      Object.assign(this.session, { mode: 'quick', wild: false, difficulty: Save.data.difficulty });
      UI.show('select', { step: 'p1' });
    },

    /** Modo salvaje (experimental): pelea rápida con caos desde el segundo 30. */
    beginWild() {
      Object.assign(this.session, { mode: 'quick', wild: true, difficulty: Save.data.difficulty });
      UI.show('select', { step: 'p1' });
    },

    /** Personaje en el calabozo (devuelve el que lo esté, o null). */
    jailed(...ids) { return ids.map((id) => this.charById(id)).find((c) => c && Save.jailLeft(c.id) > 0) || null; },

    /** Tras pagar en la barra: pedido de la CPU, cinemática (si hay) y pantalla VS. */
    preFight() {
      const s = this.session;
      s.cpuOrder = R.cpuOrder(s.difficulty, this.charById(s.p2));
      s.fountain = R.pickFountain(Save.data.settings.fountain, Save.data.settings.fountainLight);
      s.stage = this.pickStage();
      const loading = this.loadStage(s.stage);
      const cine = root.TROLINA_CINEMATICS || {};
      const scenes = (s.mode === 'story' && cine['story-' + s.storyIndex]) || cine['vs-' + s.p2];
      const vs = () => loading.then(() => UI.show('vs', { onDone: () => this.startMatch() }));
      if (scenes && scenes.length) UI.show('cinematic', { scenes, onDone: vs });
      else vs();
    },

    /** Arma elegida en pruebas para un lado ('p1' | 'p2'): undefined = la suya; null = ninguna. */
    devWeapon(side) {
      const s = this.session, w = s.mode !== 'online' && s.weapon ? s.weapon[side] : undefined;
      if (side === 'p2' && s.mode === 'story') return undefined;
      return w === undefined ? undefined : (w === 'none' ? null : w);
    },

    startMatch() {
      const s = this.session, d = Save.data;
      const c1 = this.charById(s.p1), c2 = this.charById(s.p2);
      const items = root.TROLINA_BAR_ITEMS, ups = root.TROLINA_UPGRADES;
      if (!s.stage) s.stage = 'noche';
      const loaded = this.stageCache[s.stage];
      const stage = loaded ? this.stageById(s.stage) : this.stageById('noche');
      const jardinera = this.jardinera();
      this.match = new root.Match({
        assets: this.assets,
        stage, stageImages: loaded || this.assets.stage,
        jardinera,
        p1: { character: c1, weapon: this.devWeapon('p1'), loadout: R.computeLoadout(c1, s.order, d.upgrades, items, ups, { wild: s.wild, jardinera }) },
        p2: { character: c2, weapon: this.devWeapon('p2'), loadout: R.computeLoadout(c2, s.cpuOrder, {}, items, ups, { wild: s.wild, jardinera, slots: R.cpuSlots(s.difficulty) }) },
        wild: !!s.wild,
        difficulty: s.difficulty,
        input: this.input, sfx: Sfx, settings: d.settings,
        autoplay: params.has('autoplay'),
        timeScale: Number(params.get('fast')) || 1,
        police: d.settings.police !== false,
        fountain: s.fountain || (s.fountain = R.pickFountain(d.settings.fountain, d.settings.fountainLight)),
        onEnd: (r) => this.endMatch(r),
        onPolice: (info) => this.onPolice(info)
      });
      this.paused = false;
      this.input.capture = true;
      this.input.releaseAll();
      document.body.classList.add('fighting');
      document.body.classList.toggle('no-special', !c1.special);
      document.body.classList.toggle('no-smoke', !this.match.p1.loadout.cigs);
      if (c1.special) document.querySelector('#specialBtn span').textContent = c1.special.short;
      this.touchHud = {};
      UI.hide();
    },

    restartMatch() { this.startMatch(); },

    endMatch(result) {
      const s = this.session, d = Save.data;
      document.body.classList.remove('fighting');
      this.input.capture = false;
      if (this.match) this.match.banner = null;
      const story = s.mode === 'story';
      const rival = this.charById(s.p2);
      const firstClear = story && result.won && !d.story.cleared.includes(s.storyIndex);
      const reward = R.matchReward({ ...result, boss: story && rival.boss, firstClear });
      const score = R.finalScore({ raw: result.score, won: result.won, difficulty: result.difficulty, wild: result.wild });
      const entry = { char: s.p1, mode: story ? 'story' : s.wild ? 'wild' : 'quick', difficulty: result.difficulty, won: result.won, rounds: result.roundsWon + '-' + result.roundsLost };
      Save.earn(reward.total);
      if (result.won) d.stats.wins++; else d.stats.losses++;
      d.police.strikes = 0; // terminar una pelea corta la racha de intervenciones
      let unlocked = null, storyFinished = false;
      if (story && result.won) {
        if (Save.unlock(rival.id)) unlocked = rival.id;
        if (firstClear) d.story.cleared.push(s.storyIndex);
        d.story.stage = s.storyIndex + 1;
        if (d.story.stage >= root.TROLINA_STORY.length) { d.story.completed = true; d.story.stage = 0; storyFinished = true; }
      }
      Save.save();
      this.lastResult = { result, reward, unlocked, storyFinished, score, entry };
      UI.show('results', this.lastResult);
    },

    /** La Policía Local ha parado la pelea: multa o calabozo. */
    onPolice(info) {
      const d = Save.data;
      document.body.classList.remove('fighting');
      this.input.capture = false;
      if (this.match) this.match.banner = null;
      const outcome = R.policeOutcome((d.police.strikes || 0) + 1);
      let paid = 0;
      if (outcome.jail) {
        d.police.strikes = 0;
        d.stats.nightsInJail++;
        Save.jail([...new Set([info.p1.id, info.p2.id])], outcome.jailMs);
      } else {
        d.police.strikes = outcome.strike;
        paid = Save.payFine(outcome.fine);
      }
      Save.save();
      this.lastPolice = { outcome, paid, p1: info.p1, p2: info.p2 };
      UI.show('police', this.lastPolice);
    },

    leaveMatch() {
      this.match = null; this.paused = false;
      this.input.capture = false;
      document.body.classList.remove('fighting');
    },

    pause() {
      if (!this.match || this.match.ended) return;
      this.paused = true; this.input.releaseAll();
      UI.show('pause');
    },
    resume() { this.paused = false; this.last = null; this.input.releaseAll(); UI.hide(); },
    togglePause() {
      if (!this.match || this.match.ended || this.lockstep) return;   // en el multijugador no se pausa
      if (this.paused) { if (UI.current === 'pause') this.resume(); } else this.pause();
    },

    /** Carga del ultimate y cigarrillos en los botones táctiles (solo si cambian). */
    updateTouchHud() {
      const p = this.match.viewer || this.match.p1, h = this.touchHud || (this.touchHud = {});
      const charge = Math.floor(p.meter);
      if (h.charge !== charge) {
        h.charge = charge;
        const btn = document.getElementById('specialBtn');
        btn.style.setProperty('--charge', charge);
        btn.classList.toggle('ready', p.meterFull);
      }
      if (h.cigs !== p.cigs) { h.cigs = p.cigs; document.getElementById('cigCount').textContent = p.cigs; }
    },

    /* ---------- ranking ---------- */

    /** Guarda una puntuación con nombre. Devuelve { position, bonus } o { error }. */
    saveRanking(name, total, entry) {
      const clean = R.cleanName(name);
      if (!clean) return { error: 'Escribe un nombre (hasta 14 letras)' };
      const rk = Save.ranking, online = this.onlineRanking();
      const e = { ...entry, name: clean, score: Math.round(total), at: Date.now() };
      const { list, position } = R.rankInsert(rk.list, e);
      if (!position && !online) return { error: 'Esta vez no entra en el ranking' };
      if (position) rk.list = list;
      rk.name = clean; rk.lastAt = e.at;
      let upload = null;
      if (online) {
        // Se apunta como pendiente y se sube; si no hay conexión, se reintenta más tarde.
        rk.pending = (rk.pending || []).concat([e]);
        upload = online.flush(Save);
      }
      Save.saveRanking();
      const bonus = R.SCORE.signBonusCents;
      Save.earn(bonus);
      Save.save();
      return { position, bonus, upload };
    },

    /** El ranking compartido, si está configurado (game/data/online-config.js). */
    onlineRanking() {
      const o = root.TrolinaOnlineRanking;
      return o && o.enabled ? o : null;
    },

    /* ---------- multijugador (experimental) ---------- */

    /** Abre una conexión nueva (la pantalla de sala decide si crear o unirse). */
    netOpen() {
      if (this.net) this.net.close();
      const net = new root.TrolinaNet.NetLink({ test: params.has('nettest') });
      this.net = net;
      this.netEarly = [];
      net.on('msg', (m) => this.onNetMsg(m));
      net.on('closed', () => { if (this.net === net) this.onNetClosed('Se ha cortado la conexión con tu rival'); });
      return net;
    },

    /** ¿El rival tiene el mismo juego? Con versiones distintas la pelea se desincroniza seguro. */
    netCheckVersion(m) {
      const N = root.TrolinaNet;
      if (m.fp === N.FINGERPRINT) return true;
      const mine = R.GAME_VERSION, theirs = m.v || 'anterior a 0.12.2';
      if (root.TrolinaNetLog) { root.TrolinaNetLog.begin('Versión distinta'); root.TrolinaNetLog.add('VERSION', 'aquí ' + mine + ' (' + N.FINGERPRINT + '), rival ' + theirs + ' (' + (m.fp || '?') + ')'); root.TrolinaNetLog.save(); }
      if (this.net) this.net.send({ type: 'bye', reason: 'version', v: mine });
      this.onNetClosed(mine === theirs
        ? 'Tu rival tiene el juego a medio actualizar. Recargad la página en los dos móviles y volved a crear la sala.'
        : 'Tu rival tiene otra versión del juego (' + theirs + '; tú, ' + mine + '). Recargad la página en los dos móviles y volved a crear la sala.');
      return false;
    },

    onNetMsg(m) {
      if (m.type === 'hello') { this.netCheckVersion(m); return; }
      if (m.type === 'end' || m.type === 'dump') {
        // Lo recibe el propio Lockstep si la pelea está en marcha.
        if (!this.lockstep) { this.netEarly.push(m); if (this.netEarly.length > 900) this.netEarly.shift(); }
        return;
      }
      if (m.type === 'in' || m.type === 'hash') {
        // Inputs que llegan antes de que la pelea arranque en este móvil: se guardan.
        if (!this.lockstep) { this.netEarly.push(m); if (this.netEarly.length > 900) this.netEarly.shift(); }
        return;
      }
      if (m.type === 'ready') { if (!this.netCheckVersion(m)) return; this.netTheirReady = m; this.netMaybeStart(); UI.netUpdate && UI.netUpdate(); }
      else if (m.type === 'start' && !this.net.isHost) this.startNetMatch(m.cfg);
      else if (m.type === 'again') { this.netTheirAgain = true; this.netMaybeAgain(); UI.netUpdate && UI.netUpdate(); }
      else if (m.type === 'bye') this.onNetClosed(m.reason === 'version' ? 'Tu rival tiene otra versión del juego (' + (m.v || '?') + '; tú, ' + R.GAME_VERSION + '). Recargad la página en los dos móviles y volved a crear la sala.' : 'Tu rival ha salido de la sala');
    },

    /** Ya conectados: cada uno elige luchador y pide en la barra (gratis). */
    netEnter() {
      const s = this.session;
      if (this.netMyChar) s.p1 = this.netMyChar;
      Object.assign(s, { mode: 'online', wild: false, p2: null });
      if (this.net) this.net.send({ type: 'hello', v: R.GAME_VERSION, fp: root.TrolinaNet.FINGERPRINT });
      this.netMyReady = null; this.netTheirReady = null; this.netMyAgain = false; this.netTheirAgain = false;
      this.match = null; this.lockstep = null;
      UI.show('select', { step: 'p1' });
    },

    netReady(order) {
      const s = this.session, d = Save.data, c = this.charById(s.p1);
      const loadout = R.computeLoadout(c, order, d.upgrades, root.TROLINA_BAR_ITEMS, root.TROLINA_UPGRADES, {});
      this.netMyChar = s.p1;
      this.netMyReady = { type: 'ready', char: s.p1, order: loadout.order, loadout, v: R.GAME_VERSION, fp: root.TrolinaNet.FINGERPRINT };
      this.net.send(this.netMyReady);
      UI.show('netwait', {});
      this.netMaybeStart();
    },

    /** El anfitrión decide ambiente, fuente y semilla cuando los dos están listos. */
    netMaybeStart() {
      if (!this.net || !this.net.isHost || !this.netMyReady || !this.netTheirReady) return;
      const st = Save.data.settings;
      const cfg = {
        seed: Math.floor(Math.random() * 2147483647),
        stage: this.pickStage(),
        fountain: R.pickFountain(st.fountain, st.fountainLight),
        jardinera: !!st.jardinera,
        p1: { char: this.netMyReady.char, order: this.netMyReady.order, loadout: this.netMyReady.loadout },
        p2: { char: this.netTheirReady.char, order: this.netTheirReady.order, loadout: this.netTheirReady.loadout }
      };
      this.net.send({ type: 'start', cfg });
      this.startNetMatch(cfg);
    },

    startNetMatch(cfg) {
      const s = this.session;
      this.netCfg = cfg; this.netMyReady = null; this.netTheirReady = null;
      this.netEarly = (this.netEarly || []).filter((m) => m.g === cfg.seed);
      Object.assign(s, { mode: 'online', p1: cfg.p1.char, p2: cfg.p2.char, order: cfg.p1.order, cpuOrder: cfg.p2.order, stage: cfg.stage, fountain: cfg.fountain, wild: false });
      this.loadStage(cfg.stage).then(() => UI.show('vs', { onDone: () => this.beginNetFight() }));
    },

    beginNetFight() {
      if (!this.net || !this.net.connected) return this.onNetClosed('Se ha cortado la conexión con tu rival');
      const cfg = this.netCfg, d = Save.data, side = this.net.isHost ? 0 : 1;
      const lo = (x) => { const l = JSON.parse(JSON.stringify(x.loadout)); if (cfg.jardinera) l.ammo += R.JARDINERA_AMMO; return l; };
      const c1 = this.charById(cfg.p1.char), c2 = this.charById(cfg.p2.char);
      this.match = new root.Match({
        assets: this.assets,
        // La info del ambiente (lluvia, nieve…) es la misma en los dos; si una imagen falla, se ve la noche.
        stage: this.stageById(cfg.stage), stageImages: this.stageCache[cfg.stage] || this.assets.stage,
        jardinera: cfg.jardinera,
        p1: { character: c1, loadout: lo(cfg.p1) },
        p2: { character: c2, loadout: lo(cfg.p2) },
        wild: false, difficulty: 'normal',
        input: null, sfx: Sfx, settings: d.settings,
        police: false, fountain: cfg.fountain,
        net: { side },
        onEnd: (r) => this.endNetMatch(r)
      });
      const head = 'Ambiente ' + cfg.stage + ' · fuente ' + (cfg.fountain.on ? 'encendida' : 'apagada') + ' · jardinera ' + (cfg.jardinera ? 'sí' : 'no') +
        ' · P1 ' + cfg.p1.char + ' ' + JSON.stringify(cfg.p1.order) + ' · P2 ' + cfg.p2.char + ' ' + JSON.stringify(cfg.p2.order);
      this.lockstep = new root.TrolinaNet.Lockstep({ link: this.net, match: this.match, side, seed: cfg.seed, input: this.input, early: this.netEarly, head });
      this.netEarly = [];
      // El rival terminó y aquí no (desincronizado): se acaba con su resultado para no quedarse esperando.
      this.lockstep.onPeerEnd = (pe) => {
        const m = this.match;
        if (!m || m.ended) return;
        m.ended = true; m.netDesync = true;
        this.endNetMatch({ ...m.result(), wins: pe.wins && pe.wins.length === 2 ? pe.wins.slice() : m.wins.slice() }, true);
      };
      this.lockstep.onGiveUp = () => this.onNetClosed('Tu rival no responde desde hace 20 s. La partida se ha cancelado.');
      this.paused = false;
      this.input.capture = true; this.input.releaseAll(); this.input.clear();
      document.body.classList.add('fighting', 'online');
      const me = side === 0 ? c1 : c2;
      document.body.classList.toggle('no-special', !me.special);
      document.body.classList.toggle('no-smoke', !this.match.viewer.loadout.cigs);
      if (me.special) document.querySelector('#specialBtn span').textContent = me.special.short;
      this.touchHud = {};
      UI.hide();
    },

    endNetMatch(r, forced) {
      const side = this.net && this.net.isHost ? 0 : 1;
      // Aviso al rival: si su pelea no ha terminado, está desincronizada y terminará con este resultado.
      if (!forced && this.net && this.lockstep) this.net.send({ type: 'end', g: this.netCfg.seed, t: this.lockstep.tick, wins: r.wins });
      if (this.lockstep) this.lockstep.stop(forced ? 'cerrada con el resultado del rival' : 'pelea terminada');
      this.lockstep = null;
      document.body.classList.remove('fighting');
      this.input.capture = false;
      if (this.match) this.match.banner = null;
      const mine = r.wins[side], theirs = r.wins[1 - side];
      const d = Save.data;
      d.stats.online = d.stats.online || { wins: 0, losses: 0 };
      if (mine > theirs) d.stats.online.wins++; else if (theirs > mine) d.stats.online.losses++;
      Save.save();
      const score = R.finalScore({ raw: r.score, won: mine > theirs, online: true });
      const rival = this.charById(side === 0 ? this.netCfg.p2.char : this.netCfg.p1.char);
      const entry = { char: side === 0 ? this.netCfg.p1.char : this.netCfg.p2.char, mode: 'online', difficulty: 'online', won: mine > theirs, rounds: mine + '-' + theirs, vs: rival ? rival.name : '' };
      UI.show('netresults', { mine, theirs, desync: this.match && this.match.netDesync, forced: !!forced, score, entry });
    },

    netAgain() {
      this.netMyAgain = true;
      if (this.net) this.net.send({ type: 'again' });
      this.netMaybeAgain();
    },
    netMaybeAgain() {
      if (this.netMyAgain && this.netTheirAgain) this.netEnter();
    },

    /** Salir del multijugador (avisa al otro). */
    netLeave() {
      const net = this.net;
      this.net = null;
      if (net) { net.send({ type: 'bye' }); setTimeout(() => net.close(), 200); }
      this.netCleanup();
      UI.show('title');
    },
    netCleanup() {
      if (this.lockstep) this.lockstep.stop('salida de la sala');
      this.lockstep = null;
      if (this.session.mode === 'online') { this.match = null; this.session.mode = 'quick'; }
      this.netMyChar = null; this.netCfg = null;
      this.input.capture = false;
      document.body.classList.remove('fighting', 'online');
    },
    onNetClosed(msg) {
      const net = this.net;
      this.net = null;
      if (net) net.close();
      this.netCleanup();
      UI.show('title');
      UI.toast(msg);
    },

    /* ---------- fondo animado de los menús ---------- */

    makeAttract() {
      const data = root.BottleAttack.install(root.FIGHTER_DATA);
      const ids = root.TROLINA_CHARACTERS.map((c) => c.id);
      const a = new root.Fighter(this.assets.characters.barbas, data, { x: 290, y: 486, scale: 2 });
      const b = new root.Fighter(this.assets.characters[ids[1 + Math.floor(Math.random() * (ids.length - 1))]], data, { x: 700, y: 486, scale: 2, facing: -1 });
      return { stage: new root.TerraceStage(this.assets.stage, root.TERRACE_STAGE_DATA), a, b, t: 0, next: 1800 };
    },

    drawAttract(dt) {
      const at = this.attract, ctx = this.ctx;
      at.t += dt;
      at.a.update(dt); at.b.update(dt);
      if (at.t > at.next) {
        at.next = at.t + 1400 + Math.random() * 1800;
        const who = Math.random() < 0.5 ? at.a : at.b;
        who.play(Math.random() < 0.5 ? 'punch' : 'kick');
        who.drainEvents();
      }
      at.stage.draw(ctx, {
        cameraX: Math.sin(at.t / 5000) * 20,
        drawActors: (c) => {
          c.fillStyle = 'rgba(12,8,16,0.55)';
          for (const f of [at.a, at.b]) { c.beginPath(); c.ellipse(f.x + f.facing * 40, 489, 66, 9, 0, 0, Math.PI * 2); c.fill(); }
          at.a.draw(c); at.b.draw(c);
        }
      });
    },

    loop(now) {
      const dt = this.last === null ? 16 : Math.min(50, now - this.last);
      this.last = now;
      const Hub = root.TrolinaHub;
      if (this.match && Hub && Hub.visible) Hub.hide();
      if (this.match) {
        if (this.lockstep) this.lockstep.frame(dt);
        else if (!this.paused) this.match.update(dt);
        this.match.draw(this.ctx);
        this.updateTouchHud();
        Sfx.setWater(!this.paused && !this.match.ended && this.match.fountain && this.match.fountain.on);
      } else if (Hub && Hub.ready) { Sfx.setWater(false); Hub.frame(dt); }
      else if (this.attract) { Sfx.setWater(false); this.drawAttract(dt); }
      UI.tick(dt);
      requestAnimationFrame((t) => this.loop(t));
    },

    /* ---------- utilidades de prueba: ?autoplay=1&fast=3, ?screen=barra ---------- */

    debugQuick() {
      const story = params.get('autoplay') === 'story';
      const stage = Save.data.story.stage % root.TROLINA_STORY.length;
      Object.assign(this.session, {
        mode: story ? 'story' : 'quick', storyIndex: stage, p1: params.get('p1') || 'barbas',
        p2: story ? root.TROLINA_STORY[stage] : params.get('p2') || 'runner',
        difficulty: params.get('diff') || 'normal',
        order: { botellin: Number(params.get('bottles') || 4) },
        wild: params.has('wild'),
        // Arma en pruebas (v0.15): ?arma1=baston|botellin|none&arma2=…
        weapon: { p1: params.get('arma1') || undefined, p2: params.get('arma2') || undefined }
      });
      this.session.cpuOrder = R.cpuOrder(this.session.difficulty, this.charById(this.session.p2));
      this.session.fountain = R.pickFountain(Save.data.settings.fountain, Save.data.settings.fountainLight);
      this.session.stage = this.pickStage();
      this.loadStage(this.session.stage).then(() => this.startMatch());
    },

    debugScreen(name) {
      Object.assign(this.session, { p2: params.get('p2') || 'runner', order: { botellin: 3 }, cpuOrder: { botellin: 2, cafe: 1 } });
      if (name === 'story') return this.beginStory();
      if (name === 'fight') return this.debugQuickManual();
      if (name === 'vs') return UI.show('vs', { onDone: () => this.startMatch() });
      if (name === 'cinematic') return UI.show('cinematic', { scenes: root.TROLINA_CINEMATICS['story-0'], onDone: () => UI.show('title') });
      UI.show(name, {});
    },

    debugQuickManual() {
      Object.assign(this.session, { mode: 'quick', wild: params.has('wild'), p1: params.get('p1') || 'barbas', p2: params.get('p2') || 'runner', order: { botellin: Number(params.get('bottles') || 3) },
        weapon: { p1: params.get('arma1') || undefined, p2: params.get('arma2') || undefined } });
      this.session.cpuOrder = R.cpuOrder(this.session.difficulty, this.charById(this.session.p2));
      this.session.fountain = R.pickFountain(Save.data.settings.fountain, Save.data.settings.fountainLight);
      this.session.stage = this.pickStage();
      this.loadStage(this.session.stage).then(() => this.startMatch());
    }
  };

  root.TrolinaGame = Game;
  root.addEventListener('DOMContentLoaded', () => Game.boot());
})(window);
