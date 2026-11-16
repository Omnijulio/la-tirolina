/* Ranking compartido entre todos los móviles (Supabase, API REST).
 * Solo se usa si game/data/online-config.js tiene URL y clave; si no hay conexión,
 * lo firmado se queda pendiente y se sube más tarde.
 * Para pruebas: ?rankapi=http://localhost:PUERTO usa un servidor simulado.
 */
(function (root) {
  const TABLE = 'ranking';
  const VERSION = '0.11';
  const FIELDS = 'name,score,fighter,mode,difficulty,won,rounds,vs,created_at';

  function cfg() {
    const test = new URLSearchParams(root.location.search).get('rankapi');
    if (test) return { url: test.replace(/\/+$/, ''), key: 'test' };
    const c = root.TROLINA_ONLINE || {};
    return { url: String(c.supabaseUrl || '').trim().replace(/\/+$/, ''), key: String(c.supabaseKey || '').trim() };
  }

  async function call(path, opts) {
    const { url, key } = cfg();
    const headers = { apikey: key, 'Content-Type': 'application/json', ...(opts && opts.headers) };
    // Las claves antiguas (JWT) también van en Authorization; las nuevas sb_publishable, solo en apikey.
    if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;
    const ctrl = root.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 8000);
    try {
      const r = await root.fetch(url + '/rest/v1/' + path, { ...opts, headers, signal: ctrl && ctrl.signal });
      if (!r.ok) throw new Error('El ranking respondió ' + r.status);
      return r;
    } finally { clearTimeout(timer); }
  }

  const OnlineRanking = {
    get enabled() { const c = cfg(); return !!(c.url && c.key) && typeof root.fetch === 'function'; },

    /** Los mejores (opcionalmente de un modo). */
    async top({ mode, limit = 50 } = {}) {
      let q = TABLE + '?select=' + FIELDS + '&order=score.desc,created_at.asc&limit=' + limit;
      if (mode && mode !== 'all') q += '&mode=eq.' + encodeURIComponent(mode);
      const r = await call(q, { method: 'GET' });
      return r.json();
    },

    /** Puesto que tendría una puntuación (1 = el mejor). */
    async position(score) {
      const r = await call(TABLE + '?select=name&score=gt.' + Math.floor(score) + '&limit=1', { method: 'GET', headers: { Prefer: 'count=exact' } });
      const n = Number(String(r.headers.get('content-range') || '').split('/')[1]);
      return Number.isFinite(n) ? n + 1 : null;
    },

    async submit(e) {
      const body = {
        name: e.name, score: Math.round(e.score), fighter: e.char, mode: e.mode,
        difficulty: e.difficulty || null, won: !!e.won, rounds: e.rounds || null, vs: e.vs || null, version: VERSION
      };
      await call(TABLE, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(body) });
      return true;
    },

    /** Sube lo que quedó pendiente (sin conexión al firmar). */
    async flush(save) {
      const rk = save.ranking;
      if (!this.enabled || !rk.pending || !rk.pending.length) return 0;
      let sent = 0;
      while (rk.pending.length) {
        try { await this.submit(rk.pending[0]); } catch (err) { break; }
        rk.pending.shift(); sent++; save.saveRanking();
      }
      return sent;
    }
  };

  root.TrolinaOnlineRanking = OnlineRanking;
})(window);
