// ============================================================
//  heaven-shots.js — de "camera-shots" van de Made in Heaven-scène.
//
//  Gebaseerd op hoe de anime het laat zien (Stone Ocean, afl. 36-38):
//   - Pucci baadt in licht: "It is complete! The power of gravity
//     is permeating my body!"
//   - zwaartekracht: stenen worden omhoog en rond getrokken
//   - Made in Heaven heeft een snelheidsmeter als gezicht, klokken op
//     zijn lichaam en munt- en roze veren in de nek
//   - bij de versnelling draait de zon steeds sneller langs de hemel,
//     tot er alleen nog een lichtstreep over is
//   - aan het eind wordt alles in een fel licht gezogen (singulariteit)
//
//  Elke shot is een functie die één beeld tekent. De tijd t loopt vanaf
//  het begin van de scène (zie HEAVEN_TIMING in heaven.js).
// ============================================================

// Plekken in de Pucci-tekeningen (pixels binnen één pose van 512 x 512).
const HEAVEN_POINTS = {
  pucciFace5: [175, 64],   // Pucci's gezicht in pose 5 (biddend)
  horseEye5: [300, 96],    // het klok-oog van Made in Heaven in pose 5
  pucciChest0: [200, 170], // midden van Pucci in pose 0
};

// Momenten binnen de manifestatie (seconden na T.manifest).
const MANIFEST_SHOTS = { reveal: 0, gauge: 1.8, limit: 3.0 };
const PRAYER_CLOSEUP = 1.5; // zo lang duurt de close-up van Pucci's gezicht

