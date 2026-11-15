const path=require('path');const ROOT=path.resolve(__dirname,'..');process.chdir(ROOT);
const fs=require('fs'),vm=require('vm');const s={window:{}};vm.createContext(s);
for(const file of ['fighter','bottle'])vm.runInContext(fs.readFileSync('src/'+file+'.js','utf8'),s);
const d=JSON.parse(fs.readFileSync('assets/fighter.json')),c=JSON.parse(fs.readFileSync('assets/bottle.json'));
const f=new s.window.Fighter({},s.window.BottleAttack.install(d),{x:280,y:486,scale:2});
const sys=new s.window.BottleSystem({},c,{groundY:486,minX:-60,maxX:1040});
const dummy=new s.window.Fighter({},s.window.BottleAttack.install(d),{x:710,y:486,scale:2,facing:-1});const frames=[];
const moves=[[0,'idle'],[500,'throwBottle'],[2350,'punch'],[3200,'kick']];let index=0;
for(let t=0;t<4400;t+=50){
 if(index<moves.length&&t>=moves[index][0]){const name=moves[index++][1];name==='throwBottle'?sys.throw(f,{force:true}):f.play(name,true);}
 if(t>0){f.update(50);dummy.update(50);sys.update(50,[f],[dummy]);}
 frames.push({opponentFrame:dummy.frameIndex,animation:f.animation,frame:f.frameIndex,held:f.animation==='throwBottle'?f.frame.itemSocket:null,
 projectiles:sys.projectiles.map(p=>({x:p.x,y:p.y,angle:p.angle,scale:p.scale})),impacts:sys.impacts.map(p=>({...p}))});
}
fs.mkdirSync('build',{recursive:true});
fs.writeFileSync('build/preview-states.json',JSON.stringify(frames));
