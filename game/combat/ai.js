/* IA de la CPU. La dificultad (game/core/rules.js -> DIFFICULTIES) ajusta tiempo de
 * reacción, agresividad, guardia, antiaéreos y errores. El puntillo también la empeora.
 */
(function (root) {
  class CpuBrain {
    constructor(me, difficultyId, style) {
      this.me = me;
      this.d = TrolinaRules.DIFFICULTIES[difficultyId] || TrolinaRules.DIFFICULTIES.normal;
      this.style = style || 'balanced';
      this.timer = 300 + Math.random() * 300;
      this.intent = { type: 'idle', until: 0 };
      this.t = 0;
      this.actions = [];
    }

    set(type, ms) { this.intent = { type, until: this.t + ms }; }
    act(a) { this.actions.push(a); }

    think(dt, opp, match) {
      this.t += dt;
      const me = this.me;
      const ctl = { left: false, right: false, up: false, block: false, actions: [] };
      if (me.state !== 'fight') { this.actions = []; return ctl; }
      const dist = Math.abs(opp.cx - me.cx);
      const toward = Math.sign(opp.cx - me.cx) || me.facing;
      this.timer -= dt;
      if (this.timer <= 0) {
        const intox = match.intoxOf(me);
        this.timer = this.d.reactionMs * (0.7 + Math.random() * 0.6) + intox * 240;
        this.decide(dist, toward, opp, match);
      }
      const it = this.intent;
      if (this.t > it.until) it.type = 'idle';
      const press = (dir) => { if (dir > 0) ctl.right = true; else ctl.left = true; };
      if (it.type === 'approach') press(toward);
      else if (it.type === 'retreat') press(-toward);
      else if (it.type === 'block') { ctl.block = true; }
      ctl.actions = this.actions;
      this.actions = [];
      return ctl;
    }

    decide(dist, toward, opp, match) {
      const d = this.d, me = this.me, r = Math.random;
      const aggr = Math.min(0.95, d.aggression * (this.style === 'rushdown' ? 1.2 : this.style === 'zoner' ? 0.8 : this.style === 'brawler' ? 1.1 : 1));
      if (r() < d.mistakes) {
        const pick = r();
        if (pick < 0.3) this.set('approach', 300);
        else if (pick < 0.5) this.set('retreat', 300);
        else if (pick < 0.75) this.act(r() < 0.5 ? 'punch' : 'kick');
        else this.set('idle', 400);
        return;
      }
      const incoming = match.incomingBottle(me);
      const threat = (opp.attacking && opp.f.animation !== 'throwBottle' && dist < 380) || incoming;
      if (threat && r() < d.block) { this.set('block', 320 + r() * 160); return; }
      if (incoming && r() < d.antiAir * 0.8) { this.act('jump'); this.set('approach', 450); return; }
      if (opp.air && dist < 330 && r() < d.antiAir) { this.act(r() < 0.5 ? 'punch' : 'kick'); return; }
      if (me.air && dist < 300) { this.act('kick'); return; }

      const lowHp = me.hp / me.maxHp < 0.35;
      if (dist < 230) {
        const x = r();
        if (x < aggr) this.act(r() < 0.55 ? 'punch' : 'kick');
        else if (x < aggr + 0.18) this.set('retreat', 220 + r() * 220);
        else if (x < aggr + 0.3) this.set('block', 300);
        else this.set('idle', 200);
      } else if (dist < 340) {
        const x = r();
        if (x < aggr * 0.55) this.act('kick');
        else if (x < aggr * 0.55 + 0.35) this.set('approach', 180 + r() * 220);
        else if (me.ammo > 0 && x < (this.style === 'zoner' ? 0.95 : 0.8)) this.act('bottle');
        else this.set('idle', 220);
      } else {
        const x = r();
        const throwP = me.ammo > 0 && dist < 720 ? 0.3 + (lowHp ? 0.2 : 0) + (this.style === 'zoner' ? 0.2 : 0) : 0;
        if (x < throwP) this.act('bottle');
        else if (x < throwP + 0.12 * aggr) { this.act('jump'); this.set('approach', 520); }
        else this.set('approach', 300 + r() * 400);
      }
    }
  }
  root.CpuBrain = CpuBrain;
})(window);
