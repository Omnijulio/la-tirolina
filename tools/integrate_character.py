"""Integra en el juego un personaje con arte propio (paquete como la-trolina-personaje-rizos).

El paquete trae un atlas de 6x16 celdas de 192x176 (ancla 56,160) con las mismas tiras que
El Barbas (idle, punch, kick, throwBottle y las 12 de Combate 2.0), su fighter.json, retratos
y fotos de referencia. Esta herramienta:

- Copia lo necesario a source-art/personajes/<id>/ (atlas, JSON, retratos y notas) y las fotos
  de referencia a references/<id>/ (excluida de git: son fotos de personas reales).
- Genera assets/characters/<id>.png con la MISMA distribución de filas que assets/fighter.png,
  de modo que las animaciones comunes (assets/fighter.json + game/data/moves.js) caen sobre sus
  poses. Las poses en el aire se bajan dentro de su celda igual que con El Barbas
  (tools/integrate_combat_assets.py): la altura la pone la física del salto.
- Copia el retrato de selección a assets/characters/<id>-retrato.png.
- Escribe assets/characters/art-data.js (window.TROLINA_CHARACTER_ART) con lo propio de cada
  personaje: filas del atlas, filas que faltan, puntos de la mano del botellín y retrato, más los
  ajustes a mano de source-art/personajes/<id>/juego.json (p. ej. "mouth": boca para el pitillo,
  en coordenadas de la celda de guardia; sin él se usa la de El Barbas, 98,43).

Tiempos y cajas de golpe son los comunes para no tocar el equilibrio: las del paquete solo se
usan para comprobar que sus golpes llegan a las cajas del juego (se avisa si no).

Paquetes de extras (como la-trolina-rizos-ultimate-patinete, con extension.json): animaciones
con otro tamaño de celda (256x224, ancla 72,208) en una segunda hoja, con el objeto dibujado
dentro (taburete, patinete), más humo y objetos sueltos. Se copian a source-art/personajes/<id>/extras/
y se escriben en art-data.js como `extras` (hoja, celdas, tiempos, boca, punto de enlace con el
luchador base, humo y patinete aparcado). Los usa game/combat/match.js (ultimate de Rizos y entrada).

Paquetes con arma (desde v0.15, Sombrero: carpetas con-baston/ y sin-baston/, cada una con su
fighter.json y atlas de 16 tiras, más extras/ con extras.json y entrada.json): el atlas con arma es
el principal (assets/characters/<id>.png) y el otro va a assets/characters/<id>-sin-arma.png con la
misma distribución. Se copian a source-art/personajes/<id>/ (sin-arma/ y arma/) y se escribe en
art-data.js `weapon` (atlas sin arma, punto de agarre del arma en cada celda, objeto suelto, icono,
soplo de la ultimate) y `extras` con una segunda hoja de celdas 192x176 (ultimate con y sin arma,
recoger el arma y entrada en bicicleta), además de la bici aparcada y las animaciones de estado que
el paquete alarga (guardHit, parry). Lo usan game/combat/combatant.js y game/combat/match.js.

Uso:  python3 tools/integrate_character.py [carpeta-del-paquete ...]
      sin carpetas, reintegra todo lo que haya en source-art/personajes/.
Después registra el personaje en game/data/characters.js (atlas assets/characters/<id>.png).
Requiere Pillow (ver requirements-art.txt).
"""
from pathlib import Path
import json
import shutil
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / 'source-art' / 'personajes'
REF_DIR = ROOT / 'references'
OUT = ROOT / 'assets' / 'characters'
BASE = ROOT / 'assets' / 'fighter.json'
W, H, COLS = 192, 176, 6
BASE_ROWS = {'idle': 0, 'punch': 1, 'kick': 2, 'throwBottle': 3}
# Igual que tools/integrate_combat_assets.py: tiras cuyas poses en el aire se bajan.
LOWER_AIRBORNE = {'jump', 'air', 'hit', 'grabbed'}
# Lo que se guarda del paquete (las tiras sueltas, guías y vistas previas se quedan en el paquete).
KEEP = ['fighter.png', 'fighter.json', 'portraits', 'LEEME_CODEX.md', 'COMPROBACION.json', 'PROMPTS_GENERACION.json']
KEEP_EXTRAS = ['extension.json', 'extras-atlas.png', 'objetos', 'efectos', 'LEEME_CODEX.md', 'COMPROBACION.json', 'PROMPTS_GENERACION.json']
# Golpes cuyo punto activo (del paquete) debe caer dentro de la caja común del juego.
ACTIVE_CHECK = {'punch': 'punch', 'kick': 'kick', 'gancho': 'gancho', 'airPunch': 'airPunch', 'dive': 'dive'}


