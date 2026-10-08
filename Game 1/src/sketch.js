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
  for (let i = 0; i < 6; i++) {
    const reach = (i * 0.13 + eased) * max(width, height) * 0.83;
    stroke(i % 2 === 0 ? color(120, 235, 255, (1 - progress) * 180) : color(252, 210, 95, (1 - progress) * 130));
    strokeWeight(1 + (5 - i) * 0.7);
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
  stroke(180, 195, 255, 95 * (1 - elapsed / 2600));
  strokeWeight(2);
  for (let i = 0; i < 48; i++) {
    const angle = i * TWO_PI / 48;
    const start = max(width, height) * (0.32 + (i % 4) * 0.055);
    const finish = max(width, height) * 1.1;
    line(cos(angle) * start, sin(angle) * start,
         cos(angle) * finish, sin(angle) * finish);
  }
  pop();
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
  text(words, width / 2 + jitter, height * 0.43);
  noStroke();
  fill(220, 245, 255, opacity);
  textSize(min(fontSize * 0.38, 32));
  text(subline, width / 2, height * 0.56);
  pop();
}

function drawFrozenClock() {
  drawChronometer(width/2,height/2,min(width,height)*.37,0,1);
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
  textSize(min(width * 0.065, 56));
  text(timeStop.phase === "freeze" ? "TIME STOPPED" : "TIME IS YOURS", width / 2, height * 0.41);
  noStroke();
  fill(125, 232, 255, 210);
  textSize(min(19, width * 0.035));
  text(timeStop.phase === "freeze" ? "ALLE BALLEN STAAN STIL" : "BALSNELHEID: " + Math.round(getSlowFactor()*100) + "%", width / 2, height * 0.51);
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
      if (!ball.gold && !kingCrimson.active) {
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
    if (elapsed >= 1200 && !roadRoller.landed) {
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
    const lamp=ctx.createRadialGradient(-122,-197,1,-122,-197,48);lamp.addColorStop(0,'rgba(255,246,195,.85)');lamp.addColorStop(.25,'rgba(255,194,79,.32)');lamp.addColorStop(1,'rgba(255,174,51,0)');
    ctx.fillStyle=lamp;ctx.fillRect(-170,-240,96,96);
    ctx.globalAlpha=.32;ctx.fillStyle='#eff8ff';ctx.fillRect(-207,28+Math.sin(elapsed*.008)*15,411,3);ctx.restore();
  }
  if(!roadRollerImpact.active)return;
  const age=gameMillis()-roadRollerImpact.at,p=constrain(age/ROAD_ROLLER_IMPACT_MS,0,1),ease=easeOutCubic(p);
  const x=roadRollerImpact.x,y=roadRollerImpact.y,fade=1-p;
  ctx.save();ctx.globalAlpha=fade;
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
    drawUniverseSnapshot(history[index], -1, t);
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
function drawUniverseSnapshot(snapshot, direction, t) {
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
function drawRewindOverlay(t) {
  push();
  noStroke();
  fill(94, 38, 187, 85 + t * 35);
  rect(0, 0, width, height);
  drawOrrery(t, true);
  drawChronometer(width*.18,height*.50,min(92,height*.12),gameMillis()*.006,.30);
  drawChronometer(width*.82,height*.50,min(92,height*.12),-gameMillis()*.006,.30);
  stroke(227, 157, 255, 60);
  strokeWeight(3);
  for (let i = 0; i < 32; i++) {
    const y = (i * 53 + t * 920) % height;
    line(0, y, width, y - 16);
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
  fill(19, 2, 32, 130);
  rect(0, 0, width, height);
  translate(width / 2, height / 2);
  const radius = sqrt(width * width + height * height) * 0.62;
  strokeWeight(2.0 + speed * 0.2);
  for (let i = 0; i < 106; i++) {
    const a = (i / 106) * TWO_PI + gameMillis() * 0.00007 * speed;
    const near = 30 + ((i * 77 + gameMillis() * speed * 0.16) % radius);
    const far = near + 35 + speed * 23;
    stroke(i % 4 === 0 ? '#ffd4ff' : '#9e8bff');
    line(cos(a) * near, sin(a) * near, cos(a) * far, sin(a) * far);
  }
  noFill();
  for (let i = 0; i < 6; i++) {
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
  for (let i=0; i<112; i++) {
    const a = i * 2.39996 + t * (4 + i%7*.08);
    const radius = field * (.13 + (i%23)/23) * (1-collapse) + 7;
    const nx = cos(a)*radius, ny = sin(a)*radius*.63;
    stroke(i%5===0 ? '#ffe3a3' : '#bc92ff'); strokeWeight(i%7===0 ? 2.5 : 1.1);
    line(nx*1.13,ny*1.13,nx,ny);
  }
  noFill();
  for (let i=0; i<7; i++) {
    const r = (60 + i*46)*(1-t*.85);
    stroke(i%2 ? color(156,110,248, 190*(1-t)) : color(251,212,158, 160*(1-t)));
    strokeWeight(1.6+i*.37);
    push(); rotate(gameMillis()*.0035*(i%2 ? -1 : 1)); ellipse(0, 0, r * 2.8, r*.87); pop();
  }
  drawingContext.shadowColor='#f6b0ff'; drawingContext.shadowBlur=36;
  noStroke(); fill(13,5,31); circle(0,0, 65+90*(1-t));
  fill(240,193,255, 130+100*t); circle(0,0, 32*(1-t)+7);
  drawingContext.shadowBlur=0;
  pop();
  if (t > .73 && OVERHAUL_AUDIO.flashes) {
    noStroke(); fill(255,245,255,200*easeOutCubic((t-.73)/.27)); rect(0,0,width,height);
  }
  if (t < .70) drawUniverseHeader('UNIVERSE RESET','THE SINGULARITY CONSUMES EVERYTHING','#ffe1ff');
}

function drawUniverseRebirth(t) {
  push();
  background(6, 6, 24);
  drawCosmicAtlas();
  const progress = easeOutCubic(t);
  translate(width/2,height/2);
  noFill();
  // Gelaagde kosmische shockwaves, een paar rechte stralen, stervelden en nieuwe lichtbronnen.
  for (let i=0; i<6; i++) {
    const p = constrain(t-i*.09,0,1);
    if (p<=0) continue;
    stroke(i%2 ? color(129,215,255,145*(1-p)) : color(242,174,255,180*(1-p)));
    strokeWeight(9*(1-p)+1);
    ellipse(0,0,p*max(width,height)*2.0,p*max(width,height)*1.15);
  }
  for (let i=0; i<110; i++) {
    const a=i*2.39996 + t*.3;
    const dist=(12+i%17*10)*progress*(1+t*7);
    stroke(i%5 ? '#bea8ff' : '#ffdfac'); strokeWeight(i%9===0?3:1.3);
    point(cos(a)*dist,sin(a)*dist);
  }
  noStroke(); fill(185,151,255,50*(1-t)); circle(0,0,100+progress*520);
  pop();
  if (t < .36 && OVERHAUL_AUDIO.flashes) {
    noStroke(); fill(255,255,255,115*(1-t/.36)); rect(0,0,width,height);
  }
  drawUniverseHeader('NEW UNIVERSE ' + String(universeNumber).padStart(2,'0'),
    'ALLES BEGINT OPNIEUW  ·  SCORE 0  ·  3 LEVENS','#bafaff');
  push(); noStroke(); fill('#ffedba'); textAlign(CENTER); textSize(18);
  text('MADE IN HEAVEN  ·  ENRICO PUCCI',width/2,height*.82); pop();
}

function playUniverseSound(type) {
  const cues = { charge: 'rewind', speed: 'roller', collapse: 'impact', reborn: 'rebirth' };
  playCue(cues[type] || 'rewind', 0.95);
}

// ==================== EINDE MADE IN HEAVEN ====================


// ==================== ULTIMATE OVERHAUL: GAMEPLAY ====================
function getDifficultyScale() {
  // Stijgt langzaam tot 1.55x. Geen onverwachte snelheidsverdubbelingen.
  return (1 + min(0.55, (waveNumber - 1) * 0.065)) * (activeEvent.type === 'meteor' ? 1.2 : 1);
}
function updateGameplayEvents() {
  if (!gameStarted || gameOver) return;
  const nextWave = 1 + floor(score / 45);
  if (nextWave > waveNumber) {
    waveNumber = nextWave;
    waveNoticeUntil = gameMillis() + 2400;
    addJoJoPopup('WAVE ' + waveNumber, width / 2, height * 0.3, '#ffdd8d', 1350, 40);
    playCue('power');
  }
  if (activeEvent.type !== 'none' && gameMillis() >= activeEvent.end) {
    addJoJoPopup('EVENT CLEARED!', width / 2, height * 0.27, '#e6d1ff', 700, 24);
    activeEvent = { type: 'none', end: 0 };
  }
  if (gameMillis() >= nextEventAt && activeEvent.type === 'none') {
    activeEvent = { type: random() < 0.5 ? 'golden' : 'meteor', end: gameMillis() + 6500 };
    nextEventAt = gameMillis() + 26000;
    addJoJoPopup(activeEvent.type === 'golden' ? 'GOLD RUSH · SCORE x2' : 'METEOR RAIN · FASTER!',
                 width / 2, height * 0.36, '#ffdb8d', 2000, 31);
    playCue('roller');
  }
  if (awakening.active && gameMillis() >= awakening.end) awakening.active = false;
  if (kingCrimson.active && gameMillis() - kingCrimson.start >= KING_CRIMSON_MS) {
    kingCrimson.active = false;
    addJoJoPopup('TIME HAS BEEN ERASED', width / 2, height * 0.33, '#ff8fac', 850, 24);
    playCue('rebirth');
  }
}
function startAwakening() {
  awakening = { active: true, end: gameMillis() + 8500 };
  gainStandEnergy(20);
  jojoShake = max(jojoShake, 7);
  addJoJoPopup('STAND AWAKENING!', width / 2, height * 0.35, '#f6c4ff', 1650, 43);
  playCue('rebirth');
}
function drawAwakeningAura() {
  const progress = constrain((awakening.end - gameMillis()) / 8500, 0, 1);
  push();
  const x = catcherX + catcherWidth / 2;
  const y = catcherY + catcherHeight * 0.35;
  noFill(); stroke(231, 170, 255, progress * 180);
  for (let i = 0; i < 4; i++) {
    strokeWeight(1 + i);
    ellipse(x, y, catcherWidth + 15 + i * 19 + sin(gameMillis() * .004 + i) * 11,
            catcherHeight + 60 + i * 19);
  }
  pop();
}
function startKingCrimson() {
  if (!canUseJoJoAttack(KING_CRIMSON_COST)) {
    if (standEnergy < KING_CRIMSON_COST) notEnoughStandEnergy(KING_CRIMSON_COST);
    return;
  }
  if (timeStop.phase === 'intro' || timeStop.phase === 'freeze' || roadRoller.active) {
    addJoJoPopup('TIME ALREADY STOPPED!', width / 2, height * .7, '#ffb9cb', 850, 23);
    return;
  }
  standEnergy -= KING_CRIMSON_COST;
  kingCrimson = { active: true, start: gameMillis(), used: true };
  addJoJoPopup('KING CRIMSON!', width / 2, height * 0.33, '#ff89ae', 1300, 44);
  playCue('rewind');
}
function drawKingCrimsonEffects() {
  if (!kingCrimson.active) return;
  push();
  noStroke(); fill(215, 31, 93, 41); rect(0, 0, width, height);
  const t = (gameMillis() - kingCrimson.start) / KING_CRIMSON_MS;
  stroke(255, 104, 169, 116 * (1 - t)); strokeWeight(4); noFill();
  for (let i = 0; i < 4; i++) {
    const x = catcherX + catcherWidth / 2;
    const y = catcherY + catcherHeight / 2;
    ellipse(x, y, 100 + t * 200 + i * 20, 70 + t * 100 + i * 20);
  }
  noStroke(); textAlign(CENTER); fill('#ffb6c7'); textSize(17); textStyle(BOLD);
  text('INVULNERABLE · FUTURE ERASED', width / 2, height * 0.15);
  pop();
}
function explodeBomb(x, y, source) {
  // Chain-reactie: alleen ballen dicht bij de explosie. Max één golf.
  let hits = 0;
  for (const other of balls) {
    if (other === source || other.y < -BALL_SIZE || other.y > height) continue;
    if (dist(x, y, other.x, other.y) < 125) {
      other.targeted = false;
      score += 2;
      hits++;
      burstJoJoParticles(other.x, other.y, '#ff88b8', 8);
      respawnBall(other);
    }
  }
  burstJoJoParticles(x, y, '#ff8cb8', 28);
  if (hits) addJoJoPopup('CHAIN REACTION +' + hits * 2, x, y - 32, '#ffb2d4', 1000, 25);
  else addJoJoPopup('KILLER QUEEN!', x, y - 32, '#ffb2d4', 800, 23);
  playCue('impact');
  updateRecords();
}
function drawBackdropDetails() {
  push(); const a=getArenaBounds(), h=height*.82;
  stroke(151,149,201,48); strokeWeight(1);
  line(a.left,150,a.left,height); line(a.right,150,a.right,height);
  for(let i=0;i<14;i++) {
    const y=170+i*(height-190)/14;
    line(a.left-5,y,a.left,y);line(a.right,y,a.right+5,y);
  }
  stroke(148,116,184,22);
  for(let i=-7;i<=7;i++)line(width/2+i*15,h,width/2+i*a.width*.14,height);
  for(let i=1;i<=5;i++) {const y=h+(height-h)*pow(i/5,1.7);line(a.left,y,a.right,y);}
  pop();
}

function drawTimeZoom(elapsed) {
  const t = constrain(elapsed / 1100, 0, 1);
  push(); translate(width / 2, height / 2);
  noFill(); stroke(255, 221, 143, 140 * (1 - t));
  strokeWeight(8 * (1 - t));
  for (let i = 0; i < 3; i++) ellipse(0, 0, (i + t) * max(width, height) * .85);
  pop();
}
// ==================== ULTIMATE OVERHAUL: AUDIO ====================
function playCue(name, intensity = 1) {
  if (!audioUnlocked || OVERHAUL_AUDIO.master <= 0 || OVERHAUL_AUDIO.effects <= 0) return false;
  // Punch/catches mogen snel, maar hoogstens 20x per seconde klinken.
  const interval = name === 'punch' ? 65 : name === 'catch' ? 58 : name === 'perfect' ? 110 : 140;
  if (gameMillis() - (effectLastPlayed[name] ?? -Infinity) < interval) return false;
  effectLastPlayed[name] = gameMillis();
  const asset = soundEffects[name];
  if (asset && asset.ready && asset.sound) {
    try {
      asset.sound.setVolume(min(1, intensity * OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.effects * .72));
      asset.sound.play();
      return true;
    } catch (_) {}
  }
  return synthFallback(name, intensity);
}
function synthFallback(name, intensity) {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return false;
    const presets = {
      catch: [650, 920, .085, 'sine'], perfect: [540, 1260, .32, 'sine'],
      power: [260, 800, .22, 'triangle'], punch: [130, 48, .12, 'sawtooth'],
      impact: [95, 26, .6, 'sawtooth'], rewind: [310, 65, .8, 'triangle'],
      roller: [60, 170, .6, 'sawtooth'], rebirth: [240, 860, .65, 'sine'],
      miss: [180, 80, .2, 'triangle']
    };
    const [f0, f1, duration, kind] = presets[name] || presets.power;
    const osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
    osc.type = kind;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f1, now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(min(.17, intensity * OVERHAUL_AUDIO.master * OVERHAUL_AUDIO.effects * .14), now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + duration + .025);
    return true;
  } catch (_) { return false; }
}
function updateMusicVolume(force = false) {
  const cinematic = universeReset.active || timeStop.phase === 'intro' || timeStop.phase === 'freeze' || roadRoller.active;
  musicTarget = cinematic ? .055 : timeStop.phase === 'slow' ? .17 : .55;
  if (optionsVisible) musicTarget *= .25;
  const intended = musicTarget * OVERHAUL_AUDIO.music * OVERHAUL_AUDIO.master;
  if (!backgroundMusicLoaded || !backgroundMusic) return;
  if (force || abs(previousMusicLevel - intended) > .002) {
    backgroundMusic.setVolume(intended, .18);
    previousMusicLevel = intended;
  }
}

function getCinematicCameraScale() {
  if (timeStop.phase === 'intro') {
    const t = constrain((gameMillis() - timeStop.phaseStart) / TIME_STOP_INTRO_MS, 0, 1);
    return 1 + 0.072 * pow(sin(t * PI), 2);
  }
  if (roadRoller.active) {
    const t = constrain((gameMillis() - roadRoller.start) / ROAD_ROLLER_DURATION_MS, 0, 1);
    return 1 + 0.035 * sin(t * PI);
  }
  return 1;
}

// ==================== CINEMATIC DIRECTOR — polishlaag ====================
function drawCinematicDirector() {
  if (timeStop.phase === 'idle' && !standRush.active && !roadRoller.active) return;
  push();
  const u = hudScale();
  noStroke();
  if (timeStop.phase === 'intro') {
    const t = constrain((gameMillis()-timeStop.phaseStart)/TIME_STOP_INTRO_MS,0,1);
    const bar = min(54*u,height*.09) * easeOutCubic(min(1,t*5));
    fill(3,2,12,224); rect(0,0,width,bar); rect(0,height-bar,width,bar);
    textStyle(BOLD); textAlign(LEFT,CENTER); textSize(12*u); fill('#e9c994');
    text('THE WORLD  /  CHRONOSTASIS',22*u,bar*.53);
    textAlign(RIGHT); text('TIME DISTORTION · ' + floor(t*100) + '%',width-22*u,bar*.53);
    if (t>.2 && t<.87) {
      stroke(155,216,255,110*(1-t)); strokeWeight(2);
      const x=width/2, y=height/2;
      for (let i=0;i<9;i++) {
        const a=i*TWO_PI/9 + t*.32;
        const radius=(.13+ .23*easeOutCubic(t))*min(width,height);
        line(x+cos(a)*radius,y+sin(a)*radius,x+cos(a+0.04)*(radius+24),y+sin(a+0.04)*(radius+24));
      }
    }
  }
  if (standRush.active) {
    const t=constrain((gameMillis()-standRush.start)/ORA_RUSH_DURATION_MS,0,1);
    const alpha = 90*(1-t);
    noStroke(); fill(134,75,193,alpha); rect(0,0,10*u,height);
    fill(250,211,255,150*(1-t)); rect(width-8*u,0,8*u,height);
  }
  if (roadRoller.active) {
    const t=constrain((gameMillis()-roadRoller.start)/ROAD_ROLLER_DURATION_MS,0,1);
    if(t>.36 && t<.9) {
      noFill(); stroke(255,212,114,(1-t)*150); strokeWeight(3);
      const pulse = easeOutCubic(constrain((t-.36)/.64,0,1));
      ellipse(width/2,height*.69,(250+pulse*550)*u,(90+pulse*135)*u);
    }
  }
  pop();
}
// CELESTIAL EDITION: native canvas vector atlas; cached once per quality change.
const visualAtlas={};
function getSlowFactor(){const n=Number(OVERHAUL_AUDIO.slowFactor);return Number.isFinite(n)?Math.max(.4,Math.min(.75,n)):TIME_STOP_SLOW_FACTOR;}
function renderDensity(){const q=Math.max(0,Math.min(3,Number(OVERHAUL_AUDIO.quality)||0)),d=typeof displayDensity==='function'?displayDensity():1;return Math.max(.5,Math.min(d,[1,1.5,2,2.5][q],Math.sqrt([4.2e6,8.3e6,12.5e6,16.6e6][q]/(width*height))));}
function atlasCanvas(w,h,paint,res=2){if(typeof document.createElement!=='function')return null;const c=document.createElement('canvas');c.width=Math.ceil(w*res);c.height=Math.ceil(h*res);const ctx=c.getContext('2d');ctx.scale(res,res);paint(ctx,w,h);return c;}
function metal(c,x,y,w,h,colors){const g=c.createLinearGradient(x,y,x+w*.3,y+h);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}
function plate(c,points,fill,edge='#b4acc8',lw=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=lw;c.stroke();}}
function disc(c,x,y,r,fill,edge=null){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1;c.stroke();}}
function bolt(c,x,y,r=2){disc(c,x,y,r,'#141421','#b4a7bd');c.strokeStyle='#ded4c4';c.lineWidth=.6;c.beginPath();c.moveTo(x-r*.5,y);c.lineTo(x+r*.5,y);c.stroke();}
function rebuildVisuals(){
 if(typeof document.createElement!=='function')return;
 if(typeof pixelDensity==='function')pixelDensity(renderDensity());
 const q=Math.max(0,Math.min(3,Math.round(Number(OVERHAUL_AUDIO.quality)||0)));OVERHAUL_AUDIO.quality=q;const res=[1,1.5,2,3][q];
 visualAtlas.catcher=atlasCanvas(180,100,paintCatcher,res);visualAtlas.fist=atlasCanvas(84,198,paintFist,res);
 visualAtlas.roller=atlasCanvas(780,510,paintRoller,res);visualAtlas.clock=atlasCanvas(640,640,paintClock,q<2?1:1.5);
 for(const kind of ['normal','gold','bomb'])visualAtlas[kind]=atlasCanvas(64,64,c=>paintOrb(c,kind),res);
 visualAtlas.space=atlasCanvas(1600,1000,paintCosmos,q===0?.6:1);
}
function paintCatcher(c){
 const steel=metal(c,0,0,180,100,['#ddd2b8','#746788','#292536','#8d82a0','#242332']);
 const armor=metal(c,0,12,160,78,['#a49bb4','#5b5179','#282540','#514067','#171629']);
 plate(c,[[7,8],[173,8],[151,94],[29,94]],steel,'#0a0b17',3);plate(c,[[14,14],[166,14],[146,86],[34,86]],armor,'#ded3c0');
 plate(c,[[14,9],[166,9],[157,24],[23,24]],'#090b1c','#afa9bd');plate(c,[[8,5],[172,5],[168,11],[12,11]],metal(c,0,5,180,7,['#fff0b5','#b48c44','#49344a']),'#ecce89');
 for(let side of [-1,1]){c.save();c.translate(90,0);c.scale(side,1);
 plate(c,[[16,29],[61,25],[48,77],[28,83],[23,59]],metal(c,18,24,48,62,['#b4a3c4','#49415e','#211e38']),'#98899e');plate(c,[[57,23],[70,20],[54,80],[46,78]],steel,'#201c30');
 c.strokeStyle='#191727';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(31+i*2,39+i*6);c.lineTo(53-i*1.4,37+i*6);c.stroke();}
 c.strokeStyle='#bea47c';c.lineWidth=1;c.beginPath();c.moveTo(24,34);c.lineTo(37,29);c.lineTo(54,29);c.stroke();bolt(c,62,18);bolt(c,45,80);bolt(c,30,31,1.4);c.fillStyle='#c6e8f3';c.fillRect(55,31,3,11);c.restore();}
 disc(c,90,48,24,'#17172b','#97879e');disc(c,90,48,20,steel,'#e1d6bd');disc(c,90,48,16,'#17112b','#6c587a');
 const lens=c.createRadialGradient(85,42,0,90,48,16);lens.addColorStop(0,'#fff4ff');lens.addColorStop(.18,'#dda5fd');lens.addColorStop(.5,'#793b9d');lens.addColorStop(1,'#19172e');disc(c,90,48,14,lens);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;bolt(c,90+Math.cos(a)*20,48+Math.sin(a)*20,1.3);}
 plate(c,[[38,87],[142,87],[138,93],[42,93]],'#171a2c','#8b7d93');c.fillStyle='#bf90d9';c.fillRect(63,89,54,1);c.fillStyle='#c7bed7';c.font='4px monospace';c.fillText('S T A N D   /   C O R E',66,77);
 c.strokeStyle='#e7d8e822';c.lineWidth=.5;for(let i=0;i<20;i++){let x=28+(i*37)%123,y=28+(i*19)%53;c.beginPath();c.moveTo(x,y);c.lineTo(x+3+i%4,y-1);c.stroke();}
}
function paintOrb(c,kind){
 const gold=kind==='gold',bomb=kind==='bomb';const ramp=gold?['#fffbe1','#ffdf83','#b87628','#493250']:bomb?['#ffe8ff','#d378f5','#612584','#160d30']:['#fff0ed','#f889a1','#a72a63','#221430'];
 const g=c.createRadialGradient(23,20,1,34,36,29);ramp.forEach((v,i)=>g.addColorStop(i/3,v));disc(c,32,32,27,g,gold?'#fff0b4':'#ffc5ed');
 c.save();c.beginPath();c.arc(32,32,26,0,Math.PI*2);c.clip();c.strokeStyle=gold?'#704c3777':'#35134666';c.lineWidth=2;
 for(let i=0;i<4;i++){c.beginPath();c.ellipse(32,32,10+i*5,28,-.55,0,Math.PI*2);c.stroke();}
 c.strokeStyle='#fffbef88';c.lineWidth=1;c.beginPath();c.ellipse(32,32,26,10,-.55,0,Math.PI*2);c.stroke();
 for(let i=0;i<33;i++){c.fillStyle='#ffffff20';c.fillRect(9+(i*29)%48,9+(i*17)%48,.7,.7);}
 c.fillStyle='#ffffffb0';c.beginPath();c.ellipse(23,18,10,4,-.6,0,Math.PI*2);c.fill();c.restore();
 if(bomb){plate(c,[[32,17],[36,28],[46,32],[36,36],[32,47],[28,36],[18,32],[28,28]],'#160f26','#ffcaff');disc(c,32,32,3,'#ffefff');}
 if(gold){c.fillStyle='#5f3c26';c.font='bold 18px serif';c.textAlign='center';c.fillText('★',33,39);}
}
function drawOrb(x,y,size,kind){const a=visualAtlas[kind];if(!a){push();fill(kind==='gold'?'#ffdf84':'#e376af');circle(x,y,size);pop();return;}const c=drawingContext;c.save();c.translate(x,y);c.rotate(Math.sin(gameMillis()*.002+x)*.17);c.drawImage(a,-size*.59,-size*.59,size*1.18,size*1.18);c.restore();}
function paintFist(c){
 const shell=metal(c,0,0,84,185,['#f3d8ff','#9b74c0','#3a285e','#67447e']);
 plate(c,[[23,68],[62,68],[70,189],[48,197],[16,184]],shell,'#201a31',3);plate(c,[[27,86],[39,92],[37,184],[23,175]],'#c6aed3','#ece2f1');plate(c,[[47,94],[61,85],[65,178],[47,189]],'#47305e','#8d6eac');
 plate(c,[[14,63],[64,62],[70,88],[18,97],[10,86]],metal(c,0,62,70,35,['#ffedbb','#9f8258','#3e2a44']),'#322439',2);for(let i=0;i<5;i++)bolt(c,19+i*9,77,2);
 plate(c,[[10,19],[21,7],[60,10],[73,28],[68,62],[51,72],[22,67],[9,48]],shell,'#241a35',3);
 for(let i=0;i<4;i++){let x=12+i*13,y=12+Math.abs(i-1)*3;plate(c,[[x,y+6],[x+3,y],[x+11,y],[x+13,y+8],[x+11,y+25],[x+1,y+25]],metal(c,x,y,13,28,['#f5e4fd','#bb8cd2','#6b4984']),'#503662',1);c.strokeStyle='#e0c5ee';c.beginPath();c.moveTo(x+3,y+17);c.lineTo(x+10,y+17);c.stroke();}
 plate(c,[[59,29],[75,33],[80,47],[73,59],[57,56],[49,45]],shell,'#30213e',2);c.strokeStyle='#52395e';c.lineWidth=1.5;c.beginPath();c.moveTo(22,46);c.lineTo(46,51);c.lineTo(53,61);c.stroke();
}
function paintRoller(c){
 c.save();c.scale(1.5,1.5);const gold=metal(c,0,40,520,180,['#fff3a1','#dda23c','#795123','#edc25b','#604627']),steel=metal(c,0,230,500,90,['#202836','#899aaa','#e7e4d2','#647283','#262d3c']);
 plate(c,[[61,146],[422,145],[476,182],[463,261],[59,259],[36,197]],gold,'#25202a',4);plate(c,[[291,111],[401,111],[439,147],[427,208],[289,206]],gold,'#4a3420',3);
 for(let i=0;i<9;i++){c.fillStyle='#302c2a';c.fillRect(310,126+i*7,86,3);}
 plate(c,[[84,44],[217,44],[241,151],[77,151]],'#423e44','#c4b99b',3);plate(c,[[94,52],[204,52],[220,128],[88,128]],metal(c,85,50,137,82,['#c2dde2','#4b7d8d','#172d47']),'#121d2c',3);
 c.fillStyle='#14253c';c.fillRect(120,90,24,37);c.fillRect(109,118,53,12);c.strokeStyle='#d4eef177';c.lineWidth=6;c.beginPath();c.moveTo(109,54);c.lineTo(167,125);c.stroke();c.strokeStyle='#b9b09a';c.lineWidth=5;c.beginPath();c.moveTo(173,48);c.lineTo(186,130);c.stroke();
 plate(c,[[76,34],[221,34],[234,46],[69,46]],gold,'#594329',3);c.fillStyle='#30303b';c.fillRect(258,61,13,92);c.fillRect(256,57,19,8);c.fillStyle='#a8a0a0';c.fillRect(261,68,3,59);
 for(let i=0;i<3;i++){c.fillStyle='#25242c';c.fillRect(86,157+i*20,63,11);c.fillStyle='#b4a18a';c.fillRect(89,157+i*20,60,2);}
 plate(c,[[155,156],[278,156],[278,224],[156,225]],gold,'#5d472d',2);c.fillStyle='#41332d';c.fillRect(174,170,27,4);c.fillRect(271,180,4,15);c.font='bold 12px monospace';c.fillStyle='#362d2c';c.fillText('WR-09',198,202);
 for(let i=0;i<16;i++)bolt(c,62+i*25,239,2.2);for(let i=0;i<9;i++)plate(c,[[297+i*13,217],[306+i*13,217],[295+i*13,230],[286+i*13,230]],i%2?'#d3a34c':'#2c2b30',null);
 for(const x of [45,450]){plate(c,[[x,184],[x+21,184],[x+31,292],[x+3,292]],metal(c,x,180,30,110,['#dfb965','#645344','#aaa5a1']),'#302b31',3);bolt(c,x+12,197,6);bolt(c,x+17,281,7);}
 c.fillStyle=steel;c.fillRect(43,260,431,64);for(const x of [43,474]){c.beginPath();c.ellipse(x,292,21,33,0,0,Math.PI*2);c.fill();}c.strokeStyle='#bdc2c3';c.lineWidth=2;c.strokeRect(44,260,430,64);
 for(let i=0;i<24;i++){c.strokeStyle=i%3?'#171c2830':'#f3eddd44';c.lineWidth=.7;c.beginPath();c.moveTo(55+i*17,263);c.lineTo(59+i*17,320);c.stroke();}
 for(const x of [44,474]){c.beginPath();c.ellipse(x,292,15,27,0,0,Math.PI*2);c.fillStyle='#31394a';c.fill();bolt(c,x,292,7);}
 disc(c,63,169,10,'#fff6cf','#504237');disc(c,451,177,10,'#fff6cf','#504237');c.fillStyle='#ffc45d';c.fillRect(133,19,13,13);disc(c,139,20,6,'#fff3b4');c.font='7px monospace';c.fillStyle='#e8d89b';c.fillText('CAUTION / HEAVY LOAD',297,245);
 c.strokeStyle='#342b2855';c.lineWidth=1;for(let i=0;i<45;i++){let x=48+(i*71)%421,y=153+(i*19)%74;c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y+2);c.stroke();}c.restore();
}
function paintClock(c){
 c.translate(320,320);for(let r of [307,299,278,251,211]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.strokeStyle=r===299?'#d9c18b':'#8493ac';c.lineWidth=r===299?7:1.2;c.stroke();}
 for(let k=0;k<2;k++){c.beginPath();for(let i=0;i<=720;i++){let a=i*Math.PI/360,r=267+8*Math.sin(a*48+k*Math.PI),x=Math.cos(a)*r,y=Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#aa9da877';c.lineWidth=.7;c.stroke();}
 for(let i=0;i<120;i++){c.save();c.rotate(i*Math.PI/60);c.strokeStyle=i%10?'#879bba':'#f2dcaa';c.lineWidth=i%10?1:4;c.beginPath();c.moveTo(0,-(i%10?283:279));c.lineTo(0,-296);c.stroke();c.restore();}
 c.font='22px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ead8b4';const nums=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];for(let i=0;i<12;i++){let a=i*Math.PI/6;c.fillText(nums[i],Math.sin(a)*231,-Math.cos(a)*231);}
 for(const [x,y,r] of [[-83,62,66],[67,82,47],[29,-82,44]]){c.save();c.translate(x,y);for(let i=0;i<24;i++){c.rotate(Math.PI/12);c.fillStyle='#a399a366';c.fillRect(-3,r-4,6,9);}for(let rr of [r-4,r-12,9]){c.beginPath();c.arc(0,0,rr,0,Math.PI*2);c.strokeStyle='#c3b28e99';c.lineWidth=2;c.stroke();}for(let i=0;i<6;i++){c.rotate(Math.PI/3);c.fillStyle='#c4b49c66';c.fillRect(8,-3,r-22,6);}c.restore();}
 c.font='9px monospace';c.fillStyle='#b3c2dc';c.fillText('C H R O N O S T A S I S',0,160);for(let i=0;i<12;i++){let a=i*Math.PI/6;bolt(c,Math.sin(a)*306,Math.cos(a)*306,3);}
}
function drawChronometer(x,y,r,rotation,alpha){if(!visualAtlas.clock)return;const c=drawingContext;c.save();c.translate(x,y);c.globalAlpha=alpha;c.drawImage(visualAtlas.clock,-r,-r,r*2,r*2);c.scale(r/320,r/320);for(const [angle,len,w] of [[rotation,191,8],[-rotation*.23+1.1,140,12]]){c.save();c.rotate(angle);plate(c,[[0,-len],[-w,-len+30],[-w*.4,-20],[-w,16],[0,34],[w,16],[w*.4,-20],[w,-len+30]],'#e3d8bb','#708fa7',1.4);c.restore();}disc(c,0,0,12,'#dac494','#f2faff');disc(c,0,0,5,'#455971');c.restore();}
function paintCosmos(c,w,h){
 let seed=271828;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};c.fillStyle='#050a18';c.fillRect(0,0,w,h);
 for(let i=0;i<170;i++){let x=rnd()*w,y=210+x*.27+(rnd()-.5)*230,r=25+rnd()*150,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%3?'rgba(66,49,107,.065)':'rgba(53,109,138,.07)');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 for(let i=0;i<2600;i++){let x=rnd()*w,y=rnd()*h,r=rnd();c.fillStyle=i%5?'#a5b2d7':'#ead3aa';c.globalAlpha=.1+r*.55;c.fillRect(x,y,r>.985?2:.6+r*.5,r>.985?2:.6+r*.5);}c.globalAlpha=1;
 c.save();c.translate(w*.82,h*.29);c.rotate(-.32);c.strokeStyle='#ac9b8970';c.lineWidth=1;for(let i=0;i<29;i++){c.beginPath();c.ellipse(0,0,109+i*1.8,26+i*.45,0,Math.PI,Math.PI*2);c.stroke();}
 let g=c.createRadialGradient(-32,-37,3,15,15,84);g.addColorStop(0,'#74768c');g.addColorStop(.42,'#3d485e');g.addColorStop(.75,'#172036');g.addColorStop(1,'#080c1c');disc(c,0,0,74,g,'#6a7f98');c.save();c.beginPath();c.arc(0,0,73,0,Math.PI*2);c.clip();for(let i=0;i<36;i++){c.strokeStyle=i%2?'#8998ab19':'#060c1d35';c.lineWidth=1+i%3;c.beginPath();c.ellipse(0,-78+i*4,88,13,0,0,Math.PI);c.stroke();}c.restore();
 for(let i=0;i<29;i++){c.strokeStyle=i%3?'#a59ba15a':'#e0c9a466';c.beginPath();c.ellipse(0,0,109+i*1.8,26+i*.45,0,0,Math.PI);c.stroke();}c.restore();
 for(const side of [0,1])for(let i=0;i<9;i++){let x=side?w-i*24:i*24,top=690+rnd()*140;plate(c,[[x-12,h],[x-9,top],[x,top-32],[x+8,top],[x+12,h]],'#0b1125','#35405a66');for(let y=top+15;y<h;y+=16){c.fillStyle='#9284b32b';c.fillRect(x-2,y,2,4);}}
 let shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'transparent');shade.addColorStop(.38,'#04081744');shade.addColorStop(.62,'#04081744');shade.addColorStop(1,'transparent');c.fillStyle=shade;c.fillRect(0,0,w,h);
}
function drawCosmicAtlas(){if(!visualAtlas.space)return;const c=drawingContext;c.save();let shift=(catcherX+catcherWidth/2-width/2)/Math.max(1,width)*10;c.drawImage(visualAtlas.space,-12+shift,-8,width+24,height+16);if(timeStop.phase!=='idle'){c.fillStyle='rgba(46,133,160,.075)';c.fillRect(0,0,width,height);}c.restore();}
function drawOrrery(t,collapse){if(!visualAtlas.clock)return;const c=drawingContext,radius=min(width,height)*(.25+(collapse?-.20*t:.12*t));c.save();c.translate(width/2,height/2);c.rotate(gameMillis()*.00015*(1+t*9));c.strokeStyle='#bfaed344';c.lineWidth=1;for(let j=0;j<3;j++){c.save();c.rotate(j*Math.PI/3);c.beginPath();c.ellipse(0,0,radius*2,radius*.6,0,0,Math.PI*2);c.stroke();for(let i=0;i<7;i++){let a=i*Math.PI*2/7+t*5;disc(c,Math.cos(a)*radius*2,Math.sin(a)*radius*.6,2+i%3,'#e5c893');}c.restore();}c.restore();}
