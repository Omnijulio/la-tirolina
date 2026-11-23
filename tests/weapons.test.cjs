/* Pruebas de las armas (v0.15): reglas, arte de Sombrero (con y sin bastón) y opción de pruebas. Sin dependencias. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const R = require(path.join(root, 'game/core/rules.js'));
const { CHARACTERS } = require(path.join(root, 'game/data/characters.js'));
const scope = { window: {} };
vm.createContext(scope);
for (const file of ['assets/characters/art-data.js', 'assets/characters/hands-data.js', 'game/data/weapons.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope);
}
const ART = scope.window.TROLINA_CHARACTER_ART, HANDS = scope.window.TROLINA_HANDS;
const WART = scope.window.TROLINA_WEAPON_ART, DEV = scope.window.TROLINA_DEV;
const exists = (p) => fs.existsSync(path.join(root, p));
const pngSize = (p) => { const b = fs.readFileSync(path.join(root, p)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const sombrero = CHARACTERS.find((c) => c.id === 'sombrero');

test('el arma solo da fuerza cuerpo a cuerpo y con ella en la mano', () => {
  const b = R.WEAPONS.baston;
  assert.equal(R.weaponPower(b, 'punch', true), b.power);
  assert.equal(R.weaponPower(b, 'kick', true), b.power);
  assert.equal(R.weaponPower(b, 'punch', false), 1, 'sin arma no');
  assert.equal(R.weaponPower(b, 'bottle', true), 1, 'el botellín lanzado no');
  assert.equal(R.weaponPower(b, 'remate', true), 1, 'la ultimate tiene su propio daño');
  assert.equal(R.weaponPower(null, 'punch', true), 1);
  assert.ok(b.power > R.WEAPONS.botellin.power, 'el bastón pega más que el botellín');
  assert.ok(b.guardCost < 1 && b.reach >= 20, 'el bastón también cubre y llega más lejos');
});

test('se desarma con guardia justa a un golpe cuerpo a cuerpo o con el golpe número 3 de un combo', () => {
  assert.ok(R.disarms('parry', 0, 'punch') && R.disarms('parry', 0, 'kick'));
  assert.ok(!R.disarms('parry', 0, 'bottle'), 'parar un botellín lanzado no desarma');
  assert.ok(!R.disarms('combo', R.WEAPON.disarmCombo - 1, 'punch'));
  assert.ok(R.disarms('combo', R.WEAPON.disarmCombo, 'kick'));
  assert.equal(R.WEAPON.disarmCombo, 3);
  // Recuperarla: vuelve sola y, al recuperarla, un rato sin que se la quiten (sin bucle de desarmes).
  assert.ok(R.WEAPON.returnMs >= 6000 && R.WEAPON.returnMs <= 15000);
  assert.ok(R.WEAPON.graceMs >= 2000 && R.WEAPON.graceMs < R.WEAPON.returnMs);
  assert.ok(R.WEAPONS.baston.pickup && !R.WEAPONS.baston.breaks, 'el bastón se recoge al pasar por encima');
  assert.ok(R.WEAPONS.botellin.breaks, 'el botellín se rompe y le ponen otro');
});

test('Sombrero es flojo sin bastón y fuerte con él', () => {
  assert.ok(sombrero && sombrero.weapon === 'baston' && sombrero.unlock.start);
  assert.equal(sombrero.special.id, 'bolsa');
  const others = CHARACTERS.filter((c) => !c.weapon && !c.boss).map((c) => c.stats.power);
  const avg = others.reduce((a, b) => a + b, 0) / others.length;
  assert.ok(sombrero.stats.power < Math.min(...others), 'a pelo, el que menos pega');
  assert.ok(sombrero.stats.power * R.WEAPONS.baston.power > avg, 'con el bastón, por encima de la media');
});

test('la bolsita: el soplo le deja vendido hasta que llega el bastonazo', () => {
  const A = ART.sombrero.extras.anims['ultimate-arma'];
  assert.ok(A.puff && A.impact && A.puff.frame < A.impact.frame);
  const start = (i) => A.frames.slice(0, i).reduce((n, f) => n + f[2], 0);
  assert.ok(start(A.impact.frame) - start(A.puff.frame) < R.MOVES.soplo.hitstun, 'el remate entra antes de que se recupere');
  assert.ok(R.MOVES.soplo.unblockable && R.MOVES.remate.unblockable && R.MOVES.remate.knockdown);
  assert.ok(R.ULT_MOVES.soplo && R.ULT_MOVES.remate, 'sin escala de combo ni carga del ultimate');
  assert.ok(ART.sombrero.extras.anims['ultimate-mano'], 'también hay versión sin bastón');
});

test('arte de Sombrero: dos atlas iguales, agarre en cada celda, recoger, entrada y bici', () => {
  const art = ART.sombrero, W = art.weapon;
  assert.equal(W.id, 'baston');
  assert.ok(exists('assets/characters/sombrero.png') && exists(W.unarmed));
  assert.deepEqual(pngSize('assets/characters/sombrero.png'), pngSize(W.unarmed));
  assert.deepEqual(pngSize(W.unarmed), [6 * 192, art.rows * 176]);
  for (let r = 0; r < art.rows; r++) for (let c = 0; c < 6; c++) assert.ok(W.grip[c + ',' + r], 'agarre en ' + c + ',' + r);
  for (const p of [W.prop.image, W.hud, W.puff.image, art.extras.image, art.extras.scooter.image, art.portrait]) assert.ok(exists(p), p);
  const pick = art.extras.anims.recoger;
  assert.equal(pick.frames.length, 3);
  assert.ok(pick.pickup >= 1 && pick.pickup < 3 && pick.hand.length === 3);
  const E = art.extras.entrance;
  for (const n of [...E.sequence, ...E.unarmed]) assert.ok(art.extras.anims[n] && art.extras.anims[n].frames.length, n);
  // El luchador de la entrada está en las coordenadas de su atlas: el último cuadro casa con la guardia.
  assert.deepEqual(Array.from(art.extras.anims[E.sequence[2]].ref), [56, 160]);
  // Encajar en guardia y guardia justa con más de un fotograma.
  assert.ok(art.animations.guardHit.length >= 2 && art.animations.parry.length >= 2);
});

test('con el bastón, la caja del puño llega a la punta del bastonazo', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'source-art/personajes/sombrero/fighter.json'), 'utf8'));
  const tip = pkg.animations.punch.frames.find((f) => f.activePoint && f.activePoint.kind === 'baston').activePoint;
  const base = JSON.parse(fs.readFileSync(path.join(root, 'assets/fighter.json'), 'utf8'));
  const box = base.animations.punch.frames.find((f) => f.hitboxes && f.hitboxes.length).hitboxes[0];
  assert.ok(box.x + box.w < tip.x, 'sin alcance extra no llegaría');
  assert.ok(box.x + box.w + R.WEAPONS.baston.reach >= tip.x, 'con el alcance del bastón, sí');
});

test('armas en pruebas: El Barbas y Rizos tienen mano en cada celda y las armas tienen dibujo', () => {
  assert.ok(DEV.weaponPicker && Array.isArray(DEV.weaponPicker.characters));
  for (const id of DEV.weaponPicker.characters) assert.ok(CHARACTERS.find((c) => c.id === id), id);
  for (const id of DEV.weaponPicker.weapons) assert.ok(R.WEAPONS[id] && WART[id] && exists(WART[id].image), id);
  for (const id of ['barbas', 'rizos']) {
    const h = HANDS[id];
    assert.ok(h, id);
    for (let r = 0; r < 16; r++) for (let c = 0; c < 6; c++) assert.equal(h[c + ',' + r].length, 3, id + ' ' + c + ',' + r);
  }
});

test('el multijugador compara el estado del arma', () => {
  const src = fs.readFileSync(path.join(root, 'game/net/net.js'), 'utf8');
  assert.ok(src.includes("'ar='") && src.includes("'armas=["));
  // El arma vuelve con temporizadores del combate, no con azar ni reloj real.
  const m = fs.readFileSync(path.join(root, 'game/combat/match.js'), 'utf8');
  const sim = m.slice(m.indexOf('    updateWeapons(dt) {'), m.indexOf('    /** Se agacha a recoger el arma'));
  assert.ok(sim.length > 200 && !/Math\.random|Date\.now|performance\.now/.test(sim));
});
