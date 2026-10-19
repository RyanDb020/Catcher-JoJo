// ============================================================
//  boss.js — de eindbaas: Enrico Pucci met Made in Heaven.
//
//  Hoe versla je hem? Elke orb die je vangt schiet een ster naar
//  hem toe. Stand-aanvallen doen extra veel schade.
//
//  Zijn aanvallen:
//   - WAAIER   : hij gooit gouden orbs (gratis punten en schade!)
//   - DISCS    : Whitesnake-discs. Vang je er een, dan is je Stand
//                een paar seconden geblokkeerd.
//   - VERSNELLEN: Made in Heaven versnelt de tijd: alles valt sneller.
// ============================================================

const BOSS_PATTERN = ['fan', 'discs', 'fan', 'accel', 'discs', 'fan', 'discs', 'accel'];

class Boss {
  constructor(universe, fieldW) {
    this.maxHp = BOSS.baseHp + (universe - 1) * BOSS.hpPerUniverse;
    this.hp = this.maxHp;
    this.displayHp = this.hp;
    this.universe = universe;
    this.x = fieldW / 2;
    this.y = -260;
    this.homeY = 128;
    this.time = 0;
    this.state = 'enter';     // 'enter' → 'fight' → 'dying' → 'dead'
    this.stateTime = 0;
    this.attackTimer = 2.2;
    this.attackIndex = 0;
    this.windup = null;       // aanval die eraan komt (met waarschuwing)
    this.windupTime = 0;
    this.accelTime = 0;       // resterende tijd van TIME ACCELERATES
    this.accelFactor = 1;
    this.hitFlash = 0;
    this.shots = [];          // sterren die jij op hem afvuurt
    this.pose = 0;
    this.saidAccelerate = false;
  }

  get alive() {
    return this.state === 'enter' || this.state === 'fight';
  }

  get enraged() {
    return this.hp / this.maxHp < BOSS.enragedAt;
  }

  // Met hoeveel versnelt Made in Heaven de wereld nu?
  timeFactor() {
    return this.accelFactor;
  }

  // Een ster vanaf de catcher naar Pucci.
  addShot(x, y, damage, color = '255,210,94') {
    if (!this.alive) return;
    this.shots.push({ sx: x, sy: y, t: 0, damage, color, wobble: randRange(-80, 80) });
  }

  damage(amount, game) {
    if (!this.alive || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 1;
    if (this.hp <= 0) {
      this.state = 'dying';
      this.stateTime = 0;
      this.accelTime = 0;
      game.onBossDying(this);
      Sound.play('collapse', { volume: 1 });
      FX.shake(0.8);
      FX.hitStop(0.2);
    }
  }

  update(worldDt, realDt, game) {
    this.time += worldDt;
    this.stateTime += worldDt;
    this.hitFlash = Math.max(0, this.hitFlash - realDt * 4);
    this.displayHp = damp(this.displayHp, this.hp, 6, realDt);

    // jouw sterren vliegen naar hem toe (in echte tijd, dus ook tijdens slow-motion)
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.t += realDt / 0.38;
      if (shot.t >= 1) {
        this.shots.splice(i, 1);
        if (this.alive) {
          FX.burst(this.x + randRange(-30, 30), this.y + randRange(60, 120), { count: 6, colors: ['#ffffff', '#ffd25e'], speed: [60, 200], life: [0.2, 0.4], real: true });
          this.damage(shot.damage, game);
        }
      }
    }

    // Made in Heaven-versnelling loopt af
    if (this.accelTime > 0) this.accelTime = Math.max(0, this.accelTime - worldDt);
    const targetFactor = this.accelTime > 0 ? BOSS.accelSpeed + (this.enraged ? 0.15 : 0) : (this.enraged ? 1.15 : 1);
    this.accelFactor = damp(this.accelFactor, targetFactor, 4, realDt);

    if (this.state === 'enter') {
      this.y = mix(-260, this.homeY, easeOutCubic(this.stateTime / 1.6));
      if (this.stateTime >= 1.6) { this.state = 'fight'; this.stateTime = 0; }
    } else if (this.state === 'fight') {
      // zweeft heen en weer boven het veld
      const range = game.fieldW * 0.3;
      this.x = game.fieldW / 2 + Math.sin(this.time * 0.45) * range;
      this.y = this.homeY + Math.sin(this.time * 1.3) * 8;
      this.updateAttacks(worldDt, game);
    } else if (this.state === 'dying') {
      this.y += worldDt * 20;
      if (rand() < 0.5) {
        FX.burst(this.x + randRange(-70, 70), this.y + randRange(20, 180), { count: 10, colors: ['#ffffff', '#ffe9a8', '#c7b8ff'], speed: [80, 320], life: [0.3, 0.8], real: true });
      }
      if (this.stateTime >= 1.6) {
        this.state = 'dead';
        FX.burst(this.x, this.y + 100, { count: 70, colors: ['#ffffff', '#ffe9a8', '#c7b8ff', '#ffd25e'], speed: [150, 600], size: [2, 6], life: [0.5, 1.4], real: true });
        game.onBossDefeated(this);
      }
    }
  }

