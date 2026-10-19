// ============================================================
//  heaven.js — MADE IN HEAVEN: het universum wordt gereset.
//
//  Een filmscène van ongeveer 22 seconden in zes delen:
//   1. THE FINAL PRAYER  Pucci bidt en zegt de 14 woorden
//   2. MANIFESTATION     Made in Heaven onthult zich: flits, bliksem
//   3. REWIND            jouw échte gameplay spoelt terug (VHS-effect)
//   4. ACCELERATION      zon en maan razen voorbij, de tijd versnelt
//   5. SINGULARITY       het hele scherm wordt in één punt gezogen
//   6. REBIRTH           oerknal: een nieuw universum ontstaat
//
//  Je ziet hem na het verslaan van Pucci, of als je zelf op R drukt
//  (pauze of Game Over). SPATIE slaat de scène over.
//
//  Voor deel 3 neemt game.js tijdens het spelen steeds "foto's" van
//  het speelveld op (zie Game.recordHistory). Die spelen we hier
//  achterstevoren af.
// ============================================================

const HEAVEN_TIMING = {
  prayer: 4.2,     // Pucci bidt (de 14 woorden)
  manifest: 4.4,   // Made in Heaven verschijnt (samen 8,6 sec: zo lang duurt de stem)
  rewind: 4.0,     // terugspoelen
  accelerate: 3.6, // de tijd versnelt
  collapse: 1.8,   // singulariteit
  rebirth: 4.0,    // nieuw universum
};
const HEAVEN_PHASES = ['prayer', 'manifest', 'rewind', 'accelerate', 'collapse', 'rebirth'];

// De 14 woorden van Pucci (Japans + Engels, zoals in de manga).
const FOURTEEN_WORDS = [
  ['らせん階段', 'SPIRAL STAIRCASE'], ['カブト虫', 'RHINOCEROS BEETLE'], ['廃墟の街', 'DESOLATION ROW'],
  ['イチジクのタルト', 'FIG TART'], ['カブト虫', 'RHINOCEROS BEETLE'], ['ドロローサへの道', 'VIA DOLOROSA'],
  ['カブト虫', 'RHINOCEROS BEETLE'], ['特異点', 'SINGULARITY POINT'], ['ジョット', 'GIOTTO'],
  ['天使', 'ANGEL'], ['紫陽花', 'HYDRANGEA'], ['カブト虫', 'RHINOCEROS BEETLE'],
  ['特異点', 'SINGULARITY POINT'], ['秘密の皇帝', 'SECRET EMPEROR'],
];

// Teksten in de zwarte filmbalken (boven: hoofdstuk, onder: uitleg).
const HEAVEN_CAPTIONS = {
  prayer: ['ENRICO PUCCI  ·  THE FINAL PRAYER', 'Pucci spreekt de 14 woorden uit...'],
  manifest: ['MADE IN HEAVEN  ·  MANIFESTATION', 'De Stand ontwaakt'],
  rewind: ['REWIND  ·  REALITY RETRACES ITS STEPS', 'De werkelijkheid spoelt terug'],
  accelerate: ['TIME ACCELERATION  ·  時は加速する', 'De tijd versnelt tot voorbij het einde'],
  collapse: ['SINGULARITY', 'Alles valt samen in één punt'],
  rebirth: ['A NEW UNIVERSE', ''],
};

// Welke sprite hoort bij welk soort object (voor het terugspoelen).
const SNAPSHOT_TYPES = ['orb', 'gold', 'bomb', 'life', 'arrow', 'wide', 'disc'];
const SNAPSHOT_SIZES = { orb: 60, gold: 62, bomb: 64, life: 62, arrow: 64, wide: 60, disc: 58 };

