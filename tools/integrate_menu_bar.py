#!/usr/bin/env python3
"""Integra el menú del bar (pantalla de inicio) en el juego.

    python3 tools/integrate_menu_bar.py [paquete-menu] [carpeta-vistas]

  paquete-menu    la-trolina-assets-menu-bar (capas, interfaz, objetos y efectos)
  carpeta-vistas  la-trolina-vista-entrada (el bar visto desde la puerta: día, tarde y noche,
                  con las luces encendidas y apagadas, 1672×941)

Sin argumentos usa las copias de source-art/menu-bar (paquete/ y vistas/). Con argumentos,
primero las copia ahí.

Las capas del paquete se dibujaron sobre un primer POV de 2311×1284. Las vistas nuevas son la
misma imagen reencuadrada: source-art/menu-bar/alineacion.json guarda la transformación.

Genera en assets/menu/:
  vista-<hora>-<luz>.webp   los seis fondos (WebP 92: ~0,5 MB cada uno en vez de 2,7)
  objetos.png               siluetas de los objetos que se iluminan (blanco con alfa)
  halos.png                 su halo turquesa, ya difuminado (misma colocación que objetos.png)
  ui/…                      letrero, pico, pizarra, fila, iconos y chapa del paquete
  menu-data.js              window.TROLINA_MENU_DATA (sin fetch): vistas, recortes de cada
                            objeto y su posición en la escena, y las bombillas que titilan

Las siluetas se calculan una vez y se guardan en source-art/menu-bar/mascaras/; si existen,
se reutilizan (se pueden retocar a mano). Las flechas del paquete no se usan: el juego las
dibuja en perspectiva (game/ui/hub.js), con el suelo y la escalera de game/data/hub.js.
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

try:
    import cv2
except ImportError:
    cv2 = None

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'source-art' / 'menu-bar'
OUT = ROOT / 'assets' / 'menu'
W, H = 1672, 941
HOURS = ['dia', 'tarde', 'noche']
LIGHTS = ['encendidas', 'apagadas']
TEAL = (94, 242, 230)

# Rectángulos de los marcos de la pared derecha (escena 1672×941), medidos a mano.
CUADROS = [(1165, 272, 1180, 305), (1190, 276, 1206, 316), (1207, 272, 1221, 320), (1222, 254, 1235, 284),
           (1152, 316, 1165, 356), (1165, 319, 1180, 357), (1189, 324, 1207, 367), (1240, 321, 1258, 350),
           (1125, 320, 1135, 350)]
BOLA = (834, 238, 38)   # centro y radio de la bola de discoteca


def copy_sources(pkg, views):
    if pkg:
        dst = SRC / 'paquete'
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(pkg, dst)
    if views:
        dst = SRC / 'vistas'
        dst.mkdir(parents=True, exist_ok=True)
        for h in HOURS:
            for l in LIGHTS:
                shutil.copy2(Path(views) / f'{h}-{l}.png', dst / f'{h}-{l}.png')


def view(h, l):
    return Image.open(SRC / 'vistas' / f'{h}-{l}.png').convert('RGB')


def affine():
    a = json.loads((SRC / 'alineacion.json').read_text(encoding='utf-8'))['affine']
    return np.array(a, dtype=np.float64)


def warp_layer(name):
    """Capa del paquete (2311×1284) llevada al lienzo de las vistas."""
    im = Image.open(SRC / 'paquete' / 'menu' / f'{name}.png').convert('RGBA')
    a = np.asarray(im)
    if cv2 is None:
        raise SystemExit('Hace falta OpenCV (requirements-art.txt) para generar las siluetas.')
    return cv2.warpAffine(a, affine(), (W, H), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))


def fill_holes(m):
    ff = m.copy()
    mask = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 255)
    return m | cv2.bitwise_not(ff)


def largest(m):
    n, lab, st, _ = cv2.connectedComponentsWithStats((m > 0).astype(np.uint8))
    if n <= 1:
        return m
    return np.where(lab == 1 + int(np.argmax(st[1:, 4])), 255, 0).astype(np.uint8)


def grabcut(img, rect):
    mask = np.zeros(img.shape[:2], np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.setRNGSeed(7)
    cv2.grabCut(img, mask, rect, bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
    return np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)


def make_masks():
    """Siluetas de los objetos que se iluminan (blanco = objeto)."""
    img = cv2.cvtColor(np.asarray(view('dia', 'encendidas')), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    m = {}
    m['tele'] = fill_holes(largest(grabcut(img, (490, 215, 175, 190))))
    m['carta'] = cv2.dilate(largest(grabcut(img, (540, 396, 86, 100))), np.ones((5, 5), np.uint8))
    # Futbolín: el cuerpo verde.
    f = np.zeros((H, W), np.uint8)
    x0, y0, x1, y1 = 970, 345, 1090, 440
    s = hsv[y0:y1, x0:x1]
    g = ((s[:, :, 0] > 40) & (s[:, :, 0] < 90) & (s[:, :, 1] > 80) & (s[:, :, 2] > 60)).astype(np.uint8) * 255
    f[y0:y1, x0:x1] = fill_holes(largest(cv2.morphologyEx(g, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))))
    m['futbolin'] = f
    # Reloj de sol: los rayos dorados (muy saturados, la pared no) y la esfera, dentro de la zona
    # que marca el brillo del paquete.
    zone = warp_layer('brillo-8-reloj-00')[:, :, 3] > 30
    zone = cv2.dilate(zone.astype(np.uint8) * 255, np.ones((15, 15), np.uint8)) > 0
    yy, xx = np.mgrid[0:H, 0:W]
    dial = ((xx - 1509) ** 2 / 40 ** 2 + (yy - 232) ** 2 / 48 ** 2) < 1
    gold = (hsv[:, :, 0] >= 8) & (hsv[:, :, 0] <= 30) & (hsv[:, :, 1] > 160) & (hsv[:, :, 2] > 90) & zone
    r = cv2.morphologyEx(((gold | dial) * 255).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    m['reloj'] = fill_holes(largest(r))
    b = np.zeros((H, W), np.uint8)
    cv2.circle(b, BOLA[:2], BOLA[2], 255, -1)
    cv2.line(b, (BOLA[0], BOLA[1] - 63), (BOLA[0], BOLA[1] - BOLA[2]), 255, 4)
    m['bola'] = b
    c = np.zeros((H, W), np.uint8)
    for (a1, b1, a2, b2) in CUADROS:
        cv2.rectangle(c, (a1, b1), (a2, b2), 255, -1)
    m['cuadros'] = c
    # Neveras: el cristal iluminado de azul.
    n = np.zeros((H, W), np.uint8)
    x0, y0, x1, y1 = 1150, 340, 1440, 900
    s = hsv[y0:y1, x0:x1]
    blue = ((s[:, :, 0] > 95) & (s[:, :, 0] < 135) & (s[:, :, 1] > 120) & (s[:, :, 2] > 150)).astype(np.uint8) * 255
    n[y0:y1, x0:x1] = cv2.morphologyEx(blue, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    m['neveras'] = n
    return m


def load_masks():
    d = SRC / 'mascaras'
    ids = ['tele', 'carta', 'futbolin', 'reloj', 'bola', 'cuadros', 'neveras']
    if all((d / f'{k}.png').exists() for k in ids):
        return {k: np.asarray(Image.open(d / f'{k}.png').convert('L')) for k in ids}
    masks = make_masks()
    d.mkdir(parents=True, exist_ok=True)
    for k, v in masks.items():
        Image.fromarray(v).save(d / f'{k}.png', optimize=True)
    return masks


def sprites(mask, pad=22):
    """Recorte de la silueta (blanco con alfa) y su halo turquesa, con el mismo encuadre."""
    ys, xs = np.where(mask > 0)
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(W, xs.max() + pad + 1), min(H, ys.max() + pad + 1)
    m = mask[y0:y1, x0:x1].astype(np.float32) / 255
    sil = np.zeros(m.shape + (4,), np.uint8)
    sil[..., :3] = 255
    sil[..., 3] = (np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))))
    big = cv2.dilate((m * 255).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(np.float32) / 255
    glow = cv2.GaussianBlur(big, (0, 0), 6) * 1.25
    rim = np.clip(cv2.dilate((m * 255).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32) / 255 - m, 0, 1)
    rim = cv2.GaussianBlur(rim, (0, 0), 0.8)
    a = np.clip(np.maximum(glow * (1 - m) + m * 0.07, rim * 1.1), 0, 1)   # el objeto se sigue viendo
    halo = np.zeros(m.shape + (4,), np.uint8)
    halo[..., 0], halo[..., 1], halo[..., 2] = TEAL
    core = np.clip(rim * 1.4, 0, 1)[..., None]
    halo[..., :3] = (np.array(TEAL)[None, None, :] * (1 - core) + 255 * core).astype(np.uint8)
    halo[..., 3] = (a * 255).astype(np.uint8)
    return (int(x0), int(y0)), Image.fromarray(sil, 'RGBA'), Image.fromarray(halo, 'RGBA')


def pack(items, width=1024, gap=2):
    x = y = row = 0
    out = {}
    for k, (w, h) in items:
        if x + w > width:
            x, y, row = 0, y + row + gap, 0
        out[k] = (x, y, w, h)
        x += w + gap
        row = max(row, h)
    return out, y + row


def bulbs():
    """Bombillas y lámparas: lo que se enciende entre la vista apagada y la encendida (de día)."""
    on = np.asarray(view('dia', 'encendidas')).astype(np.float32)
    off = np.asarray(view('dia', 'apagadas')).astype(np.float32)
    lum = lambda a: a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11
    d = cv2.GaussianBlur(lum(on) - lum(off), (0, 0), 1.0)
    lon = lum(on)
    point = lon - cv2.GaussianBlur(lon, (0, 0), 4)          # puntos de luz, no paredes iluminadas
    mx = cv2.dilate(d, np.ones((7, 7), np.uint8))
    ys, xs = np.where((d == mx) & (d > 70) & (lon > 200) & (point > 28))
    pts = []
    for x, y in zip(xs, ys):
        if y > 380 or x < 40 or (470 <= x <= 690 and 190 <= y <= 430):   # ni la tele ni lo de abajo
            continue
        win = d[max(0, y - 8):y + 9, max(0, x - 8):x + 9]
        r = float(np.sqrt((win > d[y, x] * 0.5).sum() / np.pi))
        c = on[max(0, y - 1):y + 2, max(0, x - 1):x + 2].reshape(-1, 3).mean(0)
        if r > 6:
            continue
        pts.append([int(x), int(y), round(max(1.5, r), 1), [int(v) for v in c]])
    pts.sort(key=lambda p: (p[1], p[0]))
    return pts


def main():
    args = sys.argv[1:]
    copy_sources(args[0] if len(args) > 0 else None, args[1] if len(args) > 1 else None)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'ui').mkdir(exist_ok=True)

    views = {}
    for h in HOURS:
        for l in LIGHTS:
            name = f'vista-{h}-{l}.webp'
            view(h, l).save(OUT / name, quality=92, method=6)
            views.setdefault(h, {})[l] = 'assets/menu/' + name

    masks = load_masks()
    parts = {k: sprites(v) for k, v in masks.items()}
    layout, height = pack([(k, p[1].size) for k, p in parts.items()])
    sil = Image.new('RGBA', (1024, height))
    hal = Image.new('RGBA', (1024, height))
    objects = {}
    for k, ((x0, y0), s, h) in parts.items():
        ax, ay, w, hh = layout[k]
        sil.paste(s, (ax, ay))
        hal.paste(h, (ax, ay))
        ys, xs = np.where(masks[k] > 0)
        objects[k] = {'src': [ax, ay, w, hh], 'at': [x0, y0],
                      'box': [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]}
    sil.save(OUT / 'objetos.png', optimize=True)
    hal.save(OUT / 'halos.png', optimize=True)

    ui = SRC / 'paquete' / 'ui'
    for f in ['letrero-pico.png', 'pizarra.png', 'iconos-menu.png', 'cursor-chapa.png']:
        shutil.copyfile(ui / f, OUT / 'ui' / f)
    # Los estados del letrero y la fila seleccionada, sueltos (el CSS los usa como border-image).
    let = Image.open(ui / 'letrero.png').convert('RGBA')
    for i, st in enumerate(['reposo', 'sel', 'pulsado']):
        let.crop((0, i * 40, 144, i * 40 + 40)).save(OUT / 'ui' / f'letrero-{st}.png', optimize=True)
    Image.open(ui / 'pizarra-fila.png').convert('RGBA').crop((0, 28, 160, 56)).save(OUT / 'ui' / 'fila-sel.png', optimize=True)

    data = {
        'source': 'source-art/menu-bar (paquete la-trolina-assets-menu-bar y vistas la-trolina-vista-entrada)',
        'width': W, 'height': H,
        'views': views,
        'objects': objects,
        'sprites': {'objetos': 'assets/menu/objetos.png', 'halos': 'assets/menu/halos.png'},
        'ui': {
            'letrero': {'reposo': 'assets/menu/ui/letrero-reposo.png', 'sel': 'assets/menu/ui/letrero-sel.png',
                        'pulsado': 'assets/menu/ui/letrero-pulsado.png', 'size': [144, 40], 'slice': 12},
            'pico': 'assets/menu/ui/letrero-pico.png',
            'pizarra': {'image': 'assets/menu/ui/pizarra.png', 'size': [180, 270], 'slice': 16},
            'fila': {'image': 'assets/menu/ui/fila-sel.png', 'size': [160, 28]},
            'iconos': {'image': 'assets/menu/ui/iconos-menu.png', 'cell': 48,
                       'order': ['story', 'quick', 'online', 'shop', 'darts', 'ranking', 'options', 'help', 'back']},
            'chapa': {'image': 'assets/menu/ui/cursor-chapa.png', 'cell': 24, 'frames': 8}
        },
        'bulbs': bulbs()
    }
    js = ('/* Menú del bar: datos generados por tools/integrate_menu_bar.py (no editar a mano).\n'
          ' * Coordenadas en píxeles de la escena (las vistas miden 1672×941). objects.<id>: src = recorte\n'
          ' * en objetos.png y halos.png; at = dónde va su esquina en la escena; box = caja de la silueta.\n'
          ' * bulbs: [x, y, radio, color] de bombillas y lámparas que titilan con la luz encendida. */\n'
          'window.TROLINA_MENU_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (OUT / 'menu-data.js').write_text(js, encoding='utf-8')
    total = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
    print(f'assets/menu: {len(views) * 2} vistas, {len(objects)} objetos, {len(data["bulbs"])} bombillas, '
          f'{total / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
