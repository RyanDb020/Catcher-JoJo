// Instellingen van de catcher
// Overhaul: tijd, instellingen, highscore en frame-onafhankelijke beweging
let gameClock = 0;
let frameStep = 1;
let lastHistoryCapture = -100;
let bestScore = 0;
let bestCombo = 0;
let perfectCatches = 0;
let catchesTotal = 0;
let rushHitStopUntil = 0;
let catcherTrail = [];
let waveNumber = 1;
let waveNoticeUntil = 0;
let nextEventAt = 17500;
let activeEvent = { type: "none", end: 0 };
let kingCrimson = { active: false, start: 0, used: false };
let awakening = { active: false, end: 0 };
let audioUnlocked = false;
const MAX_PARTICLES = 180;
// Debug-only energy refill is available only on explicit ?test=1 builds.
const DEBUG_TEST_MODE = (() => {
  try { return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === '1'; }
  catch (_) { return false; }
})();
// Playwright injects this flag before loading the game, and only against its
// localhost test server. It cannot be enabled through a public URL or UI.
function qaSuppressLifeLoss() {
  try {
    return typeof window !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
      window.__JOJO_QA_AUTOMATION__ === true;
  } catch (_) { return false; }
}
function publishQaState() {
  try {
    if (typeof window === 'undefined' ||
        !(location.hostname === 'localhost' || location.hostname === '127.0.0.1') ||
        typeof window.__JOJO_QA_AUTOMATION__ !== 'boolean') return;
    window.__JOJO_QA_STATE__ = {
      gameStarted, gameOver, score, lives, timeStop: timeStop.phase,
      roadRoller: roadRoller.active, ora: standRush.active,
      universeReset: universeReset.active, gameMillis: gameClock
    };
  } catch (_) {}
}
// POLISH: een kleine set van tijdelijke feedbacklagen i.p.v. onbeperkte particles
let catchFeedback = [];
let scorePulseEnd = 0;
let lifePulseEnd = 0;
let catcherLean = 0;
let nebulaGradient = null;
let hudEnergyDisplay = 0;
const HIT_FEEDBACK_MS = 410;
const HUD_MARGIN = 20;
function easeOutCubic(t) { t = constrain(t, 0, 1); return 1 - pow(1 - t, 3); }
function easeInOutCubic(t) { t = constrain(t, 0, 1); return t * t * (3 - 2 * t); }
function hudScale() { return constrain(min(width / 1440, height / 850), .77, 1.48); }
// De speler hoeft op een ultrawide monitor niet over 2500 pixels te racen.
function getArenaBounds() {
  const arenaWidth = min(width - 24, max(610, min(1180, width * .78)));
  const left = (width - arenaWidth) / 2;
  return {left, right: width - left, width: arenaWidth};
}
function cacheBackground() {
  // Een canvas-gradient wordt één keer opgebouwd, niet iedere frame opnieuw.
  if (!drawingContext || !drawingContext.createRadialGradient) return;
  const radius = max(width, height) * .75;
  nebulaGradient = drawingContext.createRadialGradient(width * .49, height * .44, 0, width * .49, height * .44, radius);
  nebulaGradient.addColorStop(0, 'rgba(99,37,173,.18)');
  nebulaGradient.addColorStop(.48, 'rgba(46,19,112,.11)');
  nebulaGradient.addColorStop(1, 'rgba(0,0,0,0)');
}

const KING_CRIMSON_COST = 65;
const KING_CRIMSON_MS = 1450;
const PERFECT_WINDOW = 13;
const OVERHAUL_AUDIO = {
  master: 0.78, music: 0.65, voices: 0.95, effects: 0.75,
  shake: true, flashes: true, particles: true, particlesMultiplier: 1, quality: 2, slowFactor: 0.55
};
const soundEffects = {};
const effectLastPlayed = {};
let musicTarget = 0.22;
let previousMusicLevel = -1;
let optionsVisible = false;
let pausedTimeStopVoice = false;
function gameMillis() { return gameClock; }
function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('jojoCatcherSettings') || '{}');
    Object.assign(OVERHAUL_AUDIO, saved);
    bestScore = Number(localStorage.getItem('jojoCatcherBest') || 0) || 0;
    bestCombo = Number(localStorage.getItem('jojoCatcherCombo') || 0) || 0;
  } catch (_) {}
}
function saveSettings() {
  try { localStorage.setItem('jojoCatcherSettings', JSON.stringify(OVERHAUL_AUDIO)); } catch (_) {}
}
function updateRecords() {
  let dirty = false;
  if (score > bestScore) { bestScore = score; dirty = true; }
  if (combo > bestCombo) { bestCombo = combo; dirty = true; }
  if (dirty) {
    try { localStorage.setItem('jojoCatcherBest', String(bestScore)); localStorage.setItem('jojoCatcherCombo', String(bestCombo)); } catch (_) {}
  }
}
function openOptions(value) {
  optionsVisible = value;
  const panel = document.getElementById('options-panel');
  if (panel) panel.hidden = !value;
  if (value) {
    stopJoJoVoices();
    pausedTimeStopVoice = timeStopSoundLoaded && timeStopSound && timeStopSound.isPlaying();
    if (pausedTimeStopVoice && typeof timeStopSound.pause === 'function') timeStopSound.pause();
  } else if (pausedTimeStopVoice && timeStopSoundLoaded) {
    pausedTimeStopVoice = false;
    timeStopSound.setVolume(0.85 * OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.voices);
    timeStopSound.play();
  }
}
function applySetting(name, value) {
  if (!(name in OVERHAUL_AUDIO)) return;
  OVERHAUL_AUDIO[name] = (name === 'shake' || name === 'flashes' || name === 'particles') ? !!value : Number(value);
  if (name === 'slowFactor') OVERHAUL_AUDIO.slowFactor = getSlowFactor();
  if (name === 'quality') rebuildVisuals();
  saveSettings();
  if (backgroundMusicLoaded && backgroundMusic && backgroundMusic.isPlaying()) {
    backgroundMusic.setVolume(musicTarget * OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.music, 0.12);
  }
}

let catcherX = 280;
let catcherY = 435;
let catcherWidth = 150;
let catcherHeight = 80;

const NORMAL_CATCHER_WIDTH = 150;
const WIDE_CATCHER_WIDTH = 250;

// Spel regels
let gameStarted = false;

// Sterren achtergrond
let stars = [];
const STAR_COUNT = 100;
const STAR_MIN_SPEED = 1;
const STAR_MAX_SPEED = 3;
const STAR_MIN_SIZE = 1;
const STAR_MAX_SIZE = 4;

// Geluid
let gameOverSound;
let backgroundMusic;
let timeStopSound;
let gameOverSoundPlayed = false;
let backgroundMusicLoaded = false;
let gameOverSoundLoaded = false;
let timeStopSoundLoaded = false;

// Vaste instellingen van het spel
const CATCHER_SPEED = 18;
const BALL_SIZE = 30;
const ACTIVE_BALLS = 6;
const BALL_MIN_SPEED = 2;
const BALL_MAX_SPEED = 7;
const BALL_MIN_Y = -1500;
const BALL_MAX_Y = 0;
const MAX_LIVES = 5;
const START_LIVES = 3;
const BUCKET_INSET = 20;
const GAME_OVER_TEXT_SIZE = 36;
const INFO_TEXT_SIZE = 24;

// Power up instellingen
const POWERUP_SIZE = 35;
const POWERUP_SPEED = 4;
const POWERUP_SPAWN_TIME = 400;
const WIDE_POWERUP_TIME = 8000;
const SLOW_POWERUP_TIME = 7000;
const DOUBLE_POWERUP_TIME = 7000;

// JOJO STAND SYSTEM: vaardigheden en energie
const STAND_MAX_ENERGY = 100;
const ORA_RUSH_COST = 55;
const ROAD_ROLLER_COST = 100;
const ORA_RUSH_DURATION_MS = 2650;
const ROAD_ROLLER_DURATION_MS = 3150;
const ROAD_ROLLER_IMPACT_MS = 2350;
const ROAD_ROLLER_LAND_MS = 1390;
const STAND_PUNCH_INTERVAL_MS = 165;

// Gouden bal instellingen
const GOLD_BALL_CHANCE = 0.10;
const GOLD_BALL_POINTS = 5;

// Variabelen van het spel
let balls = [];
let score = 0;
let lives = START_LIVES;
let combo = 0;
let gameOver = false;
let gameOverAt = 0;
let gameOverRevealAt = 0;
let gameOverBannerPlayed = false;
let roadRollerImpact = {active:false, at:0, x:0, y:0};
let gameplayFrames = 0;

// Power ups
let powerUps = [];
let widePowerUpEnd = 0;
let slowPowerUpEnd = 0;
let doublePowerUpEnd = 0;

// JOJO: Stand-meter, manga effecten en speciale aanvallen
let standEnergy = 0;
let standRush = { active: false, start: 0, lastPunch: 0, punches: 0 };
let roadRoller = { active: false, start: 0, landed: false };
let jojoPopups = [];
let jojoParticles = [];
let standPunches = [];
let jojoShake = 0;
let mangaPulse = 0;

// MADE IN HEAVEN: R speelt je laatste seconden achteruit,
// versnelt de tijd en begint opnieuw in een nieuw universum.
const REWIND_MS = 1550;
const ACCELERATE_MS = 2950;
const SINGULARITY_MS = 1200;
const REBIRTH_MS = 1650;
const UNIVERSE_RESET_MS = REWIND_MS + ACCELERATE_MS + SINGULARITY_MS + REBIRTH_MS;
const HISTORY_MAX_FRAMES = 210;
let universeNumber = 1;
let universeHistory = [];
let universeReset = { active: false, started: 0, source: [], committed: false,
                      soundAccelerated: false, soundCollapse: false };

// Optionele JoJo-voiceclips van Myinstants.
// De originele ZA WARUDO staat lokaal. Deze links werken alleen met internet
// én wanneer Myinstants rechtstreeks afspelen in de browser toestaat.
// Als een link niet werkt, blijven de effecten en synthgeluiden werken.
const JOJO_CLIP_URLS = {
  // Optionele lokale bestanden: worden alleen ingeladen als je ze zelf toevoegt.
  // De ingesproken ZA WARUDO is al meegeleverd en wordt apart afgespeeld.
};

let jojoVoiceClips = {};
let jojoVoiceObjectUrls = {};


// JOJO TIME STOP: instellingen
const TIME_STOP_INTRO_MS = 4500;      // Duur van de stem + filmische intro
const TIME_STOP_FREEZE_MS = 500;     // Daarna staat alles helemaal stil
const TIME_STOP_RELEASE_MS = 850;    // Effect wanneer de tijd terugkomt
const TIME_STOP_SLOW_FACTOR = 0.55;   // Speelbare slowmotion: 55% normale snelheid
const TIME_STOP_EXTRA_MS = 2000;      // Extra tijd bij tweede S-power-up

// JOJO TIME STOP: status en effectdeeltjes
let timeStop = {
  phase: "idle",                       // idle, intro, freeze, slow, release
  phaseStart: 0,
  x: 0,
  y: 0,
  impactPlayed: false,
  freezePlayed: false,
  particles: []
};

// Geluiden laden
function preload() {
  // De game draait zonder geluid door wanneer alleen de p5.sound addon faalt.
  if (typeof loadSound !== 'function') return;
  gameOverSound = loadSound("assets/jixaw-metal-pipe-falling-sound.mp3",
    () => { gameOverSoundLoaded = true; },
    () => { gameOverSoundLoaded = false; });
  backgroundMusic = loadSound("assets/background-music.mp3",
    () => { backgroundMusicLoaded = true; },
    () => { backgroundMusicLoaded = false; });
  timeStopSound = loadSound("assets/za-warudo-toki-wo-tomare_WJVdsYt.mp3",
    () => { timeStopSoundLoaded = true; },
    () => { timeStopSoundLoaded = false; });
  for (const key of ['catch', 'perfect', 'power', 'punch', 'impact', 'rewind', 'rebirth', 'roller', 'miss']) {
    soundEffects[key] = { sound: null, ready: false };
    soundEffects[key].sound = loadSound('assets/sfx-' + key + '.mp3',
      () => { soundEffects[key].ready = true; },
      () => { soundEffects[key].ready = false; });
  }
}