def import_package(pkg):
    if (pkg / 'extension.json').exists():
        return import_extras(pkg)
    if (pkg / 'con-baston' / 'fighter.json').exists():
        return import_armed(pkg)
    meta = json.loads((pkg / 'fighter.json').read_text(encoding='utf-8'))
    cid = meta['id']
    dst = SRC_DIR / cid
    dst.mkdir(parents=True, exist_ok=True)
    for name in KEEP:
        p = pkg / name
        if p.is_dir():
            shutil.copytree(p, dst / name, dirs_exist_ok=True)
        elif p.exists():
            shutil.copy2(p, dst / name)
    refs = pkg / 'referencias'
    if refs.is_dir():
        (REF_DIR / cid).mkdir(parents=True, exist_ok=True)
        for f in refs.iterdir():
            if f.is_file():
                shutil.copy2(f, REF_DIR / cid / f.name)
    return dst


def import_extras(pkg):
    """Paquete de extras: va a source-art/personajes/<id>/extras (y su personaje-base, si cambia)."""
    ext = json.loads((pkg / 'extension.json').read_text(encoding='utf-8'))
    cid = ext['characterId']
    base = pkg / 'personaje-base'
    if (base / 'fighter.json').exists():
        cur = SRC_DIR / cid / 'fighter.json'
        if not cur.exists() or cur.read_bytes() != (base / 'fighter.json').read_bytes() or \
                (SRC_DIR / cid / 'fighter.png').read_bytes() != (base / 'fighter.png').read_bytes():
            print('  el personaje base del paquete es distinto: se importa también')
            import_package(base)
    dst = SRC_DIR / cid / 'extras'
    dst.mkdir(parents=True, exist_ok=True)
    for name in KEEP_EXTRAS:
        p = pkg / name
        if p.is_dir():
            shutil.copytree(p, dst / name, dirs_exist_ok=True)
        elif p.exists():
            shutil.copy2(p, dst / name)
    refs = pkg / 'referencias'
    if refs.is_dir():
        (REF_DIR / cid / 'extras').mkdir(parents=True, exist_ok=True)
        for f in refs.iterdir():
            if f.is_file():
                shutil.copy2(f, REF_DIR / cid / 'extras' / f.name)
    return dst


def import_armed(pkg):
    """Paquete con arma: con-baston/ es el personaje base; sin-baston/ y extras/ van a sin-arma/ y arma/."""
    meta = json.loads((pkg / 'con-baston' / 'fighter.json').read_text(encoding='utf-8'))
    cid = meta['id']
    dst = SRC_DIR / cid
    for sub, out in (('con-baston', dst), ('sin-baston', dst / 'sin-arma')):
        out.mkdir(parents=True, exist_ok=True)
        for name in ('fighter.png', 'fighter.json'):
            shutil.copy2(pkg / sub / name, out / name)
    shutil.copytree(pkg / 'portraits', dst / 'portraits', dirs_exist_ok=True)
    shutil.copytree(pkg / 'extras', dst / 'arma', dirs_exist_ok=True)
    for name in ('LEEME_CODEX.md', 'MANIFEST_SHA256.txt'):
        if (pkg / name).exists():
            shutil.copy2(pkg / name, dst / name)
    return dst


