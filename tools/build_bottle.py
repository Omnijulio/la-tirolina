from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'source-art/bottle-estrella-galicia.png').convert('RGBA')
bounds=source.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox()
source=source.crop(bounds)
for scale,name in [(1,'bottle.png'),(4,'bottle-estrella-galicia-4x.png')]:
    tile=Image.new('RGBA',(24*scale,32*scale))
    sprite=source.resize((8*scale,27*scale),Image.Resampling.NEAREST)
    tile.paste(sprite,(8*scale,2*scale))
    tile.save(ROOT/'assets'/name)
print('Rebuilt Estrella Galicia shared bottle images')
