from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
import numpy as np
R=Path(__file__).resolve().parents[1];P=R;S=P/'assets/stage'
wall=Image.open(R/'source-art/stage-wall.png').convert('RGBA').resize((544,306),Image.Resampling.NEAREST).crop((0,36,544,306))
furniture=Image.open(R/'source-art/stage-tables.png').convert('RGBA').resize((544,306),Image.Resampling.NEAREST).crop((0,36,544,306))
mid=Image.new('RGBA',(544,270));mid.paste(furniture,(0,-14))
pixels=np.array(mid);pixels[pixels[:,:,3]<16]=0;pixels[:80]=0;pixels[210:]=0;mid=Image.fromarray(pixels)
# Split the continuous pavement into the front plane without introducing a seam.
rear=Image.new('RGBA',(544,270));rear.paste(wall.crop((0,0,544,210)),(0,0))
front=Image.new('RGBA',(544,270));front.paste(wall.crop((0,210,544,270)),(0,210))
for image,name in [(rear,'01-wall.png'),(mid,'02-tables.png'),(front,'03-arena-floor.png')]:image.save(S/name,optimize=True)
config={'name':'La Trolina — terraza nocturna','assetWidth':544,'assetHeight':270,'viewportWidth':480,'viewportHeight':270,
 'overscanX':32,'maxCameraX':24,'groundY':243,'arena':{'top':215,'bottom':258},
 'spawnPoints':[{'x':140,'y':243,'facing':1},{'x':355,'y':243,'facing':-1}],
 'layers':[{'id':'wall','name':'Pared y fachada','image':'assets/stage/01-wall.png','depth':0,'parallax':0.18},
 {'id':'tables','name':'Mesas, sillas y jardinera','image':'assets/stage/02-tables.png','depth':1,'parallax':0.55},
 {'id':'arena','name':'Suelo y personajes delante','image':'assets/stage/03-arena-floor.png','depth':2,'parallax':1,'dynamicActors':True}],
 'drawOrder':['wall','tables','arena','characters','projectiles'],
 'units':'Native stage pixels. Viewport 480x270. All PNG layers 544x270. Draw x=-32 at camera 0; the extra width allows camera movement without empty side edges.'}
(S/'stage.json').write_text(json.dumps(config,indent=2,ensure_ascii=False),encoding='utf-8')
(S/'stage-data.js').write_text('window.TERRACE_STAGE_DATA = '+json.dumps(config,separators=(',',':'),ensure_ascii=False)+';\n',encoding='utf-8')
composite=Image.new('RGBA',(544,270));composite.alpha_composite(rear);composite.alpha_composite(mid);composite.alpha_composite(front)
view=composite.crop((32,0,512,270)).resize((960,540),Image.Resampling.NEAREST)
view.convert('RGB').save(S/'stage-composite.png')
# A still proves the occlusion order with two instances of the available fighter.
atlas=Image.open(P/'assets/fighter.png').convert('RGBA');data=json.loads((P/'assets/fighter.json').read_text())
for x,facing,index in [(280,1,0),(710,-1,4)]:
 f=data['animations']['idle']['frames'][index];sp=atlas.crop((f['x'],f['y'],f['x']+192,f['y']+176)).resize((384,352),Image.Resampling.NEAREST)
 if facing<0:sp=sp.transpose(Image.Transpose.FLIP_LEFT_RIGHT);left=x-(192-56)*2
 else:left=x-56*2
 d=ImageDraw.Draw(view);d.ellipse((x-45,481,x+80,493),fill=(12,8,12,120))
 view.alpha_composite(sp,(left,486-320))
view.convert('RGB').save(S/'stage-with-fighters.png')
# The review image is already saved inside assets/stage.
font=ImageFont.load_default(size=15);small=ImageFont.load_default(size=12)
sheet=Image.new('RGB',(960,690),'#101725');d=ImageDraw.Draw(sheet)
for i,(im,title) in enumerate([(rear,'01 / FONDO — PARED'),(mid,'02 / MEDIO — MESAS Y SILLAS'),(front,'03 / DELANTE — SUELO Y PERSONAJES')]):
 y=i*230;d.text((18,y+7),title,font=font,fill='#8bf2ce')
 for yy in range(y+32,y+212,12):
  for xx in range(0,480,12):d.rectangle((xx,yy,xx+11,yy+11),fill='#243345' if (xx//12+yy//12)%2 else '#1a2535')
 thumb=im.crop((32,0,512,270)).resize((320,180),Image.Resampling.NEAREST);sheet.paste(thumb,(80,y+32),thumb)
 d.text((500,y+70),['Fachada, puertas, balcones y luces.','Mobiliario recortado con transparencia.','Franja de combate por delante de las mesas.'][i],font=small,fill='#c4d0da')
 d.text((500,y+100),'PNG 544 x 270 / coordenadas compartidas',font=small,fill='#8c9cad')
sheet.save(S/'stage-layers-guide.png')
print('Stage: three aligned RGBA layers; tables alpha bbox',mid.getchannel('A').getbbox())
