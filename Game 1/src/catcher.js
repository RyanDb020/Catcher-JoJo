// ============================================================
//  catcher.js — de bak onderin het scherm die jij bestuurt.
//
//  De beweging heeft optrekken en afremmen, zodat het strak maar
//  niet houterig voelt. Bij een vangst "squasht" de bak even
//  (hij wordt platter en breder) en bij hoge snelheid laat hij
//  JoJo-achtige nabeelden achter.
// ============================================================

class Catcher {
  constructor() {
    this.reset(FIELD.maxWidth);
  }

  reset(fieldW) {
    this.x = fieldW / 2;
    this.vx = 0;
    this.width = CATCHER.width;
    this.tilt = 0;
    this.squash = 0;       // vervorming door een vangst
    this.squashSpeed = 0;
    this.glow = 0;         // oplichten bij een vangst
    this.glowColor = '255,95,168';
    this.wideTime = 0;     // resterende tijd van de BREED-power-up
    this.afterimages = [];
    this.afterimageTimer = 0;
    this.hurtTime = 0;     // rood knipperen na schade
  }

  // De bovenrand van de bak: hier worden orbs gevangen.
  get rimY() {
    return FIELD.height - CATCHER.rimFromBottom;
  }

  get halfWidth() {
    return this.width / 2;
  }

  // Hoe breed de catcher moet zijn (power-ups en Stand-kaarten).
  targetWidth(perks) {
    let width = CATCHER.width * (1 + 0.12 * perks.star);
    if (this.wideTime > 0) width *= 1 + CATCHER.wideBonus;
    return width;
  }

  // Zit x in het middenstuk van de bak? Dan is het een PERFECT.
  isPerfect(x, perks) {
    const zone = CATCHER.perfectZone * (1 + 0.4 * perks.star);
    return Math.abs(x - this.x) <= this.width * zone;
  }

  update(dt, fieldW, perks, canMove) {
    const max = CATCHER.maxSpeed;
    if (canMove) {
      const dir = Input.direction();
      if (Input.pointerActive) {
        // Muis of vinger: de bak volgt je cursor, maar niet sneller dan zijn topsnelheid.
        const target = clamp(Input.pointerX, this.halfWidth, fieldW - this.halfWidth);
        const wanted = clamp((target - this.x) * 16, -max * 1.25, max * 1.25);
        this.vx = approach(this.vx, wanted, CATCHER.acceleration * 1.6 * dt);
      } else if (dir !== 0) {
        // Snel omkeren voelt beter: gebruik de rem-kracht als je van richting wisselt.
        const reversing = Math.sign(this.vx) !== 0 && Math.sign(this.vx) !== dir;
        const force = reversing ? CATCHER.braking : CATCHER.acceleration;
        this.vx = approach(this.vx, dir * max, force * dt);
      } else {
        this.vx = approach(this.vx, 0, CATCHER.braking * dt);
      }
    } else {
      this.vx = approach(this.vx, 0, CATCHER.braking * dt);
    }

    this.x += this.vx * dt;
    if (this.x < this.halfWidth) { this.x = this.halfWidth; this.vx = 0; }
    if (this.x > fieldW - this.halfWidth) { this.x = fieldW - this.halfWidth; this.vx = 0; }

    this.wideTime = Math.max(0, this.wideTime - dt);
    this.width = damp(this.width, this.targetWidth(perks), 12, dt);
    this.tilt = damp(this.tilt, (this.vx / max) * 0.13, 14, dt);
    this.glow = Math.max(0, this.glow - dt * 3);
    this.hurtTime = Math.max(0, this.hurtTime - dt);

    // veer-animatie voor de squash
    this.squashSpeed += (-this.squash * 420 - this.squashSpeed * 20) * dt;
    this.squash += this.squashSpeed * dt;

    // nabeelden bij hoge snelheid
    this.afterimageTimer -= dt;
    if (Math.abs(this.vx) > max * 0.55 && this.afterimageTimer <= 0) {
      this.afterimages.push({ x: this.x, tilt: this.tilt, width: this.width, life: 0.16 });
      this.afterimageTimer = 0.03;
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= dt;
      if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }
  }

  // Wordt aangeroepen bij een vangst: de bak veert even in.
  bump(strength, color) {
    this.squashSpeed -= strength * 5;
    this.glow = 1;
    if (color) this.glowColor = color;
  }

  hurt() {
    this.hurtTime = 0.5;
    this.squashSpeed += 6;
  }

