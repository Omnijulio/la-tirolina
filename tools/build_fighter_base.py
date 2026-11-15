from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import label, find_objects
import numpy as np
import json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT
source=Image.open(ROOT/'source-art/fighter-base.png').convert('RGBA')
arr=np.asarray(source)
labels,n=label(arr[:,:,3]>100)
boxes=[]
for i,s in enumerate(find_objects(labels)):
    if s and (labels[s]==i+1).sum()>4000:
        boxes.append((s[1].start,s[0].start,s[1].stop,s[0].stop))
rows=[sorted([b for b in boxes if lo<=b[1]<hi]) for lo,hi in [(0,340),(340,680),(680,1024)]]
assert all(len(row)==6 for row in rows)
names=['idle','punch','kick']
timings=[[150]*6,[60,80,45,100,80,100],[70,100,65,140,100,110]]
atlas=Image.new('RGBA',(192*6,176*3))
data={'name':'El Barbas','image':'assets/fighter.png','frameWidth':192,'frameHeight':176,'columns':6,'rows':3,'anchor':{'x':56,'y':160},'facing':'right','units':'pixels; origin top-left of frame; anchor at supporting rear foot','animations':{}}
allframes={}
for r,row in enumerate(rows):
    frames=[]
    for c,(x0,y0,x1,y1) in enumerate(row):
        feet=np.where(arr[y1-8:y1,x0:x1,3]>100)[1]+x0
        occupied=np.unique(feet)
        groups=np.split(occupied,np.where(np.diff(occupied)>10)[0]+1)
        support=int(round((groups[0].min()+groups[0].max())/2))
        canvas=Image.new('RGBA',(384,352))
        crop=source.crop((x0-2,y0-2,x1+2,y1+2))
        canvas.paste(crop,(112-(support-(x0-2)),320-(y1-(y0-2))))
        frame=canvas.resize((192,176),Image.Resampling.NEAREST)
        assert frame.getbbox()[2]<192 and frame.getbbox()[3]<=162
        frame.save(OUT/f'assets/frames/{names[r]}-{c:02}.png')
        atlas.paste(frame,(c*192,r*176))
        allframes[(r,c)]=frame
        entry={'x':c*192,'y':r*176,'w':192,'h':176,'duration':timings[r][c],'hurtbox':{'x':45,'y':21,'w':63,'h':139},'hitboxes':[]}
        if c==3 and r==1:entry['hitboxes']=[{'x':123,'y':48,'w':30,'h':21}]
        if c==3 and r==2:entry['hitboxes']=[{'x':139,'y':51,'w':42,'h':24}]
        frames.append(entry)
    data['animations'][names[r]]={'loop':r==0,'next':'idle','frames':frames}
atlas.save(OUT/'assets/fighter.png',optimize=True)
(OUT/'assets/fighter.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
(OUT/'assets/fighter-data.js').write_text('window.FIGHTER_DATA = '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')

print("Rebuilt 18 base fighter frames")