def lower_bbox(img, rect, rows=25):
    """Caja horizontal de lo que toca el suelo (las últimas filas) dentro de una celda."""
    x, y, w, h = rect
    cell = img.crop((x, y + h - rows, x + w, y + h))
    box = cell.getchannel('A').getbbox()
    return (box[0], box[2]) if box else None


def integrate_extras(src, cid):
    """Segunda hoja (ultimate, entrada…): copia imágenes y devuelve los datos para art-data.js."""
    ext = json.loads((src / 'extension.json').read_text(encoding='utf-8'))
    cw, ch = ext['frameSize']
    shutil.copy2(src / ext['image'], OUT / f'{cid}-extras.png')
    sheet = Image.open(src / ext['image']).convert('RGBA')
    seqs = ext.get('timelines', {})
    # Punto de enlace con el luchador base (pie de apoyo, ancla 56,160) de cada secuencia: el del
    # evento return-to-base de su última animación. Se dibuja cada cuadro con ese punto en el ancla.
    refs = {}
    for tl in seqs.values():
        last = ext['animations'][tl['sequence'][-1]]
        ref = next((f.get('handoffActorAnchor') for f in last['frames'] if f.get('handoffActorAnchor')), None)
        for name in tl['sequence']:
            if ref:
                refs[name] = ref
    anims = {}
    for name, a in ext['animations'].items():
        frames, mouth, emit = [], {}, None
        for f in a['frames']:
            if f.get('empty'):
                continue
            i = len(frames)
            frames.append([f['rect'][0], f['rect'][1], f['durationMs']])
            if f.get('mouthSocket'):
                mouth[i] = f['mouthSocket']
            if any(e.get('type') == 'emit-effect' for e in f.get('events', [])):
                emit = i
        anims[name] = {'loop': bool(a.get('loop')), 'ref': refs.get(name, ext['anchor']), 'frames': frames}
        if mouth:
            anims[name]['mouth'] = [mouth.get(i) for i in range(len(frames))]
        if emit is not None:
            anims[name]['emit'] = emit
    out = {'image': f'assets/characters/{cid}-extras.png', 'cell': [cw, ch], 'anchor': ext['anchor'], 'anims': anims}
    for key, fx in ext.get('effects', {}).items():
        if key == 'smoke':
            shutil.copy2(src / fx['image'], OUT / f'{cid}-humo.png')
            out['smoke'] = {'image': f'assets/characters/{cid}-humo.png', 'cell': fx['cell'], 'anchor': fx['anchor'],
                            'frames': fx['frameCount'], 'ms': fx['durationMs'], 'opacity': fx.get('opacity', 1)}
    # Patinete aparcado tras la entrada: el objeto suelto, ajustado al del último cuadro de la bajada.
    obj = ext.get('objects', {}).get('scooter')
    ent = seqs.get('entrance')
    if obj and ent:
        shutil.copy2(src / obj['image'], OUT / f'{cid}-patinete.png')
        last = ext['animations'][ent['sequence'][-1]]
        lf = [f for f in last['frames'] if not f.get('empty')][-1]
        comp = lower_bbox(sheet, lf['rect'])
        im = Image.open(src / obj['image']).convert('RGBA')
        box = im.getchannel('A').getbbox()
        scale = (comp[1] - comp[0]) / (box[2] - box[0])
        at = [round(comp[0] + (obj['anchor'][0] - box[0]) * scale, 1), ext['anchor'][1]]
        out['scooter'] = {'image': f'assets/characters/{cid}-patinete.png', 'cell': obj['cell'], 'anchor': obj['anchor'],
                          'scale': round(scale, 3), 'at': at}
        out['entrance'] = {'sequence': ent['sequence'], 'rideMs': ent.get('rideTravelMs', 1200)}
    if 'ultimate' in seqs:
        out['ultimate'] = {'sequence': seqs['ultimate']['sequence']}
    print(f'  extras: {len(anims)} animaciones ({cw}x{ch}, ancla {ext["anchor"][0]},{ext["anchor"][1]}), '
          f'humo {"sí" if "smoke" in out else "no"}, patinete {"sí" if "scooter" in out else "no"}')
    return out


