/* Pruebas del multijugador: matemáticas deterministas y versión de los archivos. Sin dependencias. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const R = require(path.join(__dirname, '../game/core/rules.js'));

test('seno, coseno y arcotangente deterministas se parecen a los de Math', () => {
  let e = 0;
  for (let x = -60; x < 60; x += 0.0173) e = Math.max(e, Math.abs(R.dsin(x) - Math.sin(x)), Math.abs(R.dcos(x) - Math.cos(x)));
  assert.ok(e < 1e-6, 'error seno/coseno ' + e);
  let a = 0;
  for (let i = -50; i <= 50; i++) for (let j = -50; j <= 50; j++) if (i || j) a = Math.max(a, Math.abs(R.datan2(i / 7, j / 3) - Math.atan2(i / 7, j / 3)));
  assert.ok(a < 1e-4, 'error atan2 ' + a);
  assert.equal(R.dhypot(3, 4), 5);
});

test('la simulación no usa trigonometría de Math (cambia entre iPhone y Android)', () => {
  // En el combate solo se permiten Math.sin/cos/atan2/hypot/pow dentro de funciones de dibujo.
  const src = fs.readFileSync(path.join(__dirname, '../game/combat/match.js'), 'utf8');
  const sim = src.slice(src.indexOf('updateGrab(dt)'), src.indexOf('/* ---------- dibujo ---------- */'));
  assert.ok(!/Math\.(sin|cos|atan2|hypot|pow|exp|log)\(/.test(sim), 'match.js: trigonometría de Math en la parte que simula');
  const c = fs.readFileSync(path.join(__dirname, '../game/combat/combatant.js'), 'utf8');
  const csim = c.slice(c.indexOf('update(dt, ctl, opp, match)'), c.indexOf('    pose() {'));
  assert.ok(!/Math\.(sin|cos|atan2|hypot|pow|exp|log)\(/.test(csim), 'combatant.js: trigonometría de Math en la parte que simula');
});

test('index.html pide los archivos con la versión del juego (sin mezclar caché vieja y nueva)', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const local = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
  assert.ok(local.length > 20);
  for (const u of local) assert.ok(u.endsWith('?v=' + R.GAME_VERSION), u + ' debería acabar en ?v=' + R.GAME_VERSION);
  assert.ok(html.includes('game/style.css?v=' + R.GAME_VERSION));
});