function setup() {
  readSettings();
  createCanvas(max(windowWidth, 640), max(windowHeight, 480));
  if (typeof pixelDensity === 'function' && typeof displayDensity === 'function') pixelDensity(renderDensity());
  cacheBackground();
  rebuildVisuals();
  frameRate(60);
  catcherX = width / 2 - catcherWidth / 2;
  catcherY = height - catcherHeight - 5;
  textFont("Arial");

  // Maakt alle ballen aan met een willekeurige positie en snelheid
  for (let i = 0; i < ACTIVE_BALLS; i++) {
    balls.push({
      x: random(getArenaBounds().left + BALL_SIZE, getArenaBounds().right - BALL_SIZE),
      y: random(BALL_MIN_Y, BALL_MAX_Y),
      speed: random(BALL_MIN_SPEED, BALL_MAX_SPEED),
      gold: false, kind: 'normal', targeted: false, birth: 0
    });
  }

  for (const ball of balls) respawnBall(ball);

  // Maakt sterren aan voor de achtergrond
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      speed: random(STAR_MIN_SPEED, STAR_MAX_SPEED),
      size: random(STAR_MIN_SIZE, STAR_MAX_SIZE)
    });
  }

  if (backgroundMusicLoaded) backgroundMusic.setVolume(0.18 * OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.music);
  if (timeStopSoundLoaded) timeStopSound.setVolume(0.85 * OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.voices);
  prepareJoJoVoiceClips();
  const closeBtn = document.getElementById("close-options");
  if (closeBtn) closeBtn.addEventListener("click", () => openOptions(false));
  document.querySelectorAll('[data-voice]').forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file || !file.type.startsWith('audio/')) return;
      const name = input.dataset.voice;
      if (jojoVoiceClips[name]) jojoVoiceClips[name].pause();
      if (jojoVoiceObjectUrls[name]) URL.revokeObjectURL(jojoVoiceObjectUrls[name]);
      const url = URL.createObjectURL(file);
      jojoVoiceObjectUrls[name] = url;
      const clip = new Audio(url);
      clip.preload = 'auto';
      jojoVoiceClips[name] = clip;
    });
  });
  document.querySelectorAll("[data-setting]").forEach(control => {
    const name = control.dataset.setting;
    control.type === "checkbox" ? control.checked = OVERHAUL_AUDIO[name] : control.value = OVERHAUL_AUDIO[name];
    control.addEventListener("input", () => applySetting(name, control.type === "checkbox" ? control.checked : control.value));
  });
}

function keyPressed() {
  if (typeof userStartAudio === 'function') userStartAudio();
  audioUnlocked = true;
  if (key === 'o' || key === 'O' || keyCode === ESCAPE) {
    openOptions(keyCode === ESCAPE ? false : !optionsVisible);
    return false;
  }
  if (optionsVisible) return false;
  // SPACE slaat lange cinematische scènes over, niet de beloning of reset.
  if (keyCode === 32 && universeReset.active) {
    stopJoJoVoices();
    universeReset.started = gameMillis() - UNIVERSE_RESET_MS + 230;
    return false;
  }
  if (keyCode === 32 && timeStop.phase === 'intro') {
    if (timeStopSoundLoaded && timeStopSound.isPlaying()) timeStopSound.stop();
    timeStop.phase = 'freeze';
    timeStop.phaseStart = gameMillis();
    playTimeSound('freeze');
    return false;
  }
  if (!gameStarted && keyCode === ENTER && !universeReset.active) {
    gameStarted = true;
    if (backgroundMusicLoaded && !backgroundMusic.isPlaying()) backgroundMusic.loop();
  }
  if (key === 'r' || key === 'R') {
    startUniverseReset();
    return false;
  }
  if (universeReset.active) return false;
  if ((key === 't' || key === 'T') && gameStarted && !gameOver) startTimeStop(catcherX + catcherWidth / 2, catcherY);
  if ((key === 'q' || key === 'Q') && gameStarted && !gameOver) startStandRush();
  if ((key === 'e' || key === 'E') && gameStarted && !gameOver) startRoadRoller();
  if ((key === 'f' || key === 'F') && gameStarted && !gameOver) startKingCrimson();
  if (DEBUG_TEST_MODE && (key === 'g' || key === 'G') && gameStarted && !gameOver) {
    standEnergy = STAND_MAX_ENERGY;
    addJoJoPopup('STAND READY!', width / 2, height * 0.25, '#ffc65d', 900, 34);
  }
  if ([LEFT_ARROW, RIGHT_ARROW, 32].includes(keyCode)) return false;
}

function resetGame() {
  score = 0;
  lives = START_LIVES;
  combo = 0;
  gameplayFrames = 0;
  perfectCatches = 0;
  catchesTotal = 0;
  rushHitStopUntil = 0;
  catcherTrail = [];
  waveNumber = 1;
  waveNoticeUntil = 0;
  nextEventAt = gameMillis() + 17500;
  activeEvent = { type: 'none', end: 0 };
  kingCrimson = { active: false, start: 0, used: false };
  awakening = { active: false, end: 0 };
  gameOver = false;
  gameOverAt = 0;
  gameOverRevealAt = 0;
  gameOverBannerPlayed = false;
  roadRollerImpact = {active:false, at:0, x:0, y:0};
  gameOverSoundPlayed = false;
  catcherWidth = NORMAL_CATCHER_WIDTH;
  catcherX = width / 2 - catcherWidth / 2;
  widePowerUpEnd = 0;
  slowPowerUpEnd = 0;
  doublePowerUpEnd = 0;
  powerUps = [];
  standEnergy = 0;
  standRush = { active: false, start: 0, lastPunch: 0, punches: 0 };
  roadRoller = { active: false, start: 0, landed: false };
  jojoPopups = [];
  jojoParticles = [];
  standPunches = [];
  jojoShake = 0;
  mangaPulse = 0;
  catchFeedback = [];
  scorePulseEnd = 0;
  lifePulseEnd = 0;
  catcherLean = 0;
  hudEnergyDisplay = 0;
  universeHistory = [];
  lastHistoryCapture = -100;
  timeStop.phase = "idle";
  timeStop.particles = [];
  if (timeStopSoundLoaded && timeStopSound.isPlaying()) timeStopSound.stop();

  for (let i = 0; i < ACTIVE_BALLS; i++) {
    respawnBall(balls[i]);
  }
  if (backgroundMusicLoaded) {
    updateMusicVolume(true);
    if (gameStarted && !backgroundMusic.isPlaying()) backgroundMusic.loop();
  }
  if (gameOverSoundLoaded && gameOverSound.isPlaying()) gameOverSound.stop();
}

function respawnBall(ball) {
  ball.y = random(BALL_MIN_Y, BALL_MAX_Y);
  ball.x = random(getArenaBounds().left + BALL_SIZE, getArenaBounds().right - BALL_SIZE);
  ball.speed = random(BALL_MIN_SPEED, BALL_MAX_SPEED);
  ball.gold = random(1) < GOLD_BALL_CHANCE;
  ball.kind = ball.gold ? 'gold' : (random(1) < 0.065 ? 'bomb' : 'normal');
  ball.targeted = false;
  ball.birth = gameMillis();
}

// Tekent de catcher als een bucket
function drawBucket(x, y) {
  if (!visualAtlas.catcher) return;
  const ctx = drawingContext, mid = x + catcherWidth / 2;
  ctx.save();
  ctx.translate(mid, y + catcherHeight*.5); ctx.rotate(catcherLean*.018);
  ctx.drawImage(visualAtlas.catcher, -catcherWidth/2-8, -catcherHeight*.5-5, catcherWidth+16, catcherHeight+10);
  const cold = timeStop.phase !== 'idle';
  ctx.globalCompositeOperation = 'screen';
  const lit = ctx.createRadialGradient(0,-3,1,0,-3,28);
  lit.addColorStop(0,cold?'#ceffff':'#f5d1ff'); lit.addColorStop(.25,cold?'#318dab':'#7a389d'); lit.addColorStop(1,'transparent');
  ctx.fillStyle=lit; ctx.fillRect(-28,-31,56,56);
  ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle=cold?'#a6f5ff':'#e2b9ff'; ctx.lineWidth=1.3;
  ctx.beginPath(); ctx.arc(0,-3,13,gameMillis()*.002,gameMillis()*.002+4.3); ctx.stroke();
  for(const ball of balls) {
    const dx=ball.x-mid, dy=ball.y-y;
    if(Math.abs(dx)<catcherWidth*.7 && dy<0 && dy>-110) {
      ctx.globalAlpha=(1+dy/110)*.4; ctx.fillStyle=ball.gold?'#ffe8a0':'#ff8fbd';
      ctx.fillRect(Math.max(-catcherWidth/2,dx-16),-catcherHeight*.5,32,3);
    }
  }
  ctx.restore();
  push(); noFill();
  for (const f of catchFeedback) {
    const age=(gameMillis()-f.at)/HIT_FEEDBACK_MS;
    if(age<0||age>=1)continue;
    stroke(f.perfect?color(255,224,139,(1-age)*240):color(158,227,255,(1-age)*180)); strokeWeight((1-age)*3+1);
    ellipse(f.x,y+4,15+80*easeOutCubic(age),5+22*easeOutCubic(age));
  }
  pop();
}

function drawCatcherGhostTrail() {
  push(); noStroke();
  for (let i = 0; i < catcherTrail.length; i++) {
    const part = catcherTrail[i];
    fill(186, 132, 255, (i + 1) * 8);
    quad(part.x, catcherY + 8, part.x + catcherWidth, catcherY + 8,
         part.x + catcherWidth - BUCKET_INSET, catcherY + catcherHeight - 4,
         part.x + BUCKET_INSET, catcherY + catcherHeight - 4);
  }
  pop();
}

// Controleert of een bal de catcher raakt
function isCaught(ballX, ballY) {
  return (
    ballX + BALL_SIZE / 2 > catcherX &&
    ballX - BALL_SIZE / 2 < catcherX + catcherWidth &&
    ballY + BALL_SIZE / 2 > catcherY &&
    ballY - BALL_SIZE / 2 < catcherY + catcherHeight
  );
}

// Controleert of een power up de catcher raakt
function isPowerUpCaught(powerUpX, powerUpY) {
  return (
    powerUpX + POWERUP_SIZE / 2 > catcherX &&
    powerUpX - POWERUP_SIZE / 2 < catcherX + catcherWidth &&
    powerUpY + POWERUP_SIZE / 2 > catcherY &&
    powerUpY - POWERUP_SIZE / 2 < catcherY + catcherHeight
  );
}

// Tekent en beweegt de sterrenachtergrond
function drawSpaceBackground(speedFactor) {
  background(5, 5, 20);
  if (nebulaGradient) {
    const ctx = drawingContext;
    ctx.fillStyle = nebulaGradient;
    ctx.fillRect(0, 0, width, height);
  }
  drawCosmicAtlas();
  // Drie afstandslagen met een kalme twinkle en een bewegingsstreep per ster.
  const clock = gameMillis() * .001;
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const distance = .35 + star.speed * .24;
    const travel = star.speed * speedFactor * frameStep * distance;
    star.y += travel;
    if (star.y > height + 8) { star.y = -5; star.x = random(width); }
    const twinkle = 145 + 60 * sin(clock * (.6 + distance) + i * 7.17);
    const size = star.size * (.5 + distance * .35);
    noStroke(); fill(190 + distance * 28, 192 + distance * 17, 255, twinkle);
    circle(star.x, star.y, size);
    if (abs(travel) > .7 && speedFactor > .15) {
      stroke(155, 125, 240, min(135, travel * 22)); strokeWeight(max(.7, size * .6));
      line(star.x, star.y - min(22, travel * 4), star.x, star.y - size);
    }
  }
}

function createPowerUp() {
  // De paarse Stand Arrow-bol heeft ongeveer 20% kans
  let powerUpType = random(["life", "wide", "slow", "double", "stand"]);
  powerUps.push({
    x: random(getArenaBounds().left + POWERUP_SIZE, getArenaBounds().right - POWERUP_SIZE),
    y: 0,
    type: powerUpType
  });
}

