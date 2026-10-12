#!/usr/bin/env node
// Browser smoke test for 3D Combat Mode 0.1.
// Run: npm run qa:3d
// Requires: npm install; npx playwright install chromium; internet for pinned Three.js CDN.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg'};
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
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(address+'/combat.html',{waitUntil:'domcontentloaded',timeout:45000});
  if(!response||response.status()!==200)throw Error('Combat page failed to load');
  await page.waitForFunction(()=>window.__SHATTERED_QA__&&window.__SHATTERED_QA__.started===false,{timeout:45000});
  await page.getByRole('button',{name:/ENTER THE ARENA/}).click();
  await page.waitForFunction(()=>window.__SHATTERED_QA__?.running===true,{timeout:10000});
  const before=await page.evaluate(()=>window.__SHATTERED_QA__);
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  const after=await page.evaluate(()=>window.__SHATTERED_QA__);
  if(!(after.player.z<before.player.z-.20))throw Error('WASD movement failed: '+JSON.stringify({before:before.player,after:after.player}));
  if(after.enemyState==='patrol')throw Error('Enemy never entered chase behavior');
  await page.mouse.click(700,370);
  await page.waitForTimeout(550);
  if(errors.length)throw Error('Browser JavaScript errors: '+errors.join('; '));
  const output=path.join(__dirname,'artifacts');fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'3d-combat-preview.png')});
  console.log('PASS 3D browser smoke test');
  console.log(JSON.stringify({start:before,after,screenshot:'tests/artifacts/3d-combat-preview.png'},null,2));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(e=>{console.error('FAIL 3D browser smoke test:',e);process.exitCode=1});
