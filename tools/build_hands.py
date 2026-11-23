"""Mano del arma (bastón o botellín empuñado) en cada celda de los atlas sin arma dibujada.

Desde v0.15 algunos luchadores llevan un arma. Sombrero la tiene dibujada (con y sin bastón, con
el punto de agarre de cada celda en assets/characters/art-data.js). Para probar el arma con otros
(El Barbas, Rizos…) o empuñar el botellín, el juego dibuja el objeto encima del luchador en la mano
delantera. Esta herramienta la busca en cada celda: manchas de piel que no son la cara, y de ellas
la más adelantada (el luchador mira a la derecha). El ángulo del arma en cada celda se toma del
agarre del bastón de Sombrero (mismas poses en las mismas celdas).

Escribe assets/characters/hands-data.js (window.TROLINA_HANDS = {id: {"col,fila": [x, y, giro]}}),
en coordenadas de celda 192x176. Aproximado: es para pruebas, no sustituye al arte con el arma.

Uso:  python3 tools/build_hands.py [ids…]   (por defecto: barbas rizos sombrero)
      sombrero: usa su atlas sin arma y su agarre del bastón, sin buscar manos.
Requiere Pillow, numpy y scipy (ver requirements-art.txt).
"""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'characters'
W, H, COLS, ROWS = 192, 176, 6, 16


def load_art():
    src = (OUT / 'art-data.js').read_text(encoding='utf-8')
    return json.loads(src[src.index('{'):src.rindex('}') + 1])


def skin_mask(cell):
    a = cell[..., 3] > 200
    r, g, b = (cell[..., i].astype(int) for i in range(3))
    return a & (r > 120) & (r > g + 12) & (g > b + 4) & (r - b > 40) & (g > 70)


def find_hand(cell):
    """Centro de la mano delantera (o None)."""
    alpha = cell[..., 3] > 128
    if not alpha.any():
        return None
    ys, xs = np.nonzero(alpha)
    top, bottom = ys.min(), ys.max()
    lab, n = ndimage.label(skin_mask(cell))
    if not n:
        return None
    comps = []
    for i in range(1, n + 1):
        yy, xx = np.nonzero(lab == i)
        if len(yy) >= 5:
            comps.append((len(yy), xx.mean(), yy.mean()))
    if not comps:
        return None
    # La cara: la mancha más grande en la mitad de arriba de la figura.
    upper = [c for c in comps if c[2] < top + (bottom - top) * 0.45]
    face = max(upper, key=lambda c: c[0]) if upper else None
    hands = [c for c in comps if c is not face]
    # De pie, las manos no están por debajo de la cintura (lo marrón de abajo son zapatos o pantalón).
    left, right = xs.min(), xs.max()
    if bottom - top > (right - left) * 0.9:
        hands = [c for c in hands if c[2] < top + (bottom - top) * 0.6]
    if not hands:
        return None
    best = max(hands, key=lambda c: c[1])
    return [int(round(best[1])), int(round(best[2]))]


def main():
    art = load_art()
    ids = sys.argv[1:] or ['barbas', 'rizos', 'sombrero']
    ref = (art.get('sombrero') or {}).get('weapon', {}).get('grip', {})
    out = {}
    for cid in ids:
        if cid == 'sombrero':
            if ref:
                out[cid] = ref
            continue
        img = np.array(Image.open(OUT / f'{cid}.png').convert('RGBA'))
        hands, found = {}, 0
        for row in range(min(ROWS, img.shape[0] // H)):
            prev = None
            for col in range(COLS):
                cell = img[row * H:(row + 1) * H, col * W:(col + 1) * W]
                h = find_hand(cell)
                if h:
                    found += 1
                    prev = h
                elif prev is None:
                    continue
                k = f'{col},{row}'
                rot = ref.get(k, [0, 0, -0.5])[2]
                hands[k] = [*(h or prev), rot]
        # Las celdas sin mano a la vista: la primera encontrada en su fila o la de la guardia.
        for row in range(ROWS):
            for col in range(COLS):
                k = f'{col},{row}'
                if k not in hands:
                    near = next((hands[f'{c},{row}'] for c in range(COLS) if f'{c},{row}' in hands), hands.get('0,0'))
                    if near:
                        hands[k] = [near[0], near[1], ref.get(k, [0, 0, -0.5])[2]]
        out[cid] = hands
        print(f'{cid}: mano encontrada en {found} de {COLS * ROWS} celdas')
    js = ('/* Generado por tools/build_hands.py: mano del arma en cada celda (col,fila) -> [x, y, giro]. */\n'
          'window.TROLINA_HANDS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (OUT / 'hands-data.js').write_text(js, encoding='utf-8')
    print('Escrito assets/characters/hands-data.js')


if __name__ == '__main__':
    main()