def base_rows():
    data = json.loads(BASE.read_text(encoding='utf-8'))
    rows = dict(BASE_ROWS)
    rows.update(data.get('combatArt', {}).get('rows', {}))
    return data, rows


def inside(pt, box, lowered):
    x, y = pt
    y += lowered
    return box['x'] <= x <= box['x'] + box['w'] and box['y'] <= y <= box['y'] + box['h']


def build_atlas(src, rows, dst):
    """Atlas del juego (mismas filas que assets/fighter.png) a partir de fighter.json + fighter.png.
    Devuelve (meta, filas, filas vacías, poses bajadas)."""
    meta = json.loads((src / 'fighter.json').read_text(encoding='utf-8'))
    assert (meta['frameWidth'], meta['frameHeight']) == (W, H), 'celdas distintas de 192x176'
    assert (meta['anchor']['x'], meta['anchor']['y']) == (56, 160), 'ancla distinta de (56,160)'
    sheet = Image.open(src / 'fighter.png').convert('RGBA')
    n_rows = max(rows.values()) + 1
    atlas = Image.new('RGBA', (COLS * W, n_rows * H), (0, 0, 0, 0))
    filled, shifts = set(), {}
    for name, strip in meta['strips'].items():
        if name not in rows:
            print(f'  aviso: la tira «{name}» no existe en el atlas común; se ignora')
            continue
        r_src, r_dst = strip['row'], rows[name]
        for fr in strip['frames']:
            i = fr['index']
            cell = sheet.crop((i * W, r_src * H, (i + 1) * W, (r_src + 1) * H))
            dy = 0
            if name in LOWER_AIRBORNE and fr.get('airborne') and fr.get('bbox'):
                dy = max(0, 160 - fr['bbox'][3])
                if dy:
                    moved = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                    moved.paste(cell.crop((0, 0, W, H - dy)), (0, dy))
                    cell = moved
            if dy:
                shifts[f'{name}:{i}'] = dy
            atlas.paste(cell, (i * W, r_dst * H))
        filled.add(r_dst)
    missing = sorted(set(range(n_rows)) - filled)
    save_png(atlas, dst)
    return meta, n_rows, missing, shifts


def save_png(img, dst):
    # No reescribe el PNG si los píxeles no cambian (otra versión de Pillow lo comprimiría distinto).
    if not dst.exists() or Image.open(dst).convert('RGBA').tobytes() != img.tobytes():
        img.save(dst, optimize=True)