const HeavenReset = {
  active: false,
  t: 0,
  committed: false,
  options: null,
  T: null,          // starttijd van elke fase
  history: [],
  sounds: [],       // geluiden die we bij overslaan moeten stoppen
  cues: {},         // welke momenten al geweest zijn
  bolts: [],        // bliksemschichten
  motes: [],        // zwevende lichtdeeltjes
  feathers: [],     // veren van Made in Heaven
  stars: [],        // sterren van de oerknal
  waves: [],        // schokgolven
  shake: 0,
  chroma: 0,        // hoe ver de kleuren uit elkaar trekken (VHS-effect)
  frozen: null,     // kopie van het scherm voor de singulariteit
  buffers: null,

  // options: universe (nummer van het nieuwe universum), history, subtitle,
  //          onCommit (het nieuwe universum begint), onDone (scène klaar)
  start(options) {
    const T = {};
    let at = 0;
    for (const phase of HEAVEN_PHASES) {
      T[phase] = at;
      at += HEAVEN_TIMING[phase];
    }
    T.commit = T.rebirth;
    T.end = at;
    this.T = T;
    this.t = 0;
    this.active = true;
    this.committed = false;
    this.options = options;
    this.history = options.history.slice();
    this.sounds = [];
    this.cues = {};
    this.bolts = [];
    this.motes = [];
    this.feathers = [];
    this.stars = [];
    this.waves = [];
    this.shake = 0;
    this.chroma = 0;
    this.frozen = null;
  },

  get phase() {
    for (let i = HEAVEN_PHASES.length - 1; i >= 0; i--) {
      if (this.t >= this.T[HEAVEN_PHASES[i]]) return HEAVEN_PHASES[i];
    }
    return 'prayer';
  },

  // 0..1: hoe ver we in een fase zijn
  phaseProgress(phase) {
    return progress(this.t, this.T[phase], this.T[phase] + HEAVEN_TIMING[phase]);
  },

  // Welk van de 14 woorden is nu te zien? (-1 = geen)
  get wordIndex() {
    if (this.phase !== 'prayer') return -1;
    const index = Math.floor((this.t - 0.25) / ((HEAVEN_TIMING.prayer - 0.45) / FOURTEEN_WORDS.length));
    return index >= 0 && index < FOURTEEN_WORDS.length ? index : -1;
  },

  // Voert iets één keer uit zodra de tijd "at" bereikt.
  cue(name, at, action) {
    if (this.cues[name] || this.t < at) return;
    this.cues[name] = true;
    action();
  },

  sfx(name, options) {
    const handle = Sound.play(name, { minGap: 0, ...options });
    if (handle) this.sounds.push(handle);
  },

  // Sterren als strepen (voor de achtergrond).
  get warp() {
    if (!this.active) return 0;
    if (this.phase === 'accelerate') return 0.35 + this.phaseProgress('accelerate') * 0.65;
    if (this.phase === 'collapse') return 1;
    if (this.phase === 'rebirth') return Math.max(0, 0.9 - this.phaseProgress('rebirth') * 1.8);
    return 0;
  },

  // Hoe snel de achtergrond-klok tikt (negatief = achteruit tijdens rewind).
  get timeScale() {
    if (!this.active) return 1;
    if (this.phase === 'prayer' || this.phase === 'manifest') return 0.1;
    if (this.phase === 'rewind') return -6;
    if (this.phase === 'accelerate') return 10;
    return 1;
  },

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const T = this.T;

    // --- geluid en klappen op het juiste moment ---
    this.cue('voice', 0, () => {
      Sound.playVoice('vHeaven');
      this.sfx('reveal', { volume: 0.4 });
    });
    const word = this.wordIndex;
    if (word >= 0) {
      this.cue('word' + word, 0, () => {
        const last = word === FOURTEEN_WORDS.length - 1;
        this.sfx(last ? 'bell' : 'latch', { volume: last ? 0.6 : 0.28, rate: last ? 0.9 : 1.2 + word * 0.04 });
        this.shake = Math.max(this.shake, last ? 0.5 : 0.18);
        this.chroma = Math.max(this.chroma, last ? 0.6 : 0.25);
      });
    }
    this.cue('manifest', T.manifest, () => {
      FX.flash('255,255,255', 0.9, 2.5);
      this.sfx('heavy', { volume: 1, rate: 0.6 });
      this.sfx('bell', { volume: 0.7, rate: 0.75 });
      this.shake = 1;
      this.chroma = 1;
      this.hoofWave();
      this.burstFeathers(60);
    });
    this.cue('limit', T.manifest + 2.2, () => {
      FX.flash('230,220,255', 0.5, 3);
      this.sfx('heavy', { volume: 0.9, rate: 0.7 });
      this.sfx('metal', { volume: 0.6, rate: 0.7 });
      this.shake = 0.8;
      this.chroma = 0.8;
      this.hoofWave();
      this.burstFeathers(40);
    });
    [0.35, 1.1, 2.5, 2.9, 3.4, 3.8].forEach((offset, i) => this.cue('bolt' + i, T.manifest + offset, () => this.lightning()));
    this.cue('rewind', T.rewind, () => {
      Sound.playVoice('vAccelerate');
      this.sfx('rewindFx', { volume: 0.75, duration: HEAVEN_TIMING.rewind + 0.4, fadeOut: 0.5 });
      this.chroma = 1;
      FX.flash('120,220,255', 0.5, 4);
    });
    this.cue('accelerate', T.accelerate, () => {
      this.sfx('accel', { volume: 0.9 });
      this.sfx('whoosh', { volume: 0.8, rate: 0.6 });
      FX.flash('255,240,210', 0.4, 3);
      this.shake = 0.6;
    });
    this.cue('collapse', T.collapse, () => this.sfx('collapse', { volume: 1 }));
    this.cue('commit', T.commit, () => this.commit());

    // --- effecten laten lopen ---
    // Tijdens het versnellen trilt het scherm steeds harder.
    if (this.phase === 'accelerate') this.shake = Math.max(this.shake, 0.15 + this.phaseProgress('accelerate') * 0.5);
    if (this.phase === 'collapse') {
      this.shake = Math.max(this.shake, 0.4 + this.phaseProgress('collapse') * 0.6);
      this.chroma = Math.max(this.chroma, this.phaseProgress('collapse'));
    }
    if (this.phase === 'rewind') this.chroma = Math.max(this.chroma, 0.35 + 0.15 * Math.sin(this.t * 9));
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.chroma = Math.max(0, this.chroma - dt * 1.4);

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].life -= dt;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }
    if ((this.phase === 'prayer' || this.phase === 'manifest') && this.motes.length < 80 && rand() < dt * 45) {
      this.motes.push({ x: rand(), y: 1.05, speed: randRange(0.04, 0.12), size: randRange(1, 3.5), drift: randRange(-0.02, 0.02), life: 1 });
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const mote = this.motes[i];
      mote.y -= mote.speed * dt;
      mote.x += mote.drift * dt;
      if (this.phase !== 'prayer' && this.phase !== 'manifest') mote.life -= dt * 2;
      if (mote.y < -0.05 || mote.life <= 0) this.motes.splice(i, 1);
    }
    for (const list of [this.feathers, this.stars, this.waves]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        item.life -= dt;
        if (item.life <= 0) { list.splice(i, 1); continue; }
        if (item.vx !== undefined) {
          const drag = Math.exp(-(item.drag || 0) * dt);
          item.vx *= drag;
          item.vy = item.vy * drag + (item.gravity || 0) * dt;
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          if (item.spin) item.rot += item.spin * dt;
        }
      }
    }
    if (this.t >= T.end) this.finish();
  },

  // Schokgolf vanaf de hoeven van Made in Heaven.
  hoofWave() {
    this.waves.push({ x: 0.66, y: 0.9, life: 1.2, maxLife: 1.2 });
    this.waves.push({ x: 0.66, y: 0.9, life: 0.8, maxLife: 0.8 });
  },

  // Witte veren die wegdwarrelen (posities als deel van het scherm, 0..1).
  burstFeathers(count) {
    for (let i = 0; i < count; i++) {
      const angle = randRange(-Math.PI, 0);
      const speed = randRange(0.08, 0.45);
      this.feathers.push({
        x: 0.64, y: 0.55, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.8,
        drag: 1.2, gravity: 0.04, rot: rand() * TAU, spin: randRange(-3, 3), size: randRange(6, 14),
        life: randRange(1.6, 3), maxLife: 3,
      });
    }
  },

  // Een bliksemschicht van boven naar beneden.
  lightning() {
    const startX = randRange(0.12, 0.95);
    const points = [{ x: startX, y: -0.05 }];
    let x = startX, y = -0.05;
    const end = randRange(0.5, 0.85);
    while (y < end) {
      x += randRange(-0.06, 0.06);
      y += randRange(0.04, 0.09);
      points.push({ x, y });
    }
    // een zijtak
    const branchFrom = points[Math.floor(points.length / 2)];
    const branch = [branchFrom];
    let bx = branchFrom.x, by = branchFrom.y;
    for (let i = 0; i < 4; i++) {
      bx += randRange(0.02, 0.06) * (rand() < 0.5 ? -1 : 1);
      by += randRange(0.03, 0.06);
      branch.push({ x: bx, y: by });
    }
    this.bolts.push({ points, branch, life: 0.25, maxLife: 0.25 });
    this.sfx('impact', { volume: 0.4, rate: randRange(0.45, 0.65) });
    FX.flash('210,190,255', 0.25, 6);
    this.shake = Math.max(this.shake, 0.35);
  },

  // De oerknal: honderden sterren die wegschieten.
  bigBang() {
    const colors = ['#ffffff', '#ffe9a8', '#ff8fd0', '#9fd8ff', '#c7a6ff', '#ffd25e'];
    for (let i = 0; i < 260; i++) {
      const angle = rand() * TAU;
      const speed = randRange(0.15, 1.3);
      this.stars.push({ x: 0.5, y: 0.5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, drag: 0.6, size: randRange(1, 3.5), color: pick(colors), life: randRange(1.2, 3.2), maxLife: 3.2 });
    }
  },

  commit() {
    if (this.committed) return;
    this.committed = true;
    FX.flash('255,255,255', 1, 1.1);
    this.sfx('genesis', { volume: 0.95 });
    this.sfx('bell', { volume: 0.6, rate: 1.3 });
    this.shake = 0.7;
    this.bigBang();
    if (this.options.onCommit) this.options.onCommit();
  },

  // SPATIE / ENTER / klik: eerst naar het nieuwe universum, dan helemaal klaar.
  skip() {
    if (!this.active) return;
    if (!this.committed) {
      for (const handle of this.sounds) handle.stop(0.15);
      this.sounds = [];
      Sound.stopVoice(0.15);
      const names = ['voice', 'manifest', 'limit', 'rewind', 'accelerate', 'collapse'];
      for (let i = 0; i < 14; i++) names.push('word' + i);
      for (let i = 0; i < 6; i++) names.push('bolt' + i);
      for (const name of names) this.cues[name] = true;
      this.t = this.T.commit;
      this.cues.commit = true;
      this.commit();
    } else {
      this.t = this.T.end;
      this.finish();
    }
  },

  finish() {
    if (!this.active) return;
    this.active = false;
    if (this.options.onDone) this.options.onDone();
  },

  // ============================================================
  //  Tekenen
  // ============================================================
  draw(W, H) {
    if (!this.active) return;
    const ctx = drawingContext;
    const phase = this.phase;
    const power = this.shake * this.shake * 14;
    const sx = power * Math.sin(this.t * 83), sy = power * Math.sin(this.t * 67 + 1);

    ctx.save();
    ctx.translate(sx, sy);
    if (phase === 'prayer' || phase === 'manifest') this.drawFrozenWorld(W, H);
    else if (phase === 'rewind') this.drawRewind(W, H);
    else if (phase === 'accelerate') this.drawAcceleration(W, H);
    else if (phase === 'collapse') this.drawCollapse(W, H);
    else this.drawRebirth(W, H);
    if (phase === 'prayer' || phase === 'manifest') this.drawPucci(W, H);
    this.drawWaves(W, H);
    this.drawFeathers(W, H);
    this.drawStars(W, H);
    this.drawMotes(W, H);
    this.drawBolts(W, H);
    ctx.restore();

    // nabewerking: kleuren uit elkaar trekken en VHS-glitches
    this.chromaticSplit(this.chroma);
    if (phase === 'rewind' || phase === 'collapse') this.glitchBands(phase === 'rewind' ? 5 : 9, phase === 'rewind' ? 26 : 50);

    // Vlak voor de singulariteit bewaren we het beeld, zodat het daarna
    // in een draaikolk naar één punt gezogen kan worden.
    if (phase === 'accelerate' && this.t > this.T.collapse - 0.3) this.frozen = this.captureScreen();

    this.drawWords(W, H);
    this.drawTitles(W, H);
    this.drawLetterbox(W, H);
  },

  // ---------- nabewerking ----------
  ensureBuffers() {
    const main = drawingContext.canvas;
    if (!this.buffers || this.buffers.red.width !== main.width || this.buffers.red.height !== main.height) {
      const make = () => {
        const canvas = document.createElement('canvas');
        canvas.width = main.width;
        canvas.height = main.height;
        return canvas;
      };
      this.buffers = { red: make(), cyan: make(), copy: make(), frozen: make() };
    }
    return this.buffers;
  },

  // Chromatische aberratie: het rode en blauwe kanaal schuiven een stukje uit elkaar.
  chromaticSplit(amount) {
    if (!Save.settings.flashes) amount = Math.min(amount, 0.3); // rustiger voor je ogen
    if (amount < 0.03) return;
    const main = drawingContext.canvas;
    const { red, cyan } = this.ensureBuffers();
    const w = main.width, h = main.height;
    for (const [canvas, color] of [[red, '#ff0000'], [cyan, '#00ffff']]) {
      const c = canvas.getContext('2d');
      c.globalCompositeOperation = 'copy';
      c.drawImage(main, 0, 0);
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = color;
      c.fillRect(0, 0, w, h);
    }
    const dx = amount * 0.008 * w;
    const ctx = drawingContext;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(red, -dx, 0);
    ctx.drawImage(cyan, dx, 0);
    ctx.restore();
  },

  // VHS-glitch: een paar horizontale stroken schuiven opzij.
  glitchBands(count, maxOffset) {
    const main = drawingContext.canvas;
    const { copy } = this.ensureBuffers();
    const c = copy.getContext('2d');
    c.globalCompositeOperation = 'copy';
    c.drawImage(main, 0, 0);
    const ctx = drawingContext;
    const scale = main.width / Math.max(1, width);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < count; i++) {
      // stroken veranderen 12 keer per seconde (geen onrustig geflikker)
      const seed = Math.floor(this.t * 12) * 13 + i * 7;
      const y = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1 * main.height;
      const band = (6 + ((seed * 31) % 30)) * scale;
      const offset = Math.sin(seed * 3.7) * maxOffset * scale;
      ctx.drawImage(copy, 0, y, main.width, band, offset, y, main.width, band);
    }
    ctx.restore();
  },

  // Bewaart een kopie van het scherm (voor de singulariteit).
  captureScreen() {
    const { frozen } = this.ensureBuffers();
    const c = frozen.getContext('2d');
    c.globalCompositeOperation = 'copy';
    c.drawImage(drawingContext.canvas, 0, 0);
    return frozen;
  },

  // ---------- het speelveld ----------
  // Eén "foto" van het speelveld tekenen (in speelveld-coördinaten).
  drawSnapshot(snap, alpha = 1, withScore = true) {
    if (!snap) return;
    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha *= alpha;
    Background.drawFloor(View.w);
    if (snap.boss) Art.draw('heaven', snap.boss[2], snap.boss[0], snap.boss[1] + 230, 240, { alpha: 0.9 });
    for (const [typeIndex, x, y, rot] of snap.objects) {
      const type = SNAPSHOT_TYPES[typeIndex];
      drawSprite(Sprites[type], x, y, SNAPSHOT_SIZES[type], type === 'disc' ? rot * 7 : rot * 0.25);
    }
    Game.catcher.drawShape(snap.cx, snap.tilt, snap.width, 0, 1, false, 0, this.t);
    if (withScore) {
      drawText('SCORE ' + formatScore(snap.score), 22, 104, { size: 26, font: FONT_TITLE, weight: '400', color: '#ffffff', stroke: COLORS.ink, strokeWidth: 4 });
    }
    ctx.restore();
  },

  latestSnapshot() {
    return this.history[this.history.length - 1] || null;
  },

  // Deel 1-2: de wereld staat stil, donker en paars, met licht uit de hemel.
  drawFrozenWorld(W, H) {
    const ctx = drawingContext;
    View.begin();
    this.drawSnapshot(this.latestSnapshot(), 1, false);
    View.end();
    const dark = 0.5 + 0.25 * Math.min(1, this.t / 2);
    ctx.save();
    ctx.fillStyle = `rgba(12, 3, 30, ${dark})`;
    ctx.fillRect(-50, -50, W + 100, H + 100);
    ctx.globalCompositeOperation = 'lighter';
    const rays = this.phase === 'prayer' ? easeOutCubic(this.phaseProgress('prayer') * 1.5) : 1;
    for (let i = 0; i < 8; i++) {
      const x = W * (0.25 + i * 0.09) + Math.sin(this.t * 0.6 + i) * 24;
      const spread = W * 0.05;
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, `rgba(255, 245, 220, ${0.17 * rays})`);
      gradient.addColorStop(1, 'rgba(255, 245, 220, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x - spread * 0.3, 0);
      ctx.lineTo(x + spread * 0.3, 0);
      ctx.lineTo(x + spread * 2.5, H);
      ctx.lineTo(x - spread * 2.5, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (this.phase === 'manifest') this.drawClockworks(W, H, this.phaseProgress('manifest'));
  },

  // Draaiende klokken (tandwielen) achter Made in Heaven.
  drawClockworks(W, H, p) {
    const ctx = drawingContext;
    const cx = W * (W < H ? 0.5 : 0.62), cy = H * 0.48;
    const base = Math.min(W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [size, speed, alpha] of [[1.25, 0.25, 0.14], [0.85, -0.6, 0.2], [0.5, 1.4, 0.26]]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.t * speed);
      ctx.globalAlpha = alpha * Math.min(1, p * 4);
      const s = base * size * (1 + p * 0.15);
      ctx.drawImage(Background.clockFace, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    // uitdijende ringen
    for (let i = 0; i < 4; i++) {
      const ring = (this.t * 0.6 + i / 4) % 1;
      ctx.strokeStyle = `rgba(255, 225, 170, ${0.35 * (1 - ring)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, ring * Math.max(W, H) * 0.7, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Pucci: eerst een biddend silhouet, dan de onthulling van Made in Heaven.
  drawPucci(W, H) {
    const ctx = drawingContext;
    const T = this.T;
    const prayer = this.phase === 'prayer';
    const pose = prayer ? 5 : (this.t >= T.manifest + 2.2 ? 4 : 0);
    const appear = prayer ? easeOutCubic(this.phaseProgress('prayer') * 2) : 1;
    const slam = prayer ? 0 : 1 - easeOutCubic(progress(this.t, T.manifest, T.manifest + 0.45));
    const limitSlam = 1 - easeOutCubic(progress(this.t, T.manifest + 2.2, T.manifest + 2.55));
    const size = Math.min(H * 0.8, W * 0.78) * (1 + slam * 0.14 + limitSlam * 0.07);
    const x = W * (W < H ? 0.5 : 0.64) + Math.sin(this.t * 0.8) * 6;
    const bottom = H * 0.915 + Math.sin(this.t * 1.3) * 4;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
    ctx.save();
    ctx.globalAlpha = appear;
    if (prayer) {
      // geheimzinnig silhouet met een lichtrand
      Art.drawGlow('heaven', pose, x, bottom, size, 'rgb(220, 200, 255)', 0.55 + pulse * 0.25);
      const shadow = Art.silhouette('heaven', pose, '#0d0620');
      if (shadow) ctx.drawImage(shadow, x - size / 2, bottom - size, size, size);
      // gouden ogen die oplichten
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = appear * (0.4 + pulse * 0.4);
      ctx.drawImage(Sprites.glowGold, x - size * 0.17 - 8, bottom - size * 0.86 - 8, 16, 16);
    } else {
      Art.drawGlow('heaven', pose, x, bottom, size, 'rgb(255, 236, 190)', 0.5 + pulse * 0.25 + slam * 1.2);
      Art.draw('heaven', pose, x, bottom, size);
      if (slam > 0.05) Art.drawGlow('heaven', pose, x, bottom, size, 'rgb(255, 255, 255)', slam);
    }
    ctx.restore();
  },

  // Deel 3: de opgenomen gameplay achterstevoren, steeds sneller, als een oude videoband.
  drawRewind(W, H) {
    const ctx = drawingContext;
    const p = this.phaseProgress('rewind');
    const count = this.history.length;
    const index = count ? Math.round((count - 1) * (1 - p * p)) : 0;
    View.begin();
    // nabeelden: zo zie je alles terugvliegen
    for (let echo = 3; echo >= 1; echo--) {
      this.drawSnapshot(this.history[Math.min(count - 1, index + echo * (3 + Math.round(p * 6)))], 0.12 * (4 - echo), false);
    }
    this.drawSnapshot(this.history[index], 1, true);
    View.end();
    ctx.save();
    // blauwe "videoband"-kleur
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = 'rgba(80, 200, 255, 0.5)';
    ctx.fillRect(-50, -50, W + 100, H + 100);
    ctx.globalCompositeOperation = 'source-over';
    // scanlijnen en een lichte vignet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
    const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,10,30,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    // terugspoel-strepen die naar boven schieten
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.35)';
    for (let i = 0; i < 16; i++) {
      const x = ((i * 0.618) % 1) * W;
      const y = H - ((this.t * (900 + p * 2000) + i * 140) % (H + 200));
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 80 + p * 200);
      ctx.stroke();
    }
    ctx.restore();
    // een klok die steeds sneller achteruit draait
    const size = Math.min(W, H) * 0.3;
    ctx.save();
    ctx.translate(W - size * 0.7, H * 0.32);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(Background.clockFace, -size / 2, -size / 2, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    const local = this.t - this.T.rewind;
    for (const [speed, length, lineWidth] of [[-2, 0.25, 6], [-20, 0.38, 3]]) {
      ctx.save();
      ctx.rotate(local * speed * (1 + local));
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // ◀◀ REWIND en een tijdcode die terugtelt
    const seconds = Math.max(0, index / 30);
    const timecode = '-00:' + seconds.toFixed(2).padStart(5, '0');
    if (Math.floor(this.t * 3) % 2 === 0) {
      drawText('◀◀ REWIND', W * 0.5, H * 0.18, { size: Math.min(48, W * 0.07), font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: '#e6f8ff', stroke: '#06223a', strokeWidth: 6, skew: -0.15 });
    }
    drawText(timecode, W * 0.5, H * 0.18 + Math.min(42, W * 0.06), { size: Math.min(26, W * 0.04), font: "'Courier New', monospace", weight: '700', align: 'center', baseline: 'middle', color: '#bff0ff', stroke: '#06223a', strokeWidth: 4 });
  },

  // Deel 4: de tijd versnelt.
  drawAcceleration(W, H) {
    const ctx = drawingContext;
    const p = this.phaseProgress('accelerate');
    const local = this.t - this.T.accelerate;
    // de oudste herinnering vervaagt
    if (p < 0.35) {
      View.begin();
      this.drawSnapshot(this.history[0], 1 - p / 0.35, false);
      View.end();
    }
    ctx.save();
    // dag en nacht flitsen steeds sneller voorbij
    const cycle = Math.sin(local * local * 2.4 + local * 2);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (cycle > 0) {
      sky.addColorStop(0, `rgba(120, 190, 255, ${0.35 * cycle})`);
      sky.addColorStop(1, `rgba(255, 170, 80, ${0.35 * cycle})`);
    } else {
      sky.addColorStop(0, `rgba(10, 10, 60, ${-0.4 * cycle})`);
      sky.addColorStop(1, `rgba(40, 10, 80, ${-0.4 * cycle})`);
    }
    ctx.fillStyle = sky;
    ctx.fillRect(-50, -50, W + 100, H + 100);
    ctx.restore();

    // zon en maan razen in een grote baan rond
    const orbit = local * local * 3 + local;
    const cx = W / 2, cy = H * 0.95, radius = Math.min(W * 0.55, H * 0.8);
    for (const [offset, color, glow, r] of [[0, '#fff1b0', Sprites.glowGold, 34], [Math.PI, '#e8ecff', Sprites.glowWhite, 26]]) {
      for (let trail = 6; trail >= 0; trail--) {
        const angle = Math.PI + orbit + offset - trail * 0.07;
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius;
        const alpha = trail === 0 ? 1 : 0.18 * (1 - trail / 7);
        drawGlowSprite(glow, x, y, r * 5, alpha);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    // gigantische klok met razende wijzers
    const size = Math.min(W, H) * (0.8 + p * 0.3);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(Background.clockFace, -size / 2, -size / 2, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    for (const [speed, length, lineWidth] of [[3, 0.25, 10], [30, 0.38, 5]]) {
      ctx.save();
      ctx.rotate(local * local * speed);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    this.drawSpeedLines(W, H, 0.25 + p * 0.6);

    // Pucci staat stil in het midden terwijl alles om hem heen raast
    const heroSize = Math.min(H * 0.62, W * 0.55);
    const bottom = H * 0.88;
    for (let i = 3; i >= 1; i--) {
      Art.draw('heaven', 4, W / 2 + Math.sin(this.t * 40 + i) * i * 10 * p, bottom, heroSize, { alpha: 0.12 * i });
    }
    Art.drawGlow('heaven', 4, W / 2, bottom, heroSize, 'rgb(255, 240, 200)', 0.6);
    Art.draw('heaven', 4, W / 2, bottom, heroSize);
  },

  // Manga-snelheidslijnen die naar het midden wijzen.
  drawSpeedLines(W, H, strength) {
    const ctx = drawingContext;
    const cx = W / 2, cy = H / 2;
    const inner = Math.min(W, H) * 0.3, outer = Math.hypot(W, H);
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.fillStyle = '#ffffff';
    const frame = Math.floor(this.t * 20);
    for (let i = 0; i < 70; i++) {
      const seed = Math.sin((i + frame * 0.37) * 91.3) * 0.5 + 0.5;
      const angle = (i / 70) * TAU + seed * 0.08;
      const width = 0.004 + seed * 0.012;
      const start = inner * (1 + seed * 0.8);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * start, cy + Math.sin(angle) * start);
      ctx.lineTo(cx + Math.cos(angle - width) * outer, cy + Math.sin(angle - width) * outer);
      ctx.lineTo(cx + Math.cos(angle + width) * outer, cy + Math.sin(angle + width) * outer);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // Deel 5: het hele scherm wordt in een spiraal naar één punt gezogen.
  drawCollapse(W, H) {
    const ctx = drawingContext;
    const p = this.phaseProgress('collapse');
    if (this.frozen) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fw = ctx.canvas.width, fh = ctx.canvas.height;
      // een paar kopieën die steeds verder draaien: een draaikolk
      for (let copy = 4; copy >= 0; copy--) {
        const q = clamp(p - copy * 0.06, 0, 1);
        const scale = Math.max(0.001, 1 - easeInCubic(q));
        ctx.save();
        ctx.translate(fw / 2, fh / 2);
        ctx.rotate(q * q * 7);
        ctx.scale(scale, scale);
        ctx.globalAlpha = copy === 0 ? 1 : 0.22;
        ctx.drawImage(this.frozen, -fw / 2, -fh / 2);
        ctx.restore();
      }
      ctx.restore();
    }
    // accretieschijf en een gloeiende kern
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(W / 2, H / 2);
    for (let i = 0; i < 6; i++) {
      const r = (1 - p * 0.85) * Math.max(W, H) * (0.12 + i * 0.1);
      ctx.strokeStyle = `rgba(${200 + i * 9}, ${160 + i * 15}, 255, ${0.2 + p * 0.45})`;
      ctx.lineWidth = 2 + i * 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.32, p * 4 + i * 0.5, 0, TAU);
      ctx.stroke();
    }
    const core = 18 + p * p * Math.max(W, H) * 0.7;
    ctx.globalAlpha = 0.5 + p * 0.5;
    ctx.drawImage(Sprites.glowWhite, -core, -core, core * 2, core * 2);
    ctx.restore();
    if (p > 0.85) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(p - 0.85) / 0.15})`;
      ctx.fillRect(-50, -50, W + 100, H + 100);
    }
  },

  // Deel 6: de oerknal en het nieuwe universum.
  drawRebirth(W, H) {
    const ctx = drawingContext;
    const local = this.t - this.T.rebirth;
    const p = this.phaseProgress('rebirth');
    // nevel die opbloeit
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bloom = easeOutCubic(Math.min(1, local / 2.2));
    for (const [ox, oy, color, size] of [[0, 0, '255, 140, 210', 0.7], [-0.12, 0.05, '120, 170, 255', 0.6], [0.14, -0.06, '255, 210, 120', 0.5]]) {
      const gradient = ctx.createRadialGradient(W * (0.5 + ox), H * (0.5 + oy), 0, W * (0.5 + ox), H * (0.5 + oy), Math.max(W, H) * size * bloom + 1);
      gradient.addColorStop(0, `rgba(${color}, ${0.35 * (1 - p * 0.6)})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }
    // kleurrijke oerknal-ringen
    const ringR = easeOutCubic(Math.min(1, local / 1.4)) * Math.max(W, H) * 0.95;
    ['255, 210, 130', '255, 120, 200', '150, 120, 255', '100, 220, 255'].forEach((color, i) => {
      ctx.strokeStyle = `rgba(${color}, ${0.55 * (1 - Math.min(1, local / 1.7))})`;
      ctx.lineWidth = 20 - i * 4;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.max(1, ringR - i * 34), 0, TAU);
      ctx.stroke();
    });
    ctx.restore();
    // het nieuwe speelveld verschijnt
    View.begin();
    drawingContext.globalAlpha = Math.min(1, Math.max(0, (local - 0.6) / 1.0));
    Background.drawFloor(View.w);
    Game.catcher.draw(0, this.t);
    drawingContext.globalAlpha = 1;
    View.end();
    // wit dat langzaam wegtrekt
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - local * 1.5)})`;
    ctx.fillRect(-50, -50, W + 100, H + 100);
    // dreigende ゴゴゴ rond de titel
    const alpha = Math.min(1, Math.max(0, (local - 0.35) * 2.5)) * Math.min(1, (1 - p) * 5);
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = W / 2 + side * Math.min(W * 0.36, 420) + Math.sin(this.t * 2 + i) * 8;
      const y = H * (0.3 + (i >> 1) * 0.11) - ((this.t * 30 + i * 17) % 30);
      drawText(i % 3 === 2 ? 'ド' : 'ゴ', x, y, { size: Math.min(46, W * 0.06), font: FONT_JP, weight: '900', align: 'center', baseline: 'middle', color: '#c79bff', stroke: COLORS.ink, strokeWidth: 4, skew: -0.2, alpha: alpha * 0.85 });
    }
    const label = `UNIVERSE ${String(this.options.universe).padStart(2, '0')}`;
    const pop = easeOutBack(clamp((local - 0.35) / 0.4, 0, 1));
    drawJoJoTitle(label, W / 2, H * 0.4, Math.min(W * 0.12, 104) * mix(1.5, 1, pop), { alpha, color: COLORS.gold });
    if (this.options.subtitle) {
      drawText(this.options.subtitle, W / 2, H * 0.4 + Math.min(W * 0.08, 72), {
        size: Math.min(W * 0.03, 22), align: 'center', baseline: 'middle', color: '#ffffff', stroke: COLORS.ink, strokeWidth: 4, alpha, maxWidth: W - 40,
      });
    }
  },

  // ---------- losse effecten ----------
  drawWaves(W, H) {
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const wave of this.waves) {
      const t = 1 - wave.life / wave.maxLife;
      const r = easeOutCubic(t) * Math.max(W, H) * 0.8;
      ctx.strokeStyle = `rgba(255, 240, 210, ${0.7 * (1 - t)})`;
      ctx.lineWidth = 14 * (1 - t) + 2;
      ctx.beginPath();
      ctx.ellipse(wave.x * W, wave.y * H, r, r * 0.3, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawFeathers(W, H) {
    const ctx = drawingContext;
    for (const feather of this.feathers) {
      const alpha = Math.min(1, feather.life / 0.6);
      ctx.save();
      ctx.translate(feather.x * W, feather.y * H);
      ctx.rotate(feather.rot);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, feather.size, feather.size * 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 190, 230, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-feather.size, 0);
      ctx.lineTo(feather.size, 0);
      ctx.stroke();
      ctx.restore();
    }
  },

  drawStars(W, H) {
    if (!this.stars.length) return;
    const ctx = drawingContext;
    const scale = Math.max(W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const star of this.stars) {
      const alpha = Math.min(1, star.life / 0.8);
      const x = W / 2 + (star.x - 0.5) * scale, y = H / 2 + (star.y - 0.5) * scale;
      ctx.strokeStyle = star.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = star.size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - star.vx * scale * 0.05, y - star.vy * scale * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawMotes(W, H) {
    if (!this.motes.length) return;
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of this.motes) {
      ctx.globalAlpha = 0.7 * mote.life;
      ctx.drawImage(Sprites.glowWhite, mote.x * W - mote.size * 3, mote.y * H - mote.size * 3, mote.size * 6, mote.size * 6);
    }
    ctx.restore();
  },

  drawBolts(W, H) {
    const ctx = drawingContext;
    for (const bolt of this.bolts) {
      const alpha = bolt.life / bolt.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      for (const line of [bolt.points, bolt.branch]) {
        for (const [lineWidth, color] of [[16, `rgba(170, 120, 255, ${0.35 * alpha})`], [6, `rgba(230, 210, 255, ${0.8 * alpha})`], [2, `rgba(255, 255, 255, ${alpha})`]]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = line === bolt.branch ? lineWidth * 0.6 : lineWidth;
          ctx.beginPath();
          line.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x * W, point.y * H) : ctx.lineTo(point.x * W, point.y * H)));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  },

  // ---------- teksten ----------
  // De 14 woorden: elk woord klapt in beeld, het vorige vliegt weg.
  drawWords(W, H) {
    const index = this.wordIndex;
    if (index < 0) return;
    const wordTime = (HEAVEN_TIMING.prayer - 0.45) / FOURTEEN_WORDS.length;
    const local = (this.t - 0.25) - index * wordTime;
    const portrait = W < H;
    const cx = portrait ? W * 0.5 : W * 0.33, cy = portrait ? H * 0.28 : H * 0.47;
    const big = Math.min(W * (portrait ? 0.1 : 0.062), 64);
    // het vorige woord vervaagt naar links
    if (index > 0 && local < 0.18) {
      const [, english] = FOURTEEN_WORDS[index - 1];
      drawJoJoTitle(english, cx - local * 300, cy + big * 0.25, big, { alpha: 1 - local / 0.18, color: '#ffffff', maxWidth: W * 0.6 });
    }
    const [japanese, english] = FOURTEEN_WORDS[index];
    const pop = easeOutBack(clamp(local / 0.12, 0, 1));
    const beetle = english === 'RHINOCEROS BEETLE';
    const last = index === FOURTEEN_WORDS.length - 1;
    drawText(japanese, cx, cy - big * 0.75, {
      size: big * 0.55 * mix(1.4, 1, pop), font: FONT_JP, weight: '900', align: 'center', baseline: 'middle',
      color: '#ffffff', stroke: COLORS.ink, strokeWidth: 5, alpha: Math.min(1, local * 10),
    });
    drawJoJoTitle(english, cx, cy + big * 0.25, big * (last ? 1.25 : 1) * mix(1.5, 1, pop), {
      color: last ? COLORS.gold : beetle ? COLORS.violet : '#ffffff', shadow: last ? 'rgba(255, 95, 168, 0.9)' : undefined,
      alpha: Math.min(1, local * 10), maxWidth: W * 0.62,
    });
    drawText(`${index + 1} / 14`, cx, cy + big * 1.2, { size: 13, align: 'center', baseline: 'middle', color: 'rgba(230, 210, 255, 0.6)', spacing: 3 });
  },

  // Grote titels die midden in beeld klappen.
  drawTitles(W, H) {
    const T = this.T;
    const portrait = W < H;
    const slam = (text, at, duration, size, color, shadow) => {
      if (this.t < at || this.t > at + duration) return;
      const local = this.t - at;
      const pop = easeOutBack(clamp(local / 0.3, 0, 1));
      const alpha = Math.min(1, local * 6) * Math.min(1, (at + duration - this.t) * 3);
      drawJoJoTitle(text, W * (portrait ? 0.5 : 0.34), H * (portrait ? 0.25 : 0.36), size * mix(1.6, 1, pop), { alpha, color, shadow, maxWidth: W * 0.9 });
    };
    const big = Math.min(W * (portrait ? 0.12 : 0.085), 96);
    slam('MADE IN HEAVEN', T.manifest, 2.1, big, '#ffffff', 'rgba(255, 190, 90, 0.9)');
    slam('TIME HAS NO LIMIT', T.manifest + 2.2, 2.2, big * 0.8, COLORS.gold, 'rgba(130, 60, 220, 0.9)');
    if (this.phase === 'accelerate') {
      const local = this.t - T.accelerate;
      const pop = easeOutBack(clamp(local / 0.3, 0, 1));
      const jitter = 1 + Math.sin(this.t * 40) * 0.02 * this.phaseProgress('accelerate');
      drawJoJoTitle('TIME ACCELERATES', W / 2, H * 0.22, big * mix(1.5, 1, pop) * jitter, { color: '#ffffff', shadow: 'rgba(255, 150, 60, 0.9)', maxWidth: W * 0.92 });
      drawText('時は加速する', W / 2, H * 0.22 + big * 0.75, { size: big * 0.4, font: FONT_JP, weight: '900', align: 'center', baseline: 'middle', color: '#ffe9a8', stroke: COLORS.ink, strokeWidth: 5, alpha: Math.min(1, local * 3) });
    }
  },

  // Zwarte filmbalken boven en onder, met tekst erin.
  drawLetterbox(W, H) {
    const ctx = drawingContext;
    const barIn = easeOutCubic(Math.min(1, this.t / 0.5));
    const barOut = this.committed ? easeInCubic(progress(this.t, this.T.rebirth + 2.0, this.T.rebirth + 2.8)) : 0;
    const barH = Math.round(H * 0.085 * barIn * (1 - barOut));
    if (barH <= 1) return;
    ctx.fillStyle = '#050208';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);
    const [top, bottom] = HEAVEN_CAPTIONS[this.phase];
    const textAlpha = barIn * (1 - barOut);
    const size = Math.max(12, Math.min(barH * 0.34, 22));
    drawText(top, 24, barH / 2 + 1, { size, font: FONT_TITLE, weight: '400', baseline: 'middle', color: '#ffffff', spacing: 2, alpha: textAlpha, skew: -0.12, maxWidth: W - 48 });
    if (bottom) {
      drawText(bottom, W - 24, H - barH / 2 + 1, { size: size * 0.85, align: 'right', baseline: 'middle', color: '#e6d8ff', spacing: 1, alpha: textAlpha });
    }
    drawText(Input.touchMode ? 'tik = overslaan' : 'SPATIE = overslaan', 24, H - barH / 2 + 1, { size: Math.max(10, size * 0.6), baseline: 'middle', color: 'rgba(255,255,255,0.45)', alpha: textAlpha });
  },
};
