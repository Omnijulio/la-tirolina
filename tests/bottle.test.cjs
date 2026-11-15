const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),scope={window:{}};vm.createContext(scope);
for(const file of ['src/fighter.js','src/bottle.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),scope);
const {Fighter,BottleAttack,BottleSystem}=scope.window;
const original=JSON.parse(fs.readFileSync(path.join(root,'assets/fighter.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(root,'assets/bottle.json'),'utf8'));
const makeActor=(data=original,opts={})=>new Fighter({},BottleAttack.install(data),{x:330,y:440,scale:2.5,...opts});
const makeSystem=opts=>new BottleSystem({},config,{minX:-10000,maxX:10000,...opts});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
{
 const actor=makeActor(),system=makeSystem();assert.equal(system.throw(actor),true);
 actor.update(289);system.update(289,[actor]);assert.equal(system.projectiles.length,0);
 actor.update(1);system.update(1,[actor]);assert.equal(system.projectiles.length,1);
 actor.update(330);system.update(330,[actor]);assert.equal(actor.animation,'idle');assert.equal(system.projectiles.length,1);
 assert.equal(system.throw(actor),false);system.update(380);assert.equal(system.throw(actor),true);
}
{
 const large=makeActor(),fine=makeActor(),a=makeSystem(),b=makeSystem();a.throw(large);b.throw(fine);
 large.update(800);a.update(800,[large]);
 for(let i=0;i<50;i++){fine.update(16);b.update(16,[fine]);}
 assert.equal(a.projectiles.length,1);assert.equal(b.projectiles.length,1);
 for(const key of ['x','y','vy','age','angle'])near(a.projectiles[0][key],b.projectiles[0][key]);
}
{
 const other=JSON.parse(JSON.stringify(original));other.name='Otro personaje';other.anchor={x:48,y:152};delete other.animations.throwBottle;
 const actor=makeActor(other,{scale:1,facing:-1}),system=makeSystem();
 assert.equal(other.animations.throwBottle,undefined);system.throw(actor);actor.update(300);system.update(300,[actor]);
 assert.equal(system.projectiles.length,1);assert.ok(system.projectiles[0].vx<0);
 assert.equal(actor.data.animations.throwBottle.frames.length,other.animations.punch.frames.length);
}
{
 const left=makeActor(),right=makeActor(original,{x:650,facing:-1}),system=makeSystem();
 assert.equal(system.throw(left),true);assert.equal(system.throw(right),true);
 left.update(290);right.update(290);system.update(290,[left,right]);assert.equal(system.projectiles.length,2);
 assert.equal(system.projectiles[0].owner,left);assert.equal(system.projectiles[1].owner,right);
}
{
 let hits=0;const actor=makeActor(),system=makeSystem({onHit:event=>{hits++;assert.equal(event.owner,actor);assert.equal(event.damage,10);}});
 system.throw(actor);actor.update(290);system.update(290,[actor],[actor]);
 const p=system.projectiles[0],target={rect:{x:p.x+90,y:-10000,w:1,h:20000}};
 system.update(600,[],[actor,target]);system.update(600,[],[target]);assert.equal(hits,1);assert.equal(system.projectiles.length,0);
}
{
 const actor=makeActor(),system=makeSystem();system.throw(actor);actor.update(100);actor.play('kick',true);
 actor.update(600);system.update(700,[actor]);assert.equal(system.projectiles.length,0);
 actor.play('idle',true);system.throw(actor,{force:true});actor.update(300);system.update(300,[actor]);
 system.update(1700);assert.equal(system.projectiles.length,0);assert.ok(system.impacts.length>0);
}
{
 const actor=makeActor(),system=makeSystem();
 for(const [name,total] of [['punch',465],['kick',585]]){actor.play(name,true);actor.update(total);assert.equal(actor.animation,'idle');assert.equal(actor.getHitboxes().length,0);}
 const ctx=new Proxy({},{get:(object,key)=>object[key]||(()=>{})});actor.draw(ctx,true);system.draw(ctx,[actor],true);
}
console.log('PASS: release timing, one spawn, lag compensation, independent cooldowns, fallback for another character, both directions, swept collision, owner immunity, one hit, cancellation, floor break, existing attacks.');
