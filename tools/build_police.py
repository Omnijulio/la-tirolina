from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects
import numpy as np
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/police';(OUT/'frames').mkdir(parents=True,exist_ok=True)
src=Image.open(ROOT/'source-art/police-officer.png').convert('RGBA');arr=np.array(src);lab,_=label(arr[:,:,3]>100)
boxes=[]
for i,s in enumerate(find_objects(lab)):
 if s and (lab[s]==i+1).sum()>2500:boxes.append((s[1].start,s[0].start,s[1].stop,s[0].stop))
rows=[sorted([b for b in boxes if r*256<=b[1]<(r+1)*256]) for r in range(4)]
assert all(len(row)==6 for row in rows)
atlas=Image.new('RGBA',(1152,704));names=['idle','walk','stop','radio']
officer={'name':'Agente de Policia Local','image':'assets/police/officer.png','frameWidth':192,'frameHeight':176,'columns':6,'rows':4,'anchor':{'x':80,'y':160},'facing':'right','animations':{}}
times=[[170]*6,[100]*6,[100,100,100,180,220,140],[100,100,180,240,100,140]]
for r,row in enumerate(rows):
 frames=[]
 for c,(x0,y0,x1,y1) in enumerate(row):
  crop=src.crop((x0-2,y0-2,x1+2,y1+2));pix=np.array(crop);pix[pix[:,:,3]<32]=0;crop=Image.fromarray(pix)
  crop=crop.resize((round(crop.width*.6),round(crop.height*.6)),Image.Resampling.NEAREST)
  frame=Image.new('RGBA',(192,176));frame.paste(crop,(round(80-(143+c*256-x0+2)*.6),round(160-(y1-y0+2)*.6)))
  assert frame.getbbox()[0]>0 and frame.getbbox()[1]>0 and frame.getbbox()[2]<192 and frame.getbbox()[3]<=162
  frame.save(OUT/f'frames/{names[r]}-{c:02}.png');atlas.paste(frame,(c*192,r*176))
  frames.append({'x':c*192,'y':r*176,'w':192,'h':176,'duration':times[r][c],'hitboxes':[],'hurtbox':{'x':49,'y':18,'w':65,'h':142}})
 officer['animations'][names[r]]={'loop':r in [0,1],'next':'hold' if r==2 else 'idle','frames':frames}
officer['animations']['hold']={'loop':True,'next':'hold','frames':[{**officer['animations']['stop']['frames'][3],'duration':200}]}
atlas.save(OUT/'officer.png',optimize=True)
source=Image.open(ROOT/'source-art/police-patrol.png').convert('RGBA');bb=source.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox()
car=source.crop(bb).resize((288,137),Image.Resampling.NEAREST);base=Image.new('RGBA',(320,160));base.paste(car,(16,11));base.save(OUT/'patrol.png')
car_atlas=Image.new('RGBA',(1280,160));vehicle_frames=[]
for i in range(4):
 frame=base.copy();d=ImageDraw.Draw(frame)
 if i==1:d.rectangle((155,13,183,17),fill='#a2faff');d.rectangle((156,14,182,15),fill='#ffffff')
 if i==3:d.rectangle((188,13,217,17),fill='#a2faff');d.rectangle((189,14,216,15),fill='#ffffff')
 frame.save(OUT/f'frames/patrol-{i:02}.png');car_atlas.paste(frame,(i*320,0));vehicle_frames.append({'x':i*320,'y':0,'w':320,'h':160,'duration':200})
car_atlas.save(OUT/'patrol-lights.png',optimize=True)
config={'version':'1.4','officer':officer,'patrol':{'image':'assets/police/patrol-lights.png','frameWidth':320,'frameHeight':160,'anchor':{'x':160,'y':148},'frames':vehicle_frames,'facing':'left'},
 'settings':{'incidentThreshold':5,'weights':{'punch':1,'kick':1,'throwBottle':2},'fightTimeoutMs':20000,'warningMs':1200,'arrivalMs':2200,'deployMs':2600,'stopMs':1600,'radioMs':1800,'groundY':486,'officerScale':2,'officerSpawnX':[930,1050],'officerTargetX':[450,550],'patrolStartX':1300,'patrolTargetX':780,'patrolGroundY':426,'patrolScale':1.6},
 'states':['idle','warning','arriving','deploying','stopping','radio','resolved'],'units':'View-world pixels for a 960x540 canvas; time in milliseconds. Stage camera transform is applied by the caller.'}
if (OUT/'police.json').exists():
 previous=json.loads((OUT/'police.json').read_text(encoding='utf-8'))
 config['settings'].update(previous.get('settings',{}))
(OUT/'police.json').write_text(json.dumps(config,indent=2,ensure_ascii=False),encoding='utf-8')
(OUT/'police-data.js').write_text('window.POLICE_DATA = '+json.dumps(config,separators=(',',':'),ensure_ascii=False)+';\n',encoding='utf-8')
print('Police assets: 24 officer frames, 4 patrol light frames, two atlases, metadata')
