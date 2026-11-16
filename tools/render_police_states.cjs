const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),scope={window:{}};vm.createContext(scope);
for(const name of ['fighter','bottle','police'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),scope);
const fighterData=JSON.parse(fs.readFileSync(path.join(root,'assets/fighter.json'))),bottleData=JSON.parse(fs.readFileSync(path.join(root,'assets/bottle.json'))),policeData=JSON.parse(fs.readFileSync(path.join(root,'assets/police/police.json')));
const f=new scope.window.Fighter({},scope.window.BottleAttack.install(fighterData),{x:280,y:486,scale:2});
const other=new scope.window.Fighter({},scope.window.BottleAttack.install(fighterData),{x:710,y:486,scale:2,facing:-1});
const bottles=new scope.window.BottleSystem({},bottleData,{groundY:486,minX:-80,maxX:1040});
const police=new scope.window.PoliceIntervention({officer:{},patrol:{}},policeData,{onStop:()=>{f.play('idle',true);other.play('idle',true);bottles.reset();}});
const actor=a=>({x:a.x,y:a.y,scale:a.scale,facing:a.facing,animation:a.animation,frame:a.frameIndex,held:a.animation==='throwBottle'?a.frame.itemSocket:null});
const frames=[];let next=0,index=0;
for(let time=0;time<=12800;time+=100){
 if(time>=next&&!police.blocksCombat){const move=['punch','kick','throwBottle'][index++%3];f.play(move,true);police.notifyAction(move);next+=700;}
 if(time>0){police.update(100);f.update(100);other.update(100);bottles.update(100,[f],[other]);}
 frames.push({time,players:[actor(f),actor(other)],police:police.snapshot(),label:police.getStatus().label,
 projectiles:bottles.projectiles.map(p=>({x:p.x,y:p.y,angle:p.angle,scale:p.scale})),impacts:bottles.impacts.map(p=>({...p}))});
}
fs.mkdirSync(path.join(root,'build'),{recursive:true});fs.writeFileSync(path.join(root,'build/police-states.json'),JSON.stringify(frames));
