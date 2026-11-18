"""Iconos pixel art de La Barra (24x32, fondo transparente).

Uso: python3 tools/build_drink_icons.py  -> assets/icons/drinks/*.png y assets/icons/smokes/*.png
Dibujados a mano por código: vaso de Peterete (verde lima con hielo), chupitos,
destornillador, Red Label con cola, puro, habano, chiflo y paquetes de tabaco (sin
logotipos: solo los colores de la cajetilla).
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'icons' / 'drinks'
W, H = 24, 32
GLASS = (210, 230, 240, 255)
GLASS_D = (150, 175, 190, 255)
SHINE = (255, 255, 255, 230)


def canvas():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < W and 0 <= y < H:
                im.putpixel((x, y), c)


def peterete():
    im = canvas()
    x0, x1, y0, y1 = 5, 18, 5, 30           # vaso alto
    rect(im, x0, y0, x0, y1, GLASS_D); rect(im, x1, y0, x1, y1, GLASS_D)
    rect(im, x0, y1, x1, y1, GLASS_D); rect(im, x0 + 1, y1 - 1, x1 - 1, y1 - 1, GLASS)
    lime, lime_d, lime_l = (156, 224, 58, 235), (104, 176, 34, 240), (204, 245, 120, 235)
    rect(im, x0 + 1, 9, x1 - 1, y1 - 2, lime)                # bebida verde lima
    rect(im, x0 + 1, 9, x1 - 1, 9, lime_l)
    rect(im, x1 - 3, 10, x1 - 1, y1 - 2, lime_d)
    for (ix, iy) in [(7, 7), (12, 8), (9, 12)]:              # hielos
        rect(im, ix, iy, ix + 3, iy + 3, (226, 248, 255, 245))
        rect(im, ix, iy, ix + 3, iy, (255, 255, 255, 255))
        rect(im, ix + 3, iy + 1, ix + 3, iy + 3, (170, 215, 235, 245))
    for y in (17, 21, 25):                                   # burbujas
        im.putpixel((x0 + 4 + (y % 3), y), lime_l)
    rect(im, x0 + 1, 10, x0 + 1, y1 - 3, SHINE)              # reflejo del vaso
    rect(im, 15, 1, 16, 11, (240, 90, 90, 255))              # pajita
    rect(im, 15, 1, 15, 11, (255, 170, 170, 255))
    return im


def highball(liquid, top, dark, extra=None):
    """Vaso de tubo con hielo (combinados)."""
    im = canvas()
    x0, x1, y0, y1 = 6, 17, 8, 30
    rect(im, x0, y0, x0, y1, GLASS_D); rect(im, x1, y0, x1, y1, GLASS_D)
    rect(im, x0, y1, x1, y1, GLASS_D); rect(im, x0 + 1, y1 - 1, x1 - 1, y1 - 1, GLASS)
    rect(im, x0 + 1, 12, x1 - 1, y1 - 2, liquid)
    rect(im, x0 + 1, 12, x1 - 1, 12, top)
    rect(im, x1 - 3, 13, x1 - 1, y1 - 2, dark)
    for (ix, iy) in [(8, 13), (12, 16)]:                     # hielos
        rect(im, ix, iy, ix + 2, iy + 2, (230, 246, 255, 235))
        rect(im, ix, iy, ix + 2, iy, (255, 255, 255, 255))
    rect(im, x0 + 1, 13, x0 + 1, y1 - 3, SHINE)
    if extra:
        extra(im)
    return im


def orange_slice(im):
    # Rodaja de naranja en el borde y pajita.
    rect(im, 14, 5, 20, 6, (240, 130, 20, 255)); rect(im, 15, 7, 19, 8, (255, 196, 90, 255))
    rect(im, 16, 9, 18, 9, (240, 130, 20, 255))
    rect(im, 9, 2, 10, 13, (40, 40, 40, 255)); rect(im, 9, 2, 9, 13, (90, 90, 90, 255))


def cola_bubbles(im):
    # Burbujas de la cola y rodaja de limón.
    for (x, y) in [(9, 22), (11, 25), (14, 21), (10, 18)]:
        im.putpixel((x, y), (214, 150, 90, 255))
    rect(im, 15, 6, 20, 7, (236, 226, 70, 255)); rect(im, 16, 8, 19, 9, (250, 246, 170, 255))


def pack(body, body_d, top, band=None):
    """Cajetilla de tabaco con dos cigarrillos asomando. Solo colores, sin marcas."""
    im = canvas()
    x0, x1, y0, y1 = 5, 18, 9, 30
    for (cx, h) in [(8, 4), (11, 6)]:                         # cigarrillos (filtro y papel)
        rect(im, cx, y0 - h, cx + 1, y0 - h + 1, (220, 150, 70, 255))
        rect(im, cx, y0 - h + 2, cx + 1, y0 - 1, (245, 242, 232, 255))
    rect(im, x0, y0, x1, y1, body)
    rect(im, x1 - 3, y0, x1, y1, body_d)                      # lado en sombra
    rect(im, x0, y0, x1, y0 + 5, top)                          # tapa
    rect(im, x0, y0 + 5, x1, y0 + 5, body_d)
    if band:
        rect(im, x0, 20, x1 - 4, 22, band)
        rect(im, x1 - 3, 20, x1, 22, tuple(max(0, c - 40) for c in band[:3]) + (255,))
    rect(im, x0, y0, x0, y1, (20, 20, 28, 255)); rect(im, x1, y0, x1, y1, (20, 20, 28, 255))   # contorno
    rect(im, x0, y1, x1, y1, (20, 20, 28, 255)); rect(im, x0, y0, x1, y0, (20, 20, 28, 255))
    rect(im, x0 + 1, y0 + 6, x0 + 1, y1 - 2, (255, 255, 255, 120))
    return im


def shot(liquid, top, extra=None):
    im = canvas()
    x0, x1, y0, y1 = 6, 17, 17, 30          # vaso de chupito, un poco más ancho arriba
    for y in range(y0, y1 + 1):
        inset = (y - y0) // 6
        im.putpixel((x0 + inset, y), GLASS_D); im.putpixel((x1 - inset, y), GLASS_D)
    rect(im, x0 + 2, y1, x1 - 2, y1, GLASS_D); rect(im, x0 + 2, y1 - 1, x1 - 2, y1 - 1, GLASS)
    for y in range(y0 + 3, y1 - 1):
        inset = (y - y0) // 6
        rect(im, x0 + inset + 1, y, x1 - inset - 1, y, liquid)
    rect(im, x0 + 1, y0 + 3, x1 - 1, y0 + 3, top)
    rect(im, x0 + 2, y0 + 4, x0 + 2, y1 - 3, SHINE)
    if extra:
        extra(im)
    return im


def lime_wedge(im):
    # Rodaja de lima en el borde y unos granos de sal.
    rect(im, 13, 12, 19, 13, (120, 190, 40, 255)); rect(im, 14, 14, 18, 15, (196, 240, 110, 255))
    rect(im, 15, 16, 17, 16, (120, 190, 40, 255))
    for p in [(7, 16), (9, 15), (11, 16), (8, 17)]:
        im.putpixel(p, (255, 255, 255, 255))


def coffee_foam(im):
    rect(im, 8, 19, 15, 19, (196, 150, 98, 255))


SMOKES = Path(__file__).resolve().parent.parent / 'assets' / 'icons' / 'smokes'


def diagonal(im, x0, y0, length, width, color, step=1):
    """Barra diagonal (de abajo-izquierda a arriba-derecha)."""
    for i in range(length):
        for w in range(width):
            x, y = x0 + i, y0 - i + w
            if 0 <= x < W and 0 <= y < H:
                im.putpixel((x, y), color)


def cigar(band, length=18, width=4, tip=(220, 80, 40, 255)):
    im = canvas()
    body, dark = (124, 74, 40, 255), (88, 50, 26, 255)
    diagonal(im, 2, 26, length, width, body)
    diagonal(im, 2, 26 + width - 1, length, 1, dark)
    diagonal(im, 2, 26, 2, width, (70, 70, 70, 255))         # ceniza
    diagonal(im, 4, 24, 1, width, tip)                         # brasa
    if band:
        diagonal(im, 2 + length - 6, 26 - (length - 6), 2, width, band)
    for i in range(3):                                         # humo
        im.putpixel((3 + i, 21 - 3 * i), (200, 200, 210, 200)); im.putpixel((2 + i, 19 - 3 * i), (200, 200, 210, 140))
    return im


def chiflo():
    im = canvas()
    paper, edge = (244, 240, 228, 255), (196, 188, 170, 255)
    for i in range(16):                                        # cono: más ancho en la punta
        w = 2 + i // 6
        diagonal(im, 4 + i, 25 - i, 1, w, paper)
        diagonal(im, 4 + i, 25 - i + w - 1, 1, 1, edge)
    diagonal(im, 19, 10, 2, 4, (230, 120, 60, 255))           # punta encendida
    diagonal(im, 3, 26, 2, 2, (200, 170, 120, 255))           # filtro de cartón
    for i in range(3):
        im.putpixel((21 + (i % 2), 8 - 3 * i), (205, 210, 200, 200))
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    peterete().save(OUT / 'peterete.png')
    shot((60, 24, 14, 245), (110, 50, 26, 255)).save(OUT / 'jager.png')
    shot((52, 28, 12, 245), (120, 74, 36, 255), coffee_foam).save(OUT / 'licor-cafe.png')
    shot((232, 178, 72, 235), (250, 214, 130, 255), lime_wedge).save(OUT / 'tequila.png')
    highball((247, 160, 40, 240), (255, 205, 110, 255), (214, 120, 20, 245), orange_slice).save(OUT / 'destornillador.png')
    highball((92, 46, 22, 240), (150, 90, 50, 255), (60, 28, 12, 245), cola_bubbles).save(OUT / 'red-label-cola.png')
    SMOKES.mkdir(parents=True, exist_ok=True)
    cigar(None).save(SMOKES / 'puro.png')
    cigar((200, 40, 40, 255), length=20, width=5).save(SMOKES / 'habano.png')
    chiflo().save(SMOKES / 'chiflo.png')
    # Ducados negros: cajetilla azul y blanca. Camel: cajetilla color arena.
    pack((40, 84, 176, 255), (26, 58, 128, 255), (244, 244, 240, 255), (244, 244, 240, 255)).save(SMOKES / 'ducados.png')
    pack((222, 186, 104, 255), (176, 140, 70, 255), (240, 226, 186, 255), (150, 98, 46, 255)).save(SMOKES / 'camel.png')
    print('ok', sorted(p.name for p in OUT.glob('*.png')), sorted(p.name for p in SMOKES.glob('*.png')))


if __name__ == '__main__':
    main()
