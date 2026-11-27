/* Pruebas del interior del bar (v0.16): datos e imágenes, dibujo por capas, bola de discoteca,
 * elección de escenario y suelo de pelea ancho. Sin dependencias. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const R = require(path.join(root, 'game/core/rules.js'));
const { CHARACTERS } = require(path.join(root, 'game/data/characters.js'));
const scope = { window: {}, BottleSystem: class {} };
scope.window.TrolinaRules = R;
scope.window.TrolinaCombat = { S: 2, GROUND: 486, MIN_X: 70, MAX_X: 890, PUSH: 80 };
vm.createContext(scope);
for (const f of ['assets/stages/interior/interior-data.js', 'game/data/stages.js', 'game/combat/interior.js', 'game/combat/match.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), scope, { filename: f });
}
const W = scope.window, D = W.TROLINA_INTERIOR_DATA, Match = W.Match;
const pngSize = (p) => { const b = fs.readFileSync(path.join(root, p)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('imágenes del interior: panorámica a 2 px por unidad y capas dentro de ella', () => {
  assert.equal(D.scale, 2);
  assert.deepEqual([D.width, D.height], [1620, 540]);
  for (const [light, L] of Object.entries(D.lightings)) {
    assert.deepEqual(pngSize(L.image), [D.width, D.height], light + ': fondo');
    for (const k of ['counters', 'props']) {
      const [w, h] = pngSize(L[k].image);
      assert.ok(L[k].x >= 0 && L[k].y >= 0 && L[k].x + w <= D.width && L[k].y + h <= D.height, light + ': ' + k);
    }
  }
  assert.ok(D.lightings.encendidas && D.lightings.apagadas, 'luces encendidas y apagadas');
});

test('cámara y suelo: se ve la panorámica entera y nunca un borde vacío', () => {
  // pantalla = mundo − cámara×2; la panorámica va de worldX a worldX + ancho.
  assert.equal(D.worldX - D.camera.min * 2, 0, 'cámara a la izquierda: el borde izquierdo en x=0');
  assert.equal(D.worldX + D.width - D.camera.max * 2, 960, 'cámara a la derecha: el borde derecho en x=960');
  assert.equal(D.worldX + D.width / 2, 480, 'el centro de la panorámica en el centro de la pantalla');
  assert.ok(D.arena.minX - D.worldX >= 60 && D.worldX + D.width - D.arena.maxX >= 60, 'los luchadores no llegan al borde');
  // Los luchadores empiezan (330 y 630) delante de la barra principal.
  const bar = D.counters[0];
  assert.ok(bar.x0 < 330 && bar.x1 > 630);
  assert.ok(bar.top < bar.bottom && bar.bottom < 486, 'la barra está detrás de la línea de apoyo');
});

function logCtx() {
  const log = [];
  const ctx = {
    canvas: { width: 960, height: 540 }, log,
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, fillRect() {}, arc() {},
    translate(x, y) { log.push({ type: 'translate', x, y }); }, scale() {},
    drawImage(img, x, y) { log.push({ type: img.id, x, y }); },
    set globalCompositeOperation(v) { log.push({ type: 'op:' + v }); }, get globalCompositeOperation() { return 'source-over'; }
  };
  return ctx;
}
const imgs = { bg: { id: 'bg' }, counters: { id: 'counters' }, props: { id: 'props' }, glow: { id: 'glow' } };

test('dibujo: fondo, (quien está detrás de la barra, mostradores y muebles) y luchadores', () => {
  const sc = new W.InteriorScene(imgs, D, 'encendidas');
  const order = (opts) => { const ctx = logCtx(); sc.draw(ctx, { ...opts, drawActors: () => ctx.log.push({ type: 'actors' }) }); return ctx.log.filter((v) => !v.type.startsWith('translate') && !v.type.startsWith('op:')).map((v) => v.type); };
  assert.deepEqual(order({}), ['bg', 'actors']);
  assert.deepEqual(order({ drawBehind: (c) => c.log.push({ type: 'behind' }) }), ['bg', 'behind', 'counters', 'props', 'actors']);
  // La cámara mueve igual el fondo y a los luchadores (los pies no resbalan) y se queda en sus límites.
  for (const cam of [D.camera.min, -40, 0, 77.6, D.camera.max, 9999]) {
    const ctx = logCtx(); sc.draw(ctx, { cameraX: cam, drawActors() {} });
    const bg = ctx.log.find((v) => v.type === 'bg'), tr = ctx.log.filter((v) => v.type === 'translate').pop();
    assert.equal(bg.x - D.worldX, tr.x + 0, 'cámara ' + cam);
    assert.ok(bg.x <= 0 && bg.x + D.width >= 960, 'sin bordes vacíos con la cámara en ' + cam);
  }
});

test('luces apagadas: la bola de discoteca hace girar sus reflejos y centellea', () => {
  const L = D.lightings.apagadas.disco;
  assert.ok(L, 'el fondo a oscuras trae los reflejos aparte');
  assert.ok(fs.existsSync(path.join(root, L.image)));
  assert.ok(L.spots.length > 100, 'muchos reflejos');
  assert.ok(L.ball.r > 10 && L.floorY > D.counters[0].top);
  assert.ok(!D.lightings.encendidas.disco, 'con la luz encendida no hay bola girando');
  const sc = new W.InteriorScene(imgs, D, 'apagadas');
  assert.ok(sc.disco);
  // Paredes y techo hacia un lado, suelo hacia el otro; da la vuelta entera sin saltos.
  const a0 = sc.discoShift(0, false), a1 = sc.discoShift(1000, false), f0 = sc.discoShift(0, true), f1 = sc.discoShift(1000, true);
  assert.ok(a1 > a0 && (f1 - f0 + D.width) % D.width > D.width / 2, 'giran en sentidos contrarios');
  for (const t of [0, 5e5, 5e6]) for (const fl of [false, true]) { const s = sc.discoShift(t, fl); assert.ok(s >= 0 && s < D.width); }
  // Se suman con «lighter», encima del fondo y debajo de los luchadores.
  const ctx = logCtx(); sc.draw(ctx, { t: 1234, drawActors: () => ctx.log.push({ type: 'actors' }) });
  const types = ctx.log.map((v) => v.type);
  assert.ok(types.indexOf('op:lighter') > types.indexOf('bg') && types.lastIndexOf('glow') < types.indexOf('actors'));
  assert.equal(types.filter((t) => t === 'glow').length, 4, 'dos copias (para dar la vuelta) en paredes y en suelo');
});

test('escenarios: la terraza y el interior, con las luces que se elijan', () => {
  const S = W.TROLINA_STAGES, ids = S.map((s) => s.id);
  assert.ok(ids.includes('noche') && ids.includes('interior') && ids.includes('interior-apagado'));
  for (const s of S.filter((x) => x.place === 'interior')) assert.ok(s.layers.bg && s.layers.counters && s.layers.props && s.lighting);
  assert.ok(S.find((s) => s.id === 'interior-apagado').layers.glow);
  // Con la bola suena la música, que tapa los botellines como la fuente encendida; con luz, no.
  assert.ok(S.find((s) => s.id === 'interior-apagado').music && !S.find((s) => s.id === 'interior').music);
  const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
  assert.equal(R.pickArena({ place: 'interior', interiorLights: 'apagadas' }, S), 'interior-apagado');
  assert.equal(R.pickArena({ place: 'interior', interiorLights: 'encendidas' }, S), 'interior');
  assert.equal(R.pickArena({ place: 'terraza', stage: 'nieve' }, S), 'nieve');
  assert.ok(['noche', 'dia', 'lluvia', 'nieve', 'navidad'].includes(R.pickArena({ place: 'terraza', stage: 'random' }, S)));
  // Al azar: la mitad de las veces cada sitio.
  assert.equal(S.find((s) => s.id === R.pickArena({ place: 'random', stage: 'random', interiorLights: 'random' }, S, seq([0.1, 0.5]))).place, 'terraza');
  assert.equal(S.find((s) => s.id === R.pickArena({ place: 'random', stage: 'random', interiorLights: 'random' }, S, seq([0.9, 0.5]))).place, 'interior');
  // Partidas guardadas de antes (sin «place»): siguen funcionando.
  assert.ok(ids.includes(R.pickArena({ stage: 'dia' }, S)));
});

test('suelo de pelea: la terraza no cambia y en el bar nunca os separáis más que en ella', () => {
  const T = Match.arenaFor(null);
  assert.deepEqual([T.minX, T.maxX, T.span, T.wide], [70, 890, 820, false]);
  const fake = (arena, a, b) => { const m = Object.create(Match.prototype); m.arena = arena; m.p1 = { cx: a }; m.p2 = { cx: b }; m.camera = 0; return m; };
  // Terraza: los límites son siempre los de antes (70…890), esté donde esté el rival.
  for (const o of [70, 300, 480, 890]) assert.deepEqual({ ...fake(T, 0, 0).limitsFor({ cx: o }) }, { min: 70, max: 890 });
  const I = Match.arenaFor(D);
  assert.ok(I.wide && I.span === T.span && I.maxX - I.minX > T.maxX - T.minX);
  const m = fake(I, 0, 0);
  assert.deepEqual({ ...m.limitsFor({ cx: 600 }) }, { min: Math.max(I.minX, 600 - 820), max: Math.min(I.maxX, 600 + 820) });
  m.p1.cx = -250; m.p2.cx = 1200; assert.equal(m.clampX(m.p2), -250 + 820, 'el segundo no se aleja más de 820');
  m.p1.cx = 1500; assert.equal(m.clampX(m.p1), I.maxX, 'ni sale por la pared');
  // La cámara va al centro entre los dos, sin salirse de la panorámica.
  assert.equal(fake(I, 330, 630).cameraTarget(), 0);
  assert.equal(fake(I, -260, 100).cameraTarget(), D.camera.min);
  assert.equal(fake(I, 1000, 1220).cameraTarget(), D.camera.max);
  assert.equal(fake(T, 800, 890).cameraTarget(), 24);
});

test('El Peñista: en el bar, al fregadero (detrás de la barra que se vea)', () => {
  const pen = CHARACTERS.find((c) => c.id === 'penista');
  assert.equal(pen.special.id, 'fuente');
  assert.ok(pen.special.interior && pen.special.interior.name && pen.special.interior.short);
  const m = Object.create(Match.prototype); m.interior = D;
  assert.equal(m.specialOf({ char: pen }).name, pen.special.interior.name);
  m.interior = null;
  assert.equal(m.specialOf({ char: pen }).name, pen.special.name);
  const sc = new W.InteriorScene(imgs, D, 'encendidas'), bar = D.counters[0];
  for (const view of [D.camera.min * 2, 0, D.camera.max * 2]) for (const x of [-500, 0, 480, 900, 2000]) {
    const b = sc.behindBar(x, view);
    assert.ok(b.x >= bar.x0 && b.x <= bar.x1, 'detrás de la barra');
    assert.ok(b.x >= view + 100 && b.x <= view + 860, 'y a la vista');
  }
});