  // ---------- tekenen ----------
  draw(energyBars, time) {
    const ctx = drawingContext;
    // nabeelden (paars, doorzichtig)
    for (const image of this.afterimages) {
      this.drawShape(image.x, image.tilt, image.width, 0, image.life / 0.16 * 0.3, true, energyBars, time);
    }
    // schaduw/licht op de vloer
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const shadowWidth = this.width * 1.1;
    const floorGlow = ctx.createRadialGradient(this.x, FLOOR_Y, 0, this.x, FLOOR_Y, shadowWidth * 0.6);
    floorGlow.addColorStop(0, 'rgba(170, 110, 255, 0.35)');
    floorGlow.addColorStop(1, 'rgba(170, 110, 255, 0)');
    ctx.fillStyle = floorGlow;
    ctx.beginPath();
    ctx.ellipse(this.x, FLOOR_Y, shadowWidth * 0.6, 12, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    this.drawThrusters(time);
    this.drawShape(this.x, this.tilt, this.width, this.squash, 1, false, energyBars, time);
  }

  // Kleine straalmotoren die feller branden als je beweegt.
  drawThrusters(time) {
    const ctx = drawingContext;
    const speed = Math.abs(this.vx) / CATCHER.maxSpeed;
    const flicker = 0.75 + 0.25 * Math.sin(time * 60);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      const x = this.x + side * this.width * 0.3;
      const y = this.rimY + CATCHER.height + 2;
      const length = (8 + speed * 18) * flicker;
      const gradient = ctx.createLinearGradient(x, y, x, y + length);
      gradient.addColorStop(0, 'rgba(120, 230, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(120, 120, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x, y + length);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawShape(x, tilt, width, squash, alpha, ghost, energyBars, time) {
    const ctx = drawingContext;
    const h = CATCHER.height;
    const top = this.rimY;
    const half = width / 2;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, top + h);
    ctx.rotate(tilt);
    ctx.scale(1 + squash * 0.7, 1 - squash);
    ctx.translate(0, -h);

    // vorm van de bak: breed van boven, smaller onderaan
    const bottomHalf = half * 0.74;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.lineTo(bottomHalf, h - 8);
    ctx.quadraticCurveTo(bottomHalf - 2, h, bottomHalf - 10, h);
    ctx.lineTo(-bottomHalf + 10, h);
    ctx.quadraticCurveTo(-bottomHalf + 2, h, -bottomHalf, h - 8);
    ctx.closePath();

    if (ghost) {
      ctx.fillStyle = 'rgba(160, 100, 255, 0.9)';
      ctx.fill();
      ctx.restore();
      return;
    }

    const body = ctx.createLinearGradient(0, 0, 0, h);
    body.addColorStop(0, '#5a3a9a');
    body.addColorStop(0.5, '#2a1856');
    body.addColorStop(1, '#130a28');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0b0614';
    ctx.stroke();

    // rood knipperen na schade
    if (this.hurtTime > 0 && Math.floor(this.hurtTime * 20) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 60, 90, 0.55)';
      ctx.fill();
    }

    // glans en paneel-lijnen (binnen de vorm van de bak)
    ctx.save();
    ctx.clip();
    const shine = ctx.createLinearGradient(-half, 0, half, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.18, 'rgba(255,255,255,0.16)');
    shine.addColorStop(0.32, 'rgba(255,255,255,0)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(-half, 0, width, h);
    ctx.strokeStyle = 'rgba(200, 160, 255, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-half * 0.86, 5);
    ctx.lineTo(-half * 0.3, h);
    ctx.moveTo(half * 0.86, 5);
    ctx.lineTo(half * 0.3, h);
    ctx.stroke();
    ctx.restore();

    // gouden rand onderaan
    ctx.beginPath();
    ctx.moveTo(-bottomHalf + 9, h - 1);
    ctx.lineTo(bottomHalf - 9, h - 1);
    ctx.strokeStyle = '#d9a03a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // opening van de bak (je kijkt er een beetje in)
    ctx.beginPath();
    ctx.ellipse(0, 1, half - 4, 7, 0, 0, TAU);
    const inner = ctx.createRadialGradient(0, 3, 2, 0, 1, half);
    inner.addColorStop(0, `rgba(${this.glowColor}, ${0.25 + this.glow * 0.65})`);
    inner.addColorStop(1, '#0b0618');
    ctx.fillStyle = inner;
    ctx.fill();

    // gouden rand
    ctx.beginPath();
    ctx.ellipse(0, 1, half - 2, 7.5, 0, 0, TAU);
    const rim = ctx.createLinearGradient(-half, 0, half, 0);
    rim.addColorStop(0, '#8a5a12');
    rim.addColorStop(0.3, '#ffe9a8');
    rim.addColorStop(0.55, '#e0a33a');
    rim.addColorStop(1, '#6e4508');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // het Joestar-stermerk in een gouden ring: gloeit feller met meer Stand Energy
    const starY = h * 0.45;
    const pulse = energyBars > 0 ? 0.5 + 0.5 * Math.sin(time * (3 + energyBars * 2)) : 0;
    const starGlow = 0.2 + energyBars * 0.22 + pulse * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, starGlow);
    ctx.drawImage(Sprites.glowGold, -20, starY - 20, 40, 40);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, starY, 10.5, 0, TAU);
    ctx.fillStyle = '#140a28';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e0a33a';
    ctx.stroke();
    starPath(ctx, 0, starY + 0.5, 5, 7, 3.1);
    ctx.fillStyle = energyBars >= ENERGY.bars ? '#fff6c8' : '#ffd25e';
    ctx.fill();

    // drie lampjes: één per volle energiebalk
    for (let i = 0; i < ENERGY.bars; i++) {
      const px = (i - 1) * half * 0.42, py = h - 9;
      const lit = i < energyBars;
      ctx.beginPath();
      ctx.moveTo(px, py - 3.5);
      ctx.lineTo(px + 3.5, py);
      ctx.lineTo(px, py + 3.5);
      ctx.lineTo(px - 3.5, py);
      ctx.closePath();
      ctx.fillStyle = lit ? '#ffe27a' : 'rgba(150, 110, 220, 0.35)';
      ctx.fill();
      if (lit) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + 0.3 * pulse;
        ctx.drawImage(Sprites.glowGold, px - 9, py - 9, 18, 18);
        ctx.restore();
      }
    }

    // lampjes aan de zijkant
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * half * 0.66, h * 0.4, 2.2, 0, TAU);
      ctx.fillStyle = 'rgba(120, 230, 255, 0.9)';
      ctx.fill();
    }
    ctx.restore();

    // gloed boven de bak bij een vangst
    if (this.glow > 0.02) {
      drawGlowSprite(Sprites.glowWhite, x, top + 2, width * 0.9, this.glow * 0.35);
    }
  }
}
