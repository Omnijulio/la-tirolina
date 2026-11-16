// Execute the real standalone scripts against a small DOM/Canvas adapter.
// This checks wiring and state changes; it is not a browser layout test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'fighter-preview.html'),'utf8'); // Fighter Lab autónomo (index.html es el juego)
let queued=null;const handlers={};
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.dataset={};this.checked=false;this.disabled=false;this.value='';this.textContent='';this.style={};this.children=[];this.classList={toggle(){}};}
 append(v){this.children.push(v);}setAttribute(){}click(){if(!this.disabled)this.onclick?.();}
 getContext(){if(!this.ctx)this.ctx=new Proxy({canvas:this},{get:(o,k)=>o[k]||(()=>{})});return this.ctx;}
}
const elements={},actions=[];
for(const match of html.matchAll(/<(\w+)\b([^>]*)>/g)){
 const tag=match[1],attrs=match[2],id=attrs.match(/\bid="([^"]+)"/),action=attrs.match(/\bdata-action="([^"]+)"/);
 if(!id&&!action)continue;const e=new Element(tag);e.checked=/\bchecked\b/.test(attrs);
 for(const k of ['width','height']){const m=attrs.match(new RegExp(k+'="(\\d+)"'));if(m)e[k]=Number(m[1]);}
 if(id)elements[id[1]]=e;if(action){e.dataset.action=action[1];actions.push(e);}
}
elements.speed.value='1';elements.camera.value='0';elements.layerView.value='all';
class FakeImage{constructor(){this.complete=true;this.naturalWidth=1;}set src(v){assert.ok(v.startsWith('data:image/png;base64,'),'Standalone image must be embedded');this.url=v;}}
const scope={document:{getElementById:id=>{assert.ok(elements[id],id);return elements[id];},createElement:t=>new Element(t),querySelectorAll:()=>actions,activeElement:{tagName:'BODY'},addEventListener(){}},Image:FakeImage,requestAnimationFrame:fn=>queued=fn,addEventListener:(type,fn)=>handlers[type]=fn,matchMedia:()=>({matches:false}),console};
scope.window=scope;vm.createContext(scope);
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],scope);
assert.ok(scope.demoPolice);let now=0;queued(now);
function run(ms){for(let i=0;i<ms;i+=100){now+=Math.min(100,ms-i);queued(now);}}
function key(k){handlers.keydown({key:k,code:k===' '?'Space':'Key'+k.toUpperCase(),repeat:false,preventDefault(){}});}
elements.auto.checked=false;elements.autoPolice.checked=false;elements.autoPolice.onchange();
key('l');run(300);assert.equal(scope.demoBottles.projectiles.length,1);
key('i');assert.equal(scope.demoPolice.state,'warning');run(6000);
assert.equal(scope.demoPolice.state,'stopping');assert.equal(scope.demoPolice.blocksCombat,true);
assert.equal(scope.demoBottles.projectiles.length,0);assert.equal(scope.demoFighter.animation,'idle');
key('j');key('k');key('l');assert.equal(scope.demoFighter.animation,'idle');assert.equal(scope.demoBottles.projectiles.length,0);
run(4000);assert.equal(scope.demoPolice.state,'resolved');assert.equal(elements.callPolice.disabled,true);
key('r');assert.equal(scope.demoPolice.state,'idle');assert.equal(scope.demoPolice.officers.length,0);
elements.auto.checked=false;elements.autoPolice.checked=true;elements.autoPolice.onchange();
for(let i=0;i<5;i++)key('j');assert.equal(scope.demoPolice.state,'warning');
for(const view of ['wall','tables','arena','all']){elements.layerView.value=view;run(100);}
console.log('PASS: standalone asset loading, keyboard, live projectile, police stop clears attacks/projectiles, resolved lock, reset, automatic trigger and layer views. Browser layout still requires visual validation.');
