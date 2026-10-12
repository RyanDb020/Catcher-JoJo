import {RULES, MISSION_WAVES, isBossWave, resolveDefeat, clamp, createEnemy, damageEnemy, enforceArena, grantXP, xpRequired, stepEnemy, withinAttackCone} from './rules.mjs?v=1.3.0';
import {createCombatAudio} from './audio.mjs?v=1.3.0';
const audio=createCombatAudio();

// Playable Canvas2D backup for browsers without a working WebGL context.
const $=id=>document.getElementById(id);
const ui={viewport:$('viewport'),intro:$('intro'),pause:$('pause'),gameover:$('gameover'),victory:$('victory'),fatal:$('fatal'),
  start:$('start-btn'),resume:$('resume-btn'),retry:$('retry-btn'),victoryRetry:$('victory-retry-btn'),loading:$('loading-note'),
  hpFill:$('hp-fill'),energyFill:$('energy-fill'),xpFill:$('xp-fill'),enemyFill:$('enemy-fill'),hp:$('hp-num'),energy:$('energy-num'),xp:$('xp-num'),enemyHp:$('enemy-hp-num'),
  level:$('level'),kills:$('score-num'),wave:$('wave-num'),combo:$('combo-num'),objective:$('objective-text'),enemyTitle:$('enemy-title'),ora:$('ora-ready'),stop:$('stop-ready'),
  impact:$('impact-label'),toast:$('toast'),time:$('time-indicator'),timeCount:$('time-count'),fps:$('fps'),endStats:$('end-stats'),victoryStats:$('victory-stats'),anchors:$('anchor-status')};
const canvas=document.createElement('canvas');canvas.id='combat-canvas';canvas.setAttribute('aria-label','Canvas2D combat arena fallback');
Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0'});ui.viewport.appendChild(canvas);
const ctx=canvas.getContext('2d');
const state={started:false,running:false,paused:false,dead:false,victory:false,hp:100,maxHp:100,stand:30,level:1,xp:0,kills:0,wave:1,combo:0,
  x:0,z:6,faceX:0,faceZ:-1,enemy:null,ex:0,ez:-5,attack:null,attackCooldown:0,invuln:0,stop:0,dash:0,dashCooldown:0,enemyRespawn:-1,arenaTime:0,last:0,fps:60,echoSlow:0,lastStrike:{damage:20,heavy:false},chronoEcho:null,anchorWave:0,anchors:[{x:-6,z:-2,active:true},{x:7,z:-5,active:true},{x:0,z:-13,active:true}]};
