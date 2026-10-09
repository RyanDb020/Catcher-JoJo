#!/usr/bin/env node
// Keyframe QA for character and cosmic directors at four viewport sizes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),noop=()=>{};
function canvasMock(){
 let fills=0;
 const c=new Proxy({
  createLinearGradient:()=>({addColorStop:noop}),
  createRadialGradient:()=>({addColorStop:noop}),
  measureText:()=>({width:20}),
  fillRect(){fills++}
 },{
  get(obj,key){return key in obj?obj[key]:noop},
  set(obj,key,value){obj[key]=value;return true;}
 });
 return {ctx:c,get fills(){return fills}};
}
const window={};
for(const file of ['character-director.js','cosmic-director.js']){
 vm.runInNewContext(fs.readFileSync(path.join(root,'src',file),'utf8'),{window},{filename:file,timeout:5000});
}
const char=window.JoJoCharacterDirector,cosmos=window.JoJoCosmicDirector;
assert(char&&cosmos,'Both directors must initialize');
const snapshots=[
 {catcherX:230,catcherWidth:150,score:12,lives:3,balls:[{x:240,y:110,gold:false},{x:420,y:300,gold:true}],powerUps:[]},
 {catcherX:420,catcherWidth:160,score:15,lives:2,balls:[{x:430,y:210,gold:false},{x:440,y:340,gold:true}],powerUps:[]}
];
let checks=0;
const test=(label,fn)=>{assert.doesNotThrow(fn,label);console.log('PASS',label);checks++};
for(const [w,h] of [[640,480],[1280,720],[1920,1080],[375,667]]){
 const b=canvasMock(),c=b.ctx;
 for(const t of [0,.12,.32,.57,.78,.96,1]){
  test('intro '+w+'x'+h+' t='+t,()=>cosmos.intro(c,w,h,t));
  test('Made in Heaven '+w+'x'+h+' t='+t,()=>char.heaven(c,w,h,t));
  test('ORA '+w+'x'+h+' t='+t,()=>char.ora(c,w,h,t));
 }
 for(const t of [.02,.17,.43,.71,.89,.98,1]){
  test('collapse '+w+'x'+h+' t='+t,()=>cosmos.collapse(c,w,h,t,snapshots));
  test('rebirth '+w+'x'+h+' t='+t,()=>cosmos.rebirth(c,w,h,t));
 }
 for(const phase of ['intro','freeze','slow','release'])
  test('Time Stop '+w+'x'+h+' '+phase,()=>char.world(c,w,h,phase,.6));
 assert(b.fills>0,'Canvas not drawn');
}
assert(cosmos.diagnostics.collapseStages.includes('final-singularity'));
assert(cosmos.diagnostics.rebirthStages.includes('new-cosmos'));
console.log('PASS',checks,'renderer checks across 4 viewports');
