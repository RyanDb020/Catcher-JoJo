// ============================================================
//  objects.js — alles wat naar beneden valt.
//
//  orb   = roze orb (vangen! missen kost een leven)
//  gold  = gouden orb (veel punten, missen mag)
//  bomb  = bom van Killer Queen (NIET vangen)
//  life  = lieveheersbeestje (+1 leven)
//  arrow = Stand Arrow (+1 energiebalk)
//  wide  = power-up: bredere catcher
//  disc  = DISC van de eindbaas (blokkeert je Stand)
// ============================================================

// Korte uitleg onder de power-ups, zodat nieuwe spelers snappen wat ze zijn.
const PICKUP_LABELS = { life: '+1 LEVEN', arrow: '+ENERGIE', wide: 'BREED' };

class Faller {
  constructor(type, x, y, speed, options = {}) {
    this.type = type;
    this.def = OBJECT_TYPES[type];
    this.r = this.def.radius;
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.vx = options.vx || 0;
    this.vy = speed;
    this.zig = options.zig || null;  // slingerbeweging: { baseX, amp, freq, phase }
    this.zigTime = 0;
    this.rot = rand() * TAU;
    this.spin = randRange(-1.2, 1.2);
    this.age = 0;
    this.state = 'fall';     // 'fall' (valt), 'home' (vliegt naar de catcher), 'dead' (weg)
    this.passed = false;     // al voorbij de rand van de catcher?
    this.targeted = false;   // er is al een vuist van Star Platinum onderweg
    this.cracked = false;    // geraakt door The World tijdens Time Stop
    this.home = null;
    this.fuseTimer = rand() * 0.05;
    this.trail = [];
    this.trailTimer = 0;
    this.bonus = options.bonus || false; // geworpen door de eindbaas (missen kost niets)
    this.keepVx = options.keepVx || false; // zijwaartse snelheid niet laten afnemen (gemikte discs)
  }

  get alive() {
    return this.state !== 'dead';
  }

  get isGood() {
    return this.def.good;
  }

  // Moet je deze vangen? (Missen kost een leven.)
  get mustCatch() {
    return this.def.missHurts && !this.bonus;
  }