const keys=new Set(),effects=[];let pointer={x:innerWidth/2,y:innerHeight/2},lastFrame=performance.now(),frames=0,fpsAt=lastFrame;
function resize(){const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);ctx.setTransform(d,0,0,d,0,0)}
window.addEventListener('resize',resize);resize();
function placeEnemy(){const a=(state.wave%6)*Math.PI/3+Math.PI;const r=8+(state.wave%3)*1.1;state.enemy=createEnemy(state.wave,isBossWave(state.wave));state.ex=Math.sin(a)*r;state.ez=Math.cos(a)*r;const d=Math.hypot(state.ex-state.x,state.ez-state.z)||1;state.faceX=(state.ex-state.x)/d;state.faceZ=(state.ez-state.z)/d;}
placeEnemy();
function banner(message,seconds=1.5){ui.toast.textContent=message;ui.toast.classList.add('visible');setTimeout(()=>ui.toast.classList.remove('visible'),seconds*1000)}
function impact(message){ui.impact.textContent=message;ui.impact.classList.add('show');setTimeout(()=>ui.impact.classList.remove('show'),350)}
function reset(){Object.assign(state,{started:true,running:true,paused:false,dead:false,victory:false,hp:100,maxHp:100,stand:30,level:1,xp:0,kills:0,wave:1,combo:0,x:0,z:6,faceX:0,faceZ:-1,attack:null,attackCooldown:0,invuln:0,stop:0,dash:0,dashCooldown:0,enemyRespawn:-1,arenaTime:0,echoSlow:0,lastStrike:{damage:20,heavy:false},chronoEcho:null,anchorWave:0,anchors:[{x:-6,z:-2,active:true},{x:7,z:-5,active:true},{x:0,z:-13,active:true}]});keys.clear();placeEnemy();audio.start();ui.intro.hidden=true;ui.pause.hidden=true;ui.gameover.hidden=true;ui.victory.hidden=true;canvas.style.display='block';if(document.pointerLockElement===canvas)document.exitPointerLock();}
function begin(){if(state.started)return;reset();banner('CANVAS2D FALLBACK · GEVECHT GESTART',2.2)}
function pause(){if(!state.running)return;state.paused=true;state.running=false;audio.setActive(false);ui.pause.hidden=false;if(document.pointerLockElement===canvas)document.exitPointerLock()}
function resume(){state.paused=false;state.running=true;audio.start();ui.pause.hidden=true;state.last=performance.now()}
function defeat(){state.dead=true;state.running=false;audio.setActive(false);ui.endStats.textContent='Je behaalde level '+state.level+' en versloeg '+state.kills+' vijanden.';ui.gameover.hidden=false;if(document.pointerLockElement===canvas)document.exitPointerLock()}
function complete(){state.victory=true;state.running=false;audio.setActive(false);ui.victoryStats.textContent='Chrono Shade verslagen · '+state.kills+' overwinningen · level '+state.level+'.';ui.victory.hidden=false;if(document.pointerLockElement===canvas)document.exitPointerLock()}
function enemyHit(damage,heavy=false){const r=damageEnemy(state.enemy,damage,heavy?.42:.24);if(!r.dealt)return;state.stand=Math.min(RULES.standMax,state.stand+(heavy?9:5));state.combo++;impact(heavy?'HEAVY IMPACT!':'ORA!');effects.push({x:state.ex,z:state.ez,t:.35,color:heavy?'#ffd48f':'#db9aff'});audio.play(heavy?'punch-heavy':'punch-light',heavy?.85:.62);if(r.killed){state.kills++;const boss=state.enemy.boss;grantXP(state,boss?260:42+Math.floor(state.wave*4));state.combo=0;state.enemyRespawn=2.1;const mission=resolveDefeat(state.wave,boss);if(mission.completed){complete()}else{state.wave=mission.nextWave;banner('WAVE '+state.wave+' / '+MISSION_WAVES+' — NEW CHALLENGER!',2)}}}
function attack(heavy=false){if(!state.running||state.attackCooldown>0)return;if(heavy&&state.stand<10){banner('NOT ENOUGH STAND ENERGY');return}if(heavy)state.stand-=10;state.attackCooldown=heavy?.64:.34;state.attack={t:heavy?.3:.22,heavy};state.lastStrike={damage:heavy?54+state.level*3:23+Math.min(state.combo,2)*9,heavy};audio.play(heavy?'punch-heavy':'dash-whoosh',heavy?.35:.22);const origin={x:state.x,z:state.z},face={x:state.faceX,z:state.faceZ},target={x:state.ex,z:state.ez};if(withinAttackCone(origin,face,target,heavy?4.5:RULES.meleeRange,heavy?.94:RULES.meleeHalfAngle)&&!state.enemy.dead)enemyHit(heavy?54+state.level*3:23+Math.min(state.combo,2)*9,heavy)}
function skillOra(){if(!state.running||state.stand<RULES.oraCost){banner('ORA ORA REQUIRES 55 ENERGY');return}state.stand-=RULES.oraCost;audio.play('stand-summon',.7);for(let i=0;i<5;i++){setTimeout(()=>{if(!state.running)return;const dx=state.ex-state.x,dz=state.ez-state.z;const d=Math.hypot(dx,dz);if(d<5.5&&!state.enemy.dead)enemyHit(28,false)},i*145)}banner('ORA ORA ORA!')}
function skillStop(){if(!state.running||state.stand<RULES.timeStopCost){banner('ZA WARUDO REQUIRES 40 ENERGY');return}state.stand-=RULES.timeStopCost;state.stop=RULES.timeStopSeconds;audio.play('time-stop',.8);banner('ZA WARUDO!')}
function interactAnchor(){if(!state.running)return;let selected=null,distance=Infinity;for(const a of state.anchors){const d=Math.hypot(a.x-state.x,a.z-state.z);if(a.active&&d<distance){selected=a;distance=d}}if(selected&&distance<3.3){selected.active=false;state.stand=Math.min(100,state.stand+18);audio.play('time-resume',.56);impact('TIME ANCHOR DISABLED');banner('ANCHOR DOWN · CHRONO SHADE WEAKENED',1.2)}else banner('MOVE CLOSE TO A LIVE TIME ANCHOR',.9)}
function aimFromEvent(e){const dx=e.clientX-innerWidth/2,dz=e.clientY-innerHeight/2;if(Math.abs(dx)+Math.abs(dz)<10)return;const d=Math.hypot(dx,dz)||1;state.faceX=dx/d;state.faceZ=dz/d}
canvas.addEventListener('mousemove',aimFromEvent);
ui.start.addEventListener('click',begin);ui.resume.addEventListener('click',resume);ui.retry.addEventListener('click',reset);ui.victoryRetry.addEventListener('click',reset);
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.key.toLowerCase());if(e.repeat)return;if(e.code==='Escape'){state.running?pause():state.paused&&resume()}if(e.code==='KeyQ')skillOra();if(e.code==='KeyT')skillStop();if(e.code==='KeyF')interactAnchor();if(e.code==='ShiftLeft'||e.code==='ShiftRight'){if(state.running&&state.dashCooldown<=0){state.dash=.22;state.dashCooldown=.8}}if(e.code==='Space')attack(true)});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('mousedown',e=>{if(e.button===0)attack(false);if(e.button===2)attack(true)});window.addEventListener('contextmenu',e=>e.preventDefault());
function update(dt){if(!state.running)return;state.arenaTime+=dt;state.attackCooldown=Math.max(0,state.attackCooldown-dt);state.invuln=Math.max(0,state.invuln-dt);state.dashCooldown=Math.max(0,state.dashCooldown-dt);state.dash=Math.max(0,state.dash-dt);state.stop=Math.max(0,state.stop-dt);if(state.enemyRespawn>0){state.enemyRespawn-=dt;if(state.enemyRespawn<=0){placeEnemy();banner(isBossWave(state.wave)?'FINAL WAVE — CHRONO SHADE!':'WAVE '+state.wave+' — NEW CHALLENGER!',2)}}
 let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0),mz=(keys.has('s')?1:0)-(keys.has('w')?1:0);const ml=Math.hypot(mx,mz)||1;if(mx||mz){mx/=ml;mz/=ml;const speed=state.dash>0?14:6.5;state.x+=mx*speed*dt;state.z+=mz*speed*dt;if(state.dash<=0){state.faceX=mx;state.faceZ=mz}}enforceArena(state);
 if(state.stop<=0){for(const a of state.anchors){if(!a.active)continue;const d=Math.hypot(a.x-state.x,a.z-state.z);const phase=state.arenaTime%6.8;if(phase>5.7&&d<2.15&&state.invuln<=0){state.hp=Math.max(0,state.hp-8);state.invuln=.55;impact('TIME WAVE · DODGE');audio.play('enemy-hit',.55);if(state.hp<=0)defeat()}}}
 if(!state.enemy.dead&&state.stop<=0){const step=stepEnemy(state.enemy,{x:state.ex,z:state.ez},{x:state.x,z:state.z},dt,false);state.ex+=step.x;state.ez+=step.z;if(step.attack&&state.invuln<=0){state.hp=Math.max(0,state.hp-state.enemy.damage);state.invuln=.62;state.stand=Math.min(RULES.standMax,state.stand+4);impact('ENEMY HIT!');if(state.hp<=0)defeat()}}
 effects.forEach(e=>e.t-=dt);while(effects.length&&effects[0].t<=0)effects.shift();}
