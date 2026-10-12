// Browser fault/lifecycle QA against actual p5 code, with real keyboard and file input.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'artifacts');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.mp3')?'audio/mpeg':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(page,fn,label,limit=45000){const end=Date.now()+limit;while(Date.now()<end){const x=await page.evaluate(()=>window.__JOJO_QA_STATE__);if(x&&fn(x))return x;await sleep(60)}throw Error('Timeout '+label+': '+JSON.stringify(await page.evaluate(()=>window.__JOJO_QA_STATE__)))}
async function launch(browser,address,missing=false){
 const page=await browser.newPage({viewport:{width:1365,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__JOJO_QA_AUTOMATION__=true});
 if(missing)await page.route('**/assets/**/*.mp3*',r=>r.abort());
 await page.goto(address+'/index.html?test=1');
 try{await wait(page,x=>x.gameStarted===false,'boot '+(missing?'missing audio':'normal'));}
 catch(error){await page.screenshot({path:path.join(output,missing?'missing-audio-boot-failure.png':'normal-boot-failure.png')});throw Error(error.message+' JS errors '+JSON.stringify(errors)+' document '+JSON.stringify(await page.evaluate(()=>({ready:document.readyState,canvas:document.querySelectorAll('canvas').length,p5:typeof p5,setup:typeof setup}))));}await page.keyboard.press('Enter');await wait(page,x=>x.gameStarted,'start');
 return {page,errors};
}
async function missingRoute(browser,address){
 const {page,errors}=await launch(browser,address,true);
 await page.keyboard.press('t');await wait(page,x=>x.timeStop==='freeze','silent freeze',9000);await wait(page,x=>x.timeStop==='idle','silent resume',25000);
 await page.keyboard.press('g');await page.keyboard.press('q');await wait(page,x=>x.ora,'silent ORA');await wait(page,x=>!x.ora,'silent ORA recovery',15000);
 await page.keyboard.press('r');await wait(page,x=>x.universeReset,'silent Rewind');await wait(page,x=>!x.universeReset,'silent Rewind recovery',45000);
 await page.keyboard.press('r');await wait(page,x=>x.universeReset,'skip start');await page.keyboard.press('Space');const state=await wait(page,x=>!x.universeReset,'skip cleanup',5000);
 if(state.score!==0||state.lives!==3)throw Error('Reset state invalid '+JSON.stringify(state));
 if(errors.length)throw Error('Missing audio caused JS exception '+errors.join('; '));await page.close();return {route:'all missing cinematic audio + skip',passed:true};
}
async function longRoute(browser,address){
 const {page,errors}=await launch(browser,address);
 await page.keyboard.press('o');await page.locator('[data-voice="ora"]').setInputFiles(path.join(__dirname,'fixtures/long-ora.mp3'));
 await wait(page,x=>x.clips?.ora.duration>=14,'local clip metadata');await page.locator('#close-options').click();
 await page.keyboard.press('g');await page.keyboard.press('q');await wait(page,x=>x.ora&&x.oraProgress>.22,'long ORA active');
 await page.keyboard.press('o');const paused=await wait(page,x=>x.paused,'ORA pause');await sleep(500);const still=await page.evaluate(()=>window.__JOJO_QA_STATE__);
 if(still.gameMillis!==paused.gameMillis||Math.abs(still.clips.ora.currentTime-paused.clips.ora.currentTime)>.05||!still.clips.ora.paused)throw Error('Pause desynchronized cinematic '+JSON.stringify({paused,still}));
 await page.locator('#close-options').click();const afterOldEnd=await wait(page,x=>x.ora&&x.clips.ora.currentTime>9.6,'long clip passes old cutoff',20000);
 if(afterOldEnd.oraDuration<14000)throw Error('Long clip shortened');await wait(page,x=>!x.ora,'long clip recovery',20000);
 if(errors.length)throw Error('Local clip JS exceptions '+errors.join('; '));await page.close();return {route:'14.2 s local ORA + synchronized pause/resume',passed:true,duration:afterOldEnd.oraDuration};
}
(async()=>{
 let browser;try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const address='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});const results=await Promise.all([missingRoute(browser,address),longRoute(browser,address)]);
  fs.writeFileSync(path.join(output,'cinematic-lifecycle-results.json'),JSON.stringify({revision:process.env.GITHUB_SHA,results},null,2));console.log('PASS cinematic lifecycle',JSON.stringify(results));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
