import * as THREE from 'three';
import {RULES, clamp, createEnemy, damageEnemy, enforceArena, grantXP, xpRequired, stepEnemy, withinAttackCone} from './rules.mjs';

// Shattered Universe 0.1: separate Three.js entry. Arcade's p5 sketch is unchanged.
const $=id=>document.getElementById(id);
const UI={
  viewport:$('viewport'), intro:$('intro'), pause:$('pause'), gameover:$('gameover'), fatal:$('fatal'),
  hpFill:$('hp-fill'),energyFill:$('energy-fill'),xpFill:$('xp-fill'),enemyFill:$('enemy-fill'),
  hp:$('hp-num'),energy:$('energy-num'),xp:$('xp-num'),enemyHp:$('enemy-hp-num'),level:$('level'),
  kills:$('score-num'),wave:$('wave-num'),combo:$('combo-num'),objective:$('objective-text'),
  reticle:$('reticle'),ora:$('ora-ready'),stop:$('stop-ready'),impact:$('impact-label'),toast:$('toast'),
  time:$('time-indicator'),timeCount:$('time-count'),fps:$('fps'),endStats:$('end-stats'),
  start:$('start-btn'),resume:$('resume-btn'),retry:$('retry-btn'),loading:$('loading-note')
};
const V=new THREE.Vector3();
const UP=new THREE.Vector3(0,1,0);
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const M={
  black:new THREE.MeshStandardMaterial({color:0x171325,roughness:.78,metalness:.25}),
  night:new THREE.MeshStandardMaterial({color:0x252039,roughness:.67,metalness:.25}),
  purple:new THREE.MeshStandardMaterial({color:0x6b3d9a,roughness:.52,metalness:.34}),
  lavender:new THREE.MeshStandardMaterial({color:0xb587ef,roughness:.4,metalness:.24}),
  gold:new THREE.MeshStandardMaterial({color:0xe4b967,roughness:.34,metalness:.58}),
  brightGold:new THREE.MeshBasicMaterial({color:0xffd78d}),
  steel:new THREE.MeshStandardMaterial({color:0x6f88b2,metalness:.65,roughness:.32}),
  aqua:new THREE.MeshBasicMaterial({color:0x7eeeff}),
  crimson:new THREE.MeshStandardMaterial({color:0x6b274b,roughness:.57,metalness:.37}),
  enemyGlow:new THREE.MeshBasicMaterial({color:0xff7caa}),
  floor:new THREE.MeshStandardMaterial({color:0x151528,roughness:.91,metalness:.07}),
  detail:new THREE.MeshStandardMaterial({color:0x3b3352,roughness:.72,metalness:.21})
};
const G={
  sphere:new THREE.SphereGeometry(1,12,9),
  box:new THREE.BoxGeometry(1,1,1),
  cyl:new THREE.CylinderGeometry(1,1,1,12),
  cone:new THREE.ConeGeometry(1,1,8),
  torus:new THREE.TorusGeometry(1,.055,8,64)
};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x080719);
scene.fog=new THREE.FogExp2(0x14102a,.017);
const camera=new THREE.PerspectiveCamera(64,1,.07,155);
let renderer;
try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.55;
  UI.viewport.appendChild(renderer.domElement);
}catch(error){
  UI.intro.hidden=true;UI.fatal.hidden=false;
  $('fatal-text').textContent='WebGL kon niet gestart worden: '+(error?.message||String(error));
  throw error;
}
scene.add(new THREE.HemisphereLight(0x9fc9ff,0x180e24,2.6));
const sunlight=new THREE.DirectionalLight(0xf6d8ff,2.4);
sunlight.position.set(-12,22,14);scene.add(sunlight);
const violetLight=new THREE.PointLight(0x9f61ff,75,23,2);violetLight.position.set(5,6,-8);scene.add(violetLight);
const goldLight=new THREE.PointLight(0xffb969,65,19,2);goldLight.position.set(-9,4,7);scene.add(goldLight);
const add=(root,geometry,material,pos,scale,rotation)=>{
  const mesh=new THREE.Mesh(geometry,material);
  if(pos)mesh.position.set(...pos);
  if(scale)mesh.scale.set(...scale);
  if(rotation)mesh.rotation.set(...rotation);
  root.add(mesh);return mesh;
};
const box=(root,mat,pos,size,rot)=>add(root,G.box,mat,pos,size,rot);
const sphere=(root,mat,pos,size)=>add(root,G.sphere,mat,pos,size);
const cyl=(root,mat,pos,radius,height,rot)=>add(root,G.cyl,mat,pos,[radius,height,radius],rot);
const cone=(root,mat,pos,radius,height,rot)=>add(root,G.cone,mat,pos,[radius,height,radius],rot);
const ring=(root,mat,x,y,z,radius,rotX=Math.PI/2)=>{
  // Torus radius must not scale tube thickness: large arena rings stay fine-line details.
  const geo=new THREE.TorusGeometry(radius,radius>10?.035:.055,8,Math.max(48,Math.round(radius*9)));
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x,y,z);mesh.rotation.x=rotX;root.add(mesh);
  return mesh;
};
const pillars=[],colliders=[],effects=[];
const animated=[];
function createArena(){
  const floor=add(scene,new THREE.CylinderGeometry(20,20,1.4,80),M.floor,[0,-.8,0]);
  // concentric arena floor and inlaid Runic geometry
  ring(scene,M.gold,0,.04,0,19.2);
  for(const r of [3.9,8.2,13.8,17.7])ring(scene,M.detail,0,.025,0,r);
  const grid=new THREE.GridHelper(36,36,0x52426c,0x29213c);
  grid.position.y=.035;scene.add(grid);
  for(let i=0;i<12;i++){
    const angle=i*Math.PI*2/12;
    const r=18.35, x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    const base=new THREE.Group();base.position.set(x,0,z);base.rotation.y=-angle;
    scene.add(base);
    cyl(base,M.night,[0,.24,0],1.12,.48);
    cyl(base,M.detail,[0,2.2,0],.73,3.7);
    cyl(base,M.gold,[0,4.02,0],.89,.19);
    box(base,M.purple,[0,4.5,0],[1.08,.95,1.08],[0,.18,0]);
    cone(base,M.gold,[0,5.15,0],.62,.65);
    const beacon=sphere(base,M.aqua,[0,5.55,0],[.13,.17,.13]);
    colliders.push({x,z,r:1.1});pillars.push(base);
    animated.push((dt,time)=>{beacon.scale.y=1+Math.sin(time*2+i)*.11});
  }
  // broken clock tower silhouette beyond the far edge
  const tower=new THREE.Group();tower.position.set(0,0,-28);scene.add(tower);
  box(tower,M.night,[0,8,0],[8,16,7]);
  box(tower,M.detail,[0,16.9,0],[9,2.5,8]);
  for(let side of [-1,1]){
    box(tower,M.black,[side*3.2,10.5,3.66],[1,13,1.5]);
    for(let k=0;k<3;k++)box(tower,M.gold,[side*3.1,4+k*4.1,4.55],[.5,.24,.12]);
  }
  const face=new THREE.Group();face.position.set(0,11.7,4);tower.add(face);
  ring(face,M.brightGold,0,0,0,2.85,0);
  ring(face,M.purple,0,0,.07,2.36,0);
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12;
    const p=box(face,M.gold,[Math.sin(a)*2.65,Math.cos(a)*2.65,.15],[.14,.35,.12]);
    p.rotation.z=-a;
  }
  const hand=box(face,M.brightGold,[0,.9,.19],[.16,2,.1]);
  const hand2=box(face,M.lavender,[.65,0,.2],[1.4,.12,.1]);
  animated.push((dt,time)=>{hand.rotation.z=-time*.17;hand2.rotation.z=time*.8});
  // distant rock arches silhouette
  for(let i=0;i<18;i++){
    const a=i*Math.PI*2/18+.10,r=24.0+(i%4)*4;
    const g=new THREE.Group();g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);g.rotation.y=a;
    scene.add(g);
    box(g,M.black,[0,3.1,0],[2.2,5+(i%5),2.2],[.06*i,0,.09]);
    if(i%3===0)box(g,M.night,[0,6.8,0],[3,.65,2.3],[0,0,.24]);
  }
  // space, sky points and luminous rifts
  const skyPositions=[];
  for(let i=0;i<950;i++){
    const a=i*2.39996,t=(i*47%97)/97,r=46+t*90;
    skyPositions.push(Math.sin(a)*r,6+(i*29%140)*.58,Math.cos(a)*r);
  }
  const starGeo=new THREE.BufferGeometry();
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(skyPositions,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xbab6ff,size:.31,sizeAttenuation:true,transparent:true,opacity:.65}));
  scene.add(stars);
  const voidGate=new THREE.Group();voidGate.position.set(14,13,-36);scene.add(voidGate);
  ring(voidGate,M.lavender,0,0,0,6,0);
  ring(voidGate,M.gold,0,0,0,4.6,0);
  animated.push((dt,time)=>{voidGate.rotation.y=time*.065;voidGate.rotation.z=Math.sin(time*.28)*.1});
  // game-playable scenery with a deliberately unobstructed central area
  for(let i=0;i<9;i++){
    const a=i*2.39996,r=13.4+(i%3)*1.4;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=1.0+(i%4)*.31;
    const rubble=box(scene,i%2?M.night:M.detail,[x,h*.35,z],[1.5,h,1.7],[.11*i,.31*i,.17]);
    rubble.userData.isCover=true;colliders.push({x,z,r:1.14});
  }
}
function createHero(){
  const root=new THREE.Group();scene.add(root);
  // Anime-inspired coat, gold trim and hat rather than unrecognizable spheres.
  box(root,M.black,[0,1.28,0],[.84,1.21,.52]);
  box(root,M.night,[0,1.24,-.28],[.85,1.42,.16]);
  for(const sign of [-1,1]){
    box(root,M.black,[sign*.23,.54,0],[.25,.91,.30]);
    box(root,M.gold,[sign*.27,.16,.09],[.32,.17,.52]);
    box(root,M.black,[sign*.59,1.45,0],[.29,.94,.36]);
    sphere(root,M.gold,[sign*.30,1.75,.26],[.08,.10,.09]);
  }
  box(root,M.lavender,[0,1.37,.31],[.13,.66,.06]);
  sphere(root,M.gold,[0,1.13,.325],[.17,.08,.05]);
  sphere(root,M.steel,[0,2.14,.04],[.28,.31,.25]);
  cyl(root,M.black,[0,2.39,.04],.39,.25);
  cyl(root,M.black,[0,2.29,.08],.54,.055);
  box(root,M.gold,[0,2.40,.378],[.19,.09,.08]);
  // face intentionally forward to the local +Z axis
  box(root,M.aqua,[0,2.12,.29],[.25,.055,.04]);
  return root;
}
function makeStand(){
  const root=new THREE.Group();
  // parent to hero; Star Platinum follows player rotation and can punch independently
  root.position.set(.92,0,.08);hero.add(root);
  const body=new THREE.Group();root.add(body);
  box(body,M.purple,[0,1.48,0],[.97,1.25,.68]);
  box(body,M.lavender,[0,1.65,.40],[.70,.56,.07]);
  box(body,M.black,[0,1.05,0],[.97,.2,.74]);
  for(let x of [-.30,-.15,0,.15,.30])sphere(body,M.gold,[x,1.05,.38],[.055,.074,.06]);
  for(const side of [-1,1]){
    box(body,M.purple,[side*.26,.53,0],[.29,.88,.37]);
    box(body,M.black,[side*.28,.14,.17],[.38,.28,.52]);
    sphere(body,M.gold,[side*.29,.10,.43],[.19,.09,.10]);
    sphere(body,M.lavender,[side*.50,1.96,.08],[.40,.37,.35]);
    sphere(body,M.gold,[side*.46,1.78,.20],[.11,.10,.10]);
  }
  const hair=new THREE.Group();body.add(hair);
  sphere(hair,M.purple,[0,2.34,0],[.31,.39,.30]);
  for(let i=0;i<9;i++){
    const a=(i/8)*Math.PI*1.2-Math.PI*.6;
    cone(hair,i%2?M.night:M.purple,[Math.sin(a)*.26,2.67+Math.cos(a)*.07,-.07],.13,.47,[.2,0,-Math.sin(a)*.33]);
  }
  box(hair,M.gold,[0,2.42,.32],[.63,.14,.1]);
  box(hair,M.aqua,[0,2.30,.326],[.45,.083,.07]);
  const arms=[];
  for(const side of [-1,1]){
    const pivot=new THREE.Group();pivot.position.set(side*.59,1.97,0);root.add(pivot);
    cyl(pivot,M.purple,[0,-.29,0],.215,.62);
    sphere(pivot,M.lavender,[0,-.65,0],[.22,.23,.22]);
    cyl(pivot,M.purple,[0,-.87,.05],.205,.50,[-.13,0,0]);
    box(pivot,M.gold,[0,-1.15,.11],[.45,.18,.45]);
    sphere(pivot,M.purple,[0,-1.30,.13],[.29,.27,.27]);
    arms.push(pivot);
  }
  root.scale.setScalar(.91);
  return {root,body,arms};
}
function makeEnemy(){
  const root=new THREE.Group();scene.add(root);
  const dark=new THREE.Group();root.add(dark);
  box(dark,M.crimson,[0,1.20,0],[.90,1.15,.55]);
  box(dark,M.black,[0,1.74,0],[1.18,.28,.76]);
  for(const side of [-1,1]){
    box(dark,M.black,[side*.23,.50,0],[.34,.85,.36]);
    box(dark,M.crimson,[side*.62,1.42,0],[.30,.93,.43]);
    sphere(dark,M.gold,[side*.56,1.97,0],[.27,.23,.33]);
  }
  sphere(dark,M.black,[0,2.12,0],[.38,.41,.34]);
  box(dark,M.enemyGlow,[0,2.15,.337],[.58,.09,.10]);
  for(let i=-1;i<=1;i++){
    cone(dark,M.crimson,[i*.32,2.59,-.08],.17,.62,[0,0,i*.16]);
  }
  const warn=ring(root,M.enemyGlow,0,.12,0,1.04);
  warn.visible=false;
  const aura=ring(root,M.purple,0,.10,0,.93);
  return {root,dark,warn,aura};
}
const obstaclesRay=new THREE.Raycaster();
createArena();
const hero=createHero(),stand=makeStand(),enemyModel=makeEnemy();
const heroShadow=add(scene,new THREE.CircleGeometry(.65,26),new THREE.MeshBasicMaterial({color:0x050313,transparent:true,opacity:.46,depthWrite:false}),[0,.065,0],[1,1,1],[-Math.PI/2,0,0]);
const enemyShadow=add(scene,new THREE.CircleGeometry(.8,26),new THREE.MeshBasicMaterial({color:0x080212,transparent:true,opacity:.45,depthWrite:false}),[0,.060,0],[1,1,1],[-Math.PI/2,0,0]);

