#!/usr/bin/env node
// Reproducible real-browser QA. Run `npm install`, then
// `npx playwright install chromium`, then `npm run qa:browser`.
// The default run includes ten minutes of protected gameplay.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = process.env.QA_OUTPUT_DIR && fs.existsSync(process.env.QA_OUTPUT_DIR)
  ? path.resolve(process.env.QA_OUTPUT_DIR) : root;
const arg = (name, fallback) => {
  const match = process.argv.find(value => value.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
};
const durationMs = Math.max(0, Number(arg('duration-ms', '600000')) || 0);
const label = arg('label', 'after');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.svg':'image/svg+xml','.png':'image/png'};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403); return res.end(); }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); return res.end(error.message); }
    res.writeHead(200, {'content-type': mime[path.extname(target)] || 'application/octet-stream', 'cache-control':'no-store'});
    res.end(data);
  });
});

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  return Number(sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))].toFixed(2));
}
async function shot(page, name) {
  const file = path.join(output, `qa-${label}-${name}.png`);
  await page.screenshot({path:file});
  return file;
}
async function readState(page) {
  return page.evaluate(() => window.__JOJO_QA_STATE__ || null);
}
async function waitState(page, predicate, label, timeout = 12000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const state = await readState(page);
    if (state && predicate(state)) return state;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}; latest QA state: ${JSON.stringify(await readState(page))}`);
}

(async () => {
  const failures = {console:[], page:[], requests:[], badResponses:[]};
  const audioResponses = [];
  const screenshots = [];
  let browser;
  try {
    await new Promise((resolve,reject) => {
      server.once('error',reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:1365,height:900}, deviceScaleFactor:1});
    await page.addInitScript(() => {
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        window.__JOJO_QA_AUTOMATION__ = true;
        window.__qaFrames = [];
        window.__qaAudioEvents = [];
        let previous = 0;
        const frame = now => {
          if (previous) window.__qaFrames.push(now - previous);
          previous = now;
          if (window.__qaFrames.length > 40000) window.__qaFrames.shift();
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        const mediaPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function(...args) {
          window.__qaAudioEvents.push({kind:'media.play',src:this.currentSrc || this.src,time:performance.now()});
          return mediaPlay.apply(this,args);
        };
      }
    });
    page.on('console', message => { if (message.type() === 'error') failures.console.push(message.text()); });
    page.on('pageerror', error => failures.page.push(error.message));
    page.on('requestfailed', request => failures.requests.push({url:request.url(),error:request.failure()?.errorText || 'failed'}));
    page.on('response', response => {
      const url = response.url();
      if (/\.(mp3|wav|ogg)(\?|$)/i.test(url)) audioResponses.push({url,status:response.status()});
      if (response.status() >= 400) failures.badResponses.push({url,status:response.status()});
    });

    await page.goto(`http://127.0.0.1:${port}/index.html?test=1`, {waitUntil:'load'});
    await page.waitForSelector('canvas');
    await page.evaluate(() => {
      const proto = window.p5 && p5.SoundFile && p5.SoundFile.prototype;
      if (!proto) return;
      for (const name of ['play','loop']) {
        const original = proto[name];
        proto[name] = function(...args) {
          window.__qaAudioEvents.push({kind:`p5.${name}`,src:this.url || this._file?.src || '',time:performance.now()});
          return original.apply(this,args);
        };
      }
    });
    await page.keyboard.press('Enter');
    await waitState(page, state => state.gameStarted, 'game start');

    // ZA WARUDO: start, shouted climax, and freeze/release boundary.
    await page.keyboard.press('t');
    await delay(1050); screenshots.push(await shot(page,'time-stop-start'));
    await delay(1250); screenshots.push(await shot(page,'time-stop-climax'));
    await delay(2100); screenshots.push(await shot(page,'time-stop-freeze'));
    await waitState(page, state => state.timeStop === 'slow', 'Time Stop slow phase');

    // Road Roller: visible descent, the 1.39 s contact frame, and the sustained
    // ground-wave aftermath. G is deliberately the existing test energy refill.
    await page.keyboard.press('g'); await page.keyboard.press('e');
    await delay(280); screenshots.push(await shot(page,'road-roller-descent'));
    await delay(1110); screenshots.push(await shot(page,'road-roller-landing'));
    await delay(1050); screenshots.push(await shot(page,'road-roller-aftermath'));
    await waitState(page, state => !state.roadRoller, 'Road Roller completion', 9000);

    // ORA ORA: opening, middle barrage, and final punch/recovery.
    await page.keyboard.press('g'); await page.keyboard.press('q');
    await delay(220); screenshots.push(await shot(page,'ora-start'));
    await delay(1150); screenshots.push(await shot(page,'ora-middle'));
    await delay(1450); screenshots.push(await shot(page,'ora-finish'));
    await waitState(page, state => !state.ora, 'ORA completion', 8000);

    // Made in Heaven: rewind, acceleration/collapse, rebirth and completed run.
    await page.keyboard.press('r');
    await delay(220); screenshots.push(await shot(page,'rewind-start'));
    await delay(2850); screenshots.push(await shot(page,'rewind-acceleration'));
    await delay(1550); screenshots.push(await shot(page,'rewind-collapse'));
    await delay(1300); screenshots.push(await shot(page,'rewind-rebirth'));
    await waitState(page, state => !state.universeReset, 'Made in Heaven completion', 10000);
    screenshots.push(await shot(page,'rewind-end'));

    // Ten-minute sustained play test with life loss suppression enabled only on
    // this local server. Alternate movement to exercise input and rendering.
    const sessionStart = Date.now();
    let nextProgress = 30000;
    while (Date.now() - sessionStart < durationMs) {
      const elapsed = Date.now() - sessionStart;
      if (elapsed >= nextProgress) {
        console.log(`long-session ${Math.floor(elapsed/1000)}s`, await readState(page));
        nextProgress += 30000;
      }
      await page.keyboard.press(elapsed % 4000 < 2000 ? 'ArrowLeft' : 'ArrowRight');
      await delay(Math.min(1800, Math.max(100, durationMs - elapsed)));