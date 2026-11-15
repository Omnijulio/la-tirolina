/* Three aligned depth planes. Characters are drawn inside the front plane. */
class TerraceStage {
  constructor(images,data){this.images=images;this.data=data;}
  layout(ctx){
    const d=this.data,s=Math.min(ctx.canvas.width/d.viewportWidth,ctx.canvas.height/d.viewportHeight);
    return {scale:s,x:(ctx.canvas.width-d.viewportWidth*s)/2,y:(ctx.canvas.height-d.viewportHeight*s)/2};
  }
  draw(ctx,{cameraX=0,view='all',drawActors=()=>{}}={}){
    const d=this.data,l=this.layout(ctx),camera=Math.max(-d.maxCameraX,Math.min(d.maxCameraX,cameraX));
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#101725';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    if(view!=='all'){
      for(let y=0;y<ctx.canvas.height;y+=16)for(let x=0;x<ctx.canvas.width;x+=16){
        ctx.fillStyle=(x/16+y/16)%2?'#243345':'#1a2535';ctx.fillRect(x,y,16,16);
      }
    }
    ctx.beginPath();ctx.rect(l.x,l.y,d.viewportWidth*l.scale,d.viewportHeight*l.scale);ctx.clip();
    for(const layer of d.layers){
      if(view!=='all'&&view!==layer.id)continue;
      const image=this.images[layer.id];if(!image)continue;
      ctx.drawImage(image,Math.round(l.x+(-d.overscanX-camera*layer.parallax)*l.scale),l.y,d.assetWidth*l.scale,d.assetHeight*l.scale);
    }
    if(view==='all'||view==='arena'){
      ctx.save();ctx.translate(l.x-camera*l.scale,l.y);
      drawActors(ctx,{scale:l.scale,groundY:d.groundY*l.scale});ctx.restore();
    }
    ctx.restore();
  }
}
window.TerraceStage=TerraceStage;
