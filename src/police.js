/* Local police intervention. Uses supplied artwork and callbacks; no DOM or audio dependency. */
class PoliceIntervention {
  constructor(images,data,{onStateChange=()=>{},onStop=()=>{},onResolved=()=>{},onReset=()=>{}}={}){
    Object.assign(this,{images,data,onStateChange,onStop,onResolved,onReset});
    this.automatic=true;this.officers=[];this.clock=0;this.state='idle';this.elapsed=0;
    this.incidents=0;this.fightElapsed=0;this.fightStarted=false;this.reason=null;
  }
  get active(){return this.state!=='idle';}
  get blocksCombat(){return ['stopping','radio','resolved'].includes(this.state);}
  notifyAction(action){
    if(this.state!=='idle')return false;
    const weight=this.data.settings.weights[action]||0;if(weight<=0)return false;
    this.fightStarted=true;this.incidents+=weight;
    if(this.automatic&&this.incidents>=this.data.settings.incidentThreshold)this.trigger('incidents');
    return true;
  }
  trigger(reason='manual'){
    if(this.state!=='idle')return false;
    this.reason=reason;this.setState('warning');return true;
  }
  reset(){
    this.state='idle';this.elapsed=0;this.incidents=0;this.fightElapsed=0;
    this.fightStarted=false;this.reason=null;this.officers=[];this.clock=0;this.onReset();
  }
  setState(state){
    const previous=this.state;this.state=state;this.elapsed=0;const c=this.data.settings;
    if(state==='deploying'){
      this.officers=c.officerSpawnX.map((x,i)=>new window.Fighter(this.images.officer,this.data.officer,
        {x,y:c.groundY,scale:c.officerScale,facing:-1}));
      for(const actor of this.officers)actor.play('walk',true);
    }
    if(state==='stopping'){
      this.officers.forEach((actor,i)=>{actor.x=c.officerTargetX[i];actor.facing=i===0?-1:1;actor.play('stop',true);});
      this.onStop({reason:this.reason});
    }
    if(state==='radio')for(const actor of this.officers)actor.play('radio',true);
    if(state==='resolved'){
      for(const actor of this.officers)actor.play('hold',true);
      this.onResolved({reason:this.reason});
    }
    this.onStateChange({state,previous,reason:this.reason});
  }
  duration(){
    const c=this.data.settings;
    return ({warning:c.warningMs,arriving:c.arrivalMs,deploying:c.deployMs,stopping:c.stopMs,radio:c.radioMs})[this.state]??Infinity;
  }
  update(deltaMs){
    let remaining=Number.isFinite(deltaMs)?Math.max(0,deltaMs):0;
    while(remaining>0){
      if(this.state==='idle'){
        const c=this.data.settings;
        if(this.automatic&&this.fightStarted&&this.incidents>=c.incidentThreshold){this.trigger('incidents');continue;}
        const until=this.automatic&&this.fightStarted?Math.max(0,c.fightTimeoutMs-this.fightElapsed):Infinity;
        if(remaining>=until){this.clock+=until;this.fightElapsed+=until;remaining-=until;this.trigger('timeout');continue;}
        this.clock+=remaining;if(this.fightStarted)this.fightElapsed+=remaining;break;
      }
      const step=Math.min(remaining,this.duration()-this.elapsed);
      this.clock+=step;this.elapsed+=step;remaining-=step;
      for(const actor of this.officers)actor.update(step);
      if(this.state==='deploying'){
        const c=this.data.settings,t=Math.min(1,this.elapsed/c.deployMs);
        this.officers.forEach((actor,i)=>{actor.x=c.officerSpawnX[i]+(c.officerTargetX[i]-c.officerSpawnX[i])*t;});
      }
      if(this.elapsed>=this.duration()){
        const next={warning:'arriving',arriving:'deploying',deploying:'stopping',stopping:'radio',radio:'resolved'}[this.state];
        if(next)this.setState(next);
      }
    }
  }
  snapshot(){
    const c=this.data.settings;
    let patrol=null;
    if(!['idle','warning'].includes(this.state)){
      const t=this.state==='arriving'?Math.min(1,this.elapsed/c.arrivalMs):1;
      const eased=1-(1-t)**3;
      patrol={x:c.patrolStartX+(c.patrolTargetX-c.patrolStartX)*eased,y:c.patrolGroundY,scale:c.patrolScale,
        frame:Math.floor(this.clock/200)%this.data.patrol.frames.length};
    }
    return {state:this.state,clock:this.clock,incidents:this.incidents,blocked:this.blocksCombat,patrol,
      officers:this.officers.map(a=>({x:a.x,y:a.y,scale:a.scale,facing:a.facing,animation:a.animation,frame:a.frameIndex}))};
  }
  getStatus(){
    const labels={idle:'Sin intervención',warning:'Aviso: se acerca la policía',arriving:'Llega el patrulla',
      deploying:'Los agentes entran',stopping:'¡Alto! Se acabó la pelea',radio:'Comunicando por radio',resolved:'Pelea interrumpida'};
    return {state:this.state,label:labels[this.state],incidents:this.incidents,threshold:this.data.settings.incidentThreshold,blocked:this.blocksCombat};
  }
  drawBack(ctx,{flashes=true}={}){
    const state=this.snapshot(),p=state.patrol;if(!p)return;
    const d=this.data.patrol,f=d.frames[flashes?p.frame:0];
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=flashes&&p.frame%2?'#257aff33':'#10121b88';
    ctx.beginPath();ctx.ellipse(p.x,p.y+3,135*p.scale,12,0,0,Math.PI*2);ctx.fill();
    ctx.translate(Math.round(p.x),p.y);ctx.scale(p.scale,p.scale);
    ctx.drawImage(this.images.patrol,f.x,f.y,f.w,f.h,-d.anchor.x,-d.anchor.y,f.w,f.h);ctx.restore();
  }
  drawFront(ctx){
    for(const actor of this.officers){
      ctx.save();ctx.fillStyle='#10101b88';ctx.beginPath();ctx.ellipse(actor.x,actor.y+2,46,8,0,0,Math.PI*2);ctx.fill();
      actor.draw(ctx);ctx.restore();
    }
  }
  drawOverlay(ctx,{flashes=true}={}){
    if(!this.active)return;
    const w=ctx.canvas.width,h=ctx.canvas.height;
    ctx.save();
    ctx.fillStyle='#071828e8';ctx.fillRect(w*.18,54,w*.64,48);
    ctx.strokeStyle='#77c7ff';ctx.lineWidth=1;ctx.strokeRect(w*.18,54,w*.64,48);
    ctx.textAlign='center';ctx.font='bold 16px monospace';ctx.fillStyle='#a8e3ff';
    ctx.fillText(this.getStatus().label.toUpperCase(),w/2,84);ctx.restore();
  }
}
window.PoliceIntervention=PoliceIntervention;
