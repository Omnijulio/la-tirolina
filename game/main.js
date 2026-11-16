/* Arranque, bucle principal y flujo entre pantallas. */
(function (root) {
  const R = root.TrolinaRules, Save = root.TrolinaSave, Sfx = root.TrolinaSfx, UI = root.TrolinaUI;
  const params = new URLSearchParams(root.location.search);

  const Game = {
    params,
    assets: { characters: {}, stage: {}, bottle: null, fountain: null, jardinera: null },
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
        if (document.hidden && this.match && !this.match.ended && !this.paused) this.pause();
      });
      this.applySettings();
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
      requestAnimationFrame((t) => this.loop(t));
      if (params.has('autoplay')) this.debugQuick(true);
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
      if (root.TROLINA_FOUNTAIN_DATA) {
        this.assets.fountain = {};
        for (const [k, src] of Object.entries(root.TROLINA_FOUNTAIN_DATA.images)) jobs.push([src, (img) => { this.assets.fountain[k] = img; }]);
      }
      if (root.TROLINA_STAGE_EXTRAS) jobs.push([root.TROLINA_STAGE_EXTRAS.jardinera, (img) => { this.assets.jardinera = img; }]);
      if (root.POLICE_DATA) {
        this.assets.police = {};
        jobs.push([root.POLICE_DATA.officer.image, (img) => { this.assets.police.officer = img; }]);
        jobs.push([root.POLICE_DATA.patrol.image, (img) => { this.assets.police.patrol = img; }]);
      }
      let done = 0;
      await Promise.all(jobs.map(([src, set]) => this.loadImage(src).then((img) => { set(img); onProgress(++done / jobs.length); })));
      this.stageCache.noche = this.assets.stage;
    },

    stageById(id) { return (root.TROLINA_STAGES || []).find((s) => s.id === id) || { id: 'noche', name: 'Noche', night: true, weather: null }; },

    /** Carga (una vez) las tres capas de un ambiente. Si falla, se queda la noche. */
    loadStage(id) {
      if (this.stageCache[id]) return Promise.resolve(this.stageCache[id]);
      const st = this.stageById(id), imgs = {};
      const jobs = Object.entries(st.layers || {}).map(([k, src]) => this.loadImage(src).then((img) => { imgs[k] = img; }));
      return Promise.all(jobs).then(() => (this.stageCache[id] = imgs)).catch(() => this.assets.stage);
    },

    pickStage() {
      const ids = (root.TROLINA_STAGES || [{ id: 'noche' }]).map((s) => s.id);
      return params.get('stage') && ids.includes(params.get('stage')) ? params.get('stage') : R.pickStage(Save.data.settings.stage, ids);
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

    startMatch() {
      const s = this.session, d = Save.data;
      const c1 = this.charById(s.p1), c2 = this.charById(s.p2);
      const items = root.TROLINA_BAR_ITEMS, ups = root.TROLINA_UPGRADES;
      if (!s.stage) s.stage = 'noche';
      const loaded = this.stageCache[s.stage];
      const stage = loaded ? this.stageById(s.stage) : this.stageById('noche');
      this.match = new root.Match({
        assets: this.assets,
        stage, stageImages: loaded || this.assets.stage,
        jardinera: !!(d.settings.jardinera || s.wild),
        p1: { character: c1, loadout: R.computeLoadout(c1, s.order, d.upgrades, items, ups, { wild: s.wild }) },
        p2: { character: c2, loadout: R.computeLoadout(c2, s.cpuOrder, {}, items, ups, { wild: s.wild }) },
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
      this.lastResult = { result, reward, unlocked, storyFinished };
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
      if (!this.match || this.match.ended) return;
      if (this.paused) { if (UI.current === 'pause') this.resume(); } else this.pause();
    },

    /** Carga del ultimate y cigarrillos en los botones táctiles (solo si cambian). */
    updateTouchHud() {
      const p = this.match.p1, h = this.touchHud || (this.touchHud = {});
      const charge = Math.floor(p.meter);
      if (h.charge !== charge) {
        h.charge = charge;
        const btn = document.getElementById('specialBtn');
        btn.style.setProperty('--charge', charge);
        btn.classList.toggle('ready', p.meterFull);
      }
      if (h.cigs !== p.cigs) { h.cigs = p.cigs; document.getElementById('cigCount').textContent = p.cigs; }
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
      if (this.match) {
        if (!this.paused) this.match.update(dt);
        this.match.draw(this.ctx);
        this.updateTouchHud();
        Sfx.setWater(!this.paused && !this.match.ended && this.match.fountain && this.match.fountain.on);
      } else if (this.attract) { Sfx.setWater(false); this.drawAttract(dt); }
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
        wild: params.has('wild')
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
      Object.assign(this.session, { mode: 'quick', wild: params.has('wild'), p1: params.get('p1') || 'barbas', p2: params.get('p2') || 'runner', order: { botellin: Number(params.get('bottles') || 3) } });
      this.session.cpuOrder = R.cpuOrder(this.session.difficulty, this.charById(this.session.p2));
      this.session.fountain = R.pickFountain(Save.data.settings.fountain, Save.data.settings.fountainLight);
      this.session.stage = this.pickStage();
      this.loadStage(this.session.stage).then(() => this.startMatch());
    }
  };

  root.TrolinaGame = Game;
  root.addEventListener('DOMContentLoaded', () => Game.boot());
})(window);