// Tekent de power ups, controleert botsingen en activeert bonussen
function drawPowerUps(speedFactor) {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    let powerUp = powerUps[i];
    powerUp.y += POWERUP_SPEED * speedFactor * frameStep;
    drawPowerUpBall(powerUp);

    // Tijdens de filmische intro blijven alle objecten exact op hun plek
    if (speedFactor === 0) continue;

    if (isPowerUpCaught(powerUp.x, powerUp.y)) {
      if (powerUp.type === "life") {
        if (lives < MAX_LIVES) lives++;
        else score++;
      }
      if (powerUp.type === "wide") {
        catcherWidth = WIDE_CATCHER_WIDTH;
        widePowerUpEnd = gameMillis() + WIDE_POWERUP_TIME;
      }
      if (powerUp.type === "slow") {
        startTimeStop(powerUp.x, powerUp.y);
      }
      if (powerUp.type === "double") {
        doublePowerUpEnd = gameMillis() + DOUBLE_POWERUP_TIME;
      }
      if (powerUp.type === "stand") {
        gainStandEnergy(40);
        burstJoJoParticles(powerUp.x, powerUp.y, "#be83ff", 18);
        addJoJoPopup("STAND +40", powerUp.x, powerUp.y - 30, "#dfb2ff", 900, 24);
        playStandSound("power");
      }
      if (powerUp.type !== 'stand') playCue('power');
      powerUps.splice(i, 1);
    } else if (powerUp.y > height) {
      powerUps.splice(i, 1);
    }
  }
}

function drawPowerUpBall(powerUp) {
  push();
  const palette = {
    life: [40, 230, 90],
    wide: [255, 215, 50],
    slow: [70, 230, 255],
    double: [200, 75, 255],
    stand: [155, 92, 255]
  };
  const colorValue = palette[powerUp.type];
  drawingContext.shadowBlur = powerUp.type === "slow" ? 28 : 12;
  drawingContext.shadowColor = `rgb(${colorValue.join(",")})`;
  fill(...colorValue);
  stroke(255);
  strokeWeight(2);
  circle(powerUp.x, powerUp.y, POWERUP_SIZE);
  if (powerUp.type === "slow") {
    noFill();
    stroke(115, 238, 255, 160);
    strokeWeight(2);
    circle(powerUp.x, powerUp.y, POWERUP_SIZE + 10 + sin(frameCount * 0.14) * 5);
  }
  noStroke();
  fill(powerUp.type === "double" ? "white" : "black");
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(powerUp.type === "double" ? 14 : 16);
  const symbol = {life: "+1", wide: "W", slow: "S", double: "x2", stand: "★"};
  text(symbol[powerUp.type], powerUp.x, powerUp.y + 1);
  pop();
}

// ==================== JOJO TIME STOP ====================

// Wordt aangeroepen zodra je de blauwe S-bal opvangt
function startTimeStop(x, y) {
  if (timeStop.phase !== 'idle') {
    if (timeStop.phase === 'slow') slowPowerUpEnd += TIME_STOP_EXTRA_MS;
    return;
  }
  stopJoJoVoices();
  timeStop.phase = "intro";
  timeStop.phaseStart = gameMillis();
  timeStop.x = x;
  timeStop.y = y;
  timeStop.impactPlayed = false;
  timeStop.freezePlayed = false;
  timeStop.particles = [];
  slowPowerUpEnd = 0;

  // Deeltjes van de explosie worden eenmaal aangemaakt
  for (let i = 0; i < 80; i++) {
    timeStop.particles.push({
      angle: random(TWO_PI),
      speed: random(130, 950),
      length: random(5, 45),
      thickness: random(1, 4),
      gold: random() < 0.24
    });
  }

  // Het originele meegestuurde spraakfragment start tegelijk met de animatie
  if (timeStopSoundLoaded) {
    timeStopSound.stop();
    timeStopSound.setVolume(0.85 * OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.voices);
    timeStopSound.play();
  }
  updateMusicVolume(true);
  playTimeSound("charge");
}

// Verandert de fases: intro -> bevroren -> slowmotion -> release -> normaal
function updateTimeStop() {
  if (timeStop.phase === "idle") return;
  const elapsed = gameMillis() - timeStop.phaseStart;

  if (timeStop.phase === "intro") {
    if (!timeStop.impactPlayed && elapsed >= 950) {
      timeStop.impactPlayed = true;
      playTimeSound("impact");
    }
    if (!timeStop.freezePlayed && elapsed >= 3900) {
      timeStop.freezePlayed = true;
      playTimeSound("freeze");
    }
    if (elapsed >= TIME_STOP_INTRO_MS) {
      timeStop.phase = "freeze";
      timeStop.phaseStart = gameMillis();
    }
  } else if (timeStop.phase === "freeze" && elapsed >= TIME_STOP_FREEZE_MS) {
    timeStop.phase = gameOver ? "release" : "slow";
    timeStop.phaseStart = gameMillis();
    if (gameOver) {
      slowPowerUpEnd = 0;
      playTimeSound("resume");
    } else slowPowerUpEnd = gameMillis() + SLOW_POWERUP_TIME;
  } else if (timeStop.phase === "slow" && gameMillis() >= slowPowerUpEnd) {
    timeStop.phase = "release";
    timeStop.phaseStart = gameMillis();
    slowPowerUpEnd = 0;
    playTimeSound("resume");
    updateMusicVolume(true);
  } else if (timeStop.phase === "release" && elapsed >= TIME_STOP_RELEASE_MS) {
    timeStop.phase = "idle";
    timeStop.particles = [];
  }
}

// Dit beïnvloedt de echte spelphysics (en niet alleen de animatie)
function getTimeSpeed() {
  if (timeStop.phase === "intro" || timeStop.phase === "freeze") return 0;
  if (timeStop.phase === "slow") return getSlowFactor();
  if (timeStop.phase === "release") {
    const t = constrain((gameMillis() - timeStop.phaseStart) / TIME_STOP_RELEASE_MS, 0, 1);
    return lerp(getSlowFactor(), 1, t * t * (3 - 2 * t));
  }
  return 1;
}

// Extra geluidseffecten zonder aparte mp3's: synthese via de browser
function playTimeSound(kind) {
  const sfx = {charge: 'rewind', impact: 'impact', freeze: 'perfect', resume: 'rebirth'};
  playCue(sfx[kind] || 'power', 0.85);
}

// Een lichte schok van het speelveld op de zware stem/impact
function getCameraShake() {
  if (timeStop.phase !== "intro") return 0;
  const elapsed = gameMillis() - timeStop.phaseStart;
  if (elapsed < 950) return 1.2;
  if (elapsed < 1600) return 12 * (1 - (elapsed - 950) / 650);
  if (elapsed >= 3500 && elapsed < 4100) return 5 * (1 - (elapsed - 3500) / 600);
  return 0;
}

// Visuele laag over het speelveld: kleurfilter, klok, scherven en tekst
function drawTimeStopEffects() {
  if (timeStop.phase === "idle") return;
  const phase = timeStop.phase;
  if (phase === "slow") return; // Speelveld blijft volledig vrij.
  const elapsed = gameMillis() - timeStop.phaseStart;
  push();
  noStroke();

  // Kleurverschuiving: paars tijdens de intro, ijzig blauw tijdens de stop
  if (phase === "intro") fill(55, 10, 125, 72);
  else if (phase === "release") fill(120, 195, 255, 40 * (1 - elapsed / TIME_STOP_RELEASE_MS));
  else fill(20, 85, 135, 65);
  rect(0, 0, width, height);

  // Donkere hoeken zoals een anime-cinematische shot
  const ctx = drawingContext;
  const radius = max(width, height) * 0.83;
  const vignette = ctx.createRadialGradient(width / 2, height / 2, radius * 0.1,
                                           width / 2, height / 2, radius);
  vignette.addColorStop(0, "rgba(5, 10, 35, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 20, 0.83)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  if (phase === "intro") {
    drawTimeZoom(elapsed);
    drawTimeStopClock(elapsed);
    drawTimeExplosion(elapsed);
    drawSpeedLines(elapsed);
    drawAnimeText(elapsed);

    // Twee korte flitsen, geen voortdurende stroboscoop
    let flashAlpha = 0;
    if (elapsed >= 950 && elapsed < 1130) flashAlpha = 150 * (1 - (elapsed - 950) / 180);
    if (elapsed >= 3800 && elapsed < 3950) flashAlpha = max(flashAlpha, 105 * (1 - (elapsed - 3800) / 150));
    if (flashAlpha > 0 && OVERHAUL_AUDIO.flashes) {
      fill(215, 235, 255, flashAlpha);
      rect(0, 0, width, height);
    }

    // Cinematische zwarte balken boven- en onderaan
    const bar = min(55, height * 0.075) * constrain(elapsed / 250, 0, 1);
    fill(0, 0, 12, 245);
    rect(0, 0, width, bar);
    rect(0, height - bar, width, bar);
  } else if (phase === "freeze") {
    drawFrozenClock();
    drawFrozenParticles();
    drawFrozenTitle();
  } else if (phase === "release") {
    const progress = constrain(elapsed / TIME_STOP_RELEASE_MS, 0, 1);
    noFill();
    stroke(100, 230, 255, (1 - progress) * 240);
    strokeWeight(9 * (1 - progress) + 1);
    circle(width / 2, height / 2, progress * max(width, height) * 2);
    noStroke();
    fill(255, 255, 255, 200 * (1 - progress));
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(min(width * 0.06, 54));
    text("TIME RESUMES", width / 2, height / 2);
  }
  pop();
}

function drawTimeExplosion(elapsed) {
  const progress = constrain(elapsed / 1350, 0, 1);
  const eased = 1 - pow(1 - progress, 3);
  const centerX = width / 2;
  const centerY = height / 2;
  push();
  noFill();
  for (let i = 0; i < 4; i++) {
    const ringT = constrain(eased - i * 0.13, 0, 1);
    const reach = (0.12 + ringT * 1.05) * max(width, height) * 0.78;
    stroke(i % 2 === 0 ? color(120, 235, 255, (1 - ringT) * 145) : color(252, 210, 95, (1 - ringT) * 105));
    strokeWeight(1.3 + (3 - i) * 0.8);
    circle(centerX, centerY, reach);
  }
  for (const part of timeStop.particles) {
    const seconds = elapsed / 1000;
    const distance = part.speed * seconds;
    const px = centerX + cos(part.angle) * distance;
    const py = centerY + sin(part.angle) * distance;
    const opacity = 230 * (1 - constrain(elapsed / 1900, 0, 1));
    stroke(part.gold ? color(255, 205, 75, opacity) : color(130, 240, 255, opacity));
    strokeWeight(part.thickness);
    line(px, py, px + cos(part.angle) * part.length, py + sin(part.angle) * part.length);
  }
  pop();
}

function drawSpeedLines(elapsed) {
  if (elapsed > 2600) return;
  push();
  translate(width / 2, height / 2);
  stroke(180, 195, 255, 66 * (1 - elapsed / 2600));
  strokeWeight(1.4);
  for (let i = 0; i < 28; i++) {
    const angle = i * TWO_PI / 28;
    const start = max(width, height) * (0.40 + (i % 3) * 0.045);
    const finish = max(width, height) * 1.1;
    line(cos(angle) * start, sin(angle) * start,
         cos(angle) * finish, sin(angle) * finish);
  }
  pop();
}

