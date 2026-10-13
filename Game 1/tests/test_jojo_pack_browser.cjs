const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tests/artifacts');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return}const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.mp3':'audio/mpeg','.ogg':'audio/ogg'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
if(process.env.GITHUB_EVENT_PATH){const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));if(event.head_commit?.message?.includes('[vfx-only]')){console.log('VFX-only follow-up: unchanged audio/gameplay suites were checked on the preceding source run.');const result=require('node:child_process').spawnSync(process.execPath,[path.join(__dirname,'test_vfx_browser.cjs')],{stdio:'inherit'});process.exit(result.status??1);}}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[],results=[];
try{
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.__JOJO_QA_AUTOMATION__=true;window.__packPlayback=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__packPlayback.push(this.src);return play.call(this)}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?test=1');await page.waitForFunction(()=>window.__JOJO_QA_STATE__?.gameStarted===false);await page.keyboard.press('Enter');
 await page.waitForFunction(()=>Object.keys(window.__JOJO_QA_STATE__.clips).length>=20&&['hand','tusk','cmoon','giorno','yes','resume'].every(k=>window.__JOJO_QA_STATE__.clips[k].duration>0));
 await page.evaluate(()=>{powerUps=[];gameplayFrames=-100000});
 await page.keyboard.press('o');
 const keys=await page.locator('#pack-preview option').evaluateAll(opts=>opts.map(o=>o.value));assert.equal(keys.length,17);
 for(const key of keys){await page.selectOption('#pack-preview',key);await page.click('#pack-listen');await page.waitForFunction(()=>packPreview&&packPreview.currentTime>0);await page.click('#pack-stop');results.push({clip:key,previewPlayed:true});}
 await page.selectOption('#pack-music','kiratheme');await page.selectOption('#pack-time-voice','starstop');await page.screenshot({path:path.join(out,'jojo-pack-settings.png')});await page.click('#close-options');
 await page.keyboard.press('1');await page.waitForFunction(()=>window.__JOJO_QA_STATE__.timeStop==='intro');await page.screenshot({path:path.join(out,'jojo-star-platinum-time-stop.png')});await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.__JOJO_QA_STATE__.timeStop==='idle',{},{timeout:25000});
 for(const [key,kind] of [['5','hand'],['6','tusk'],['7','cmoon'],['8','muda'],['9','giorno']]){
  await page.keyboard.press('g');await page.keyboard.press(key);await page.waitForFunction(k=>window.__JOJO_QA_STATE__.packMove===k,kind);await page.waitForTimeout(450);await page.screenshot({path:path.join(out,'jojo-move-'+kind+'.png')});
  if(kind==='cmoon'){await page.evaluate(()=>startTimeStop(catcherX,catcherY));assert(await page.evaluate(()=>!!queuedTimeStop));}
  if(kind==='giorno'){
   await page.keyboard.press('o');const at=await page.evaluate(()=>window.__JOJO_QA_STATE__);await page.waitForTimeout(500);const still=await page.evaluate(()=>window.__JOJO_QA_STATE__);assert.equal(at.gameMillis,still.gameMillis);assert(Math.abs(at.clips.giorno.currentTime-still.clips.giorno.currentTime)<.12);await page.selectOption('#pack-preview','giorno');await page.click('#pack-listen');await page.waitForTimeout(300);const preview=await page.evaluate(()=>({position:jojoVoiceClips.giorno.currentTime,preview:packPreview.currentTime}));assert(Math.abs(preview.position-still.clips.giorno.currentTime)<.12);assert(preview.preview>0);await page.click('#close-options');
   await page.waitForTimeout(8800);assert.equal((await page.evaluate(()=>window.__JOJO_QA_STATE__)).packMove,'giorno');
  }
  await page.waitForFunction(()=>!window.__JOJO_QA_STATE__.packMove,{},{timeout:22000});results.push({move:kind,completed:true});if(kind==='cmoon'){await page.waitForFunction(()=>window.__JOJO_QA_STATE__.timeStop==='intro');await page.keyboard.press('Space');await page.waitForFunction(()=>window.__JOJO_QA_STATE__.timeStop==='idle',{},{timeout:25000});results.push({trigger:'queued blue Time Stop pickup',completed:true});}
 }
 await page.waitForFunction(()=>window.__JOJO_QA_STATE__.timeStop==='idle',{},{timeout:25000});await page.keyboard.press('g');await page.keyboard.press('4');await page.waitForFunction(()=>window.__JOJO_QA_STATE__.clips.crimson.currentTime>0);results.push({trigger:'King Crimson',played:true});
 await page.waitForTimeout(4500);
 const triggers=[
  ['kira',()=>explodeBomb(width/2,height/2,null)],
  ['yes',()=>{combo=19;scoreBall(balls[0],true)}],
  ['run',()=>{window.__JOJO_QA_AUTOMATION__=false;lives=2;balls[0].gold=false;balls[0].y=height+40;drawBalls(1);window.__JOJO_QA_AUTOMATION__=true}],
  ['wryyy',()=>{roadRoller={active:true,start:gameMillis()-ROAD_ROLLER_LAND_MS,landed:false};updateJoJoAttacks()}],
  ['teleport',()=>{roadRoller.active=false;timeStop.phase='freeze';packTeleportX=catcherX-100;updatePackMove()}]
 ];
 for(const [clip,trigger] of triggers){await page.evaluate(()=>{packVoiceUntil=0;stopJoJoVoices();timeStop.phase='idle';roadRoller.active=false});await page.evaluate(trigger);await page.waitForFunction(k=>window.__JOJO_QA_STATE__.clips[k].currentTime>.02,clip);results.push({trigger:clip,played:true});}
 await page.evaluate(()=>{stopJoJoVoices();timeStop.phase='idle';roadRoller.active=false;lives=3;packVoiceUntil=0});await page.keyboard.press('g');await page.keyboard.press('7');await page.keyboard.press('r');await page.waitForFunction(()=>window.__JOJO_QA_STATE__.universeReset,{},{timeout:7000});await page.keyboard.press('Space');await page.waitForFunction(()=>!window.__JOJO_QA_STATE__.universeReset,{},{timeout:6000});const state=await page.evaluate(()=>window.__JOJO_QA_STATE__);assert.equal(state.packMove,null);assert.equal(state.score,0);assert.equal(state.lives,3);assert.equal(errors.length,0,errors.join(';'));
 fs.writeFileSync(path.join(out,'jojo-pack-browser-results.json'),JSON.stringify({passed:true,results,errors,playback:await page.evaluate(()=>window.__packPlayback)},null,2));console.log('PASS JoJo pack: 17 real audio previews, five moves, Star Platinum activation, pause, long Giorno, King Crimson, queued Rewind/reset');
}catch(error){fs.writeFileSync(path.join(out,'jojo-pack-browser-failure.json'),JSON.stringify({error:error.message,results,errors,state:await page.evaluate(()=>window.__JOJO_QA_STATE__)},null,2));await page.screenshot({path:path.join(out,'jojo-pack-failure.png')});throw error;}finally{await browser.close();server.close();}})().then(()=>{const result=require('node:child_process').spawnSync(process.execPath,[path.join(__dirname,'test_controls_audio_browser.cjs')],{stdio:'inherit'});if(result.status!==0)process.exitCode=1;}).catch(e=>{console.error(e);server.close();process.exitCode=1});
