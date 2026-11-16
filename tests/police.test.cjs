const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),scope={window:{}};vm.createContext(scope);
for(const file of ['fighter','police'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),scope);
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/police/police.json'),'utf8'));
function make(callbacks={}){return new scope.window.PoliceIntervention({officer:{},patrol:{}},data,callbacks);}
{
 const p=make();p.update(100000);assert.equal(p.state,'idle');assert.equal(p.incidents,0);
 assert.equal(p.notifyAction('idle'),false);assert.equal(p.notifyAction('unknown'),false);
 p.notifyAction('throwBottle');p.notifyAction('punch');assert.equal(p.incidents,3);assert.equal(p.state,'idle');
 p.notifyAction('throwBottle');assert.equal(p.state,'warning');assert.equal(p.reason,'incidents');
 assert.equal(p.trigger(),false);p.notifyAction('punch');assert.equal(p.incidents,5);
}
{
 let stopped=0,resolved=0;const states=[];
 const p=make({onStop:()=>stopped++,onResolved:()=>resolved++,onStateChange:e=>states.push(e.state)});
 p.trigger();assert.equal(p.blocksCombat,false);p.update(1200);assert.equal(p.state,'arriving');
 assert.equal(p.snapshot().patrol.x,1300);p.update(2200);assert.equal(p.state,'deploying');assert.equal(p.officers.length,2);
 p.update(1300);assert.ok(p.officers[0].x<930&&p.officers[0].x>450);assert.equal(p.officers[0].animation,'walk');
 p.update(1300);assert.equal(p.state,'stopping');assert.equal(p.blocksCombat,true);assert.equal(stopped,1);
 assert.deepEqual(p.officers.map(a=>a.x),[450,550]);assert.equal(p.officers[0].facing,-1);assert.equal(p.officers[1].facing,1);
 p.update(1600);assert.equal(p.state,'radio');p.update(1800);assert.equal(p.state,'resolved');assert.equal(resolved,1);
 p.update(999999);assert.equal(stopped,1);assert.equal(resolved,1);
 assert.deepEqual(states,['warning','arriving','deploying','stopping','radio','resolved']);
 p.reset();assert.equal(p.state,'idle');assert.equal(p.blocksCombat,false);assert.equal(p.officers.length,0);assert.equal(p.snapshot().patrol,null);
}
{
 const p=make();p.notifyAction('punch');p.update(19999);assert.equal(p.state,'idle');p.update(1);assert.equal(p.state,'warning');assert.equal(p.reason,'timeout');
 const manual=make();manual.automatic=false;for(let i=0;i<10;i++)manual.notifyAction('kick');manual.update(99999);assert.equal(manual.state,'idle');assert.equal(manual.trigger(),true);
}
{
 const coarse=make(),fine=make();coarse.trigger();fine.trigger();coarse.update(7300);for(let i=0;i<73;i++)fine.update(100);
 assert.equal(coarse.state,fine.state);assert.equal(coarse.elapsed,fine.elapsed);
 for(let i=0;i<2;i++){assert.equal(coarse.officers[i].x,fine.officers[i].x);assert.equal(coarse.officers[i].frameIndex,fine.officers[i].frameIndex);}
 const calls=[];const ctx=new Proxy({canvas:{width:960,height:540}},{get:(o,k)=>o[k]||((...a)=>calls.push(k))});
 coarse.drawBack(ctx,{flashes:false});coarse.drawFront(ctx);coarse.drawOverlay(ctx,{flashes:false});assert.ok(calls.includes('drawImage'));
}
console.log('PASS: incident weights, timeout after activity, manual mode, ordered phases, one stop/resolution, moving agents, combat lock, reset, large delta equivalence and rendering.');