// A detailed chronometer gives the Time Stop buildup a clear visual focal point.
function drawTimeStopClock(elapsed) {
  if (!visualAtlas.clock || elapsed < 620 || elapsed > 3920) return;
  const reveal = easeInOutCubic(constrain((elapsed - 620) / 540, 0, 1));
  const fade = constrain((3920 - elapsed) / 480, 0, 1);
  const radius = min(width, height) * (0.19 + reveal * 0.065);
  const ctx = drawingContext;
  const cx = width / 2, cy = height * 0.67;
  ctx.save();
  ctx.globalAlpha = reveal * fade;
  ctx.translate(cx, cy);
  const pulse = 1 + Math.sin(elapsed * 0.004) * 0.012;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = 'rgba(109,218,255,.68)';
  ctx.shadowBlur = 25 + 10 * Math.sin(elapsed * .006);
  ctx.strokeStyle = 'rgba(189,232,255,.56)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, radius * 1.10, 0, TWO_PI); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.rotate(-elapsed * 0.00028);
  ctx.drawImage(visualAtlas.clock, -radius, -radius, radius * 2, radius * 2);
  // A moving escapement ring and jewel markers add depth without hiding the
  // engraved face or relying on a denser particle layer.
  ctx.rotate(elapsed * .00115);
  ctx.strokeStyle = 'rgba(182,235,255,.58)'; ctx.lineWidth = 1.2;
  if (ctx.setLineDash) ctx.setLineDash([radius * .018, radius * .022]);
  ctx.beginPath(); ctx.arc(0, 0, radius * .89, .2, TWO_PI - .2); ctx.stroke();
  if (ctx.setLineDash) ctx.setLineDash([]);
  for (let i = 0; i < 12; i++) {
    const a = i * TWO_PI / 12, markR = radius * .97;
    ctx.save(); ctx.rotate(a); ctx.translate(0, -markR);
    ctx.fillStyle = i % 3 === 0 ? '#ffe6a4' : '#b9eaff';
    ctx.shadowColor = i % 3 === 0 ? '#ffcc70' : '#89dcff'; ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3, 0); ctx.lineTo(0, 4); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.rotate(-elapsed * .00115);
  ctx.strokeStyle = 'rgba(202,243,255,.78)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, radius * .08); ctx.lineTo(0, -radius * .81); ctx.stroke();
  ctx.fillStyle = '#f8d991'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TWO_PI); ctx.fill();
  ctx.restore();
}

function drawAnimeText(elapsed) {
  let words = "";
  let subline = "";
  let opacity = 255;
  if (elapsed >= 350 && elapsed < 2050) {
    words = "ZA WARUDO!";
    subline = "THE WORLD";
    opacity = min(255, (elapsed - 350) * 2.0, (2050 - elapsed) * 1.8);
  } else if (elapsed >= 2050 && elapsed < 4300) {
    words = "TOKI WO TOMARE!";
    subline = "時よ止まれ";
    opacity = min(255, (elapsed - 2050) * 2.0, (4300 - elapsed) * 1.8);
  }
  if (!words) return;

  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  drawingContext.shadowColor = "#d2a4ff";
  drawingContext.shadowBlur = 28;
  let fontSize = min(width / (words.length * 0.66), 90, height * 0.15);
  textSize(fontSize);
  stroke(13, 5, 36, opacity);
  strokeWeight(8);
  fill(255, 218, 105, opacity);
  const jitter = elapsed < 1100 ? sin(elapsed * 0.09) * 6 : 0;
  text(words, width / 2 + jitter, height * 0.31);
  noStroke();
  fill(220, 245, 255, opacity);
  textSize(min(fontSize * 0.38, 32));
  text(subline, width / 2, height * 0.405);
  pop();
}

function drawFrozenClock() {
  drawChronometer(width/2,height*.67,min(width,height)*.27,gameMillis()*.0022,1);
  const c = drawingContext, r = min(width,height)*.285;
  c.save(); c.translate(width/2,height*.67); c.globalAlpha=.66;
  for(let i=0;i<60;i++){
    const a=i*TWO_PI/60, outer=r, inner=r-(i%5===0?12:5);
    c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);
    c.strokeStyle=i%5===0?'rgba(255,220,145,.78)':'rgba(144,218,255,.42)';c.lineWidth=i%5===0?1.6:.8;c.stroke();
  }
  c.restore();
}

function drawFrozenParticles() {
  push();
  for (let i = 0; i < 36; i++) {
    const px = (i * 197 + 71) % width;
    const py = (i * 109 + 39) % height;
    noStroke();
    fill(120, 238, 255, 55 + sin(frameCount * 0.06 + i) * 33);
    circle(px, py, 2 + (i % 4));
  }
  pop();
}

function drawFrozenTitle() {
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  stroke(0, 15, 44, 210);
  strokeWeight(5);
  fill(225, 249, 255, 235);
  textSize(min(width * 0.055, 48));
  text(timeStop.phase === "freeze" ? "TIME STOPPED" : "TIME IS YOURS", width / 2, height * 0.28);
  noStroke();
  fill(125, 232, 255, 210);
  textSize(min(19, width * 0.035));
  text(timeStop.phase === "freeze" ? "ALLE BALLEN STAAN STIL" : "BALSNELHEID: " + Math.round(getSlowFactor()*100) + "%", width / 2, height * 0.365);
  pop();
}

// ==================== EINDE TIME STOP ====================

function drawBalls(speedFactor) {
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const previousY = ball.y;
    ball.y += ball.speed * speedFactor * frameStep * getDifficultyScale();
    drawOrb(ball.x, ball.y, BALL_SIZE, ball.kind === 'bomb' ? 'bomb' : ball.gold ? 'gold' : 'normal');

    // Niet scoren of verliezen in de filmische intro
    if (speedFactor === 0 || gameMillis() < rushHitStopUntil) continue;
    if (isCaught(ball.x, ball.y) || (ball.x + BALL_SIZE/2 > catcherX && ball.x - BALL_SIZE/2 < catcherX + catcherWidth && previousY + BALL_SIZE/2 <= catcherY && ball.y + BALL_SIZE/2 >= catcherY)) {
      scoreBall(ball, false);
      if (ball.kind === 'bomb') explodeBomb(ball.x, ball.y, ball);
      respawnBall(ball);
    } else if (ball.y > height) {
      if (!ball.gold && !kingCrimson.active && !qaSuppressLifeLoss()) {
        lives--;
        lifePulseEnd = gameMillis() + 650;
        combo = 0;
        playCue("miss");
      }
      if (lives <= 0) {
        lives = 0;
        beginGameOver();
      }
      respawnBall(ball);
      if (gameOver) break;
    }
  }
}

function drawCatcherMovement() {
  const beforeX = catcherX;
  if (keyIsDown(LEFT_ARROW)) catcherX -= CATCHER_SPEED * frameStep;
  if (keyIsDown(RIGHT_ARROW)) catcherX += CATCHER_SPEED * frameStep;
  const arena = getArenaBounds();
  catcherX = constrain(catcherX, arena.left, max(arena.left, arena.right - catcherWidth));
  const movement = catcherX - beforeX;
  catcherLean = lerp(catcherLean, constrain(movement / max(.4, frameStep) / 13, -1, 1), .2);
  if (abs(movement) > .2) {
    catcherTrail.push({x: beforeX, tick: gameMillis()});
    if (catcherTrail.length > 6) catcherTrail.shift();
  }
  catcherTrail = catcherTrail.filter(p => gameMillis() - p.tick < 140);
  catchFeedback = catchFeedback.filter(p => gameMillis() - p.at < HIT_FEEDBACK_MS);
}

function drawHUD() {
  // Hide the standard panels while the time-stop letterbox and title take focus.
  if (!gameOver && (timeStop.phase === 'intro' || timeStop.phase === 'freeze')) return;
  push();
  const u = hudScale(), m = HUD_MARGIN * u;
  const w = min(width - m*2, 465 * u), h = 91 * u;
  noStroke(); fill(9, 7, 27, 226); rect(m, m, w, h, 14 * u);
  stroke(153, 112, 217, 128); strokeWeight(1.4 * u); noFill(); rect(m, m, w, h, 14 * u);
  noStroke(); fill('#d4a9ff'); rect(m + 13 * u, m + 18 * u, 4 * u, 49 * u, 2);
  const scoreX = m + 29 * u, lifeX = m + 166 * u, comboX = m + 325 * u;
  textAlign(LEFT, CENTER); textStyle(BOLD);
  fill('#c4b2dd'); textSize(12 * u); text('SCORE', scoreX, m + 20 * u);
  fill('#fff0c7'); textSize((scorePulseEnd > gameMillis() ? 35 : 31) * u); text(score, scoreX, m + 53 * u);
  fill('#be9bd9'); textSize(10 * u); text('BEST ' + bestScore, scoreX, m + 79 * u);
  fill('#c4b2dd'); textSize(12 * u); text('LEVEN', lifeX, m + 20 * u);
  fill(lifePulseEnd > gameMillis() ? '#ff8299' : '#ffcfdb'); textSize(19 * u);
  text('♥'.repeat(max(0, lives)) + '♡'.repeat(max(0, MAX_LIVES - lives)), lifeX, m + 51 * u);
  fill('#c4b2dd'); textSize(12 * u); text('COMBO', comboX, m + 20 * u);
  fill('#e8cbff'); textSize(30 * u); text('×' + combo, comboX, m + 53 * u);
  drawStandMeter();
  const status = [];
  if (gameMillis() < widePowerUpEnd) status.push(['WIDE', widePowerUpEnd]);
  if (gameMillis() < doublePowerUpEnd) status.push(['DOUBLE', doublePowerUpEnd]);
  if (timeStop.phase !== 'idle') status.push([timeStop.phase === 'slow' ? 'TIME ' + Math.round(getSlowFactor()*100) + '%' : 'TIME ' + timeStop.phase.toUpperCase(), timeStop.phase === 'slow' ? slowPowerUpEnd : 0]);
  if (awakening.active) status.push(['AWAKENING', awakening.end]);
  if (activeEvent.type !== 'none') status.push([activeEvent.type.toUpperCase(), activeEvent.end]);
  textAlign(LEFT, CENTER); textStyle(BOLD);
  let cx = m, cy = m + h + 13 * u;
  for (let i = 0; i < status.length; i++) {
    const caption = status[i][0] + (status[i][1] ? '  ' + max(0, (status[i][1] - gameMillis())/1000).toFixed(1) + 's' : '');
    const tw = (caption.length * 7 + 25) * u;
    if (cx + tw > width - m) { cx = m; cy += 29 * u; }
    noStroke(); fill(15, 24, 50, 225); rect(cx, cy, tw, 23 * u, 8 * u);
    stroke(127, 229, 255, 100); strokeWeight(1); noFill(); rect(cx, cy, tw, 23 * u, 8 * u);
    noStroke(); fill('#a6eaff'); textSize(10 * u); text(caption, cx + 9 * u, cy + 11.5 * u);
    cx += tw + 7 * u;
  }
  const footer = 'UNIVERSE ' + String(universeNumber).padStart(2, '0') + '  ·  WAVE ' + waveNumber;
  noStroke(); textAlign(RIGHT, CENTER); fill('#d8baff'); textSize(13 * u);
  text(footer, width - m, height - 24 * u);
  fill('#a8a1c0'); textSize(10 * u);
  if (width > 920) text('← →  MOVE    Q ORA    E ROLLER    F CRIMSON    O SETTINGS    R RESET', width - m, height - 42 * u);
  if (gameMillis() < waveNoticeUntil) {
    const t = min(1, (waveNoticeUntil - gameMillis()) / 600);
    textAlign(CENTER); textSize(25 * u); fill(255, 218, 127, t * 255);
    text('WAVE ' + waveNumber + '  ·  PRESSURE RISES', width / 2, min(height * .21, 180 * u));
  }
  pop();
}

function drawStartScreen() {
  push();
  const u = hudScale(), x = width / 2, y = height / 2;
  const panelW = min(width * .83, 780*u), panelH = min(height * .84, 590*u);
  const top = y - panelH/2;
  noStroke(); fill(12, 7, 34, 232); rect(x - panelW/2, top, panelW, panelH, 21*u);
  stroke('#bba0ff'); strokeWeight(1.6*u); noFill(); rect(x - panelW/2, top, panelW, panelH, 21*u);
  stroke('#f6cc7e'); strokeWeight(5*u); line(x - panelW*.42, top + 33*u, x - panelW*.26, top + 33*u);
  line(x + panelW*.26, top + panelH - 33*u, x + panelW*.42, top + panelH - 33*u);
  textAlign(CENTER, CENTER); textStyle(BOLD);
  noStroke(); fill('#bf9cf5'); textSize(min(17*u, width*.034));
  text('A BIZARRE ARCADE EXPERIENCE', x, y - 175*u);
  drawingContext.shadowColor = '#e7a0fd'; drawingContext.shadowBlur = 22;
  fill('#ffe0a0'); textSize(min(84*u, panelW*.115)); text('CATCHER', x, y - 104*u);
  drawingContext.shadowBlur = 0;
  fill('#edbdff'); textSize(31*u); text('STAND OVERDRIVE', x, y - 49*u);
  fill('#d3c4e5'); textSize(14*u);
  text('← → VERPLAATSEN    ·    Q ORA    ·    E ROAD ROLLER    ·    F KING CRIMSON', x, y + 15*u);
  text('S POWER-UP = ZA WARUDO    ·    R = MADE IN HEAVEN', x, y + 43*u);
  text('CATCH · BUILD COMBOS · UNLEASH YOUR STAND', x, y + 73*u);
  const pulse = .84 + .16 * sin(gameMillis()*.006);
  fill(255, 232, 159, 160 + pulse*94); textSize(27*u);
  text('PRESS ENTER TO BEGIN', x, y + 128*u);
  fill('#a99fbd'); textSize(13*u);
  text('RECORD ' + bestScore + '  ·  O = SETTINGS  ·  SPACE = SKIP CINEMATICS', x, y + 168*u);
  pop();
}

