/* Shared weapon: no character name, portrait, sprite row or identity is hard-coded. */
class BottleAttack {
  // Returns a separate data object. Existing animation coordinates are preserved.
  static install(data,{sourceAnimation,releaseFrame=3,sockets}={}){
    const copy=JSON.parse(JSON.stringify(data));
    const source=sourceAnimation||(copy.animations.throwBottle?'throwBottle':'punch');
    if(!copy.animations[source])throw new Error('Provide a throw or punch animation for this character');
    const anim=JSON.parse(JSON.stringify(copy.animations[source]));
    if(releaseFrame<0||releaseFrame>=anim.frames.length)throw new Error('Invalid bottle release frame');
    anim.loop=false;anim.next='idle';
    const a=copy.anchor;
    anim.frames.forEach((f,i)=>{
      const previous=(f.events||[]).find(e=>e.type==='spawn-projectile'&&e.weapon==='bottle');
      f.hitboxes=[];f.events=(f.events||[]).filter(e=>!(e.type==='spawn-projectile'&&e.weapon==='bottle'));
      const socket=sockets?.[i]||f.itemSocket||previous?.socket||{x:a.x+75,y:a.y-112,rotation:0};
      if(i<releaseFrame)f.itemSocket={...socket};else delete f.itemSocket;
      if(i===releaseFrame)f.events.push({type:'spawn-projectile',weapon:'bottle',socket:{...socket}});
    });
    copy.animations.throwBottle=anim;return copy;
  }
}

class BottleSystem {
  constructor(image,config,{groundY=440,minX=-80,maxX=1040,onHit=()=>{}}={}){
    Object.assign(this,{image,config,groundY,minX,maxX,onHit});
    this.projectiles=[];this.impacts=[];this.clock=0;this.lastThrow=new WeakMap();this.nextId=1;
  }
  throw(actor,{force=false}={}){
    if(!force&&this.clock-(this.lastThrow.get(actor)??-Infinity)<this.config.cooldownMs)return false;
    if(!actor.play('throwBottle',force))return false;
    this.lastThrow.set(actor,this.clock);return true;
  }
  reset(){this.projectiles=[];this.impacts=[];}
  update(deltaMs,actors=[],targets=[]){
    const dt=Math.max(0,deltaMs);this.clock+=dt;
    for(const effect of this.impacts)effect.age+=dt;
    this.impacts=this.impacts.filter(e=>e.age<300);
    for(const p of this.projectiles)this.advance(p,dt,targets);
    for(const actor of actors){
      // This queue is deliberately retained for other weapon/event handlers.
      const remaining=[];
      for(const event of actor.drainEvents()){
        if(event.type!=='spawn-projectile'||event.weapon!=='bottle'){remaining.push(event);continue;}
        const c=this.config;
        const p={id:this.nextId++,owner:actor,x:event.x,y:event.y,vx:c.speed*event.scale*event.facing,
          vy:c.upwardSpeed*event.scale,gravity:c.gravity*event.scale,scale:event.scale,
          facing:event.facing,angle:(event.socket?.rotation||0)*event.facing,age:0,alive:true,radius:c.radius*event.scale};
        this.projectiles.push(p);this.advance(p,event.lagMs||0,targets);
      }
      actor.events.push(...remaining);
    }
    this.projectiles=this.projectiles.filter(p=>p.alive);
  }
  advance(p,deltaMs,targets){
    // Short physics steps plus swept collision keep fast projectiles from skipping a target.
    let remaining=deltaMs;
    while(p.alive&&remaining>0){
      const ms=Math.min(remaining,16),s=ms/1000;remaining-=ms;
      const ax=p.x,ay=p.y;p.x+=p.vx*s;p.y+=p.vy*s+.5*p.gravity*s*s;p.vy+=p.gravity*s;
      p.angle+=this.config.spin*p.facing*s;p.age+=ms;
      let nearest=null,tHit=Infinity;
      for(const target of targets){
        if(target===p.owner||target.actor===p.owner||target.enabled===false)continue;
        const box=target.getHurtbox?target.getHurtbox():target.rect;
        if(!box)continue;
        const t=BottleSystem.segmentBox(ax,ay,p.x,p.y,box,p.radius);
        if(t!==null&&t<tHit){nearest=target;tHit=t;}
      }
      const floor=this.groundY-p.radius;
      const floorT=p.y>=floor?(ay>=floor?0:(floor-ay)/(p.y-ay)):Infinity;
      if(nearest&&tHit<=floorT){
        p.x=ax+(p.x-ax)*tHit;p.y=ay+(p.y-ay)*tHit;this.breakBottle(p);
        this.onHit({owner:p.owner,target:nearest,damage:this.config.damage,projectileId:p.id});
      }else if(floorT!==Infinity){p.x=ax+(p.x-ax)*floorT;p.y=floor;this.breakBottle(p);}
      else if(p.age>this.config.maxAgeMs||p.x<this.minX||p.x>this.maxX)p.alive=false;
    }
  }
  static segmentBox(ax,ay,bx,by,b,r){
    let low=0,high=1;
    for(const [start,delta,min,max] of [[ax,bx-ax,b.x-r,b.x+b.w+r],[ay,by-ay,b.y-r,b.y+b.h+r]]){
      if(Math.abs(delta)<1e-9){if(start<min||start>max)return null;continue;}
      let a=(min-start)/delta,z=(max-start)/delta;if(a>z)[a,z]=[z,a];
      low=Math.max(low,a);high=Math.min(high,z);if(low>high)return null;
    }return low;
  }
  breakBottle(p){p.alive=false;this.impacts.push({x:p.x,y:p.y,scale:p.scale,age:0});}
  drawItem(ctx,x,y,scale,angle=0,facing=1){
    const c=this.config;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));
    ctx.scale(scale*facing,scale);ctx.rotate(angle);ctx.drawImage(this.image,-c.grip.x,-c.grip.y,c.width,c.height);ctx.restore();
  }
  draw(ctx,actors=[],debug=false){
    for(const actor of actors){
      if(actor.animation!=='throwBottle'||!actor.frame.itemSocket)continue;
      const socket=actor.frame.itemSocket,p=actor.worldPoint(socket);
      this.drawItem(ctx,p.x,p.y,actor.scale,socket.rotation||0,actor.facing);
    }
    for(const p of this.projectiles){
      this.drawItem(ctx,p.x,p.y,p.scale,p.angle,1);
      if(debug){ctx.strokeStyle='#ff695f';ctx.strokeRect(p.x-p.radius,p.y-p.radius,p.radius*2,p.radius*2);}
    }
    for(const effect of this.impacts){
      const t=effect.age/300;ctx.save();ctx.globalAlpha=1-t;
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4;const radius=(4+24*t)*effect.scale;
        ctx.fillStyle=i%2?'#f7d48b':'#a66b2c';
        ctx.fillRect(Math.round(effect.x+Math.cos(angle)*radius),Math.round(effect.y+Math.sin(angle)*radius+12*t*t),Math.max(2,3*effect.scale),Math.max(2,2*effect.scale));
      }ctx.restore();
    }
  }
}
window.BottleAttack=BottleAttack;window.BottleSystem=BottleSystem;
