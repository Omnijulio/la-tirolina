from pathlib import Path
from PIL import Image
from scipy.ndimage import label, find_objects
import numpy as np
import json

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT
src=Image.open(ROOT/'source-art/fighter-throw.png').convert('RGBA')
arr=np.array(src);lab,_=label(arr[:,:,3]>100)
boxes=[]
for i,s in enumerate(find_objects(lab)):
    if s and (lab[s]==i+1).sum()>4000:boxes.append((s[1].start,s[0].start,s[1].stop,s[0].stop))
boxes=sorted([b for b in boxes if b[1]<512])+sorted([b for b in boxes if b[1]>=512])
assert len(boxes)==6
old=Image.open(OUT/'assets/fighter.png');atlas=Image.new('RGBA',(1152,704));atlas.paste(old.crop((0,0,1152,528)),(0,0))
data=json.loads((OUT/'assets/fighter.json').read_text());data['rows']=4
handpoints=[(336,167,0),(665,163,-0.5),(1186,76,-0.8),(420,648,0.8),(915,724,1.1),(1358,680,0)]
frames=[]
for i,(x0,y0,x1,y1) in enumerate(boxes):
    feet=np.unique(np.where(arr[y1-12:y1,x0:x1,3]>100)[1]+x0)
    groups=np.split(feet,np.where(np.diff(feet)>15)[0]+1)
    support=int(round((groups[0].min()+groups[0].max())/2))
    factor=5/16
    crop=src.crop((x0-2,y0-2,x1+2,y1+2))
    crop=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.NEAREST)
    frame=Image.new('RGBA',(192,176))
    frame.paste(crop,(round(56-(support-x0+2)*factor),round(160-(y1-y0+2)*factor)))
    assert frame.getbbox()[0]>0 and frame.getbbox()[1]>0 and frame.getbbox()[2]<192
    frame.save(OUT/f'assets/frames/throwBottle-{i:02}.png')
    atlas.paste(frame,(i*192,528))
    hx,hy,angle=handpoints[i]
    socket={'x':round(56+(hx-support)*factor),'y':round(160+(hy-y1)*factor),'rotation':angle}
    f={'x':i*192,'y':528,'w':192,'h':176,'duration':[80,110,100,80,120,130][i],
       'hurtbox':{'x':45,'y':21,'w':63,'h':139},'hitboxes':[]}
    if i<3:f['itemSocket']=socket
    if i==3:f['events']=[{'type':'spawn-projectile','weapon':'bottle','socket':socket}]
    frames.append(f)
data['animations']['throwBottle']={'loop':False,'next':'idle','frames':frames}
atlas.save(OUT/'assets/fighter.png',optimize=True)
(OUT/'assets/fighter.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
(OUT/'assets/fighter-data.js').write_text('window.FIGHTER_DATA = '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')

print("Rebuilt throw animation; atlas now has 24 frames")
