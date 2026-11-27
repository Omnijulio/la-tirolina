/* Pantallas de menú en HTML sobre el canvas: título, selección, barra, tienda,
 * opciones, ayuda, cinemática, VS, resultados y pausa.
 */
(function (root) {
  const R = root.TrolinaRules;
  const money = (c) => R.formatMoney(c);
  const clock = (ms) => { const t = Math.ceil(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /** Dibuja un retrato desde el atlas del personaje (sin getImageData: funciona en file://).
   * o.portrait: retrato propio (personajes con arte propio) en lugar del recorte de la cara.
   * o.size: tamaño del luchador (Rizos es más bajito); en cuerpo entero se encoge con los pies en su sitio. */
  function drawPortrait(canvas, img, opts) {
    const o = opts || {};
    if (o.portrait && o.crop !== 'full' && canvas.width !== o.portrait.width) {
      canvas.width = o.portrait.width; canvas.height = o.portrait.height;   // a su tamaño: sin perder píxeles
    }
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (o.portrait && o.crop !== 'full') ctx.drawImage(o.portrait, 0, 0, canvas.width, canvas.height);
    else {
      const f = o.frame || root.FIGHTER_DATA.animations.idle.frames[0];
      const box = o.crop === 'full' ? [f.x, f.y, 192, 176] : [f.x + 32, f.y + 8, 96, 96];
      const k = o.crop === 'full' && o.size ? o.size : 1, cw = canvas.width, ch = canvas.height;
      ctx.drawImage(img, box[0], box[1], box[2], box[3], (56 / 192) * cw * (1 - k), (160 / 176) * ch * (1 - k), cw * k, ch * k);
    }
    if (o.silhouette) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#121a29';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** Cara de un personaje para fichas, tienda y listas: su retrato propio si lo tiene. */
  function drawFace(canvas, game, id, opts) {
    const own = game.assets.portraits && game.assets.portraits[id];
    drawPortrait(canvas, game.assets.characters[id], Object.assign({}, opts, own ? { portrait: own } : {}));
  }

  /** Texto del STAB de un pedido: '' si no lleva su bebida ni su tabaco. */
  function stabText(c, order) {
    const st = R.stabOf(c, order);
    return st.mult > 1 ? '★ STAB ×' + String(Math.round(st.mult * 100) / 100).replace('.', ',') : '';
  }
  /** Su bebida y su tabaco (para la selección y La Barra). */
  function stabNames(c) {
    if (!c.stab) return '';
    const map = {}; for (const it of root.TROLINA_BAR_ITEMS || []) map[it.id] = it;
    return [c.stab.drink, c.stab.smoke].filter((id) => map[id]).map((id) => map[id].name.replace(/^Paquete de /, '')).join(' y ');
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
      this.tickers = []; this.keyHandler = null; this.onNet = null;
      this.root.innerHTML = '';
      this.root.className = 'on scr-' + name;
      const prev = this.current;
      this.current = name;
      this.hubScreen(name, prev);
      const node = SCREENS[name].call(this, params || {});
      this.root.append(node);
      this.root.scrollTop = 0;
      const first = node.querySelector('[autofocus]') || node.querySelector('button:not([disabled])');
      if (first && !matchMedia('(pointer: coarse)').matches) first.focus({ preventScroll: true });
    },

    hide() { this.tickers = []; this.keyHandler = null; this.root.className = ''; this.root.innerHTML = ''; this.current = null; document.body.classList.remove('hub-on'); },

    /** El menú del bar (game/ui/hub.js): de fondo en todas las pantallas del menú, fuera de la pelea. */
    hubScreen(name) {
      const H = root.TrolinaHub, g = this.game;
      document.body.classList.toggle('hub-on', name === 'title' && !!(H && H.ready));
      if (!H || !H.ready) return;
      if (g.match || name === 'loading' || name === 'cinematic' || name === 'vs') { H.hide(); return; }
      H.setHour(H.hourFor(g.params.get('hora') || g.save.data.settings.menuHour));
      H.show();
      if (name !== 'title') H.enterBackdrop(this.hubLast);
    },
    tick(dt) { for (const fn of this.tickers) fn(dt); },
    wallet() { return '<div class="wallet" title="Cartera">💰 <b>' + money(this.game.save.data.coins) + '</b></div>'; },
    header(title, backTo) {
      return '<header class="bar"><button class="back" data-back="' + (backTo || 'title') + '" aria-label="Volver">←</button><h2>' + title + '</h2>' + this.wallet() + '</header>';
    },
    bindBack(node, fn) {
      node.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => (fn ? fn() : this.show(b.dataset.back))));
      this.keyHandler = (e) => { if (e.key === 'Escape') { const b = node.querySelector('[data-back]'); if (b) b.click(); } };
    },
    /** Bloque de puntuación del final de un combate. */
    scoreBlock(score) {
      const parts = score.lines.map((l) => l.mult ? '×' + String(l.mult).replace('.', ',') + ' ' + l.label.toLowerCase() : (l.label === 'Puntos del combate' ? R.formatPoints(l.pts) + ' del combate' : '+' + R.formatPoints(l.pts) + ' ' + l.label.toLowerCase()));
      return `<div class="points"><span>PUNTUACIÓN</span><b>${R.formatPoints(score.total)}</b><small>${esc(parts.join(' · '))}</small></div><div class="rank-slot"></div>`;
    },

    /** Invitación a firmar en el ranking (opcional, con premio). */
    rankForm(node, total, entry) {
      const g = this.game, rk = g.save.ranking;
      const slot = node.querySelector('.rank-slot');
      if (!slot) return;
      const online = g.session.mode === 'online';
      const see = (at) => { g.leaveMatch(); this.show('ranking', { highlight: at }); };
      const seeLink = online ? '' : ' <button class="link" data-see>Ver ranking</button>';
      const bindSee = (at) => { const b = slot.querySelector('[data-see]'); if (b) b.addEventListener('click', () => see(at)); };
      const world = g.onlineRanking();
      const pos = R.rankPosition(rk.list, total);
      if (!pos && !world) {
        const last = rk.list[rk.list.length - 1];
        slot.innerHTML = `<p class="muted">Para entrar en el top ${R.SCORE.rankSize} te faltan <b>${R.formatPoints(last.score - total + 1)}</b> puntos.${seeLink}</p>`;
        bindSee();
        return;
      }
      const open = () => {
        slot.innerHTML = `<div class="rank-form ${pos === 1 ? 'best' : ''}">
          <p class="rank-hook">${!pos ? '¡Firma tu puntuación!' : pos === 1 ? (rk.list.length ? '🏆 ¡NUEVO RÉCORD! Puesto #1' : '🏆 ¡Estrena el ranking! Puesto #1') : '¡Entras en el ranking! Puesto #' + pos}${world && pos ? ' <small>en este móvil</small>' : ''}</p>
          ${world ? '<p class="rank-world">🌍 Ranking de La Trolina: calculando tu puesto…</p>' : ''}
          <div class="rank-row"><input data-name maxlength="14" placeholder="Tu nombre" value="${esc(rk.name || '')}" autocomplete="nickname" enterkeyhint="done"><button class="primary" data-sign>✍️ Firmar · +${money(R.SCORE.signBonusCents)}</button></div>
          <p class="muted small">Es opcional: si firmas, la casa te invita a una ronda (+${money(R.SCORE.signBonusCents)}). <button class="link" data-skip>Ahora no</button></p>
        </div>`;
        const input = slot.querySelector('[data-name]');
        const worldLine = slot.querySelector('.rank-world');
        if (world && worldLine) {
          world.position(total)
            .then((n) => { if (worldLine.isConnected && n) worldLine.innerHTML = '🌍 En el ranking de La Trolina (todos los móviles): puesto <b>#' + n + '</b>'; })
            .catch(() => { if (worldLine.isConnected) worldLine.textContent = '🌍 El ranking de La Trolina no responde ahora; se subirá cuando haya conexión.'; });
        }
        const sign = () => {
          const r = g.saveRanking(input.value, total, entry);
          if (r.error) { this.flashError(node, r.error); input.focus(); return; }
          root.TrolinaSfx.play('coin');
          slot.innerHTML = `<p class="rank-done">✍️ Firmado como <b>${esc(g.save.ranking.name)}</b>${r.position ? ' · puesto <b>#' + r.position + '</b>' + (world ? ' en este móvil' : '') : ''} · +${money(r.bonus)} de invitación${seeLink}</p>${r.upload ? '<p class="rank-world">🌍 Subiendo al ranking de La Trolina…</p>' : ''}`;
          bindSee(g.save.ranking.lastAt);
          if (r.upload) {
            const line = slot.querySelector('.rank-world');
            r.upload.then((sent) => { if (line.isConnected) line.textContent = sent ? '🌍 ¡Subido al ranking de La Trolina!' : '🌍 Sin conexión: se subirá solo más tarde.'; })
              .catch(() => { if (line.isConnected) line.textContent = '🌍 Sin conexión: se subirá solo más tarde.'; });
          }
          const sum = node.querySelector('.sum b:last-child');
          if (sum) sum.textContent = money(g.save.data.coins);
        };
        slot.querySelector('[data-sign]').addEventListener('click', sign);
        input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); sign(); } });
        slot.querySelector('[data-skip]').addEventListener('click', () => {
          slot.innerHTML = `<p class="muted"><button class="link" data-open>✍️ Firmar en el ranking (${pos ? 'puesto #' + pos + ', ' : ''}+${money(R.SCORE.signBonusCents)})</button></p>`;
          slot.querySelector('[data-open]').addEventListener('click', open);
        });
      };
      open();
    },

    /** Aviso suelto sobre la pantalla actual. */
    toast(msg) {
      const node = this.root.firstElementChild;
      if (node && msg) this.flashError(node, msg);
    },
    netUpdate() { if (this.onNet) this.onNet(); },
    snarkToast(node, msg) {
      let t = node.querySelector('.toast');
      if (!t) { t = el('<div class="toast" role="status"></div>'); node.append(t); }
      t.textContent = msg; t.classList.add('snarky'); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    },
    /** Registro de la última partida en red: ver, copiar o compartir (para encontrar desincronizaciones). */
    netLogPanel(parent) {
      const L = root.TrolinaNetLog;
      const text = (L && (L.cur ? L.text() : L.last())) || 'Todavía no hay ningún registro.';
      const old = parent.querySelector('.netlog');
      if (old) { old.remove(); return; }
      const box = el(`<div class="netlog">
        <p class="small">Registro del multijugador. Compártelo para encontrar el fallo:</p>
        <textarea readonly spellcheck="false"></textarea>
        <nav class="menu row"><button class="primary" data-share>📤 Compartir</button><button data-copy>Copiar</button><button class="ghost" data-close>Cerrar</button></nav>
      </div>`);
      const ta = box.querySelector('textarea');
      ta.value = text;
      box.querySelector('[data-copy]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(text); this.flashError(parent, 'Registro copiado'); }
        catch (e) { ta.focus(); ta.select(); this.flashError(parent, 'Selecciona el texto y cópialo'); }
      });
      box.querySelector('[data-share]').addEventListener('click', async () => {
        try {
          const file = typeof File !== 'undefined' ? new File([text], 'registro-trolina-multijugador.txt', { type: 'text/plain' }) : null;
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ title: 'Registro La Trolina', files: [file] });
          else if (navigator.share) await navigator.share({ title: 'Registro La Trolina', text });
          else { await navigator.clipboard.writeText(text); this.flashError(parent, 'Registro copiado'); }
        } catch (e) { /* cancelado */ }
      });
      box.querySelector('[data-close]').addEventListener('click', () => box.remove());
      (parent.querySelector('.online-box') || parent).append(box);
      box.scrollIntoView({ block: 'nearest' });
    },

    flashError(node, msg) {
      root.TrolinaSfx.play('error');
      let t = node.querySelector('.toast');
      if (!t) { t = el('<div class="toast" role="status"></div>'); node.append(t); }
      t.textContent = msg; t.classList.remove('snarky'); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    }
  };

  const SCREENS = {
    loading() {
      return el('<div class="scr loading"><div class="logo small"><span class="neon">La Trolina</span><b>FIGHTERS</b></div><div class="progress"><i id="loadbar"></i></div><p id="loadtxt">Cargando…</p></div>');
    },

    title() {
      if (root.TrolinaHub && root.TrolinaHub.ready) return SCREENS.hub.call(this);
      return SCREENS.titleClassic.call(this);
    },

    /** Pantalla de inicio: La Trolina vista desde la puerta. Cada sitio lleva a un apartado. */
    hub() {
      const g = this.game, d = g.save.data, H = root.TrolinaHub, HD = root.TROLINA_HUB;
      const touch = matchMedia('(pointer: coarse)').matches;
      const storyN = root.TROLINA_STORY.length, stage = Math.min(d.story.stage + 1, storyN);
      const rk = g.save.ranking.list;
      const info = {
        story: { name: 'Modo historia', icon: 0, sub: d.story.completed ? 'Completado · rejugar' : 'Combate ' + stage + ' / ' + storyN,
          desc: 'Sal a la terraza: cinco peleas contra la cuadrilla, una detrás de otra.', go: () => g.beginStory() },
        quick: { name: 'Pelea rápida', icon: 1, sub: 'Elige rival y dificultad', desc: 'Un combate suelto. Tú eliges luchador, rival y dificultad.', go: () => g.beginQuick() },
        help: { name: 'Cómo se pelea', icon: 7, sub: 'Controles y trucos', desc: 'Golpes, guardia, agarre y fuelle, para no hacer el ridículo.', go: () => this.show('help') },
        shop: { name: 'Tienda', icon: 3, sub: money(d.coins) + ' para gastar', desc: 'Desbloquea luchadores y compra mejoras con lo que ganas peleando.', go: () => this.show('shop') },
        wild: { name: 'Modo salvaje', icon: -1, sub: 'Experimental', desc: 'Luces fuera. Desde el segundo 30 la pelea se vuelve un caos para los dos.', go: () => g.beginWild() },
        darts: { name: 'Dianas', icon: 4, sub: 'Próximamente', desc: 'Las dianas del comedor. Todavía están en obras.', soon: true },
        online: { name: 'Multijugador', icon: 2, sub: 'Experimental · dos móviles', desc: 'Contra un amigo, cada uno en su móvil, con un código de sala.', go: () => this.show('online') },
        ranking: { name: 'Ranking', icon: 5, sub: rk.length ? '🏆 ' + esc(rk[0].name) + ' · ' + R.formatPoints(rk[0].score) : 'Firma tu puntuación',
          desc: 'Las mejores puntuaciones de este móvil y de toda La Trolina.', go: () => this.show('ranking') },
        options: { name: 'Opciones', icon: 6, sub: 'Sonido, controles, escenario…', desc: 'Sonido, controles táctiles, escenarios y la hora del bar.', go: () => this.show('options') }
      };
      const order = HD.destinations.map((x) => x.id).filter((id) => info[id]);
      const iconHtml = (id, cls) => info[id].icon < 0 ? `<i class="ico disco ${cls || ''}"></i>` : `<i class="ico ${cls || ''}" style="--i:${info[id].icon}"></i>`;
      const node = el(`<div class="scr hub${H.introDone ? '' : ' intro'}">
        <div class="hub-logo logo"><span class="neon">La Trolina</span><b>FIGHTERS</b></div>
        <div class="hub-marks">${order.map((id) => `<button class="mark${info[id].soon ? ' soon' : ''}" data-id="${id}" aria-label="${info[id].name}" data-silent="1">${iconHtml(id)}</button>`).join('')}</div>
        <div class="hub-tag" aria-hidden="true"><div class="plate"><i class="chapa"></i><span class="tx"><b></b><small></small></span></div><i class="pico"></i></div>
        <aside class="hub-card">
          <div class="card-head"><span class="card-ico"></span><div><h3></h3><p class="sub"></p></div></div>
          <p class="desc"></p>
          <div class="card-row">
            <button class="nav" data-nav="-1" aria-label="Anterior" data-silent="1">‹</button>
            <button class="primary enter" data-enter data-silent="1" autofocus>Entrar</button>
            <button class="nav" data-nav="1" aria-label="Siguiente" data-silent="1">›</button>
          </div>
          <div class="card-foot">${this.wallet()}<span class="muted">${d.unlocked.length}/${root.TROLINA_CHARACTERS.length} luchadores · ${d.stats.wins} victorias</span></div>
        </aside>
        <p class="hub-hint">${touch ? 'Toca un sitio del bar o desliza' : '← → elegir · Enter entrar · o pasa el ratón por el bar'}</p>
      </div>`);
      const marks = {}; node.querySelectorAll('.mark').forEach((m) => { marks[m.dataset.id] = m; });
      const tag = node.querySelector('.hub-tag'), card = node.querySelector('.hub-card');
      let sel = null, busy = false;
      const isTitle = () => this.current === 'title' && this.root.contains(node);

      const select = (id, quiet) => {
        if (!info[id] || busy) return;
        if (sel !== id && !quiet) root.TrolinaSfx.play('hover');
        sel = id; this.hubLast = id;
        H.select(id);
        const it = info[id];
        for (const [k, m] of Object.entries(marks)) m.classList.toggle('on', k === id);
        tag.querySelector('b').textContent = it.name;
        tag.querySelector('small').textContent = it.sub.replace(/&amp;/g, '&');
        tag.classList.toggle('soon', !!it.soon);
        tag.classList.remove('pop'); void tag.offsetWidth; tag.classList.add('pop');
        card.querySelector('.card-ico').innerHTML = iconHtml(id, 'big');
        card.querySelector('h3').textContent = it.name;
        card.querySelector('.sub').innerHTML = it.sub;
        card.querySelector('.desc').textContent = it.desc;
        const enter = card.querySelector('[data-enter]');
        enter.textContent = it.soon ? 'En obras' : 'Entrar';
        enter.disabled = !!it.soon;
        card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
        tagSize = null;
      };
      const step = (k) => { const i = order.indexOf(sel); select(order[(i + k + order.length) % order.length]); };
      const confirm = (id) => {
        id = id || sel;
        if (!info[id] || busy) return;
        if (id !== sel) select(id, true);
        const it = info[id];
        if (it.soon) { root.TrolinaSfx.play('error'); tag.classList.remove('nope'); void tag.offsetWidth; tag.classList.add('nope'); this.snarkToast(node, 'Las dianas siguen en obras. Vuelve otro día.'); return; }
        busy = true;
        root.TrolinaSfx.play('enter');
        tag.classList.add('pressed');
        node.classList.add('leaving');
        H.confirm(id).then(() => { if (isTitle()) it.go(); });
      };

      // Ratón: pasar por encima elige, clic entra. Táctil: el primer toque elige, el segundo entra.
      const pick = (id) => { if (touch && id !== sel) select(id); else confirm(id); };
      for (const [id, m] of Object.entries(marks)) {
        m.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') select(id); });
        m.addEventListener('click', (e) => { e.stopPropagation(); pick(id); });
        m.addEventListener('focus', () => { if (m.matches(':focus-visible')) select(id); });   // con el tabulador
      }
      tag.addEventListener('click', (e) => { e.stopPropagation(); confirm(); });
      card.querySelector('[data-enter]').addEventListener('click', () => confirm());
      card.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.nav))));
      let lastHover = null, down = null;
      node.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || busy || e.target.closest('.hub-card')) return;
        const id = H.hitTest(e.clientX, e.clientY);
        node.classList.toggle('pointing', !!id);
        if (id && id !== lastHover) select(id);
        lastHover = id;
      });
      node.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
      node.addEventListener('pointerup', (e) => {
        if (!down || busy || e.target.closest('.hub-card, .mark, .hub-tag')) { down = null; return; }
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);   // deslizar
        else if (Math.hypot(dx, dy) < 12) { const id = H.hitTest(e.clientX, e.clientY, e.pointerType !== 'mouse'); if (id) pick(id); }
        down = null;
      });
      this.keyHandler = (e) => {
        if (busy) return;
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 's') { e.preventDefault(); step(1); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'w') { e.preventDefault(); step(-1); }
        else if (k === 'Enter' || k === ' ') { if (!e.target.closest || !e.target.closest('button')) { e.preventDefault(); confirm(); } }
      };

      // Cada fotograma: marcas y letrero pegados a la escena (la cámara se mueve).
      let tagSize = null;
      const place = () => {
        if (!isTitle()) return;
        const W = innerWidth, Hh = innerHeight;
        for (const dst of HD.destinations) {
          const m = marks[dst.id]; if (!m) continue;
          const [x, y] = H.toScreen(dst.anchor[0], dst.anchor[1]);
          const out = x < -40 || x > W + 40 || y < -40 || y > Hh + 40;
          // La marca, encima del sitio (su pie en el ancla); la elegida deja paso al letrero.
          m.style.transform = `translate(${x.toFixed(1)}px,${(y - 4).toFixed(1)}px) translate(-50%,-100%)`;
          m.classList.toggle('off', out);
        }
        if (!sel) return;
        const dst = HD.destinations.find((x) => x.id === sel);
        if (!tagSize) tagSize = [tag.offsetWidth, tag.offsetHeight];
        const [tw, th] = tagSize;
        const [ax, ay] = H.toScreen(dst.anchor[0], dst.anchor[1]);
        const tx = clamp(ax - tw / 2, 8, W - tw - 8);
        // Encima del sitio; debajo solo si arriba no cabe (o pisaría el logo).
        const logo = node.querySelector('.hub-logo').getBoundingClientRect();
        const fs = document.getElementById('fsBtn');
        const fr = fs && !fs.hidden ? fs.getBoundingClientRect() : null;
        let minTop = tx < logo.right + 6 ? logo.bottom + 4 : 6;
        if (fr && tx + tw > fr.left - 6) minTop = Math.max(minTop, fr.bottom + 6);
        const below = ay - th - 26 < minTop;
        const ty = below ? ay + 26 : ay - th - 26;
        tag.classList.toggle('below', below);
        tag.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
        tag.style.setProperty('--px', clamp(ax - tx, 18, tw - 18).toFixed(1) + 'px');
      };
      const layout = () => {
        tagSize = null;
        const portrait = innerHeight > innerWidth * 1.05;
        node.classList.toggle('portrait', portrait);
        const r = card.getBoundingClientRect();
        // La cámara encuadra lo elegido en la zona que no tapa la carta.
        H.setSafe(portrait ? { x: 0, y: 70, w: innerWidth, h: Math.max(120, r.top - 70) } : null);
        H.updateGoal();
      };
      this.tickers.push(place);
      const onResize = () => { if (isTitle()) layout(); else root.removeEventListener('resize', onResize); };
      root.addEventListener('resize', onResize);
      H.enterTitle({ intro: !H.introDone, reduceMotion: d.settings.reduceMotion });
      requestAnimationFrame(() => { layout(); select(this.hubLast && info[this.hubLast] ? this.hubLast : HD.first, true); });
      return node;
    },

    titleClassic() {
      const g = this.game, d = g.save.data;
      const stage = Math.min(d.story.stage + 1, root.TROLINA_STORY.length);
      const node = el(`<div class="scr title">
        <div class="logo"><span class="neon">La Trolina</span><b>FIGHTERS</b><small>Peleas de terraza · 1 jugador contra la máquina</small></div>
        <nav class="menu">
          <button data-go="story">Modo historia <small>${d.story.completed ? 'Completado · rejugar' : 'Combate ' + stage + ' / ' + root.TROLINA_STORY.length}</small></button>
          <button data-go="quick">Pelea rápida <small>Elige rival y dificultad</small></button>
          <button data-go="wild" class="wild">Modo salvaje <small>Experimental · desde el segundo 30, tú verás</small></button>
          <button data-go="online" class="online">Multijugador <small>Experimental · contra un amigo en otro móvil</small></button>
          <button data-go="shop">Tienda <small>Personajes y mejoras</small></button>
          <button data-go="ranking">Ranking <small>${g.save.ranking.list.length ? '🏆 ' + esc(g.save.ranking.list[0].name) + ' · ' + R.formatPoints(g.save.ranking.list[0].score) : 'Firma tu puntuación'}</small></button>
          <button data-go="help">Cómo se juega</button>
          <button data-go="options">Opciones</button>
        </nav>
        <div class="foot">${this.wallet()}<span class="muted">${d.unlocked.length}/${root.TROLINA_CHARACTERS.length} luchadores · ${d.stats.wins} victorias</span></div>
      </div>`);
      node.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
        const go = b.dataset.go;
        if (go === 'story') g.beginStory();
        else if (go === 'quick') g.beginQuick();
        else if (go === 'wild') g.beginWild();
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
      const title = (step === 'p1' ? 'Elige tu luchador' : 'Elige rival') + (s.wild ? ' <span class="wild-badge">MODO SALVAJE</span>' : '');
      const node = el(`<div class="scr select">
        ${this.header(title, step === 'p2' ? 'p1' : 'title')}
        <div class="select-body">
          <div class="roster"></div>
          <div class="detail">
            <canvas class="big" width="192" height="176"></canvas>
            <div class="info"><h3></h3><p class="tag"></p><div class="statwrap"></div><p class="special-info"></p><p class="stab-info"></p><p class="weapon-info"></p><div class="dev-weapon"></div><p class="lock muted"></p></div>
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
      if (step === 'p1' && !g.save.isUnlocked(chosen) && s.mode !== 'online') chosen = 'barbas';
      const jailLeft = (id) => g.save.jailLeft(id);
      const online = s.mode === 'online';
      const canPick = (c) => online || ((step === 'p2' || g.save.isUnlocked(c.id)) && !jailLeft(c.id));
      const storyRival = story ? g.charById(root.TROLINA_STORY[d.story.stage]) : null;
      chars.forEach((c) => {
        const locked = !g.save.isUnlocked(c.id);
        const card = el(`<button class="card${locked ? ' locked' : ''}" data-id="${c.id}" style="--c:${c.color}"><canvas width="96" height="96"></canvas><span>${esc(c.name)}</span>${locked ? '<em>🔒</em>' : ''}<b class="jailtag"></b></button>`);
        drawFace(card.querySelector('canvas'), g, c.id, { silhouette: locked && step === 'p1' });
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
        drawPortrait(big, g.assets.characters[c.id], { crop: 'full', frame: fr, size: c.size, silhouette: step === 'p1' && !g.save.isUnlocked(c.id) });
      });
      // Arma (v0.15). Solo en desarrollo: elegir bastón, botellín o nada para algunos luchadores (no en el multijugador).
      const DEVW = (root.TROLINA_DEV || {}).weaponPicker;
      const devOn = (c) => !!(DEVW && DEVW.enabled && !online && DEVW.characters.includes(c.id));
      s.devWeapon = s.devWeapon || {};
      const devPick = s.devWeapon[step] = s.devWeapon[step] || {};
      const weaponOf = (c) => (devOn(c) && devPick[c.id] !== undefined ? devPick[c.id] : (c.weapon || 'none'));
      const devBox = node.querySelector('.dev-weapon');
      devBox.addEventListener('click', (e) => {
        const b = e.target.closest('[data-weapon]');
        if (!b) return;
        devPick[chosen] = b.dataset.weapon; root.TrolinaSfx.play('select'); refresh();
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
        node.querySelector('.stab-info').innerHTML = c.stab ? '<b>★ STAB:</b> ' + esc(stabNames(c)) + ' (×' + String(R.STAB.drink).replace('.', ',') + ' de fuerza cada uno si los lleva)' : '';
        const wid = weaponOf(c), w = R.WEAPONS[wid];
        node.querySelector('.weapon-info').innerHTML = w
          ? '<b>Arma · ' + esc(w.name) + ':</b> ×' + String(w.power).replace('.', ',') + ' de fuerza' + (w.reach >= 15 ? ', más alcance' : '') +
            (w.guardCost < 1 ? ' y se cubre mejor' : '') + '. Se le cae con una guardia justa o un combo de ' + R.WEAPON.disarmCombo + ' golpes; ' +
            (w.pickup ? 'la recoge al pasar por encima o vuelve sola' : 'le ponen otro') + ' a los ' + Math.round(R.WEAPON.returnMs / 1000) + ' s.'
          : '';
        devBox.innerHTML = devOn(c)
          ? '<span class="dev-label">Arma (pruebas)</span><div class="seg">' + ['none'].concat(DEVW.weapons).map((id) =>
            '<button data-weapon="' + id + '" data-silent="1"' + (id === wid ? ' class="on"' : '') + '>' + (id === 'none' ? 'Ninguna' : esc(R.WEAPONS[id].name)) + '</button>').join('') + '</div>'
          : '';
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
        // Arma elegida en pruebas (undefined: la suya).
        const cc = chars.find((x) => x.id === chosen);
        s.weapon = s.weapon || {};
        s.weapon[step] = devOn(cc) ? weaponOf(cc) : undefined;
        if (step === 'p1') {
          s.p1 = chosen; d.selected = chosen; g.save.save();
          if (story) { s.p2 = root.TROLINA_STORY[d.story.stage]; this.show('barra'); }
          else if (online) this.show('barra');
          else this.show('select', { step: 'p2' });
        } else { s.p2 = chosen; this.show('barra'); }
      });
      this.bindBack(node, () => (online ? g.netLeave() : step === 'p2' ? this.show('select', { step: 'p1' }) : this.show('title')));
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
      const online = s.mode === 'online';
      const char = g.charById(s.p1), rival = online ? { name: 'tu rival', color: '#9ff0ff' } : g.charById(s.p2);
      const slots = R.slotsFor(d.upgrades, root.TROLINA_UPGRADES);
      let order = R.sanitizeOrder(d.lastOrder, items, slots);
      while (!online && R.orderCost(order, items) > d.coins) {
        const k = Object.keys(order).find((id) => order[id] > 0);
        if (!k) break;
        order[k]--; if (!order[k]) delete order[k];
      }
      const node = el(`<div class="scr barra">
        ${this.header('La Barra', 'back')}
        ${online ? '<p class="intro wild-intro"><b>BARRA LIBRE.</b> En el multijugador no se paga: pide lo que quieras dentro de tus huecos y pulsa «¡Listo!».</p>' : ''}
        ${s.wild ? '<p class="intro wild-intro"><b>MODO SALVAJE.</b> Aquí todo pega más: lo bueno y lo malo. Los primeros 30 segundos son normales. Después, buena suerte. O no.</p>' : ''}
        ${char.stab ? `<p class="intro stab-intro"><b>★ STAB de ${esc(char.name)}:</b> ${esc(stabNames(char))}. Si los llevas, tu fuerza se multiplica (×${String(R.STAB.drink).replace('.', ',')} cada uno).</p>` : ''}
        <p class="intro">Antes de pelear contra <b style="color:${rival.color}">${esc(rival.name)}</b>, pide algo. Cada <b>botellín (2,90 €)</b> te da fuerza y un envase para lanzar, pero sube el <b>puntillo</b>: niebla, mareo, golpes al aire y controles lentos. Cuanto más dure la pelea, peor. <b>Fumar</b> lo baja; la <b>bolsa de azúcar</b> lo borra… un rato.</p>
        <div class="slots-bar"></div>
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
      const groups = { drink: '🍺 Bebidas', smoke: '🚬 Para fumar', other: '🛍️ Otros' };
      let lastKind = null;
      for (const it of items) {
        if (it.kind !== lastKind) { lastKind = it.kind; list.append(el(`<h4 class="group">${groups[it.kind] || ''}<span data-group="${it.kind}"></span></h4>`)); }
        const isBottle = it.id === 'botellin';
        const isStab = !!(char.stab && (char.stab.drink === it.id || char.stab.smoke === it.id));
        const row = el(`<div class="item${isBottle ? ' main' : ''}${isStab ? ' stab' : ''}" data-id="${it.id}">
          <div class="ico">${it.icon === 'bottle' ? '<img src="assets/bottle.png" alt="">' : it.icon.startsWith('img:') ? `<img class="drink" src="${it.icon.slice(4)}" alt="">` : it.icon}</div>
          <div class="txt"><b>${esc(it.name)}</b> <span class="price">${money(it.price)}</span>${isStab ? ` <span class="stab-tag">★ STAB ×${String(it.kind === 'smoke' ? R.STAB.smoke : R.STAB.drink).replace('.', ',')}</span>` : ''}
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
        const use = R.orderUsage(next, items);
        if (it.kind === 'drink' && use.drinks > slots.drinks) {
          this.flashError(node, s.wild ? 'No te cabe nada más. Ni aunque quisieras.' : 'No te caben más bebidas (' + slots.drinks + '). Más huecos: Hígado de hierro, en la Tienda');
          return;
        }
        if (it.kind === 'smoke' && use.smokes > slots.smokes) {
          // Con un solo hueco, elegir otra cosa para fumar la cambia por la anterior.
          if (slots.smokes === 1) {
            for (const o of items) { if (o.kind === 'smoke' && o.id !== it.id) delete next[o.id]; }
          } else { this.flashError(node, 'Ya llevas ' + slots.smokes + ' cosas para fumar. Quita una antes'); return; }
        }
        if (!online && R.orderCost(next, items) > d.coins) { this.flashError(node, 'No te llega el dinero'); return; }
        if (qty > (order[it.id] || 0)) {
          root.TrolinaSfx.play(['botellin', 'peterete', 'jager', 'licorcafe', 'tequila', 'destornillador', 'redlabel'].includes(it.id) ? 'gulp' : 'buy');
          if (s.wild && root.trolinaBarSnark) this.snarkToast(node, root.trolinaBarSnark(it.id));
        } else root.TrolinaSfx.play('back');
        order = next; render();
      };
      const render = () => {
        const cost = R.orderCost(order, items);
        const use = R.orderUsage(order, items);
        for (const it of items) {
          const row = list.querySelector(`[data-id="${it.id}"]`);
          const q = order[it.id] || 0;
          const full = it.kind === 'drink' ? use.drinks >= slots.drinks : it.kind === 'smoke' ? use.smokes >= slots.smokes && slots.smokes > 1 && !q : false;
          row.querySelector('output').textContent = q + (it.max > 1 ? '/' + it.max : '');
          row.classList.toggle('picked', q > 0);
          row.classList.toggle('nofit', full && !q);
          row.querySelector('[data-d="-1"]').disabled = q <= 0;
          row.querySelector('[data-d="1"]').disabled = q >= it.max || (!online && cost + it.price > d.coins) || full;
          row.querySelectorAll('[data-n]').forEach((b) => {
            const n = Number(b.dataset.n);
            b.classList.toggle('on', n <= q);
            b.disabled = n > q + (slots.drinks - use.drinks);
          });
        }
        const pips = (n, max, cls) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on ' + cls : ''}"></i>`).join('');
        node.querySelector('.slots-bar').innerHTML = `
          <div class="slot-group"><span>Bebidas</span><div class="pips">${pips(use.drinks, slots.drinks, 'drink')}</div><b>${use.drinks}/${slots.drinks}</b></div>
          <div class="slot-group"><span>Para fumar</span><div class="pips">${pips(use.smokes, slots.smokes, 'smoke')}</div><b>${use.smokes}/${slots.smokes}</b></div>
          ${slots.drinks < 10 || slots.smokes < 2 ? '<span class="muted">Más huecos en la Tienda: Hígado de hierro y Pitillera</span>' : ''}`;
        list.querySelector('[data-group="drink"]').textContent = ' · ' + use.drinks + '/' + slots.drinks;
        list.querySelector('[data-group="smoke"]').textContent = ' · ' + use.smokes + '/' + slots.smokes;
        const jard = g.jardinera();
        const lo = R.computeLoadout(char, order, d.upgrades, items, root.TROLINA_UPGRADES, { wild: s.wild, jardinera: jard });
        const base = R.computeLoadout(char, {}, d.upgrades, items, root.TROLINA_UPGRADES, { wild: s.wild, jardinera: jard });
        const pct = (v) => (v >= 0 ? '+' : '') + Math.round(v * 100) + ' %';
        const i0 = R.intoxAt(lo, 0), i1 = R.intoxAt(lo, 60), i2 = R.intoxAt(lo, 120);
        node.querySelector('.sum-lines').innerHTML = `
          <h3 style="color:${char.color}">${esc(char.name)}</h3>
          <div class="kv"><span>Vida</span><b>${lo.maxHp}${lo.maxHp !== base.maxHp ? ' <em>(+' + (lo.maxHp - base.maxHp) + ')</em>' : ''}</b></div>
          <div class="kv"><span>Fuerza</span><b>${pct(lo.power / base.power - 1)}</b></div>
          ${lo.stab && lo.stab.mult > 1 ? `<div class="kv stab"><span>★ STAB</span><b>×${String(Math.round(lo.stab.mult * 100) / 100).replace('.', ',')} de fuerza (${[lo.stab.drink ? 'su bebida' : '', lo.stab.smoke ? 'su tabaco' : ''].filter(Boolean).join(' y ')})</b></div>` : ''}
          <div class="kv"><span>Velocidad</span><b>${pct(lo.speed / base.speed - 1)}</b></div>
          <div class="kv"><span>Botellines para lanzar</span><b>${lo.ammo} por asalto${jard ? ' <em>(+2 de la jardinera)</em>' : ''}</b></div>
          ${lo.smokes.map((sm) => `<div class="kv"><span>${esc(sm.short)} (F)</span><b>×${sm.units} · ${sm.relief >= 0.1 ? '−' + Math.round(sm.relief * 100) + ' % puntillo, ' : ''}+${sm.heal} vida · ${(sm.ms / 1000).toLocaleString('es-ES')} s</b></div>`).join('')}
          ${lo.sugar ? '<div class="kv"><span>Azúcar</span><b class="warn">+40 % vel. 30 s · desmayo a los 45 s</b></div>' : ''}
          <div class="kv"><span>Puntillo</span><b class="${i1 > 0.5 ? 'warn' : ''}">${Math.round(i0 * 100)} % → ${Math.round(i1 * 100)} % <em>(1 min)</em> → ${Math.round(i2 * 100)} %</b></div>
          <div class="meter"><i style="width:${Math.round(i1 * 100)}%"></i></div>
          <p class="muted">${order.gafas ? 'Gafas de sol: ves la mitad de niebla. ' : ''}${i1 > 0.6 ? 'Vas a ver doble.' : i1 > 0.3 ? 'Empezarás a notar la niebla.' : i1 > 0 ? 'Un puntillo controlado.' : 'Fresco como una lechuga.'}</p>`;
        node.querySelector('.total').innerHTML = online ? '<b>Barra libre</b><span class="muted"> · multijugador</span>' : 'Total: <b>' + money(cost) + '</b><span class="muted"> · te quedarán ' + money(d.coins - cost) + '</span>';
        node.querySelector('[data-ok]').textContent = online ? '¡Listo!' : cost ? '¡A pelear! (pagar ' + money(cost) + ')' : '¡A pelear!';
      };
      render();
      const go = (o) => {
        if (online) { d.lastOrder = o; g.save.save(); g.netReady(o); return; }
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
      this.bindBack(node, () => this.show('select', { step: g.session.mode === 'story' || online ? 'p1' : 'p2' }));
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
        if (who) drawPortrait(por.querySelector('canvas'), g.assets.characters[who.id], { crop: 'full', size: who.size });
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
      const online = s.mode === 'online', side = online && g.net && !g.net.isHost ? 1 : 0;
      const c1 = g.charById(s.p1), c2 = g.charById(s.p2);
      const items = root.TROLINA_BAR_ITEMS;
      const node = el(`<div class="scr vs">
        <div class="side l" style="--c:${c1.color}"><canvas width="192" height="176"></canvas><h3>${esc(c1.name)}</h3><p>${online && side === 1 ? 'Rival' : 'Tú'} · ${esc(R.describeOrder(s.order, items))}${stabText(c1, s.order) ? ' <b class="stab-tag">' + stabText(c1, s.order) + '</b>' : ''}</p></div>
        <div class="vs-mid"><b>VS</b>${s.wild ? '<span class="wild-badge">MODO SALVAJE</span>' : ''}${online ? '<span class="wild-badge exp">MULTIJUGADOR · EXPERIMENTAL</span>' : ''}<span>${online ? 'Al mejor de 3' : esc(R.DIFFICULTIES[s.difficulty].name)}${s.mode === 'story' ? ' · Historia ' + (s.storyIndex + 1) + '/' + root.TROLINA_STORY.length : ''}</span>
          ${(() => {
            const st = g.stageById(s.stage || 'noche'), inside = st.place === 'interior';
            const where = inside ? '🍺 Interior del bar · luces ' + (st.lighting === 'apagadas' ? 'apagadas ✨' : 'encendidas') : (st.icon || '') + ' ' + st.name;
            return `<span class="stage-state">${esc(where)}</span>` +
              (g.jardinera() ? `<span class="stage-state jard">${inside ? '🍺 Botellines de sobra' : '🪴 Jardinera llena'}: +2 botellines para lanzar cada uno</span>` : '') +
              (st.music ? `<span class="fountain-state">🎵 Música a tope${online ? '' : ' — tapa el ruido de los botellines'}</span>` : '') +
              (s.fountain && !inside ? `<span class="fountain-state">⛲ Fuente ${s.fountain.on ? 'encendida' : 'apagada'}${st.night !== false ? ' · ' + (s.fountain.lit ? 'con luz' : 'sin luz') : ''}${s.fountain.on && !online ? ' — tapa el ruido de los botellines' : ''}</span>` : '');
          })()}</div>
        <div class="side r" style="--c:${c2.color}"><canvas width="192" height="176"></canvas><h3>${esc(c2.name)}</h3><p>${online ? (side === 1 ? 'Tú' : 'Rival') : 'CPU'} · ${esc(R.describeOrder(s.cpuOrder, items))}${stabText(c2, s.cpuOrder) ? ' <b class="stab-tag">' + stabText(c2, s.cpuOrder) + '</b>' : ''}</p></div>
        <span class="hint">Toca para empezar</span>
      </div>`);
      const [a, b] = node.querySelectorAll('canvas');
      drawPortrait(a, g.assets.characters[c1.id], { crop: 'full', size: c1.size });
      drawPortrait(b, g.assets.characters[c2.id], { crop: 'full', size: c2.size });
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
        ${result.wild && root.trolinaSnark ? `<p class="snark">«${esc(root.trolinaSnark(result.won ? 'win' : 'lose'))}»</p>` : ''}
        <p class="score">${result.roundsWon} – ${result.roundsLost} · ${esc(R.DIFFICULTIES[result.difficulty].name)}</p>
        <ul class="reward">${reward.lines.map((l, i) => `<li style="animation-delay:${i * 0.18}s"><span>${esc(l.label)}</span><b>+${money(l.cents)}</b></li>`).join('')}</ul>
        <p class="sum">Ganado: <b>${money(reward.total)}</b> · Cartera: <b>${money(d.coins)}</b></p>
        ${p.score ? this.scoreBlock(p.score) : ''}
        ${unlockedChar ? `<div class="unlock" style="--c:${unlockedChar.color}"><canvas width="96" height="96"></canvas><div><small>¡Nuevo luchador desbloqueado!</small><b>${esc(unlockedChar.name)}</b></div></div>` : ''}
        ${storyFinished ? '<div class="unlock gold"><div><small>Modo historia completado</small><b>Eres el rey de La Trolina</b></div></div>' : ''}
        <nav class="menu row"></nav>
      </div>`);
      if (unlockedChar) drawFace(node.querySelector('.unlock canvas'), g, unlockedChar.id);
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
      if (p.score) this.rankForm(node, p.score.total, p.entry);
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
          <button data-a="help">Cómo se pelea</button>
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
        <p class="muted center">Los objetos de la barra (botellines, chupitos, Peterete, café…) se piden antes de cada combate.</p>
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
            drawFace(card.querySelector('canvas'), g, c.id);
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
          <label>Escenario
            <select data-k="place"><option value="random">Aleatorio en cada pelea</option>${(root.TROLINA_PLACES || []).map((pl) => `<option value="${pl.id}">${pl.icon} ${esc(pl.name)}</option>`).join('')}</select></label>
          <label>Ambiente de la terraza
            <select data-k="stage"><option value="random">Aleatorio en cada pelea</option>${(root.TROLINA_STAGES || []).filter((st) => (st.place || 'terraza') === 'terraza').map((st) => `<option value="${st.id}">${st.icon} ${esc(st.name)}</option>`).join('')}</select></label>
          <label>Luces del interior del bar
            <select data-k="interiorLights"><option value="random">Aleatorias en cada pelea</option><option value="encendidas">💡 Encendidas</option><option value="apagadas">✨ Apagadas, con la bola de discoteca</option></select></label>
          <label>Hora del bar en el menú
            <select data-k="menuHour"><option value="auto">🕒 Según el reloj</option><option value="dia">☀️ De día</option><option value="tarde">🌇 Al atardecer</option><option value="noche">🌙 De noche</option></select></label>
          <label class="row">Botellines en la jardinera (+2 para lanzar cada uno) <input type="checkbox" data-k="jardinera"></label>
          <label>Fuente de la terraza
            <select data-k="fountain"><option value="random">Aleatoria en cada pelea</option><option value="on">Siempre encendida</option><option value="off">Siempre apagada</option></select></label>
          <label>Luz de la fuente
            <select data-k="fountainLight"><option value="random">Aleatoria</option><option value="lit">Con luz</option><option value="dark">Sin luz</option></select></label>
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
          if (k === 'menuHour' && root.TrolinaHub && root.TrolinaHub.ready) root.TrolinaHub.setHour(root.TrolinaHub.hourFor(st[k]));
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
      node.querySelectorAll('.cells canvas').forEach((cv) => drawFace(cv, g, cv.dataset.id));
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

    /** Pantalla de ranking (en este dispositivo). */
    ranking(p) {
      const g = this.game, rk = g.save.ranking;
      const modes = [['all', 'Todo'], ['story', 'Historia'], ['quick', 'Rápida'], ['wild', 'Salvaje'], ['online', 'Multijugador']];
      const modeName = { story: 'Historia', quick: 'Rápida', wild: 'Salvaje', online: 'Multi' };
      let filter = p.mode || 'all';
      const world = g.onlineRanking();
      let scope = world && !p.local ? 'world' : 'local';
      const node = el(`<div class="scr ranking">
        ${this.header('🏆 Ranking', 'title')}
        ${world ? '<div class="rank-tabs scope"><button data-s="world" data-silent="1">🌍 La Trolina (todos)</button><button data-s="local" data-silent="1">📱 Este móvil</button></div>' : ''}
        <div class="rank-tabs">${modes.map(([id, n]) => `<button data-m="${id}" data-silent="1">${n}</button>`).join('')}</div>
        <div class="rank-list"></div>
        <p class="muted small center rank-note"></p>
      </div>`);
      const box = node.querySelector('.rank-list');
      let req = 0;
      const paint = () => {
        node.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === filter));
        node.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === scope));
        node.querySelector('.rank-note').textContent = scope === 'world'
          ? 'Ranking compartido de todos los que juegan a La Trolina Fighters. Firma al acabar una pelea para salir aquí.'
          : 'Ranking de este móvil. Al acabar cada pelea puedes firmar con tu nombre (+' + money(R.SCORE.signBonusCents) + ' de invitación).';
        if (scope === 'world') {
          const my = ++req;
          box.innerHTML = '<p class="empty">Cargando el ranking de La Trolina…</p>';
          world.flush(g.save).catch(() => {}).then(() => world.top({ mode: filter, limit: 50 }))
            .then((rows) => {
              if (my !== req || !box.isConnected) return;
              const list = rows.map((e) => ({ ...e, char: e.fighter, at: Date.parse(e.created_at) || 0 }));
              const me = (rk.name || '').toLowerCase();
              renderList(list, (e) => me && e.name.toLowerCase() === me, 'Todavía no ha firmado nadie. ¡Sé el primero!');
            })
            .catch(() => { if (my === req && box.isConnected) box.innerHTML = '<p class="empty">No se puede cargar el ranking de La Trolina ahora mismo (¿sin conexión?). Prueba «Este móvil».</p>'; });
          return;
        }
        renderList(rk.list.filter((e) => filter === 'all' || e.mode === filter), (e) => e.at === (p.highlight || rk.lastAt), 'Todavía no hay nadie. Termina una pelea y firma con tu nombre.');
      };
      const renderList = (list, isMe, emptyText) => {
        if (!list.length) { box.innerHTML = '<p class="empty">' + emptyText + '</p>'; return; }
        box.innerHTML = '<ol>' + list.map((e, i) => {
          const c = g.charById(e.char);
          const date = new Date(e.at || 0).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          const diff = e.mode === 'online' ? (e.vs ? 'vs ' + esc(e.vs) : '') : (R.DIFFICULTIES[e.difficulty] ? R.DIFFICULTIES[e.difficulty].name : '');
          return `<li class="${isMe(e) ? 'me' : ''}${i < 3 ? ' top' + (i + 1) : ''}">
            <span class="pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
            <canvas width="40" height="40" data-c="${c ? c.id : ''}"></canvas>
            <span class="who"><b>${esc(e.name)}</b><small>${c ? esc(c.name) : ''} · ${modeName[e.mode] || ''}${diff ? ' · ' + diff : ''} · ${e.won ? 'ganó' : 'perdió'} ${esc(e.rounds || '')} · ${date}</small></span>
            <span class="pts">${R.formatPoints(e.score)}</span></li>`;
        }).join('') + '</ol>';
        box.querySelectorAll('canvas[data-c]').forEach((cv) => { if (cv.dataset.c && g.assets.characters[cv.dataset.c]) drawFace(cv, g, cv.dataset.c); });
      };
      node.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.m; paint(); root.TrolinaSfx.play('select'); }));
      node.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { scope = b.dataset.s; paint(); root.TrolinaSfx.play('select'); }));
      paint();
      this.bindBack(node);
      return node;
    },

    /** Multijugador (experimental): crear sala o unirse con un código. */
    online(p) {
      const g = this.game;
      const node = el(`<div class="scr online">
        ${this.header('Multijugador <span class="wild-badge exp">EXPERIMENTAL</span>', 'title')}
        <div class="online-box">
          <p class="intro">Pelea contra un amigo en <b>otro móvil</b> (o en otro ordenador). Uno <b>crea la sala</b> y el otro <b>se une</b> con el código. Hace falta internet en los dos; mejor si estáis en la misma wifi.</p>
          <div class="online-actions">
            <button class="primary" data-host>Crear sala</button>
            <div class="join"><input data-code maxlength="4" placeholder="CÓDIGO" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text"><button data-join>Unirse</button></div>
          </div>
          <div class="online-status" aria-live="polite"></div>
          <p class="muted small">Experimental: si va a tirones o se queda «esperando», volved a crear la sala. Todos los luchadores están disponibles y la barra es libre. Sin policía ni modo salvaje.</p>
          <p class="muted small">Versión ${esc(root.TrolinaRules.GAME_VERSION)} (huella ${esc(root.TrolinaNet ? root.TrolinaNet.FINGERPRINT : '?')}): tiene que ser la misma en los dos móviles.
            ${root.TrolinaNetLog && root.TrolinaNetLog.last() ? '<button class="ghost small" data-log>📋 Registro de la última partida</button>' : ''}</p>
        </div>
      </div>`);
      const logBtn = node.querySelector('[data-log]');
      if (logBtn) logBtn.addEventListener('click', () => this.netLogPanel(node));
      const status = node.querySelector('.online-status');
      const hostBtn = node.querySelector('[data-host]'), joinBtn = node.querySelector('[data-join]'), input = node.querySelector('[data-code]');
      const busy = (b) => { hostBtn.disabled = b; joinBtn.disabled = b; input.disabled = b; };
      const link = (code) => root.location.origin + root.location.pathname + '?sala=' + code;
      const render = (ev) => {
        const st = ev.status, info = ev.info;
        if (st === 'creating') status.innerHTML = '<p>Creando sala…</p>';
        else if (st === 'waiting') {
          status.innerHTML = `<p>Tu sala:</p><div class="room-code">${esc(info)}</div>
            <p>En el otro móvil: abre el juego → <b>Multijugador</b> → escribe <b>${esc(info)}</b> → <b>Unirse</b>. O mándale el enlace:</p>
            <button data-share>📤 Compartir enlace</button><p class="muted">Esperando a tu rival…</p>`;
          status.querySelector('[data-share]').addEventListener('click', async () => {
            const url = link(info);
            try {
              if (navigator.share) await navigator.share({ title: 'La Trolina Fighters', text: '¡Pelea conmigo! Sala ' + info, url });
              else { await navigator.clipboard.writeText(url); this.flashError(node, 'Enlace copiado'); }
            } catch (e) { /* cancelado */ }
          });
        } else if (st === 'joining') status.innerHTML = '<p>Conectando con la sala <b>' + esc(info) + '</b>…</p>';
        else if (st === 'connected') { status.innerHTML = '<p class="ok">¡Conectados! Elegid luchador…</p>'; root.TrolinaSfx.play('ready'); setTimeout(() => { if (this.current === 'online') g.netEnter(); }, 700); }
        else if (st === 'error') { status.innerHTML = '<p class="err">' + esc(info || 'Error de conexión') + '</p>'; busy(false); }
      };
      const start = (fn) => {
        busy(true);
        const net = g.netOpen();
        net.on('status', render);
        fn(net).catch((e) => render({ status: 'error', info: e.message }));
      };
      hostBtn.addEventListener('click', () => start((net) => net.host()));
      const join = () => {
        const code = input.value.toUpperCase().replace(/[^A-Z]/g, '');
        if (code.length !== 4) { this.flashError(node, 'El código tiene 4 letras'); return; }
        start((net) => net.join(code));
      };
      joinBtn.addEventListener('click', join);
      input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
      this.bindBack(node, () => g.netLeave());
      if (p.join) { input.value = String(p.join).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); setTimeout(join, 300); }
      return node;
    },

    netwait() {
      const g = this.game;
      const node = el(`<div class="scr netwait">
        <div class="online-box center">
          <h2>¡Listo!</h2>
          <p class="wait">Esperando a que tu rival elija luchador y pida en la barra…</p>
          <button class="ghost" data-leave>Salir del multijugador</button>
        </div>
      </div>`);
      node.querySelector('[data-leave]').addEventListener('click', () => g.netLeave());
      this.onNet = () => { if (g.netTheirReady) node.querySelector('.wait').textContent = 'Tu rival también está listo. ¡Vamos!'; };
      return node;
    },

    netresults(p) {
      const g = this.game;
      const won = p.mine > p.theirs, draw = p.mine === p.theirs;
      const node = el(`<div class="scr results ${won ? 'win' : 'lose'}">
        <h1>${draw ? 'EMPATE' : won ? '¡HAS GANADO!' : 'HAS PERDIDO'}</h1>
        <p class="score">${p.mine} – ${p.theirs} · Multijugador (experimental)</p>
        ${p.score ? this.scoreBlock(p.score) : ''}
        ${p.forced ? '<p class="err">Las dos partidas se separaron y tu rival terminó antes: este es su resultado.</p>' : p.desync ? '<p class="muted">Aviso: las dos partidas se desincronizaron durante la pelea.</p>' : ''}
        ${p.desync ? '<p class="muted small">Pulsa <b>Registro</b> y compártelo para encontrar el fallo.</p>' : ''}
        <p class="wait muted"></p>
        <nav class="menu row"><button class="primary" data-again>Revancha</button><button data-leave>Salir</button><button class="ghost" data-log>📋 Registro</button></nav>
        <p class="muted small">v${esc(root.TrolinaRules.GAME_VERSION)}</p>
      </div>`);
      node.querySelector('[data-log]').addEventListener('click', () => this.netLogPanel(node));
      const wait = node.querySelector('.wait');
      const paint = () => {
        if (g.netMyAgain && !g.netTheirAgain) wait.textContent = 'Esperando a que tu rival quiera la revancha…';
        else if (g.netTheirAgain && !g.netMyAgain) wait.textContent = 'Tu rival quiere la revancha.';
      };
      node.querySelector('[data-again]').addEventListener('click', () => { g.leaveMatch(); g.netAgain(); paint(); });
      node.querySelector('[data-leave]').addEventListener('click', () => { g.leaveMatch(); g.netLeave(); });
      this.onNet = paint;
      paint();
      if (p.score) this.rankForm(node, p.score.total, p.entry);
      return node;
    },

    help(p) {
      const back = p.back || 'title';
      const node = el(`<div class="scr help">
        ${this.header('Cómo se juega', back)}
        <div class="help-grid">
          <section><h3>Objetivo</h3><p>Combates al mejor de 3 asaltos de 99 s contra la máquina. Gana quien deje al rival sin vida o tenga más al acabar el tiempo.</p>
          <p>En el <b>modo historia</b> cada victoria desbloquea al rival como luchador. En <b>pelea rápida</b> eliges rival y dificultad.</p></section>
          <section class="wide"><h3>Cómo se pelea</h3>
          <p>Todo tiene respuesta: <b>golpe gana a agarre</b>, <b>agarre gana a guardia</b> y <b>guardia gana a golpe</b>. Saltar esquiva el agarre, y el puño contra alguien que salta cerca sale como <b>gancho</b> y lo tira.</p>
          <table>
            <tr><td><b>Puño</b></td><td>Rápido y seguro si te lo bloquean. Empieza los combos. Contra alguien que salta cerca sale como <b>gancho antiaéreo</b>.</td></tr>
            <tr><td><b>Patada</b></td><td>Llega más lejos y pega casi el doble, pero tarda. Si te la bloquean de cerca o la fallas, te comes un puñetazo seguro (<b>¡CASTIGO!</b>). Echa al rival hacia atrás.</td></tr>
            <tr><td><b>Agarre</b></td><td>Pegado al rival: no se puede bloquear y lo tira al suelo. Pierde contra cualquier golpe o salto, y si fallas te quedas vendido. Si te agarran, pulsa <b>AGARRE</b> enseguida para zafarte.</td></tr>
            <tr><td><b>En el aire</b></td><td>PUÑO: puño corto hacia abajo. PATADA: <b>patada en picado</b>, caes en diagonal muy rápido. Si la bloquean o falla, aterrizas vendido.</td></tr>
            <tr><td><b>Guardia</b></td><td>Joystick <b>abajo</b> (andar hacia atrás ya no cubre). Cada golpe bloqueado gasta fuelle y quita un pelín de vida. Si el fuelle llega a 0 cubriéndote: <b>¡GUARDIA ROTA!</b>, te quedas mareado.</td></tr>
            <tr><td><b>Guardia justa</b></td><td>Baja el joystick <b>justo antes</b> del golpe (habiendo estado un momento sin cubrirte): no gasta nada, recuperas fuelle y el rival se queda vendido. Machacar el joystick no sirve.</td></tr>
            <tr><td><b>Paso rápido</b></td><td>Móvil: un <b>toque rápido</b> en el joystick (apoyar y soltar) y, enseguida, vuelve a apoyar el pulgar y <b>desliza hacia un lado</b>. Teclado: doble pulsación de ← o →.</td></tr>
            <tr><td><b>Botón DASH</b></td><td>Púlsalo y el <b>siguiente movimiento del joystick</b> decide: hacia un lado, paso rápido; <b>hacia arriba, salto doble</b> (sube más y llega más lejos, para escapar o pasar por encima). Hacia abajo no hace nada. Si ya vas hacia un lado o arriba al pulsarlo, sale en el acto. Teclado: E o Mayúsculas.</td></tr>
          </table>
          <p><b>Fuelle</b> (barra bajo la vida): pegar lo gasta, unos 10 golpes. Se recupera entero en unos 3 s cuando dejas de pegar, pero <b>no mientras te cubres</b>. Si lo vacías pegando, no puedes atacar hasta que pase de la marca. Pega y descansa.</p>
          <p><b>¡CONTRA!</b>: pillar al rival mientras arranca un golpe pega más. <b>¡CASTIGO!</b>: pillarlo recuperándose de uno fallado o bloqueado. Los golpes echan hacia atrás; si el rival está contra el borde, el que sale rebotado eres tú.</p></section>
          <section><h3>Combos y ultimate</h3><p>Si un <b>puñetazo conecta</b>, puedes encadenar otro puño o una patada enseguida: puño, puño, patada… La patada cierra el combo, salvo para rematar con el ultimate.</p>
          <p><b>El Barbas</b> carga su ultimate, el <b>Dardo certero</b>, encadenando combos (cuanto más largo el combo, más carga). Con la barra llena, pulsa <b>DARDO</b>: un dardo ultrapreciso que busca al rival, no se puede bloquear y quita muchísima vida. También puedes lanzarlo al final de un combo.</p></section>
          <section><h3>La Barra y el puntillo</h3><p>Antes de cada combate puedes pedir hasta <b>10 botellines a 2,90 €</b>. Cada uno da <b>+7 % de fuerza</b> y un envase para lanzar por asalto, pero sube tu <b>puntillo</b>: niebla que crece con el tiempo, visión doble, pantalla que se balancea, tropiezos, golpes al aire y controles con retraso.</p>
          <p><b>Tabaco</b>: cada cigarrillo que fumas (botón FUMAR) quita un 15 % de puntillo, pero te quedas quieto 1,5 s y, si te pegan, se te cae. A partir del cuarto, tos.</p>
          <p><b>Bolsa de azúcar (60 €)</b>: 30 s a toda velocidad y sin puntillo; luego se pasa y a los 45 s te quedas inconsciente unos segundos.</p></section>
          <section><h3>Modo salvaje (experimental)</h3><p>Una pelea rápida donde los objetos pegan más (para bien y para mal) y, <b>a partir del segundo 30</b>, todo se desmorona para los dos: controles que se invierten, golpes que cambian solos, pasos sin querer, caídas sin que nadie te toque, botellas hacia atrás, micro-siestas y una pantalla que no se está quieta.</p>
          <p>Cada fallo te lo recuerdan en grande, con todo el cariño. A cambio, cuando un golpe entra, pega más fuerte, y si ganas te llevas una prima.</p></section>
          <section><h3>Puntuación y ranking</h3><p>Cada golpe da puntos: más si es parte de un combo y más cuanto más <b>puntillo</b> llevas al pegar (estilo). También puntúan los bloqueos, los ultimates, cada asalto ganado (más si es perfecto y con el tiempo que sobre) y la victoria. Al final se multiplica por la dificultad (fácil ×0,5, difícil ×1,5, pesadilla ×2) y el modo salvaje (×1,5).</p>
          <p>Al acabar puedes <b>firmar con tu nombre</b>: quedas en el ranking de este móvil (top 20) y, si está activado, en el <b>ranking de La Trolina</b>, compartido entre todos los móviles. Es opcional, pero la casa te invita a una ronda (+10 €).</p></section>
          <section><h3>Multijugador (experimental)</h3><p>Contra un amigo en otro móvil: uno pulsa <b>Crear sala</b> y le pasa el código de 4 letras (o el enlace); el otro pulsa <b>Unirse</b> y lo escribe. Cada uno elige luchador y pide en la barra (gratis) y la pelea empieza cuando los dos están listos. Sin policía ni modo salvaje.</p></section>
          <section><h3>Escenarios y ambientes</h3><p>Se pelea en <b>la terraza</b> o en <b>el interior del bar</b> (al azar o el que fijes en Opciones). La terraza cambia de una pelea a otra: noche, día, lluvia, nieve o Navidad. De día la luz de la fuente no se nota.</p>
          <p>El interior es más ancho: la cámara os sigue de la escalera al futbolín, pero nunca os podéis separar más que en la terraza. Unas veces tiene las luces encendidas y otras <b>apagadas, con la bola de discoteca girando</b>. Dentro no hay fuente, pero con la bola suena la música tan alta que, como la fuente encendida, <b>tapa el ruido de los botellines</b>.</p>
          <p>Si la jardinera aparece llena de botellines (opción, y siempre en el modo salvaje), cada uno tiene 2 más para lanzar, también dentro del bar.</p></section>
          <section><h3>Huecos de La Barra</h3><p>Puedes tomar hasta <b>7 bebidas</b> por pelea (botellines, chupitos, Peterete, Red Bull, café, agua…) y llevar <b>1 cosa para fumar</b>. Más huecos en la Tienda: <b>Hígado de hierro</b> (+1 bebida por nivel, hasta 10) y <b>Pitillera de plata</b> (segundo hueco para fumar).</p>
          <p>Para fumar hay tabaco (Marlboro, Ducados, de liar), puros, habanos y chiflos. Cada uno tarda más o menos y hace más o menos efecto; todos bajan el puntillo (unos más que otros) y, irónicamente, <b>devuelven vida</b>.</p></section>
          <section><h3>La fuente</h3><p>A la izquierda de la terraza hay una fuente, a veces <b>encendida</b> (con chorros) y a veces <b>apagada</b>, con o sin luz. Encendida hace tanto ruido que <b>los botellines no cuentan para la policía</b>.</p>
          <p><b>El Peñista</b> tiene el ultimate <b>¡Al pilón!</b>: se lanza a por el rival, lo agarra y lo tira a la fuente. Quita muchísima vida, no se puede bloquear y deja al rival <b>mojado</b> y más lento durante 12 s. En el interior del bar es <b>¡Al fregadero!</b>: lo tira por encima de la barra, al fregadero, y sale igual de empapado.</p></section>
          <section><h3>Policía Local</h3><p>Cada golpe, botella rota o KO hace <b>ruido</b> (barra bajo el reloj). Lo que más ruido hace es <b>lanzar muchos botellines seguidos</b>; el ruido baja solo si os calmáis, y el puntillo os hace más escandalosos.</p>
          <p>Si llega al máximo, viene la patrulla: para la pelea, <b>multa</b> a los dos y la pelea se reinicia. Si pasa <b>3 veces seguidas</b>, noche en el <b>calabozo</b>: esos luchadores no se pueden usar durante 1 minuto. Se puede desactivar en Opciones.</p></section>
          <section><h3>Teclado</h3><table>
            <tr><td>← → / A D</td><td>Andar (doble toque = paso rápido)</td></tr>
            <tr><td>↑ / W</td><td>Saltar (mantener = seguir saltando)</td></tr>
            <tr><td>↓ / S / G</td><td>Guardia (justo antes del golpe = guardia justa)</td></tr>
            <tr><td>J / Z</td><td>Puñetazo</td></tr>
            <tr><td>K / X</td><td>Patada (en el aire: en picado)</td></tr>
            <tr><td>H / N</td><td>Agarre</td></tr>
            <tr><td>E / Mayús.</td><td>DASH (y luego ← → paso rápido, ↑ salto doble)</td></tr>
            <tr><td>L / C</td><td>Lanzar botellín</td></tr>
            <tr><td>U / V</td><td>Ultimate (Dardo)</td></tr>
            <tr><td>F / B</td><td>Fumar</td></tr>
            <tr><td>Esc / P</td><td>Pausa</td></tr></table></section>
          <section><h3>Móvil</h3><p><b>Joystick</b> a la izquierda: apoya el pulgar en cualquier punto y arrastra sin levantarlo. Lados = andar (toque rápido y luego deslizar = paso rápido), arriba = saltar (en diagonal, hacia ese lado), abajo = guardia.</p>
          <p>A la derecha: <b>Puño</b>, <b>Patada</b>, <b>Agarre</b>, <b>DASH</b>, <b>Botellín</b>, <b>Fumar</b> y <b>Dardo</b> (el aro se llena con los combos). Mejor en horizontal y a pantalla completa.</p>
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
