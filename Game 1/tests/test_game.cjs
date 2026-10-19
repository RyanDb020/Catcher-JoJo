// ============================================================
//  test_game.cjs — automatische tests voor de spelregels.
//
//  Start met:  npm test   (of: node tests/test_game.cjs)
//
//  We laden de game-bestanden in een "nep-browser" (Node vm) zonder
//  tekenen of geluid, en spelen dan stukjes van de game na.
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = [
  'config', 'utils', 'storage', 'ui', 'view', 'input', 'audio', 'assets', 'effects', 'background',
  'catcher', 'objects', 'waves', 'cinematics', 'heaven', 'stands', 'cards', 'boss', 'hud', 'screens', 'settings', 'game',
];

// Maakt een nieuwe, schone game-omgeving.
function createGame(seed = 1) {
  const storage = {};
  const keysDown = new Set();
  const sandbox = {
    console,
    Math, Date, JSON, Set, Map, Number, String, Array, Object, Promise, Error,
    performance: { now: () => 0 },
    location: { search: '', protocol: 'http:', href: '' },
    localStorage: {
      getItem: key => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = String(value); },
    },
    window: { addEventListener() {}, location: {} },
    document: { addEventListener() {}, hidden: false, getElementById: () => null, createElement: () => null },
    Audio: function Audio() { return { play: () => Promise.resolve(), pause() {}, addEventListener() {}, cloneNode() { return this; } }; },
    // p5.js-functies die de spelregels gebruiken
    keyIsDown: code => keysDown.has(code),
    LEFT_ARROW: 37, RIGHT_ARROW: 39, UP_ARROW: 38, DOWN_ARROW: 40, ENTER: 13, ESCAPE: 27,
    frameRate: () => 60,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const name of SCRIPTS) {
    const code = fs.readFileSync(path.join(ROOT, 'src', name + '.js'), 'utf8');
    vm.runInContext(code, sandbox, { filename: name + '.js' });
  }
  // Geluid uitzetten: in de test hoeven we niets te horen.
  vm.runInContext(`
    for (const fn of ['play', 'playVoice', 'stopVoice', 'playMusic', 'stopMusic', 'update', 'applyVolumes', 'init']) Sound[fn] = () => null;
    Sound.isVoicePlaying = () => false;
    setRandomSeed(${seed});
    View.compute(1280, 720);
    Game.init();
  `, sandbox);
  const run = code => vm.runInContext(code, sandbox);
  return { run, keysDown, storage };
}

// Een simpele "bot" die naar de orb gaat die het eerst aankomt en bommen ontwijkt.
const BOT = `
  function botStep(dt) {
    if (Game.state === 'playing') {
      const c = Game.catcher;
      let best = null;
      for (const o of Game.objects) {
        if (o.state !== 'fall' || o.passed || !o.isGood || o.type === 'disc') continue;
        const eta = (c.rimY - o.y) / Math.max(1, o.vy);
        if (eta >= 0 && (!best || eta < best.eta)) best = { o, eta };
      }
      let target = best ? best.o.x : Game.fieldW / 2;
      for (const o of Game.objects) {
        if (o.type !== 'bomb' || o.state !== 'fall' || o.passed) continue;
        const eta = (c.rimY - o.y) / Math.max(1, o.vy);
        if (eta > 0 && eta < 0.35 && Math.abs(o.x - target) < c.halfWidth + 20) target = o.x + (target < o.x ? -1 : 1) * (c.halfWidth + 40);
      }
      Input.pointerActive = true;
      Input.pointerX = target;
    }
    if (Game.state === 'cards' && CardScreen.picked < 0 && CardScreen.time > 0.5) CardScreen.choose(0);
    Game.update(dt);
  }
  function simulate(seconds, bot = true) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      if (bot) botStep(1 / 60); else Game.update(1 / 60);
    }
  }
`;

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ---------- hulpfuncties ----------
test('clamp, formatScore en easing werken', () => {
  const { run } = createGame();
  assert.strictEqual(run('clamp(5, 0, 3)'), 3);
  assert.strictEqual(run('clamp(-1, 0, 3)'), 0);
  assert.strictEqual(run('formatScore(1234567)'), '1 234 567');
  assert.strictEqual(run('easeOutCubic(1)'), 1);
  assert.strictEqual(run('easeOutCubic(0)'), 0);
});

test('dezelfde seed geeft dezelfde willekeurige getallen', () => {
  const a = createGame(42).run('[rand(), rand(), rand()].join(",")');
  const b = createGame(42).run('[rand(), rand(), rand()].join(",")');
  const c = createGame(7).run('[rand(), rand(), rand()].join(",")');
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
});