function gameOverLayout() {
  const u=hudScale(), panelW=min(width*.9,760*u), panelH=min(height*.82,470*u);
  const x=width/2, y=height*.48;
  return {u,x,y,panelW,panelH,titleY:y-panelH*.31,scoreY:y-panelH*.105,
    detailY:y+panelH*.01,resetY:y+panelH*.20,sublineY:y+panelH*.295,
    bannerY:y+panelH*.385,bannerW:min(panelW*.78,520*u),bannerH:min(54*u,panelH*.14)};
}
function drawGameOver() {
  const elapsed=max(0,gameMillis()-gameOverRevealAt);
  if (!gameOverSoundPlayed) {
    stopJoJoVoices();
    if(timeStopSoundLoaded&&timeStopSound&&timeStopSound.isPlaying())timeStopSound.stop();
    timeStop.phase='idle';slowPowerUpEnd=0;
    if (backgroundMusicLoaded && backgroundMusic.isPlaying()) backgroundMusic.stop();
    if (gameOverSoundLoaded) {
      gameOverSound.setVolume(0.22*OVERHAUL_AUDIO.master*OVERHAUL_AUDIO.effects);
      gameOverSound.play();
    }
    gameOverSoundPlayed=true;
  }
  const l=gameOverLayout(), u=l.u, card=easeOutCubic(constrain(elapsed/430,0,1));
  push(); noStroke(); fill(4,3,15,210*card); rect(0,0,width,height);
  const drop=(1-card)*28*u;
  drawingContext.shadowColor='#01010a';drawingContext.shadowBlur=40*u;
  fill(20,10,39,246*card);rect(l.x-l.panelW/2,l.y-l.panelH/2+drop,l.panelW,l.panelH,19*u);
  drawingContext.shadowBlur=0;stroke('#e4b56b');strokeWeight(2*u);noFill();rect(l.x-l.panelW/2,l.y-l.panelH/2+drop,l.panelW,l.panelH,19*u);
  noStroke();textAlign(CENTER,CENTER);textStyle(BOLD);
  const titleIn=constrain(elapsed/280,0,1);fill(255,201,125,255*titleIn);
  textSize(min(58*u,l.panelW*.105));text('GAME OVER',l.x,l.titleY+drop);
  const scoreIn=constrain((elapsed-170)/350,0,1);fill(245,234,255,255*scoreIn);
  textSize(min(24*u,l.panelW*.052));text('SCORE  '+score+'     BEST  '+bestScore,l.x,l.scoreY+drop);
  fill(203,179,229,255*scoreIn);textSize(min(16*u,l.panelW*.04));
  text('PERFECT  '+perfectCatches+'     BEST COMBO  '+bestCombo,l.x,l.detailY+drop);
  fill('#fff2ca');textSize(min(18*u,l.panelW*.042));text('R  →  MADE IN HEAVEN RESET',l.x,l.resetY+drop);
  fill(175,159,192,230*scoreIn);textSize(min(12*u,l.panelW*.031));
  text('De sterren wachten op een nieuw universum…',l.x,l.sublineY+drop);
  const bannerProgress=easeOutCubic(constrain((elapsed-720)/480,0,1));
  if(bannerProgress>0&&!gameOverBannerPlayed){
    gameOverBannerPlayed=true;playCue('impact',.72);playJoJoVoice('continued');
  }
  if(bannerProgress>0)drawToBeContinued(l.x,l.bannerY+drop,l.bannerW,l.bannerH,bannerProgress);
  pop();
}

function beginGameOver() {
  if(gameOver)return;
  gameOver=true;gameOverAt=gameMillis();gameOverBannerPlayed=false;
  const now=gameMillis();let revealAt=now+850;
  if(standRush.active) revealAt=max(revealAt,standRush.start+ORA_RUSH_DURATION_MS+420);
  for(const punch of standPunches) revealAt=max(revealAt,punch.start+(punch.duration||180)+470);
  if(roadRoller.active) revealAt=max(revealAt,roadRoller.start+ROAD_ROLLER_DURATION_MS+400);
  if(roadRollerImpact.active) revealAt=max(revealAt,roadRollerImpact.at+ROAD_ROLLER_IMPACT_MS);
  if(timeStop.phase==='intro') revealAt=max(revealAt,timeStop.phaseStart+TIME_STOP_INTRO_MS+TIME_STOP_FREEZE_MS+TIME_STOP_RELEASE_MS);
  else if(timeStop.phase==='freeze') revealAt=max(revealAt,timeStop.phaseStart+TIME_STOP_FREEZE_MS+TIME_STOP_RELEASE_MS);
  else if(timeStop.phase==='slow') {timeStop.phase='release';timeStop.phaseStart=now;slowPowerUpEnd=0;revealAt=max(revealAt,now+TIME_STOP_RELEASE_MS);playTimeSound('resume');}
  else if(timeStop.phase==='release') revealAt=max(revealAt,timeStop.phaseStart+TIME_STOP_RELEASE_MS);
  for(const name in jojoVoiceClips){const a=jojoVoiceClips[name];if(a&&!a.paused&&Number.isFinite(a.duration)&&Number.isFinite(a.currentTime))revealAt=max(revealAt,now+max(0,a.duration-a.currentTime)*1000+80);}
  gameOverRevealAt=revealAt;
}
function drawGameOverWorld() {
  if(timeStop.phase==='intro'||timeStop.phase==='freeze'||timeStop.phase==='release')updateTimeStop();
  updateJoJoAttacks();updateJoJoParticles();
  push();drawSpaceBackground(0);drawBackdropDetails();
  for(const ball of balls)drawOrb(ball.x,ball.y,BALL_SIZE,ball.kind==='bomb'?'bomb':ball.gold?'gold':'normal');
  if(!gameOver&&timeStop.phase!=='intro')drawCatcherMovement();
  drawCatcherGhostTrail();drawBucket(catcherX,catcherY);
  if(standRush.active)drawStandAura();drawStandPunches();
  pop();
  drawTimeStopEffects();drawCinematicDirector();drawKingCrimsonEffects();
  drawJoJoParticles();drawRoadRoller();drawJoJoPopups();drawMenacingGlyphs();drawHUD();
  if(gameMillis()>=gameOverRevealAt)drawGameOver();
}

function draw() {
  const paused = optionsVisible;
  frameStep = paused ? 0 : min(2, max(0, deltaTime / (1000 / 60)));
  if (!paused) gameClock += min(50, max(0, deltaTime));
  publishQaState();
  updateMusicVolume();
  if (paused) {
    push(); drawSpaceBackground(0); pop();
    drawHUD();
    return;
  }
  if (universeReset.active) { drawUniverseReset(); return; }
  if (gameOver) { drawGameOverWorld(); return; }
  if (gameStarted && !gameOver) updateTimeStop();
  const freezePhysics = timeStop.phase === 'intro' || timeStop.phase === 'freeze' || roadRoller.active;
  if (freezePhysics) {
    const hold = min(50, max(0, deltaTime));
    nextEventAt += hold;
    if (activeEvent.end > 0) activeEvent.end += hold;
    if (awakening.active) awakening.end += hold;
    if (kingCrimson.active) kingCrimson.start += hold;
  } else updateGameplayEvents();
  updateJoJoAttacks();
  updateJoJoParticles();
  const speedFactor = roadRoller.active || freezePhysics ? 0 : getTimeSpeed();
  const shake = OVERHAUL_AUDIO.shake ? min(15, getCameraShake() + jojoShake) : 0;
  push();
  const zoom = getCinematicCameraScale();
  if (zoom !== 1) {
    translate(width / 2, height / 2);
    scale(zoom);
    translate(-width / 2, -height / 2);
  }
  if (shake > 0) translate(random(-shake, shake), random(-shake, shake));
  drawSpaceBackground(gameStarted && !gameOver ? speedFactor : 1);
  drawBackdropDetails();
  if (!gameStarted) { pop(); drawStartScreen(); return; }
  if (speedFactor === 0) {
    if (widePowerUpEnd > 0) widePowerUpEnd += min(deltaTime, 50);
    if (doublePowerUpEnd > 0) doublePowerUpEnd += min(deltaTime, 50);
  }
  if (widePowerUpEnd > 0 && gameMillis() > widePowerUpEnd) {
    catcherWidth = NORMAL_CATCHER_WIDTH;
    widePowerUpEnd = 0;
  }
  if (timeStop.phase !== 'intro') drawCatcherMovement();
  drawBalls(speedFactor);
  if (speedFactor > 0 && !gameOver) {
    gameplayFrames += frameStep;
    if (gameplayFrames >= POWERUP_SPAWN_TIME) {
      gameplayFrames -= POWERUP_SPAWN_TIME;
      createPowerUp();
    }
  }
  if (!gameOver) drawPowerUps(speedFactor);
  if (standRush.active) drawStandAura();
  if (awakening.active) drawAwakeningAura();
  drawCatcherGhostTrail();
  drawBucket(catcherX, catcherY);
  drawStandPunches();
  pop();
  drawTimeStopEffects();
  drawCinematicDirector();
  drawKingCrimsonEffects();
  drawJoJoParticles();
  drawRoadRoller();
  drawJoJoPopups();
  drawMenacingGlyphs();
  drawHUD(); // HUD is altijd leesbaar, ook tijdens aanvallen
  recordUniverseFrame();
  if (gameOver) drawGameOverWorld();
}

// Past het canvas aan als het scherm groter of kleiner wordt
function windowResized() {
  resizeCanvas(max(windowWidth, 640), max(windowHeight, 480));
  cacheBackground();
  rebuildVisuals();
  catcherY = height - catcherHeight - 5;
  const arena = getArenaBounds();
  catcherX = constrain(catcherX, arena.left, max(arena.left, arena.right - catcherWidth));
}

// ==================== JOJO STAND OVERDRIVE ====================
// Alle nieuwe animaties zijn met p5.js getekend; er zijn geen extra plaatjes nodig.

// Echte vangsten bouwen Stand Energy op; een aanval verbruikt die energie.
function gainStandEnergy(amount) {
  standEnergy = constrain(standEnergy + amount, 0, STAND_MAX_ENERGY);
}

