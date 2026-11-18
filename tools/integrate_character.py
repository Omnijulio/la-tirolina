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


def integrate(src, base, rows):
    meta = json.loads((src / 'fighter.json').read_text(encoding='utf-8'))
    cid = meta['id']
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
    dst = OUT / f'{cid}.png'
    # No reescribe el PNG si los píxeles no cambian (otra versión de Pillow lo comprimiría distinto).
    if not dst.exists() or Image.open(dst).convert('RGBA').tobytes() != atlas.tobytes():
        atlas.save(dst, optimize=True)

    # Retrato de selección (y el de HUD, por si el marcador llega a usarlos).
    portrait = None
    for key, suffix in (('select', 'retrato'), ('hud', 'hud')):
        rel = meta.get('portraits', {}).get(key)
        if rel and (src / rel).exists():
            shutil.copy2(src / rel, OUT / f'{cid}-{suffix}.png')
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
    return cid, info


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
