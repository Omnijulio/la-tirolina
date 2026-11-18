/* IA de la CPU. La dificultad (game/core/rules.js -> DIFFICULTIES) ajusta tiempo de
 * reacción, agresividad, guardia, antiaéreos, errores y, desde v0.12 («Combate 2.0»),
 * agarres, castigos, guardia justa, zafarse, patada en picado y cuánto cuida su fuelle.
 * El puntillo también la empeora.
 */
(function (root) {
  const R = () => root.TrolinaRules;

  class CpuBrain {
    constructor(me, difficultyId, style) {
      this.me = me;
      this.d = TrolinaRules.DIFFICULTIES[difficultyId] || TrolinaRules.DIFFICULTIES.normal;
      this.style = style || 'balanced';
      this.timer = 300 + Math.random() * 300;
      this.intent = { type: 'idle', until: 0 };
      this.t = 0;
      this.actions = [];
      this.reflex = null;       // acción rápida programada (castigo, antiaéreo…)
      this.seenAction = -1;     // último golpe del rival que ya ha evaluado
      this.seenRecovery = -1;
      this.techTried = false;
    }

    set(type, ms, parry) { this.intent = { type, until: this.t + ms, parry: !!parry }; }
    act(a) { this.actions.push(a); }
    /** Programa una acción tras un tiempo de reacción (más corto que el de decidir). */
    soon(a, ms) { if (!this.reflex) this.reflex = { a, at: this.t + ms }; }

    think(dt, opp, match) {
      this.t += dt;
      const me = this.me, d = this.d, r = Math.random;
      const ctl = { left: false, right: false, up: false, block: false, actions: [] };
      // Agarrado: intenta zafarse pulsando AGARRE a tiempo (una vez por agarre).
      if (me.state === 'grabbed') {
        if (!this.techTried && match.throwing && match.throwing.def === me) {
          this.techTried = true;
          if (r() < d.tech) ctl.actions = ['grab'];
        }
        return ctl;
      }
      this.techTried = false;
      if (me.state !== 'fight') { this.actions = []; this.reflex = null; return ctl; }
      // Pausa para el piti del rival: no se puede hacer nada… salvo fumarse uno también.
      if (match.truce && match.truce.att !== me) {
        if (this.truceSeen !== match.truce) {
          this.truceSeen = match.truce;
          if (me.currentSmoke && !me.smoking && !me.air && (me.hp < me.maxHp * 0.9 || match.intoxOf(me) > 0.2) && r() < 0.75) ctl.actions = ['smoke'];
        }
        this.actions = []; this.reflex = null;
        return ctl;
      }
      const dist = Math.abs(opp.cx - me.cx);
      const toward = Math.sign(opp.cx - me.cx) || me.facing;
      const reflexMs = Math.max(70, d.reactionMs * 0.45);

      // Combos: un puño que conecta se encadena; puño o patada que conecta, al ultimate.
      if (me.canCancelSpecial() && this.comboAction !== me.f.actionId) {
        this.comboAction = me.f.actionId;
        if (me.meterFull && me.char.special.id !== 'piti' && r() < d.combo) this.act('special');
        else if (me.canCancel() && r() < d.combo) this.act(r() < 0.55 ? 'punch' : 'kick');
      }

      // Reflejos que no esperan a la siguiente decisión.
      if (opp.state === 'fight' && !me.busy && !me.attacking) {
        const ph = opp.attackPhase();
        // Guardia justa: baja la guardia justo antes de que llegue el golpe (si llevaba un rato sin cubrirse).
        if (opp.attacking && ph === 'startup' && this.seenAction !== opp.f.actionId) {
          const reach = opp.f.animation === 'kick' ? 290 : opp.f.animation === 'dive' ? 420 : 230;
          const ms = opp.msToActive();
          if (dist < reach && ms <= 120 && opp.f.animation !== 'grab' && opp.f.animation !== 'throwBottle') {
            this.seenAction = opp.f.actionId;   // una tirada por golpe del rival
            if (!me.blockInput && me.t - me.blockReleaseT > R().PARRY.lockoutMs && r() < d.parry) {
              this.set('block', ms + 160, true);
            }
          }
        }
        // Castigo: el rival se ha quedado vendido (golpe fallado o bloqueado, o aterrizando de un picado).
        if ((ph === 'recovery' || ph === 'landing') && this.seenRecovery !== (opp.f.actionId + (ph === 'landing' ? 0.5 : 0))) {
          this.seenRecovery = opp.f.actionId + (ph === 'landing' ? 0.5 : 0);
          if (r() < d.punish) {
            if (dist < 210) this.soon('punch', reflexMs);
            else if (dist < 270) this.soon('kick', reflexMs);
          }
        }
        // Antiaéreo: el puño contra alguien que salta cerca sale como gancho.
        if (opp.air && dist < 300 && -opp.y > 40 && opp.vy > -200 && r() < d.antiAir * dt / 120) this.soon('punch', reflexMs * 0.6);
      }
      if (this.reflex && this.t >= this.reflex.at) { this.act(this.reflex.a); this.reflex = null; }

      this.timer -= dt;
      if (this.timer <= 0) {
        const intox = match.intoxOf(me);
        this.timer = d.reactionMs * (0.7 + r() * 0.6) + intox * 240;
        this.decide(dist, toward, opp, match);
      }
      const it = this.intent;
      if (this.t > it.until) it.type = 'idle';
      const press = (dir) => { if (dir > 0) ctl.right = true; else ctl.left = true; };
      if (it.type === 'approach') press(toward);
      else if (it.type === 'retreat') press(-toward);
      else if (it.type === 'block') { ctl.block = true; ctl.noParry = !it.parry; }   // solo cuenta como guardia justa si la buscaba
      // Sin fuelle no puede atacar: no pierde el tiempo pulsando (salta, fuma o usa el ultimate).
      ctl.actions = me.exhausted ? this.actions.filter((a) => a === 'jump' || a === 'smoke' || a === 'special') : this.actions;
      this.actions = [];
      return ctl;
    }

    decide(dist, toward, opp, match) {
      const d = this.d, me = this.me, r = Math.random, F = R().FUELLE;
      const aggr = Math.min(0.95, d.aggression * (this.style === 'rushdown' ? 1.2 : this.style === 'zoner' ? 0.8 : this.style === 'brawler' ? 1.1 : 1));
      if (r() < d.mistakes) {
        const pick = r();
        if (pick < 0.3) this.set('approach', 300);
        else if (pick < 0.5) this.set('retreat', 300);
        else if (pick < 0.75) this.act(r() < 0.5 ? 'punch' : 'kick');
        else this.set('idle', 400);
        return;
      }
      // Rival indefenso (desmayado, mareado por guardia rota): a por él.
      if (opp.faintT > 0 || opp.dizzyT > 0) {
        if (dist < 200) this.act(r() < 0.6 ? 'punch' : 'kick');
        else if (dist < 270) this.act('kick');
        else this.set('approach', 300);
        return;
      }
      // Rival en el suelo: no se le puede pegar; se coloca.
      if (opp.downed) { this.set(dist > 260 ? 'approach' : 'idle', 220); return; }
      if (me.meterFull && opp.state === 'fight') {
        const sp = me.char.special.id;
        // El dardo vale a cualquier distancia; el pilón necesita estar cerca y con el rival en el suelo.
        // La pausa para el piti cura: mejor cuando ya ha recibido.
        const ok = sp === 'fuente' ? dist < 420 && !opp.air : sp === 'piti' ? me.hp < me.maxHp * 0.75 || r() < 0.1 : dist < 850;
        if (ok && (opp.hitstun > 0 || r() < 0.45)) { this.act('special'); return; }
      }
      const intox = match.intoxOf(me);
      // Fuma para bajar el puntillo… o para curarse. Lo largo (puros, habanos) solo si está lejos.
      const sm = me.currentSmoke;
      if (sm && (intox > 0.3 || me.hp < me.maxHp * 0.45) && dist > (sm.ms > 3000 ? 520 : 380) && !match.incomingBottle(me) && r() < 0.4) { this.act('smoke'); return; }
      // Sin fuelle (o casi): se aparta a respirar en vez de seguir pegando.
      const tired = me.exhausted || me.fuelle < 22;
      if (tired && r() < d.rest) {
        if (dist < 260) { if (!me.exhausted && r() < 0.3) this.act('dashB'); else this.set('retreat', 300 + r() * 200); } else this.set('idle', 300);
        return;
      }
      const incoming = match.incomingBottle(me);
      const threat = (opp.attacking && opp.f.animation !== 'throwBottle' && opp.f.animation !== 'grab' && dist < 380) || incoming;
      // Cubrirse cuesta fuelle: con poco, mejor apartarse o saltar.
      if (threat && r() < d.block) {
        if (me.fuelle > 30 || r() > d.rest) { this.set('block', 280 + r() * 160); return; }
        this.set('retreat', 260); return;
      }
      if (incoming && r() < d.antiAir * 0.8) { this.act('jump'); this.set('approach', 450); return; }
      if (me.air) {
        if (-me.y > 60 && dist < 420 && dist > 120 && r() < d.dive + 0.2) { this.act('kick'); return; }
        if (dist < 200) { this.act('punch'); return; }
      }
      // El rival se cubre (o se ha quedado quieto cubriéndose): agarre.
      const G = R().GRAB;
      if (opp.guard && opp.blockstun <= 0) {
        if (dist < G.range - 10 && r() < d.grab) { this.act('grab'); return; }
        if (dist < 300 && r() < d.grab * 0.6) { this.act('dashF'); return; }
        if (dist < 320 && r() < d.dive) { this.act('jump'); this.set('approach', 380); return; }
      }

      const lowHp = me.hp / me.maxHp < 0.35;
      if (dist < 200) {
        // De cerca: el puño es más rápido y seguro; la patada, para rematar.
        const x = r();
        if (x < aggr) this.act(r() < 0.65 ? 'punch' : r() < 0.6 ? 'kick' : 'grab');
        else if (x < aggr + 0.15) this.set('retreat', 220 + r() * 220);
        else if (x < aggr + 0.25 && me.fuelle > 30) this.set('block', 300);
        else this.set('idle', 200);
      } else if (dist < 290) {
        // Media distancia: la patada llega; el puño no.
        const x = r();
        if (x < aggr * 0.55) this.act('kick');
        else if (x < aggr * 0.55 + 0.3) this.set('approach', 160 + r() * 200);
        else if (me.ammo > 0 && x < (this.style === 'zoner' ? 0.95 : 0.8)) this.act('bottle');
        else this.set('idle', 220);
      } else {
        const x = r();
        let throwP = me.ammo > 0 && dist < 720 ? 0.3 + (lowHp ? 0.2 : 0) + (this.style === 'zoner' ? 0.2 : 0) : 0;
        // Con mucho ruido la CPU lista se corta con los botellines para no llamar a la policía.
        if (match.police && match.noise > 60 && this.d.id !== 'facil') throwP *= 0.3;
        if (x < throwP) this.act('bottle');
        else if (x < throwP + 0.14 * aggr) { this.act('jump'); this.set('approach', 520); }
        else if (x < throwP + 0.24 * aggr && dist < 480) this.act('dashF');
        else this.set('approach', 300 + r() * 400);
      }
      if (me.fuelle < F.exhaustedUntil && r() < d.rest * 0.5) this.set('idle', 250);
    }
  }
  root.CpuBrain = CpuBrain;
})(window);
