const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),scope={window:{}};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'src/stage.js'),'utf8'),scope);
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/stage/stage.json'),'utf8'));
const images=Object.fromEntries(data.layers.map(l=>[l.id,{id:l.id}]));
const stage=new scope.window.TerraceStage(images,data);
function render(options={}){
 const log=[];const ctx={canvas:{width:960,height:540},save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},
 translate(x,y){log.push({type:'translate',x,y});},drawImage(image,x,y,w,h){log.push({type:image.id,x,y,w,h});}};
 stage.draw(ctx,{...options,drawActors:(ctx,layout)=>{log.push({type:'characters',groundY:layout.groundY});}});return log;
}
assert.deepEqual(render().filter(v=>v.type!=='translate').map(v=>v.type),['wall','tables','arena','characters']);
assert.equal(render().find(v=>v.type==='characters').groundY,486);
for(const cameraX of [-24,0,24]){
 const list=render({cameraX});
 for(const layer of list.filter(v=>['wall','tables','arena'].includes(v.type))){assert.ok(layer.x<=0);assert.ok(layer.x+layer.w>=960);}
 const movement=list.find(v=>v.type==='translate');assert.equal(movement.x,0-cameraX*2);
}
assert.deepEqual(render({cameraX:500}),render({cameraX:24}));
for(const view of ['wall','tables'])assert.deepEqual(render({view}).map(v=>v.type),[view]);
assert.deepEqual(render({view:'arena'}).map(v=>v.type),['arena','translate','characters']);
console.log('PASS: layer order, foreground actors, ground baseline, layer isolation, parallax camera clamp, no empty horizontal borders.');