def integrate(src, base, rows):
    cid = json.loads((src / 'fighter.json').read_text(encoding='utf-8'))['id']
    meta, n_rows, missing, shifts = build_atlas(src, rows, OUT / f'{cid}.png')

    # Retrato de selección (y el de HUD, por si el marcador llega a usarlos).
    portrait = None
    for key, suffix in (('select', 'retrato'), ('hud', 'hud')):
        rel = meta.get('portraits', {}).get(key)
        p = (src / rel) if rel else None
        if p and not p.exists():
            p = src / 'portraits' / Path(rel).name   # paquetes con arma: «../portraits/…»
        if p and p.exists():
            shutil.copy2(p, OUT / f'{cid}-{suffix}.png')
            if key == 'select':
                portrait = f'assets/characters/{cid}-retrato.png'

    # Mano del botellín: fotogramas 0..3 de throwBottle (el 3 es el que lo suelta).
    anims = meta['animations']
    sockets = []
    for i, f in enumerate(anims['throwBottle']['frames'][:4]):
        s = f.get('itemSocket') or next((e['socket'] for e in f.get('events', []) if e.get('type') == 'spawn-projectile'), None)
        sockets.append({'x': s['x'], 'y': s['y'], 'rotation': s.get('rotation', 0)} if s else None)

    # Comprobación: sus golpes deben llegar a las cajas comunes del juego.
    for mine, common in ACTIVE_CHECK.items():
        a, b = anims.get(mine), base['animations'].get(common)
        if not a or not b:
            continue
        pts = [(f['activePoint']['x'], f['activePoint']['y'], f) for f in a['frames'] if f.get('activePoint')]
        boxes = [hb for f in b['frames'] for hb in f.get('hitboxes', [])]
        for x, y, f in pts:
            strip = next((n for n, s in meta['strips'].items() if s['row'] == f['y'] // H), None)
            low = shifts.get(f'{strip}:{f["x"] // W}', 0)
            ok = any(inside((x, y), hb, low) for hb in boxes)
            print(f'  {mine}: punto activo ({x},{y + low}) {"dentro" if ok else "FUERA"} de la caja común')

    # Ajustes a mano del juego (juego.json en su carpeta de source-art), p. ej. la boca para el pitillo.
    extra = {}
    if (src / 'juego.json').exists():
        extra = json.loads((src / 'juego.json').read_text(encoding='utf-8'))
        extra.pop('_nota', None)

    info = {
        **extra,
        'name': meta.get('name', cid),
        'source': f'source-art/personajes/{cid}',
        'rows': n_rows,
        'missingRows': missing,
        'portrait': portrait,
        'sockets': sockets,
        'loweredAirborne': shifts,
    }
    if (src / 'extras' / 'extension.json').exists():
        info['extras'] = integrate_extras(src / 'extras', cid)
    if (src / 'sin-arma' / 'fighter.json').exists() and (src / 'arma' / 'extras.json').exists():
        integrate_weapon(src, cid, meta, rows, shifts, info)
    return cid, info


def cell_key(fr):
    return f'{fr["x"] // W},{fr["y"] // H}'


def integrate_weapon(src, cid, meta, rows, shifts, info):
    """Personaje con arma (Sombrero): atlas sin arma, agarre por celda, segunda hoja y objetos sueltos."""
    arma = src / 'arma'
    ex = json.loads((arma / 'extras.json').read_text(encoding='utf-8'))
    ent = json.loads((arma / 'entrada.json').read_text(encoding='utf-8'))
    _, _, miss2, shifts2 = build_atlas(src / 'sin-arma', rows, OUT / f'{cid}-sin-arma.png')
    assert shifts2 == shifts, 'las dos variantes deben bajar igual las poses en el aire'
    row_name = {r: n for n, r in rows.items()}

    # Agarre del arma en cada celda del atlas (coordenadas de celda, ya con las poses bajadas):
    # de dónde sale volando al desarmarlo y dónde se dibuja un arma que no está en el dibujo.
    grip = {}
    for a in meta['animations'].values():
        for fr in a['frames']:
            s = fr.get('caneSocket')
            if not s:
                continue
            col, row = fr['x'] // W, fr['y'] // H
            low = shifts.get(f'{row_name.get(row)}:{col}', 0)
            grip.setdefault(cell_key(fr), [s['x'], s['y'] + low, round(s.get('rotation', 0), 3)])
    # Celdas sin agarre (p. ej. lanzando el botellín): el de la celda anterior de la fila o el de la guardia.
    for row in range(max(rows.values()) + 1):
        prev = grip.get('0,0')
        for col in range(COLS):
            k = f'{col},{row}'
            if k in grip:
                prev = grip[k]
            elif prev:
                grip[k] = prev

    # Segunda hoja: ultimate con y sin arma, recoger el arma y entrada en bici, todo en celdas 192x176.
    v_con, v_sin = ex['variants']['con-baston'], ex['variants']['sin-baston']
    layout = [('ultimate-arma', arma / v_con['ultimate']['image'], len(v_con['ultimate']['frames'])),
              ('ultimate-mano', arma / v_sin['ultimate']['image'], len(v_sin['ultimate']['frames'])),
              ('recoger-sin', arma / v_sin['pickUpCane']['image'], 3),
              ('recoger-con', arma / v_con['pickUpCane']['image'], 3),
              ('entrada-arma', arma / ent['armedImage'], ent['frameCount']),
              ('entrada-mano', arma / ent['unarmedImage'], ent['frameCount'])]
    width = max(n for _, _, n in layout) * W
    sheet = Image.new('RGBA', (width, len(layout) * H), (0, 0, 0, 0))
    origin = {}
    for i, (name, path, n) in enumerate(layout):
        im = Image.open(path).convert('RGBA')
        assert im.size[1] == H and im.size[0] >= n * W, f'{path.name}: tamaño inesperado {im.size}'
        sheet.paste(im.crop((0, 0, n * W, H)), (0, i * H))
        origin[name] = i * H
    save_png(sheet, OUT / f'{cid}-extras.png')

    A0 = [ex['anchor']['x'], ex['anchor']['y']]
    anims = {}

    def ult(name, v):
        frames = v['ultimate']['frames']
        out = {'loop': False, 'ref': A0, 'frames': [[f['x'], origin[name] + f['y'], f['duration']] for f in frames]}
        for i, f in enumerate(frames):
            for e in f.get('events', []):
                if e['type'] == 'ultimate-puff':
                    out['puff'] = {'frame': i, 'at': [e['socket']['x'], e['socket']['y']],
                                   'box': [e['box'][k] for k in ('x', 'y', 'w', 'h')]}
                if e['type'] == 'ultimate-impact':
                    out['impact'] = {'frame': i, 'box': [e['box'][k] for k in ('x', 'y', 'w', 'h')]}
        return out
    anims['ultimate-arma'] = ult('ultimate-arma', v_con)
    anims['ultimate-mano'] = ult('ultimate-mano', v_sin)
    # Recoger: se agacha (sin arma) y, en la tercera, ya la lleva (con arma).
    pf_sin, pf_con = v_sin['pickUpCane']['frames'], v_con['pickUpCane']['frames']
    pick = {'loop': False, 'ref': A0, 'frames': [[f['x'], origin['recoger-sin'] + f['y'], f['duration']] for f in pf_sin[:2]] +
            [[pf_con[2]['x'], origin['recoger-con'] + pf_con[2]['y'], pf_con[2]['duration']]]}
    pick['pickup'] = next(i for i, f in enumerate(pf_sin) if any(e['type'] == 'cane-pickup' for e in f.get('events', [])))
    pick['hand'] = [[f['handSocket']['x'], f['handSocket']['y']] for f in pf_sin]
    anims['recoger'] = pick
    # Entrada: pedalea (en bucle mientras llega), frena y se baja. El ancla de entrada.json (90,160) es
    # la de la bici; el luchador está en las mismas coordenadas de celda que en su atlas (ancla 56,160):
    # así el último cuadro casa con la guardia. La bici aparcada sí parte de la de entrada.json.
    bref = [ent['anchor']['x'], ent['anchor']['y']]
    eref = A0
    phases = {}
    for f in ent['frames']:
        phases.setdefault(f['phase'], [])
        if [f['x'], f['duration']] not in phases[f['phase']]:
            phases[f['phase']].append([f['x'], f['duration']])
    seq = {'pedal': phases['pedaleo'], 'freno': phases['freno'], 'bajar': phases['pie-a-tierra'] + phases['desmontar']}
    for var in ('arma', 'mano'):
        for key, cells in seq.items():
            anims[f'entrada-{key}-{var}'] = {'loop': key == 'pedal', 'ref': eref,
                                             'frames': [[x, origin[f'entrada-{var}'], ms] for x, ms in cells]}
    ride = sum(f['duration'] for f in ent['frames'] if f['phase'] == 'pedaleo')
    extras = {'image': f'assets/characters/{cid}-extras.png', 'cell': [W, H], 'anchor': A0, 'anims': anims,
              'entrance': {'sequence': ['entrada-pedal-arma', 'entrada-freno-arma', 'entrada-bajar-arma'],
                           'unarmed': ['entrada-pedal-mano', 'entrada-freno-mano', 'entrada-bajar-mano'],
                           'rideMs': max(1200, ride)},
              'ultimate': {'sequence': ['ultimate-arma'], 'unarmed': ['ultimate-mano']}}
    # Bici aparcada: su esquina inferior izquierda, donde la deja la entrada (parkedBike, desde el ancla).
    bike = Image.open(arma / ent['parkedImage']).convert('RGBA')
    shutil.copy2(arma / ent['parkedImage'], OUT / f'{cid}-bici.png')
    pb = ent['parkedBike']
    extras['scooter'] = {'image': f'assets/characters/{cid}-bici.png', 'cell': list(bike.size), 'anchor': [0, bike.size[1]],
                         'scale': 1, 'at': [bref[0] + pb['x'], bref[1] + pb['y'] + bike.size[1]]}
    info['extras'] = extras

    # Objetos sueltos: el arma (gira por su agarre al caer), su icono del marcador y el soplo.
    shutil.copy2(arma / ex['cane']['image'], OUT / f'{cid}-baston.png')
    shutil.copy2(arma / ex['cane']['hud'], OUT / f'{cid}-ui-baston.png')
    puff = ex['effects']['puff']
    shutil.copy2(arma / puff['image'], OUT / f'{cid}-soplo.png')
    info['weapon'] = {
        'id': 'baston',
        'unarmed': f'assets/characters/{cid}-sin-arma.png',
        'missingRowsUnarmed': miss2,
        'grip': grip,
        'prop': {'image': f'assets/characters/{cid}-baston.png', 'grip': [ex['cane']['grip']['x'], ex['cane']['grip']['y']]},
        'hud': f'assets/characters/{cid}-ui-baston.png',
        'puff': {'image': f'assets/characters/{cid}-soplo.png', 'ms': puff['duration'], 'travel': puff['travel'],
                 'frames': [[f['x'], f['y'], f['w'], f['h']] for f in puff['frames']]},
    }
    # Estados que el paquete alarga (guardia: encajar y guardia justa), solo de dibujo: [col, fila, ms].
    info['animations'] = {name: [[f['x'] // W, f['y'] // H, f['duration']] for f in meta['animations'][name]['frames']]
                          for name in ('guardHit', 'parry') if name in meta['animations']}
    print(f'  arma: atlas sin arma, agarre en {len(grip)} celdas, segunda hoja {len(anims)} animaciones '
          f'({sheet.size[0]}x{sheet.size[1]}), bici, bastón, icono y soplo')


def main():
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for arg in sys.argv[1:]:
        print('Importando', import_package(Path(arg)).relative_to(ROOT))
    base, rows = base_rows()
    art = {}
    for src in sorted(p for p in SRC_DIR.iterdir() if (p / 'fighter.json').exists()):
        cid, info = integrate(src, base, rows)
        art[cid] = info
        print(f'{cid}: atlas {COLS}x{info["rows"]}, filas vacías {info["missingRows"] or "ninguna"}, '
              f'poses bajadas {len(info["loweredAirborne"])}, retrato {"sí" if info["portrait"] else "no"}')
    js = ('/* Generado por tools/integrate_character.py: personajes con arte propio. */\n'
          'window.TROLINA_CHARACTER_ART = ' + json.dumps(art, indent=2, ensure_ascii=False) + ';\n')
    (OUT / 'art-data.js').write_text(js, encoding='utf-8')
    print('Escrito assets/characters/art-data.js')


if __name__ == '__main__':
    main()
