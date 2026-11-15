/* Canvas 2D. No dependencies. Coordinates refer to the supporting foot. */
class Fighter {
  constructor(image, data, {x=240, y=440, scale=2.5, facing=1}={}) {
    Object.assign(this,{image,data,x,y,scale,facing});
    this.animation='idle'; this.frameIndex=0; this.elapsed=0;
    this.completed=0;this.actionId=0;this.events=[];
  }
  play(name, force=false) {
    if (!this.data.animations[name]) throw new Error('Unknown animation: '+name);
    if (!force && this.animation!=='idle') return false;
    this.animation=name; this.frameIndex=0; this.elapsed=0;this.actionId++;this.events=[];
    this.emitFrameEvents(0);return true;
  }
  get frame(){ return this.data.animations[this.animation].frames[this.frameIndex]; }
  update(deltaMs) {
    this.elapsed+=Math.max(0, deltaMs);
    while(this.elapsed>=this.frame.duration){
      this.elapsed-=this.frame.duration;
      const anim=this.data.animations[this.animation];
      if(this.frameIndex+1<anim.frames.length) this.frameIndex++;
      else if(anim.loop) this.frameIndex=0;
      else {this.completed++;this.animation=anim.next||'idle';this.frameIndex=0;}
      this.emitFrameEvents(this.elapsed);
    }
  }
  worldPoint(point){
    const a=this.data.anchor;
    return {x:this.x+(point.x-a.x)*this.scale*this.facing,y:this.y+(point.y-a.y)*this.scale};
  }
  emitFrameEvents(lagMs){
    for(const event of this.frame.events||[]){
      const point=this.worldPoint(event.socket||this.data.anchor);
      this.events.push({...event,...point,owner:this,actionId:this.actionId,facing:this.facing,scale:this.scale,lagMs});
    }
  }
  drainEvents(){const result=this.events;this.events=[];return result;}
  worldBox(box){
    const a=this.data.anchor,s=this.scale;
    return {x:this.x+(this.facing===1?box.x-a.x:a.x-box.x-box.w)*s,
      y:this.y+(box.y-a.y)*s,w:box.w*s,h:box.h*s};
  }
  getHitboxes(){return this.frame.hitboxes.map(b=>this.worldBox(b));}
  getHurtbox(){return this.worldBox(this.frame.hurtbox);}
  draw(ctx,debug=false){
    const f=this.frame,a=this.data.anchor;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.translate(Math.round(this.x),Math.round(this.y));ctx.scale(this.scale*this.facing,this.scale);
    ctx.drawImage(this.image,f.x,f.y,f.w,f.h,-a.x,-a.y,f.w,f.h);ctx.restore();
    if(debug){
      const body=this.getHurtbox();ctx.fillStyle='#3fe2ff22';ctx.strokeStyle='#3fe2ff';
      ctx.fillRect(body.x,body.y,body.w,body.h);ctx.strokeRect(body.x,body.y,body.w,body.h);
      for(const b of this.getHitboxes()){ctx.fillStyle='#ff695f55';ctx.strokeStyle='#ff695f';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeRect(b.x,b.y,b.w,b.h);}
      ctx.fillStyle='#fff';ctx.fillRect(this.x-4,this.y-1,8,2);ctx.fillRect(this.x-1,this.y-4,2,8);
    }
  }
}
window.Fighter=Fighter;