// ---------- combo en punten ----------
test('combo-vermenigvuldiger stijgt bij 10, 25, 50 en 100', () => {
  const { run } = createGame();
  assert.strictEqual(run('JSON.stringify([0, 9, 10, 24, 25, 50, 100, 400].map(c => comboTier(c).mult))'), '[1,1,2,2,3,4,5,5]');
});

test('een orb vangen geeft punten, combo en Stand Energy', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.waves.phase = "spawn";');
  run('const orb = new Faller("orb", Game.catcher.x, Game.catcher.rimY - 2, 300); Game.spawn(orb);');
  run('Game.update(1 / 60); Game.update(1 / 60);');
  assert.strictEqual(run('Game.combo'), 1);
  assert.strictEqual(run("Game.score"), run("POINTS.orb + POINTS.perfect"));
  assert.ok(run('Game.energy') > 0);
});

test('een roze orb missen kost een leven en breekt je combo', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.combo = 12;');
  run('Game.catcher.x = 100; Game.spawn(new Faller("orb", 1100, 600, 400));');
  run('for (let i = 0; i < 40; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.lives'), run('LIVES.start') - 1);
  assert.strictEqual(run('Game.combo'), 0);
});

test('een gouden orb missen kost GEEN leven', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.catcher.x = 100; Game.spawn(new Faller("gold", 1100, 600, 400));');
  run('for (let i = 0; i < 40; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.lives'), run('LIVES.start'));
});

test('een bom vangen kost een leven, King Crimson voorkomt dat', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.spawn(new Faller("bomb", Game.catcher.x, Game.catcher.rimY - 2, 300));');
  run('for (let i = 0; i < 20; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.lives'), run('LIVES.start') - 1);
  run('Game.crimsonShields = 1; Game.graceTime = 0; Game.spawn(new Faller("bomb", Game.catcher.x, Game.catcher.rimY - 2, 300));');
  run('for (let i = 0; i < 20; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.lives'), run('LIVES.start') - 1, 'King Crimson moet de bom uitwissen');
  assert.strictEqual(run('Game.crimsonShields'), 0);
});

test('lieveheersbeestje geeft een leven, maar nooit meer dan het maximum', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.lives = 2; Game.spawn(new Faller("life", Game.catcher.x, Game.catcher.rimY - 2, 300));');
  run('for (let i = 0; i < 10; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.lives'), 3);
  run('Game.lives = Game.maxLives; Game.spawn(new Faller("life", Game.catcher.x, Game.catcher.rimY - 2, 300));');
  run('for (let i = 0; i < 10; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.lives'), run('Game.maxLives'));
});

// ---------- golven ----------
test('golven worden steeds moeilijker en golf 5 is de eindbaas', () => {
  const { run } = createGame();
  const speeds = run('[1, 2, 3, 4].map(w => waveSettings(1, w).speed)');
  for (let i = 1; i < speeds.length; i++) assert.ok(speeds[i] > speeds[i - 1], 'snelheid moet stijgen');
  assert.strictEqual(run('waveSettings(1, 5).isBoss'), true);
  assert.strictEqual(run('waveSettings(1, 2).bombChance'), 0, 'nog geen bommen in golf 2');
  assert.ok(run('waveSettings(1, 3).bombChance') > 0, 'bommen vanaf golf 3');
  assert.ok(run('waveSettings(2, 1).speed') > run('waveSettings(1, 4).speed'), 'universum 2 is sneller');
});

test('de regisseur is eerlijk: elke roze orb is bereikbaar', () => {
  const { run } = createGame(3);
  run(BOT);
  run('Game.startRun(); globalThis.spawnLog = []; const original = Game.spawn.bind(Game); Game.spawn = o => { if (o.mustCatch) spawnLog.push({ x: o.zig ? o.zig.baseX : o.x, t: Game.waves.arrivalTime(o.vy, o.y) }); original(o); };');
  // speel vier golven met een bot
  run('simulate(150)');
  const log = run('spawnLog');
  assert.ok(log.length > 60, 'er moeten genoeg orbs gevallen zijn');
  let violations = 0;
  for (let i = 0; i < log.length; i++) {
    for (let j = i + 1; j < log.length; j++) {
      const gap = Math.abs(log[i].t - log[j].t);
      if (gap > 2) continue;
      const reach = run(`catcherReach(${gap})`);
      if (Math.abs(log[i].x - log[j].x) > reach + 1) violations++;
    }
  }
  // patronen (trap) en noodplekken mogen heel af en toe krap zijn
  assert.ok(violations <= Math.ceil(log.length * 0.03), `te veel onhaalbare orbs: ${violations}`);
});

