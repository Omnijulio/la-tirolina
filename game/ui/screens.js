/* Pantallas de menú en HTML sobre el canvas: título, selección, barra, tienda,
 * opciones, ayuda, cinemática, VS, resultados y pausa.
 */
(function (root) {
  const R = root.TrolinaRules;
  const money = (c) => R.formatMoney(c);
  const clock = (ms) => { const t = Math.ceil(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /** Dibuja un retrato desde el atlas del personaje (sin getImageData: funciona en file://). */
  function drawPortrait(canvas, img, opts) {
    const o = opts || {};
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const f = o.frame || root.FIGHTER_DATA.animations.idle.frames[0];
    const box = o.crop === 'full' ? [f.x, f.y, 192, 176] : [f.x + 32, f.y + 8, 96, 96];
    ctx.drawImage(img, box[0], box[1], box[2], box[3], 0, 0, canvas.width, canvas.height);
    if (o.silhouette) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#121a29';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  const STAT_RANGES = {
    hp: [80, 130, 'Vida'], power: [0.85, 1.25, 'Fuerza'], speed: [0.8, 1.3, 'Velocidad'],
    tolerance: [-0.15, 0.4, 'Aguante'], aim: [0.8, 1.35, 'Puntería']
  };
  function statBars(stats) {
    return '<div class="stats">' + Object.entries(STAT_RANGES).map(([k, [lo, hi, label]]) => {
      const n = Math.max(1, Math.min(5, Math.round(1 + 4 * (stats[k] - lo) / (hi - lo))));
      return '<div class="stat"><span>' + label + '</span><i>' + '<b class="on"></b>'.repeat(n) + '<b></b>'.repeat(5 - n) + '</i></div>';
    }).join('') + '</div>';
  }

  const UI = {
    game: null, root: null, current: null, tickers: [], keyHandler: null,

    init(game) {
      this.game = game;
      this.root = document.getElementById('ui');
      root.addEventListener('keydown', (e) => {
        if (this.keyHandler && this.root.classList.contains('on')) this.keyHandler(e);
      });
      this.root.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b && !b.disabled && !b.dataset.silent) root.TrolinaSfx.play(b.classList.contains('back') ? 'back' : 'select');
      });
    },

    show(name, params) {
      this.tickers = []; this.keyHandler = null;
      this.root.innerHTML = '';
      this.root.className = 'on scr-' + name;
      this.current = name;
      const node = SCREENS[name].call(this, params || {});
      this.root.append(node);
      this.root.scrollTop = 0;
      const first = node.querySelector('[autofocus]') || node.querySelector('button:not([disabled])');
      if (first && !matchMedia('(pointer: coarse)').matches) first.focus({ preventScroll: true });
    },

    hide() { this.tickers = []; this.keyHandler = null; this.root.className = ''; this.root.innerHTML = ''; this.current = null; },
    tick(dt) { for (const fn of this.tickers) fn(dt); },
    wallet() { return '<div class="wallet" title="Cartera">💰 <b>' + money(this.game.save.data.coins) + '</b></div>'; },
    header(title, backTo) {
      return '<header class="bar"><button class="back" data-back="' + (backTo || 'title') + '" aria-label="Volver">←</button><h2>' + title + '</h2>' + this.wallet() + '</header>';
    },
    bindBack(node, fn) {
      node.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => (fn ? fn() : this.show(b.dataset.back))));
      this.keyHandler = (e) => { if (e.key === 'Escape') { const b = node.querySelector('[data-back]'); if (b) b.click(); } };
    },
    flashError(node, msg) {
      root.TrolinaSfx.play('error');
      let t = node.querySelector('.toast');
      if (!t) { t = el('<div class="toast" role="status"></div>'); node.append(t); }
      t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    }
  };

  const SCREENS = {
    loading() {
      return el('<div class="scr loading"><div class="logo small"><span class="neon">La Trolina</span><b>FIGHTERS</b></div><div class="progress"><i id="loadbar"></i></div><p id="loadtxt">Cargando…</p></div>');
    },

    title() {
      const g = this.game, d = g.save.data;
      const stage = Math.min(d.story.stage + 1, root.TROLINA_STORY.length);
      const canFs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
      const node = el(`<div class="scr title">
        <div class="logo"><span class="neon">La Trolina</span><b>FIGHTERS</b><small>Peleas de terraza · 1 jugador contra la máquina</small></div>
        <nav class="menu">
          <button data-go="story">Modo historia <small>${d.story.completed ? 'Completado · rejugar' : 'Combate ' + stage + ' / ' + root.TROLINA_STORY.length}</small></button>
          <button data-go="quick">Pelea rápida <small>Elige rival y dificultad</small></button>
          <button data-go="shop">Tienda <small>Personajes y mejoras</small></button>
          <button data-go="help">Cómo se juega</button>
          <button data-go="options">Opciones</button>
        </nav>
        <div class="foot">${this.wallet()}<span class="muted">${d.unlocked.length}/${root.TROLINA_CHARACTERS.length} luchadores · ${d.stats.wins} victorias</span>
        ${canFs ? '<button class="ghost" data-fs>⛶ Pantalla completa</button>' : ''}</div>
      </div>`);
      node.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
        const go = b.dataset.go;
        if (go === 'story') g.beginStory();
        else if (go === 'quick') g.beginQuick();
        else this.show(go);
      }));
      const fs = node.querySelector('[data-fs]');
      if (fs) fs.addEventListener('click', () => g.toggleFullscreen());
      return node;
    },

    /** mode: 'story' | 'quick'; step: 'p1' | 'p2' */
    select(p) {
      const g = this.game, d = g.save.data, s = g.session;
      const step = p.step || 'p1';
      const story = s.mode === 'story';
      const chars = root.TROLINA_CHARACTERS;
      const title = step === 'p1' ? 'Elige tu luchador' : 'Elige rival';
      const node = el(`<div class="scr select">
        ${this.header(title, step === 'p2' ? 'p1' : 'title')}
        <div class="select-body">
          <div class="roster"></div>
          <div class="detail">
            <canvas class="big" width="192" height="176"></canvas>
            <div class="info"><h3></h3><p class="tag"></p><div class="statwrap"></div><p class="special-info"></p><p class="lock muted"></p></div>
          </div>
        </div>
        <footer class="actions">
          ${story ? '<div class="next-rival"></div>' : ''}
          <div class="seg" role="radiogroup" aria-label="Dificultad">${R.DIFFICULTY_ORDER.map((id) => `<button data-diff="${id}" data-silent="1">${R.DIFFICULTIES[id].name}</button>`).join('')}</div>
          <button class="primary" data-ok>Continuar →</button>
        </footer>
      </div>`);
      const roster = node.querySelector('.roster');
      let chosen = step === 'p1' ? s.p1 : (s.p2 || chars.find((c) => c.id !== s.p1).id);
      if (step === 'p1' && !g.save.isUnlocked(chosen)) chosen = 'barbas';
      const jailLeft = (id) => g.save.jailLeft(id);
      const canPick = (c) => (step === 'p2' || g.save.isUnlocked(c.id)) && !jailLeft(c.id);
      const storyRival = story ? g.charById(root.TROLINA_STORY[d.story.stage]) : null;
      chars.forEach((c) => {
        const locked = !g.save.isUnlocked(c.id);
        const card = el(`<button class="card${locked ? ' locked' : ''}" data-id="${c.id}" style="--c:${c.color}"><canvas width="96" height="96"></canvas><span>${esc(c.name)}</span>${locked ? '<em>🔒</em>' : ''}<b class="jailtag"></b></button>`);
        drawPortrait(card.querySelector('canvas'), g.assets.characters[c.id], { silhouette: locked && step === 'p1' });
        if (step === 'p2' && c.id === s.p1) card.classList.add('mirror');
        card.addEventListener('click', () => {
          if (jailLeft(c.id)) { chosen = c.id; refresh(); this.flashError(node, c.name + ' está en el calabozo: sale en ' + clock(jailLeft(c.id))); return; }
          if (!canPick(c)) { chosen = c.id; refresh(); this.flashError(node, 'Bloqueado: gánalo en el modo historia o cómpralo en la tienda'); return; }
          chosen = c.id; refresh();
        });
        card.addEventListener('dblclick', () => { if (canPick(c)) node.querySelector('[data-ok]').click(); });
        roster.append(card);
      });
      const big = node.querySelector('canvas.big');
      let animT = 0, jailT = 1000;
      // Cuenta atrás del calabozo en las fichas.
      const paintJail = () => {
        node.querySelectorAll('.card').forEach((b) => {
          const left = jailLeft(b.dataset.id);
          b.classList.toggle('jailed', left > 0);
          b.querySelector('.jailtag').textContent = left > 0 ? '🚔 ' + clock(left) : '';
        });
      };
      paintJail();
      this.tickers.push((dt) => {
        jailT -= dt;
        if (jailT <= 0) { jailT = 1000; paintJail(); refresh(); }
      });
      this.tickers.push((dt) => {
        animT += dt;
        const frames = root.FIGHTER_DATA.animations.idle.frames;
        const fr = frames[Math.floor(animT / 150) % frames.length];
        const c = chars.find((x) => x.id === chosen);
        drawPortrait(big, g.assets.characters[c.id], { crop: 'full', frame: fr, silhouette: step === 'p1' && !g.save.isUnlocked(c.id) });
      });
      const diffBtns = node.querySelectorAll('[data-diff]');
      const setDiff = (id) => { s.difficulty = id; d.difficulty = id; g.save.save(); diffBtns.forEach((b) => b.classList.toggle('on', b.dataset.diff === id)); };
      diffBtns.forEach((b) => b.addEventListener('click', () => { setDiff(b.dataset.diff); root.TrolinaSfx.play('select'); }));
      setDiff(s.difficulty || d.difficulty);
      const refresh = () => {
        const c = chars.find((x) => x.id === chosen);
        node.querySelectorAll('.card').forEach((b) => b.classList.toggle('on', b.dataset.id === chosen));
        node.querySelector('.info h3').textContent = c.name;
        node.querySelector('.info h3').style.color = c.color;
        node.querySelector('.tag').textContent = c.tagline;
        node.querySelector('.statwrap').innerHTML = statBars(c.stats);
        node.querySelector('.special-info').innerHTML = c.special
          ? '<b>Ultimate · ' + esc(c.special.name) + ':</b> ' + esc(c.special.desc)
          : '<span class="muted">Ultimate: próximamente</span>';
        const locked = !g.save.isUnlocked(c.id);
        const lockTxt = locked ? (c.unlock.story !== undefined ? 'Se desbloquea al ganar el combate ' + (c.unlock.story + 1) + ' de la historia · o en la tienda por ' + money(c.unlock.price) : '') : '';
        node.querySelector('.lock').textContent = step === 'p1' ? lockTxt : (locked ? 'Como rival puedes elegirlo aunque esté bloqueado.' : '');
        const rivalJailed = story && jailLeft(storyRival.id);
        node.querySelector('[data-ok]').disabled = !canPick(c) || !!rivalJailed;
        if (jailLeft(c.id)) node.querySelector('.lock').textContent = '🚔 En el calabozo: podrá pelear dentro de ' + clock(jailLeft(c.id)) + '.';
        if (story) {
          const idx = d.story.stage;
          const rival = storyRival;
          node.querySelector('.next-rival').innerHTML = 'Combate <b>' + (idx + 1) + '/' + root.TROLINA_STORY.length + '</b> · rival: <b style="color:' + rival.color + '">' + esc(rival.name) + '</b>' +
            (rivalJailed ? ' <span class="muted">· en el calabozo, sale en ' + clock(rivalJailed) + '</span>' : '');
        }
      };
      refresh();
      node.querySelector('[data-ok]').addEventListener('click', () => {
        if (step === 'p1') {
          s.p1 = chosen; d.selected = chosen; g.save.save();
          if (story) { s.p2 = root.TROLINA_STORY[d.story.stage]; this.show('barra'); }
          else this.show('select', { step: 'p2' });
        } else { s.p2 = chosen; this.show('barra'); }
      });
      this.bindBack(node, () => (step === 'p2' ? this.show('select', { step: 'p1' }) : this.show('title')));
      const prevKey = this.keyHandler;
      this.keyHandler = (e) => {
        if (e.key === 'Enter' && document.activeElement === document.body) node.querySelector('[data-ok]').click();
        else prevKey(e);
      };
      return node;
    },

    /** La Barra: pedido de botellines y objetos antes de pelear. */
    barra() {
      const g = this.game, d = g.save.data, s = g.session;
      const items = root.TROLINA_BAR_ITEMS;
      const char = g.charById(s.p1), rival = g.charById(s.p2);
      let order = R.sanitizeOrder(d.lastOrder, items);
      while (R.orderCost(order, items) > d.coins) {
        const k = Object.keys(order).find((id) => order[id] > 0);
        if (!k) break;
        order[k]--; if (!order[k]) delete order[k];
      }
      const node = el(`<div class="scr barra">
        ${this.header('La Barra', 'back')}
        <p class="intro">Antes de pelear contra <b style="color:${rival.color}">${esc(rival.name)}</b>, pide algo. Cada <b>botellín (2,90 €)</b> te da fuerza y un envase para lanzar, pero sube el <b>puntillo</b>: niebla, mareo, golpes al aire y controles lentos. Cuanto más dure la pelea, peor. <b>Fumar</b> lo baja; la <b>bolsa de azúcar</b> lo borra… un rato.</p>
        <div class="barra-body">
          <div class="items"></div>
          <aside class="summary">
            <img class="beer" src="assets/bottle-estrella-galicia-4x.png" alt="Botellín">
            <div class="sum-lines"></div>
            <div class="total"></div>
            <button class="primary" data-ok>¡A pelear!</button>
            <button class="ghost" data-none>Pelear sin pedir nada</button>
          </aside>
        </div>
      </div>`);
      const list = node.querySelector('.items');
      for (const it of items) {
        const isBottle = it.id === 'botellin';
        const row = el(`<div class="item${isBottle ? ' main' : ''}" data-id="${it.id}">
          <div class="ico">${it.icon === 'bottle' ? '<img src="assets/bottle.png" alt="">' : it.icon}</div>
          <div class="txt"><b>${esc(it.name)}</b> <span class="price">${money(it.price)}</span>
            <p class="good">▲ ${esc(it.good)}</p><p class="bad">▼ ${esc(it.bad)}</p>
          </div>
          <div class="stepper"><button data-d="-1" data-silent="1" aria-label="Quitar">−</button><output>0</output><button data-d="1" data-silent="1" aria-label="Añadir">+</button></div>
          ${isBottle ? '<div class="crate" aria-label="Elige cuántos botellines">' + Array.from({ length: it.max }, (_, i) => `<button data-n="${i + 1}" data-silent="1" aria-label="${i + 1} botellines"><img src="assets/bottle.png" alt=""></button>`).join('') + '</div>' : ''}
        </div>`);
        row.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => change(it, (order[it.id] || 0) + Number(b.dataset.d))));
        row.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => {
          const n = Number(b.dataset.n);
          change(it, (order[it.id] || 0) === n ? n - 1 : n);
        }));
        list.append(row);
      }
      const change = (it, qty) => {
        qty = Math.max(0, Math.min(it.max, qty));
        const next = { ...order, [it.id]: qty };
        if (!qty) delete next[it.id];
        if (R.orderCost(next, items) > d.coins) { this.flashError(node, 'No te llega el dinero'); return; }
        if (qty > (order[it.id] || 0)) root.TrolinaSfx.play(it.id === 'botellin' || it.id === 'orujo' ? 'gulp' : 'buy');
        else root.TrolinaSfx.play('back');
        order = next; render();
      };
      const render = () => {
        const cost = R.orderCost(order, items);
        for (const it of items) {
          const row = list.querySelector(`[data-id="${it.id}"]`);
          const q = order[it.id] || 0;
          row.querySelector('output').textContent = q + (it.max > 1 ? '/' + it.max : '');
          row.classList.toggle('picked', q > 0);
          row.querySelector('[data-d="-1"]').disabled = q <= 0;
          row.querySelector('[data-d="1"]').disabled = q >= it.max || cost + it.price > d.coins;
          row.querySelectorAll('[data-n]').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= q));
        }
        const lo = R.computeLoadout(char, order, d.upgrades, items, root.TROLINA_UPGRADES);
        const base = R.computeLoadout(char, {}, d.upgrades, items, root.TROLINA_UPGRADES);
        const pct = (v) => (v >= 0 ? '+' : '') + Math.round(v * 100) + ' %';
        const i0 = R.intoxAt(lo, 0), i1 = R.intoxAt(lo, 60), i2 = R.intoxAt(lo, 120);
        node.querySelector('.sum-lines').innerHTML = `
          <h3 style="color:${char.color}">${esc(char.name)}</h3>
          <div class="kv"><span>Vida</span><b>${lo.maxHp}${lo.maxHp !== base.maxHp ? ' <em>(+' + (lo.maxHp - base.maxHp) + ')</em>' : ''}</b></div>
          <div class="kv"><span>Fuerza</span><b>${pct(lo.power / base.power - 1)}</b></div>
          <div class="kv"><span>Velocidad</span><b>${pct(lo.speed / base.speed - 1)}</b></div>
          <div class="kv"><span>Botellines para lanzar</span><b>${lo.ammo} por asalto</b></div>
          ${lo.cigs ? `<div class="kv"><span>Cigarrillos (F)</span><b>${lo.cigs} · −15 % cada uno</b></div>` : ''}
          ${lo.sugar ? '<div class="kv"><span>Azúcar</span><b class="warn">+40 % vel. 30 s · desmayo a los 45 s</b></div>' : ''}
          <div class="kv"><span>Puntillo</span><b class="${i1 > 0.5 ? 'warn' : ''}">${Math.round(i0 * 100)} % → ${Math.round(i1 * 100)} % <em>(1 min)</em> → ${Math.round(i2 * 100)} %</b></div>
          <div class="meter"><i style="width:${Math.round(i1 * 100)}%"></i></div>
          <p class="muted">${lo.fogMult < 1 ? 'Gafas de sol: ves la mitad de niebla. ' : ''}${i1 > 0.6 ? 'Vas a ver doble.' : i1 > 0.3 ? 'Empezarás a notar la niebla.' : i1 > 0 ? 'Un puntillo controlado.' : 'Fresco como una lechuga.'}</p>`;
        node.querySelector('.total').innerHTML = 'Total: <b>' + money(cost) + '</b><span class="muted"> · te quedarán ' + money(d.coins - cost) + '</span>';
        node.querySelector('[data-ok]').textContent = cost ? '¡A pelear! (pagar ' + money(cost) + ')' : '¡A pelear!';
      };
      render();
      const go = (o) => {
        const preso = g.jailed(s.p1, s.p2);
        if (preso) { this.flashError(node, preso.name + ' está en el calabozo: sale en ' + clock(g.save.jailLeft(preso.id))); return; }
        const cost = R.orderCost(o, items);
        if (!g.save.spend(cost)) { this.flashError(node, 'No te llega el dinero'); return; }
        d.lastOrder = o; d.stats.bottles += o.botellin || 0; g.save.save();
        if (cost) root.TrolinaSfx.play('coin');
        g.session.order = o;
        g.preFight();
      };
      node.querySelector('[data-ok]').addEventListener('click', () => go(order));
      node.querySelector('[data-none]').addEventListener('click', () => go({}));
      this.bindBack(node, () => this.show('select', { step: g.session.mode === 'story' ? 'p1' : 'p2' }));
      return node;
    },

    cinematic(p) {
      const g = this.game;
      const scenes = p.scenes || [];
      const node = el(`<div class="scr cine">
        <div class="cine-bg"></div>
        <div class="cine-portrait"><canvas width="192" height="176"></canvas></div>
        <div class="cine-box"><b class="who"></b><p class="txt"></p><span class="hint">Toca para continuar</span></div>
        <button class="ghost skip" data-skip>Saltar ▶▶</button>
      </div>`);
      let idx = -1, shown = 0, full = '', wait = 0, done = false, video = null;
      const finish = () => { if (done) return; done = true; if (video) video.pause(); p.onDone(); };
      const next = () => {
        idx++;
        if (idx >= scenes.length) return finish();
        const sc = scenes[idx];
        const bg = node.querySelector('.cine-bg');
        bg.innerHTML = ''; video = null;
        // Sin ilustración propia se usa la fachada de La Trolina como fondo provisional.
        bg.style.background = sc.image ? `center/cover no-repeat url("${sc.image}")`
          : `center/cover no-repeat url("assets/stage/01-wall.png"), ${sc.bg || '#0b0f1a'}`;
        bg.style.imageRendering = 'pixelated';
        if (sc.video) {
          video = el(`<video src="${sc.video}" playsinline autoplay muted></video>`);
          video.addEventListener('ended', next);
          bg.append(video);
        }
        const por = node.querySelector('.cine-portrait');
        const who = sc.speaker ? g.charById(sc.speaker) : null;
        por.style.display = who ? '' : 'none';
        por.className = 'cine-portrait ' + (sc.side || 'right');
        if (who) drawPortrait(por.querySelector('canvas'), g.assets.characters[who.id], { crop: 'full' });
        node.querySelector('.who').textContent = who ? who.name : '';
        node.querySelector('.who').style.color = who ? who.color : '';
        full = sc.text || ''; shown = 0;
        wait = sc.duration || 1600 + full.length * 35;
      };
      this.tickers.push((dt) => {
        if (done || idx < 0 || idx >= scenes.length) return;
        if (shown < full.length) {
          shown = Math.min(full.length, shown + dt / 28);
          node.querySelector('.txt').textContent = full.slice(0, Math.floor(shown));
        } else if (!scenes[idx].video) {
          wait -= dt;
          if (wait <= 0) next();
        }
      });
      node.addEventListener('click', (e) => {
        if (e.target.closest('[data-skip]')) return finish();
        if (shown < full.length) { shown = full.length; node.querySelector('.txt').textContent = full; } else next();
      });
      this.keyHandler = (e) => {
        if (e.key === 'Escape') finish();
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); node.click(); }
      };
      next();
      return node;
    },

    vs(p) {
      const g = this.game, s = g.session;
      const c1 = g.charById(s.p1), c2 = g.charById(s.p2);
      const items = root.TROLINA_BAR_ITEMS;
      const node = el(`<div class="scr vs">
        <div class="side l" style="--c:${c1.color}"><canvas width="192" height="176"></canvas><h3>${esc(c1.name)}</h3><p>Tú · ${esc(R.describeOrder(s.order, items))}</p></div>
        <div class="vs-mid"><b>VS</b><span>${esc(R.DIFFICULTIES[s.difficulty].name)}${s.mode === 'story' ? ' · Historia ' + (s.storyIndex + 1) + '/' + root.TROLINA_STORY.length : ''}</span></div>
        <div class="side r" style="--c:${c2.color}"><canvas width="192" height="176"></canvas><h3>${esc(c2.name)}</h3><p>CPU · ${esc(R.describeOrder(s.cpuOrder, items))}</p></div>
        <span class="hint">Toca para empezar</span>
      </div>`);
      const [a, b] = node.querySelectorAll('canvas');
      drawPortrait(a, g.assets.characters[c1.id], { crop: 'full' });
      drawPortrait(b, g.assets.characters[c2.id], { crop: 'full' });
      let t = 0, done = false;
      const go = () => { if (!done) { done = true; p.onDone(); } };
      this.tickers.push((dt) => { t += dt; if (t > 3200) go(); });
      node.addEventListener('click', go);
      this.keyHandler = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); go(); } };
      return node;
    },

    results(p) {
      const g = this.game, s = g.session, d = g.save.data;
      const { result, reward, unlocked, storyFinished } = p;
      const story = s.mode === 'story';
      const unlockedChar = unlocked ? g.charById(unlocked) : null;
      const node = el(`<div class="scr results ${result.won ? 'win' : 'lose'}">
        <h1>${result.won ? '¡VICTORIA!' : 'DERROTA'}</h1>
        <p class="score">${result.roundsWon} – ${result.roundsLost} · ${esc(R.DIFFICULTIES[result.difficulty].name)}</p>
        <ul class="reward">${reward.lines.map((l, i) => `<li style="animation-delay:${i * 0.18}s"><span>${esc(l.label)}</span><b>+${money(l.cents)}</b></li>`).join('')}</ul>
        <p class="sum">Ganado: <b>${money(reward.total)}</b> · Cartera: <b>${money(d.coins)}</b></p>
        ${unlockedChar ? `<div class="unlock" style="--c:${unlockedChar.color}"><canvas width="96" height="96"></canvas><div><small>¡Nuevo luchador desbloqueado!</small><b>${esc(unlockedChar.name)}</b></div></div>` : ''}
        ${storyFinished ? '<div class="unlock gold"><div><small>Modo historia completado</small><b>Eres el rey de La Trolina</b></div></div>' : ''}
        <nav class="menu row"></nav>
      </div>`);
      if (unlockedChar) drawPortrait(node.querySelector('.unlock canvas'), g.assets.characters[unlockedChar.id]);
      const nav = node.querySelector('nav');
      const add = (label, fn, primary) => {
        const b = el(`<button class="${primary ? 'primary' : ''}">${label}</button>`);
        b.addEventListener('click', () => { g.leaveMatch(); fn(); }); nav.append(b);
      };
      if (story) {
        if (result.won && !storyFinished) add('Siguiente combate →', () => g.beginStory(true), true);
        if (!result.won) add('Reintentar', () => { g.session.p2 = root.TROLINA_STORY[d.story.stage]; this.show('barra'); }, true);
      } else {
        add('Revancha', () => this.show('barra'), true);
        add('Cambiar luchadores', () => this.show('select', { step: 'p1' }));
      }
      add('Tienda', () => this.show('shop'));
      add('Menú', () => this.show('title'));
      reward.lines.forEach((_, i) => setTimeout(() => root.TrolinaSfx.play('coin'), 200 + i * 180));
      return node;
    },

    pause() {
      const g = this.game;
      const canFs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
      const node = el(`<div class="scr pause">
        <h2>Pausa</h2>
        <nav class="menu">
          <button data-a="resume" autofocus>Continuar</button>
          <button data-a="restart">Reiniciar combate</button>
          <button data-a="help">Controles</button>
          ${canFs ? '<button data-a="fs">⛶ Pantalla completa</button>' : ''}
          <button data-a="quit" class="danger">Abandonar</button>
        </nav>
        <p class="muted">Si abandonas, lo pedido en la barra no se devuelve.</p>
      </div>`);
      node.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.a;
        if (a === 'resume') g.resume();
        else if (a === 'restart') g.restartMatch();
        else if (a === 'fs') g.toggleFullscreen();
        else if (a === 'help') this.show('help', { back: 'pause' });
        else if (a === 'quit') { g.leaveMatch(); this.show('title'); }
      }));
      this.keyHandler = (e) => { if (e.key === 'Escape') g.resume(); };
      return node;
    },

    shop(p) {
      const g = this.game, d = g.save.data;
      let tab = p.tab || 'chars';
      const node = el(`<div class="scr shop">
        ${this.header('Tienda', 'title')}
        <div class="tabs"><button data-tab="chars">Personajes</button><button data-tab="ups">Mejoras permanentes</button></div>
        <div class="shop-list"></div>
        <p class="muted center">Los objetos de la barra (botellines, café, tortilla…) se piden antes de cada combate.</p>
      </div>`);
      const list = node.querySelector('.shop-list');
      const render = () => {
        node.querySelector('.wallet b').textContent = money(d.coins);
        node.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
        list.innerHTML = '';
        if (tab === 'chars') {
          for (const c of root.TROLINA_CHARACTERS) {
            const owned = g.save.isUnlocked(c.id);
            const card = el(`<div class="shop-card" style="--c:${c.color}">
              <canvas width="96" height="96"></canvas>
              <div class="txt"><b>${esc(c.name)}</b><p>${esc(c.tagline)}</p>${statBars(c.stats)}
              ${c.special ? '<p class="special-info"><b>Ultimate · ' + esc(c.special.name) + '</b></p>' : ''}
              ${!owned && c.unlock.story !== undefined ? '<p class="muted">Gratis al ganar el combate ' + (c.unlock.story + 1) + ' de la historia</p>' : ''}</div>
              <div class="buy">${owned ? '<span class="owned">✓ Disponible</span>' : `<button class="primary" data-buy="${c.id}" data-silent="1">${money(c.unlock.price)}</button>`}</div>
            </div>`);
            drawPortrait(card.querySelector('canvas'), g.assets.characters[c.id]);
            list.append(card);
          }
        } else {
          for (const u of root.TROLINA_UPGRADES) {
            const lvl = d.upgrades[u.id] || 0, max = u.prices.length;
            const card = el(`<div class="shop-card up">
              <div class="ico">${u.icon}</div>
              <div class="txt"><b>${esc(u.name)}</b><p>${esc(u.desc)}</p><div class="pips">${'<i class="on"></i>'.repeat(lvl)}${'<i></i>'.repeat(max - lvl)}</div></div>
              <div class="buy">${lvl >= max ? '<span class="owned">Máximo</span>' : `<button class="primary" data-up="${u.id}" data-silent="1">Nivel ${lvl + 1} · ${money(u.prices[lvl])}</button>`}</div>
            </div>`);
            list.append(card);
          }
        }
        list.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
          const c = g.charById(b.dataset.buy);
          if (!g.save.spend(c.unlock.price)) return this.flashError(node, 'No te llega el dinero');
          g.save.unlock(c.id); root.TrolinaSfx.play('buy'); render();
        }));
        list.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => {
          const u = root.TROLINA_UPGRADES.find((x) => x.id === b.dataset.up);
          const lvl = d.upgrades[u.id] || 0;
          if (!g.save.spend(u.prices[lvl])) return this.flashError(node, 'No te llega el dinero');
          d.upgrades[u.id] = lvl + 1; g.save.save(); root.TrolinaSfx.play('buy'); render();
        }));
      };
      node.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
      render();
      this.bindBack(node);
      return node;
    },

    options() {
      const g = this.game, d = g.save.data, st = d.settings;
      const node = el(`<div class="scr options">
        ${this.header('Opciones', 'title')}
        <div class="form">
          <label>Dificultad por defecto<div class="seg">${R.DIFFICULTY_ORDER.map((id) => `<button data-diff="${id}" data-silent="1">${R.DIFFICULTIES[id].name}</button>`).join('')}</div></label>
          <label class="row">Sonido <input type="checkbox" data-k="sound"></label>
          <label>Volumen <input type="range" min="0" max="1" step="0.05" data-k="volume"></label>
          <label>Controles táctiles
            <select data-k="touch"><option value="auto">Automático</option><option value="always">Mostrar siempre</option><option value="never">Ocultar</option></select></label>
          <label class="row">Reducir mareo de pantalla <input type="checkbox" data-k="reduceMotion"></label>
          <label class="row">Policía Local (ruido, multas y calabozo) <input type="checkbox" data-k="police"></label>
          <p class="muted">${g.save.persistent ? 'El progreso se guarda en este navegador.' : 'Este navegador no permite guardar: el progreso se perderá al cerrar.'}</p>
          <button class="danger" data-reset>Borrar progreso</button>
        </div>
      </div>`);
      const diffBtns = node.querySelectorAll('[data-diff]');
      const paint = () => diffBtns.forEach((b) => b.classList.toggle('on', b.dataset.diff === d.difficulty));
      diffBtns.forEach((b) => b.addEventListener('click', () => { d.difficulty = b.dataset.diff; g.session.difficulty = d.difficulty; g.save.save(); paint(); root.TrolinaSfx.play('select'); }));
      paint();
      node.querySelectorAll('[data-k]').forEach((inp) => {
        const k = inp.dataset.k;
        if (inp.type === 'checkbox') inp.checked = !!st[k]; else inp.value = st[k];
        inp.addEventListener('change', () => {
          st[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' ? Number(inp.value) : inp.value;
          g.save.save(); g.applySettings();
        });
        if (inp.type === 'range') inp.addEventListener('input', () => { st[k] = Number(inp.value); g.applySettings(); });
      });
      const reset = node.querySelector('[data-reset]');
      let armed = false;
      reset.addEventListener('click', () => {
        if (!armed) { armed = true; reset.textContent = '¿Seguro? Pulsa otra vez para borrar todo'; return; }
        g.save.reset(); g.applySettings(); g.session.p1 = 'barbas'; g.session.difficulty = g.save.data.difficulty; this.show('title');
      });
      this.bindBack(node);
      return node;
    },

    /** La Policía Local ha parado la pelea: multa y reinicio, o calabozo a la tercera. */
    police(p) {
      const g = this.game;
      const { outcome, paid, p1, p2 } = p;
      const same = p1.id === p2.id;
      const names = same ? esc(p1.name) : esc(p1.name) + ' y ' + esc(p2.name);
      const jail = outcome.jail;
      const node = el(`<div class="scr police${jail ? ' jail' : ''}">
        <div class="lights"><i></i><i></i></div>
        <h1>${jail ? 'NOCHE EN EL CALABOZO' : '¡POLICÍA LOCAL!'}</h1>
        <p class="lead">${jail
          ? 'Tercera vez seguida que viene la patrulla. ' + names + (same ? ' pasa' : ' pasan') + ' la noche en el calabozo.'
          : 'Demasiado ruido en la terraza: los agentes han parado la pelea y multan a ' + names + '.'}</p>
        <div class="cells">${[p1, ...(same ? [] : [p2])].map((c) => `<div class="cell" style="--c:${c.color}"><canvas width="96" height="96" data-id="${c.id}"></canvas><span>${esc(c.name)}</span></div>`).join('')}</div>
        ${jail
          ? '<div class="fine">No podrán pelear durante <b class="countdown">1:00</b></div>'
          : `<div class="fine">Multa: <b>${money(outcome.fine)}</b> para cada uno · pagas <b>${money(paid)}</b>${paid < outcome.fine ? ' (no te llegaba para más)' : ''}</div>`}
        <div class="strikes">${[1, 2, 3].map((i) => `<i class="${i <= outcome.strike ? 'on' : ''}"></i>`).join('')}
          <span>${jail ? 'Los avisos vuelven a cero.' : 'Aviso ' + outcome.strike + ' de 3. A la tercera seguida: noche en el calabozo (1 minuto sin poder usar a estos luchadores).'}</span></div>
        <nav class="menu row"></nav>
      </div>`);
      node.querySelectorAll('.cells canvas').forEach((cv) => drawPortrait(cv, g.assets.characters[cv.dataset.id]));
      const nav = node.querySelector('nav');
      const add = (label, fn, primary) => {
        const b = el(`<button class="${primary ? 'primary' : ''}">${label}</button>`);
        b.addEventListener('click', fn); nav.append(b); return b;
      };
      root.TrolinaSfx.play(jail ? 'jail' : 'error');
      if (jail) {
        add('Elegir otro luchador', () => { g.leaveMatch(); g.session.mode === 'story' ? g.beginStory() : g.beginQuick(); }, true);
        add('Menú', () => { g.leaveMatch(); this.show('title'); });
        const cd = node.querySelector('.countdown');
        this.tickers.push(() => { cd.textContent = clock(g.save.jailLeft(p1.id)); });
      } else {
        // La pelea se reinicia sola (con lo mismo pedido en la barra) salvo que abandones.
        let left = 8000;
        const again = add('Reiniciar la pelea (8)', () => g.startMatch(), true);
        add('Abandonar', () => { g.leaveMatch(); this.show('title'); });
        this.tickers.push((dt) => {
          left -= dt;
          again.textContent = 'Reiniciar la pelea (' + Math.max(0, Math.ceil(left / 1000)) + ')';
          if (left <= 0 && this.current === 'police') { left = Infinity; g.startMatch(); }
        });
      }
      return node;
    },

    help(p) {
      const back = p.back || 'title';
      const node = el(`<div class="scr help">
        ${this.header('Cómo se juega', back)}
        <div class="help-grid">
          <section><h3>Objetivo</h3><p>Combates al mejor de 3 asaltos de 99 s contra la máquina. Gana quien deje al rival sin vida o tenga más al acabar el tiempo.</p>
          <p>En el <b>modo historia</b> cada victoria desbloquea al rival como luchador. En <b>pelea rápida</b> eliges rival y dificultad.</p></section>
          <section><h3>Combos y ultimate</h3><p>Si un puñetazo o una patada <b>conecta</b>, puedes encadenar otro golpe enseguida: pulsa rápido puño, puño, patada…</p>
          <p><b>El Barbas</b> carga su ultimate, el <b>Dardo certero</b>, encadenando combos (cuanto más largo el combo, más carga). Con la barra llena, pulsa <b>DARDO</b>: un dardo ultrapreciso que busca al rival, no se puede bloquear y quita muchísima vida. También puedes lanzarlo al final de un combo.</p></section>
          <section><h3>La Barra y el puntillo</h3><p>Antes de cada combate puedes pedir hasta <b>10 botellines a 2,90 €</b>. Cada uno da <b>+7 % de fuerza</b> y un envase para lanzar por asalto, pero sube tu <b>puntillo</b>: niebla que crece con el tiempo, visión doble, pantalla que se balancea, tropiezos, golpes al aire y controles con retraso.</p>
          <p><b>Tabaco</b>: cada cigarrillo que fumas (botón FUMAR) quita un 15 % de puntillo, pero te quedas quieto 1,5 s y, si te pegan, se te cae. A partir del cuarto, tos.</p>
          <p><b>Bolsa de azúcar (60 €)</b>: 30 s a toda velocidad y sin puntillo; luego se pasa y a los 45 s te quedas inconsciente unos segundos.</p></section>
          <section><h3>Policía Local</h3><p>Cada golpe, botella rota o KO hace <b>ruido</b> (barra bajo el reloj). Lo que más ruido hace es <b>lanzar muchos botellines seguidos</b>; el ruido baja solo si os calmáis, y el puntillo os hace más escandalosos.</p>
          <p>Si llega al máximo, viene la patrulla: para la pelea, <b>multa</b> a los dos y la pelea se reinicia. Si pasa <b>3 veces seguidas</b>, noche en el <b>calabozo</b>: esos luchadores no se pueden usar durante 1 minuto. Se puede desactivar en Opciones.</p></section>
          <section><h3>Teclado</h3><table>
            <tr><td>← → / A D</td><td>Andar (atrás = cubrirse)</td></tr>
            <tr><td>↑ / W</td><td>Saltar (mantener = seguir saltando)</td></tr>
            <tr><td>↓ / S / G</td><td>Guardia</td></tr>
            <tr><td>J / Z</td><td>Puñetazo</td></tr>
            <tr><td>K / X</td><td>Patada</td></tr>
            <tr><td>L / C</td><td>Lanzar botellín</td></tr>
            <tr><td>U / V</td><td>Ultimate (Dardo)</td></tr>
            <tr><td>F / B</td><td>Fumar</td></tr>
            <tr><td>Esc / P</td><td>Pausa</td></tr></table></section>
          <section><h3>Móvil</h3><p><b>Joystick</b> a la izquierda: apoya el pulgar en cualquier punto y arrastra sin levantarlo. Lados = andar, arriba = saltar (en diagonal, hacia ese lado), abajo = guardia.</p>
          <p>A la derecha: <b>Puño</b>, <b>Patada</b>, <b>Botellín</b>, <b>Guardia</b> (mantener), <b>Fumar</b> y <b>Dardo</b> (el aro se llena con los combos). Mejor en horizontal y a pantalla completa.</p>
          <p>Ganar da mucho dinero: úsalo en la tienda para desbloquear luchadores y mejoras.</p></section>
        </div>
      </div>`);
      this.bindBack(node);
      return node;
    }
  };

  root.TrolinaUI = UI;
  root.TrolinaUI.drawPortrait = drawPortrait;
})(window);