  update(worldDt, realDt, catcher, fieldW, magnet) {
    if (this.state === 'home') {
      this.updateHoming(realDt, catcher);
      return;
    }
    this.age += worldDt;
    this.prevY = this.y;
    this.y += this.vy * worldDt;

    if (this.zig) {
      this.zigTime += worldDt;
      this.x = this.zig.baseX + Math.sin(this.zigTime * this.zig.freq + this.zig.phase) * this.zig.amp;
    } else if (this.vx !== 0) {
      this.x += this.vx * worldDt;
      // tegen de zijkant stuiteren
      if (this.x < this.r) { this.x = this.r; this.vx = Math.abs(this.vx); }
      if (this.x > fieldW - this.r) { this.x = fieldW - this.r; this.vx = -Math.abs(this.vx); }
      if (!this.keepVx) this.vx *= Math.exp(-0.6 * worldDt);
    }

    // C-Moon-kaart: goede objecten worden naar de catcher getrokken
    if (magnet > 0 && this.isGood && !this.passed && worldDt > 0) {
      const dy = catcher.rimY - this.y;
      const dx = catcher.x - this.x;
      if (dy > 0 && dy < 300 && Math.abs(dx) < magnet) {
        const pull = Math.sign(dx) * Math.min(Math.abs(dx), 260 * worldDt * (1 - dy / 300));
        if (this.zig) this.zig.baseX += pull; else this.x += pull;
      }
    }

    this.rot += this.spin * worldDt;

    // spoor bij slingerende orbs
    if (this.zig && worldDt > 0) {
      this.trailTimer -= worldDt;
      if (this.trailTimer <= 0) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();
        this.trailTimer = 0.035;
      }
    }
  }

  // Laat het object naar de catcher vliegen (Stand-aanvallen).
  startHoming(duration = 0.38) {
    this.state = 'home';
    this.home = {
      t: 0,
      duration,
      sx: this.x,
      sy: this.y,
      cx: this.x + randRange(-70, 70),
      cy: Math.min(this.y, 420) - randRange(40, 110),
      arrived: false,
    };
  }

  updateHoming(dt, catcher) {
    const home = this.home;
    home.t = Math.min(1, home.t + dt / home.duration);
    const t = easeInOutSine(home.t);
    const tx = catcher.x, ty = catcher.rimY + 4;
    const u = 1 - t;
    // kwadratische Bézier-curve: mooie boog naar de catcher
    this.x = u * u * home.sx + 2 * u * t * home.cx + t * t * tx;
    this.y = u * u * home.sy + 2 * u * t * home.cy + t * t * ty;
    this.rot += dt * 10;
    if (home.t >= 1) home.arrived = true;
  }

  draw(time) {
    const ctx = drawingContext;
    const bob = Math.sin(time * 4 + this.rot) * 2;
    if (this.state === 'home') {
      // lichtspoor tijdens het vliegen
      drawGlowSprite(this.type === 'gold' ? Sprites.glowGold : Sprites.glowPink, this.x, this.y, 56, 0.7);
    }
    this.drawPortal();
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      drawSprite(Sprites.orb, point.x, point.y, 40 * (i + 1) / this.trail.length, 0, 0.12 * (i + 1) / this.trail.length);
    }
    // bewegingsspoor: een paar vage kopieën boven de orb (hoe sneller, hoe langer)
    if (this.state === 'fall' && (this.type === 'orb' || this.type === 'gold') && Game.timeScale() > 0.05) {
      const sprite = this.type === 'gold' ? Sprites.gold : Sprites.orb;
      const stretch = this.vy * 0.045;
      for (let i = 1; i <= 3; i++) drawSprite(sprite, this.x, this.y - stretch * i, 60 - i * 8, this.rot * 0.25, 0.16 - i * 0.04);
    }
    if (this.type === 'life' || this.type === 'arrow') this.drawSunburst(time, bob);
    if (this.type === 'bomb' && this.state === 'fall') this.drawDanger(time);
    switch (this.type) {
      case 'orb':
        drawSprite(Sprites.orb, this.x, this.y, 60, this.rot * 0.25);
        break;
      case 'gold': {
        const pulse = 0.5 + 0.5 * Math.sin(time * 8 + this.rot);
        drawGlowSprite(Sprites.glowGold, this.x, this.y, 60 + pulse * 14, 0.35 + pulse * 0.25);
        drawSprite(Sprites.gold, this.x, this.y, 62, this.rot * 0.3);
        break;
      }
      case 'bomb': {
        const wobble = Math.sin(time * 9 + this.rot) * 0.12;
        drawSprite(Sprites.bomb, this.x, this.y, 64, wobble);
        // brandende lont
        const fx = this.x + Math.cos(wobble - 1.2) * 23, fy = this.y + Math.sin(wobble - 1.2) * 23 - 4;
        const flicker = 0.7 + 0.3 * Math.sin(time * 40 + this.rot * 3);
        drawGlowSprite(Sprites.glowGold, fx, fy, 22 * flicker, 0.95);
        drawGlowSprite(Sprites.glowRed, fx, fy, 34 * flicker, 0.5);
        if (this.cracked) this.drawCracks(ctx);
        break;
      }
      case 'life':
        drawGlowSprite(Sprites.glowGreen, this.x, this.y + bob, 70, 0.35 + 0.15 * Math.sin(time * 5));
        drawSprite(Sprites.life, this.x, this.y + bob, 62, Math.sin(time * 3 + this.rot) * 0.2);
        break;
      case 'arrow':
        drawGlowSprite(Sprites.glowGold, this.x, this.y + bob, 76, 0.4 + 0.2 * Math.sin(time * 6));
        drawSprite(Sprites.arrow, this.x, this.y + bob, 64, Math.sin(time * 2.5 + this.rot) * 0.25);
        break;
      case 'wide':
        drawGlowSprite(Sprites.glowCyan, this.x, this.y + bob, 66, 0.35);
        drawSprite(Sprites.wide, this.x, this.y + bob, 60, 0);
        break;
      case 'disc':
        drawGlowSprite(Sprites.glowPurple, this.x, this.y, 64, 0.5);
        drawSprite(Sprites.disc, this.x, this.y, 58, this.age * 7);
        break;
    }
    const label = PICKUP_LABELS[this.type];
    if (label && this.state === 'fall') {
      drawText(label, this.x, this.y + 33 + bob, {
        size: 10, align: 'center', baseline: 'middle', color: '#fff2c6', stroke: COLORS.ink, strokeWidth: 3, spacing: 1,
      });
    }
  }

  // Een klein portaal bovenin het scherm waar het object uit komt.
  drawPortal() {
    if (this.state !== 'fall' || this.age > 0.6 || this.bonus) return;
    const t = this.age / 0.6;
    const colors = { orb: '255,95,168', gold: '255,206,90', bomb: '255,64,87', disc: '200,180,255' };
    const color = colors[this.type] || '94,231,255';
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${color}, ${0.8 * (1 - t)})`;
    ctx.lineWidth = 3 * (1 - t) + 1;
    ctx.beginPath();
    ctx.ellipse(this.x, 4, 14 + t * 30, 4 + t * 6, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1 - t;
    ctx.drawImage(Sprites.spark, this.x - 18, -14, 36, 36);
    ctx.restore();
  }

  // Draaiende lichtstralen achter een power-up (zodat je hem niet mist).
  drawSunburst(time, bob) {
    const ctx = drawingContext;
    const color = this.type === 'life' ? '120, 255, 170' : '255, 220, 120';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(this.x, this.y + bob);
    ctx.rotate(time * 0.8);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(TAU / 8);
      const gradient = ctx.createLinearGradient(0, 0, 0, -48);
      gradient.addColorStop(0, `rgba(${color}, 0.35)`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.lineTo(9, -48);
      ctx.lineTo(-9, -48);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Rode waarschuwingsring als een bom vlak boven je catcher hangt.
  drawDanger(time) {
    const catcher = Game.catcher;
    const above = catcher.rimY - this.y;
    if (above < 0 || above > 230 || Math.abs(this.x - catcher.x) > catcher.halfWidth + 60) return;
    const close = 1 - above / 230;
    const pulse = 0.5 + 0.5 * Math.sin(time * 18);
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 64, 87, ${(0.35 + pulse * 0.45) * close})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y + 2, 28 + pulse * 6, 0, TAU);
    ctx.stroke();
    // rode gloed op de vloer, precies waar hij gaat landen
    const glow = ctx.createRadialGradient(this.x, FLOOR_Y, 0, this.x, FLOOR_Y, 70);
    glow.addColorStop(0, `rgba(255, 50, 80, ${0.35 * close})`);
    glow.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(this.x, FLOOR_Y, 70, 14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Barsten op een bom die door The World is geraakt.
  drawCracks(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y + 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const angle of [0.3, 1.9, 3.4, 4.8]) {
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * 9, Math.sin(angle) * 9);
      ctx.lineTo(Math.cos(angle + 0.35) * 17, Math.sin(angle + 0.35) * 17);
    }
    ctx.stroke();
    ctx.restore();
  }
}