test('na een golf kies je een kaart en gaat het spel verder', () => {
  const { run } = createGame(5);
  run(BOT);
  run('Game.startRun(); simulate(40)');
  assert.ok(run('Game.waves.wave') >= 2, 'golf 2 moet begonnen zijn');
  const owned = run('Object.values(Game.perks).reduce((a, b) => a + b, 0)');
  assert.ok(owned >= 1, 'er moet een Stand-kaart gekozen zijn');
});

// ---------- Stand-aanvallen ----------
test('aanvallen kosten energie en werken niet zonder genoeg energie', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.energy = 50;');
  assert.strictEqual(run('Stands.activate("ora", Game)'), false);
  run('Game.energy = 300;');
  assert.strictEqual(run('Stands.activate("ora", Game)'), true);
  assert.strictEqual(run('Game.energy'), 200);
  assert.strictEqual(run('Stands.activate("stop", Game)'), false, 'niet twee aanvallen tegelijk');
});

test('ORA ORA slaat orbs in je catcher en bommen kapot', () => {
  const { run } = createGame();
  run(BOT);
  run('Game.startRun(); Game.waves.phase = "done"; Game.objects = [];');
  run('Game.spawn(new Faller("orb", 200, 200, 200)); Game.spawn(new Faller("orb", 900, 150, 200)); Game.spawn(new Faller("bomb", 600, 250, 200));');
  run('Game.energy = 100; Stands.activate("ora", Game); simulate(4, false);');
  assert.strictEqual(run('Game.objects.length'), 0, 'alles moet weg zijn');
  assert.strictEqual(run('Game.stats.caught'), 2);
  assert.strictEqual(run('Game.stats.bombs'), 1);
  assert.strictEqual(run('Game.lives'), run('LIVES.start'));
});

test('ZA WARUDO zet de tijd stil en geeft daarna dubbele punten', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.waves.phase = "done"; Game.energy = 200; Stands.activate("stop", Game);');
  run('for (let i = 0; i < 120; i++) Game.update(1 / 60);'); // 2 seconden: tijd staat stil
  assert.strictEqual(run('Game.timeScale()'), 0);
  assert.strictEqual(run('Stands.desaturation()'), 1);
  run('for (let i = 0; i < 240; i++) Game.update(1 / 60);'); // daarna slow-motion
  assert.ok(run('Game.timeScale()') > 0 && run('Game.timeScale()') < 1);
  assert.strictEqual(run('Stands.scoreBonus()'), 2);
});

test('ZA WARUDO: bommen die The World raakt ontploffen als de tijd weer loopt', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.waves.phase = "done"; Game.objects = []; Game.spawn(new Faller("bomb", 400, 300, 200)); Game.spawn(new Faller("bomb", 800, 200, 200));');
  run('Game.energy = 200; Stands.activate("stop", Game); for (let i = 0; i < 300; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.objects.filter(o => o.type === "bomb").length'), 0);
  assert.strictEqual(run('Game.stats.bombs'), 2);
});

test('ROAD ROLLER verzamelt alles en geeft OVERDRIVE', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.waves.phase = "done"; Game.objects = [];');
  run('for (let i = 0; i < 6; i++) Game.spawn(new Faller(i % 2 ? "orb" : "bomb", 150 + i * 180, 120 + i * 40, 150));');
  run('Game.energy = 300; Stands.activate("roller", Game); for (let i = 0; i < 300; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.objects.length'), 0);
  assert.strictEqual(run('Game.stats.caught'), 3);
  assert.strictEqual(run('Game.stats.bombs'), 3);
  assert.ok(run('Stands.overdrive') > 0);
});

// ---------- eindbaas en universum ----------
test('Pucci verschijnt in golf 5 en verslaan start een nieuw universum', () => {
  const { run } = createGame(9);
  run(BOT);
  run('Game.startRun(); Game.startWave(5); simulate(4);');
  assert.ok(run('Game.boss !== null'), 'de baas moet er zijn');
  const hp = run('Game.boss.hp');
  run('simulate(8)');
  assert.ok(run('Game.boss.hp') < hp, 'gevangen orbs moeten de baas raken');
  run('Game.boss.damage(9999, Game); simulate(3);');
  assert.strictEqual(run('Game.state'), 'reset');
  run('HeavenReset.skip(); HeavenReset.skip(); simulate(0.2);');
  assert.strictEqual(run('Game.universe'), 2);
  run('simulate(2)');
  assert.strictEqual(run('Game.waves.wave'), 1);
  assert.strictEqual(run('Game.waves.universe'), 2);
});

