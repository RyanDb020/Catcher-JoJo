// ============================================================
//  waves.js — de "regisseur" die bepaalt wat er wanneer valt.
//
//  Elke golf wordt iets moeilijker: alles valt sneller, er vallen
//  meer orbs en er komen nieuwe dingen bij (goud, bommen, slingerende
//  orbs, patronen). Golf 5 van elk universum is de eindbaas.
//
//  Belangrijk: de regisseur is EERLIJK. Hij laat nooit twee roze
//  orbs zo vallen dat je ze onmogelijk allebei kunt halen.
// ============================================================

const SPAWN_Y = -30;          // objecten verschijnen net boven het scherm
const SPAWN_MARGIN = 40;      // niet te dicht bij de zijkant

// Hoe moeilijk een golf is: 0 = eerste golf, en elke golf erna +1.
function waveLevel(universe, wave) {
  return (universe - 1) * WAVES.perUniverse + (wave - 1);
}

// Alle getallen voor één golf.
function waveSettings(universe, wave) {
  const level = waveLevel(universe, wave);
  const boost = 1 + (universe - 1) * WAVES.universeBoost;
  const isBoss = wave === WAVES.perUniverse;
  return {
    level,
    isBoss,
    speed: Math.min(WAVES.maxSpeed, WAVES.baseSpeed * (1 + WAVES.speedPerLevel * level) * boost),
    rate: Math.min(WAVES.maxRate, WAVES.baseRate + WAVES.ratePerLevel * level) * (isBoss ? 0.65 : 1),
    duration: isBoss ? Infinity : WAVES.baseDuration + WAVES.durationPerWave * (wave - 1),
    goldChance: level >= 1 ? 0.075 : 0,
    bombChance: level >= 2 ? Math.min(0.12 + 0.02 * (level - 2), 0.3) : 0,
    zigzagChance: level >= 3 ? Math.min(0.14 + 0.02 * (level - 3), 0.34) : 0,
    patterns: level >= 3,
    bombWalls: level >= 5,
    pickups: level >= 1,
  };
}

// Hoe ver kan de catcher komen in "seconds" seconden? (iets voorzichtig gerekend)
function catcherReach(seconds) {
  return Math.max(0, seconds - 0.1) * CATCHER.maxSpeed * 0.7 + CATCHER.width * 0.35;
}

class WaveDirector {
  constructor() {
    this.reset();
  }

  reset() {
    this.universe = 1;
    this.wave = 1;
    this.phase = 'idle';   // 'intro' → 'spawn' → 'drain' → 'done'
    this.timer = 0;
    this.clock = 0;        // eigen klok (loopt mee met de tijd van de wereld)
    this.settings = waveSettings(1, 1);
    this.spawnTimer = 0;
    this.patternTimer = 0;
    this.pending = [];     // wanneer en waar roze orbs bij de catcher aankomen
    this.quietUntil = 0;
    this.pickupTimers = { life: randRange(30, 42), arrow: randRange(38, 52), wide: randRange(40, 55) };
  }

  begin(universe, wave) {
    this.universe = universe;
    this.wave = wave;
    this.settings = waveSettings(universe, wave);
    this.phase = 'intro';
    this.timer = 0;
    this.spawnTimer = 0.25;
    this.patternTimer = randRange(6, 9);
    this.pending = [];
  }

  get isBoss() {
    return this.settings.isBoss;
  }

  // 0..1: hoe ver de golf is (voor de balk bovenin)
  get progress() {
    if (this.phase === 'spawn') return Math.min(1, this.timer / this.settings.duration);
    return this.phase === 'drain' || this.phase === 'done' ? 1 : 0;
  }

  update(dt, game) {
    this.clock += dt;
    this.timer += dt;
    if (this.phase === 'intro') {
      if (this.timer >= WAVES.introTime) {
        this.phase = 'spawn';
        this.timer = 0;
        if (this.isBoss) game.spawnBoss();
      }
    } else if (this.phase === 'spawn') {
      this.spawnLoop(dt, game);
      if (!this.isBoss && this.timer >= this.settings.duration) {
        this.phase = 'drain';
        this.timer = 0;
      }
    } else if (this.phase === 'drain') {
      // wachten tot alles gevangen of gevallen is
      if (!game.hasFallingObjects() || this.timer > 7) {
        this.phase = 'done';
        game.onWaveCleared();
      }
    }
    this.pending = this.pending.filter(item => item.t > this.clock - 0.5);
  }

