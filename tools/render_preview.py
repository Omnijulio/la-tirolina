from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math,base64,shutil,re
R=Path(__file__).resolve().parents[1];P=R
import subprocess
subprocess.run(['node',str(R/'tools/render_preview.cjs')],cwd=R,check=True)
atlas=Image.open(P/'assets/fighter.png').convert('RGBA');bottle=Image.open(P/'assets/bottle.png').convert('RGBA')
data=json.loads((P/'assets/fighter.json').read_text());config=json.loads((P/'assets/bottle.json').read_text())
font=ImageFont.load_default(size=18);small=ImageFont.load_default(size=12)
frames=[]
labels={'idle':'GUARDIA','punch':'PUNETAZO','kick':'PATADA','throwBottle':'LANZAMIENTO DE BOTELLIN'}
def draw_bottle(bg,x,y,angle,scale):
    # Render around the same grip point as the JavaScript controller.
    tile=Image.new('RGBA',(80,80));w=round(24*scale);h=round(32*scale)
    sp=bottle.resize((w,h),Image.Resampling.NEAREST)
    tile.paste(sp,(round(40-12*scale),round(40-10*scale)))
    tile=tile.rotate(-math.degrees(angle),Image.Resampling.NEAREST,expand=False,center=(40,40))
    bg.paste(tile,(round(x)-40,round(y)-40),tile)
for state in json.loads((R/'build/preview-states.json').read_text()):
    bg=Image.open(P/'assets/stage/stage-composite.png').convert('RGB');dr=ImageDraw.Draw(bg)
    dr.rectangle((12,10,600,39),fill='#121522')
    dr.text((20,15),'LA TROLINA / '+labels[state['animation']],font=font,fill='#8bf2ce')
    for x in [280,710]:dr.ellipse((x-45,481,x+80,493),fill='#171018')
    f=data['animations'][state['animation']]['frames'][state['frame']]
    sp=atlas.crop((f['x'],f['y'],f['x']+192,f['y']+176)).resize((384,352),Image.Resampling.NEAREST)
    bg.paste(sp,(280-112,486-320),sp)
    other=data['animations']['idle']['frames'][state.get('opponentFrame',0)]
    osp=atlas.crop((other['x'],other['y'],other['x']+192,other['y']+176)).resize((384,352),Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    bg.paste(osp,(710-(192-56)*2,486-320),osp)
    if state.get('held'):
        h=state['held'];draw_bottle(bg,280+(h['x']-56)*2,486+(h['y']-160)*2,h.get('rotation',0),2)
    for p in state['projectiles']:draw_bottle(bg,p['x'],p['y'],p['angle'],p['scale'])
    for e in state['impacts']:
        t=e['age']/300
        for i in range(8):
            angle=i*math.pi/4;radius=(4+24*t)*e['scale'];x=e['x']+math.cos(angle)*radius;y=e['y']+math.sin(angle)*radius+12*t*t
            dr.rectangle((round(x),round(y),round(x)+5,round(y)+3),fill='#f7d48b' if i%2 else '#a66b2c')
    frames.append(bg)
palette=frames[0].quantize(colors=256)
gifframes=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
gifframes[0].save(R/'fighter-animation.gif',save_all=True,append_images=gifframes[1:],duration=50,loop=0,optimize=True,disposal=1)
frames[26].save(R/'build/preview-frame.png')
print('Rebuilt fighter-animation.gif')
