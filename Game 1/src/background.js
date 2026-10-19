// ============================================================
//  background.js — de ruimte-achtergrond.
//
//  - een nevel met een geringde planeet en een skyline (één keer
//    getekend en daarna hergebruikt, dat is snel)
//  - drie lagen sterren die bewegen met de "tijd" van de game:
//    bij Time Stop staan ze stil, bij Made in Heaven worden het strepen
//  - een grote, vage klok: tijd is het thema van de game
// ============================================================

const FLOOR_Y = FIELD.height - 30; // de "vloer": hier vallen gemiste orbs kapot

const Background = {
  stars: [],
  nebula: null,
  clockFace: null,
  clockTime: 0,
  gridTime: 0,
  speed: 1,
  warp: 0,       // 0..1: sterren worden strepen (Made in Heaven)
  danger: 0,     // 0..1: rode gloed als je bijna dood bent
  parallax: 0,   // -1..1: de achtergrond schuift een beetje mee met de catcher
  time: 0,
  shooting: [],  // vallende sterren
  shootTimer: 3,
  dust: [],      // zwevende stofdeeltjes onderin
  auroraCanvas: null,
  auroraTime: -1,

  init() {
    for (let i = 0; i < 190; i++) {
      this.stars.push({ x: rand(), y: rand(), z: randRange(0.15, 1), twinkle: rand() * TAU });
    }
    for (let i = 0; i < 46; i++) {
      this.dust.push({ x: rand(), y: randRange(0.55, 1), speed: randRange(0.01, 0.035), size: randRange(1, 3), phase: rand() * TAU });
    }
    this.clockFace = this.buildClockFace();
  },

  // De nevel is net zo groot als het venster (op halve resolutie).
  resize(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.round(width / 2));
    canvas.height = Math.max(2, Math.round(height / 2));
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height, big = Math.max(w, h);

    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#0c0620');
    base.addColorStop(0.55, '#170b31');
    base.addColorStop(1, '#090414');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const clouds = [
      [0.18, 0.22, 0.5, 'rgba(130, 60, 220, 0.32)'],
      [0.8, 0.15, 0.42, 'rgba(255, 80, 170, 0.15)'],
      [0.58, 0.58, 0.6, 'rgba(70, 40, 170, 0.33)'],
      [0.08, 0.78, 0.42, 'rgba(40, 170, 220, 0.11)'],
      [0.92, 0.75, 0.38, 'rgba(200, 90, 255, 0.18)'],
      [0.42, 0.1, 0.3, 'rgba(255, 170, 90, 0.07)'],
    ];
    for (const [x, y, r, color] of clouds) {
      const gradient = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * big);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
    // sterrenstof (altijd hetzelfde patroon dankzij een vaste seed)
    let seed = 7;
    const seeded = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = `rgba(255, 240, 255, ${seeded() * 0.35})`;
      ctx.fillRect(seeded() * w, seeded() * h, 1, 1);
    }
    // Breed scherm: planeet rechts aan de rand. Staand scherm: bovenin, boven het speelveld.
    if (w >= h) this.drawPlanet(ctx, w * 0.93, h * 0.34, Math.min(w, h) * 0.075);
    else this.drawPlanet(ctx, w * 0.8, h * 0.055, Math.min(w, h) * 0.06);
    this.drawSkyline(ctx, w, h, seeded);
    const horizon = ctx.createLinearGradient(0, h * 0.72, 0, h);
    horizon.addColorStop(0, 'rgba(150, 70, 255, 0)');
    horizon.addColorStop(1, 'rgba(150, 70, 255, 0.22)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    this.nebula = canvas;
  },

  drawPlanet(ctx, x, y, r) {
    const ring = (front) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.1, r * 0.5, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.strokeStyle = 'rgba(220, 200, 255, 0.45)';
      ctx.lineWidth = r * 0.16;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 220, 170, 0.25)';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      ctx.restore();
    };
    ring(false);
    const body = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
    body.addColorStop(0, '#b6b2ea');
    body.addColorStop(0.5, '#5a4f9c');
    body.addColorStop(1, '#16112f');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#e6d9ff';
    for (let i = -2; i <= 2; i++) ctx.fillRect(x - r, y + i * r * 0.32, r * 2, r * 0.1);
    ctx.restore();
    ring(true);
  },

  drawSkyline(ctx, w, h, seeded) {
    ctx.fillStyle = '#07030f';
    let x = 0;
    while (x < w) {
      const bw = 8 + seeded() * 26;
      const bh = h * (0.04 + seeded() * 0.12) * (Math.abs(x / w - 0.5) * 1.6 + 0.4);
      ctx.fillRect(x, h - bh, bw + 1, bh);
      // een paar verlichte ramen
      for (let i = 0; i < 3; i++) {
        if (seeded() < 0.45) {
          ctx.fillStyle = seeded() < 0.5 ? 'rgba(255, 210, 120, 0.5)' : 'rgba(200, 150, 255, 0.45)';
          ctx.fillRect(x + seeded() * bw, h - seeded() * bh, 1.5, 1.5);
          ctx.fillStyle = '#07030f';
        }
      }
      x += bw;
    }
  },

  buildClockFace() {
    const size = 600;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = size / 2;
    ctx.strokeStyle = '#e8d5ff';
    ctx.fillStyle = '#e8d5ff';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(c, c, c - 8, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c, c, c - 30, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, c * 0.38, 0, TAU); ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      const inner = i % 5 === 0 ? c - 56 : c - 42;
      ctx.lineWidth = i % 5 === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
      ctx.lineTo(c + Math.cos(a) * (c - 32), c + Math.sin(a) * (c - 32));
      ctx.stroke();
    }
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.font = `700 34px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    numerals.forEach((label, i) => {
      const a = (i / 12) * TAU - Math.PI / 2;
      ctx.fillText(label, c + Math.cos(a) * (c - 92), c + Math.sin(a) * (c - 92));
    });
    return canvas;
  },

  // timeScale: 0 = tijd staat stil, 1 = normaal, >1 = versneld
  update(dt, timeScale, warpTarget = 0, dangerTarget = 0, parallaxTarget = 0) {
    this.speed = timeScale;
    this.warp = damp(this.warp, warpTarget, 3, dt);
    this.danger = damp(this.danger, dangerTarget, 3, dt);
    this.parallax = damp(this.parallax, parallaxTarget, 2, dt);
    const worldDt = dt * timeScale;
    this.time += worldDt;

    // af en toe een vallende ster
    this.shootTimer -= worldDt;
    if (this.shootTimer <= 0 && this.warp < 0.2) {
      this.shootTimer = randRange(2.5, 6.5);
      const fromLeft = chance(0.5);
      this.shooting.push({
        x: fromLeft ? randRange(0.05, 0.5) : randRange(0.5, 0.95), y: randRange(0.04, 0.3),
        vx: (fromLeft ? 1 : -1) * randRange(0.5, 0.8), vy: randRange(0.18, 0.32), life: 0.9, maxLife: 0.9,
      });
    }
    for (let i = this.shooting.length - 1; i >= 0; i--) {
      const star = this.shooting[i];
      star.life -= Math.abs(worldDt);
      star.x += star.vx * worldDt;
      star.y += star.vy * worldDt;
      if (star.life <= 0) this.shooting.splice(i, 1);
    }
    // stof zweeft langzaam omhoog
    for (const mote of this.dust) {
      mote.y -= mote.speed * worldDt;
      mote.phase += worldDt * 0.8;
      if (mote.y < 0.5) { mote.y = 1.02; mote.x = rand(); }
      if (mote.y > 1.03) mote.y = 0.52;
    }
    this.clockTime += worldDt * (1 + this.warp * 40);
    this.gridTime += worldDt;
    for (const star of this.stars) {
      // gewone drift naar beneden...
      star.y += star.z * 0.014 * worldDt;
      // ...en bij warp schieten ze weg vanuit het midden
      if (this.warp > 0.01) {
        const dx = star.x - 0.5, dy = star.y - 0.5;
        const push = this.warp * 2.4 * star.z * dt * (0.2 + Math.hypot(dx, dy) * 3);
        star.x += dx * push;
        star.y += dy * push;
      }
      if (star.y > 1.02 || star.y < -0.02 || star.x < -0.02 || star.x > 1.02) {
        if (this.warp > 0.2) {
          star.x = 0.5 + randRange(-0.08, 0.08);
          star.y = 0.5 + randRange(-0.08, 0.08);
        } else {
          // bij terugspoelen (negatieve tijd) komen nieuwe sterren van onderen
          star.x = rand();
          star.y = worldDt < 0 ? 1.01 : -0.01;
        }
      }
      if (timeScale > 0) star.twinkle += dt * 3 * star.z;
    }
  },

  // Tekent de achtergrond over het hele venster (schermcoördinaten).
  draw(width, height) {
    const ctx = drawingContext;
    // de nevel is iets groter dan het scherm en schuift mee met de catcher (diepte!)
    const shift = this.parallax * width * 0.02;
    const breathe = 1 + 0.01 * Math.sin(this.time * 0.25);
    if (this.nebula) {
      const w = width * 1.06 * breathe, h = height * 1.06 * breathe;
      ctx.drawImage(this.nebula, (width - w) / 2 - shift, (height - h) / 2, w, h);
    } else {
      ctx.fillStyle = '#0c0620';
      ctx.fillRect(0, 0, width, height);
    }
    this.drawAurora(width, height, shift);

    // grote vage klok in het midden
    const size = Math.min(width, height) * 0.92;
    ctx.save();
    ctx.translate(width / 2, height * 0.47);
    ctx.globalAlpha = 0.045 + this.warp * 0.12;
    ctx.drawImage(this.clockFace, -size / 2, -size / 2, size, size);
    ctx.strokeStyle = '#e8d5ff';
    ctx.lineCap = 'round';
    const hours = this.clockTime / 60;
    const minutes = this.clockTime / 5;
    for (const [angle, length, widthLine] of [[hours, 0.24, 9], [minutes, 0.36, 5], [this.clockTime, 0.4, 2]]) {
      ctx.save();
      ctx.rotate(angle * TAU / 12);
      ctx.lineWidth = widthLine * size / 600;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.04);
      ctx.lineTo(0, -size * length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // sterren
    ctx.save();
    for (const star of this.stars) {
      const x = star.x * width, y = star.y * height;
      const brightness = 0.35 + 0.65 * star.z * (0.75 + 0.25 * Math.sin(star.twinkle));
      if (this.warp > 0.05) {
        const dx = star.x - 0.5, dy = star.y - 0.5;
        const length = this.warp * 140 * star.z * (0.3 + Math.hypot(dx, dy) * 2);
        const norm = Math.max(0.001, Math.hypot(dx, dy));
        ctx.strokeStyle = `rgba(235, 220, 255, ${brightness})`;
        ctx.lineWidth = 1 + star.z * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - (dx / norm) * length, y - (dy / norm) * length);
        ctx.stroke();
      } else {
        const s = 0.8 + star.z * 2.2;
        ctx.fillStyle = `rgba(240, 228, 255, ${brightness})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        if (star.z > 0.85) {
          ctx.fillStyle = `rgba(200, 160, 255, ${brightness * 0.25})`;
          ctx.fillRect(x - s * 1.5, y - 0.5, s * 3, 1);
          ctx.fillRect(x - 0.5, y - s * 1.5, 1, s * 3);
        }
      }
    }
    // de helderste sterren fonkelen met een kruisje van licht
    ctx.globalCompositeOperation = 'lighter';
    for (const star of this.stars) {
      if (star.z < 0.93 || this.warp > 0.05) continue;
      const twinkle = Math.max(0, Math.sin(star.twinkle * 1.7));
      const size = 6 + twinkle * 16;
      ctx.globalAlpha = 0.25 + twinkle * 0.6;
      ctx.drawImage(Sprites.spark, star.x * width - shift * star.z - size / 2, star.y * height - size / 2, size, size);
    }
    // vallende sterren
    for (const shooting of this.shooting) {
      const alpha = Math.sin(Math.PI * (shooting.life / shooting.maxLife));
      const x = shooting.x * width, y = shooting.y * height;
      const gradient = ctx.createLinearGradient(x, y, x - shooting.vx * width * 0.18, y - shooting.vy * height * 0.18);
      gradient.addColorStop(0, `rgba(255, 245, 230, ${0.9 * alpha})`);
      gradient.addColorStop(1, 'rgba(200, 160, 255, 0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - shooting.vx * width * 0.18, y - shooting.vy * height * 0.18);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.drawImage(Sprites.glowWhite, x - 9, y - 9, 18, 18);
    }
    // zwevend stof onderin
    for (const mote of this.dust) {
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(mote.phase);
      const x = mote.x * width + Math.sin(mote.phase) * 12 - shift * 1.5;
      const size = mote.size * 5;
      ctx.drawImage(Sprites.glowPurple, x - size / 2, mote.y * height - size / 2, size, size);
    }
    ctx.restore();

    // rode rand als je nog maar één leven hebt
    if (this.danger > 0.01) {
      const pulse = 0.6 + 0.4 * Math.sin(FX.time * 5);
      const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.75);
      gradient.addColorStop(0, 'rgba(255, 30, 60, 0)');
      gradient.addColorStop(1, `rgba(255, 30, 60, ${0.28 * this.danger * pulse})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  },

  // Noorderlicht: zachte gordijnen van licht bovenin de lucht.
  // Het is wazig en beweegt langzaam, dus we tekenen het op lage resolutie
  // en maar 20 keer per seconde. Dat scheelt veel rekenwerk.
  drawAurora(width, height, shift) {
    const lowW = Math.max(32, Math.round(width / 6)), lowH = Math.max(32, Math.round(height / 6));
    if (!this.auroraCanvas || this.auroraCanvas.width !== lowW || this.auroraCanvas.height !== lowH) {
      this.auroraCanvas = document.createElement('canvas');
      this.auroraCanvas.width = lowW;
      this.auroraCanvas.height = lowH;
      this.auroraTime = -1;
    }
    if (Math.abs(this.time - this.auroraTime) > 0.05 || this.auroraTime < 0) {
      this.auroraTime = this.time;
      this.paintAurora(this.auroraCanvas.getContext('2d'), lowW, lowH);
    }
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - this.warp;
    ctx.drawImage(this.auroraCanvas, -shift * 0.5, 0, width, height);
    ctx.restore();
  },

  paintAurora(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (let band = 0; band < 2; band++) {
      const baseY = h * (0.13 + band * 0.07);
      const color = band === 0 ? '90, 230, 210' : '190, 110, 255';
      for (let x = 0; x < w; x += 2) {
        const wx = x * 6; // in "schermpixels"
        const wave = Math.sin(wx * 0.0035 + this.time * (0.25 + band * 0.1) + band * 2);
        const wave2 = Math.sin(wx * 0.011 - this.time * 0.4 + band);
        const y = baseY + wave * h * 0.035;
        const length = h * (0.09 + 0.05 * (wave2 * 0.5 + 0.5));
        const alpha = 0.08 + 0.08 * (wave2 * 0.5 + 0.5);
        const gradient = ctx.createLinearGradient(0, y - length * 0.3, 0, y + length);
        gradient.addColorStop(0, `rgba(${color}, 0)`);
        gradient.addColorStop(0.3, `rgba(${color}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y - length * 0.3, 2, length * 1.3);
      }
    }
  },

  // Vloer van het speelveld (in speelveld-coördinaten): een zachte lichtlijn
  // met een bewegend raster eronder, zoals in een synthwave-arcade.
  drawFloor(fieldW) {
    const ctx = drawingContext;
    ctx.save();
    const glow = ctx.createLinearGradient(0, FLOOR_Y - 26, 0, FIELD.height);
    glow.addColorStop(0, 'rgba(140, 80, 255, 0)');
    glow.addColorStop(0.5, 'rgba(140, 80, 255, 0.16)');
    glow.addColorStop(1, 'rgba(60, 20, 120, 0.35)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, FLOOR_Y - 26, fieldW, FIELD.height - FLOOR_Y + 26);

    ctx.beginPath();
    ctx.rect(0, FLOOR_Y, fieldW, FIELD.height - FLOOR_Y);
    ctx.clip();
    ctx.strokeStyle = 'rgba(190, 140, 255, 0.22)';
    ctx.lineWidth = 1;
    // lijnen die naar de horizon toe lopen (perspectief)
    const centerX = fieldW / 2;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * 40, FLOOR_Y);
      ctx.lineTo(centerX + i * 200, FIELD.height + 60);
      ctx.stroke();
    }
    const offset = (this.gridTime * 0.6) % 1;
    for (let i = 0; i < 5; i++) {
      const t = (i + offset) / 5;
      const y = FLOOR_Y + (FIELD.height - FLOOR_Y) * t * t;
      ctx.globalAlpha = t;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(fieldW, y);
      ctx.stroke();
    }
    ctx.restore();

    // de lichtlijn zelf
    const line = ctx.createLinearGradient(0, 0, fieldW, 0);
    line.addColorStop(0, 'rgba(200, 150, 255, 0)');
    line.addColorStop(0.5, 'rgba(230, 200, 255, 0.75)');
    line.addColorStop(1, 'rgba(200, 150, 255, 0)');
    ctx.fillStyle = line;
    ctx.fillRect(0, FLOOR_Y - 1, fieldW, 2);
  },
};
