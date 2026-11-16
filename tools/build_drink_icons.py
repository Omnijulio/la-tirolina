"""Iconos pixel art de las bebidas de La Barra (24x32, fondo transparente).

Uso: python3 tools/build_drink_icons.py  -> assets/icons/drinks/*.png
Dibujados a mano por código: vaso de Peterete (verde lima con hielo) y chupitos.
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


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    peterete().save(OUT / 'peterete.png')
    shot((60, 24, 14, 245), (110, 50, 26, 255)).save(OUT / 'jager.png')
    shot((52, 28, 12, 245), (120, 74, 36, 255), coffee_foam).save(OUT / 'licor-cafe.png')
    shot((232, 178, 72, 235), (250, 214, 130, 255), lime_wedge).save(OUT / 'tequila.png')
    print('ok', sorted(p.name for p in OUT.glob('*.png')))


if __name__ == '__main__':
    main()