  speedFor(type, game) {
    return this.settings.speed * OBJECT_TYPES[type].speedMult * (1 + 0.1 * game.perks.heaven);
  }

  spawnLoop(dt, game) {
    const s = this.settings;
    const widthScale = clamp(game.fieldW / FIELD.maxWidth, 0.55, 1);

    // gewone objecten
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer += (1 / (s.rate * widthScale)) * randRange(0.75, 1.25);
      if (this.clock >= this.quietUntil) this.spawnRandom(game);
    }

    // patronen (trap, gouden regen, bommenmuur...)
    if (s.patterns) {
      this.patternTimer -= dt;
      if (this.patternTimer <= 0) {
        this.patternTimer = randRange(7, 11);
        this.spawnPattern(game);
      }
    }

    // power-ups
    if (s.pickups) {
      for (const type of Object.keys(this.pickupTimers)) {
        this.pickupTimers[type] -= dt;
        if (this.pickupTimers[type] > 0) continue;
        if (type === 'life' && game.lives >= game.maxLives) {
          this.pickupTimers.life = 6; // later nog eens proberen
          continue;
        }
        this.pickupTimers[type] = type === 'life' ? randRange(38, 55) : type === 'arrow' ? randRange(42, 60) : randRange(45, 65);
        const x = randRange(SPAWN_MARGIN, game.fieldW - SPAWN_MARGIN);
        game.spawn(new Faller(type, x, SPAWN_Y, this.speedFor(type, game)));
      }
    }
  }

  // Wanneer komt een object op hoogte van de catcher aan?
  arrivalTime(speed, startY = SPAWN_Y) {
    return this.clock + (FIELD.height - CATCHER.rimFromBottom - startY) / speed;
  }

  // Kan de speler deze roze orb halen, gezien de andere orbs die eraan komen?
  isReachable(x, t) {
    for (const item of this.pending) {
      const gap = Math.abs(t - item.t);
      if (gap > 2.2) continue;
      if (Math.abs(x - item.x) > catcherReach(gap)) return false;
    }
    return true;
  }

  // Een bom mag niet vlak boven een roze orb vallen (dan moet je kiezen tussen twee kwaden).
  isSafeForBomb(x, t) {
    for (const item of this.pending) {
      if (Math.abs(t - item.t) < 0.45 && Math.abs(x - item.x) < CATCHER.width * 0.8) return false;
    }
    return true;
  }

  // Zoekt een eerlijke x-positie. Geeft null terug als er geen is.
  findX(fieldW, t, test) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = randRange(SPAWN_MARGIN, fieldW - SPAWN_MARGIN);
      if (test(x, t)) return x;
    }
    return null;
  }

  // Valt er een roze orb die je moet halen? Dan onthouden we waar en wanneer.
  remember(x, t) {
    this.pending.push({ x, t });
  }

  spawnRandom(game) {
    const s = this.settings;
    const roll = rand();
    if (roll < s.bombChance) {
      const speed = this.speedFor('bomb', game);
      const t = this.arrivalTime(speed);
      const x = this.findX(game.fieldW, t, (px, pt) => this.isSafeForBomb(px, pt));
      if (x !== null) game.spawn(new Faller('bomb', x, SPAWN_Y, speed));
      return;
    }
    if (roll < s.bombChance + s.goldChance) {
      const speed = this.speedFor('gold', game);
      game.spawn(new Faller('gold', randRange(SPAWN_MARGIN, game.fieldW - SPAWN_MARGIN), SPAWN_Y, speed));
      return;
    }
    this.spawnOrb(game, chance(s.zigzagChance));
  }

  spawnOrb(game, zigzag, forcedX = null, startY = SPAWN_Y) {
    const speed = this.speedFor('orb', game);
    const t = this.arrivalTime(speed, startY);
    let x = forcedX;
    if (x === null) {
      x = this.findX(game.fieldW, t, (px, pt) => this.isReachable(px, pt));
      if (x === null) {
        // geen eerlijke plek gevonden: dan vlak bij de vorige orb
        const last = this.pending[this.pending.length - 1];
        const reach = last ? catcherReach(Math.abs(t - last.t)) * 0.8 : 100;
        x = clamp((last ? last.x : game.fieldW / 2) + randRange(-reach, reach), SPAWN_MARGIN, game.fieldW - SPAWN_MARGIN);
      }
    }
    let options = {};
    if (zigzag) {
      // De slinger is zo gekozen dat de orb precies op x aankomt.
      const amp = randRange(40, 80);
      const freq = randRange(2.2, 3.4);
      const travel = t - this.clock;
      const baseX = clamp(x, SPAWN_MARGIN + amp, game.fieldW - SPAWN_MARGIN - amp);
      options = { zig: { baseX, amp, freq, phase: -freq * travel } };
      x = baseX;
    }
    const orb = new Faller('orb', x, startY, speed, options);
    game.spawn(orb);
    this.remember(x, t);
    return orb;
  }

  spawnPattern(game) {
    const s = this.settings;
    const options = ['stairs', 'goldRain', 'zigzagTrio'];
    if (s.bombWalls) options.push('bombWall', 'bombWall');
    const pattern = pick(options);
    const W = game.fieldW;

    if (pattern === 'stairs') {
      // Een trap van orbs: in één veeg kun je ze allemaal vangen.
      const count = 5;
      const step = Math.min(72, (W - SPAWN_MARGIN * 2) / count);
      const dir = chance(0.5) ? 1 : -1;
      const start = dir > 0 ? randRange(SPAWN_MARGIN, W - SPAWN_MARGIN - step * (count - 1)) : randRange(SPAWN_MARGIN + step * (count - 1), W - SPAWN_MARGIN);
      // Alleen als de eerste orb van de trap haalbaar is.
      if (!this.isReachable(start, this.arrivalTime(this.speedFor('orb', game)))) return;
      for (let i = 0; i < count; i++) {
        this.spawnOrb(game, false, start + dir * i * step, SPAWN_Y - i * 62);
      }
      this.quietUntil = this.clock + 1.4;
    } else if (pattern === 'goldRain') {
      for (let i = 0; i < 4; i++) {
        const gold = new Faller('gold', randRange(SPAWN_MARGIN, W - SPAWN_MARGIN), SPAWN_Y - i * 90, this.speedFor('gold', game));
        game.spawn(gold);
      }
      game.announce('GOUDREGEN!', COLORS.gold);
    } else if (pattern === 'zigzagTrio') {
      const x = randRange(SPAWN_MARGIN + 80, W - SPAWN_MARGIN - 80);
      for (let i = 0; i < 3; i++) this.spawnOrb(game, true, x, SPAWN_Y - i * 95);
      this.quietUntil = this.clock + 1.2;
    } else if (pattern === 'bombWall') {
      this.spawnBombWall(game);
    }
  }

  // Een muur van bommen met één gat. Daar ligt een gouden orb als beloning.
  spawnBombWall(game) {
    const W = game.fieldW;
    const speed = this.speedFor('bomb', game);
    const t = this.arrivalTime(speed);
    const gapWidth = CATCHER.width * 1.9;
    // Als er al een roze orb rond dat moment aankomt, leggen we het gat daar.
    const nearby = this.pending.filter(item => Math.abs(item.t - t) < 0.9);
    if (nearby.length > 1) return;
    const gapX = nearby.length === 1
      ? clamp(nearby[0].x, gapWidth / 2 + 10, W - gapWidth / 2 - 10)
      : randRange(gapWidth / 2 + 10, W - gapWidth / 2 - 10);
    const spacing = 56;
    for (let x = 28; x < W - 20; x += spacing) {
      if (Math.abs(x - gapX) < gapWidth / 2) continue;
      game.spawn(new Faller('bomb', x, SPAWN_Y, speed));
    }
    game.spawn(new Faller('gold', gapX, SPAWN_Y - 40, speed));
    this.quietUntil = this.clock + 1.3;
    this.remember(gapX, t);
    game.announce('BOMMENMUUR!', COLORS.red);
  }
}
