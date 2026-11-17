"""Integra el arte de Combate 2.0 (source-art/combate-2.0) en el juego.

- Amplía assets/fighter.png de 6x4 a 6x16 celdas de 192x176: las 4 filas originales
  y debajo las 12 tiras nuevas (orden ROWS). Las poses en el aire se bajan dentro de su
  celda para que su punto más bajo quede en y=160: la altura la pone la física del salto.
- Añade a assets/fighter.json las animaciones nuevas (golpes con sus tiempos y cajas,
  y poses de estado) con los nombres que busca game/data/moves.js.
- Copia efectos e iconos a assets/fx/combat/ y assets/ui/ y escribe
  assets/fx/combat-fx-data.js (celdas y anclas, sin fetch).

Después: python3 tools/build_characters.py && python3 tools/build_demo.py

Uso:  python3 tools/integrate_combat_assets.py [carpeta-del-paquete]
      (con carpeta, primero copia el paquete a source-art/combate-2.0)
Requiere Pillow (ver requirements-art.txt).
"""
from pathlib import Path
import json
import shutil
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'source-art' / 'combate-2.0'
ATLAS = ROOT / 'assets' / 'fighter.png'
DATA = ROOT / 'assets' / 'fighter.json'
FX_OUT = ROOT / 'assets' / 'fx' / 'combat'
UI_OUT = ROOT / 'assets' / 'ui'
W, H, COLS, BASE_ROWS = 192, 176, 6, 4
HURT = {'x': 45, 'y': 21, 'w': 63, 'h': 139}

# Tiras nuevas, una por fila a partir de la 4.
ROWS = ['guard', 'hit', 'grab', 'grabbed', 'gancho', 'air', 'knockdown', 'jump', 'dizzy', 'dash', 'walk', 'ko-win']
# Tiras cuyas poses en el aire se bajan dentro de la celda (en el juego sube la física).
LOWER_AIRBORNE = {'jump', 'air', 'hit', 'grabbed'}

# Cajas de golpe (coordenadas de celda, ya con las poses bajadas). Sacadas de los puntos
# activos del paquete (puño del gancho, puño aéreo, pie del picado) y comprobadas en el juego.
HB_GANCHO = [{'x': 98, 'y': -24, 'w': 58, 'h': 88}]
HB_AIRPUNCH = [{'x': 126, 'y': 66, 'w': 50, 'h': 46}]
HB_DIVE = [{'x': 132, 'y': 122, 'w': 52, 'h': 44}]

# nombre: (frames [(tira, índice, ms, cajas?)], bucle, activo)
ANIMS = {
    # Golpes: mismos tiempos que el diseño (COMBATE.md).
    'gancho': ([('gancho', 0, 30), ('gancho', 1, 60), ('gancho', 2, 120, HB_GANCHO), ('gancho', 3, 90), ('gancho', 4, 90), ('gancho', 5, 90)], False, [2, 2]),
    'airPunch': ([('air', 0, 40), ('air', 1, 170, HB_AIRPUNCH), ('air', 0, 110)], False, [1, 1]),
    'dive': ([('air', 2, 60), ('air', 3, 5000, HB_DIVE)], False, [1, 1]),
    'grab': ([('grab', 0, 60), ('grab', 1, 60), ('grab', 2, 80), ('grab', 1, 160), ('grab', 0, 260)], False, [2, 2]),
    'throw': ([('grab', 4, 140), ('grab', 5, 240)], False, None),
    # Poses de estado (el combate elige cuál y desde cuándo).
    'guardEnter': ([('guard', 0, 60), ('guard', 1, 70)], False, None),
    'guard': ([('guard', 2, 260), ('guard', 3, 260)], True, None),
    'guardHit': ([('guard', 4, 200)], False, None),
    'parry': ([('guard', 5, 250)], False, None),
    'hit': ([('hit', 0, 70), ('hit', 1, 400)], False, None),
    'hitHeavy': ([('hit', 2, 80), ('hit', 3, 500)], False, None),
    'hitAir': ([('hit', 4, 120), ('hit', 5, 800)], False, None),
    'grabHold': ([('grab', 3, 200)], False, None),
    'grabbed': ([('grabbed', 0, 200)], False, None),
    'grabbedLift': ([('grabbed', 1, 200)], False, None),
    'thrown': ([('grabbed', 2, 1000)], False, None),
    'fall': ([('knockdown', 0, 1000)], False, None),
    'down': ([('knockdown', 1, 120), ('knockdown', 2, 1000)], False, None),
    'getup': ([('knockdown', 3, 100), ('knockdown', 4, 110), ('knockdown', 5, 110)], False, None),
    'jumpRise': ([('jump', 1, 100)], False, None),
    'jumpApex': ([('jump', 2, 100)], False, None),
    'jumpFall': ([('jump', 3, 100)], False, None),
    'jumpLand': ([('jump', 4, 90)], False, None),
    'land': ([('air', 4, 150), ('air', 5, 150)], False, None),
    'dizzy': ([('dizzy', i, 150) for i in range(4)], True, None),
    'tired': ([('dizzy', 4, 300), ('dizzy', 5, 300)], True, None),
    'dash': ([('dash', 0, 60), ('dash', 1, 60), ('dash', 2, 60)], False, None),
    'backdash': ([('dash', 3, 65), ('dash', 4, 65), ('dash', 5, 70)], False, None),
    'walk': ([('walk', i, 110) for i in range(6)], True, None),
    'ko': ([('ko-win', 0, 260), ('ko-win', 1, 220), ('ko-win', 2, 1000)], False, None),
    'win': ([('ko-win', 3, 180), ('ko-win', 4, 180), ('ko-win', 5, 1000)], False, None),
}

