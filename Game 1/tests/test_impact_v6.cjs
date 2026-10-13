const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const window={};vm.runInNewContext(fs.readFileSync(__dirname+'/../src/advanced-vfx.js','utf8'),{window});
const v=window.JoJoVFX,pose=v.diagnostics.strikePose;
assert(pose(.2,1).reach<0,'anticipation pulls fist back');
assert(pose(.5,1).reach>.95,'extension reaches contact');
assert(pose(.56,1).hit,'contact has its own reaction window');
assert(pose(.98,1).reach<.3,'fist recoils');
assert.notEqual(pose(.5,1).angle,pose(.5,3).angle,'successive same-side hits vary direction');
assert.notEqual(pose(.5,1).side,pose(.5,2).side,'alternating hands');
let ops=[],depth=0;const noop=()=>{},gradient=()=>({addColorStop:noop});
const c=new Proxy({globalAlpha:1,save(){depth++},restore(){depth--},createRadialGradient:gradient,createLinearGradient:gradient},{get(o,k){return k in o?o[k]:(...a)=>{a.forEach(n=>{if(typeof n==='number')assert(Number.isFinite(n));});ops.push([k,...a]);}},set(o,k,x){o[k]=x;return true}});
function draw(phase,t){ops=[];v.timeStop(c,1280,720,phase,t,t*12,[{x:670,y:350},{x:70,y:80}],true);assert.equal(depth,0);return JSON.stringify(ops)}
v.configure({quality:2,reduced:false});assert.notEqual(draw('intro',.6),draw('intro',.8),'light front traverses arena');
assert.equal(draw('freeze',.2),draw('freeze',.8),'gold shards freeze across elapsed time');
assert.notEqual(draw('release',.2),draw('release',.8),'release disperses shards');
v.configure({quality:2,particles:true});ops=[];v.diagnostics.reaction(c,1280,720,400,350,.2,7,1,'200,180,255');const early=JSON.stringify(ops);ops=[];v.diagnostics.reaction(c,1280,720,400,350,.7,7,1,'200,180,255');assert.notEqual(JSON.stringify(ops),early,'debris follows inertia and gravity');assert.equal(depth,0);
console.log('PASS VFX6 anticipation/extension/contact/recoil, direction diversity, travelling freeze front, fixed shards, chain release and ballistic debris');
