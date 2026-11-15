"""Empaqueta solo los archivos que necesita el juego en build/la-trolina-web.zip.

Sirve para subirlo a itch.io (proyecto HTML), Netlify Drop o cualquier hosting
estático. No incluye fotos de referencia, originales gráficos ni herramientas.

Uso:  python3 tools/package_web.py
"""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'build' / 'la-trolina-web.zip'

INCLUDE = [
    'index.html', 'manifest.webmanifest', '.nojekyll',
    'game', 'src',
    'assets/fighter-data.js', 'assets/bottle-data.js', 'assets/bottle.png',
    'assets/bottle-estrella-galicia-4x.png', 'assets/characters', 'assets/icons',
    'assets/stage/stage-data.js', 'assets/stage/01-wall.png',
    'assets/stage/02-tables.png', 'assets/stage/03-arena-floor.png',
]


def files():
    for item in INCLUDE:
        p = ROOT / item
        if p.is_dir():
            yield from sorted(x for x in p.rglob('*') if x.is_file() and '__pycache__' not in x.parts)
        elif p.is_file():
            yield p


def main():
    OUT.parent.mkdir(exist_ok=True)
    count = 0
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in files():
            z.write(f, f.relative_to(ROOT).as_posix())
            count += 1
    print(f'{OUT.relative_to(ROOT)}: {count} archivos, {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