function scoreBall(ball, fromStand) {
  const perfect = !fromStand && abs(ball.y - (catcherY - BALL_SIZE / 2)) <= PERFECT_WINDOW &&
                  abs(ball.x - (catcherX + catcherWidth / 2)) <= catcherWidth * 0.18;
  const multiplier = gameMillis() < doublePowerUpEnd ? 2 : 1;
  const waveBonus = activeEvent.type === 'golden' ? 2 : 1;
  const base = ball.gold ? GOLD_BALL_POINTS : (ball.kind === 'bomb' ? 2 : 1);
  const earned = (base + (perfect ? 2 : 0)) * multiplier * waveBonus;
  score += earned;
  scorePulseEnd = gameMillis() + 330;
  if (!fromStand) {
    catchFeedback.push({x: ball.x, at: gameMillis(), perfect});
    if (catchFeedback.length > 8) catchFeedback.shift();
  }
  combo++;
  catchesTotal++;
  if (!fromStand) gainStandEnergy((ball.gold ? 18 : 7) + (perfect ? 8 : 0));
  if (awakening.active && !fromStand) gainStandEnergy(3);
  if (perfect) {
    perfectCatches++;
    addJoJoPopup('PERFECT +' + earned, ball.x, max(45, ball.y - 43), '#fff4bb', 900, 30);
    burstJoJoParticles(ball.x, ball.y, '#fff1a2', 18);
    playCue('perfect');
    rushHitStopUntil = gameMillis() + 38;
  } else if (!fromStand) {
    playCue('catch');
  }
  if (combo % 5 === 0) {
    score += 2 * multiplier;
    if (!fromStand) gainStandEnergy(12);
    mangaPulse = gameMillis() + 600;
    addJoJoPopup('YARE YARE DAZE!', width / 2, height * 0.29, '#f1b7ff', 1050, 35);
    burstJoJoParticles(ball.x, max(50, ball.y), '#be90ff', 19);
    playStandSound('combo');
  }
  if (combo > 0 && combo % 15 === 0) startAwakening();
  if (ball.gold) {
    addJoJoPopup('GOLD +' + earned, ball.x, max(40, ball.y - 35), '#ffe37b', 850, 25);
    burstJoJoParticles(ball.x, max(0, ball.y), '#ffdd77', 12);
  }
  updateRecords();
}

function canUseJoJoAttack(cost) {
  return gameStarted && !gameOver && standEnergy >= cost &&
         !standRush.active && !roadRoller.active && !kingCrimson.active &&
         !universeReset.active && timeStop.phase !== 'intro';
}

function notEnoughStandEnergy(cost) {
  addJoJoPopup("NEED " + cost + " STAND!", width / 2, height * 0.75, "#ff9bce", 780, 23);
  playStandSound("deny");
}

// Q: Star Platinum-achtige ORA ORA ORA punchrush.
function startStandRush() {
  if (!canUseJoJoAttack(ORA_RUSH_COST)) {
    if (standEnergy < ORA_RUSH_COST) notEnoughStandEnergy(ORA_RUSH_COST);
    return;
  }
  standEnergy -= ORA_RUSH_COST;
  standRush = { active: true, start: gameMillis(), lastPunch: gameMillis() - STAND_PUNCH_INTERVAL_MS, punches: 0 };
  mangaPulse = gameMillis() + 450;
  addJoJoPopup("ORA ORA ORA!", width / 2, height * 0.31, "#f9baff", 1400, 52);
  playStandSound("rush");
  playJoJoVoice("ora");
}

// E: ROAD ROLLER DA! kan alleen tijdens het bevroren of vertraagde tijdvenster.
function startRoadRoller() {
  if (timeStop.phase !== "freeze" && timeStop.phase !== "slow") {
    addJoJoPopup("FIRST: ZA WARUDO!", width / 2, height * 0.76, "#ffe291", 850, 25);
    return;
  }
  if (!canUseJoJoAttack(ROAD_ROLLER_COST)) {
    if (standEnergy < ROAD_ROLLER_COST) notEnoughStandEnergy(ROAD_ROLLER_COST);
    return;
  }
  standEnergy -= ROAD_ROLLER_COST;
  roadRoller = { active: true, start: gameMillis(), landed: false };
  addJoJoPopup("ROAD ROLLER DA!!", width / 2, height * 0.18, "#ffe279", 1800, 48);
  playStandSound("roller");
  playJoJoVoice("roller");
}

// De vuisten pakken de gevaarlijkste zichtbare bal: wie lager hangt, gaat eerst.
function punchDangerousBall() {
  let target = null;
  for (const ball of balls) {
    if (ball.y < -BALL_SIZE || ball.y > height || ball.targeted) continue;
    if (!target || ball.y > target.y) target = ball;
  }
  if (!target) return;
  target.targeted = true;
  standRush.punches++;
  const n=standRush.punches%4;
  const sources=[
    [catcherX+catcherWidth/2-55,catcherY-43],
    [target.x-170,-26],
    [catcherX+catcherWidth/2+55,catcherY-43],
    [target.x+170,-26]
  ];
  const [sx,sy]=sources[n];
  standPunches.push({target,tx:target.x,ty:target.y,start:gameMillis(),impacted:false,
    duration:constrain(dist(sx,sy,target.x,target.y)*.28,150,290),sx,sy,side:n%2?-1:1,
    finisher:standRush.punches>=12});
}
function resolvePunches() {
  const now = gameMillis();
  for (const punch of standPunches) {
    const elapsed = now - punch.start;
    if (punch.impacted || elapsed < (punch.duration||180)) continue;
    punch.impacted = true;
    if (!punch.target.targeted) continue;
    const x = punch.target.x, y = punch.target.y;
    punch.target.targeted = false;
    if(!gameOver){
      scoreBall(punch.target, true);
      if (punch.target.kind === 'bomb') explodeBomb(x, y, punch.target);
      respawnBall(punch.target);
    }
    jojoShake = max(jojoShake, 5);
    burstJoJoParticles(x, y, '#e6a8ff', 17);
    addJoJoPopup(standRush.punches % 3 === 0 ? 'ORA!' : 'ドドド', x, y, '#f4b1ff', 480, 27);
    playStandSound('punch');
  }
  standPunches = standPunches.filter(p => now - p.start < (p.duration||180)+470);
}

function slamRoadRoller() {
  roadRollerImpact={active:true,at:gameMillis(),x:width/2,y:height*.68};
  let destroyed = 0;
  for (const ball of balls) {
    if (ball.y < -BALL_SIZE || ball.y > height) continue;
    if(!gameOver){
      scoreBall(ball, true);
      if (ball.kind === 'bomb') explodeBomb(ball.x, ball.y, ball);
      respawnBall(ball);
    }
    burstJoJoParticles(ball.x, max(20, ball.y), ball.gold ? "#ffe26c" : "#ffbe6c", 16);
    destroyed++;
  }
  if (destroyed > 0 && !gameOver) {
    const bonus = destroyed * 2;
    score += bonus;
    addJoJoPopup("CRUSH BONUS +" + bonus, width / 2, height * 0.70, "#fff2ab", 1400, 29);
  }
  jojoShake = 26;
  mangaPulse = gameMillis() + 600;
  burstJoJoParticles(width / 2, height * 0.61, "#ffc24a", 80);
  playStandSound("impact");
}

function updateJoJoAttacks() {
  if (!gameStarted) return;
  const now = gameMillis();
  if (standRush.active) {
    if (now - standRush.start >= ORA_RUSH_DURATION_MS) {
      standRush.active = false;
    } else if (!gameOver && now - standRush.lastPunch >= STAND_PUNCH_INTERVAL_MS && standRush.punches < 12) {
      standRush.lastPunch = now;
      punchDangerousBall();
    }
  }
  if (roadRoller.active) {
    const elapsed = now - roadRoller.start;
    if (elapsed >= ROAD_ROLLER_LAND_MS && !roadRoller.landed) {
      roadRoller.landed = true;
      slamRoadRoller();
    }
    if (elapsed >= ROAD_ROLLER_DURATION_MS) roadRoller.active = false;
  }
  resolvePunches();
  if(roadRollerImpact.active&&now-roadRollerImpact.at>ROAD_ROLLER_IMPACT_MS)roadRollerImpact.active=false;
  jojoShake *= 0.78;
  if (jojoShake < 0.18) jojoShake = 0;
}

function addJoJoPopup(message, x, y, tint, duration, size) {
  jojoPopups.push({message, x, y, tint, duration, size, start: gameMillis()});
  if (jojoPopups.length > 28) jojoPopups.shift();
}

function burstJoJoParticles(x, y, tint, count) {
  for (let i = 0; i < (OVERHAUL_AUDIO.particles ? min(90, count * OVERHAUL_AUDIO.particlesMultiplier) : 0); i++) {
    const angle = random(TWO_PI);
    const speed = random(2, 15);
    jojoParticles.push({
      x, y, vx: cos(angle) * speed, vy: sin(angle) * speed,
      size: random(2, 9), tint, life: random(23, 55), maxLife: 55
    });
  }
  if (jojoParticles.length > MAX_PARTICLES) jojoParticles.splice(0, jojoParticles.length - MAX_PARTICLES);
}

function updateJoJoParticles() {
  for (let i = jojoParticles.length - 1; i >= 0; i--) {
    const part = jojoParticles[i];
    part.x += part.vx * frameStep;
    part.y += part.vy * frameStep;
    part.vx *= 0.97;
    part.vy *= 0.97;
    part.life -= frameStep;
    if (part.life <= 0) jojoParticles.splice(i, 1);
  }
}

function drawJoJoParticles() {
  push();
  noStroke();
  for (const part of jojoParticles) {
    const tint = color(part.tint);
    tint.setAlpha(constrain(part.life / part.maxLife, 0, 1) * 255);
    fill(tint);
    circle(part.x, part.y, part.size * max(0.1, part.life / 50));
  }
  pop();
}

function drawJoJoPopups() {
  if (jojoPopups.length === 0) return;
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  for (let i = jojoPopups.length - 1; i >= 0; i--) {
    const item = jojoPopups[i];
    const progress = (gameMillis() - item.start) / item.duration;
    if (progress >= 1) {
      jojoPopups.splice(i, 1);
      continue;
    }
    const tint = color(item.tint);
    tint.setAlpha(min(1, (1 - progress) * 2.1) * 255);
    const bounce = progress < 0.14 ? 1.24 - 0.24 * progress / 0.14 : 1;
    textSize(min(item.size * hudScale() * bounce, width * 0.10));
    stroke(14, 8, 34, 255 * (1 - progress));
    strokeWeight(5);
    fill(tint);
    text(item.message, constrain(item.x, 80, width - 80), item.y - progress * 43);
  }
  pop();
}

// Stand-meter: genoeg energie? Dan licht de Q- of E-aanval op.
function drawStandMeter() {
  push();
  const u = hudScale(), m = HUD_MARGIN * u;
  const bar = 244 * u, x = width - bar - m - 22 * u, y = width < 930 ? m + 107 * u : m;
  const energy = constrain(standEnergy, 0, STAND_MAX_ENERGY);
  hudEnergyDisplay = lerp(hudEnergyDisplay, energy, .19);
  noStroke(); fill(9, 7, 27, 226); rect(x - 15*u, y, bar + 30*u, 91*u, 14*u);
  stroke(153, 112, 217, 128); strokeWeight(1.4*u); noFill(); rect(x - 15*u, y, bar + 30*u, 91*u, 14*u);
  noStroke(); fill('#dfb0ff'); textAlign(LEFT, CENTER); textStyle(BOLD); textSize(12*u);
  text('STAND ENERGY', x, y + 19*u);
  fill(255); textAlign(RIGHT); textSize(16*u); text(ceil(energy) + '/100', x + bar, y + 19*u);
  fill(37, 25, 61); rect(x, y + 37*u, bar, 17*u, 7*u);
  const grow = bar * hudEnergyDisplay / STAND_MAX_ENERGY;
  drawingContext.shadowColor = energy >= STAND_MAX_ENERGY ? '#ffdd79' : '#b980ff';
  drawingContext.shadowBlur = 12;
  fill(energy >= STAND_MAX_ENERGY ? '#ffd67d' : '#ae79ee'); rect(x, y + 37*u, grow, 17*u, 7*u);
  drawingContext.shadowBlur = 0;
  stroke(12,9,28,170);strokeWeight(2*u);
  for(let n=1;n<20;n++)line(x+bar*n/20,y+38*u,x+bar*n/20,y+53*u);
  stroke(255, 255, 255, 75); strokeWeight(1);
  for (const threshold of [ORA_RUSH_COST, KING_CRIMSON_COST]) {
    const tx = x + bar * threshold / STAND_MAX_ENERGY;
    line(tx, y + 37*u, tx, y + 54*u);
  }
  noStroke(); textSize(11*u); textAlign(LEFT); fill(energy >= 55 ? '#f2c8ff' : '#9c8eaf');
  text('Q  ORA · 55', x, y + 73*u);
  textAlign(RIGHT); fill(energy >= 100 ? '#ffe9aa' : '#9c8eaf'); text('E  ROLLER · 100', x + bar, y + 73*u);
  pop();
}