  updateAttacks(dt, game) {
    if (this.windup) {
      this.windupTime -= dt;
      this.pose = 4;
      if (this.windupTime <= 0) {
        this.performAttack(this.windup, game);
        this.windup = null;
        this.pose = 0;
      }
      return;
    }
    this.attackTimer -= dt;
    if (this.attackTimer > 0) return;
    const gap = randRange(BOSS.attackGap[0], BOSS.attackGap[1]) * (this.enraged ? 0.65 : 1);
    this.attackTimer = gap;
    this.windup = BOSS_PATTERN[this.attackIndex % BOSS_PATTERN.length];
    this.attackIndex++;
    this.windupTime = 0.7;
    const callouts = { fan: 'PUCCI GOOIT ORBS!', discs: 'WHITESNAKE: DISCS!', accel: 'MADE IN HEAVEN!' };
    game.announce(callouts[this.windup], this.windup === 'discs' ? '#d9ccff' : this.windup === 'accel' ? '#ffffff' : COLORS.gold);
    Sound.play('latch', { volume: 0.7 });
  }

  performAttack(kind, game) {
    const speed = game.waves.settings.speed;
    const fromX = this.x, fromY = this.y + 110;
    if (kind === 'fan') {
      const count = this.enraged ? 7 : 5;
      for (let i = 0; i < count; i++) {
        const spread = (i / (count - 1) - 0.5) * 2;
        const orb = new Faller('gold', fromX, fromY, speed * 0.75, { vx: spread * 230, bonus: true });
        game.spawn(orb);
      }
      Sound.play('whoosh', { volume: 0.8 });
    } else if (kind === 'discs') {
      const count = this.enraged ? 4 : 3;
      const travel = (game.catcher.rimY - fromY) / (speed * 1.05);
      for (let i = 0; i < count; i++) {
        const targetX = clamp(game.catcher.x + (i - (count - 1) / 2) * 120 + randRange(-30, 30), 30, game.fieldW - 30);
        game.spawn(new Faller('disc', fromX, fromY, speed * 1.05, { vx: (targetX - fromX) / travel, keepVx: true }));
      }
      Sound.play('slice', { volume: 0.8 });
    } else if (kind === 'accel') {
      this.accelTime = BOSS.accelTime;
      this.pose = 2;
      if (!this.saidAccelerate) {
        this.saidAccelerate = true;
        Sound.playVoice('vAccelerate', { duration: 3.6, fadeOut: 0.6 });
      }
      Sound.play('accel', { volume: 0.9 });
      FX.flash('255,255,255', 0.25, 3);
      game.announce('DE TIJD VERSNELT!', '#ffffff');
    }
  }

  draw(time) {
    if (this.state === 'dead') return;
    const ctx = drawingContext;
    const bottom = this.y + 230;
    const height = 240;
    const pose = this.accelTime > 0 ? 2 : this.pose;
    const dyingFade = this.state === 'dying' ? 1 - this.stateTime / 1.6 : 1;
    // gouden aura
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    Art.drawGlow('heaven', pose, this.x, bottom, height, 'rgb(255, 236, 190)', (0.35 + pulse * 0.2 + this.hitFlash * 0.6) * dyingFade);
    // snelheidsstrepen tijdens versnelling
    if (this.accelTime > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const y = this.y + 40 + i * 18;
        const offset = (time * 900 + i * 61) % 260;
        ctx.beginPath();
        ctx.moveTo(this.x + 140 - offset, y);
        ctx.lineTo(this.x + 60 - offset, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    Art.draw('heaven', pose, this.x, bottom, height, { alpha: dyingFade });
    if (this.hitFlash > 0.05) Art.drawGlow('heaven', pose, this.x, bottom, height, 'rgb(255,255,255)', this.hitFlash * 0.8 * dyingFade);
    // waarschuwing vlak voor een aanval
    if (this.windup) {
      const r = 26 + (1 - this.windupTime / 0.7) * 30;
      ctx.save();
      ctx.strokeStyle = this.windup === 'discs' ? 'rgba(220,200,255,0.9)' : 'rgba(255,230,150,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y + 110, r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawShots() {
    for (const shot of this.shots) {
      const t = easeInCubic(shot.t);
      const u = 1 - t;
      const cx = shot.sx + shot.wobble, cy = (shot.sy + this.y) / 2;
      const x = u * u * shot.sx + 2 * u * t * cx + t * t * this.x;
      const y = u * u * shot.sy + 2 * u * t * cy + t * t * (this.y + 100);
      drawGlowSprite(Sprites.glowGold, x, y, 34, 0.9);
      drawSprite(Sprites.spark, x, y, 22, shot.t * 8);
    }
  }
}
