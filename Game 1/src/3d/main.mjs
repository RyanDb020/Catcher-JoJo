import * as THREE from 'three';
import {createCombatAudio} from './audio.mjs?v=1.2.0';
import {RULES, MISSION_WAVES, isBossWave, resolveDefeat, clamp, createEnemy, damageEnemy, enforceArena, grantXP, xpRequired, stepEnemy, withinAttackCone} from './rules.mjs?v=1.2.0';

// Shattered Universe 1.0: a complete five-wave mission, separate from the Arcade game.
const $=id=>document.getElementById(id);
const UI={
  viewport:$('viewport'), intro:$('intro'), pause:$('pause'), gameover:$('gameover'), victory:$('victory'), fatal:$('fatal'),
  hpFill:$('hp-fill'),energyFill:$('energy-fill'),xpFill:$('xp-fill'),enemyFill:$('enemy-fill'),
  hp:$('hp-num'),energy:$('energy-num'),xp:$('xp-num'),enemyHp:$('enemy-hp-num'),level:$('level'),
  kills:$('score-num'),wave:$('wave-num'),combo:$('combo-num'),objective:$('objective-text'),
  reticle:$('reticle'),ora:$('ora-ready'),stop:$('stop-ready'),impact:$('impact-label'),toast:$('toast'),
  time:$('time-indicator'),timeCount:$('time-count'),fps:$('fps'),endStats:$('end-stats'),
  enemyTitle:$('enemy-title'),anchors:$('anchor-status'),start:$('start-btn'),resume:$('resume-btn'),retry:$('retry-btn'),victoryRetry:$('victory-retry-btn'),victoryStats:$('victory-stats'),loading:$('loading-note')
};
const audio=createCombatAudio();
let audioEndTimer=null,footstepTimer=0;
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
  floor:new THREE.MeshStandardMaterial({color:0x292b40,roughness:.91,metalness:.07}),
  stone:new THREE.MeshStandardMaterial({color:0x38364b,roughness:.88,metalness:.06}),
  paleStone:new THREE.MeshStandardMaterial({color:0x49445a,roughness:.82,metalness:.10}),
  teal:new THREE.MeshStandardMaterial({color:0x347d8c,roughness:.5,metalness:.32}),
  detail:new THREE.MeshStandardMaterial({color:0x3b3352,roughness:.72,metalness:.21})
};
const G={
  sphere:new THREE.SphereGeometry(1,24,16),
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
  // Let combat.html start the Canvas2D fallback when WebGL is unavailable.
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
const pillars=[],colliders=[],effects=[],timeAnchors=[];
const animated=[];
function createArena(){
  add(scene,new THREE.CylinderGeometry(20,20,1.4,96),M.floor,[0,-.8,0]);
  // Paved clock plaza: separate stone tiles and an inlaid bronze time-dial.
  const tileGeo=new THREE.CylinderGeometry(.77,.80,.13,6);
  const tileMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.9,metalness:.04});
  const pavers=[];
  for(let x=-17.5;x<=17.5;x+=1.48)for(let z=-17.5;z<=17.5;z+=1.48){
    const xx=x+((Math.round(z*10)%2)*.36),r=Math.hypot(xx,z);
    if(r>18.3||r<2.8)continue;
    pavers.push([xx,-.045,z,Math.sin(xx*7+z*3)*.5+.5]);
  }
  const stones=new THREE.InstancedMesh(tileGeo,tileMat,pavers.length);
  const dummy=new THREE.Object3D();
  pavers.forEach(([x,y,z,t],i)=>{
    dummy.position.set(x,y,z);dummy.rotation.y=(i%6)*Math.PI/3;
    dummy.scale.set(1+(i%4)*.025,1,1+(i%3)*.025);dummy.updateMatrix();
    stones.setMatrixAt(i,dummy.matrix);
    stones.setColorAt(i,new THREE.Color().setHSL(.68,.11,.21+t*.055));
  });
  stones.instanceMatrix.needsUpdate=true;stones.instanceColor.needsUpdate=true;scene.add(stones);
  // Brass tracks and engraved clock numerals make the ground a designed place.
  ring(scene,M.gold,0,.045,0,18.7);
  ring(scene,M.detail,0,.035,0,14.1);
  ring(scene,M.lavender,0,.04,0,8.4);
  ring(scene,M.gold,0,.03,0,3.0);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,x=Math.sin(a)*17.2,z=Math.cos(a)*17.2;
    const marker=box(scene,M.gold,[x,.055,z],[.22,.06,.72],[0,-a,0]);
    marker.material=M.detail;
  }
  // Four differently shaped clock lanterns frame the combat plaza.
  const lanterns=[[-15,-7,5.8],[-8,16,4.4],[15,7,6.6],[8,-16,5.1]];
  lanterns.forEach(([x,z,h],i)=>{
    const base=new THREE.Group();base.position.set(x,0,z);base.rotation.y=i*.61;scene.add(base);
    cyl(base,M.steel,[0,.28,0],.86,.56);
    cyl(base,M.night,[0,h*.45,0],.52,h*.72);
    cyl(base,M.gold,[0,h*.77,0],.68,.17);
    const housing=new THREE.Group();housing.position.set(0,h*.91,0);base.add(housing);
    cyl(housing,M.black,[0,.15,0],.63,.55);
    sphere(housing,M.aqua,[0,.15,.42],[.31,.31,.12]);
    cone(base,M.gold,[0,h+.48,0],.42,.7);
    box(base,M.gold,[0,h+.02,0],[1.18,.08,.10]);
    const glow=sphere(base,M.brightGold,[0,h+.15,.48],[.14,.14,.08]);
    animated.push((dt,time)=>glow.material.opacity=.68+Math.sin(time*2+i)*.18);
    pillars.push(base);colliders.push({x,z,r:1.02});
  });
  // Three time anchors are gameplay objects: each sends a readable floor wave until disabled.
  [[-6,4],[7,1],[0,-12]].forEach(([x,z],i)=>{
    const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
    cyl(root,M.steel,[0,.18,0],.72,.36);
    cyl(root,M.gold,[0,.42,0],.56,.13);
    const crystal=add(root,new THREE.OctahedronGeometry(.48,1),i===1?M.aqua:M.lavender,[0,1.05,0],[.78,1.35,.78],[0,.2*i,Math.PI/8]);
    const halo=ring(root,M.brightGold,0,.08,0,1.05);
    const rune=ring(root,M.lavender,0,.10,0,.76,0);
    timeAnchors.push({root,crystal,halo,rune,x,z,active:true,pulse:0,index:i});
  });
  // Clock tower landmark with a cylindrical masonry body and an open, broken crown.
  const tower=new THREE.Group();tower.position.set(0,0,-27);scene.add(tower);pillars.push(tower);
  cyl(tower,M.night,[0,7.1,0],4.6,14.2);
  cyl(tower,M.steel,[0,14.4,0],5.0,.42);
  cyl(tower,M.detail,[0,15.2,0],4.2,1.2);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    cyl(tower,i%2?M.steel:M.gold,[Math.cos(a)*3.55,7.4,Math.sin(a)*3.55],.17,13.2);
  }
  // Face points into the plaza; layered rings, hour marks and separate moving hands.
  const face=new THREE.Group();face.position.set(0,10.2,4.44);tower.add(face);
  cyl(face,M.black,[0,0,-.12],3.28,.34,[Math.PI/2,0,0]);
  ring(face,M.brightGold,0,0,0,3.02,0);
  ring(face,M.purple,0,0,.08,2.63,0);
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12;
    const p=box(face,M.gold,[Math.sin(a)*2.48,Math.cos(a)*2.48,.15],[.16,.37,.1]);
    p.rotation.z=-a;
  }
  const hand=box(face,M.brightGold,[0,.76,.20],[.16,1.65,.08]);
  const hand2=box(face,M.lavender,[.58,0,.22],[1.16,.14,.08]);
  const center=sphere(face,M.gold,[0,0,.28],[.22,.22,.12]);
  animated.push((dt,time)=>{hand.rotation.z=-time*.12;hand2.rotation.z=time*.67});
  // A broken arch and mismatched district facades create a readable horizon.
  const arch=new THREE.Group();arch.position.set(-7,0,-22);scene.add(arch);pillars.push(arch);
  box(arch,M.steel,[-3.8,3.1,0],[1.2,6.2,1.35]);
  box(arch,M.steel,[3.8,3.1,0],[1.2,6.2,1.35]);
  box(arch,M.night,[0,6.05,0],[8.6,1.1,1.5]);
  box(arch,M.detail,[1.9,6.15,.25],[1.1,.28,.26],[0,0,.22]);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+.1,r=27+(i%3)*2.4,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const building=new THREE.Group();building.position.set(x,0,z);building.rotation.y=a;scene.add(building);pillars.push(building);
    const h=[8,11,7,13,9,6,12,8][i],w=[7,9,6,8,10,6,8,7][i];
    box(building,i%2?M.night:M.steel,[0,h/2,0],[w,h,1.6]);
    box(building,M.detail,[0,h+.35,0],[w+1,.7,2.0]);
    for(let row=0;row<Math.floor(h/2.7);row++)for(let col=-1;col<=1;col++){
      const wx=col*w*.27,wy=1.6+row*2.55;
      box(building,(i+row+col)%2?M.teal:M.black,[wx,wy,.84],[.64,1.16,.08]);
      box(building,M.gold,[wx,wy-.67,.86],[.88,.08,.1]);
    }
    if(i%2===0){
      box(building,M.gold,[w*.32,h*.63,.88],[.18,.18,.12]);
      box(building,M.black,[-w*.30,h*.39,.88],[.72,1.1,.12]);
    }
  }
  // Broken masonry is grounded and clustered along the outer curb.
  for(let i=0;i<14;i++){
    const a=i*2.39996,r=14.8+(i%3)*1.0,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.28+(i%4)*.08;
    const rubble=box(scene,i%3?M.stone:M.paleStone,[x,h*.44,z],[1.05+(i%3)*.23,h,.72],[.04*i,.31*i,.10]);
    rubble.userData.isCover=true;colliders.push({x,z,r:.72});
  }
  // Thin distant stars remain above the district; no loose floating debris.
  const skyPositions=[];
  for(let i=0;i<500;i++){
    const a=i*2.39996,t=(i*47%97)/97,r=55+t*90;
    skyPositions.push(Math.sin(a)*r,12+(i*29%120)*.72,Math.cos(a)*r);
  }
  const starGeo=new THREE.BufferGeometry();
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(skyPositions,3));
  scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xe1dcff,size:.28,sizeAttenuation:true,transparent:true,opacity:.54})));
  const voidGate=new THREE.Group();voidGate.position.set(14,13,-36);scene.add(voidGate);
  ring(voidGate,M.lavender,0,0,0,6,0);ring(voidGate,M.gold,0,0,0,4.6,0);
  animated.push((dt,time)=>{voidGate.rotation.y=time*.065;voidGate.rotation.z=Math.sin(time*.28)*.1});
}
function capsule(root,material,pos,radius,length,rotation){
  const mesh=add(root,new THREE.CapsuleGeometry(radius,length,5,14),material,pos,[1,1,1],rotation);
  return mesh;
}
function smooth(root,material,pos,scale){
  return add(root,new THREE.SphereGeometry(1,24,16),material,pos,scale);
}
function plate(root,material,pos,scale,rotation){
  return smooth(root,material,pos,scale).rotation.set(...(rotation||[0,0,0]));
}
function makeFace(head,skin,eye,mark){
  smooth(head,skin,[0,0,0],[.25,.32,.24]);
  smooth(head,mark,[0,-.10,.19],[.18,.16,.09]);
  for(const side of [-1,1]){
    smooth(head,eye,[side*.092,.025,.215],[.043,.035,.025]);
    box(head,M.black,[side*.09,.083,.224],[.078,.022,.035],[0,0,side*-.16]);
  }
  box(head,M.black,[0,-.16,.263],[.115,.018,.025]);
  cyl(head,M.gold,[0,-.245,.02],.22,.055,[Math.PI/2,0,0]);
}
function createHero(){
  const root=new THREE.Group();scene.add(root);
  const rig=new THREE.Group();root.add(rig);
  const coat=new THREE.LatheGeometry([
    new THREE.Vector2(.23,0),new THREE.Vector2(.31,.12),new THREE.Vector2(.34,.34),
    new THREE.Vector2(.29,.61),new THREE.Vector2(.39,.82),new THREE.Vector2(.48,1.03),new THREE.Vector2(.34,1.18)
  ],24);
  add(rig,coat,M.night,[0,.74,0]);
  // Chest panels, seams and a bright chest insignia make the torso readable at range.
  plate(rig,M.steel,[-.18,1.62,.27],[.22,.16,.105]);
  plate(rig,M.steel,[.18,1.62,.27],[.22,.16,.105]);
  box(rig,M.gold,[0,1.54,.37],[.055,.42,.035]);
  ring(rig,M.gold,0,1.05,.02,.37,0);
  box(rig,M.black,[0,.89,0],[.62,.25,.46]);
  for(const side of [-1,1]){
    box(rig,M.gold,[side*.18,.91,.245],[.08,.16,.035]);
    const shoulder=plate(rig,M.steel,[side*.49,1.79,0],[.32,.22,.30],[0,0,side*.13]);
    plate(rig,M.gold,[side*.49,1.81,.245],[.17,.045,.055]);
    // Articulated shoulders -> elbows -> wrists, each with visible joint breaks.
  }
  const arms=[],legs=[],shoulders=[];
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.48,1.78,0);rig.add(shoulder);
    plate(shoulder,M.steel,[0,0,0],[.29,.24,.30]);
    capsule(shoulder,M.black,[0,-.29,0],.145,.27);
    smooth(shoulder,M.gold,[0,-.50,.02],[.17,.16,.17]);
    capsule(shoulder,M.steel,[0,-.75,.035],.125,.25,[.08,0,0]);
    cyl(shoulder,M.gold,[0,-.88,.07],.15,.075,[Math.PI/2,0,0]);
    capsule(shoulder,M.black,[0,-1.02,.12],.13,.10);
    arms.push(shoulder);shoulders.push(shoulder);
    const hip=new THREE.Group();hip.position.set(side*.22,.91,0);rig.add(hip);
    capsule(hip,M.night,[0,-.25,0],.17,.28);
    smooth(hip,M.gold,[0,-.50,.01],[.18,.15,.18]);
    capsule(hip,M.steel,[0,-.76,0],.135,.27);
    cyl(hip,M.gold,[0,-.91,.025],.15,.07);
    capsule(hip,M.black,[0,-1.02,.12],.17,.12);
    box(hip,M.steel,[0,-1.09,.17],[.34,.07,.34]);
    legs.push(hip);
  }
  // Split coat tails move separately, rather than reading as a single block.
  const tailShape=new THREE.Shape();tailShape.moveTo(-.18,0);tailShape.lineTo(.18,0);tailShape.lineTo(.30,-.74);tailShape.lineTo(0,-.59);tailShape.lineTo(-.28,-.77);tailShape.closePath();
  const tailGeo=new THREE.ShapeGeometry(tailShape);
  const coatTails=[];
  for(const side of [-1,1]){
    const tail=add(rig,tailGeo,side<0?M.black:M.night,[side*.18,.89,-.29]);
    tail.rotation.y=side*.15;coatTails.push(tail);
    box(rig,M.gold,[side*.32,1.24,.15],[.12,.09,.07],[0,0,side*.3]);
  }
  const head=new THREE.Group();head.position.set(0,2.03,0);rig.add(head);
  makeFace(head,M.steel,M.aqua,M.night);
  // Distinctive wide-brim cap silhouette, with layered band and small star crest.
  cyl(head,M.black,[0,.29,-.01],.29,.29);
  cyl(head,M.steel,[0,.18,.01],.37,.075);
  const brim=add(head,G.torus,M.black,[0,.17,0],[.48,.48,.48],[Math.PI/2,0,0]);
  box(head,M.gold,[0,.29,.34],[.30,.075,.045]);
  const star=add(head,new THREE.OctahedronGeometry(.11,0),M.brightGold,[0,.31,.38],[1,.7,.36],[0,0,Math.PI/4]);
  return Object.assign(root,{userData:{rig:{root:rig,head,arms,legs,coatTails,star}}});
}
function makeStand(){
  const root=new THREE.Group();root.position.set(1.52,0,-.05);hero.add(root);
  const rig=new THREE.Group();root.add(rig);
  const torso=new THREE.LatheGeometry([
    new THREE.Vector2(.20,0),new THREE.Vector2(.28,.13),new THREE.Vector2(.34,.42),
    new THREE.Vector2(.46,.72),new THREE.Vector2(.43,.92),new THREE.Vector2(.28,1.12)
  ],24);
  add(rig,torso,M.purple,[0,.66,0]);
  plate(rig,M.lavender,[0,1.42,.31],[.30,.27,.11]);
  for(const side of [-1,1]){
    plate(rig,M.lavender,[side*.17,1.47,.31],[.19,.15,.10]);
    box(rig,M.gold,[side*.30,1.00,.17],[.09,.20,.07]);
    smooth(rig,M.gold,[side*.21,.83,.31],[.055,.065,.04]);
  }
  box(rig,M.black,[0,.71,0],[.62,.17,.49]);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.46,1.53,0);rig.add(arm);
    plate(arm,M.lavender,[0,0,0],[.30,.24,.29]);
    capsule(arm,M.purple,[0,-.28,0],.16,.27);
    smooth(arm,M.gold,[0,-.48,.03],[.18,.16,.18]);
    capsule(arm,M.purple,[0,-.72,.04],.14,.26);
    cyl(arm,M.gold,[0,-.87,.10],.17,.075,[Math.PI/2,0,0]);
    smooth(arm,M.lavender,[0,-1.02,.12],[.18,.16,.19]);
    arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.20,.72,0);rig.add(leg);
    capsule(leg,M.purple,[0,-.23,0],.16,.25);
    smooth(leg,M.gold,[0,-.46,.015],[.17,.14,.16]);
    capsule(leg,M.purple,[0,-.68,0],.13,.24);
    capsule(leg,M.black,[0,-.91,.11],.18,.11);
    legs.push(leg);
  }
  const head=new THREE.Group();head.position.set(0,1.79,0);rig.add(head);
  makeFace(head,M.purple,M.brightGold,M.black);
  // Crown-like hair blades and a forehead band define Star Platinum's own profile.
  const hair=[];
  for(let i=0;i<7;i++){
    const x=(i-3)*.09;
    const spike=cone(head,i%2?M.purple:M.lavender,[x,.42,-.01],.105,.42,[0,0,(3-i)*.12]);
    hair.push(spike);
  }
  box(head,M.gold,[0,.12,.28],[.61,.12,.09]);
  const headgem=smooth(head,M.aqua,[0,.12,.34],[.075,.06,.035]);
  for(const side of [-1,1]){
    plate(rig,M.gold,[side*.57,1.52,.05],[.13,.09,.13]);
  }
  // Short gold-linked belt and segmented greaves.
  for(let i=-2;i<=2;i++)smooth(rig,M.gold,[i*.12,.70,.27],[.04,.05,.035]);
  root.scale.setScalar(.87);
  return {root,rig,torso:rig,arms,legs,head,hair,headgem};
}
function makeEnemy(){
  const root=new THREE.Group();scene.add(root);
  const rig=new THREE.Group();root.add(rig);
  const core=new THREE.LatheGeometry([
    new THREE.Vector2(.22,0),new THREE.Vector2(.33,.10),new THREE.Vector2(.27,.34),
    new THREE.Vector2(.36,.62),new THREE.Vector2(.55,.82),new THREE.Vector2(.46,1.02),new THREE.Vector2(.28,1.17)
  ],20);
  add(rig,core,M.crimson,[0,.69,0]);
  const arms=[],legs=[],horns=[];
  // Heavy segmented mantle, broken asymmetrically so the enemy has a unique outline.
  plate(rig,M.black,[-.48,1.69,0],[.35,.24,.37],[0,0,-.12]);
  plate(rig,M.crimson,[.48,1.70,0],[.28,.20,.31],[0,0,.15]);
  for(const side of [-1,1]){
    box(rig,M.gold,[side*.18,1.57,.30],[.085,.31,.06],[0,0,side*.25]);
    const arm=new THREE.Group();arm.position.set(side*.48,1.65,0);rig.add(arm);
    plate(arm,side<0?M.black:M.crimson,[0,0,0],[.32,.24,.31]);
    capsule(arm,M.crimson,[0,-.30,0],.17,.28);
    smooth(arm,M.gold,[0,-.51,.03],[.19,.15,.18]);
    capsule(arm,M.black,[0,-.78,.04],.15,.28);
    cyl(arm,M.gold,[0,-.94,.08],.18,.08,[Math.PI/2,0,0]);
    smooth(arm,M.crimson,[0,-1.09,.12],[.19,.18,.21]);
    arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.23,.88,0);rig.add(leg);
    capsule(leg,M.black,[0,-.24,0],.18,.26);
    smooth(leg,M.crimson,[0,-.50,.02],[.19,.16,.18]);
    capsule(leg,M.crimson,[0,-.76,0],.15,.27);
    capsule(leg,M.black,[0,-1.02,.12],.20,.12);
    legs.push(leg);
  }
  const head=new THREE.Group();head.position.set(0,1.95,0);rig.add(head);
  makeFace(head,M.black,M.enemyGlow,M.crimson);
  // Pale split mask with a brow ridge; crimson crown horns break the human silhouette.
  plate(head,M.steel,[0,-.02,.24],[.21,.19,.08]);
  for(let i=0;i<5;i++){
    const x=(i-2)*.14;
    const horn=cone(head,i%2?M.crimson:M.gold,[x,.36,-.04],.11,.46,[0,0,(2-i)*.10]);
    horns.push(horn);
  }
  for(const side of [-1,1]){
    plate(rig,M.black,[side*.34,.64,-.06],[.11,.26,.17],[0,0,side*.30]);
  }
  const warn=ring(root,M.enemyGlow,0,.12,0,1.18);
  warn.visible=false;
  const aura=ring(root,M.crimson,0,.10,0,1.02);
  return {root,rig,arms,legs,head,horns,warn,aura,deathAt:-1};
}
const obstaclesRay=new THREE.Raycaster();
createArena();
const hero=createHero(),stand=makeStand(),enemyModel=makeEnemy();
const echoActor=hero.clone(true);
echoActor.traverse(node=>{if(node.isMesh){
  const makeGhost=material=>{const ghost=material.clone();ghost.transparent=true;ghost.opacity=.28;ghost.depthWrite=false;ghost.emissive?.set(0x8b42ff);ghost.emissiveIntensity=.7;return ghost;};
  node.material=Array.isArray(node.material)?node.material.map(makeGhost):makeGhost(node.material);
}});
echoActor.visible=false;scene.add(echoActor);
const heroShadow=add(scene,new THREE.CircleGeometry(.65,26),new THREE.MeshBasicMaterial({color:0x050313,transparent:true,opacity:.46,depthWrite:false}),[0,.065,0],[1,1,1],[-Math.PI/2,0,0]);
const enemyShadow=add(scene,new THREE.CircleGeometry(.8,26),new THREE.MeshBasicMaterial({color:0x080212,transparent:true,opacity:.45,depthWrite:false}),[0,.060,0],[1,1,1],[-Math.PI/2,0,0]);