function world(x,z){const s=Math.min(innerWidth,innerHeight)/34;return {x:innerWidth/2+(x-state.x)*s,y:innerHeight/2+(z-state.z)*s,s}}
function circle(p,r,fill,stroke){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function segment(x1,y1,x2,y2,width,color){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke()}
function drawFigure(p,color,scale=1,kind='player'){
 const isEnemy=kind==='enemy'||kind==='boss',isStand=kind==='stand',t=state.arenaTime;
 const dark=isEnemy?'#281824':isStand?'#37234f':'#172840',accent=isEnemy?'#e09a63':isStand?'#f0cf72':'#f5d58e';
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
 ctx.globalAlpha=isStand?.78:1;ctx.shadowBlur=12;ctx.shadowColor=color;
 ctx.fillStyle='#07061199';ctx.beginPath();ctx.ellipse(0,9,19,9,0,0,Math.PI*2);ctx.fill();
 const gait=Math.sin(t*(kind==='boss'?12:9))*5;
 const seg=(a,b,c,d,width,stroke)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke()};
 const joint=(x,y,r,fill)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=1.5;ctx.stroke()};
 // Split legs, knee joints and plated boots move with the gait.
 for(const side of [-1,1]){const swing=(state.attack?Math.sin((.34-state.attack.t)*18)*5:0)+gait*side*.36;
   seg(side*6,5,side*7+swing,14,8,dark);seg(side*7+swing,14,side*8-swing*.4,22,6,color);joint(side*7+swing,14,3.2,accent);
   seg(side*8-swing*.4,22,side*8+3-swing*.4,25,8,isEnemy?'#20202d':'#31364a');
 }
 // Articulated arms with distinct shoulders, elbows, bracers and hands.
 for(const side of [-1,1]){const swing=state.attack?Math.sin((.34-state.attack.t)*18)*side*7:Math.sin(t*5+side)*2;
   joint(side*10,-5,5.5,isEnemy?'#6c304b':color);seg(side*10,-5,side*15,-1+swing,7,color);
   joint(side*15,-1+swing,3.2,accent);seg(side*15,-1+swing,side*17,5+swing,5,dark);
   seg(side*17,5+swing,side*19,7+swing,7,accent);joint(side*19,8+swing,3.1,color);
 }
 // Sculpted torso, collar, belt, engraved breastplate and inset jewel.
 ctx.fillStyle=dark;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,-8);ctx.quadraticCurveTo(-13,-4,-10,5);ctx.lineTo(-7,9);ctx.lineTo(7,9);ctx.lineTo(10,5);ctx.quadraticCurveTo(13,-4,10,-8);ctx.quadraticCurveTo(0,-13,-10,-8);ctx.fill();ctx.stroke();
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(0,-10);ctx.lineTo(8,-7);ctx.lineTo(6,0);ctx.lineTo(0,3);ctx.lineTo(-6,0);ctx.closePath();ctx.fill();
 seg(-6,1,6,1,1.5,accent);seg(0,-8,0,5,2,accent);joint(0,-1,2.1,accent);
 seg(-7,7,7,7,3,accent);for(const side of [-1,1])joint(side*5,7,1.5,'#fff1c8');
 // Face, eye line and individually shaped headwear make the three silhouettes distinct.
 ctx.fillStyle=isEnemy?'#c1a9a1':isStand?'#d5b5b0':'#e2c6b3';ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-15,7.4,8.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 seg(-5,-16,5,-16,2.2,isEnemy?'#ff718b':'#a7f4ff');seg(-2,-11,2,-11,1.2,dark);
 if(isEnemy){seg(-5,-21,-10,-29,3,'#ae4563');seg(5,-21,10,-30,3,'#e1b76f');seg(-1,-22,0,-30,3,'#ae4563');}
 else if(isStand){for(let i=-2;i<=2;i++)seg(i*3,-21,i*4,-31-Math.abs(i)*-1,3,i%2?color:'#ead5ff');seg(-7,-19,7,-19,3,accent);}
 else {ctx.fillStyle='#20243a';ctx.beginPath();ctx.ellipse(0,-21,10,4,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-21,20,3);seg(-7,-20,7,-20,1.8,accent);}
 ctx.restore();
}
function render(){const w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);const c={x:w/2-state.x*Math.min(w,h)/34,y:h/2-state.z*Math.min(w,h)/34};const s=Math.min(w,h)/34;ctx.fillStyle='#080719';ctx.fillRect(0,0,w,h);
 const grd=ctx.createRadialGradient(w*.49,h*.48,10,w*.5,h*.5,Math.max(w,h)*.7);grd.addColorStop(0,'#28213f');grd.addColorStop(1,'#090716');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
 circle(c,18.8*s,'#111021','#d9b873');for(const r of [3.9,8.2,13.8,17.7])circle(c,r*s,null,'#76658666');ctx.save();ctx.strokeStyle='#8c84a322';ctx.lineWidth=1;for(let i=-18;i<=18;i++){ctx.beginPath();ctx.moveTo(c.x+i*s,c.y-18*s);ctx.lineTo(c.x+i*s,c.y+18*s);ctx.stroke();ctx.beginPath();ctx.moveTo(c.x-18*s,c.y+i*s);ctx.lineTo(c.x+18*s,c.y+i*s);ctx.stroke()}ctx.restore();
 // A few distinct, grounded landmarks frame the clock plaza instead of a repeated column ring.
 const clock=world(0,-16.6);ctx.save();ctx.translate(clock.x,clock.y);ctx.fillStyle='#24243a';ctx.fillRect(-24,-31,48,62);ctx.strokeStyle='#c5a364';ctx.lineWidth=2;ctx.strokeRect(-24,-31,48,62);circle({x:0,y:-8},17,'#12131f','#f0d38e');for(let i=0;i<12;i++){const a=i*Math.PI/6;segment(Math.sin(a)*13,-8+Math.cos(a)*13,Math.sin(a)*15,-8+Math.cos(a)*15,1.4,'#f0d38e')}segment(0,-8,3,-18,2.2,'#f7d999');segment(0,-8,9,-6,1.8,'#bba9f1');ctx.restore();
 const arch=world(-15,1);ctx.fillStyle='#262339';ctx.fillRect(arch.x-25,arch.y-18,9,40);ctx.fillRect(arch.x+16,arch.y-18,9,40);ctx.fillRect(arch.x-25,arch.y-22,50,8);ctx.strokeStyle='#827096';ctx.strokeRect(arch.x-25,arch.y-22,50,44);
 const facade=world(15,-1);ctx.fillStyle='#202333';ctx.fillRect(facade.x-25,facade.y-26,50,52);ctx.strokeStyle='#9b83aa';ctx.strokeRect(facade.x-25,facade.y-26,50,52);for(let col=-1;col<=1;col++){ctx.fillStyle=col===0?'#7fd5dd66':'#ddb87777';ctx.fillRect(facade.x+col*14-4,facade.y-17,8,13);ctx.fillRect(facade.x+col*14-4,facade.y+2,8,13)}
 const lantern=world(1,16.4);ctx.fillStyle='#38334a';ctx.fillRect(lantern.x-13,lantern.y-24,26,48);ctx.strokeStyle='#e3bf7c';ctx.strokeRect(lantern.x-13,lantern.y-24,26,48);circle(lantern,7,'#f2cf87','#fff0c5');
 for(const anchor of state.anchors){if(!anchor.active)continue;const ap=world(anchor.x,anchor.z),pulse=.85+.16*Math.sin(state.arenaTime*3);ctx.save();ctx.translate(ap.x,ap.y);ctx.rotate(state.arenaTime*.45);ctx.strokeStyle='#c6a6ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-15*pulse);ctx.lineTo(12*pulse,0);ctx.lineTo(0,15*pulse);ctx.lineTo(-12*pulse,0);ctx.closePath();ctx.stroke();ctx.restore();if(state.arenaTime%6.8>5.6){ctx.strokeStyle='#ff7188aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ap.x,ap.y,29+(state.arenaTime%1)*14,0,Math.PI*2);ctx.stroke()}}
 if(!state.enemy.dead){const e=world(state.ex,state.ez);ctx.save();if(state.enemy.state==='windup'){ctx.strokeStyle='#ff7890';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,27+Math.sin(state.arenaTime*18)*4,0,Math.PI*2);ctx.stroke()}drawFigure(e,state.enemy.boss?'#ff678b':'#a45fca',state.enemy.boss?1.45:1,state.enemy.boss?'boss':'enemy');ctx.restore()}
 const me={x:w/2,y:h/2};if(state.stop>0){ctx.strokeStyle='#b7ecff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(me.x,me.y,42+Math.sin(state.arenaTime*14)*5,0,Math.PI*2);ctx.stroke()}
 ctx.save();ctx.translate(me.x,me.y);ctx.rotate(Math.atan2(state.faceZ,state.faceX)+Math.PI/2);ctx.fillStyle='#f5d58e';ctx.fillRect(-2,-29,4,20);ctx.restore();drawFigure(me,'#77caff',1,'player');drawFigure({x:me.x+43,y:me.y+2},'#b784e2',.82,'stand');if(state.attack){ctx.strokeStyle=state.attack.heavy?'#ffe4a5':'#d9adff';ctx.lineWidth=state.attack.heavy?6:4;ctx.beginPath();ctx.arc(me.x,me.y,49,-Math.PI*.8,Math.PI*.25);ctx.stroke();state.attack.t-=.016;if(state.attack.t<=0)state.attack=null}
 for(const fx of effects){const p=world(fx.x,fx.z);ctx.globalAlpha=Math.max(0,fx.t/.35);circle(p,28*(1-fx.t/.6),null,fx.color);ctx.globalAlpha=1}}
