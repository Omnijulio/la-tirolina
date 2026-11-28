/* BMX (v0.18): paquete completo (atlas + entrada en BMX + ultimate del andamio), integrado con
 * tools/integrate_character.py. Comprueba los datos generados, que la ultimate cabe en pantalla y que
 * su simulación no rompe el multijugador. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const R = require(path.join(root, 'game/core/rules.js'));
const { CHARACTERS } = require(path.join(root, 'game/data/characters.js'));
const scope = { window: {} };
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/characters/art-data.js'), 'utf8'), scope);
const ART = JSON.parse(JSON.stringify(scope.window.TROLINA_CHARACTER_ART));
const bmx = CHARACTERS.find((c) => c.id === 'bmx');
const art = ART.bmx, ex = art && art.extras;
const S = 2, GROUND = 486;

function pngSize(rel) {
  const b = fs.readFileSync(path.join(root, rel));
  assert.equal(b.toString('ascii', 1, 4), 'PNG', rel + ' no es un PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
const total = (a) => a.frames.reduce((n, f) => n + f[2], 0);

test('BMX: en el plantel desde el principio, con arte propio y la ultimate del andamio', () => {
  assert.ok(bmx && bmx.unlock.start, 'disponible desde el principio');
  assert.equal(bmx.atlas, 'assets/characters/bmx.png');
  assert.equal(bmx.special.id, 'andamio');
  assert.ok(art && art.portrait && fs.existsSync(path.join(root, art.portrait)));
  assert.ok(art.mouth, 'boca para el pitillo');
  // Las poses en el aire del paquete venían altas: se bajan como las de los demás.
  for (const k of ['jump:1', 'jump:2', 'jump:3', 'air:0', 'air:2', 'hit:4', 'grabbed:1']) assert.ok(art.loweredAirborne[k] > 0, k);
  assert.ok(!Object.keys(art.loweredAirborne).some((k) => k.startsWith('idle') || k.startsWith('walk')), 'de pie no se toca');
});

test('BMX: segunda hoja con la entrada y la ultimate, todas con el pie a la misma altura', () => {
  assert.ok(ex, 'falta extras en art-data.js');
  const names = Object.keys(ex.anims);
  const rows = names.length, cols = Math.max(...Object.values(ex.anims).map((a) => a.frames.length));
  assert.deepEqual(pngSize(ex.image), [cols * ex.cell[0], rows * ex.cell[1]]);
  for (const [n, a] of Object.entries(ex.anims)) {
    for (const [x, y, ms] of a.frames) assert.ok(x % ex.cell[0] === 0 && y % ex.cell[1] === 0 && ms > 0, n);
    assert.equal(a.ref[1], ex.cell[1] - 16, n + ': el pie, a 16 px del borde de abajo');
  }
  assert.deepEqual(ex.entrance.sequence, ['bmx-rodar', 'bmx-frenar', 'bmx-bajar']);
  assert.ok(ex.anims['bmx-rodar'].loop, 'pedalea en bucle mientras llega');
  assert.deepEqual(ex.ultimate.sequence, ['montar-andamio', 'trepar', 'lanzar-ladrillo', 'fumar-puro']);
  assert.equal(ex.ultimate.kind, 'andamio');
  assert.deepEqual(ex.anims['montar-andamio'].build, [1, 2, 3], 'cada cuadro, una fase del montaje');
  const L = ex.anims['lanzar-ladrillo'], F = ex.anims['fumar-puro'];
  assert.ok(L.release && L.release.frame === 2, 'suelta el ladrillo en el tercer cuadro');
  assert.ok(F.heal && F.emit && F.heal.frame === F.emit.frame, 'la calada cura y echa humo');
  // La bici aparcada, como la del último cuadro de la bajada (delante de él, a su escala).
  const b = ex.scooter;
  assert.ok(fs.existsSync(path.join(root, b.image)));
  assert.ok(b.scale > 0.7 && b.scale < 0.95, 'escala de la bici');
  assert.ok(b.at[0] > ex.anims['bmx-bajar'].ref[0] + 40, 'la bici queda delante');
  for (const k of ['ladrillo', 'humo', 'curacion']) assert.ok(fs.existsSync(path.join(root, ex.fx[k].image)), k);
});

test('BMX: el andamio cabe en pantalla y se sube sin moverse del sitio', () => {
  // Subido al piso, la cabeza no sube más que en un salto normal (ahí ya se juega con el marcador).
  const apex = (940 * 940) / (2 * 2700);
  for (const place of ['exterior', 'interior']) {
    const sc = ex.scaffold[place];
    assert.ok(sc, place);
    assert.deepEqual(pngSize(sc.image), [sc.frames * sc.cell[0], sc.cell[1]], place + ': fases del montaje en fila');
    assert.ok(sc.rise * S <= apex + 4, place + ': el piso no queda más alto que un salto');
    assert.ok(GROUND - sc.rise * S - 140 * S > 0, place + ': la cabeza dentro de la pantalla');
    // De pie arriba (pie de atrás en su ancla, el de delante a ~85 px al lanzar), el piso está debajo.
    assert.ok(sc.at + sc.deck[0] < 0 && sc.at + sc.deck[1] >= 80, place + ': el piso le queda debajo');
  }
  // Fuera se queda a medio montar: un piso (el segundo no cabe).
  assert.equal(ex.scaffold.exterior.frames, 2);
  assert.equal(ex.scaffold.interior.frames, 4);
});

test('BMX: reglas de la ultimate (ladrillo imbloqueable que tumba y algo de vida)', () => {
  const m = R.MOVES.ladrillo;
  assert.ok(m && m.unblockable && m.knockdown);
  assert.ok(R.ULT_MOVES.ladrillo, 'sin escala de combo');
  assert.ok(R.SCORE.hit.ladrillo > 0);
  assert.ok(m.damage < R.MOVES.dart.damage, 'pega menos que el dardo: además cura');
  assert.ok(R.ANDAMIO.heal > 0 && R.ANDAMIO.heal < R.PITI.heal, 'cura menos que la pausa para el piti');
  assert.ok(R.GAME_VERSION >= '0.18.0');
});

test('BMX: la ultimate solo usa el combate (sin azar ni trigonometría: multijugador)', () => {
  const src = fs.readFileSync(path.join(root, 'game/combat/match.js'), 'utf8');
  const sim = src.slice(src.indexOf('    startScaffold(att) {'), src.indexOf('    /** Trozos de ladrillo'));
  assert.ok(sim.length > 1500, 'falta la ultimate del andamio en match.js');
  assert.ok(!/Math\.(random|sin|cos|atan2|hypot|pow)|Date\.now|performance\.now/.test(sim));
  const ai = fs.readFileSync(path.join(root, 'game/combat/ai.js'), 'utf8');
  assert.ok(ai.includes("sp === 'andamio'"), 'la CPU sabe cuándo usarla');
  const net = fs.readFileSync(path.join(root, 'game/net/net.js'), 'utf8');
  assert.ok(net.includes("'ladrillos='"), 'los ladrillos entran en la comprobación de sincronía');
});
