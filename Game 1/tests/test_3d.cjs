// Stand Combat 1.0 mission - Node-only regression tests; no WebGL/browser needed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
(async()=>{
 const {RULES,MISSION_WAVES,isBossWave,resolveDefeat,withinAttackCone,enforceArena,createEnemy,damageEnemy,stepEnemy,grantXP,xpRequired,applyUpgrade,freshUpgrades}=await import(pathToFileURL(path.join(root,'src/3d/rules.mjs')).href);
 let checks=0;
 const test=(title,fn)=>{fn();console.log('PASS: '+title);checks++};
 test('3D launch files exist without overwriting Arcade index',()=>{
  for(const f of ['combat.html','combat.css','src/3d/main.mjs','src/3d/rules.mjs'])assert(fs.existsSync(path.join(root,f)),f);
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/src\/sketch\.js/);
  assert.match(fs.readFileSync(path.join(root,'combat.html'),'utf8'),/src\/3d\/main\.mjs/);
 });
 test('mission has four ramping waves and a distinct final boss',()=>{
  assert.equal(MISSION_WAVES,5);
  assert.equal(isBossWave(4),false);
  assert.equal(isBossWave(5),true);
  const regular=createEnemy(4),boss=createEnemy(5,true);
  assert.equal(regular.boss,false);
  assert.equal(boss.boss,true);
  assert.equal(boss.hp,420);
  assert(boss.damage>regular.damage);
  assert(boss.speed<regular.speed);
  assert.deepEqual(resolveDefeat(4,false),{completed:false,nextWave:5});
  assert.deepEqual(resolveDefeat(5,true),{completed:true,nextWave:5});
 });
 test('final boss defeat can complete a mission and replay cleanly',()=>{
  const main=fs.readFileSync(path.join(root,'src/3d/main.mjs'),'utf8');
  assert.match(main,/function completeMission\(\)/);
  assert.match(main,/resolveDefeat\(state\.wave,defeatedBoss\)/);
  assert.match(main,/UI\.victoryRetry\.addEventListener\('click',\(\)=>\{reset\(\);requestPointerLock\(\)\}\)/);
  assert.match(fs.readFileSync(path.join(root,'combat.html'),'utf8'),/id="victory"/);
 });
 test('Three.js is pinned and loaded from a supported import map',()=>{
  const html=fs.readFileSync(path.join(root,'combat.html'),'utf8');
  assert.match(html,/three@0\.180\.0/);
  assert.match(html,/type="importmap"/);
 });
 test('attack cone hits forward targets only',()=>{
  assert(withinAttackCone({x:0,z:0},{x:0,z:-1},{x:0,z:-2}));
  assert(!withinAttackCone({x:0,z:0},{x:0,z:-1},{x:0,z:2}));
  assert(!withinAttackCone({x:0,z:0},{x:0,z:-1},{x:0,z:-7}));
  assert(!withinAttackCone({x:0,z:0},{x:0,z:-1},{x:2.9,z:2}));
 });
 test('arena blocks running beyond boundaries',()=>{
  const point={x:900,z:1000};
  enforceArena(point);
  assert(Math.hypot(point.x,point.z)<=RULES.arenaRadius+1e-7);
 });
 test('enemy approaches without instant contact damage',()=>{
  const enemy=createEnemy();
  const state=stepEnemy(enemy,{x:0,z:0},{x:0,z:5},.016,false);
  assert(state.z>0);
  assert.equal(state.attack,false);
  assert.equal(enemy.state,'chase');
 });
 test('attack telegraph precedes any damage event',()=>{
  const enemy=createEnemy();
  const p={x:0,z:0},target={x:0,z:1};
  let state=stepEnemy(enemy,p,target,.016);
  assert.equal(state.attack,false);
  assert.equal(enemy.state,'windup');
  let attacks=0;
  for(let i=0;i<24;i++){state=stepEnemy(enemy,p,target,.05);if(state.attack)attacks++;}
  assert.equal(attacks,1);
  assert.equal(enemy.state,'recover');
 });
 test('time freeze pauses enemy AI without altering timers',()=>{
  const enemy=createEnemy();
  stepEnemy(enemy,{x:0,z:0},{x:0,z:1},.02);
  const timer=enemy.timer,ready=enemy.attackReady;
  for(let i=0;i<40;i++){
    const state=stepEnemy(enemy,{x:0,z:0},{x:0,z:1},.05,true);
    assert.equal(state.attack,false);
    assert.equal(state.x,0);
  }
  assert.equal(enemy.timer,timer);assert.equal(enemy.attackReady,ready);
 });
 test('damage causes stagger, death only at zero health',()=>{
  const enemy=createEnemy();
  assert.deepEqual(damageEnemy(enemy,40),{dealt:40,killed:false});
  assert.equal(enemy.hp,60);
  assert.equal(enemy.state,'stagger');
  assert.deepEqual(damageEnemy(enemy,999),{dealt:60,killed:true});
  assert.equal(enemy.hp,0);
  assert.equal(enemy.state,'dead');
  assert.equal(damageEnemy(enemy,10).dealt,0);
 });
 test('XP and level progression are bounded and deterministic',()=>{
  const player={level:1,xp:0,maxHp:100,hp:50};
  assert.equal(xpRequired(1),80);
  assert.equal(grantXP(player,100),true);
  assert.equal(player.level,2);
  assert.equal(player.xp,20);
  assert.equal(player.maxHp,105);
  assert.equal(player.hp,68);
  assert.equal(grantXP(player,-5),false);
 });
 test('source has actual player controls and attack loop',()=>{
  const js=fs.readFileSync(path.join(root,'src/3d/main.mjs'),'utf8');
  for(const marker of ['requestAnimationFrame(loop)','withinAttackCone','startAttack(false)','startAttack(true)','beginOra()','timeStop()','stepEnemy(','requestPointerLock','damageEnemy(','updateCamera(dt)','grantXP('])assert(js.includes(marker),marker);
 });
 test('player, Stand and enemy have distinct articulated designs',()=>{
  const js=fs.readFileSync(path.join(root,'src/3d/main.mjs'),'utf8');
  for(const marker of ['function createHero()','function makeStand()','function makeEnemy()','new THREE.LatheGeometry','new THREE.CapsuleGeometry','coatTails','horns','makeFace(head','root.position.set(1.82,0,-.05)','variants[\'rift-stalker\']','variants[\'iron-guard\']','variants[\'clock-adept\']','variants[\'chrono-shade\']'])assert(js.includes(marker),marker);
  assert.match(js,/function animateStand\(dt\)/);
  assert.match(js,/enemyModel\.deathFall/);
 });
 test('combat framing and arena lighting preserve readable fighters',()=>{
  const js=fs.readFileSync(path.join(root,'src/3d/main.mjs'),'utf8');
  for(const marker of ['playerFill=new THREE.PointLight','enemyFill=new THREE.PointLight','combatFocus=target.clone()','Math.min(1.15','color:0x3d4056'])assert(js.includes(marker),marker);
 });
 test('district includes time anchors, a landmark clock tower and camera obstruction checks',()=>{
  const js=fs.readFileSync(path.join(root,'src/3d/main.mjs'),'utf8');
  for(const marker of ['Paved clock plaza','Clock tower landmark','Three time anchors','TIME WAVE · STOP TIME OR DODGE THROUGH','pillars.push(building)','obstaclesRay.intersectObjects(pillars,true)'])assert(js.includes(marker),marker);
  assert.match(fs.readFileSync(path.join(root,'combat.html'),'utf8'),/id="anchor-status"/);
 });
 test('Canvas2D fallback keeps distinct character silhouettes and district landmarks',()=>{
  const fallback=fs.readFileSync(path.join(root,'src/3d/fallback.mjs'),'utf8');
  for(const marker of ['function drawFigure','Articulated arms','Split legs','clock=world(0,-7.8)','const arch=world(-9.5,-2.5)','const facade=world(11,-2.5)',"'#b784e2',1.10,'stand'","Scuffed stone pavers"])assert(fallback.includes(marker),marker);
 });
 test('combat audio is local, preference-controlled and backed by credited Ogg files',()=>{
  const js=fs.readFileSync(path.join(root,'src/3d/audio.mjs'),'utf8');
  for(const marker of ['district-ambience.ogg','combat-music.ogg','time-resume.ogg','localStorage','audio-mute','../../assets/combat-audio/','../../assets/foley/'])assert(js.includes(marker),marker);
  const banks=require('node:vm').runInNewContext(js.split('const defaults=')[0]+';FILES');
  for(const files of Object.values(banks))for(const file of (Array.isArray(files)?files.map(name=>'assets/foley/'+name+'.ogg'):['assets/combat-audio/'+files]))assert(fs.existsSync(path.join(root,file)),file);
  const credits=fs.readFileSync(path.join(root,'AUDIO_CREDITS.md'),'utf8');
  assert.match(credits,/original, locally generated synthesis/);
  for(const f of ['dash-whoosh.ogg','punch-light.ogg','punch-heavy.ogg','stone-steps.ogg','enemy-telegraph.ogg','enemy-hit.ogg','time-stop.ogg','time-resume.ogg','stand-summon.ogg','chrono-echo.ogg','district-ambience.ogg','combat-music.ogg'])assert(fs.existsSync(path.join(root,'assets/combat-audio',f)),f);
 });
 test('upgrades stack, heal within limits and reset independently',()=>{
  const profile={hp:70,maxHp:100,stand:95,upgrades:freshUpgrades()};
  assert(applyUpgrade(profile,'power'));assert(applyUpgrade(profile,'power'));assert.equal(profile.upgrades.power,2);
  assert(applyUpgrade(profile,'vitality'));assert.equal(profile.maxHp,115);assert.equal(profile.hp,100);
  assert(applyUpgrade(profile,'time'));assert.equal(profile.stand,100);assert.equal(profile.upgrades.time,1);
  assert.equal(applyUpgrade(profile,'unknown'),false);assert.deepEqual(freshUpgrades(),{power:0,vitality:0,time:0});
 });
 test('boss armour preserves windup and recovery under repeated heavy strikes',()=>{
  const boss=createEnemy(5,true);stepEnemy(boss,{x:0,z:0},{x:0,z:2},.02);
  const before=boss.timer;damageEnemy(boss,34,.55);assert.equal(boss.state,'windup');assert.equal(boss.timer,before);
  boss.state='recover';boss.timer=.9;damageEnemy(boss,34,.55);assert.equal(boss.state,'recover');assert.equal(boss.timer,.9);
 });
 test('timeline attack locks aim, misses sideways dodge, respects freeze',()=>{
  const boss=createEnemy(5,true);boss.phase=2;boss.attackIndex=1;
  const origin={x:0,z:0};stepEnemy(boss,origin,{x:0,z:6},.01);assert.equal(boss.pattern,'timeline');
  const timer=boss.timer;stepEnemy(boss,origin,{x:3,z:6},.05,true);assert.equal(boss.timer,timer);
  let hits=0;for(let i=0;i<22;i++)if(stepEnemy(boss,origin,{x:3,z:6},.05).attack)hits++;
  assert.equal(hits,0);assert.equal(boss.state,'recover');
  const direct=createEnemy(5,true);direct.phase=2;direct.attackIndex=1;stepEnemy(direct,origin,{x:0,z:6},.01);
  for(let i=0;i<22;i++)if(stepEnemy(direct,origin,{x:0,z:6},.05).attack)hits++;
  assert.equal(hits,1);
 });
 test('last boss phase has a readable wide sweep with a counter window',()=>{
  const boss=createEnemy(5,true);boss.phase=3;stepEnemy(boss,{x:0,z:0},{x:0,z:2},.01);
  assert.equal(boss.pattern,'sweep');assert(boss.timer>=.9);
  let hits=0;for(let i=0;i<20;i++)if(stepEnemy(boss,{x:0,z:0},{x:0,z:4},.05).attack)hits++;
  assert.equal(hits,1);assert.equal(boss.state,'recover');assert(boss.timer>1);
 });
 console.log('PASS:',checks,'3D combat regression checks');
})().catch(error=>{console.error(error);process.exitCode=1});