FX = {  # nombre: (archivo, ms por fotograma, bucle)
    'parry': ('fx-parry.png', 45, False),
    'guardbreak': ('fx-guardbreak.png', 60, False),
    'chapas': ('fx-chapas.png', 90, True),
    'hit': ('fx-hit.png', 40, False),
    'dust': ('fx-dust.png', 60, False),
    'sweat': ('fx-sweat.png', 140, True),
}


def main():
    if len(sys.argv) > 1:
        pkg = Path(sys.argv[1])
        SRC.mkdir(parents=True, exist_ok=True)
        for f in list(pkg.glob('combat-*.png')) + list(pkg.glob('fx-*.png')) + list(pkg.glob('ui-*.png')) + [pkg / 'combat-assets.json', pkg / 'LEEME.txt', pkg / 'COMPROBACION.json']:
            if f.exists() and not f.name.endswith('-guia.png'):
                shutil.copy2(f, SRC / f.name)
    meta = json.loads((SRC / 'combat-assets.json').read_text(encoding='utf-8'))
    char = meta['character']['animations']

    # 1. Atlas: filas originales + tiras nuevas.
    base = Image.open(ATLAS).convert('RGBA').crop((0, 0, COLS * W, BASE_ROWS * H))
    atlas = Image.new('RGBA', (COLS * W, (BASE_ROWS + len(ROWS)) * H), (0, 0, 0, 0))
    atlas.paste(base, (0, 0))
    shifts = {}
    for r, name in enumerate(ROWS):
        strip = Image.open(SRC / f'combat-{name}.png').convert('RGBA')
        for i, fr in enumerate(char[name]['frames']):
            cell = strip.crop((i * W, 0, (i + 1) * W, H))
            dy = 0
            if name in LOWER_AIRBORNE and fr.get('airborne') and fr.get('bbox'):
                dy = max(0, 160 - fr['bbox'][3])
                if dy:
                    moved = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                    moved.paste(cell.crop((0, 0, W, H - dy)), (0, dy))
                    cell = moved
            shifts[(name, i)] = dy
            atlas.paste(cell, (i * W, (BASE_ROWS + r) * H))
    atlas.save(ATLAS, optimize=True)

    # 2. Datos de animación.
    data = json.loads(DATA.read_text(encoding='utf-8'))
    data['rows'] = BASE_ROWS + len(ROWS)
    data['combatArt'] = {'source': 'source-art/combate-2.0', 'rows': {name: BASE_ROWS + r for r, name in enumerate(ROWS)},
                         'loweredAirborne': {f'{k[0]}:{k[1]}': v for k, v in shifts.items() if v}}
    for name, (frames, loop, active) in ANIMS.items():
        out = []
        for spec in frames:
            strip, i, ms = spec[0], spec[1], spec[2]
            out.append({'x': i * W, 'y': (BASE_ROWS + ROWS.index(strip)) * H, 'w': W, 'h': H, 'duration': ms,
                        'hitboxes': spec[3] if len(spec) > 3 else [], 'hurtbox': dict(HURT)})
        anim = {'loop': loop, 'next': 'idle', 'art': 'combate-2.0', 'frames': out}
        if active:
            anim['active'] = active
        data['animations'][name] = anim
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    # 3. Efectos e iconos.
    FX_OUT.mkdir(parents=True, exist_ok=True)
    UI_OUT.mkdir(parents=True, exist_ok=True)
    fx_meta = meta['effects']
    fx_data = {'images': {}, 'fx': {}, 'ui': {}}
    for key, (fname, ms, loop) in FX.items():
        shutil.copy2(SRC / fname, FX_OUT / fname)
        e = fx_meta[fname[:-4]]
        fx_data['images'][key] = f'assets/fx/combat/{fname}'
        fx_data['fx'][key] = {'w': e['cellSize'][0], 'h': e['cellSize'][1], 'cols': e['columns'], 'rows': e['rows'],
                              'ax': e['anchor'][0], 'ay': e['anchor'][1], 'ms': ms, 'loop': loop}
    for fname in ('ui-agarre.png', 'ui-fuelle.png'):
        shutil.copy2(SRC / fname, UI_OUT / fname)
        fx_data['ui'][fname[3:-4]] = f'assets/ui/{fname}'
    js = ('/* Generado por tools/integrate_combat_assets.py: efectos e iconos de Combate 2.0. */\n'
          'window.TROLINA_COMBAT_FX = ' + json.dumps(fx_data, indent=2, ensure_ascii=False) + ';\n')
    (ROOT / 'assets' / 'fx' / 'combat-fx-data.js').write_text(js, encoding='utf-8')
    print('Atlas', atlas.size, '·', len(ANIMS), 'animaciones ·', len(FX), 'efectos · poses bajadas:', sum(1 for v in shifts.values() if v))


if __name__ == '__main__':
    main()
