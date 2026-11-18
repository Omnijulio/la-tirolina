/* Personajes: plantel, atlas y arte propio (assets/characters/art-data.js, tools/integrate_character.py). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { CHARACTERS } = require(path.join(root, 'game/data/characters.js'));
const base = JSON.parse(fs.readFileSync(path.join(root, 'assets/fighter.json'), 'utf8'));
const scope = { window: {} };
vm.createContext(scope);
for (const file of ['src/fighter.js', 'src/bottle.js', 'assets/characters/art-data.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope);
const ART = scope.window.TROLINA_CHARACTER_ART;
const { BottleAttack } = scope.window;
const plain = (o) => JSON.parse(JSON.stringify(o));   // objetos del contexto vm → normales

/** Ancho y alto de un PNG (cabecera IHDR). */
function pngSize(rel) {
  const b = fs.readFileSync(path.join(root, rel));
  assert.equal(b.toString('ascii', 1, 4), 'PNG', rel + ' no es un PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('cada luchador tiene id único y su atlas con las mismas celdas que el común', () => {
  assert.equal(new Set(CHARACTERS.map((c) => c.id)).size, CHARACTERS.length);
  const [bw, bh] = pngSize('assets/fighter.png');
  for (const c of CHARACTERS) {
    const [w, h] = pngSize(c.atlas);
    assert.equal(w, bw, c.id + ': ancho del atlas');
    assert.ok(h % 176 === 0 && h <= bh, c.id + ': alto del atlas');
    assert.ok(c.unlock.start || c.unlock.price > 0, c.id + ': sin forma de desbloquearlo');
  }
});

test('el arte propio cubre todas las animaciones comunes y está registrado', () => {
  assert.ok(ART && Object.keys(ART).length >= 1);
  for (const [id, art] of Object.entries(ART)) {
    const c = CHARACTERS.find((x) => x.id === id);
    assert.ok(c, id + ' no está en game/data/characters.js');
    assert.equal(c.atlas, `assets/characters/${id}.png`);
    assert.deepEqual(pngSize(c.atlas), [1152, art.rows * 176]);
    assert.ok(fs.existsSync(path.join(root, art.portrait)), id + ': falta el retrato');
    assert.deepEqual(pngSize(art.portrait), [128, 128]);
    // Si faltara una fila, el combate quitaría esas animaciones y usaría poses provisionales.
    const lost = Object.entries(base.animations)
      .filter(([, a]) => a.frames.some((f) => f.y + f.h > art.rows * 176 || (art.missingRows || []).includes(f.y / 176)))
      .map(([n]) => n);
    assert.deepEqual(lost, [], id + ': animaciones sin dibujo propio');
  }
});

test('el botellín sale de la mano de cada personaje con arte propio', () => {
  for (const [id, art] of Object.entries(ART)) {
    assert.equal(art.sockets.length, 4, id);
    for (const s of art.sockets) assert.ok(s.x >= 0 && s.x < 192 && s.y >= 0 && s.y < 176, id + ': mano fuera de la celda');
    const data = BottleAttack.install(base, { sockets: art.sockets });
    const fr = data.animations.throwBottle.frames;
    for (let i = 0; i < 3; i++) assert.deepEqual(plain(fr[i].itemSocket), plain(art.sockets[i]));
    const ev = fr[3].events.filter((e) => e.type === 'spawn-projectile' && e.weapon === 'bottle');
    assert.equal(ev.length, 1, 'un solo botellín por lanzamiento');
    assert.deepEqual(plain(ev[0].socket), plain(art.sockets[3]));
    // Los tiempos y las cajas de golpe siguen siendo los comunes.
    const common = BottleAttack.install(base);
    for (const n of ['punch', 'kick', 'gancho', 'airPunch', 'dive', 'grab']) assert.deepEqual(plain(data.animations[n]), plain(common.animations[n]), n);
  }
});

test('Rizos está disponible desde el principio y sin ultimate de momento', () => {
  const rizos = CHARACTERS.find((c) => c.id === 'rizos');
  assert.ok(rizos && rizos.unlock.start);
  assert.equal(rizos.special, undefined);
});
