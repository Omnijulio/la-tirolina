/* Pruebas del combate 2.0 (v0.12): que los números cumplan el diseño.
 * Piedra-papel-tijera, fuelle, guardia justa, retroceso y esquina. Sin dependencias. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const R = require(path.join(__dirname, '../game/core/rules.js'));
const M = require(path.join(__dirname, '../game/data/moves.js'));
const data = M.install(JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/fighter.json'), 'utf8')));
const fd = (k) => R.frameData(data.animations[k].frames, data.combatMeta[k].active);

test('el puño sale antes que la patada y es seguro si te lo bloquean', () => {
  assert.ok(fd('punch').startup < fd('kick').startup);
  assert.ok(R.blockAdvantage('punch', fd('punch')) >= 0, 'puño bloqueado: el atacante no queda en desventaja');
});

test('la patada bloqueada de cerca se castiga con un puñetazo', () => {
  assert.ok(-R.blockAdvantage('kick', fd('kick')) > fd('punch').startup);
  // …y la patada pega bastante más que el puño y empuja más.
  assert.ok(R.MOVES.kick.damage >= 1.8 * R.MOVES.punch.damage);
  assert.ok(R.MOVES.kick.push > 3 * R.MOVES.punch.push);
});

test('si los dos pulsáis a la vez, el golpe gana al agarre', () => {
  assert.ok(fd('grab').startup > fd('punch').startup);
  assert.ok(fd('grab').recovery >= 400, 'agarre fallado: te quedas vendido');
  assert.ok(R.MOVES.grab.unblockable && R.MOVES.grab.knockdown);
  assert.ok(R.GRAB.range < 200, 'solo muy de cerca');
});

test('el gancho tira al suelo y su golpe sale rápido para pillar saltos', () => {
  assert.ok(R.MOVES.gancho.knockdown);
  assert.ok(fd('gancho').startup <= fd('punch').startup);
});

test('el picado gasta mucho al que se cubre y bloqueado se aterriza vendido', () => {
  assert.ok(R.MOVES.dive.guard > R.MOVES.kick.guard);
  assert.ok(R.DIVE.landBlockMs > R.MOVES.dive.blockstun + fd('punch').startup);
});

test('fuelle: unos 10 golpes mezclados, se llena en ~3 s y no se recupera cubriéndose', () => {
  const mixed = (R.MOVES.punch.fuelle + R.MOVES.kick.fuelle) / 2;
  const n = R.FUELLE.max / mixed;
  assert.ok(n >= 8 && n <= 12, 'golpes mezclados hasta vaciarlo: ' + n);
  assert.equal(Math.round(R.fuelleRegen(3000)), R.FUELLE.max);
  assert.ok(R.FUELLE.regenDelayMs >= 1000 && R.FUELLE.regenDelayMs <= 2000);
  // Cubrirse cuesta más que pegar: quien solo se cubre pierde la guerra del fuelle.
  for (const k of ['punch', 'kick', 'dive']) assert.ok(R.MOVES[k].guard > R.MOVES[k].fuelle, k);
});

test('guardia justa: ventana corta, sin machacar y no en mitad de un bloqueo', () => {
  assert.ok(R.isParry({ heldMs: 80, idleBeforeMs: 1000, blockstun: 0 }));
  assert.ok(!R.isParry({ heldMs: R.PARRY.windowMs + 20, idleBeforeMs: 1000, blockstun: 0 }), 'demasiado pronto');
  assert.ok(!R.isParry({ heldMs: 80, idleBeforeMs: 100, blockstun: 0 }), 'subir y bajar el joystick sin parar no cuenta');
  assert.ok(!R.isParry({ heldMs: 80, idleBeforeMs: 1000, blockstun: 200 }), 'en mitad de una serie bloqueada no cuenta');
  // Tras la guardia justa da tiempo a castigar con un puño.
  assert.ok(R.PARRY.attackerStunMs - R.PARRY.defenderStunMs > fd('punch').startup);
});

test('contra y castigo pegan más', () => {
  assert.equal(R.hitType('startup'), 'counter');
  assert.equal(R.hitType('active'), 'counter');
  assert.equal(R.hitType('recovery'), 'punish');
  assert.equal(R.hitType('landing'), 'punish');
  assert.equal(R.hitType(null), null);
  assert.ok(R.hitTypeMult('counter').damage > 1 && R.hitTypeMult('punish').damage > 1);
});

test('retroceso y regla de esquina: lo que no cabe lo recibe el que pega', () => {
  assert.deepEqual(R.splitPush(120, 200), { def: 120, att: 0 });
  assert.deepEqual(R.splitPush(120, 30), { def: 30, att: 90 });
  // Distancia recorrida con la velocidad calculada y el rozamiento del suelo.
  const v = R.pushSpeed(120);
  assert.ok(Math.abs(v * v / (2 * R.PUSH.friction) - 120) < 1e-6);
});

test('las animaciones nuevas existen y los golpes tienen caja en su fotograma activo', () => {
  for (const k of ['punch', 'kick', 'gancho', 'airPunch', 'dive']) {
    const [a] = data.combatMeta[k].active;
    assert.ok(data.animations[k].frames[a].hitboxes.length, k);
  }
  assert.ok(data.animations.grab.frames.every((f) => !f.hitboxes.length), 'el agarre no usa cajas de golpe');
  assert.equal(M.phaseOf(data, 'kick', 0), 'startup');
  assert.equal(M.phaseOf(data, 'kick', 3), 'active');
  assert.equal(M.phaseOf(data, 'kick', 5), 'recovery');
});

test('con arte propio se usa su animación en vez de la provisional', () => {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/fighter.json'), 'utf8'));
  d.animations.dive = { loop: false, next: 'idle', active: [1, 1], frames: [
    { x: 0, y: 704, w: 192, h: 176, duration: 50, hitboxes: [], hurtbox: { x: 45, y: 21, w: 63, h: 139 } },
    { x: 192, y: 704, w: 192, h: 176, duration: 5000, hitboxes: [{ x: 120, y: 120, w: 40, h: 40 }], hurtbox: { x: 45, y: 21, w: 63, h: 139 } }
  ] };
  M.install(d);
  assert.equal(d.animations.dive.frames[1].y, 704);
  assert.ok(!d.animations.dive.frames[1].pose, 'sin giros provisionales');
  assert.ok(data.animations.dive.frames[1].pose, 'la provisional sí gira');
});
