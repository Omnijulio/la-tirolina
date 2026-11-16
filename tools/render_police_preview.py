from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math,subprocess,unicodedata
ROOT=Path(__file__).resolve().parents[1]
subprocess.run(['node',str(ROOT/'tools/render_police_states.cjs')],cwd=ROOT,check=True)
police=json.loads((ROOT/'assets/police/police.json').read_text());fighter=json.loads((ROOT/'assets/fighter.json').read_text())
fatlas=Image.open(ROOT/'assets/fighter.png').convert('RGBA');oatlas=Image.open(ROOT/'assets/police/officer.png').convert('RGBA');catlas=Image.open(ROOT/'assets/police/patrol-lights.png').convert('RGBA');bottle=Image.open(ROOT/'assets/bottle.png').convert('RGBA')
back=Image.open(ROOT/'assets/stage/stage-composite.png').convert('RGBA');font=ImageFont.load_default(size=17);small=ImageFont.load_default(size=13)
frames=[];states=json.loads((ROOT/'build/police-states.json').read_text())
def sprite(bg,atlas,data,state):
 frame=data['animations'][state['animation']]['frames'][state['frame']];scale=state['scale'];anchor=data['anchor']
 im=atlas.crop((frame['x'],frame['y'],frame['x']+frame['w'],frame['y']+frame['h'])).resize((round(frame['w']*scale),round(frame['h']*scale)),Image.Resampling.NEAREST)
 if state['facing']<0:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT);x=state['x']-(frame['w']-anchor['x'])*scale
 else:x=state['x']-anchor['x']*scale
 bg.alpha_composite(im,(round(x),round(state['y']-anchor['y']*scale)))
def item(bg,x,y,scale,angle=0):
 tile=Image.new('RGBA',(96,96));im=bottle.resize((round(24*scale),round(32*scale)),Image.Resampling.NEAREST)
 tile.paste(im,(round(48-12*scale),round(48-10*scale)))
 tile=tile.rotate(-math.degrees(angle),Image.Resampling.NEAREST,center=(48,48))
 bg.alpha_composite(tile,(round(x)-48,round(y)-48))
for state in states:
 bg=back.copy();d=ImageDraw.Draw(bg);p=state['police'];car=p['patrol']
 if car:
  s=car['scale'];cf=police['patrol']['frames'][car['frame']];a=police['patrol']['anchor']
  shadow=Image.new('RGBA',bg.size);sd=ImageDraw.Draw(shadow)
  sd.ellipse((car['x']-135*s,car['y']-8,car['x']+135*s,car['y']+14),fill=(37,122,255,51) if car['frame']%2 else (16,18,27,136));bg.alpha_composite(shadow)
  im=catlas.crop((cf['x'],cf['y'],cf['x']+cf['w'],cf['y']+cf['h'])).resize((round(cf['w']*s),round(cf['h']*s)),Image.Resampling.NEAREST)
  bg.alpha_composite(im,(round(car['x']-a['x']*s),round(car['y']-a['y']*s)))
 for a in state['players']:
  d=ImageDraw.Draw(bg);d.ellipse((a['x']-45,a['y']-5,a['x']+80,a['y']+8),fill='#171018');sprite(bg,fatlas,fighter,a)
  if a.get('held'):
   h=a['held'];item(bg,a['x']+(h['x']-56)*a['scale'],a['y']+(h['y']-160)*a['scale'],a['scale'],h.get('rotation',0))
 for projectile in state['projectiles']:item(bg,projectile['x'],projectile['y'],projectile['scale'],projectile['angle'])
 for a in p['officers']:
  d=ImageDraw.Draw(bg);d.ellipse((a['x']-46,a['y']-6,a['x']+46,a['y']+10),fill='#171320');sprite(bg,oatlas,police['officer'],a)
 d=ImageDraw.Draw(bg);d.rectangle((14,10,700,38),fill='#101927');d.text((23,15),'LA TROLINA / INTERVENCION DE POLICIA LOCAL',font=font,fill='#a8e3ff')
 if p['state']!='idle':
  d.rectangle((172,54,788,102),fill='#071828',outline='#77c7ff',width=1)
  text=unicodedata.normalize('NFKD',state['label'].upper()).encode('ascii','ignore').decode();box=d.textbbox((0,0),text,font=font);d.text(((960-(box[2]-box[0]))/2,70),text,font=font,fill='#a8e3ff')
 d.rectangle((15,510,685,533),fill='#101927');d.text((23,515),'INCIDENTES '+str(min(p['incidents'],5))+'/5  ·  '+('COMBATE BLOQUEADO' if p['blocked'] else 'PELEA EN CURSO'),font=small,fill='#9ed6ff')
 frames.append(bg.convert('RGB'))
# Include officer blue and patrol lime in the common GIF palette.
board=Image.new('RGB',(1280,1080),'#101927');board.paste(frames[0],(0,0));board.paste(catlas.crop((320,0,640,160)).convert('RGB').resize((640,320),Image.Resampling.NEAREST),(0,540));board.paste(oatlas.crop((576,352,768,528)).convert('RGB').resize((384,352),Image.Resampling.NEAREST),(700,540))
palette=board.quantize(colors=256)
quantized=[frame.quantize(palette=palette,dither=Image.Dither.NONE) for frame in frames]
quantized[0].save(ROOT/'police-intervention.gif',save_all=True,append_images=quantized[1:],duration=100,loop=0,optimize=True,disposal=1)
selected=next(i for i,s in enumerate(states) if s['police']['state']=='stopping' and s['police']['officers'][0]['frame']==3)
frames[selected].save(ROOT/'assets/police/intervention-preview.png')
# A sprite reference sheet for importing the independent animations.
contact=Image.new('RGB',(1152,940),'#142133');draw=ImageDraw.Draw(contact)
for row,title in enumerate(['IDLE / ESPERA','WALK / CAMINAR','STOP / ALTO','RADIO / COMUNICAR']):
 y=row*185;draw.text((15,y+5),title,font=small,fill='#a8e3ff')
 for col in range(6):
  pose=oatlas.crop((col*192,row*176,(col+1)*192,(row+1)*176));contact.paste(pose,(col*192,y+18),pose)
draw.text((15,754),'PATRULLA / 4 ESTADOS DE LUZ AZUL',font=small,fill='#a8e3ff')
for col in range(4):
 im=catlas.crop((col*320,0,(col+1)*320,160)).resize((288,144),Image.Resampling.NEAREST);contact.paste(im,(col*288,780),im)
contact.save(ROOT/'assets/police/sprites-guide.png')
print('Rendered police-intervention.gif and police asset previews')
