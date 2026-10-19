// ============================================================
//  game.js — het hart van de game.
//
//  Hier staat de "toestand" van het spel (score, levens, combo...)
//  en wat er gebeurt als je iets vangt of mist. De game heeft een
//  paar schermen (states):
//    'title'    titelscherm
//    'playing'  aan het spelen
//    'paused'   pauze
//    'cards'    Stand-kaart kiezen na een golf
//    'reset'    nieuw universum (na de eindbaas)
//    'gameover' TO BE CONTINUED...
// ============================================================

const Game = {
  state: 'title',
  fieldW: FIELD.maxWidth,
  catcher: null,
  waves: null,
  objects: [],
  nails: [],         // nagels van Tusk
  boss: null,
  score: 0,
  lives: LIVES.start,
  maxLives: LIVES.start,
  combo: 0,
  maxCombo: 0,
  energy: 0,
  universe: 1,
  perks: freshPerks(),
  crimsonShields: 0,
  discLock: 0,        // seconden dat je Stand geblokkeerd is (DISC)
  graceTime: 0,       // even veilig na een verloren leven
  handTimer: 0,
  time: 0,            // echte tijd
  worldTime: 0,       // tijd van de wereld (staat stil bij Time Stop)
  stats: null,
  banner: null,
  timers: [],
  gameOverPending: false,
  gameOverTime: 0,
  announceCount: 0,
  announceTimer: 0,
  hints: null,
  lastRunVoice: -999,
  voicedThisWave: {},
  history: [],        // "foto's" van het speelveld voor de Made in Heaven-rewind
  historyTimer: 0,

  init() {
    this.catcher = new Catcher();
    this.waves = new WaveDirector();
    this.resize();
    TitleScreen.open();
    Sound.playMusic(Save.settings.soundtrack);
  },

  resize() {
    this.fieldW = View.w;
    if (this.catcher) this.catcher.x = clamp(this.catcher.x, this.catcher.halfWidth, this.fieldW - this.catcher.halfWidth);
  },

  // ---------- een nieuw potje ----------
  startRun() {
    this.resetRun();
    this.state = 'playing';
    Sound.stopVoice(0.05);
    Sound.playMusic(Save.settings.soundtrack);
    this.startWave(1);
  },

  // Zet alles terug naar het begin (score, levens, kaarten...).
  resetRun() {
    this.objects = [];
    this.nails = [];
    this.boss = null;
    this.score = 0;
    this.lives = LIVES.start;
    this.maxLives = LIVES.start;
    this.combo = 0;
    this.maxCombo = 0;
    this.energy = 0;
    this.universe = 1;
    this.perks = freshPerks();
    this.crimsonShields = 0;
    this.discLock = 0;
    this.graceTime = 0;
    this.worldTime = 0;
    this.timers = [];
    this.gameOverPending = false;
    this.gameOverTime = 0;
    this.lastRunVoice = -999;
    this.stats = { caught: 0, perfects: 0, bombs: 0, abilities: 0, missed: 0 };
    this.hints = { movedDistance: 0, movement: true, bars: 0 };
    this.history = [];
    this.historyTimer = 0;
    this.banner = null;
    Stands.reset();
    CutIn.current = null;
    FX.clear();
    HUD.reset();
    HelpScreen.close();
    this.catcher.reset(this.fieldW);
    this.waves.reset();
    // De catcher begint in het midden en beweegt pas als jij iets doet.
    Input.pointerActive = false;
    Input.pointerX = this.fieldW / 2;
  },

  // R: Made in Heaven! Pucci reset het universum en je begint opnieuw.
  heavenRestart() {
    if (this.state === 'playing' || this.state === 'paused') {
      Save.recordRun(this.score, waveLevel(this.universe, this.waves.wave) + 1, this.maxCombo);
    }
    Stands.reset();
    CutIn.current = null;
    HelpScreen.close();
    this.gameOverPending = false;
    this.state = 'reset';
    HeavenReset.start({
      universe: 1,
      history: this.history,
      subtitle: 'Een nieuw universum · een nieuw begin',
      onCommit: () => this.resetRun(),
      onDone: () => {
        this.state = 'playing';
        this.startWave(1);
      },
    });
  },

  // Neemt elke 1/30 seconde een "foto" van het speelveld op (voor het terugspoelen
  // in de Made in Heaven-scène). We bewaren de laatste 9 seconden.
  recordHistory(dt) {
    this.historyTimer -= dt;
    if (this.historyTimer > 0) return;
    this.historyTimer = 1 / 30;
    const objects = [];
    for (const object of this.objects) {
      if (object.state === 'dead') continue;
      objects.push([SNAPSHOT_TYPES.indexOf(object.type), object.x, object.y, object.rot]);
    }
    const boss = this.boss && this.boss.state !== 'dead' ? [this.boss.x, this.boss.y, this.boss.pose] : null;
    this.history.push({ cx: this.catcher.x, tilt: this.catcher.tilt, width: this.catcher.width, objects, boss, score: this.score });
    if (this.history.length > 270) this.history.shift();
  },

  startWave(wave) {
    this.waves.begin(this.universe, wave);
    this.crimsonShields = this.perks.crimson;
    this.handTimer = this.handInterval();
    this.voicedThisWave = {};
    const boss = this.waves.isBoss;
    const firstUniverse = this.universe === 1;
    this.banner = {
      title: boss ? 'EINDBAAS!' : `GOLF ${wave}`,
      subtitle: firstUniverse || boss ? WAVE_HINTS[wave] : `Universum ${this.universe} · alles is sneller`,
      color: boss ? '#ffffff' : COLORS.gold,
      t: 0,
      duration: WAVES.introTime + 0.7,
    };
    Sound.play(boss ? 'collapse' : 'bell', { volume: boss ? 0.8 : 0.45, rate: boss ? 1 : 1.25 });
    if (wave === 3 && firstUniverse) this.delay(0.4, () => Sound.playVoice('vKira', { duration: 3.6 }));
  },

  toTitle() {
    this.state = 'title';
    this.objects = [];
    this.boss = null;
    Stands.reset();
    CutIn.current = null;
    HeavenReset.active = false;
    FX.clear();
    Sound.stopVoice();
    TitleScreen.open();
  },

  pause() {
    if (this.state !== 'playing' || this.gameOverPending) return;
    this.state = 'paused';
    PauseMenu.open();
    Sound.play('catch', { volume: 0.4, rate: 0.7 });
  },

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    HelpScreen.close();
  },

  // Voert een functie uit na een paar seconden (echte tijd).
  delay(seconds, callback) {
    this.timers.push({ t: seconds, callback });
  },

  // ---------- handige getallen ----------
  get energyMax() {
    return ENERGY.perBar * ENERGY.bars;
  },

  energyBars() {
    return Math.floor(this.energy / ENERGY.perBar);
  },

  currentMultiplier() {
    return comboTier(this.combo).mult * Stands.scoreBonus() * (1 + 0.3 * this.perks.heaven);
  },

  handInterval() {
    return this.perks.hand > 0 ? [9, 7, 5][this.perks.hand - 1] : 0;
  },

  timeScale() {
    if (this.state !== 'playing') return 0;
    if (CutIn.active) return 0;
    let scale = Stands.timeScale();
    if (this.boss && this.boss.alive) scale *= this.boss.timeFactor();
    if (this.gameOverPending) scale *= Math.max(0, 1 - this.gameOverTime / 0.9);
    return scale;
  },

  hasFallingObjects() {
    return this.objects.some(object => object.state !== 'dead' && (object.isGood || object.state === 'home'));
  },

  spawn(object) {
    this.objects.push(object);
  },

  // Tekst midden in beeld (bijv. "GOUDREGEN!"). Meerdere tegelijk komen onder elkaar.
  announce(text, color = COLORS.gold) {
    const slot = this.announceCount % 3;
    this.announceCount++;
    this.announceTimer = 1.2;
    FX.text(this.fieldW / 2, 268 + slot * 40, text, { size: 30, color, life: 1.3, rise: 24 });
  },

  // ---------- elk frame ----------
  update(dt) {
    this.time += dt;
    HelpScreen.update(dt);
    this.announceTimer -= dt;
    if (this.announceTimer <= 0) this.announceCount = 0;

    if (this.state === 'title') {
      TitleScreen.update(dt);
      FX.update(dt, dt);
      Background.update(dt, 1);
      Sound.update(dt, 1, 1);
      return;
    }
    if (this.state === 'paused') {
      PauseMenu.update(dt);
      Sound.update(dt, 1, 0.45);
      return;
    }
    if (this.state === 'cards') {
      CardScreen.update(dt);
      FX.update(dt, 0);
      HUD.update(dt, this);
      Background.update(dt, 0.15);
      Sound.update(dt, 1, 0.7);
      return;
    }
    if (this.state === 'reset') {
      HeavenReset.update(dt);
      FX.update(dt, dt);
      HUD.update(dt, this);
      Background.update(dt, HeavenReset.timeScale, HeavenReset.warp);
      // de muziek gaat bijna uit: de stem van Pucci is de ster van deze scène
      Sound.update(dt, 1, HeavenReset.active && !HeavenReset.committed ? 0.1 : 0.8);
      return;
    }
    if (this.state === 'gameover') {
      GameOverScreen.update(dt);
      FX.update(dt, 0);
      Background.update(dt, 0);
      Sound.update(dt, 0.85, 0.4);
      return;
    }
    this.updatePlaying(dt);
  },

  updatePlaying(dt) {
    // uitgestelde acties
    for (let i = this.timers.length - 1; i >= 0; i--) {
      this.timers[i].t -= dt;
      if (this.timers[i].t <= 0) {
        const timer = this.timers.splice(i, 1)[0];
        timer.callback();
        if (this.state !== 'playing') return;
      }
    }
    // hit-stop: heel even alles stil voor een harde klap
    if (FX.hitStopTime > 0) {
      FX.hitStopTime -= dt;
      FX.update(dt, 0);
      return;
    }
    CutIn.update(dt);
    Stands.update(dt, this);
    if (this.state !== 'playing') return;

    const timeScale = this.timeScale();
    const worldDt = dt * timeScale;
    this.worldTime += worldDt;

    const oldX = this.catcher.x;
    this.catcher.update(dt, this.fieldW, this.perks, !Stands.catcherFrozen() && !this.gameOverPending);
    this.hints.movedDistance += Math.abs(this.catcher.x - oldX);

    if (!this.gameOverPending) this.waves.update(worldDt, this);
    if (this.state !== 'playing') return;
    if (this.boss) {
      this.boss.update(worldDt, dt, this);
      if (this.state !== 'playing') return;
    }
    this.updateObjects(worldDt, dt);
    this.updateNails(dt);
    this.updatePerks(worldDt);
    this.recordHistory(dt);

    this.discLock = Math.max(0, this.discLock - dt);
    this.graceTime = Math.max(0, this.graceTime - dt);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.duration) this.banner = null;
    }
    if (comboTier(this.combo).mult >= 3) FX.menacing(this.fieldW, dt * (comboTier(this.combo).mult - 2) * 2.2);

    FX.update(dt, worldDt);
    HUD.update(dt, this);
    const bossRate = this.boss && this.boss.alive ? clamp(this.boss.timeFactor(), 1, 1.25) : 1;
    Sound.update(dt, Stands.musicRate() * bossRate * (this.gameOverPending ? 0.8 : 1), Stands.musicLevel() * (this.gameOverPending ? 0.4 : 1));
    const bossWarp = this.boss && this.boss.accelTime > 0 ? 0.45 : 0;
    Background.update(dt, timeScale, bossWarp, this.lives === 1 && !this.gameOverPending ? 1 : 0);

    if (this.gameOverPending) {
      this.gameOverTime += dt;
      if (this.gameOverTime >= 1.25) this.finishGameOver();
    }
  },

  updateObjects(worldDt, realDt) {
    const catcher = this.catcher;
    const rim = catcher.rimY + 4;
    const magnet = this.perks.cmoon > 0 ? [110, 160, 210][this.perks.cmoon - 1] : 0;
    for (const object of this.objects) {
      if (object.state === 'dead') continue;
      object.update(worldDt, realDt, catcher, this.fieldW, magnet);
      if (object.state === 'home') {
        if (object.home.arrived) {
          object.state = 'dead';
          this.collect(object, { perfect: false, homed: true });
        }
        continue;
      }
      // vonken uit de lont van een bom
      if (object.type === 'bomb' && worldDt > 0) {
        object.fuseTimer -= worldDt;
        if (object.fuseTimer <= 0) {
          object.fuseTimer = 0.06;
          FX.burst(object.x + 8, object.y - 26, { count: 1, colors: ['#ffd25e', '#ff8a3d'], speed: [30, 90], angle: -Math.PI / 2, spread: 1.6, size: [1, 2], life: [0.2, 0.4], gravity: 200 });
        }
      }
      // gevangen? De orb moet in dit frame over de rand van de catcher gaan.
      if (!object.passed && object.prevY < rim && object.y >= rim) {
        const reach = catcher.halfWidth + object.r * 0.35;
        if (Math.abs(object.x - catcher.x) <= reach && !this.gameOverPending) {
          object.state = 'dead';
          this.collect(object, { perfect: catcher.isPerfect(object.x, this.perks), homed: false });
          continue;
        }
        object.passed = true;
      }
      // gemist: op de vloer kapot gevallen
      if (object.y - object.r > FLOOR_Y) {
        object.state = 'dead';
        this.missed(object);
      }
    }
    this.objects = this.objects.filter(object => object.state !== 'dead');
  },

  // ---------- vangen ----------
  collect(object, { perfect, homed }) {
    const catcher = this.catcher;
    const x = object.x, y = catcher.rimY;
    switch (object.type) {
      case 'orb':
      case 'gold': {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const gold = object.type === 'gold';
        const base = gold ? POINTS.gold : POINTS.orb + (perfect ? POINTS.perfect : 0);
        const gained = this.addScore(base);
        this.gainEnergy(gold ? ENERGY.gold : perfect ? ENERGY.perfect : ENERGY.orb);
        this.stats.caught++;
        if (perfect) this.stats.perfects++;
        catcher.bump(perfect || gold ? 1.2 : 0.8, gold ? '255,206,90' : '255,95,168');
        const pitch = 1 + Math.min(this.combo, 40) * 0.012;
        Sound.play('catch', { volume: homed ? 0.45 : 0.7, rate: pitch, minGap: homed ? 0.02 : 0.03 });
        if (gold) Sound.play('coins', { volume: 0.6, rate: 1.1 });
        const colors = gold ? ['#fff3b0', '#ffd25e', '#ffffff'] : ['#ffc2e0', '#ff5fa8', '#ffffff'];
        FX.burst(x, y, { count: perfect || gold ? 16 : 9, colors, speed: [90, 300], angle: -Math.PI / 2, spread: 2.2, size: [1.5, 3.5], life: [0.25, 0.55], gravity: 500, shape: 'spark' });
        FX.text(x, y - 26, '+' + gained, { size: gold ? 26 : 20, color: gold ? COLORS.gold : '#ffd6ec', life: 0.7, rise: 46 });
        if (perfect) {
          Sound.play('perfect', { volume: 0.35, rate: 1.2 + Math.min(this.combo, 30) * 0.01 });
          FX.text(x, y - 56, 'PERFECT', { size: 18, color: COLORS.cyan, life: 0.7, rise: 40 });
          FX.ring(x, y, { color: '94,231,255', from: 10, to: 70, life: 0.35, width: 3 });
        }
        if (this.boss && this.boss.alive) {
          const damage = gold ? BOSS.damage.gold : perfect ? BOSS.damage.perfect : BOSS.damage.orb;
          this.boss.addShot(x, y - 10, damage);
        }
        if (this.perks.tusk > 0 && (perfect || (this.perks.tusk >= 2 && this.combo % 3 === 0))) this.fireNail(x, y - 20);
        if (this.perks.dio > 0 && this.combo % [40, 25][this.perks.dio - 1] === 0 && this.lives < this.maxLives) {
          this.lives++;
          FX.text(x, y - 90, 'WRYYY! +1 LEVEN', { size: 22, color: '#ffe27a', life: 1 });
          Sound.play('power', { volume: 0.6 });
        }
        HUD.comboPulse = 1;
        this.checkComboMilestone();
        break;
      }
      case 'bomb':
        this.bombHit(object);
        break;
      case 'disc':
        this.discHit(object);
        break;
      case 'life':
        if (this.lives < this.maxLives) {
          this.lives++;
          FX.text(x, y - 40, '+1 LEVEN', { size: 26, color: COLORS.green, life: 1 });
        } else {
          FX.text(x, y - 40, '+' + this.addScore(POINTS.fullLife), { size: 26, color: COLORS.green, life: 1 });
        }
        Sound.play('power', { volume: 0.8 });
        FX.burst(x, y, { count: 22, colors: ['#9dffbe', '#59e38c', '#ffd25e'], speed: [80, 260], size: [2, 4], life: [0.4, 0.8], shape: 'star', angle: -Math.PI / 2, spread: 2.6 });
        catcher.bump(1, '89,227,140');
        break;
      case 'arrow':
        this.gainEnergy(ENERGY.arrow);
        FX.text(x, y - 40, 'STAND ARROW!', { size: 26, color: COLORS.gold, life: 1 });
        Sound.play('power', { volume: 0.8 });
        Sound.play('bell', { volume: 0.5, rate: 1.4 });
        FX.burst(x, y, { count: 24, colors: ['#fff3b0', '#ffd25e', '#c79bff'], speed: [80, 300], size: [2, 4], life: [0.4, 0.9], shape: 'star', angle: -Math.PI / 2, spread: 2.6 });
        catcher.bump(1, '255,206,90');
        break;
      case 'wide':
        catcher.wideTime = CATCHER.wideTime;
        FX.text(x, y - 40, 'BREED!', { size: 26, color: COLORS.cyan, life: 1 });
        Sound.play('power', { volume: 0.8, rate: 1.1 });
        FX.burst(x, y, { count: 18, colors: ['#c6fbff', '#5ee7ff'], speed: [80, 260], size: [2, 4], life: [0.3, 0.7], shape: 'spark', angle: -Math.PI / 2, spread: 2.6 });
        catcher.bump(1, '94,231,255');
        break;
    }
  },

  addScore(base) {
    const gained = Math.round(base * this.currentMultiplier());
    this.score += gained;
    HUD.scorePulse = 1;
    return gained;
  },

  gainEnergy(amount) {
    const before = this.energyBars();
    this.energy = Math.min(this.energyMax, this.energy + amount * (1 + 0.3 * this.perks.jotaro));
    const after = this.energyBars();
    if (after > before) {
      Sound.play('bell', { volume: 0.45, rate: 1 + after * 0.15 });
      // uitleg de eerste keer dat een aanval klaar is
      if (after > this.hints.bars) {
        this.hints.bars = after;
        const messages = ['', 'STAND KLAAR! Druk 1: ORA ORA', 'Druk 2: ZA WARUDO!', 'Druk 3: ROAD ROLLER DA!'];
        if (Save.data.runs < 3 || after === 3) this.announce(messages[after], after === 3 ? COLORS.gold : COLORS.violet);
      }
    }
  },

  checkComboMilestone() {
    const tier = COMBO_TIERS.find(item => item.at === this.combo && item.at > 0);
    const hundred = this.combo > 100 && this.combo % 100 === 0;
    if (!tier && !hundred) return;
    const label = tier ? tier.label : `${this.combo} COMBO!!`;
    this.announce(label, tier && tier.mult >= 4 ? '#ff9de0' : COLORS.gold);
    Sound.play('perfect', { volume: 0.6, rate: 1.5 });
    FX.burst(this.catcher.x, this.catcher.rimY, { count: 30, colors: ['#ffd25e', '#ff5fa8', '#c79bff', '#ffffff'], speed: [150, 450], size: [2, 4], life: [0.4, 0.9], shape: 'star', real: true });
    if (this.combo === 50 && !Sound.isVoicePlaying()) Sound.playVoice('vYes', { duration: 3.6, fadeOut: 0.5 });
  },

  // ---------- missen en schade ----------
  missed(object) {
    if (object.mustCatch) {
      this.stats.missed++;
      FX.burst(object.x, FLOOR_Y, { count: 14, colors: ['#ff5fa8', '#ff4057', '#ffffff'], speed: [60, 240], angle: -Math.PI / 2, spread: 1.6, size: [2, 4], life: [0.3, 0.6], gravity: 600, shape: 'shard', glow: false });
      if (this.graceTime > 0) return; // net een leven verloren: deze telt niet
      if (this.useCrimsonShield(object.x, object.y)) return;
      this.loseLife(object.x, 'MIS!');
    } else if (object.type === 'gold') {
      FX.burst(object.x, FLOOR_Y, { count: 6, colors: ['#ffd25e'], speed: [40, 120], angle: -Math.PI / 2, spread: 1.4, life: [0.2, 0.4] });
    } else if (object.type === 'bomb') {
      // een bom die je ontwijkt, valt onschadelijk uit elkaar
      FX.burst(object.x, FLOOR_Y, { count: 10, colors: ['#8a6aa3', '#ff7aa8', '#3f2756'], speed: [40, 160], angle: -Math.PI / 2, spread: 1.6, life: [0.3, 0.6], gravity: 400, shape: 'shard', glow: false });
      Sound.play('glass', { volume: 0.2, rate: 0.7 });
    }
  },

  bombHit(bomb) {
    const x = bomb.x, y = this.catcher.rimY;
    FX.burst(x, y, { count: 34, colors: ['#ffffff', '#ffd25e', '#ff8a3d', '#ff4057'], speed: [150, 520], size: [2, 6], life: [0.3, 0.8], gravity: 300 });
    FX.ring(x, y, { color: '255,120,80', from: 10, to: 140, life: 0.45, width: 7 });
    Sound.play('impact', { volume: 1 });
    Sound.play('heavy', { volume: 0.8 });
    FX.shake(0.6);
    FX.hitStop(0.07);
    if (this.useCrimsonShield(x, y)) return;
    this.loseLife(x, 'BOEM!');
  },

  discHit(disc) {
    this.discLock = BOSS.discLockTime;
    this.energy = Math.max(0, this.energy - ENERGY.discLoss);
    FX.text(disc.x, this.catcher.rimY - 50, 'DISC GESTOLEN!', { size: 26, color: '#d9ccff', life: 1.2 });
    FX.burst(disc.x, this.catcher.rimY, { count: 20, colors: ['#ffffff', '#c7b8ff', '#5ee7ff'], speed: [100, 300], life: [0.3, 0.7] });
    Sound.play('glass', { volume: 0.9 });
    Sound.play('latch', { volume: 0.7 });
    FX.shake(0.3);
    this.combo = 0;
  },

  // King Crimson wist de fout uit de tijd.
  useCrimsonShield(x, y) {
    if (this.crimsonShields <= 0) return false;
    this.crimsonShields--;
    FX.text(x, Math.min(y, this.catcher.rimY) - 50, 'KING CRIMSON!', { size: 28, color: '#ff6b81', life: 1.1 });
    FX.flash('200,20,50', 0.25, 4);
    FX.burst(x, Math.min(y, FLOOR_Y), { count: 26, colors: ['#ff3d5a', '#ffffff', '#7a0d1f'], speed: [100, 340], size: [3, 6], life: [0.3, 0.7], shape: 'shard', glow: false });
    Sound.play('teleport', { volume: 0.9 });
    if (!this.voicedThisWave.crimson) {
      this.voicedThisWave.crimson = true;
      Sound.playVoice('vCrimson', { duration: 2.2, fadeOut: 0.4 });
    }
    return true;
  },

  loseLife(x, label) {
    this.lives--;
    this.graceTime = LIVES.graceTime;
    if (this.combo >= 10) this.announce('COMBO KAPOT', '#ff9db0');
    this.combo = 0;
    this.catcher.hurt();
    HUD.lifePulse = 1;
    FX.shake(0.55);
    FX.flash('255,40,70', 0.3, 3);
    FX.text(x, this.catcher.rimY - 60, label, { size: 30, color: COLORS.red, life: 0.9 });
    Sound.play('miss', { volume: 0.9 });
    if (this.lives <= 0) {
      this.startGameOver();
    } else if (this.lives === 1 && this.time - this.lastRunVoice > 30) {
      this.lastRunVoice = this.time;
      this.announce('LAATSTE LEVEN!', COLORS.red);
      Sound.playVoice('vRun', { duration: 4.4 });
    }
  },

  // ---------- Stand-kaarten ----------
  updatePerks(worldDt) {
    // The Hand: wist af en toe de dichtstbijzijnde bom
    if (this.perks.hand > 0 && worldDt > 0) {
      this.handTimer -= worldDt;
      if (this.handTimer <= 0) {
        let nearest = null, best = Infinity;
        for (const object of this.objects) {
          if (object.type !== 'bomb' || object.state !== 'fall' || object.y < 20) continue;
          const d = distance(object.x, object.y, this.catcher.x, this.catcher.rimY);
          if (d < best) { best = d; nearest = object; }
        }
        if (nearest) {
          this.handTimer = this.handInterval();
          nearest.state = 'dead';
          this.addScore(POINTS.bomb);
          this.stats.bombs++;
          FX.text(nearest.x, nearest.y - 30, 'ZA HANDO!', { size: 24, color: '#9fb4ff', life: 0.9 });
          FX.burst(nearest.x, nearest.y, { count: 18, colors: ['#ffffff', '#9fb4ff'], speed: [60, 220], life: [0.2, 0.5], shape: 'spark' });
          FX.ring(nearest.x, nearest.y, { color: '160,180,255', from: 4, to: 60, life: 0.3, width: 3 });
          if (!this.voicedThisWave.hand) {
            this.voicedThisWave.hand = true;
            Sound.playVoice('vHand');
          } else {
            Sound.play('slice', { volume: 0.7 });
          }
        } else {
          this.handTimer = 1;
        }
      }
    }
  },

  // Tusk: een nagel naar de dichtstbijzijnde bom (of de baas).
  fireNail(x, y) {
    let target = null, best = Infinity;
    for (const object of this.objects) {
      if (object.type !== 'bomb' || object.state !== 'fall' || object.y < 0 || object.y > y) continue;
      const d = distance(object.x, object.y, x, y);
      if (d < best) { best = d; target = object; }
    }
    if (!target && this.boss && this.boss.alive) target = 'boss';
    if (!target) return;
    this.nails.push({ x, y, target, speed: 1100 });
    if (!this.voicedThisWave.tusk) {
      this.voicedThisWave.tusk = true;
      Sound.playVoice('vTusk');
    } else {
      Sound.play('slice', { volume: 0.5, rate: 1.3 });
    }
  },

  updateNails(dt) {
    for (let i = this.nails.length - 1; i >= 0; i--) {
      const nail = this.nails[i];
      const target = nail.target === 'boss' ? (this.boss && this.boss.alive ? { x: this.boss.x, y: this.boss.y + 100 } : null) : nail.target;
      if (!target || (nail.target !== 'boss' && nail.target.state !== 'fall')) { this.nails.splice(i, 1); continue; }
      const dx = target.x - nail.x, dy = target.y - nail.y;
      const d = Math.hypot(dx, dy);
      nail.angle = Math.atan2(dy, dx);
      if (d < nail.speed * dt + 10) {
        this.nails.splice(i, 1);
        if (nail.target === 'boss') this.boss.damage(BOSS.damage.nail, this);
        else this.destroyBomb(nail.target, 'TUSK!');
        continue;
      }
      nail.x += (dx / d) * nail.speed * dt;
      nail.y += (dy / d) * nail.speed * dt;
    }
  },

  // Een bom die door een Stand wordt vernietigd (geeft punten, geen schade).
  destroyBomb(bomb, label) {
    if (bomb.state === 'dead') return;
    bomb.state = 'dead';
    this.stats.bombs++;
    const gained = this.addScore(POINTS.bomb);
    FX.burst(bomb.x, bomb.y, { count: 20, colors: ['#ffffff', '#ffd25e', '#ff7aa8', '#c79bff'], speed: [100, 380], size: [2, 5], life: [0.25, 0.6], real: true });
    FX.ring(bomb.x, bomb.y, { color: '255,200,150', from: 6, to: 70, life: 0.35, width: 4, real: true });
    FX.text(bomb.x, bomb.y - 26, label + ' +' + gained, { size: 18, color: '#ffe2b0', life: 0.7, rise: 30 });
    Sound.play('impact', { volume: 0.45, rate: randRange(1, 1.25), minGap: 0.02 });
  },

  denyAbility(kind) {
    HUD.deny(kind);
    Sound.play('glass', { volume: 0.35, rate: 0.6 });
    if (this.discLock > 0) FX.text(this.catcher.x, this.catcher.rimY - 60, 'STAND GEBLOKKEERD!', { size: 20, color: '#d9ccff', life: 0.8 });
    else FX.text(this.catcher.x, this.catcher.rimY - 60, 'TE WEINIG ENERGIE', { size: 18, color: '#ff9db0', life: 0.7 });
  },

  // ---------- golven ----------
  onWaveCleared() {
    const wave = this.waves.wave;
    const bonus = POINTS.waveClear * wave * this.universe;
    this.score += bonus;
    HUD.scorePulse = 1;
    this.announce(`GOLF ${wave} VOLTOOID!  +${formatScore(bonus)}`, COLORS.gold);
    Sound.play('rebirth', { volume: 0.7 });
    Sound.play('bell', { volume: 0.5, rate: 1.5 });
    this.delay(1.3, () => this.openCards(`GOLF ${wave} VOLTOOID!`, 'Kies een Stand-kaart voor de rest van je potje', () => this.startWave(wave + 1)));
  },

  openCards(title, subtitle, after) {
    const cards = offerCards(this.perks);
    if (cards.length === 0) {
      after();
      return;
    }
    this.state = 'cards';
    CardScreen.open(cards, title, subtitle, card => {
      this.applyCard(card);
      this.state = 'playing';
      after();
    });
  },

  applyCard(card) {
    this.perks[card.id]++;
    if (card.id === 'experience') {
      this.maxLives++;
      this.lives = Math.min(this.maxLives, this.lives + 1);
    }
    if (card.id === 'crimson') this.crimsonShields = this.perks.crimson;
    if (card.id === 'hand') this.handTimer = this.handInterval();
  },

  // ---------- eindbaas ----------
  spawnBoss() {
    this.boss = new Boss(this.universe, this.fieldW);
    CutIn.start({
      art: 'heaven', pose: 0, title: 'MADE IN HEAVEN', subtitle: 'ENRICO PUCCI',
      color1: '#9b86f0', color2: '#1d1145', textColor: '#ffffff', duration: 1.3,
    });
    Sound.playVoice('vHeaven', { duration: 6.5, fadeOut: 1 });
    FX.flash('255,255,255', 0.4, 3);
  },

  onBossDying() {
    // Je hebt gewonnen: bommen en discs verdwijnen en missen kost niets meer.
    for (const object of this.objects) {
      if (object.type === 'bomb' || object.type === 'disc') object.state = 'dead';
      else object.bonus = true;
    }
    this.waves.phase = 'done';
  },

  onBossDefeated() {
    const bonus = POINTS.bossDefeat * this.universe;
    this.score += bonus;
    this.state = 'reset';
    // wat er nog op het scherm hangt, lost op in sterrenstof
    for (const object of this.objects) {
      FX.burst(object.x, object.y, { count: 8, colors: ['#ffffff', '#ffe9a8'], speed: [40, 160], life: [0.3, 0.7], real: true });
    }
    this.objects = [];
    FX.texts.length = 0;
    Sound.stopVoice();
    // Pucci's laatste daad: Made in Heaven reset het universum.
    HeavenReset.start({
      universe: this.universe + 1,
      history: this.history,
      subtitle: 'Pucci verslagen!  ·  +1 leven  ·  alles valt sneller  ·  je kaarten blijven',
      onCommit: () => {
        // het nieuwe universum begint
        this.universe++;
        this.lives = Math.min(this.maxLives, this.lives + 1);
        this.objects = [];
        this.nails = [];
        this.boss = null;
        this.history = [];
        Stands.reset();
        CutIn.current = null;
        this.catcher.reset(this.fieldW);
      },
      onDone: () => {
        this.state = 'playing';
        this.openCards(`UNIVERSUM ${this.universe}`, `Pucci verslagen! +${formatScore(bonus)} · kies een beloning`, () => this.startWave(1));
      },
    });
  },

  // ---------- game over ----------
  startGameOver() {
    this.gameOverPending = true;
    this.gameOverTime = 0;
    Stands.active = null;
    Stands.fists = [];
    CutIn.current = null;
    Sound.stopVoice(0.2);
    Sound.play('pipe', { volume: 1 });
    Sound.play('defeat', { volume: 0.8 });
    FX.hitStop(0.18);
  },

  finishGameOver() {
    this.gameOverPending = false;
    this.state = 'gameover';
    const waveIndex = waveLevel(this.universe, this.waves.wave) + 1;
    const record = Save.recordRun(this.score, waveIndex, this.maxCombo);
    GameOverScreen.open({
      score: this.score,
      record,
      universe: this.universe,
      wave: this.waves.wave,
      caught: this.stats.caught,
      maxCombo: this.maxCombo,
      perfects: this.stats.perfects,
    });
    if (record) Sound.play('perfect', { volume: 0.8, rate: 0.9 });
  },

  toggleMute() {
    Save.setSetting('muted', !Save.settings.muted);
    Sound.applyVolumes();
    FX.text(this.fieldW / 2, 200, Save.settings.muted ? 'GELUID UIT' : 'GELUID AAN', { size: 22, color: '#ffffff', life: 0.8 });
  },

  // ---------- invoer ----------
  onKey(key, code) {
    if (Settings.visible) {
      if (code === ESCAPE) Settings.close();
      return;
    }
    if (HelpScreen.visible) {
      if (code === ESCAPE || code === ENTER || key === ' ' || key === 'h' || key === 'H') HelpScreen.close();
      return;
    }
    if (key === 'm' || key === 'M') { this.toggleMute(); return; }
    const lower = String(key).toLowerCase();

    switch (this.state) {
      case 'title':
        if (lower === 'o') Settings.open();
        else TitleScreen.onKey(key, code);
        break;
      case 'playing':
        if (code === ESCAPE || lower === 'p') { this.pause(); return; }
        for (const kind of ABILITY_ORDER) {
          if (ABILITIES[kind].keys.includes(lower)) { Stands.activate(kind, this); return; }
        }
        if (DEBUG) this.debugKey(lower);
        break;
      case 'paused':
        if (code === ESCAPE || lower === 'p') this.resume();
        else if (lower === 'o') Settings.open();
        else PauseMenu.onKey(key, code);
        break;
      case 'cards':
        CardScreen.onKey(key, code);
        break;
      case 'reset':
        if (code === ENTER || key === ' ' || code === ESCAPE) HeavenReset.skip();
        break;
      case 'gameover':
        GameOverScreen.onKey(key, code);
        break;
    }
  },

  // x, y in speelveld-coördinaten. Geeft true terug als de klik "gebruikt" is
  // (dan mag hij de catcher niet verplaatsen).
  onPointer(x, y, clicked, isTouch) {
    if (Settings.visible) return true;
    if (HelpScreen.visible) {
      if (clicked) HelpScreen.close();
      return true;
    }
    switch (this.state) {
      case 'title': TitleScreen.onPointer(x, y, clicked); return clicked;
      case 'paused': PauseMenu.onPointer(x, y, clicked); return clicked;
      case 'cards': CardScreen.onPointer(x, y, clicked); return clicked;
      case 'gameover': GameOverScreen.onPointer(x, y, clicked); return clicked;
      case 'reset': if (clicked) HeavenReset.skip(); return clicked;
      case 'playing':
        if (clicked && isTouch) {
          const kind = HUD.touchAbilityAt(x, y);
          if (kind) { Stands.activate(kind, this); return true; }
          if (distance(x, y, HUD.pauseButton.x, HUD.pauseButton.y) < HUD.pauseButton.r + 10) { this.pause(); return true; }
        }
        break;
    }
    return false;
  },

  // Testtoetsen (alleen met ?debug=1 in de adresbalk)
  debugKey(key) {
    if (key === 'g') this.energy = this.energyMax;
    if (key === 'n') { this.objects = []; this.waves.phase = 'done'; this.onWaveCleared(); }
    if (key === 'b') { this.objects = []; this.boss = null; this.startWave(WAVES.perUniverse); }
    if (key === 'l') this.lives = Math.min(this.maxLives, this.lives + 1);
    if (key === 'x') this.loseLife(this.catcher.x, 'TEST');
    if (key === 'u' && this.boss) this.boss.damage(9999, this);
  },

  // ---------- tekenen ----------
  render() {
    const W = width, H = height;
    const ctx = drawingContext;
    const time = this.time;

    ctx.save();
    ctx.translate(FX.shakeX * 0.25 * View.scale, FX.shakeY * 0.25 * View.scale);
    Background.draw(W, H);
    ctx.restore();

    if (this.state === 'title') {
      View.begin();
      FX.drawParticles();
      TitleScreen.draw(View.w);
      HelpScreen.draw(View.w);
      View.end();
      FX.drawFlash(ctx.canvas.width, ctx.canvas.height);
      return;
    }

    // De Made in Heaven-scène neemt het hele scherm over.
    if (this.state === 'reset') {
      HeavenReset.draw(W, H);
      FX.drawFlash(ctx.canvas.width, ctx.canvas.height);
      return;
    }

    // 1. de wereld (wordt grijs tijdens Time Stop)
    View.begin(FX.shakeX, FX.shakeY);
    this.drawFieldEdges();
    Background.drawFloor(this.fieldW);
    if (this.boss) this.boss.draw(time);
    for (const object of this.objects) if (object.state === 'fall') object.draw(time);
    FX.drawParticles();
    View.end();

    const desaturation = Stands.desaturation();
    if (desaturation > 0) this.drawDesaturation(desaturation);

    // 2. jij en je Stand blijven in kleur ("alleen jij kan bewegen in de stilstaande tijd")
    View.begin(FX.shakeX, FX.shakeY);
    Stands.drawBehind(this, time);
    this.catcher.draw(this.energyBars(), time);
    for (const object of this.objects) if (object.state === 'home') object.draw(time);
    if (this.boss) this.boss.drawShots();
    for (const nail of this.nails) drawSprite(Sprites.nail, nail.x, nail.y, 16, (nail.angle || 0) + Math.PI / 2);
    Stands.drawFront(this, time);
    FX.drawTexts();
    if (this.hints && this.hints.movement && this.state === 'playing') this.drawMovementHint(time);
    View.end();

    const inversion = Stands.inversion();
    if (inversion > 0) this.drawInversion(inversion);
    if (this.gameOverPending || this.state === 'gameover') {
      GameOverScreen.drawSepia(this.gameOverPending ? Math.min(1, this.gameOverTime / 0.9) : 1);
    }
    FX.drawFlash(ctx.canvas.width, ctx.canvas.height);

    // 3. HUD en menu's
    View.begin();
    if (Stands.overdrive > 0) this.drawOverdriveGlow(time);
    if (this.state !== 'gameover' && !this.gameOverPending) HUD.draw(this, time);
    this.drawBanner();
    if (Input.touchMode && this.state === 'playing') this.drawPauseButton();
    if (this.state === 'cards') CardScreen.draw(this.fieldW, this.perks);
    if (this.state === 'paused') PauseMenu.draw(this.fieldW);
    if (this.state === 'gameover') GameOverScreen.draw(this.fieldW);
    HelpScreen.draw(this.fieldW);
    View.end();

    CutIn.draw(W, H);
  },

  // Op een heel breed scherm: lichte randjes waar het speelveld stopt.
  drawFieldEdges() {
    if (View.offX < 4) return;
    const ctx = drawingContext;
    for (const x of [0, this.fieldW]) {
      const gradient = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
      gradient.addColorStop(0, 'rgba(160, 110, 255, 0)');
      gradient.addColorStop(0.5, 'rgba(160, 110, 255, 0.12)');
      gradient.addColorStop(1, 'rgba(160, 110, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 30, 0, 60, FIELD.height);
    }
  },

  // Maakt alles grijs (Time Stop). 'saturation' neemt de kleur weg, maar houdt licht en donker.
  drawDesaturation(amount) {
    const ctx = drawingContext;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = amount;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = amount * 0.14;
    ctx.fillStyle = '#3b4fb0';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  },

  // De beroemde bol van ZA WARUDO die alle kleuren omkeert.
  drawInversion(amount) {
    const ctx = drawingContext;
    const cx = View.toScreenX(this.catcher.x), cy = View.toScreenY(this.catcher.rimY);
    const maxR = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) + 20;
    const radius = amount * maxR;
    ctx.save();
    if (Save.settings.flashes) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawOverdriveGlow(time) {
    const ctx = drawingContext;
    const alpha = Math.min(1, Stands.overdrive) * (0.18 + 0.08 * Math.sin(time * 6));
    const W = this.fieldW, H = FIELD.height;
    const edge = 70;
    const sides = [
      [0, 0, W, edge, 0, 0, 0, edge],
      [0, H - edge, W, edge, 0, H, 0, H - edge],
      [0, 0, edge, H, 0, 0, edge, 0],
      [W - edge, 0, edge, H, W, 0, W - edge, 0],
    ];
    for (const [x, y, w, h, x1, y1, x2, y2] of sides) {
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, `rgba(255, 206, 90, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 206, 90, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, h);
    }
  },

  drawBanner() {
    const banner = this.banner;
    if (!banner || this.state !== 'playing') return;
    const t = banner.t;
    const inT = easeOutCubic(t / 0.3);
    const out = progress(t, banner.duration - 0.35, banner.duration);
    const alpha = Math.min(inT, 1 - out);
    const W = this.fieldW;
    const y = 300;
    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha = alpha * 0.75;
    const band = ctx.createLinearGradient(0, 0, W, 0);
    band.addColorStop(0, 'rgba(10, 4, 24, 0)');
    band.addColorStop(0.5, 'rgba(10, 4, 24, 0.9)');
    band.addColorStop(1, 'rgba(10, 4, 24, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 58, W, 116);
    ctx.restore();
    drawJoJoTitle(banner.title, W / 2 + (1 - inT) * -200 + out * 200, y - 8, Math.min(72, W * 0.12), { alpha, color: banner.color });
    if (banner.subtitle) {
      drawText(banner.subtitle, W / 2, y + 40, {
        size: Math.min(18, W * 0.034), align: 'center', baseline: 'middle', color: '#f3eaff', stroke: COLORS.ink, strokeWidth: 4, alpha, maxWidth: W - 30,
      });
    }
  },

  // Uitleg aan het begin: hoe beweeg je?
  drawMovementHint(time) {
    if (this.hints.movedDistance > 220 || this.worldTime > 9) {
      this.hints.movement = false;
      return;
    }
    const x = clamp(this.catcher.x, 130, this.fieldW - 130), y = this.catcher.rimY + 74;
    const alpha = 0.6 + 0.4 * Math.sin(time * 5);
    const text = Input.touchMode ? '← sleep met je vinger →' : '←  →   of   A  D   (of de muis)';
    drawText(text, x, Math.min(y, FIELD.height - 8), { size: 13, align: 'center', baseline: 'middle', color: '#ffffff', stroke: COLORS.ink, strokeWidth: 3, alpha });
  },

  // Pauzeknop voor touchscreens (links naast het levens-paneel).
  drawPauseButton() {
    const rightW = Math.min(200, this.fieldW * 0.34);
    const x = this.fieldW - rightW - 12 - 26, y = 32;
    HUD.pauseButton = { x, y, r: 16 };
    const ctx = drawingContext;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, TAU);
    ctx.fillStyle = 'rgba(30, 14, 56, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 180, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 5, y - 6, 3, 12);
    ctx.fillRect(x + 2, y - 6, 3, 12);
  },
};