const keys=new Set();
const state={
  running:false,paused:false,dead:false,pointerLocked:false,started:false,
  hp:100,maxHp:100,stand:30,level:1,xp:0,kills:0,wave:1,combo:0,
  attack:null,ultimate:null,stopRemaining:0,dodgeTime:0,dodgeCooldown:0,invuln:0,
  arenaTime:0,shake:0,impactTimer:0,enemyRespawn:-1,toastUntil:0,hitstop:0,comboExpiresAt:0,
  enemy:createEnemy(),enemyPosition:v(0,0,-6.0),
  facing:v(0,0,-1),yaw:0,pitch:.22,
  moveVelocity:v(0,0,0),audioContext:null,frameCounter:0,frameAccum:0,
  playerPos:v(0,0,6)
};
function placeEnemy(){
  const index=state.wave%6;
  const a=index*1.047+Math.PI;
  const r=6.8+(index%3)*1.5;
  state.enemy=createEnemy(state.wave);
  state.enemyPosition.set(Math.sin(a)*r,0,Math.cos(a)*r);
  enemyModel.root.visible=true;
  enemyShadow.visible=true;
  enemyModel.warn.visible=false;
  enemyModel.root.position.copy(state.enemyPosition);
  UI.enemyFill.style.transform='scaleX(1)';
}
function reset(){
  state.running=true;state.dead=false;state.paused=false;state.started=true;
  Object.assign(state,{hp:100,maxHp:100,stand:30,level:1,xp:0,kills:0,wave:1,combo:0,
    attack:null,ultimate:null,stopRemaining:0,dodgeTime:0,dodgeCooldown:0,invuln:0,
    enemyRespawn:-1,arenaTime:0,shake:0,impactTimer:0,hitstop:0,comboExpiresAt:0,toastUntil:0});
  state.playerPos.set(0,0,6);state.facing.set(0,0,-1);
  state.yaw=0;state.pitch=.22;
  state.moveVelocity.set(0,0,0);keys.clear();
  hero.rotation.y=Math.PI;placeEnemy();UI.gameover.hidden=true;UI.pause.hidden=true;
  UI.impact.classList.remove('show');UI.toast.classList.remove('visible');
  stand.arms.forEach(arm=>{arm.rotation.x=0;});
  state.ultimate=null;
  UI.intro.hidden=true;
  updateHud();
}
function resume(){
  if(state.dead)return;
  state.paused=false;state.running=true;UI.pause.hidden=true;UI.intro.hidden=true;
  keys.clear();requestPointerLock();
}
function start(){
  if(!state.started){reset();requestPointerLock();}
  else resume();
}
function requestPointerLock(){
  if(typeof renderer.domElement.requestPointerLock!=='function')return;
  try{
    const p=renderer.domElement.requestPointerLock();
    if(p&&typeof p.catch==='function')p.catch(()=>{ /* keyboard + drag camera fallback */ });
  }catch{ /* keyboard + drag camera fallback */ }
}
function pause(){
  if(!state.started||state.dead||state.paused)return;
  state.paused=true;state.running=false;keys.clear();UI.pause.hidden=false;
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
}
function gameOver(){
  state.dead=true;state.running=false;keys.clear();
  UI.gameover.hidden=false;UI.endStats.textContent='Verslagen vijanden: '+state.kills+' · Level '+state.level+' · Wave '+state.wave+'. Je kunt de arena opnieuw proberen.';
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  sound(135,.24,'sawtooth',.09);
}
UI.start.addEventListener('click',start);
UI.resume.addEventListener('click',resume);
UI.retry.addEventListener('click',()=>{reset();requestPointerLock()});
document.addEventListener('pointerlockchange',()=>{
  const was=state.pointerLocked;
  state.pointerLocked=document.pointerLockElement===renderer.domElement;
  if(was&&!state.pointerLocked&&!state.dead&&state.running)pause();
});
window.addEventListener('keydown',event=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(event.code==='Escape'){if(!state.pointerLocked){if(state.paused)resume();else pause();}return;}
  keys.add(event.code);
  if(event.repeat)return;
  if(event.code==='KeyQ')beginOra();
  if(event.code==='KeyT')timeStop();
  if(event.code==='ShiftLeft'||event.code==='ShiftRight')dodge();
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{keys.clear();if(state.running)pause()});
document.addEventListener('mousemove',event=>{
  if(state.pointerLocked){
    state.yaw-=event.movementX*.0025;state.pitch=clamp(state.pitch+event.movementY*.002,.02,.65);
  }else if(dragging&&state.running){
    state.yaw-=event.movementX*.003;state.pitch=clamp(state.pitch+event.movementY*.003,.02,.65);
  }
});
let dragging=false;
renderer.domElement.addEventListener('mousedown',event=>{
  if(!state.running)return;
  if(!state.pointerLocked)dragging=true;
  if(event.button===0)startAttack(false);
  if(event.button===2)startAttack(true);
});
window.addEventListener('mouseup',()=>{dragging=false});
renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('resize',()=>{
  const w=window.innerWidth,h=window.innerHeight;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
});
function sound(hz,duration,type='triangle',volume=.05){
  // Original generated SFX only: no licensed voice samples in prototype.
  try{
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return;
    const ctx=state.audioContext||(state.audioContext=new Context());
    if(ctx.state==='suspended')ctx.resume();
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(hz,ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,hz*.52),ctx.currentTime+duration);
    gain.gain.setValueAtTime(volume,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();oscillator.stop(ctx.currentTime+duration);
  }catch{ /* audio must never interrupt gameplay */ }
}
function banner(message,seconds=1.3){
  UI.toast.textContent=message;UI.toast.classList.add('visible');state.toastUntil=state.arenaTime+seconds;
}
function impact(text,seconds=.24){
  UI.impact.textContent=text;UI.impact.classList.add('show');state.impactTimer=seconds;
}
function collide(pos){
  enforceArena(pos,RULES.arenaRadius-1.0);
  for(const obstacle of colliders){
    const dx=pos.x-obstacle.x,dz=pos.z-obstacle.z;
    const d=Math.hypot(dx,dz),min=obstacle.r+.34;
    if(d>1e-4&&d<min){pos.x+=dx/d*(min-d);pos.z+=dz/d*(min-d);}
  }
  enforceArena(pos,RULES.arenaRadius-1.0);
}
function movePlayer(dt){
  if(state.dodgeCooldown>0)state.dodgeCooldown-=dt;
  state.invuln=Math.max(0,state.invuln-dt);
  state.dodgeTime=Math.max(0,state.dodgeTime-dt);
  const forward=v(-Math.sin(state.yaw),0,-Math.cos(state.yaw));
  const right=v(Math.cos(state.yaw),0,-Math.sin(state.yaw));
  const ix=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const iz=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const target=forward.multiplyScalar(iz).add(right.multiplyScalar(ix)).normalize();
  const speed=(state.dodgeTime>0?15:6.5)*(state.ultimate?.8:1);
  state.moveVelocity.lerp(target.multiplyScalar(speed),Math.min(1,dt*15));
  state.playerPos.addScaledVector(state.moveVelocity,dt);
  collide(state.playerPos);
  if(state.moveVelocity.lengthSq()>.7&&!state.attack&&!state.ultimate){
    state.facing.copy(state.moveVelocity).normalize();
  }
  // Always choose shortest yaw path rather than rotating all the way round.
  const desired=Math.atan2(state.facing.x,state.facing.z);
  const angle=Math.atan2(Math.sin(desired-hero.rotation.y),Math.cos(desired-hero.rotation.y));
  hero.rotation.y+=angle*Math.min(1,dt*13);
  const walk=Math.min(1,state.moveVelocity.length()/6.5);
  hero.position.set(state.playerPos.x,Math.sin(state.arenaTime*11)*.038*walk,state.playerPos.z);
  heroShadow.position.x=state.playerPos.x;heroShadow.position.z=state.playerPos.z;
}
function dodge(){
  if(!state.running||state.dodgeCooldown>0||state.ultimate)return;
  state.dodgeTime=.18;state.invuln=.34;state.dodgeCooldown=.85;
  state.shake=.05;sound(400,.14,'triangle',.018);
}
function faceEnemy(){
  const dx=state.enemyPosition.x-state.playerPos.x,dz=state.enemyPosition.z-state.playerPos.z;
  const d=Math.hypot(dx,dz);
  if(!state.enemy.dead&&d<4.1){
    const dot=(dx*state.facing.x+dz*state.facing.z)/Math.max(.001,d);
    if(dot>-.10){state.facing.set(dx/d,0,dz/d);}
  }
}
function startAttack(heavy){
  if(!state.running||state.attack||state.ultimate||state.hitstop>0)return;
  faceEnemy();
  if(state.arenaTime>=state.comboExpiresAt)state.combo=0;
  const stage=heavy?3:(state.combo%3);
  const spec=heavy?{duration:.67,hitAt:.36,damage:34,range:3.55}:
    [{duration:.34,hitAt:.17,damage:14,range:3.25},
     {duration:.38,hitAt:.19,damage:17,range:3.30},
     {duration:.50,hitAt:.27,damage:26,range:3.55}][stage];
  state.attack={...spec,stage,heavy,elapsed:0,applied:false};
  state.combo=heavy?0:state.combo+1;
  state.comboExpiresAt=heavy?0:state.arenaTime+1.3;
  sound(heavy?135:235+stage*36,.10,'sawtooth',.025);
}
function enemyHit(damage,heavy=false){
  if(state.enemy.dead)return false;
  const landed=withinAttackCone(state.playerPos,state.facing,state.enemyPosition,heavy?3.55:RULES.meleeRange);
  if(!landed){impact('MISS',.23);return false;}
  const result=damageEnemy(state.enemy,damage,heavy?.55:.22);
  state.stand=clamp(state.stand+(heavy?10:8),0,100);
  state.shake=Math.max(state.shake,heavy?.20:.12);
  state.hitstop=heavy?.065:.028;
  impact(heavy?'HEAVY IMPACT':'+'+Math.floor(result.dealt)+' DMG',.25);
  makeBurst(state.enemyPosition,heavy?0xffd48f:0xd99aff,heavy?16:10);
  sound(heavy?105:178,heavy?.24:.14,'sawtooth',heavy?.08:.055);
  if(result.killed){
    state.kills++;state.wave++;
    const leveled=grantXP(state,42+Math.floor(state.wave*4));
    if(leveled)banner('LEVEL UP — LV '+state.level,2.1);else banner('ENEMY DEFEATED +XP',1.5);
    state.enemyRespawn=2.1;enemyModel.root.visible=false;enemyShadow.visible=false;
    state.combo=0;state.comboExpiresAt=0;
  }
  return true;
}
function makeBurst(position,color,count=10){
  for(let i=0;i<count;i++){
    const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1});
    const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.08,0),material);
    mesh.position.set(position.x,1.35,position.z);scene.add(mesh);
    const a=(i/count)*Math.PI*2;
    effects.push({mesh,velocity:v(Math.cos(a)*(2+Math.random()*3),Math.random()*3+.8,Math.sin(a)*(2+Math.random()*3)),age:0,duration:.37+Math.random()*.28});
  }
  while(effects.length>125){const e=effects.shift();scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}
}
function updateEffects(dt){
  for(let i=effects.length-1;i>=0;i--){
    const e=effects[i];e.age+=dt;
    e.mesh.position.addScaledVector(e.velocity,dt);
    e.velocity.y-=dt*6;
    e.mesh.material.opacity=Math.max(0,1-e.age/e.duration);
    e.mesh.scale.setScalar(Math.max(.1,1-e.age/e.duration));
    if(e.age>=e.duration){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();effects.splice(i,1);}
  }
}
function animateStand(dt){
  const time=state.arenaTime;
  const a=state.attack,u=state.ultimate;
  const phase=a?a.elapsed/a.duration:0;
  const swing=a?Math.sin(Math.PI*Math.min(1,phase))*1.4:0;
  stand.arms[0].rotation.x=THREE.MathUtils.damp(stand.arms[0].rotation.x,a&&a.stage%2===1?-1.7*swing:u?-1.2*Math.sin(time*41):.14,15,dt);
  stand.arms[1].rotation.x=THREE.MathUtils.damp(stand.arms[1].rotation.x,a&&a.stage%2!==1?-1.7*swing:u?-1.2*Math.sin(time*41+Math.PI):.14,15,dt);
  stand.root.position.y=Math.sin(time*2.4)*.04+(u?.10:0);
  stand.root.position.z=.08-(a?.16*swing:0)-(u?.18:0);
  stand.root.rotation.z=Math.sin(time*1.9)*.036;
  stand.root.scale.setScalar(u?1.03:.91);
  // Cloth motion, shadow and visual presence persist while standing idle.
  enemyModel.root.position.y=state.enemyPosition.y+Math.sin(time*2.5)*.035;
  enemyShadow.position.x=state.enemyPosition.x;enemyShadow.position.z=state.enemyPosition.z;
}
function updateAttack(dt){
  const a=state.attack;if(!a)return;
  a.elapsed+=dt;
  if(!a.applied&&a.elapsed>=a.hitAt){
    a.applied=true;enemyHit(a.damage,a.heavy);
  }
  if(a.elapsed>=a.duration)state.attack=null;
}
function beginOra(){
  if(!state.running||state.ultimate||state.attack||state.stand<RULES.oraCost){
    if(state.running&&state.stand<RULES.oraCost)banner('ORA ORA NEEDS 55 ENERGY');
    return;
  }
  state.stand-=RULES.oraCost;state.ultimate={age:0,duration:2.65,next:.24,hits:0};
  state.invuln=2.75;faceEnemy();
  banner('STAR PLATINUM — ORA ORA!',2.2);sound(320,.5,'sawtooth',.045);
}
function updateOra(dt){
  const u=state.ultimate;if(!u)return;
  u.age+=dt;
  if(u.age>=u.next&&u.hits<11){
    u.hits++;u.next+=.19;
    // Barrage hits are spaced; each hit is resolved only once.
    enemyHit(u.hits===11?26:8.5,u.hits===11);
  }
  if(u.age>=u.duration)state.ultimate=null;
}
function timeStop(){
  if(!state.running||state.stand<RULES.timeStopCost||state.stopRemaining>0){
    if(state.running&&state.stand<RULES.timeStopCost)banner('ZA WARUDO NEEDS 40 ENERGY');
    return;
  }
  state.stand-=RULES.timeStopCost;state.stopRemaining=RULES.timeStopSeconds;
  banner('ZA WARUDO — TOKI YO TOMARE!',2.0);
  state.shake=.18;sound(115,.75,'sine',.10);
}
function updateEnemy(dt){
  if(state.enemy.dead){
    if(state.enemyRespawn>0){
      state.enemyRespawn-=dt;
      if(state.enemyRespawn<=0){placeEnemy();banner('WAVE '+state.wave+' — NEW CHALLENGER!',2);}
    }
    return;
  }
  const frozen=state.stopRemaining>0;
  const result=stepEnemy(state.enemy,state.enemyPosition,state.playerPos,dt,frozen);
  state.enemyPosition.x+=result.x;state.enemyPosition.z+=result.z;
  enforceArena(state.enemyPosition,16.6);
  enemyModel.root.position.x=state.enemyPosition.x;enemyModel.root.position.z=state.enemyPosition.z;
  const dx=state.playerPos.x-state.enemyPosition.x,dz=state.playerPos.z-state.enemyPosition.z;
  enemyModel.root.rotation.y=Math.atan2(dx,dz);
  enemyModel.warn.visible=result.telegraph||state.enemy.state==='windup';
  enemyModel.warn.scale.setScalar(.95+Math.sin(state.arenaTime*23)*.12);
  enemyModel.aura.material=M.purple;
  if(result.attack&&state.invuln<=0){
    state.hp=Math.max(0,state.hp-(RULES.enemyBaseDamage+Math.floor(state.wave*.75)));
    state.shake=.22;state.invuln=.52;impact('ENEMY HIT!',.44);sound(98,.25,'sawtooth',.09);
    if(state.hp<=0)gameOver();
  }
}
function updateCamera(dt){
  const target=state.playerPos.clone().add(v(0,1.65,0));
  const yaw=state.yaw,pitch=state.pitch;
  const offset=v(Math.sin(yaw)*Math.cos(pitch)*7.9,2.1+Math.sin(pitch)*6.5,Math.cos(yaw)*Math.cos(pitch)*7.9);
  const desire=target.clone().add(offset);
  // Camera collision against arena columns and props, preserving focus on the player.
  const ray=desire.clone().sub(target);const dist=ray.length();ray.normalize();
  obstaclesRay.set(target,ray);obstaclesRay.far=dist;
  const hits=obstaclesRay.intersectObjects(pillars,true);
  if(hits.length&&hits[0].distance<dist){
    desire.copy(target).addScaledVector(ray,Math.max(1.6,hits[0].distance-.30));
  }
  const follow=1-Math.exp(-dt*11);
  camera.position.lerp(desire,follow);
  if(state.shake>0){
    camera.position.x+=(Math.random()-.5)*state.shake*.25;
    camera.position.y+=(Math.random()-.5)*state.shake*.22;
  }
  camera.lookAt(target);
}
function updateHud(){
  UI.hpFill.style.transform='scaleX('+clamp(state.hp/state.maxHp,0,1)+')';
  UI.energyFill.style.transform='scaleX('+clamp(state.stand/100,0,1)+')';
  UI.xpFill.style.transform='scaleX('+clamp(state.xp/xpRequired(state.level),0,1)+')';
  UI.enemyFill.style.transform='scaleX('+clamp(state.enemy.hp/state.enemy.maxHp,0,1)+')';
  UI.hp.textContent=Math.ceil(state.hp)+' / '+state.maxHp;
  UI.energy.textContent=Math.floor(state.stand)+' / 100';
  UI.xp.textContent=state.xp+' / '+xpRequired(state.level);
  UI.level.textContent='LV '+String(state.level).padStart(2,'0');
  UI.enemyHp.textContent=Math.ceil(state.enemy.hp)+' / '+state.enemy.maxHp;
  UI.kills.innerHTML=state.kills+' <small>KILLS</small>';
  UI.wave.textContent='WAVE '+String(state.wave).padStart(2,'0');
  UI.combo.textContent='COMBO ×'+(state.combo%3);
  UI.ora.classList.toggle('ready',state.stand>=RULES.oraCost);
  UI.stop.classList.toggle('ready',state.stand>=RULES.timeStopCost);
  UI.time.hidden=state.stopRemaining<=0;
  UI.timeCount.textContent=state.stopRemaining.toFixed(1)+'s';
  UI.objective.textContent=state.enemy.dead?'Chrono Shade verslagen. Bereid je voor op de volgende golf.':
    state.enemy.state==='windup'?'Gevaar! De vijand bereidt een aanval voor. Dodge met Shift.':
    'Versla de Chrono Shade en beheers je Stand.';
}
const gameClock=new THREE.Clock();
let lastTime=performance.now();
let fpsTime=0,fpsCount=0;
function loop(now){
  requestAnimationFrame(loop);
  // Delta is clamped to prevent teleporting and damage spikes after tab switching.
  const dt=clamp((now-lastTime)/1000,0,.045);lastTime=now;
  if(state.running&&!state.dead&&!state.paused){
    state.arenaTime+=dt;
    state.stopRemaining=Math.max(0,state.stopRemaining-dt);
    state.shake=Math.max(0,state.shake-dt*.85);
    state.hitstop=Math.max(0,state.hitstop-dt);
    state.impactTimer=Math.max(0,state.impactTimer-dt);
    if(state.impactTimer===0)UI.impact.classList.remove('show');
    if(state.arenaTime>=state.toastUntil)UI.toast.classList.remove('visible');
    if(state.combo&&state.arenaTime>=state.comboExpiresAt)state.combo=0;
    movePlayer(dt);
    updateAttack(dt);
    updateOra(dt);
    if(state.hitstop<=0)updateEnemy(dt);
    animateStand(dt);
    updateEffects(dt);
    animated.forEach(f=>f(dt,state.arenaTime));
    updateHud();
  }
  updateCamera(dt);
  renderer.render(scene,camera);
  fpsTime+=dt;fpsCount++;
  if(fpsTime>=.75){
    UI.fps.textContent='FPS '+Math.round(fpsCount/fpsTime);
    fpsTime=0;fpsCount=0;
  }
}
// A read-only snapshot helps browser QA without adding cheat controls.
Object.defineProperty(window,'__SHATTERED_QA__',{get:()=>Object.freeze({
  started:state.started,running:state.running,paused:state.paused,dead:state.dead,
  hp:state.hp,stand:state.stand,enemyHp:state.enemy.hp,enemyState:state.enemy.state,
  kills:state.kills,wave:state.wave,level:state.level,stop:state.stopRemaining,
  combo:state.combo,attackActive:!!state.attack,ultimateActive:!!state.ultimate,
  pointerLocked:state.pointerLocked,enemyVisible:enemyModel.root.visible,
  player:{x:state.playerPos.x,z:state.playerPos.z},
  camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z}
})});
updateCamera(.1);
updateHud();
requestAnimationFrame(loop);
