// ============================================================
//  effects.js — "juice": deeltjes, zwevende teksten, schokgolven,
//  schermschudden, flitsen en hit-stop (heel even bevriezen bij
//  een harde klap). Dit maakt elke actie voelbaar.
// ============================================================

const FX = {
  particles: [],
  texts: [],
  rings: [],
  trauma: 0,        // hoe hard het scherm schudt (0..1)
  hitStopTime: 0,   // zolang dit > 0 is, staat het spel heel even stil
  flashColor: '255,255,255',
  flashAlpha: 0,
  flashDecay: 5,
  shakeX: 0,
  shakeY: 0,
  time: 0,

  clear() {
    this.particles.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.trauma = 0;
    this.hitStopTime = 0;
    this.flashAlpha = 0;
  },

  maxParticles() {
    return Save.settings.particles ? 700 : 200;
  },

  // Een explosie van deeltjes.
  burst(x, y, options = {}) {
    const {
      count = 12, colors = ['#ffffff'], speed = [80, 260], size = [2, 5], life = [0.35, 0.8],
      gravity = 0, drag = 2.5, shape = 'dot', angle = 0, spread = TAU, real = false, glow = true, glyph = 'ゴ',
    } = options;
    const amount = Save.settings.particles ? count : Math.ceil(count * 0.4);
    for (let i = 0; i < amount; i++) {
      if (this.particles.length >= this.maxParticles()) this.particles.shift();
      const direction = angle + (rand() - 0.5) * spread;
      const velocity = randRange(speed[0], speed[1]);
      const maxLife = randRange(life[0], life[1]);
      this.particles.push({
        x, y,
        vx: Math.cos(direction) * velocity,
        vy: Math.sin(direction) * velocity,
        size: randRange(size[0], size[1]),
        color: pick(colors),
        life: maxLife,
        maxLife,
        gravity, drag, shape, real, glow, glyph,
        rot: rand() * TAU,
        spin: randRange(-8, 8),
      });
    }
  },

  // Een uitdijende ring (schokgolf).
  ring(x, y, options = {}) {
    const { color = '255,255,255', from = 10, to = 90, life = 0.45, width = 4, real = false } = options;
    this.rings.push({ x, y, from, to, life, maxLife: life, color, width, real });
  },

  // Zwevende tekst, bijvoorbeeld "+20" of "PERFECT!".
  text(x, y, str, options = {}) {
    const {
      size = 22, color = COLORS.white, life = 0.8, rise = 60, font = FONT_TITLE, stroke = COLORS.ink,
      skew = -0.12, pop = true, real = true, weight = '400',
    } = options;
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x, y, str, size, color, life, maxLife: life, rise, font, stroke, skew, pop, real, weight });
  },

  // Laat het scherm schudden (amount 0..1 wordt opgeteld).
  shake(amount) {
    if (!Save.settings.shake) return;
    this.trauma = Math.min(1, this.trauma + amount);
  },

  // Kleurflits over het hele scherm.
  flash(rgb = '255,255,255', alpha = 0.5, decay = 5) {
    const limit = Save.settings.flashes ? 1 : 0.18;
    this.flashColor = rgb;
    this.flashAlpha = Math.max(this.flashAlpha, Math.min(alpha, limit));
    this.flashDecay = decay;
  },

  hitStop(seconds) {
    this.hitStopTime = Math.max(this.hitStopTime, seconds);
  },

  // Dreigende "ゴゴゴ"-letters, zoals in de anime.
  menacing(fieldW, intensity) {
    if (rand() > intensity) return;
    const side = rand() < 0.5 ? randRange(20, fieldW * 0.18) : randRange(fieldW * 0.82, fieldW - 20);
    this.burst(side, randRange(160, 560), {
      count: 1, shape: 'glyph', glyph: rand() < 0.75 ? 'ゴ' : 'ド', colors: ['#c79bff', '#9d6bff', '#e7c6ff'],
      speed: [10, 30], angle: -Math.PI / 2, spread: 0.6, size: [20, 34], life: [1.2, 1.8], drag: 0.5, glow: false,
    });
  },

  update(dt, worldDt) {
    this.time += dt;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const step = p.real ? dt : worldDt;
      p.life -= step;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      const friction = Math.exp(-p.drag * step);
      p.vx *= friction;
      p.vy = p.vy * friction + p.gravity * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.rot += p.spin * step;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life -= ring.real ? dt : worldDt;
      if (ring.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const text = this.texts[i];
      text.life -= text.real ? dt : worldDt;
      if (text.life <= 0) this.texts.splice(i, 1);
    }
    // schudden neemt langzaam af
    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    const power = this.trauma * this.trauma * 16;
    this.shakeX = power * (Math.sin(this.time * 91.7) + Math.sin(this.time * 53.3) * 0.5) / 1.5;
    this.shakeY = power * (Math.sin(this.time * 77.1 + 1.3) + Math.sin(this.time * 41.9) * 0.5) / 1.5;
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * this.flashDecay);
  },

  drawParticles() {
    const ctx = drawingContext;
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 1.6);
      if (p.glow && p.shape !== 'glyph') ctx.globalCompositeOperation = 'lighter';
      if (p.shape === 'dot') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, TAU);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * t;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
      } else if (p.shape === 'star') {
        const s = p.size * 4 * (0.5 + 0.5 * t);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * 0.2);
        ctx.drawImage(Sprites.spark, -s / 2, -s / 2, s, s);
      } else if (p.shape === 'shard') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
      } else if (p.shape === 'glyph') {
        ctx.globalAlpha = Math.min(1, t * 2) * Math.min(1, (1 - t) * 6) * 0.85;
        ctx.translate(p.x, p.y);
        ctx.transform(1, 0, -0.2, 1, 0, 0);
        ctx.font = `900 ${p.size}px ${FONT_JP}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(20,6,40,0.9)';
        ctx.strokeText(p.glyph, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.glyph, 0, 0);
      }
      ctx.restore();
    }
    for (const ring of this.rings) {
      const t = 1 - ring.life / ring.maxLife;
      const radius = mix(ring.from, ring.to, easeOutCubic(t));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${ring.color},${(1 - t) * 0.9})`;
      ctx.lineWidth = ring.width * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  },

  drawTexts() {
    for (const text of this.texts) {
      const age = text.maxLife - text.life;
      const t = age / text.maxLife;
      const popScale = text.pop ? mix(1.6, 1, easeOutBack(Math.min(1, age / 0.18))) : 1;
      const alpha = Math.min(1, text.life / (text.maxLife * 0.35));
      const y = text.y - text.rise * easeOutCubic(t);
      drawText(text.str, text.x, y, {
        size: text.size * popScale, font: text.font, weight: text.weight, align: 'center', baseline: 'middle',
        color: text.color, stroke: text.stroke, strokeWidth: Math.max(2, text.size * 0.16), skew: text.skew, alpha,
      });
    }
  },

  drawFlash(width, height) {
    if (this.flashAlpha <= 0.002) return;
    const ctx = drawingContext;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(${this.flashColor},${this.flashAlpha})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};