function hud(){ui.hpFill.style.transform='scaleX('+Math.max(0,state.hp/state.maxHp)+')';ui.energyFill.style.transform='scaleX('+state.stand/100+')';ui.xpFill.style.transform='scaleX('+state.xp/xpRequired(state.level)+')';ui.enemyFill.style.transform='scaleX('+(state.enemy.hp/state.enemy.maxHp)+')';ui.hp.textContent=Math.ceil(state.hp)+' / '+state.maxHp;ui.energy.textContent=Math.floor(state.stand)+' / 100';ui.xp.textContent=state.xp+' / '+xpRequired(state.level);ui.enemyHp.textContent=Math.ceil(state.enemy.hp)+' / '+state.enemy.maxHp;ui.enemyTitle.textContent=state.enemy.boss?'CHRONO SHADE · BOSS':state.enemy.type.replaceAll('-',' ').toUpperCase();if(ui.anchors){const left=state.anchors.filter(a=>a.active).length;ui.anchors.textContent='TIME ANCHORS '+left+'/3 · F TO DISABLE';}ui.level.textContent='LV '+String(state.level).padStart(2,'0');ui.kills.innerHTML=state.kills+' <small>KILLS</small>';ui.wave.textContent='WAVE '+String(Math.min(state.wave,MISSION_WAVES)).padStart(2,'0')+' / '+MISSION_WAVES;ui.combo.textContent='COMBO ×'+(state.combo%3);ui.ora.classList.toggle('ready',state.stand>=RULES.oraCost);ui.stop.classList.toggle('ready',state.stand>=RULES.timeStopCost);ui.time.hidden=state.stop<=0;ui.timeCount.textContent=state.stop.toFixed(1)+'s';ui.fps.textContent='FPS '+Math.round(state.fps);ui.objective.textContent=state.enemy.dead?'Volgende golf nadert.':state.enemy.boss&&state.anchors.some(a=>a.active)?'Schakel de tijdankers uit om de Chrono Shade kwetsbaar te maken.':state.enemy.boss?'Chrono Shade kwetsbaar — breek de laatste tijdlijn.':state.enemy.state==='windup'?'Gevaar! Ontwijk de aangekondigde aanval.':'Ontwijk aangekondigde slagen, gebruik counters en schakel de tijdankers uit.'}
function loop(now){const dt=clamp((now-lastFrame)/1000,0,.05);lastFrame=now;frames++;if(now-fpsAt>=500){state.fps=frames*1000/(now-fpsAt);frames=0;fpsAt=now}update(dt);render();hud();requestAnimationFrame(loop)}
ui.loading.textContent='WebGL is niet beschikbaar; Canvas2D noodmodus geladen. Dezelfde missie en toetsen werken.';ui.fatal.hidden=true;ui.intro.hidden=false;ui.viewport.style.background='#080719';
Object.defineProperty(window,'__SHATTERED_QA__',{get:()=>Object.freeze({renderer:'canvas2d',started:state.started,running:state.running,paused:state.paused,dead:state.dead,victory:state.victory,hp:state.hp,stand:state.stand,enemyHp:state.enemy.hp,enemyState:state.enemy.state,kills:state.kills,wave:state.wave,missionWaves:MISSION_WAVES,boss:state.enemy.boss,level:state.level,stop:state.stop,combo:state.combo,attackActive:!!state.attack,player:{x:state.x,z:state.z}})});
requestAnimationFrame(loop);