const HeavenShots = {
  rocks: [],
  rockSprites: null,
  skyline: null,

  // Nieuwe scène: stenen klaarzetten die door de zwaartekracht bewegen.
  start() {
    this.rocks = [];
    for (let i = 0; i < 30; i++) {
      this.rocks.push({
        x: rand(), y: randRange(0.55, 1.25), speed: randRange(0.04, 0.14), size: randRange(10, 34),
        rot: rand() * TAU, spin: randRange(-1.2, 1.2), sprite: i % 5,
        angle: rand() * TAU, orbit: randRange(0.22, 0.5), orbitSpeed: randRange(0.5, 1.2) * (i % 2 ? 1 : -1),
      });
    }
  },

  update(dt, scene) {
    const orbiting = scene.phase === 'manifest';
    for (const rock of this.rocks) {
      rock.rot += rock.spin * dt;
      if (orbiting) rock.angle += rock.orbitSpeed * dt * (1 + scene.phaseProgress('manifest') * 2);
      else rock.y -= rock.speed * dt; // zwaartekracht omgekeerd: stenen stijgen op
      if (rock.y < -0.1) rock.y = 1.15;
    }
  },

  // ---------- hulpmiddelen ----------
  buildRocks() {
    this.rockSprites = [];
    for (let k = 0; k < 5; k++) {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.translate(48, 48);
      ctx.beginPath();
      const corners = 7 + k;
      for (let i = 0; i < corners; i++) {
        const a = (i / corners) * TAU;
        const r = 26 + ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1 * 16;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      const body = ctx.createLinearGradient(0, -40, 0, 40);
      body.addColorStop(0, '#6d5a8a');
      body.addColorStop(0.5, '#2c2240');
      body.addColorStop(1, '#120c1c');
      ctx.fillStyle = body;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 230, 190, 0.55)'; // licht van boven op de rand
      ctx.stroke();
      this.rockSprites.push(canvas);
    }
  },

  // Tekent een uitsnede van een pose: het punt (px, py) in de tekening komt op
  // (sx, sy) op het scherm. zoom 1 = de hele pose is net zo hoog als het scherm.
  drawCrop(key, pose, px, py, sx, sy, zoom, H, options = {}) {
    const art = options.silhouette ? Art.silhouette(key, pose, options.silhouette) : Art.pose(key, pose);
    if (!art) return;
    const scale = (H * zoom) / art.height;
    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha *= options.alpha === undefined ? 1 : options.alpha;
    if (options.haze) this.drawHazed(art, sx - px * scale, sy - py * scale, art.width * scale, art.height * scale, options.haze);
    else ctx.drawImage(art, sx - px * scale, sy - py * scale, art.width * scale, art.height * scale);
    ctx.restore();
  },

  // Hittegolf: het plaatje in horizontale stroken die een beetje heen en weer golven.
  drawHazed(canvas, dx, dy, dw, dh, amount) {
    const ctx = drawingContext;
    const strips = 48;
    const sh = canvas.height / strips, dhStrip = dh / strips;
    const time = HeavenReset.t;
    for (let i = 0; i < strips; i++) {
      const wave = Math.sin(i * 0.55 + time * 7) * 0.6 + Math.sin(i * 0.23 - time * 3) * 0.4;
      ctx.drawImage(canvas, 0, i * sh, canvas.width, sh + 0.5, dx + wave * amount, dy + i * dhStrip, dw, dhStrip + 0.6);
    }
  },

  drawRocks(W, H, scene, inFront) {
    if (!this.rockSprites) this.buildRocks();
    const ctx = drawingContext;
    const orbiting = scene.phase === 'manifest';
    const cx = W * (W < H ? 0.5 : 0.62), cy = H * 0.52;
    for (const rock of this.rocks) {
      let x, y, scale = 1;
      if (orbiting) {
        const front = Math.sin(rock.angle) > 0;
        if (front !== inFront) continue;
        x = cx + Math.cos(rock.angle) * rock.orbit * W;
        y = cy + Math.sin(rock.angle) * rock.orbit * H * 0.32;
        scale = front ? 1.25 : 0.75;
      } else {
        if (inFront) continue;
        x = rock.x * W;
        y = rock.y * H;
      }
      const size = rock.size * scale * (H / 720);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rock.rot);
      ctx.globalAlpha = orbiting ? 0.95 : 0.8;
      ctx.drawImage(this.rockSprites[rock.sprite], -size, -size, size * 2, size * 2);
      ctx.restore();
    }
  },

  // Een filmische lichtstreep dwars door het beeld (anamorfe lens-flare).
  drawLensStreak(W, y, alpha, color = '255, 220, 170') {
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0, `rgba(${color}, 0)`);
    gradient.addColorStop(0.5, `rgba(${color}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 2, W, 4);
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillRect(0, y - 9, W, 18);
    ctx.restore();
  },

  // De snelheidsmeter (het "gezicht" van Made in Heaven). value: 0..1
  drawGauge(cx, cy, r, value, alpha = 1) {
    const ctx = drawingContext;
    const start = Math.PI * 0.75, sweep = Math.PI * 1.5;
    const labels = ['0', '1', '2', '4', '8', '16', '64', '∞'];
    ctx.save();
    ctx.globalAlpha *= alpha;
    // kast
    ctx.fillStyle = 'rgba(8, 4, 18, 0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, 0, TAU);
    ctx.fill();
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = '#d9a83a';
    ctx.stroke();
    ctx.lineWidth = r * 0.025;
    ctx.strokeStyle = '#5ee7ff';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.98, 0, TAU);
    ctx.stroke();
    // gekleurde boog tot waar de naald staat
    const segments = 60;
    for (let i = 0; i < segments; i++) {
      const u = i / segments;
      if (u > value) break;
      const color = u < 0.5 ? mixColor('#5ee7ff', '#ffd25e', u * 2) : mixColor('#ffd25e', '#ff4057', (u - 0.5) * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.82, start + sweep * u, start + sweep * (u + 1 / segments) + 0.01);
      ctx.stroke();
    }
    // streepjes en getallen
    for (let i = 0; i <= 28; i++) {
      const a = start + sweep * (i / 28);
      const major = i % 4 === 0;
      ctx.strokeStyle = major ? '#ffffff' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = major ? r * 0.025 : r * 0.012;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * (major ? 0.62 : 0.68), cy + Math.sin(a) * r * (major ? 0.62 : 0.68));
      ctx.lineTo(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74);
      ctx.stroke();
      if (major) {
        const label = labels[i / 4];
        const hot = label === '∞' && value > 0.97;
        drawText(label, cx + Math.cos(a) * r * 0.48, cy + Math.sin(a) * r * 0.48, {
          size: r * (label === '∞' ? 0.2 : 0.13), font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle',
          color: hot ? '#ff6b81' : '#ffffff', stroke: COLORS.ink, strokeWidth: r * 0.02,
        });
      }
    }
    drawText('TIME', cx, cy + r * 0.42, { size: r * 0.12, font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: '#ffd25e', spacing: r * 0.03 });
    // de naald (met een lichtje)
    const needle = start + sweep * value;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(needle);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(Sprites.glowRed, r * 0.2, -r * 0.12, r * 0.7, r * 0.24);
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(needle);
    ctx.fillStyle = '#ff4057';
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.03);
    ctx.lineTo(r * 0.86, 0);
    ctx.lineTo(-r * 0.12, r * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#d9a83a';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.08, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  // Dramatische lichtstralen achter een figuur.
  drawRays(cx, cy, length, alpha, rotation, colorA = '255, 230, 180', colorB = '200, 160, 255') {
    const ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    for (let i = 0; i < 16; i++) {
      ctx.rotate(TAU / 16);
      const gradient = ctx.createLinearGradient(0, 0, 0, -length);
      gradient.addColorStop(0, `rgba(${i % 2 ? colorA : colorB}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${colorA}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-length * 0.01, 0);
      ctx.lineTo(length * 0.01, 0);
      ctx.lineTo(length * 0.09, -length);
      ctx.lineTo(-length * 0.09, -length);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // ============================================================
  //  Shots van deel 1 en 2 (gebed en manifestatie)
  // ============================================================
  drawPucciShots(W, H, scene) {
    const t = scene.t, T = scene.T;
    if (t < PRAYER_CLOSEUP) this.drawPrayerCloseup(W, H, scene, t);
    else if (t < T.manifest) this.drawPrayerWide(W, H, scene, t - PRAYER_CLOSEUP);
    else {
      const local = t - T.manifest;
      if (local < MANIFEST_SHOTS.gauge) this.drawReveal(W, H, scene, local);
      else if (local < MANIFEST_SHOTS.limit) this.drawGaugeShot(W, H, scene, local - MANIFEST_SHOTS.gauge);
      else this.drawNoLimit(W, H, scene, local - MANIFEST_SHOTS.limit);
    }
  },

  // SHOT 1: extreme close-up van Pucci's gezicht in het donker.
  drawPrayerCloseup(W, H, scene, local) {
    const ctx = drawingContext;
    const p = local / PRAYER_CLOSEUP;
    ctx.fillStyle = '#07030f';
    ctx.fillRect(-50, -50, W + 100, H + 100);
    // licht van boven
    const light = ctx.createRadialGradient(W * 0.62, -H * 0.1, 0, W * 0.62, -H * 0.1, H * 1.1);
    light.addColorStop(0, 'rgba(255, 235, 200, 0.35)');
    light.addColorStop(1, 'rgba(255, 235, 200, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
    this.drawRocks(W, H, scene, false);
    const [fx, fy] = HEAVEN_POINTS.pucciFace5;
    const zoom = 2.1 + p * 0.35; // langzaam inzoomen
    const sx = W * (W < H ? 0.5 : 0.62) + Math.sin(local * 0.7) * 6, sy = H * 0.5;
    const appear = Math.min(1, local / 0.35);
    // gezicht, maar grotendeels in de schaduw
    this.drawCrop('heaven', 5, fx, fy, sx, sy, zoom, H, { alpha: appear });
    this.drawCrop('heaven', 5, fx, fy, sx, sy, zoom, H, { alpha: appear * 0.62, silhouette: '#0a0418' });
    // van onder donker, zodat alleen de bovenkant van het gezicht oplicht
    const shade = ctx.createLinearGradient(0, H * 0.35, 0, H);
    shade.addColorStop(0, 'rgba(7, 3, 15, 0)');
    shade.addColorStop(1, 'rgba(7, 3, 15, 0.95)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    this.drawLensStreak(W, sy - H * 0.02, 0.35 + 0.15 * Math.sin(local * 5));
  },

  // SHOT 2: Pucci als biddend silhouet, met hittegolf en lichtbundels.
  drawPrayerWide(W, H, scene, local) {
    scene.drawFrozenWorld(W, H);
    this.drawRocks(W, H, scene, false);
    const size = Math.min(H * 0.8, W * 0.78) * (1 + local * 0.03);
    const x = W * (W < H ? 0.5 : 0.64), bottom = H * 0.92;
    const pulse = 0.5 + 0.5 * Math.sin(scene.t * 4);
    Art.drawGlow('heaven', 5, x, bottom, size, 'rgb(220, 200, 255)', 0.6 + pulse * 0.3);
    const shadow = Art.silhouette('heaven', 5, '#0d0620');
    if (shadow) this.drawHazed(shadow, x - size / 2, bottom - size, size, size, 2.5 + pulse * 2);
    // het licht wordt steeds feller rond Pucci
    const grow = progress(local, 0, HEAVEN_TIMING.prayer - PRAYER_CLOSEUP);
    drawGlowSprite(Sprites.glowWhite, x - size * 0.1, bottom - size * 0.6, size * (0.5 + grow * 0.6), 0.15 + grow * 0.35);
  },

  // SHOT 3: de onthulling. Impact frame, dan trekt de camera dramatisch terug.
  drawReveal(W, H, scene, local) {
    const ctx = drawingContext;
    const p = easeOutCubic(local / MANIFEST_SHOTS.gauge);
    scene.drawFrozenWorld(W, H);
    const x = W * (W < H ? 0.5 : 0.62), bottom = H * 0.93;
    // het licht "omhult" Pucci
    this.drawRays(x - W * 0.05, H * 0.45, Math.max(W, H) * 0.9, 0.16 * (1 - p * 0.4), scene.t * 0.25);
    drawGlowSprite(Sprites.glowWhite, x - W * 0.04, H * 0.45, Math.min(W, H) * (1.4 - p * 0.5), 0.55 - p * 0.25);
    scene.drawClockworks(W, H, p);
    this.drawRocks(W, H, scene, false);
    // camera: begint dichtbij en scheef, trekt terug naar recht
    const zoom = mix(1.3, 1, p);
    const tilt = mix(-0.07, 0, p);
    ctx.save();
    ctx.translate(x, bottom - H * 0.4);
    ctx.rotate(tilt);
    ctx.scale(zoom, zoom);
    ctx.translate(-x, -(bottom - H * 0.4));
    const size = Math.min(H * 0.8, W * 0.78);
    const flash = 1 - Math.min(1, local / 0.5);
    Art.drawGlow('heaven', 0, x, bottom, size, 'rgb(255, 236, 190)', 0.7 + flash);
    const art = Art.pose('heaven', 0);
    if (art) this.drawHazed(art, x - size / 2, bottom - size, size, size, 1.5);
    if (flash > 0.02) Art.drawGlow('heaven', 0, x, bottom, size, 'rgb(255, 255, 255)', flash * 1.2);
    ctx.restore();
    this.drawRocks(W, H, scene, true);
    // het citaat uit de anime
    const quoteAlpha = progress(local, 0.5, 0.8) * (1 - progress(local, 1.55, 1.8));
    const quoteY = H * (W < H ? 0.25 : 0.36) + Math.min(W * 0.085, 96) * 1.05;
    drawPanel(W * (W < H ? 0.04 : 0.06), quoteY - 18, W * (W < H ? 0.92 : 0.56), 36, { radius: 18, fill: 'rgba(8, 3, 18, 0.7)', edge: null, alpha: quoteAlpha });
    drawText('"It is complete! The power of gravity is permeating my body!"', W * (W < H ? 0.5 : 0.34), quoteY, {
      size: Math.min(W * 0.02, 17), align: 'center', baseline: 'middle', color: '#fff3d6', alpha: quoteAlpha,
      maxWidth: W * (W < H ? 0.88 : 0.53), skew: -0.1,
    });
  },

  // SHOT 4: close-up van het klok-oog van Made in Heaven + de snelheidsmeter.
  drawGaugeShot(W, H, scene, local) {
    const ctx = drawingContext;
    const duration = MANIFEST_SHOTS.limit - MANIFEST_SHOTS.gauge;
    const p = local / duration;
    ctx.fillStyle = '#0a0518';
    ctx.fillRect(-50, -50, W + 100, H + 100);
    const [ex, ey] = HEAVEN_POINTS.horseEye5;
    this.drawCrop('heaven', 5, ex, ey, W * 0.5, H * 0.5, 2.3 + p * 0.4, H, { alpha: 0.55 });
    // snelheidslijnen naar het oog toe
    drawRadialLines(ctx, W * 0.5, H * 0.5, Math.min(W, H) * 0.3, Math.hypot(W, H), 70, '#ffffff', 0.12 + p * 0.2, Math.floor(scene.t * 30));
    // de naald zwiept omhoog en blijft dan trillend op ∞ staan
    const value = Math.min(1, easeInCubic(Math.min(1, p * 1.5))) - (p > 0.66 ? Math.abs(Math.sin(scene.t * 60)) * 0.01 : 0);
    const r = Math.min(W, H) * 0.3;
    const pop = easeOutBack(Math.min(1, local / 0.25));
    this.drawGauge(W * 0.5, H * 0.52, r * pop, value);
    if (p > 0.66) {
      drawGlowSprite(Sprites.glowRed, W * 0.5, H * 0.52, r * 3, 0.25 + 0.15 * Math.sin(scene.t * 30));
    }
  },

  // SHOT 5: "TIME HAS NO LIMIT": lage hoek, armen omhoog, bliksemstorm.
  drawNoLimit(W, H, scene, local) {
    const ctx = drawingContext;
    const duration = HEAVEN_TIMING.manifest - MANIFEST_SHOTS.limit;
    const p = local / duration;
    scene.drawFrozenWorld(W, H);
    const x = W * (W < H ? 0.5 : 0.62), bottom = H * 0.95;
    this.drawRays(x, H * 0.35, Math.max(W, H), 0.12 + p * 0.1, -scene.t * 0.35, '255, 255, 255', '255, 200, 120');
    scene.drawClockworks(W, H, 1);
    this.drawRocks(W, H, scene, false);
    const size = Math.min(H * 0.86, W * 0.8) * (1 + p * 0.1);
    ctx.save();
    // lage camerahoek: iets naar boven geschoven en schuin
    ctx.translate(x, bottom);
    ctx.rotate(0.03 * Math.sin(scene.t * 2));
    ctx.translate(-x, -bottom);
    Art.drawGlow('heaven', 4, x, bottom, size, 'rgb(255, 236, 190)', 0.6 + 0.3 * Math.sin(scene.t * 6));
    const art = Art.pose('heaven', 4);
    if (art) this.drawHazed(art, x - size / 2, bottom - size, size, size, 2);
    ctx.restore();
    this.drawRocks(W, H, scene, true);
  },

  // ============================================================
  //  Deel 4: de tijd versnelt (zoals in de anime)
  // ============================================================
  drawAcceleration(W, H, scene) {
    const ctx = drawingContext;
    const local = scene.t - scene.T.accelerate;
    const p = scene.phaseProgress('accelerate');
    // hoek van de zon: draait steeds sneller (versnelling!)
    const turn = local * local * 2.2 + local * 1.2;
    const speed = 4.4 * local + 1.2; // hoeksnelheid
    const sunAngle = Math.PI + turn;
    const day = Math.max(0, -Math.sin(sunAngle)); // 1 = middag, 0 = nacht
    // lucht: dag en nacht wisselen steeds sneller (gaat over in grijs bij hoge snelheid)
    const blur = Math.min(1, speed / 14);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    const dayTop = mixColor('#3a6fd1', '#5a5f9a', blur), nightTop = mixColor('#05051a', '#3a3366', blur);
    sky.addColorStop(0, mixColor(nightTop, dayTop, day));
    sky.addColorStop(1, mixColor('#120a2a', '#ffb070', day * (1 - blur * 0.6)));
    ctx.fillStyle = sky;
    ctx.fillRect(-50, -50, W + 100, H + 100);

    // sterrensporen rond de poolster ('s nachts zichtbaar)
    const pole = { x: W * 0.5, y: -H * 0.25 };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const trail = Math.min(TAU * 0.9, 0.05 + speed * 0.12);
    for (let i = 0; i < 70; i++) {
      const radius = H * 0.3 + ((i * 0.618) % 1) * Math.hypot(W, H);
      const start = i * 2.39996 + turn * 0.3;
      ctx.strokeStyle = `rgba(230, 225, 255, ${(0.15 + 0.35 * (1 - day)) * (0.5 + (i % 3) * 0.25)})`;
      ctx.lineWidth = 1 + (i % 3) * 0.6;
      ctx.beginPath();
      ctx.arc(pole.x, pole.y, radius, start, start + trail);
      ctx.stroke();
    }
    ctx.restore();

    // de zon en de maan: hun nabeeld wordt een lichtstreep langs de hemel
    const cx = W / 2, cy = H * 0.98, radius = Math.min(W * 0.55, H * 0.85);
    const streak = Math.min(Math.PI * 1.9, 0.08 + speed * 0.18);
    for (const [offset, colorCore, colorGlow, r] of [[0, '255, 245, 210', '255, 190, 90', 30], [Math.PI, '225, 235, 255', '150, 180, 255', 22]]) {
      const angle = sunAngle + offset;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(${colorGlow}, 0.18)`;
      ctx.lineWidth = r * 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle - streak, angle);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${colorCore}, 0.55)`;
      ctx.lineWidth = r * 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle - streak, angle);
      ctx.stroke();
      ctx.restore();
      const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius;
      drawGlowSprite(offset === 0 ? Sprites.glowGold : Sprites.glowWhite, x, y, r * 6, 0.9);
      ctx.fillStyle = `rgb(${colorCore})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }

    // skyline met ramen die aan en uit flitsen (dagen gaan voorbij)
    this.drawSkyline(W, H, turn, day);

    // grote klok, steeds doorzichtiger
    const size = Math.min(W, H) * (0.8 + p * 0.3);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.globalAlpha = 0.22;
    ctx.drawImage(Background.clockFace, -size / 2, -size / 2, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    for (const [handSpeed, length, lineWidth] of [[3, 0.25, 10], [30, 0.38, 5]]) {
      ctx.save();
      ctx.rotate(local * local * handSpeed);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * length);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    drawRadialLines(ctx, W / 2, H / 2, Math.min(W, H) * 0.35, Math.hypot(W, H), 50, '#ffffff', 0.08 + p * 0.25, Math.floor(scene.t * 20));

    // Pucci en Made in Heaven razen voorbij als "smear": uitgerekte nabeelden
    const dash = (local * (1.2 + local * 1.4)) % 1;
    const heroSize = Math.min(H * 0.55, W * 0.45);
    const hx = mix(W * 1.3, -W * 0.3, dash), hy = H * 0.86;
    for (let i = 5; i >= 0; i--) {
      ctx.save();
      ctx.translate(hx + i * heroSize * 0.12, hy);
      ctx.scale(1 + i * 0.22, 1);
      Art.draw('heaven', 2, 0, 0, heroSize, { alpha: i === 0 ? 1 : 0.16 });
      ctx.restore();
    }
    // vegen achter de rennende figuur
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 9; i++) {
      const y = hy - heroSize * (0.15 + i * 0.09);
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(hx + heroSize * 0.3, y);
      ctx.lineTo(hx + heroSize * (1.4 + (i % 4) * 0.3), y);
      ctx.stroke();
    }
    ctx.restore();

    // kleine snelheidsmeter in de hoek, op ∞
    const gr = Math.min(W, H) * 0.09;
    this.drawGauge(W - gr * 1.5, H * 0.27, gr, 1 - Math.abs(Math.sin(scene.t * 50)) * 0.015, 0.95);
  },

  drawSkyline(W, H, turn, day) {
    if (!this.skyline || this.skyline.width !== Math.round(W)) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, Math.round(W));
      canvas.height = Math.max(2, Math.round(H * 0.22));
      const c = canvas.getContext('2d');
      let seed = 3;
      const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const buildings = [];
      let x = 0;
      while (x < canvas.width) {
        const bw = 20 + next() * 60;
        const bh = canvas.height * (0.3 + next() * 0.7);
        buildings.push([x, bw, bh]);
        x += bw - 2;
      }
      c.fillStyle = '#05030c';
      for (const [bx, bw, bh] of buildings) c.fillRect(bx, canvas.height - bh, bw, bh);
      canvas.buildings = buildings;
      this.skyline = canvas;
    }
    const ctx = drawingContext;
    const top = H - this.skyline.height;
    ctx.drawImage(this.skyline, 0, top);
    // ramen: elke "nacht" gaan ze aan, overdag uit
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 210, 130, ${0.7 * (1 - day)})`;
    let index = 0;
    for (const [bx, bw, bh] of this.skyline.buildings) {
      for (let wy = this.skyline.height - bh + 8; wy < this.skyline.height - 6; wy += 12) {
        for (let wx = bx + 5; wx < bx + bw - 6; wx += 10) {
          index++;
          if (Math.sin(index * 12.7 + Math.floor(turn / TAU) * 3.1) > 0.35) ctx.fillRect(wx, top + wy, 3, 4);
        }
      }
    }
    ctx.restore();
  },

  // ============================================================
  //  Deel 5 en 6: extra's
  // ============================================================
  // Lichtdeeltjes die in een spiraal naar de singulariteit worden gezogen.
  drawCollapseStreams(W, H, scene) {
    const ctx = drawingContext;
    const p = scene.phaseProgress('collapse');
    const maxR = Math.hypot(W, H) * 0.6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 140; i++) {
      const seed = (i * 0.618) % 1;
      const life = (scene.t * (0.7 + seed) + seed) % 1;
      const r = (1 - life) * maxR;
      const angle = i * 2.39996 + life * 5 + p * 3;
      const x = W / 2 + Math.cos(angle) * r, y = H / 2 + Math.sin(angle) * r * 0.75;
      const size = 3 + seed * 5;
      ctx.globalAlpha = 0.4 + life * 0.6;
      ctx.drawImage(i % 3 ? Sprites.glowWhite : Sprites.glowPurple, x - size * 2, y - size * 2, size * 4, size * 4);
    }
    ctx.restore();
    // 特異点 = "singularity point", een van de 14 woorden
    const alpha = progress(p, 0.35, 0.55) * (1 - progress(p, 0.85, 0.95));
    if (alpha > 0) {
      drawText('特異点', W / 2, H * 0.5, { size: Math.min(W * 0.13, 120), font: FONT_JP, weight: '900', align: 'center', baseline: 'middle', color: '#ffffff', stroke: '#2a0a4a', strokeWidth: 8, alpha, skew: -0.15 });
      drawText('SINGULARITY POINT', W / 2, H * 0.5 + Math.min(W * 0.09, 84), { size: Math.min(W * 0.03, 24), font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: '#e6d4ff', stroke: COLORS.ink, strokeWidth: 4, alpha, spacing: 4 });
    }
  },

  // Een warme zonsopgang boven het nieuwe universum.
  drawSunrise(W, H, local) {
    const ctx = drawingContext;
    const rise = easeOutCubic(Math.min(1, local / 2.6));
    const x = W / 2, y = mix(H * 1.15, H * 0.8, rise);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const horizon = ctx.createLinearGradient(0, H * 0.45, 0, H);
    horizon.addColorStop(0, 'rgba(255, 150, 90, 0)');
    horizon.addColorStop(1, `rgba(255, 150, 90, ${0.35 * rise})`);
    ctx.fillStyle = horizon;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
    this.drawRays(x, y, Math.max(W, H) * 0.8, 0.12 * rise, local * 0.15, '255, 220, 160', '255, 170, 120');
    drawGlowSprite(Sprites.glowGold, x, y, Math.min(W, H) * 0.9, 0.42 * rise);
    ctx.restore();
    ctx.fillStyle = `rgba(255, 245, 225, ${0.82 * rise})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.min(W, H) * 0.08, 0, TAU);
    ctx.fill();
  },
};