const keys=new Set();
const state={
  running:false,paused:false,dead:false,victory:false,pointerLocked:false,started:false,
  hp:100,maxHp:100,stand:30,level:1,xp:0,kills:0,wave:1,combo:0,
  attack:null,ultimate:null,stopRemaining:0,dodgeTime:0,dodgeCooldown:0,invuln:0,
  arenaTime:0,shake:0,impactTimer:0,enemyRespawn:-1,toastUntil:0,hitstop:0,comboExpiresAt:0,hitFlash:0,
  echoSlow:0,chronoEcho:null,lastStrike:{damage:12,heavy:false},anchorPulseTimer:3.8,anchorWave:null,anchorWaveIndex:0,
  enemy:createEnemy(),enemyPosition:v(0,0,-6.0),
  facing:v(0,0,-1),yaw:0,pitch:.22,
  moveVelocity:v(0,0,0),audioContext:null,frameCounter:0,frameAccum:0,
  playerPos:v(0,0,6)
};
function placeEnemy(){
  const index=state.wave%6;
  const a=index*1.047+Math.PI;
  const r=6.8+(index%3)*1.5;
  state.enemy=createEnemy(state.wave,isBossWave(state.wave));
  state.enemyPosition.set(Math.sin(a)*r,0,Math.cos(a)*r);
  enemyModel.root.visible=true;
  enemyModel.root.scale.setScalar(state.enemy.boss?1.58:1);
  enemyModel.root.position.y=0;enemyModel.rig.rotation.set(0,0,0);enemyModel.deathAt=-1;enemyModel.deathFall=0;
  enemyModel.aura.material=state.enemy.boss?M.enemyGlow:M.purple;
  enemyModel.aura.scale.setScalar(state.enemy.boss?1.6:1);
  enemyShadow.visible=true;
  enemyModel.warn.visible=false;
  enemyModel.root.position.copy(state.enemyPosition);
  UI.enemyFill.style.transform='scaleX(1)';
}
function reset(){
  if(audioEndTimer){clearTimeout(audioEndTimer);audioEndTimer=null;}
  footstepTimer=0;
  state.running=true;state.dead=false;state.victory=false;state.paused=false;state.started=true;
  Object.assign(state,{hp:100,maxHp:100,stand:30,level:1,xp:0,kills:0,wave:1,combo:0,
    attack:null,ultimate:null,stopRemaining:0,dodgeTime:0,dodgeCooldown:0,invuln:0,
    enemyRespawn:-1,arenaTime:0,shake:0,impactTimer:0,hitstop:0,comboExpiresAt:0,toastUntil:0});
  state.playerPos.set(0,0,6);state.facing.set(0,0,-1);
  state.yaw=0;state.pitch=.22;
  state.moveVelocity.set(0,0,0);keys.clear();
  state.echoSlow=0;state.chronoEcho=null;echoActor.visible=false;state.hitFlash=0;
  state.anchorPulseTimer=3.8;if(state.anchorWave){scene.remove(state.anchorWave.mesh);state.anchorWave.mesh.geometry.dispose();state.anchorWave.mesh.material.dispose();}state.anchorWave=null;state.anchorWaveIndex=0;
  timeAnchors.forEach(anchor=>{anchor.active=true;anchor.crystal.visible=true;anchor.halo.visible=true;anchor.rune.material=M.lavender;anchor.root.scale.setScalar(1)});
  hero.rotation.y=Math.PI;placeEnemy();UI.gameover.hidden=true;UI.victory.hidden=true;UI.pause.hidden=true;
  UI.impact.classList.remove('show');UI.toast.classList.remove('visible');
  stand.arms.forEach(arm=>{arm.rotation.x=0;});
  state.ultimate=null;
  UI.intro.hidden=true;
  audio.start();
  updateHud();
}
function resume(){
  if(state.dead)return;
  state.paused=false;state.running=true;UI.pause.hidden=true;UI.intro.hidden=true;
  keys.clear();requestPointerLock();audio.start();
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
  audio.setActive(false);
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
}
function gameOver(){
  state.dead=true;state.running=false;keys.clear();
  UI.gameover.hidden=false;UI.endStats.textContent='Verslagen vijanden: '+state.kills+' · Level '+state.level+' · Wave '+state.wave+'. Je kunt de arena opnieuw proberen.';
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  audio.play('enemy-hit',.72);audioEndTimer=setTimeout(()=>audio.setActive(false),700);
}
function completeMission(){
  state.victory=true;state.running=false;keys.clear();
  UI.victoryStats.textContent='Chrono Shade verslagen · '+state.kills+' overwinningen · level '+state.level+'. Je hebt de Ruined Clock District bevrijd.';
  UI.victory.hidden=false;
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  audio.play('time-resume',.72);setTimeout(()=>audio.play('stand-summon',.28),280);audioEndTimer=setTimeout(()=>audio.setActive(false),1900);
}
UI.start.addEventListener('click',start);
UI.resume.addEventListener('click',resume);
UI.retry.addEventListener('click',()=>{reset();requestPointerLock()});
UI.victoryRetry.addEventListener('click',()=>{reset();requestPointerLock()});
document.addEventListener('pointerlockchange',()=>{
  const was=state.pointerLocked;
  state.pointerLocked=document.pointerLockElement===renderer.domElement;
  if(was&&!state.pointerLocked&&!state.dead&&!state.victory&&state.running)pause();
});
window.addEventListener('keydown',event=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(event.code==='Escape'){if(!state.pointerLocked){if(state.paused)resume();else pause();}return;}
  keys.add(event.code);
  if(event.repeat)return;
  if(event.code==='KeyQ')beginOra();
  if(event.code==='KeyT')timeStop();
  if(event.code==='KeyF')interactAnchor();
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
  if(state.moveVelocity.length()>.8){
    footstepTimer-=dt;
    if(footstepTimer<=0){audio.play('stone-steps',state.dodgeTime>0?.24:.18);footstepTimer=state.dodgeTime>0?.24:.56;}
  }else footstepTimer=0;
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
  state.shake=.05;
  const perfect=state.enemy.state==='windup'&&state.enemy.timer<=.46;
  if(perfect){
    state.stand=clamp(state.stand+18,0,100);state.echoSlow=.22;
    state.chronoEcho={age:0,damage:state.lastStrike.damage,heavy:state.lastStrike.heavy,triggered:false,from:state.playerPos.clone()};
    banner('PERFECT DODGE · CHRONO ECHO!',1.35);impact('CHRONO ECHO',.28);
  }
  audio.play(perfect?'chrono-echo':'dash-whoosh',perfect?.82:.56,Math.max(-.65,Math.min(.65,state.moveVelocity.x*.08)));
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
  audio.play(heavy?'punch-heavy':'dash-whoosh',heavy?.32:.20);
}
function enemyHit(damage,heavy=false){
  if(state.enemy.dead)return false;
  const landed=withinAttackCone(state.playerPos,state.facing,state.enemyPosition,heavy?3.55:RULES.meleeRange);
  if(!landed){impact('MISS',.23);return false;}
  if(state.enemy.type==='iron-guard'&&!heavy&&state.enemy.state!=='windup'&&state.enemy.state!=='stagger'){
    state.stand=clamp(state.stand+2,0,100);impact('GUARD · RMB BREAKS',.30);banner('THE GUARD IS UP — BREAK IT WITH RMB',1.1);audio.play('punch-heavy',.32);return false;
  }
  state.lastStrike={damage,heavy};
  let appliedDamage=damage;
  if(state.enemy.boss){
    const anchorsOn=timeAnchors.some(anchor=>anchor.active);
    if(anchorsOn)appliedDamage*=.62;
    if(state.enemy.state==='recover')appliedDamage*=1.55;
  }
  const result=damageEnemy(state.enemy,appliedDamage,heavy?.55:.22);
  state.stand=clamp(state.stand+(heavy?10:8),0,100);
  state.shake=Math.max(state.shake,heavy?.20:.12);
  state.hitstop=heavy?.085:.045;state.hitFlash=.28;
  impact(heavy?'HEAVY IMPACT':'+'+Math.floor(result.dealt)+' DMG',.25);
  makeBurst(state.enemyPosition,heavy?0xffd48f:0xd99aff,heavy?16:10);
  audio.play(heavy?'punch-heavy':'punch-light',heavy?.92:.62,Math.max(-.75,Math.min(.75,(state.enemyPosition.x-state.playerPos.x)*.07)));
  if(result.killed){
    state.kills++;
    const defeatedBoss=state.enemy.boss;
    const leveled=grantXP(state,defeatedBoss?260:42+Math.floor(state.wave*4));
    if(leveled)banner('LEVEL UP — LV '+state.level,2.1);else banner('ENEMY DEFEATED +XP',1.5);
    state.combo=0;state.comboExpiresAt=0;
    enemyModel.deathAt=state.arenaTime;enemyShadow.visible=false;
    const mission=resolveDefeat(state.wave,defeatedBoss);
    if(mission.completed){completeMission();}
    else {state.wave=mission.nextWave;state.enemyRespawn=2.1;}
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
  const phase=a?clamp(a.elapsed/a.duration,0,1):0;
  const swing=a?Math.sin(Math.PI*phase):0;
  const moving=clamp(state.moveVelocity.length()/6.5,0,1);
  const gait=Math.sin(time*(moving>.72?13:9));
  const heroRig=hero.userData.rig;
  const dodge=state.dodgeTime>0;
  const hurt=state.hitFlash>0?state.hitFlash/.32:0;
  const aim=heroRig.arms;
  for(let i=0;i<2;i++){
    const side=i===0?-1:1;
    const target=a?(a.heavy?-1.05*swing:i===a.stage%2?-1.52*swing:.22):
      u?-1.15*Math.sin(time*40+i*Math.PI):
      dodge?-1.05:
      .08+gait*.42*moving*side;
    aim[i].rotation.x=THREE.MathUtils.damp(aim[i].rotation.x,target,14,dt);
    aim[i].rotation.z=THREE.MathUtils.damp(aim[i].rotation.z,(a?.15*swing*side:0)+(dodge?side*.28:0),13,dt);
    heroRig.legs[i].rotation.x=THREE.MathUtils.damp(heroRig.legs[i].rotation.x,dodge?-.35:gait*.55*moving*side,12,dt);
    stand.legs[i].rotation.x=THREE.MathUtils.damp(stand.legs[i].rotation.x,u?gait*.16: gait*.28*moving*side,11,dt);
  }
  heroRig.root.rotation.x=THREE.MathUtils.damp(heroRig.root.rotation.x,
    state.dead?-.72:a?-.12*swing:dodge?-.24:moving>.05?-.035*moving:0,9,dt);
  heroRig.root.rotation.z=THREE.MathUtils.damp(heroRig.root.rotation.z,
    state.dead?-.28:dodge?-.18*Math.sign(state.moveVelocity.x||1):hurt*.2,10,dt);
  heroRig.head.rotation.x=THREE.MathUtils.damp(heroRig.head.rotation.x,a?.07*swing:0,10,dt);
  heroRig.coatTails.forEach((tail,i)=>{tail.rotation.x=-.12+gait*.12*moving;tail.rotation.z=(i?1:-1)*(.12+gait*.08*moving)});
  heroRig.star.rotation.y=time*.6;
  stand.arms[0].rotation.x=THREE.MathUtils.damp(stand.arms[0].rotation.x,
    a&&a.stage%2===1?-1.9*swing:u?-1.35*Math.sin(time*41):.08+gait*.12*moving,15,dt);
  stand.arms[1].rotation.x=THREE.MathUtils.damp(stand.arms[1].rotation.x,
    a&&a.stage%2!==1?-1.9*swing:u?-1.35*Math.sin(time*41+Math.PI):.08-gait*.12*moving,15,dt);
  stand.root.position.y=Math.sin(time*2.4)*.055+(u?.10:0)+(a?.08*swing:0);
  stand.root.position.z=-.05-(a?.22*swing:0)-(u?.25:0);
  stand.root.rotation.z=Math.sin(time*1.9)*.035+(a?.07*swing:0);
  stand.root.scale.setScalar(u?1.0:.87);
  // Telegraph: the enemy visibly cocks its arms and leans before a strike.
  const windup=state.enemy.state==='windup'?clamp((.8-state.enemy.timer)/.8,0,1):0;
  const recover=state.enemy.state==='recover'?1:0;
  const stagger=state.enemy.state==='stagger'?1:0;
  const enemyWalk=state.enemy.state==='chase'||state.enemy.state==='patrol';
  for(let i=0;i<2;i++){
    const side=i===0?-1:1;
    let target=enemyWalk?Math.sin(time*10+i*Math.PI)*.38:0;
    if(windup)target+=(i===0?-.95:.15)*windup;
    if(recover)target=i===0?1.0:-.25;
    if(stagger)target=(i===0?.65:-.65)+Math.sin(time*35)*.08;
    enemyModel.arms[i].rotation.x=THREE.MathUtils.damp(enemyModel.arms[i].rotation.x,target,9,dt);
    enemyModel.legs[i].rotation.x=THREE.MathUtils.damp(enemyModel.legs[i].rotation.x,enemyWalk?Math.sin(time*10+i*Math.PI)*.3:0,8,dt);
  }
  enemyModel.rig.rotation.x=THREE.MathUtils.damp(enemyModel.rig.rotation.x,
    windup?-.10*windup:recover?.12:stagger?.18*Math.sin(time*34):0,8,dt);
  enemyModel.head.rotation.x=THREE.MathUtils.damp(enemyModel.head.rotation.x,windup?-.12*windup:stagger?.08:0,8,dt);
  let fall=0;
  if(state.enemy.dead&&enemyModel.deathAt>=0){
    enemyModel.deathFall=clamp((enemyModel.deathFall||0)+dt/.72,0,1);
    fall=enemyModel.deathFall;
    enemyModel.rig.rotation.z=-.95*fall;
  }
  // Stand, hero, and enemy each retain a clear ground shadow and spacing cue.
  enemyModel.root.position.y=state.enemy.dead?- .7*fall:state.enemyPosition.y+Math.sin(time*2.5)*.035;
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
  banner('STAR PLATINUM — ORA ORA!',2.2);audio.play('stand-summon',.72);
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
  state.shake=.18;audio.play('time-stop',.86);
}
function interactAnchor(){
  if(!state.running)return;
  const anchor=timeAnchors.filter(a=>a.active).sort((a,b)=>Math.hypot(a.x-state.playerPos.x,a.z-state.playerPos.z)-Math.hypot(b.x-state.playerPos.x,b.z-state.playerPos.z))[0];
  if(!anchor||Math.hypot(anchor.x-state.playerPos.x,anchor.z-state.playerPos.z)>3.25){
    banner('MOVE CLOSE TO A TIME ANCHOR · PRESS F',1.05);return;
  }
  anchor.active=false;anchor.crystal.visible=false;anchor.halo.visible=false;anchor.rune.material=M.detail;
  anchor.root.scale.setScalar(.84);state.stand=clamp(state.stand+10,0,100);
  const remaining=timeAnchors.filter(a=>a.active).length;
  banner(remaining?'TIME ANCHOR DISABLED · '+remaining+' REMAINING':'ALL ANCHORS OFF · CHRONO SHADE EXPOSED',1.8);
  impact('TIME ANCHOR '+(anchor.index+1)+' DISABLED',.35);audio.play('time-resume',.55);updateHud();
}
function updateAnchors(dt){
  for(const anchor of timeAnchors){
    if(anchor.active){anchor.crystal.rotation.y+=dt*(.7+anchor.index*.12);anchor.crystal.position.y=1.03+Math.sin(state.arenaTime*2+anchor.index)*.09;}
  }
  const active=timeAnchors.filter(a=>a.active);
  if(state.anchorWave){
    const wave=state.anchorWave;
    if(state.stopRemaining<=0)wave.age+=dt;
    const progress=clamp(wave.age/wave.duration,0,1),radius=wave.maxRadius*progress;
    wave.mesh.scale.setScalar(Math.max(.01,radius));wave.mesh.material.opacity=.68*(1-progress);
    const playerDistance=Math.hypot(state.playerPos.x-wave.x,state.playerPos.z-wave.z);
    if(!wave.hit&&Math.abs(playerDistance-radius)<.62&&state.stopRemaining<=0&&state.invuln<=0){
      wave.hit=true;state.hp=Math.max(0,state.hp-14);state.invuln=.55;state.hitFlash=.3;state.shake=.16;
      impact('TIME WAVE · SHIFT DODGE',.32);audio.play('enemy-hit',.72);if(state.hp<=0)gameOver();
    }
    if(wave.age>=wave.duration){scene.remove(wave.mesh);wave.mesh.geometry.dispose();wave.mesh.material.dispose();state.anchorWave=null;}
  }else if(active.length&&state.arenaTime>=state.anchorPulseTimer){
    const anchor=active[state.anchorWaveIndex++%active.length];
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.105,8,56),new THREE.MeshBasicMaterial({color:0x83dfff,transparent:true,opacity:.68,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(anchor.x,.105,anchor.z);scene.add(mesh);
    state.anchorWave={mesh,x:anchor.x,z:anchor.z,age:0,duration:1.45,maxRadius:10.5,hit:false};
    state.anchorPulseTimer=state.arenaTime+5.6;banner('TIME WAVE · STOP TIME OR DODGE THROUGH',1.1);audio.play('enemy-telegraph',.65);
  }
}
function updateChronoEcho(dt){
  const echo=state.chronoEcho;state.echoSlow=Math.max(0,state.echoSlow-dt);
  if(!echo){echoActor.visible=false;return;}
  echo.age+=dt;const direction=v(state.enemyPosition.x-echo.from.x,0,state.enemyPosition.z-echo.from.z).normalize();
  const flank=v(-direction.z,0,direction.x).multiplyScalar(.75);
  const destination=state.enemyPosition.clone().addScaledVector(direction,-1.6).add(flank);
  const progress=clamp(echo.age/.34,0,1);
  echoActor.visible=echo.age<.78;echoActor.position.copy(echo.from).lerp(destination,progress);echoActor.position.y=.10+Math.sin(echo.age*22)*.08;
  echoActor.rotation.y=Math.atan2(direction.x,direction.z);
  echoActor.scale.setScalar(1+Math.sin(echo.age*35)*.035);
  if(!echo.triggered&&echo.age>=.34){
    echo.triggered=true;
    const oldPosition=state.playerPos.clone(),oldFacing=state.facing.clone();
    state.playerPos.copy(echoActor.position);state.facing.set(direction.x,0,direction.z);
    enemyHit(Math.max(10,echo.damage*.72),echo.heavy);
    state.playerPos.copy(oldPosition);state.facing.copy(oldFacing);
  }
  if(echo.age>=.82){state.chronoEcho=null;echoActor.visible=false;}
}
function updateEnemy(dt){
  if(state.enemy.dead){
    if(state.enemyRespawn>0){
      state.enemyRespawn-=dt;
      if(state.enemyRespawn<=0){placeEnemy();banner(isBossWave(state.wave)?'FINAL WAVE — CHRONO SHADE!':'WAVE '+state.wave+' / '+MISSION_WAVES+' — NEW CHALLENGER!',2);}
    }
    return;
  }
  const ratio=state.enemy.hp/state.enemy.maxHp;
  const phase=state.enemy.boss?(ratio<=.34?3:ratio<=.67?2:1):1;
  if(phase!==state.enemy.phase){
    state.enemy.phase=phase;state.enemy.speed=1.72+(phase-1)*.62;state.enemy.damageScale=1+(phase-1)*.22;
    banner(phase===2?'CHRONO SHADE · FRACTURE PHASE':'CHRONO SHADE · LAST TIMELINE',2.1);state.shake=.24;
  }
  const wasWindup=state.enemy.state==='windup';
  const frozen=state.stopRemaining>0||state.echoSlow>0;
  const result=stepEnemy(state.enemy,state.enemyPosition,state.playerPos,dt,frozen);
  if(result.telegraph&&!wasWindup)audio.play('enemy-telegraph',.65,Math.max(-.7,Math.min(.7,(state.enemyPosition.x-state.playerPos.x)*.06)));
  state.enemyPosition.x+=result.x;state.enemyPosition.z+=result.z;
  enforceArena(state.enemyPosition,16.6);
  enemyModel.root.position.x=state.enemyPosition.x;enemyModel.root.position.z=state.enemyPosition.z;
  const dx=state.playerPos.x-state.enemyPosition.x,dz=state.playerPos.z-state.enemyPosition.z;
  enemyModel.root.rotation.y=Math.atan2(dx,dz);
  enemyModel.warn.visible=result.telegraph||state.enemy.state==='windup';
  enemyModel.warn.scale.setScalar(.95+Math.sin(state.arenaTime*23)*.12);
  if(result.attack&&state.invuln<=0){
    state.hp=Math.max(0,state.hp-Math.ceil(state.enemy.damage*state.enemy.damageScale));
    state.hitFlash=.34;state.shake=.22;state.invuln=.52;impact('HIT · '+Math.ceil(state.enemy.damage*state.enemy.damageScale),.28);audio.play('enemy-hit',.88,Math.max(-.7,Math.min(.7,(state.enemyPosition.x-state.playerPos.x)*.06)));
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
  UI.enemyTitle.textContent=state.enemy.boss?'CHRONO SHADE · PHASE '+state.enemy.phase:
    state.enemy.type==='rift-stalker'?'RIFT STALKER':state.enemy.type==='iron-guard'?'IRON GUARD':state.enemy.type==='clock-adept'?'CLOCK ADEPT':'TIME WRAITH';
  if(UI.anchors){const active=timeAnchors.filter(anchor=>anchor.active).length;UI.anchors.textContent='TIME ANCHORS '+active+'/3'+(state.enemy.boss&&active===0?' · BOSS EXPOSED':' · F TO DISABLE');}
  UI.kills.innerHTML=state.kills+' <small>KILLS</small>';
  UI.wave.textContent='WAVE '+String(Math.min(state.wave,MISSION_WAVES)).padStart(2,'0')+' / '+MISSION_WAVES;
  UI.combo.textContent='COMBO ×'+(state.combo%3);
  UI.ora.classList.toggle('ready',state.stand>=RULES.oraCost);
  UI.stop.classList.toggle('ready',state.stand>=RULES.timeStopCost);
  UI.time.hidden=state.stopRemaining<=0;
  UI.timeCount.textContent=state.stopRemaining.toFixed(1)+'s';
  UI.objective.textContent=state.enemy.dead?(isBossWave(state.wave)?'Chrono Shade verslagen.':state.wave===MISSION_WAVES-1?'Laatste golf nadert: de Chrono Shade.':'Volgende golf nadert.'):state.enemy.boss?(timeAnchors.some(anchor=>anchor.active)?'Schakel de tijdankers uit; RMB breekt de verdediging.':'De Chrono Shade is kwetsbaar tijdens herstel.'):
    state.enemy.type==='iron-guard'?'Bewaar RMB voor de verdediging; Shift ontwijkt de aanval.':
    state.enemy.state==='windup'?'Gevaar! De vijand bereidt een aanval voor. Dodge met Shift.':
    'Herken de aanval, ontwijk en counter met je Stand.';
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
    const stopWasActive=state.stopRemaining>0;
    state.stopRemaining=Math.max(0,state.stopRemaining-dt);
    if(stopWasActive&&state.stopRemaining===0)audio.play('time-resume',.78);
    state.hitFlash=Math.max(0,state.hitFlash-dt);
    state.shake=Math.max(0,state.shake-dt*.85);
    state.hitstop=Math.max(0,state.hitstop-dt);
    state.impactTimer=Math.max(0,state.impactTimer-dt);
    if(state.impactTimer===0)UI.impact.classList.remove('show');
    if(state.arenaTime>=state.toastUntil)UI.toast.classList.remove('visible');
    if(state.combo&&state.arenaTime>=state.comboExpiresAt)state.combo=0;
    movePlayer(dt);
    updateChronoEcho(dt);
    updateAttack(dt);
    updateOra(dt);
    if(state.hitstop<=0)updateEnemy(dt);
    updateAnchors(dt);
    updateEffects(dt);
    animated.forEach(f=>f(dt,state.arenaTime));
    updateHud();
  }
  animateStand(dt);
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
  started:state.started,running:state.running,paused:state.paused,dead:state.dead,victory:state.victory,
  hp:state.hp,stand:state.stand,enemyHp:state.enemy.hp,enemyState:state.enemy.state,
  kills:state.kills,wave:state.wave,missionWaves:MISSION_WAVES,boss:state.enemy.boss,level:state.level,stop:state.stopRemaining,
  combo:state.combo,attackActive:!!state.attack,ultimateActive:!!state.ultimate,
  pointerLocked:state.pointerLocked,enemyVisible:enemyModel.root.visible,anchors:timeAnchors.filter(anchor=>anchor.active).length,audio:audio.snapshot(),
  player:{x:state.playerPos.x,z:state.playerPos.z},
  camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z}
})});
updateCamera(.1);
updateHud();
requestAnimationFrame(loop);

