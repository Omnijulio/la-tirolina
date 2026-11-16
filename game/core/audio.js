/* Efectos de sonido sintetizados con WebAudio: sin archivos de audio.
 * El contexto se crea tras el primer toque/tecla (requisito de los navegadores móviles).
 */
(function (root) {
  const Sfx = {
    ctx: null, master: null, noise: null, enabled: true, volume: 0.7,
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ctx = null; }
    },
    setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; },
    tone(type, f0, f1, dur, vol, delay) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    },
    hiss(dur, vol, fType, freq, freqEnd, delay) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = fType || 'lowpass';
      f.frequency.setValueAtTime(freq || 1200, t);
      if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    },
    play(name) {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      try {
        switch (name) {
          case 'swing': this.hiss(0.09, 0.25, 'bandpass', 2400, 900); break;
          case 'punch': this.tone('sine', 160, 60, 0.12, 0.7); this.hiss(0.08, 0.5, 'lowpass', 1800); break;
          case 'kick': this.tone('sine', 120, 40, 0.18, 0.8); this.hiss(0.12, 0.55, 'lowpass', 1200); break;
          case 'block': this.tone('square', 900, 500, 0.06, 0.18); this.hiss(0.05, 0.3, 'highpass', 3000); break;
          case 'throw': this.hiss(0.22, 0.3, 'bandpass', 700, 2600); break;
          case 'glass':
            this.hiss(0.25, 0.5, 'highpass', 4000);
            this.tone('triangle', 2600, 1800, 0.12, 0.2); this.tone('triangle', 3400, 2900, 0.1, 0.15, 0.04);
            break;
          case 'whiff': this.hiss(0.14, 0.2, 'bandpass', 1400, 500); this.tone('sine', 300, 180, 0.12, 0.08); break;
          case 'ko': this.tone('sawtooth', 220, 50, 0.9, 0.35); this.tone('sine', 90, 30, 0.6, 0.6); break;
          case 'bell': this.tone('triangle', 1320, 1300, 0.7, 0.3); this.tone('sine', 660, 650, 0.9, 0.25); break;
          case 'fight': this.tone('square', 440, 440, 0.12, 0.2); this.tone('square', 660, 660, 0.25, 0.2, 0.12); break;
          case 'coin': this.tone('square', 990, 990, 0.07, 0.15); this.tone('square', 1320, 1320, 0.16, 0.15, 0.07); break;
          case 'buy': this.tone('triangle', 660, 660, 0.06, 0.25); this.tone('triangle', 880, 880, 0.1, 0.25, 0.06); break;
          case 'select': this.tone('square', 660, 700, 0.05, 0.12); break;
          case 'back': this.tone('square', 440, 330, 0.07, 0.12); break;
          case 'error': this.tone('square', 180, 160, 0.16, 0.18); break;
          case 'gulp': this.tone('sine', 300, 150, 0.12, 0.3); this.tone('sine', 280, 140, 0.12, 0.3, 0.16); break;
          case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone('square', f, f, 0.14, 0.15, i * 0.12)); break;
          case 'lose': [392, 330, 262].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.25, 0.2, i * 0.2)); break;
          case 'land': this.tone('sine', 90, 50, 0.08, 0.3); break;
          case 'super': this.tone('sawtooth', 180, 900, 0.5, 0.18); this.tone('square', 440, 1760, 0.45, 0.12, 0.05); this.hiss(0.5, 0.25, 'bandpass', 800, 5000); break;
          case 'dart': this.hiss(0.18, 0.35, 'highpass', 5000, 9000); this.tone('sine', 1800, 900, 0.15, 0.1); break;
          case 'dartHit': this.tone('sine', 140, 50, 0.3, 0.9); this.tone('triangle', 2400, 2300, 0.25, 0.2, 0.02); this.hiss(0.2, 0.6, 'lowpass', 2500); break;
          case 'ready': [880, 1175, 1568].forEach((f, i) => this.tone('square', f, f, 0.08, 0.12, i * 0.07)); break;
          case 'lighter': this.hiss(0.05, 0.3, 'highpass', 6000); this.hiss(0.35, 0.12, 'bandpass', 1200, 900, 0.06); break;
          case 'cough': this.hiss(0.12, 0.4, 'bandpass', 700, 400); this.hiss(0.12, 0.35, 'bandpass', 650, 380, 0.2); break;
          case 'faintWarn': this.tone('sine', 600, 300, 0.4, 0.2); break;
          case 'faint': this.tone('triangle', 500, 80, 1.0, 0.3); this.tone('sine', 120, 40, 0.6, 0.5, 0.3); break;
        }
      } catch (e) { /* audio opcional */ }
    }
  };
  root.TrolinaSfx = Sfx;
})(window);
