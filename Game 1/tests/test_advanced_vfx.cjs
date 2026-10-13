const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/advanced-vfx.js'),'utf8'),{window});const v=window.JoJoVFX;
let commands=[],depth=0;const noop=()=>{},gradient=()=>({addColorStop:noop});
const c=new Proxy({globalAlpha:1,save(){depth++},restore(){depth--;assert(depth>=0)},createRadialGradient:gradient,createLinearGradient:gradient},{get(o,k){if(k in o)return o[k];return (...a)=>{for(const n of a)if(typeof n==='number')assert(Number.isFinite(n),k+' finite');commands.push([k,...a]);}},set(o,k,val){o[k]=val;return true}});
const h=[{catcherX:200,catcherWidth:150,score:1,balls:[{x:200,y:100}]},{catcherX:300,catcherWidth:150,score:2,balls:[{x:210,y:200}]}];
assert.equal(v.diagnostics.history(h,0).a.balls[0].y,200);assert.equal(v.diagnostics.history(h,1).a.balls[0].y,100);
for(const [w,hh] of [[640,480],[1280,720],[2558,1390],[375,667]])for(const t of [0,.08,.23,.43,.66,.81,.95,1]){
 v.configure({quality:2,flashes:true,particles:true});v.manifestation(c,w,hh,t,t*12);v.manifestation(c,w,hh,t,t*12,true);v.rewind(c,w,hh,t,h);v.collapse(c,w,hh,t,h);v.rebirth(c,w,hh,t);v.punches(c,w,hh,t,t*12);for(const p of ['intro','freeze','slow','release'])v.timeStop(c,w,hh,p,t,t*12,h[0].balls);assert.equal(depth,0);
}
commands=[];v.configure({quality:2});v.punches(c,1280,720,.5,4.1);const a=JSON.stringify(commands);commands=[];v.punches(c,1280,720,.5,4.14);assert.notEqual(JSON.stringify(commands),a,'arms move within same sprite phase');
commands=[];v.configure({quality:2,reduced:false});v.collapse(c,1280,720,.6);const high=commands.length;commands=[];v.configure({quality:2,reduced:true});v.collapse(c,1280,720,.6);assert(commands.length<high*.75,'reduced geometry lowers work');
v.clear();for(let i=0;i<40;i++)v.emitHit(i,i);assert.equal(v.diagnostics.hitCount(),24);for(let i=0;i<40;i++)v.drawHits(c,640,480,i*30);assert.equal(v.diagnostics.hitCount(),0);v.emitHit(1,2);for(let i=0;i<40;i++)v.drawHits(c,640,480,1500+i*30,true);assert.equal(v.diagnostics.hitCount(),1,'world impact debris freezes');v.clear();assert.equal(v.diagnostics.hitCount(),0);
assert.equal(depth,0);console.log('PASS moving joint arcs, actual reverse history, bounded hit pool, frozen debris, reduced geometry and 4 responsive VFX viewports');
