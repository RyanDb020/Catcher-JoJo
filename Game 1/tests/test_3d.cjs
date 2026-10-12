// Stand Combat 1.0 mission - Node-only regression tests; no WebGL/browser needed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
(async()=>{
 const {RULES,MISSION_WAVES,isBossWave,resolveDefeat,withinAttackCone,enforceArena,createEnemy,damageEnemy,stepEnemy,grantXP,xpRequired}=await import(pathToFileURL(path.join(root,'src/3d/rules.mjs')).href);
 let checks=0;
 const test=(title,fn)=>{fn();console.log('PASS: '+title);checks++};
 test('3D launch files exist without overwriting Arcade index',()=>{
  for(const f of ['combat.html','combat.css','src/3d/main.mjs','src/3d/rules.mjs','src/3d/fallback.mjs'])assert(fs.existsSync(path.join(root,f)),f);
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/src\/sketch\.js/);
  assert.match(fs.readFileSync(path.join(root,'combat.html'),'utf8'),/src\/3d\/main\.mjs/);
  assert.match(fs.readFileSync(path.join(root,'combat.html'),'utf8'),/src\/3d\/fallback\.mjs/);
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
 console.log('PASS:',checks,'3D combat regression checks');
})().catch(error=>{console.error(error);process.exitCode=1});
