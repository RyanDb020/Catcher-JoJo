#!/usr/bin/env node
// Browser smoke test for 3D Combat Mode, keyboard input and no-WebGL fallback.
// Run: npm run qa:3d
// Requires: npm install; npx playwright install chromium; internet for pinned Three.js CDN.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404);return res.end('Not found');
 }
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
async function run(){
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',err=>err?reject(err):resolve()));
 const address='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(address+'/combat.html',{waitUntil:'domcontentloaded',timeout:45000});
  if(!response||response.status()!==200)throw Error('Combat page failed to load');
  await page.waitForFunction(()=>window.__SHATTERED_QA__&&window.__SHATTERED_QA__.started===false,null,{timeout:45000});
  await page.getByRole('button',{name:/ENTER THE ARENA/}).click();
  await page.waitForFunction(()=>window.__SHATTERED_QA__?.running===true,null,{timeout:10000});
  const before=await page.evaluate(()=>window.__SHATTERED_QA__);
  if(Math.abs(before.camera.aspect-1280/720)>.001)throw Error('Initial camera aspect distorts character proportions');
  if(before.renderer!=='webgl')throw Error('WebGL renderer did not start; renderer='+before.renderer);
  if(!(before.drawCalls>0))throw Error('WebGL renderer produced no draw calls: '+JSON.stringify(before));
  await page.keyboard.down('w');
  await page.waitForFunction(start=>{
    const qa=window.__SHATTERED_QA__;
    return qa.player.z<start-.20&&qa.rig.heroKnees.some(angle=>angle>.10);
  },before.player.z,{timeout:15000});
  await page.waitForTimeout(250);
  await page.keyboard.up('w');
  const after=await page.evaluate(()=>window.__SHATTERED_QA__);
  const bodyDistance=Math.hypot(after.player.x-after.enemy.x,after.player.z-after.enemy.z);
  if(bodyDistance<1.24)throw Error('Fighter body volumes overlap: '+bodyDistance);
  if(!(after.player.z<before.player.z-.20))throw Error('WASD movement failed: '+JSON.stringify({before:before.player,after:after.player}));
  const followOffset=Math.hypot(after.camera.focus.x-after.player.x,after.camera.focus.z-after.player.z);
  if(!(followOffset<=1.2))throw Error('Combat camera lost the player while moving: '+JSON.stringify(after.camera));
  if(after.enemyState==='patrol')throw Error('Enemy never entered chase behavior');
  await page.mouse.click(700,370);
  await page.waitForTimeout(550);
  if(errors.length)throw Error('Browser JavaScript errors: '+errors.join('; '));
  const output=path.join(__dirname,'artifacts');fs.mkdirSync(output,{recursive:true});
  const focusOffset=Math.hypot(before.camera.focus.x-before.player.x,before.camera.focus.z-before.player.z);
  if(!(focusOffset>0&&focusOffset<=1.2))throw Error('Combat camera is not composing toward the opponent: '+JSON.stringify(before.camera));
  const wideBounds=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  if(wideBounds.scrollWidth>wideBounds.width)throw Error('Wide viewport has horizontal overflow: '+JSON.stringify(wideBounds));
  await page.screenshot({path:path.join(output,'3d-combat-preview.png')});
  // Check the same HUD and WebGL scene at a narrow mobile-sized viewport.
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  const narrowBounds=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  const narrowCamera=await page.evaluate(()=>window.__SHATTERED_QA__.camera);
  if(Math.abs(narrowCamera.aspect-390/844)>.001)throw Error('Narrow camera aspect was not resized');
  if(narrowBounds.scrollWidth>narrowBounds.width)throw Error('Narrow viewport has horizontal overflow: '+JSON.stringify(narrowBounds));
  await page.screenshot({path:path.join(output,'3d-combat-mobile-preview.png')});
  await page.waitForFunction(()=>window.__SHATTERED_QA__?.audio.ready===14,null,{timeout:15000});
  const decodedAudio=await page.evaluate(()=>window.__SHATTERED_QA__.audio);
  // Release pointer lock through the browser API; it must pause combat and clear one-shots.
  await page.evaluate(()=>{if(window.__SHATTERED_QA__.paused)return;if(document.pointerLockElement)document.exitPointerLock();else document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape'}));});
  await page.waitForFunction(()=>window.__SHATTERED_QA__?.paused===true);
  const pausedAudio=await page.evaluate(()=>window.__SHATTERED_QA__.audio);
  if(pausedAudio.active||pausedAudio.voices)throw Error('Pause left combat audio active: '+JSON.stringify(pausedAudio));
  await page.locator('#audio-settings').evaluate(node=>{node.open=true});
  await page.locator('#audio-mute').check();
  if(!(await page.evaluate(()=>window.__SHATTERED_QA__.audio.muted)))throw Error('Mute control did not update mixer');
  await page.locator('#audio-mute').uncheck();
  await page.locator('#audio-settings').evaluate(node=>{node.open=false});
  await page.setViewportSize({width:1280,height:720});
  await page.locator('#resume-btn').click();
  await page.waitForFunction(()=>window.__SHATTERED_QA__?.running===true);
  if(errors.length)throw Error('Browser errors after narrow viewport/audio lifecycle: '+errors.join('; '));
  // Complete the existing five-wave mission using only real keyboard/mouse inputs.
  const held=new Set();
  async function steer(x,z,arrival=2.35){
    const qa=await page.evaluate(()=>window.__SHATTERED_QA__);
    if(qa.dead)throw Error('Mission player died: '+JSON.stringify(qa));
    if(!qa.running)throw Error('Mission unexpectedly paused: '+JSON.stringify(qa));
    const dx=x-qa.player.x,dz=z-qa.player.z,distance=Math.hypot(dx,dz);
    const wants=new Set();
    if(distance>arrival){
      const right=dx*Math.cos(qa.camera.yaw)-dz*Math.sin(qa.camera.yaw);
      const forward=-dx*Math.sin(qa.camera.yaw)-dz*Math.cos(qa.camera.yaw);
      if(Math.abs(right)>.40)wants.add(right>0?'d':'a');
      if(Math.abs(forward)>.40)wants.add(forward>0?'w':'s');
    }
    for(const key of held)if(!wants.has(key)){await page.keyboard.up(key);held.delete(key)}
    for(const key of wants)if(!held.has(key)){await page.keyboard.down(key);held.add(key)}
    return {qa,distance};
  }
  for(const [x,z] of [[-6,4],[7,1],[0,-12]]){
    const deadline=Date.now()+45000;
    for(;;){const {distance}=await steer(x,z,2.5);if(distance<=2.5){await page.keyboard.press('f');break}
      if(Date.now()>deadline)throw Error('Failed to reach time anchor '+JSON.stringify({target:{x,z},state:await page.evaluate(()=>window.__SHATTERED_QA__)}));await page.waitForTimeout(100);}
  }
  const anchorsOff=await page.evaluate(()=>window.__SHATTERED_QA__.anchors);
  if(anchorsOff!==0)throw Error('Time anchor interaction failed: '+anchorsOff);
  await page.keyboard.press('t');
  await page.waitForFunction(()=>window.__SHATTERED_QA__?.stop>0);
  const stoppedEnemy=await page.evaluate(()=>window.__SHATTERED_QA__.enemy);
  await page.waitForTimeout(350);
  const stillEnemy=await page.evaluate(()=>window.__SHATTERED_QA__.enemy);
  if(Math.hypot(stillEnemy.x-stoppedEnemy.x,stillEnemy.z-stoppedEnemy.z)>.01)throw Error('Time Stop moved the frozen enemy');
  const missionDeadline=Date.now()+180000;
  while(Date.now()<missionDeadline){
    const qa=await page.evaluate(()=>window.__SHATTERED_QA__);
    if(qa.victory)break;
    const {distance}=await steer(qa.enemy.x,qa.enemy.z,2.35);
    if(distance<3.2&&qa.enemyHp>0&&!qa.attackActive){await page.mouse.down({button:'right'});await page.mouse.up({button:'right'})}
    await page.waitForTimeout(110);
  }
  for(const key of held)await page.keyboard.up(key);
  const victory=await page.evaluate(()=>window.__SHATTERED_QA__);
  if(!victory.victory||victory.wave!==5||victory.kills!==5)throw Error('Five-wave mission did not complete: '+JSON.stringify(victory));
  await page.screenshot({path:path.join(output,'3d-mission-victory.png')});
  await page.locator('#victory-retry-btn').click();
  await page.waitForFunction(()=>window.__SHATTERED_QA__?.running===true&&window.__SHATTERED_QA__.wave===1);
  const replay=await page.evaluate(()=>window.__SHATTERED_QA__);
  if(replay.hp!==100||replay.kills!==0||replay.anchors!==3||replay.stop!==0)throw Error('Victory reset left stale mission state: '+JSON.stringify(replay));
  if(errors.length)throw Error('Mission browser errors: '+errors.join('; '));
  console.log('PASS time anchors, Time Stop, all five waves, victory and replay',JSON.stringify({victory,replay}));
  console.log('PASS 3D browser smoke test (wide + narrow viewports)');
  console.log(JSON.stringify({start:before,after,bodyDistance,decodedAudio,pausedAudio,focusOffset,wideBounds,narrowBounds,screenshots:['tests/artifacts/3d-combat-preview.png','tests/artifacts/3d-combat-mobile-preview.png']},null,2));

  // Repeat the launch with WebGL deliberately disabled to verify the playable fallback.
  await browser.close();browser=null;
  browser=await chromium.launch({headless:true,args:['--disable-webgl','--no-sandbox']});
  const fallbackPage=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const fallbackErrors=[];
  fallbackPage.on('pageerror',e=>fallbackErrors.push(e.message));
  await fallbackPage.goto(address+'/combat.html',{waitUntil:'domcontentloaded',timeout:45000});
  await fallbackPage.waitForFunction(()=>window.__SHATTERED_QA__?.renderer==='canvas2d',null,{timeout:45000});
  await fallbackPage.getByRole('button',{name:/ENTER THE ARENA/}).click();
  await fallbackPage.waitForFunction(()=>window.__SHATTERED_QA__?.running===true,null,{timeout:10000});
  const fallbackBefore=await fallbackPage.evaluate(()=>window.__SHATTERED_QA__);
  await fallbackPage.keyboard.down('w');
  await fallbackPage.waitForTimeout(700);
  await fallbackPage.keyboard.up('w');
  const fallbackAfter=await fallbackPage.evaluate(()=>window.__SHATTERED_QA__);
  if(!(fallbackAfter.player.z<fallbackBefore.player.z-.20))throw Error('Canvas2D WASD movement failed');
  if(fallbackErrors.length)throw Error('Canvas2D browser JavaScript errors: '+fallbackErrors.join('; '));
  await fallbackPage.screenshot({path:path.join(output,'3d-combat-canvas2d-fallback.png')});
  console.log('PASS Canvas2D no-WebGL fallback smoke test');
  console.log(JSON.stringify({renderer:fallbackAfter.renderer,running:fallbackAfter.running,player:fallbackAfter.player,screenshot:'tests/artifacts/3d-combat-canvas2d-fallback.png'},null,2));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(e=>{console.error('FAIL 3D browser smoke test:',e);process.exitCode=1});