function drawStandAura() {
  if (!standRush.active) return;
  push();
  const progress = (gameMillis() - standRush.start) / ORA_RUSH_DURATION_MS;
  const cx = catcherX + catcherWidth / 2;
  const cy = catcherY - 55;
  translate(cx, cy);
  noStroke();
  drawingContext.shadowColor = "#bb67ff";
  drawingContext.shadowBlur = 35;
  fill(160, 70, 255, 45 + sin(frameCount * 0.28) * 20);
  ellipse(0, 0, 155, 183);
  fill(117, 72, 205, 165);
  ellipse(0, -17, 55, 70);
  fill(161, 106, 238, 180);
  rect(-47, 15, 94, 38, 16);
  fill(28, 11, 64, 210);
  rect(-20, -25, 40, 14, 4);
  fill("#d8faff");
  ellipse(-9, -18, 9, 4);
  ellipse(9, -18, 9, 4);
  for (let i = 0; i < 4; i++) {
    let side = i % 2 === 0 ? -1 : 1;
    let wave = sin(frameCount * 0.8 + i * 2) * 45;
    fill(187, 108, 255, 155);
    ellipse(side * (60 + wave * 0.3), 0 + i * 9, 35, 24);
  }
  if (progress < 0.15) {
    noFill();
    stroke(233, 181, 255, 130 * (1 - progress / 0.15));
    strokeWeight(5);
    ellipse(0, 0, progress * 900, progress * 600);
  }
  pop();
}

// Manga-font en effect voor dreiging en hoge combo's.
function drawMenacingGlyphs() {
  if (!gameStarted || gameOver) return;
  if (combo < 10 && timeStop.phase === "idle" && !standRush.active && !roadRoller.active) return;
  push();
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < 8; i++) {
    const px = ((i * 213 + 59) % width);
    const py = ((i * 137 + 19) % height);
    const sway = sin(frameCount * 0.035 + i * 2.1) * 8;
    fill(i % 2 === 0 ? color(206, 112, 255, 95) : color(255, 207, 100, 85));
    noStroke();
    textSize(28 + i % 3 * 9);
    text(i % 2 === 0 ? "ゴ" : "ド", px + sway, py + sway * 0.4);
  }
  if (gameMillis() < mangaPulse) {
    noFill();
    stroke(242, 205, 255, 70 * (mangaPulse - gameMillis()) / 600);
    strokeWeight(3);
    rect(12, 12, width - 24, height - 24, 8);
  }
  pop();
}

// Een zelfgetekende, geanimeerde anime-wals voor de Road Roller-aanval.
function drawRoadRoller() {
  const ctx=drawingContext,elapsed=gameMillis()-roadRoller.start;
  if(roadRoller.active&&visualAtlas.roller){
    const t=constrain(elapsed/1390,0,1),z=min(width/620,height/430,1.4);
    const y=lerp(-height*.42,height*.57,easeInOutCubic(t));
    const contact=constrain(t,0,1),shadowY=height*.7;
    ctx.save();ctx.globalAlpha=.12+.28*contact;ctx.fillStyle='#02020a';ctx.beginPath();
    ctx.ellipse(width/2,shadowY,width*(.12+.15*contact),height*(.018+.035*contact),0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.translate(width/2,y);ctx.scale(z*(.9+.1*t),z*(1.08-.08*t));ctx.rotate(t<1?-.12*(1-t)+Math.sin(elapsed*.012)*.012:Math.sin(elapsed*.045)*.003);
    ctx.drawImage(visualAtlas.roller,-260,-228,520,340);
    // Animate exposed machinery independently from the body: the hydraulic
    // rams extend on descent while the steel drum rotates into contact.
    const ram = 18 + 20 * easeInOutCubic(t) + 3 * Math.sin(elapsed * .014) * (1 - t);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * 82, -24);
      ctx.strokeStyle = '#171721'; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(side * 5, ram); ctx.stroke();
      ctx.strokeStyle = '#d4bd8e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(side * 5, ram - 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(246,229,186,.76)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-3, -48); ctx.lineTo(side * 2, ram - 9); ctx.stroke();
      ctx.fillStyle = '#f4d48d'; ctx.beginPath(); ctx.arc(0, -56, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(side * 5, ram, 5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.translate(-87, -33); ctx.rotate(elapsed * (t < 1 ? .0048 : .008));
    ctx.beginPath(); ctx.ellipse(0,0,93,15,0,0,Math.PI*2); ctx.clip();
    const drum=ctx.createLinearGradient(0,-16,0,16);
    drum.addColorStop(0,'rgba(241,248,246,.78)');drum.addColorStop(.2,'rgba(78,96,111,.12)');
    drum.addColorStop(.62,'rgba(12,20,31,.50)');drum.addColorStop(1,'rgba(224,235,228,.72)');
    ctx.fillStyle=drum;ctx.fillRect(-96,-17,192,34);
    for(let i=-8;i<=8;i++){
      const x=i*13 + (elapsed*.045%13);
      ctx.strokeStyle=i%3===0?'rgba(244,232,191,.64)':'rgba(9,16,27,.45)';ctx.lineWidth=i%3===0?2:1;
      ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x+8,17);ctx.stroke();
    }
    ctx.restore();
    ctx.save();ctx.globalAlpha=.35+.35*(1-t);ctx.strokeStyle='#fff1bd';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-220,44+Math.sin(elapsed*.006)*3);ctx.lineTo(212,44+Math.sin(elapsed*.006)*3);ctx.stroke();ctx.restore();
    const lamp=ctx.createRadialGradient(-122,-197,1,-122,-197,48);lamp.addColorStop(0,'rgba(255,246,195,.85)');lamp.addColorStop(.25,'rgba(255,194,79,.32)');lamp.addColorStop(1,'rgba(255,174,51,0)');
    ctx.fillStyle=lamp;ctx.fillRect(-170,-240,96,96);
    ctx.globalAlpha=.32;ctx.fillStyle='#eff8ff';ctx.fillRect(-207,28+Math.sin(elapsed*.008)*15,411,3);ctx.restore();
  }
  if(!roadRollerImpact.active)return;
  const age=gameMillis()-roadRollerImpact.at,p=constrain(age/ROAD_ROLLER_IMPACT_MS,0,1),ease=easeOutCubic(p);
  const x=roadRollerImpact.x,y=roadRollerImpact.y,fade=1-p;
  ctx.save();ctx.globalAlpha=fade;
  // Landing reads in material layers: a short compression plate and hot rim
  // appear before the wider shockwave opens across the ground plane.
  const crush = 1 - easeOutCubic(constrain(age / 180, 0, 1));
  ctx.save();ctx.translate(x,y+height*.018);ctx.scale(1,.30);
  ctx.fillStyle=`rgba(255,224,153,${.20*crush})`;ctx.beginPath();ctx.ellipse(0,0,min(width,height)*(.12+.12*crush),min(width,height)*(.035+.025*crush),0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=`rgba(255,249,215,${.86*crush})`;ctx.lineWidth=2+5*crush;ctx.beginPath();ctx.ellipse(0,0,min(width,height)*(.08+.07*crush),min(width,height)*(.02+.02*crush),0,0,Math.PI*2);ctx.stroke();ctx.restore();
  // Fractured arena floor, cut into short angular facets rather than a single circle.
  ctx.strokeStyle='rgba(255,218,143,.8)';ctx.lineWidth=2.2;ctx.beginPath();
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,dist0=10+Math.sin(i*7.13)*8,dist1=min(width,height)*(.10+.23*ease);
    ctx.moveTo(x+Math.cos(a)*dist0,y+Math.sin(a)*dist0*.32);
    const mid=(dist0+dist1)*.52;ctx.lineTo(x+Math.cos(a+.035)*mid,y+Math.sin(a+.035)*mid*.32);
    ctx.lineTo(x+Math.cos(a)*dist1,y+Math.sin(a)*dist1*.32);
  }ctx.stroke();
  for(let i=0;i<7;i++){
    const q=constrain(p-i*.08,0,1);if(q<=0)continue;
    ctx.beginPath();ctx.ellipse(x,y,20+max(width,height)*q*.72,8+height*q*.24,0,0,Math.PI*2);
    ctx.strokeStyle=i%2?'rgba(123,220,255,.7)':'rgba(255,205,98,.8)';ctx.lineWidth=1.5+3*(1-q);ctx.stroke();
  }
  const fog=ctx.createRadialGradient(x,y,12,x,y,min(width,height)*(.08+.18*p));
  fog.addColorStop(0,`rgba(205,200,221,${.20*fade})`);fog.addColorStop(1,'rgba(117,122,157,0)');
  ctx.fillStyle=fog;ctx.fillRect(x-width*.35,y-height*.16,width*.7,height*.32);
  // Ten substantial debris shards arc away from the impact and settle before cleanup.
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10+.13,dist=20+ease*(45+(i%4)*28),yy=Math.sin(a)*dist*.36-age*.015;
    ctx.save();ctx.translate(x+Math.cos(a)*dist,y+yy);ctx.rotate(a+.4+p*2);ctx.fillStyle=i%3?'#c3c5d6':'#f4d184';
    ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(6,-3);ctx.lineTo(2,4);ctx.closePath();ctx.fill();ctx.restore();
  }
  ctx.restore();
}

