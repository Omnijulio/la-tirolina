"""Genera los atlas de las variantes de personaje a partir de assets/fighter.png.

Las variantes son recoloreados provisionales (estilo "clon" arcade de los 90):
comparten poses, ancla y cajas de colisión con El Barbas y solo cambian la ropa.
Cuando cada personaje tenga arte propio basta con sustituir su PNG en
assets/characters/ manteniendo celdas de 192x176 y el ancla (56,160).

Uso:  python3 tools/build_characters.py
Requiere Pillow y numpy (ver requirements-art.txt).
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets' / 'fighter.png'
OUT = ROOT / 'assets' / 'characters'

# Cada zona: hue destino (grados) o None para conservar, saturación destino o
# factor, y transformación de brillo. 'v' es (factor, suma) aplicado solo a
# píxeles que no son contorno (v > 0.14) para conservar las líneas oscuras.
VARIANTS = {
    'barbas': None,  # original
    'runner': {
        'jacket': {'h': 186, 's': 0.62, 'v': (1.15, 0.04)},
        'shirt': {'h': 210, 's': 0.06, 'v': (1.55, 0.18)},
        'pants': {'h': 226, 's': 0.42, 'v': (1.05, 0.0)},
    },
    'penista': {
        'jacket': {'h': 357, 's': 0.78, 'v': (1.12, 0.03)},
        'shirt': {'h': 0, 's': 0.05, 'v': (1.6, 0.2)},
        'pants': {'h': 40, 's': 0.06, 'v': (2.0, 0.22)},
    },
    'camarero': {
        'jacket': {'h': 230, 's': 0.12, 'v': (0.42, 0.0)},
        'shirt': {'h': 0, 's': 0.04, 'v': (1.65, 0.22)},
        'pants': {'h': 240, 's': 0.10, 'v': (0.7, 0.0)},
    },
    'motero': {
        'jacket': {'h': 22, 's': 0.58, 'v': (0.82, 0.0)},
        'shirt': {'h': 0, 's': 0.0, 'v': (0.32, 0.0)},
        'pants': {'h': 214, 's': 0.48, 'v': (1.35, 0.03)},
    },
    'dueno': {
        'jacket': {'h': 338, 's': 0.62, 'v': (0.78, 0.0)},
        'shirt': {'h': 44, 's': 0.78, 'v': (1.25, 0.05)},
        'pants': {'h': 250, 's': 0.12, 'v': (0.6, 0.0)},
    },
}


def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm = m & (mx == r); gm = m & (mx == g) & ~rm; bm = m & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = ((b - r)[gm] / d[gm]) + 2
    h[bm] = ((r - g)[bm] / d[bm]) + 4
    h = h * 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    h = (h % 360) / 60.0
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,))
    for k, (a, b, c) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        sel = i == k
        out[sel, 0] = a[sel]; out[sel, 1] = b[sel]; out[sel, 2] = c[sel]
    return out


def classify(h, s, v):
    jacket = (h >= 38) & (h <= 110) & (s > 0.12) & (v > 0.10)
    shirt = (h >= 185) & (h <= 260) & (s > 0.22)
    pants = ((h >= 250) | (h < 5)) & (s < 0.35) & (v < 0.55) & ~shirt
    return {'jacket': jacket, 'shirt': shirt, 'pants': pants}


def recolor(arr, spec):
    rgb = arr[..., :3].astype(float) / 255.0
    alpha = arr[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    zones = classify(h, s, v)
    visible = alpha > 0
    nh, ns, nv = h.copy(), s.copy(), v.copy()
    for zone, rule in spec.items():
        sel = zones[zone] & visible
        if rule.get('h') is not None:
            nh[sel] = rule['h']
        if 's' in rule:
            # Conserva parte de la variación de saturación original.
            ns[sel] = np.clip(rule['s'] * (0.75 + 0.5 * s[sel]), 0, 1)
        fac, add = rule.get('v', (1.0, 0.0))
        body = sel & (v > 0.14)
        nv[body] = np.clip(v[body] * fac + add, 0, 1)
    out = arr.copy()
    out[..., :3] = np.round(hsv_to_rgb(nh, ns, nv) * 255).astype(np.uint8)
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    base = np.array(Image.open(SRC).convert('RGBA'))
    manifest = {}
    for cid, spec in VARIANTS.items():
        arr = base if spec is None else recolor(base, spec)
        path = OUT / f'{cid}.png'
        Image.fromarray(arr, 'RGBA').save(path, optimize=True)
        manifest[cid] = f'assets/characters/{cid}.png'
        print('wrote', path.relative_to(ROOT))
    (OUT / 'characters.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
