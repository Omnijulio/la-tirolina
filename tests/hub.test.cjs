/* Pruebas del menú del bar (v0.17): datos, recortes, perspectiva de las flechas y hora del bar.
 * Sin dependencias ni navegador: carga los scripts en un contexto de Node. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const scope = { window: {} };
scope.window.window = scope.window;
vm.createContext(scope);
for (const f of ['assets/menu/menu-data.js', 'game/data/hub.js', 'game/ui/hub.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), scope, { filename: f });
}
const W = scope.window, D = W.TROLINA_MENU_DATA, HUB = W.TROLINA_HUB, Hub = W.TrolinaHub;
const pngSize = (p) => { const b = fs.readFileSync(path.join(root, p)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const webpSize = (p) => {
  const b = fs.readFileSync(path.join(root, p));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  throw new Error('WebP inesperado: ' + kind);
};

test('vistas: día, tarde y noche, con las luces encendidas y apagadas, del mismo tamaño', () => {
  for (const h of ['dia', 'tarde', 'noche']) {
    for (const l of ['encendidas', 'apagadas']) {
      const src = D.views[h][l];
      assert.ok(fs.existsSync(path.join(root, src)), src);
      assert.deepEqual(webpSize(src), [D.width, D.height], src);
    }
  }
});

test('objetos: el recorte cabe en el atlas y su sitio, en la escena', () => {
  const [aw, ah] = pngSize(D.sprites.objetos);
  assert.deepEqual(pngSize(D.sprites.halos), [aw, ah]);
  for (const [id, o] of Object.entries(D.objects)) {
    const [x, y, w, h] = o.src;
    assert.ok(x >= 0 && y >= 0 && x + w <= aw && y + h <= ah, id + ': recorte');
    assert.ok(o.at[0] >= 0 && o.at[1] >= 0 && o.at[0] + w <= D.width && o.at[1] + h <= D.height, id + ': sitio');
    const [b0, b1, b2, b3] = o.box;
    assert.ok(b0 >= o.at[0] && b1 >= o.at[1] && b2 <= o.at[0] + w && b3 <= o.at[1] + h, id + ': caja dentro del recorte');
  }
  for (const f of Object.values(D.ui).flatMap((u) => typeof u === 'string' ? [u] : Object.values(u).filter((v) => typeof v === 'string' && v.endsWith('.png')))) {
    assert.ok(fs.existsSync(path.join(root, f)), f);
  }
  assert.deepEqual(pngSize(D.ui.iconos.image), [48 * 9, 48]);
  assert.ok(D.bulbs.length > 60 && D.bulbs.every(([x, y]) => x >= 0 && x < D.width && y >= 0 && y < D.height));
});

test('destinos: todos existen, cada objeto está en los datos y el ancla, en la imagen', () => {
  const ids = HUB.destinations.map((d) => d.id);
  for (const id of ['story', 'quick', 'wild', 'online', 'shop', 'darts', 'ranking', 'help', 'options']) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(HUB.first));
  for (const d of HUB.destinations) {
    if (d.kind === 'object') assert.ok(D.objects[d.object], d.id + ': objeto ' + d.object);
    else assert.ok(HUB.paths[d.path], d.id + ': flecha ' + d.path);
    assert.ok(d.anchor[0] > 0 && d.anchor[0] < D.width && d.anchor[1] > 0 && d.anchor[1] < D.height, d.id + ': ancla');
  }
  // De izquierda a derecha (el teclado las recorre en este orden).
  const xs = HUB.destinations.map((d) => d.anchor[0]);
  assert.deepEqual(xs, xs.slice().sort((a, b) => a - b));
});

test('flechas: en el suelo, dentro de la imagen, y la del comedor sube los tres peldaños', () => {
  const { buildPath, project } = Hub._test;
  for (const [id, def] of Object.entries(HUB.paths)) {
    const P = buildPath(def);
    for (const [u, v] of P.L.concat(P.Rr)) {
      assert.ok(u > 0 && u < D.width && v > HUB.floor.vh && v < D.height + 40, `${id}: (${u.toFixed(0)}, ${v.toFixed(0)})`);
    }
    assert.ok(P.total > 0.3, id + ': largo');
    // Termina más al fondo de lo que empieza.
    assert.ok(P.end.Z > P.pts[0].Z, id + ': va hacia el fondo');
  }
  const P = buildPath(HUB.paths.comedor);
  const levels = P.pts.map((p) => p.lv);
  assert.deepEqual([...new Set(levels)], [0, 1, 2, 3]);
  assert.ok(levels.every((lv, i) => i === 0 || lv >= levels[i - 1]), 'nunca baja');
  // Cada subida es vertical (mismo X, Z): la cinta sigue la contrahuella.
  for (let i = 1; i < P.pts.length; i++) {
    if (P.pts[i].lv !== P.pts[i - 1].lv) {
      assert.equal(P.pts[i].X, P.pts[i - 1].X); assert.equal(P.pts[i].Z, P.pts[i - 1].Z);
      const [u0, v0] = project(P.pts[i].X, P.pts[i].Z, P.pts[i - 1].lv), [u1, v1] = project(P.pts[i].X, P.pts[i].Z, P.pts[i].lv);
      assert.ok(Math.abs(u0 - u1) < 1e-9 && v1 < v0, 'subir es ir hacia arriba en la imagen');
    }
  }
});

test('perspectiva: lo lejano se ve más pequeño y más cerca del horizonte', () => {
  const { project } = Hub._test;
  const [, vNear] = project(0, 1.5, 0), [, vFar] = project(0, 6, 0);
  assert.ok(vNear > vFar && vFar > HUB.floor.vh);
  const wNear = project(0.2, 1.5, 0)[0] - project(-0.2, 1.5, 0)[0];
  const wFar = project(0.2, 6, 0)[0] - project(-0.2, 6, 0)[0];
  assert.ok(wNear > 3 * wFar);
});

test('hora del bar: según el mes y la hora, o la fijada en Opciones', () => {
  const at = (m, h) => new Date(2026, m - 1, 15, h, 0, 0);
  assert.equal(Hub.hourFor('auto', at(11, 12)), 'dia');
  assert.equal(Hub.hourFor('auto', at(11, 18)), 'tarde');
  assert.equal(Hub.hourFor('auto', at(11, 23)), 'noche');
  assert.equal(Hub.hourFor('auto', at(11, 4)), 'noche');
  assert.equal(Hub.hourFor('auto', at(7, 21)), 'tarde');   // en verano anochece más tarde
  assert.equal(Hub.hourFor('auto', at(7, 19)), 'dia');
  assert.equal(Hub.hourFor('noche', at(7, 12)), 'noche');
  for (let m = 1; m <= 12; m++) {
    const [tarde, noche, dawn] = HUB.hours.byMonth[m];
    assert.ok(dawn < tarde && tarde < noche && noche <= 24, 'mes ' + m);
  }
});