function drawToBeContinued(cx,cy,w,h,progress) {
  const slide=easeOutCubic(constrain(progress,0,1)),x=lerp(-w-30,cx,slide),ctx=drawingContext;
  ctx.save();ctx.translate(x,cy);ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=18;ctx.shadowOffsetY=7;
  const g=ctx.createLinearGradient(0,-h/2,0,h/2);g.addColorStop(0,'#fff1a6');g.addColorStop(.22,'#f7d777');g.addColorStop(.7,'#d99a3d');g.addColorStop(1,'#9e632d');
  ctx.beginPath();ctx.moveTo(-w/2,-h/2);ctx.lineTo(w*.31,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(w*.31,h/2);ctx.lineTo(-w/2,h/2);ctx.lineTo(-w*.43,0);ctx.closePath();ctx.fillStyle=g;ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.save();ctx.clip();ctx.strokeStyle='rgba(255,255,227,.19)';ctx.lineWidth=1;
  for(let i=-w;i<w;i+=13){ctx.beginPath();ctx.moveTo(i,-h/2);ctx.lineTo(i+h,h/2);ctx.stroke();}
  ctx.strokeStyle='rgba(76,38,24,.55)';ctx.lineWidth=Math.max(1,h*.025);ctx.stroke();
  ctx.font=`900 ${Math.max(12,h*.39)}px Impact, Arial Black, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.lineWidth=Math.max(2,h*.09);ctx.strokeStyle='#fff0c6';ctx.strokeText('TO BE CONTINUED',-w*.015,0);
  ctx.fillStyle='#28172b';ctx.fillText('TO BE CONTINUED',-w*.015,0);ctx.restore();ctx.restore();
}

function playStandSound(kind) {
  const cues = { deny: 'miss', punch: 'punch', rush: 'rewind', power: 'power', combo: 'perfect', roller: 'roller', impact: 'impact' };
  playCue(cues[kind] || 'power');
}

// De uitgestoken Stand-vuisten vliegen daadwerkelijk naar de geraakte ballen.
function drawStandPunches() {
  if(!visualAtlas.fist)return;
  const ctx=drawingContext;
  for(const punch of standPunches) {
    const flight=punch.duration||180;const age=constrain((gameMillis()-punch.start-flight)/470,0,1);
    const t=easeOutCubic((gameMillis()-punch.start)/flight);
    const x=lerp(punch.sx,punch.tx,t),y=lerp(punch.sy,punch.ty,t);
    const angle=atan2(punch.ty-punch.sy,punch.tx-punch.sx)+HALF_PI;
    ctx.save();ctx.globalAlpha=1-age;
    for(let i=4;i>=0;i--) {
      ctx.save(); const q=Math.max(0,t-i*.075);
      ctx.translate(lerp(punch.sx,punch.tx,q),lerp(punch.sy,punch.ty,q));ctx.rotate(angle);
      ctx.globalAlpha=(1-age)*(i? .12:1); const z=(punch.finisher?1.35:.9)+t*.32;
      ctx.scale(z,z);ctx.drawImage(visualAtlas.fist,-28,-28,56,132);ctx.restore();
    }
    if(punch.impacted) {
      ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle='#ffedb5';ctx.lineWidth=2;
      for(let i=0;i<9;i++){ctx.rotate(Math.PI*2/9);ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(27+age*42,3);ctx.stroke();}
    }
    ctx.restore();
  }
}

function prepareJoJoVoiceClips() {
  if (typeof Audio === "undefined") return;
  for (const name in JOJO_CLIP_URLS) {
    try {
      const audio = new Audio();
      audio.preload = "none";
      audio.src = JOJO_CLIP_URLS[name];
      audio.volume = name === "continued" ? 0.40 : 0.63;
      jojoVoiceClips[name] = audio;
    } catch (_) {
      // Het programma blijft werken zonder netwerk en zonder extra MP3's.
    }
  }
}

function playJoJoVoice(name) {
  const audio = jojoVoiceClips[name];
  if (!audio) { playCue(name === 'pucci' ? 'rewind' : name === 'roller' ? 'roller' : 'impact', 0.6); return false; }
  stopJoJoVoices();
  audio.volume = OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.voices * 0.8;
  try {
    audio.pause();
    audio.currentTime = 0;
    const pending = audio.play();
    if (pending && typeof pending.catch === "function") pending.catch(() => {});
    return true;
  } catch (_) {
    return false;
  }
}

function stopJoJoVoices() {
  for (const name in jojoVoiceClips) {
    try { jojoVoiceClips[name].pause(); jojoVoiceClips[name].currentTime = 0; } catch (_) {}
  }
}

// Alleen recente gameplay vastleggen: het spel hoeft niet opnieuw gesimuleerd
// te worden tijdens het achteruit afspelen. Max ~3,5 s geheugen.
function recordUniverseFrame() {
  if (!gameStarted || universeReset.active) return;
  if (gameMillis() - lastHistoryCapture < 45) return;
  lastHistoryCapture = gameMillis();
  universeHistory.push({
    catcherX, catcherWidth, score, lives, combo,
    balls: balls.map(ball => ({x: ball.x, y: ball.y, gold: ball.gold, kind: ball.kind})),
    powerUps: powerUps.map(p => ({x: p.x, y: p.y, type: p.type}))
  });
  if (universeHistory.length > 84) universeHistory.shift();
}

// R werkt tijdens normaal spel én bij Game Over. Tijdens de animatie wordt
// herhaald R genegeerd zodat er niet meerdere resets tegelijk starten.
function startUniverseReset() {
  if (universeReset.active) return;
  gameStarted = true;
  if (universeHistory.length === 0) recordUniverseFrame();
  stopJoJoVoices();
  if (timeStopSoundLoaded && timeStopSound.isPlaying()) timeStopSound.stop();
  if (gameOverSoundLoaded && gameOverSound.isPlaying()) gameOverSound.stop();
  updateMusicVolume(true);
  universeReset = {
    active: true, started: gameMillis(), source: universeHistory.slice(), committed: false,
    soundAccelerated: false, soundCollapse: false
  };
  playJoJoVoice("pucci");
  playUniverseSound("charge");
}

// Start echt vanaf het begin: score, combo, upgrades, ballen, cooldowns en
// actieve aanvallen worden gewist. Alleen het universumnummer blijft stijgen.
function commitNewUniverse() {
  if (universeReset.committed) return;
  universeReset.committed = true;
  universeNumber++;
  resetGame();
  gameStarted = true;
  // Dit scherm blijft stil totdat de wedergeboorte-animatie voorbij is.
  updateMusicVolume(true);
}

function drawUniverseReset() {
  const elapsed = gameMillis() - universeReset.started;
  const next1 = REWIND_MS;
  const next2 = next1 + ACCELERATE_MS;
  const next3 = next2 + SINGULARITY_MS;
  const phase = elapsed < next1 ? "rewind" :
                elapsed < next2 ? "accelerate" :
                elapsed < next3 ? "collapse" : "rebirth";
  const t = phase === "rewind" ? constrain(elapsed / REWIND_MS, 0, 1) :
            phase === "accelerate" ? constrain((elapsed - next1) / ACCELERATE_MS, 0, 1) :
            phase === "collapse" ? constrain((elapsed - next2) / SINGULARITY_MS, 0, 1) :
            constrain((elapsed - next3) / REBIRTH_MS, 0, 1);

  if (phase === "accelerate" && !universeReset.soundAccelerated) {
    universeReset.soundAccelerated = true;
    stopJoJoVoices(); // Geen overlappende Pucci-clips tijdens de versnelling
    playJoJoVoice("accelerate");
    playUniverseSound("speed");
  }
  if (phase === "collapse" && !universeReset.soundCollapse) {
    universeReset.soundCollapse = true;
    playUniverseSound("collapse");
  }
  if (phase === "rebirth" && !universeReset.committed) {
    commitNewUniverse();
    playUniverseSound("reborn");
  }

  if (phase === "rewind") {
    const history = universeReset.source;
    const index = max(0, floor((history.length - 1) * (1 - t)));
    drawUniverseSnapshot(history[index], -1, t, history[max(0,index-2)]);
    drawRewindOverlay(t);
  } else if (phase === "accelerate") {
    const history = universeReset.source;
    drawUniverseSnapshot(history.length ? history[0] : null, 1, t);
    drawAcceleratingUniverse(t);
  } else if (phase === "collapse") {
    drawUniverseCollapse(t);
  } else {
    drawUniverseRebirth(t);
  }

  if (elapsed >= UNIVERSE_RESET_MS) {
    universeReset.active = false;
    universeReset.source = [];
    universeHistory = [];
    if (backgroundMusicLoaded) {
      updateMusicVolume(true);
      if (!backgroundMusic.isPlaying()) backgroundMusic.loop();
    }
  }
}

// Een momentopname tekenen zonder de ballen, levens of sterren te verplaatsen.
function drawUniverseSnapshot(snapshot, direction, t, echoSnapshot = null) {
  push();
  background(7, 5, 23);
  noStroke();
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const y = (star.y + height * 40 + (direction < 0 ? -1 : 1) * t * height * 2.8 * star.speed) % height;
    fill(125 + star.speed * 27, 143, 245, 185);
    circle(star.x, y, star.size);
  }
  if (snapshot) {
    if (echoSnapshot && echoSnapshot !== snapshot) {
      const c = drawingContext; c.save(); c.globalAlpha = .18 * (1 - t * .22);
      c.strokeStyle = 'rgba(205,153,255,.72)'; c.lineWidth = 2;
      for (let i = 0; i < min(snapshot.balls.length, echoSnapshot.balls.length); i++) {
        const a = echoSnapshot.balls[i], b = snapshot.balls[i];
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        drawOrb(a.x, a.y, BALL_SIZE * (.80 + .12 * sin(i * 3 + t * 8)), a.kind === 'bomb' ? 'bomb' : a.gold ? 'gold' : 'normal');
      }
      const dx = (echoSnapshot.catcherX - snapshot.catcherX) * .22;
      c.globalAlpha = .14; c.translate(dx, -2 - 5 * sin(t * PI));
      const priorWidth = catcherWidth; catcherWidth = echoSnapshot.catcherWidth;
      drawBucket(echoSnapshot.catcherX, catcherY); catcherWidth = priorWidth;
      c.restore();
    }
    for (const ball of snapshot.balls)
      drawOrb(ball.x, ball.y, BALL_SIZE, ball.kind === 'bomb' ? 'bomb' : ball.gold ? 'gold' : 'normal');
    noStroke();
    for (const p of snapshot.powerUps) {
      fill(p.type === 'slow' ? '#58f1fb' : '#b67dff');
      circle(p.x, p.y, POWERUP_SIZE);
    }
    const previousWidth = catcherWidth;
    catcherWidth = snapshot.catcherWidth;
    drawBucket(snapshot.catcherX, catcherY);
    catcherWidth = previousWidth;
    noStroke();
    fill(255, 255, 255, 220);
    textAlign(LEFT);
    textSize(18);
    text('SCORE ' + snapshot.score + '  |  LEVENS ' + snapshot.lives, 18, 30);
  }
  pop();
}

function drawUniverseHeader(mainText, subtitle, tint) {
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  drawingContext.shadowColor = tint;
  drawingContext.shadowBlur = 24;
  stroke(9, 3, 30, 230);
  strokeWeight(5);
  fill(tint);
  textSize(min(66, max(28, width * 0.057)));
  text(mainText, width / 2, height * 0.29);
  noStroke();
  fill('#e5dbff');
  textSize(min(20, max(13, width * 0.020)));
  text(subtitle, width / 2, height * 0.39);
  pop();
}

// Rewind-lijnen en een zichtbaar teruglopende tijdcirkel.
function rewindStreakY(index, t, canvasHeight = height) {
  return ((index * 61 - t * 760 + canvasHeight) % (canvasHeight + 61)) - 30;
}
function drawRewindOverlay(t) {
  push();
  noStroke();
  fill(94, 38, 187, 58 + t * 24);
  rect(0, 0, width, height);
  drawOrrery(t, true);
  drawChronometer(width*.18,height*.50,min(92,height*.12),gameMillis()*.006,.30);
  drawChronometer(width*.82,height*.50,min(92,height*.12),-gameMillis()*.006,.30);
  stroke(227, 186, 255, 34);
  strokeWeight(1.4);
  for (let i = 0; i < 20; i++) {
    const y = rewindStreakY(i, t);
    line(0, y, width, y - 7);
  }
  drawUniverseClock(width / 2, height * 0.70, min(190, height * 0.23), -t * TWO_PI * 8, '#c29bff');
  drawUniverseHeader('REWIND', 'PUCCI  ·  HET VERLEDEN VERDWIJNT', '#dbc0ff');
  pop();
}

// Cirkels, snelheidstunnels en honderd bewegingsstrepen; snel maar geen zware assets.
function drawAcceleratingUniverse(t) {
  drawOrrery(t, false);
  push();
  const speed = pow(t, 2) * 16 + 1;
  noStroke();
  fill(19, 2, 32, 82);
  rect(0, 0, width, height);
  translate(width / 2, height / 2);
  const radius = sqrt(width * width + height * height) * 0.62;
  strokeWeight(1.2 + speed * 0.12);
  for (let i = 0; i < 68; i++) {
    const a = (i / 68) * TWO_PI + gameMillis() * 0.00007 * speed;
    const near = 30 + ((i * 77 + gameMillis() * speed * 0.16) % radius);
    const far = near + 24 + speed * 15;
    stroke(i % 5 === 0 ? color(255, 212, 255, 145) : color(158, 139, 255, 92));
    line(cos(a) * near, sin(a) * near, cos(a) * far, sin(a) * far);
  }
  noFill();
  for (let i = 0; i < 4; i++) {
    const r = ((i * 100 + gameMillis() * (0.08 + t * 0.65)) % max(width, height)) + 20;
    stroke(161, 98, 243, 180 - i * 18);
    strokeWeight(1 + 5 * t);
    ellipse(0, 0, r * 1.4, r * 0.85);
  }
  pop();
  for(let i=0;i<3;i++) drawChronometer(width*(.19+i*.31),height*.56, min(100,height*.13),gameMillis()*.001*(1+t*18)*(i%2?-1:1),.30);
  drawUniverseClock(width / 2, height * 0.72, min(140, height * 0.18), gameMillis() * (0.004 + t * 0.125), '#f9bbff');
  drawUniverseHeader('MADE IN HEAVEN', 'TIME ACCELERATION   x' + floor(1 + speed * speed), '#fce0ff');
  push();
  noStroke();
  fill(246, 226, 255);
  textAlign(CENTER);
  textSize(16);
  text('UNIVERSE ' + String(universeNumber).padStart(2, '0') + '  →  ' + String(universeNumber + 1).padStart(2, '0'), width / 2, height * 0.91);
  pop();
}

function drawUniverseClock(x,y,radius,rotation,tint) {
  drawChronometer(x,y,radius,rotation,.85);
}

function drawUniverseCollapse(t) {
  push();
  background(5, 2, 17);
  drawOrrery(t, true);
  const x = width/2, y = height/2;
  translate(x,y);
  const collapse = easeInOutCubic(t);
  const field = max(width,height) * .7;
  // Sterren en puin versnellen in spiraalbanen naar de singulariteit.
  for (let i=0; i