test('Made in Heaven (R) speelt de reset en start daarna een nieuw potje', () => {
  const { run } = createGame(13);
  run(BOT);
  run('Game.startRun(); simulate(12);');
  assert.ok(run('Game.history.length') > 100, 'de gameplay moet opgenomen zijn voor het terugspoelen');
  run('Game.lives = 1; Game.score = 777; Game.catcher.x = 100; Game.spawn(new Faller("orb", 1100, 600, 400)); for (let i = 0; i < 200; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.state'), 'gameover');
  run('GameOverScreen.time = 2; GameOverScreen.onKey("r", 82);');
  assert.strictEqual(run('Game.state'), 'reset');
  assert.ok(run('HeavenReset.history.length') > 100, 'de scène krijgt de opgenomen gameplay mee');
  // alle zes de fasen lopen zonder fouten
  const phases = run('const seen = []; for (let i = 0; i < 60 * 30 && Game.state === "reset"; i++) { if (!seen.includes(HeavenReset.phase)) seen.push(HeavenReset.phase); Game.update(1 / 60); } seen.join(",")');
  assert.strictEqual(phases, 'prayer,manifest,rewind,accelerate,collapse,rebirth');
  assert.strictEqual(run('Game.state'), 'playing');
  assert.strictEqual(run('Game.score'), 0);
  assert.strictEqual(run('Game.lives'), run('LIVES.start'));
  assert.strictEqual(run('Game.waves.wave'), 1);
});

test('Made in Heaven overslaan met spatie gaat meteen naar het nieuwe universum', () => {
  const { run } = createGame(14);
  run('Game.startRun(); Game.pause(); PauseMenu.onKey("r", 82);');
  assert.strictEqual(run('Game.state'), 'reset');
  run('Game.update(1 / 60); Game.onKey(" ", 32);');
  assert.strictEqual(run('HeavenReset.committed'), true);
  run('Game.onKey(" ", 32);');
  assert.strictEqual(run('Game.state'), 'playing');
});

test('een DISC blokkeert je Stand', () => {
  const { run } = createGame();
  run('Game.startRun(); Game.energy = 150; Game.spawn(new Faller("disc", Game.catcher.x, Game.catcher.rimY - 2, 300));');
  run('for (let i = 0; i < 10; i++) Game.update(1 / 60);');
  assert.ok(run('Game.discLock') > 0);
  assert.strictEqual(run('Stands.activate("ora", Game)'), false);
});

// ---------- game over en opslaan ----------
test('game over na het laatste leven en het record wordt opgeslagen', () => {
  const { run, storage } = createGame();
  run('Game.startRun(); Game.lives = 1; Game.score = 4321; Game.catcher.x = 100; Game.spawn(new Faller("orb", 1100, 600, 400));');
  run('for (let i = 0; i < 200; i++) Game.update(1 / 60);');
  assert.strictEqual(run('Game.state'), 'gameover');
  assert.strictEqual(run('Save.data.best'), 4321);
  assert.ok(Object.keys(storage).length > 0, 'opgeslagen in localStorage');
  run('Game.startRun()');
  assert.strictEqual(run('Game.state'), 'playing');
  assert.strictEqual(run('Game.lives'), run('LIVES.start'));
  assert.strictEqual(run('Game.score'), 0);
});

test('de catcher blijft binnen het speelveld', () => {
  const { run, keysDown } = createGame();
  run('Game.startRun();');
  keysDown.add(37);
  run('for (let i = 0; i < 180; i++) Game.update(1 / 60);');
  assert.ok(run('Game.catcher.x - Game.catcher.halfWidth') >= 0);
  keysDown.clear();
  keysDown.add(39);
  run('for (let i = 0; i < 240; i++) Game.update(1 / 60);');
  assert.ok(run('Game.catcher.x + Game.catcher.halfWidth') <= run('Game.fieldW') + 0.001);
});

test('een lang potje met de bot loopt zonder fouten', () => {
  const { run } = createGame(11);
  run(BOT);
  run('Game.startRun(); simulate(240);');
  const state = run('Game.state');
  assert.ok(['playing', 'cards', 'reset', 'gameover'].includes(state));
  assert.ok(run('Game.score') > 1000);
});

// ---------- uitvoeren ----------
let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log('  ✓ ' + name);
  } catch (error) {
    failed++;
    console.log('  ✗ ' + name + '\n      ' + (error && error.message));
  }
}
console.log(`\n${tests.length - failed}/${tests.length} tests geslaagd`);
if (failed) process.exit(1);
