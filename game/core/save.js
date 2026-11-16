/* Partida guardada en localStorage. Si el navegador lo bloquea, funciona en memoria. */
(function (root) {
  const KEY = 'trolina.save.v1';
  const RANK_KEY = 'trolina.ranking.v1';   // aparte: «Borrar progreso» no borra el ranking

  function defaults() {
    return {
      version: 1,
      coins: (root.TrolinaRules && root.TrolinaRules.START_COINS) || 3000,
      unlocked: ['barbas'],
      upgrades: {},
      story: { stage: 0, completed: false, cleared: [] },
      difficulty: 'normal',
      selected: 'barbas',
      lastOrder: { botellin: 3 },
      settings: { sound: true, volume: 0.7, touch: 'auto', reduceMotion: false, police: true, fountain: 'random', fountainLight: 'random', stage: 'random', jardinera: false },
      police: { strikes: 0, jail: {} },
      stats: { wins: 0, losses: 0, bottles: 0, earned: 0, fines: 0, nightsInJail: 0 }
    };
  }

  function merge(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    for (const [k, v] of Object.entries(extra)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        base[k] = merge(base[k], v);
      } else if (v !== undefined) base[k] = v;
    }
    return base;
  }

  const Save = {
    data: defaults(),
    persistent: true,
    /** Ranking de este dispositivo: { list: [{name, score, char, mode, difficulty, won, rounds, at}], name }. */
    ranking: { list: [], name: '' },
    loadRanking() {
      try {
        const raw = root.localStorage && root.localStorage.getItem(RANK_KEY);
        const r = raw ? JSON.parse(raw) : null;
        this.ranking = { list: Array.isArray(r && r.list) ? r.list : [], name: (r && r.name) || '' };
      } catch (e) { this.ranking = { list: [], name: '' }; }
      return this.ranking;
    },
    saveRanking() {
      try { root.localStorage.setItem(RANK_KEY, JSON.stringify(this.ranking)); } catch (e) { /* solo en memoria */ }
    },
    load() {
      this.loadRanking();
      try {
        const raw = root.localStorage && root.localStorage.getItem(KEY);
        this.data = merge(defaults(), raw ? JSON.parse(raw) : null);
      } catch (e) {
        this.persistent = false;
        this.data = defaults();
      }
      if (!this.data.unlocked.includes('barbas')) this.data.unlocked.unshift('barbas');
      return this.data;
    },
    save() {
      try { root.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { this.persistent = false; }
    },
    reset() {
      this.data = defaults();
      this.save();
    },
    isUnlocked(id) { return this.data.unlocked.includes(id); },
    unlock(id) {
      if (!this.isUnlocked(id)) { this.data.unlocked.push(id); this.save(); return true; }
      return false;
    },
    /** Milisegundos que le quedan en el calabozo (0 si está libre). */
    jailLeft(id, now) {
      const until = (this.data.police.jail || {})[id] || 0;
      return Math.max(0, until - (now || Date.now()));
    },
    jail(ids, ms) {
      const until = Date.now() + ms;
      for (const id of ids) this.data.police.jail[id] = until;
      this.save();
    },
    /** Paga lo que se pueda de una multa; devuelve lo pagado. */
    payFine(cents) {
      const paid = Math.min(cents, this.data.coins);
      this.data.coins -= paid; this.data.stats.fines += paid; this.save();
      return paid;
    },
    spend(cents) {
      if (cents > this.data.coins) return false;
      this.data.coins -= cents; this.save(); return true;
    },
    earn(cents) {
      this.data.coins += cents; this.data.stats.earned += cents; this.save();
    }
  };

  root.TrolinaSave = Save;
  if (typeof module !== 'undefined') module.exports = Save;
})(typeof window !== 'undefined' ? window : globalThis);
