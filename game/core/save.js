/* Partida guardada en localStorage. Si el navegador lo bloquea, funciona en memoria. */
(function (root) {
  const KEY = 'trolina.save.v1';

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
      settings: { sound: true, volume: 0.7, touch: 'auto', reduceMotion: false },
      stats: { wins: 0, losses: 0, bottles: 0, earned: 0 }
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
    load() {
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
