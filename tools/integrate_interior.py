#!/usr/bin/env python3
"""Integra el paquete del interior del bar en el juego.

    python3 tools/integrate_interior.py [carpeta-del-paquete]

Sin argumento usa la copia de source-art/escenarios/interior. La carpeta del paquete es la
que tiene escenario.json (por ejemplo la-trolina-interior-assets/la-trolina-interior-assets).

El paquete trae la panorámica a 2172×724 px para un escenario de 810×270 unidades. El juego
dibuja a 2 px por unidad (canvas 960×540, como la terraza), así que todo se reescala aquí una
vez, con buen filtro, a 1620×540, y en el juego se pinta sin escalar:

  assets/stages/interior/<luz>.png         fondo con el futbolín y los taburetes ya puestos
  assets/stages/interior/barra-<luz>.png   los dos mostradores, recortados (tapan a quien
                                           está detrás de la barra)
  assets/stages/interior/muebles-<luz>.png futbolín y taburetes, recortados (van encima de
                                           los mostradores)
  assets/stages/interior/brillos-<luz>.png los reflejos de la bola de discoteca, sacados del fondo
                                           (solo con las luces apagadas; el juego los hace girar)
  assets/stages/interior/interior-data.js  window.TROLINA_INTERIOR_DATA (sin fetch)

<luz> es «encendidas» o «apagadas». Copia también lo necesario del paquete en
source-art/escenarios/interior para poder repetirlo.
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:            # sin OpenCV se queda sin animar la bola de discoteca
    cv2 = None

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'stages' / 'interior'
SRC_COPY = ROOT / 'source-art' / 'escenarios' / 'interior'

K = 2                 # px del canvas por unidad del escenario (como la terraza: 480×270 → 960×540)
GROUND_CANVAS = 486   # línea de apoyo de los luchadores en el canvas (combatant.js, C.GROUND)
MARGIN = 70           # de los bordes del escenario a donde llega un luchador (como C.MIN_X en la terraza)
VIEW_W = 960

# Bola de discoteca (luces apagadas): sus reflejos están pintados en el fondo. Se separan para que
# el juego los haga girar. Medidas en la panorámica a 2 px por unidad (1620×540).
DISCO = {
    'apagadas': {
        'ball': (1297, 42, 31),            # centro y radio de la bola
        'floorY': 446,                     # por debajo, el suelo (sus brillos giran al revés)
        # Zonas con luces propias que NO son reflejos (pantallas, neveras, mosaico, botellas,
        # pegatinas de la barra): ahí no se busca.
        'keep': [(1055, 85, 1245, 340), (1370, 170, 1520, 340), (95, 160, 150, 195), (235, 130, 390, 232),
                 (285, 355, 318, 428), (498, 355, 532, 428), (1038, 355, 1097, 428), (590, 85, 735, 235),
                 (505, 150, 580, 215), (150, 160, 232, 205), (1255, 195, 1372, 300), (1505, 190, 1620, 300),
                 (780, 210, 840, 260)],
    },
}


def split_disco(comp, props, cfg):
    """Separa los reflejos de la bola: devuelve (fondo sin reflejos, capa de luz, centros de reflejo).

    Un reflejo es una mancha pequeña, muy saturada (azul, verde o blanco azulado) y mucho más clara
    que lo que la rodea. La capa de luz es lo que el reflejo suma al fondo: pintada con «lighter»
    encima del fondo limpio en su sitio, sale la imagen original."""
    im = np.array(comp.convert('RGB')).astype(np.int16)
    med = cv2.medianBlur(im.astype(np.uint8), 21).astype(np.int16)
    mx = np.maximum(im[..., 1], im[..., 2])
    lift = np.maximum(im[..., 1] - med[..., 1], im[..., 2] - med[..., 2])
    cand = ((mx > 85) & (mx - im[..., 0] > 38) & (lift > 30)).astype(np.uint8)
    h, w = cand.shape
    for x0, y0, x1, y1 in cfg['keep']:
        cand[y0:y1, x0:x1] = 0
    bx, by, br = cfg['ball']
    yy, xx = np.ogrid[:h, :w]
    cand[(xx - bx) ** 2 + (yy - by) ** 2 <= (br + 4) ** 2] = 0
    cand[np.array(props.getchannel('A')) > 0] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(cand, 8)
    mask = np.zeros_like(cand)
    spots = []
    for i in range(1, n):
        x, y, cw, ch, a = st[i]
        if a < 4 or a > 160 or cw > 26 or ch > 16:
            continue
        mask[lab == i] = 1
        spots.append([int(x + cw // 2), int(y + ch // 2)])
    core = cv2.dilate(mask, np.ones((5, 5), np.uint8))          # el reflejo con su borde: lo que gira
    mask = cv2.dilate(mask, np.ones((13, 13), np.uint8))        # y su halo: lo que se limpia del fondo
    clean = cv2.inpaint(im.astype(np.uint8), mask * 255, 5, cv2.INPAINT_TELEA).astype(np.float32)
    # El relleno coge algo del color del halo: dentro de la zona se pasa a gris (piedra, baldosa y
    # madera a oscuras son casi grises), con un borde suave.
    soft = cv2.GaussianBlur(mask.astype(np.float32), (9, 9), 0)[..., None] * 0.9
    grey = (clean @ np.array([0.30, 0.55, 0.15], np.float32))[..., None] * np.array([0.97, 0.98, 1.06], np.float32)
    clean = np.minimum(clean * (1 - soft) + grey * soft, im).astype(np.int16)
    # Solo el reflejo (no el halo, que lleva trozos de lo que hay alrededor y se vería moverse).
    light = (np.clip(im - clean, 0, 255) * core[..., None]).astype(np.uint8)
    alpha = ((light.max(axis=2) > 0) * 255).astype(np.uint8)
    layer = Image.fromarray(np.dstack([light, alpha]), 'RGBA')
    return Image.fromarray(clean.astype(np.uint8), 'RGB').convert('RGBA'), layer, spots


def resize_rgba(img, size):
    """Reescalado con alfa premultiplicado (sin halos oscuros en los bordes)."""
    return img.convert('RGBA').convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def find_pack(arg):
    p = Path(arg) if arg else SRC_COPY
    if (p / 'escenario.json').exists():
        return p
    hits = sorted(p.glob('**/escenario.json'))
    if not hits:
        sys.exit(f'No encuentro escenario.json en {p}')
    return hits[0].parent


def copy_sources(pack, d):
    if pack.resolve() == SRC_COPY.resolve():
        return
    files = ['escenario.json', 'LEEME.md'] + list(d['backgrounds'].values())
    for layer in d['layers']:
        if layer.get('occludes'):
            files += list(layer['files'].values())
    for s in d['sprites']:
        files += list(s['files'].values())
    for f in files:
        dst = SRC_COPY / f
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(pack / f, dst)


def main():
    pack = find_pack(sys.argv[1] if len(sys.argv) > 1 else None)
    d = json.loads((pack / 'escenario.json').read_text(encoding='utf-8'))
    IW, IH, AW, AH = d['imageWidth'], d['imageHeight'], d['assetWidth'], d['assetHeight']
    W, H = AW * K, AH * K
    assert H == 540, 'el escenario tiene que medir 270 unidades de alto'
    f = W / IW                       # px del PNG → px del canvas
    OUT.mkdir(parents=True, exist_ok=True)
    lights = list(d['backgrounds'])
    occluders = [l for l in d['layers'] if l.get('occludes')]

    # Línea de apoyo: el paquete la pone en y=247, el juego en 243 (486 en el canvas). Se pinta el
    # escenario sin desplazar (cubre los 540 px) y los luchadores pisan 4 unidades más al fondo,
    # dentro de la franja del suelo (arena 232–260).
    assert d['arena']['top'] * K <= GROUND_CANVAS <= d['arena']['bottom'] * K

    out = {'lightings': {}}
    for light in lights:
        bg = Image.open(pack / d['backgrounds'][light]).convert('RGB').resize((W, H), Image.LANCZOS).convert('RGBA')
        # Muebles: cada sprite en su sitio (centro abajo) y reescalado una vez.
        props = Image.new('RGBA', (W, H))
        for s in d['sprites']:
            pl, an = s['placement'], s['anchor']
            w, h = round(pl['width'] * K), round(pl['height'] * K)
            left = round((pl['x'] - pl['width'] * an['x']) * K)
            top = round((pl['y'] - pl['height'] * an['y']) * K)
            spr = resize_rgba(Image.open(pack / s['files'][light]), (w, h))
            props.alpha_composite(spr, (left, top))
        # Mostradores: se colocan a tamaño original en su rectángulo y se reescala el lienzo entero,
        # para que casen al píxel con el fondo.
        big = Image.new('RGBA', (IW, IH))
        for l in occluders:
            r = l['rect']
            big.alpha_composite(Image.open(pack / l['files'][light]).convert('RGBA'), (r['x'], r['y']))
        counters = resize_rgba(big, (W, H))
        comp = bg.copy()
        comp.alpha_composite(props)
        disco = None
        if light in DISCO and cv2 is not None:
            comp, glow, spots = split_disco(comp, props, DISCO[light])
            # Los mostradores, con el mismo fondo limpio (son recortes de él).
            ca = counters.getchannel('A')
            counters = Image.composite(comp, Image.new('RGBA', comp.size), ca)
            counters.putalpha(ca)
            box = glow.getchannel('A').getbbox()
            glow.crop(box).save(OUT / f'brillos-{light}.png', optimize=True)
            cfg = DISCO[light]
            disco = {'image': f'assets/stages/interior/brillos-{light}.png', 'x': box[0], 'y': box[1],
                     'ball': dict(zip(('x', 'y', 'r'), cfg['ball'])), 'floorY': cfg['floorY'],
                     'spots': spots}
        comp.convert('RGB').save(OUT / f'{light}.png', optimize=True)
        entry = {'image': f'assets/stages/interior/{light}.png'}
        if disco:
            entry['disco'] = disco
        for name, img in (('counters', counters), ('props', props)):
            box = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
            img.crop(box).save(OUT / f'{"barra" if name == "counters" else "muebles"}-{light}.png', optimize=True)
            entry[name] = {'image': f'assets/stages/interior/{"barra" if name == "counters" else "muebles"}-{light}.png', 'x': box[0], 'y': box[1]}
        out['lightings'][light] = entry
        if light == lights[0]:
            counters_ref = counters

    # Geometría de los mostradores (en el canvas de la panorámica): de dónde a dónde van, la
    # altura de la encimera (lo que más se repite como borde de arriba) y el pie del frente.
    A = counters_ref.getchannel('A')
    px = A.load()
    bars = []
    for l in occluders:
        r = l['rect']
        x0, x1 = round(r['x'] * f), round((r['x'] + r['width']) * f)
        tops, bottoms = [], []
        for x in range(x0 + 4, x1 - 4):
            col = [y for y in range(H) if px[x, y] > 128]
            if col:
                tops.append(col[0]); bottoms.append(col[-1])
        tops.sort(); bottoms.sort()
        top = tops[len(tops) * 3 // 4]          # encimera (los objetos de encima suben el borde en algunas columnas)
        bottom = bottoms[len(bottoms) // 2]
        bars.append({'id': l['id'], 'x0': x0, 'x1': x1, 'top': top, 'bottom': bottom})

    world_x = VIEW_W // 2 - W // 2     # x del mundo del borde izquierdo: el centro de la panorámica en 480
    cam = (W - VIEW_W) // 2 // K       # cámara en unidades, ± desde el centro (TerraceStage: ±24)
    data = {
        'id': d['id'], 'version': d['version'],
        'source': 'source-art/escenarios/interior (paquete la-trolina-interior-assets, escenario.json ' + d['version'] + ')',
        'width': W, 'height': H, 'scale': K,
        'worldX': world_x,
        'camera': {'min': -cam, 'max': cam},
        'arena': {'minX': world_x + MARGIN, 'maxX': world_x + W - MARGIN},
        'lightings': out['lightings'],
        # Mostradores en coordenadas del mundo (x) y del canvas (y): detrás va quien cae en el fregadero.
        'counters': [{**b, 'x0': b['x0'] + world_x, 'x1': b['x1'] + world_x} for b in bars],
    }
    js = ('/* Interior del bar: datos generados por tools/integrate_interior.py (no editar a mano).\n'
          ' * Panorámica de ' + f'{W}×{H}' + ' px a 2 px por unidad; x del mundo = x de la panorámica + worldX.\n'
          ' * camera: límites de Match.camera (en unidades, como la terraza); arena: hasta dónde llegan los luchadores. */\n'
          'window.TROLINA_INTERIOR_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    (OUT / 'interior-data.js').write_text(js, encoding='utf-8')
    copy_sources(pack, d)
    print(json.dumps({k: data[k] for k in ('worldX', 'camera', 'arena', 'counters')}, ensure_ascii=False))
    for p in sorted(OUT.iterdir()):
        print(f'  {p.relative_to(ROOT)}  {p.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
