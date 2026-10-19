// ============================================================
//  assets.js — plaatjes van de Stands en alle getekende sprites.
//
//  Art:     de geïllustreerde Stand-poses (assets/stand-art/*.webp).
//           Elk bestand is een raster van 3 x 2 poses.
//  Sprites: orbs, bommen, vuisten, de Road Roller... Die tekenen we
//           één keer met code op een onzichtbare canvas en daarna
//           plakken we die kopie steeds. Dat is veel sneller dan elk
//           frame alles opnieuw tekenen.
// ============================================================

const STAND_ART_KEYS = ['star', 'world', 'experience', 'hand', 'tusk', 'cmoon', 'crimson', 'dio', 'jotaro', 'heaven'];

const Art = {
  images: {},
  poses: {},   // losgeknipte poses (met zachte randen)
  glows: {},   // vage, gekleurde silhouetten voor een aura
  loadedCount: 0,

  load() {
    for (const key of STAND_ART_KEYS) {
      const image = new Image();
      image.onload = () => { this.loadedCount++; };
      image.onerror = () => console.warn('Stand-art kon niet laden:', key);
      image.src = `assets/stand-art/${key}.webp`;
      this.images[key] = image;
    }
  },

  get progress() {
    return this.loadedCount / STAND_ART_KEYS.length;
  },

  ready(key) {
    const image = this.images[key];
    return Boolean(image && image.complete && image.naturalWidth > 0);
  },

  // Knipt pose 0..5 los uit het raster en maakt de randen zacht,
  // zodat er geen stukjes van de buur-pose zichtbaar zijn.
  pose(key, index) {
    const id = key + index;
    if (this.poses[id]) return this.poses[id];
    if (!this.ready(key)) return null;
    const image = this.images[key];
    const cell = image.naturalWidth / 3;
    const size = Math.round(cell);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, (index % 3) * cell, Math.floor(index / 3) * cell, cell, cell, 0, 0, size, size);
    ctx.globalCompositeOperation = 'destination-in';
    let fade = ctx.createLinearGradient(0, 0, size, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.035, '#000');
    fade.addColorStop(0.965, '#000');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, size, size);
    fade = ctx.createLinearGradient(0, 0, 0, size);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.03, '#000');
    fade.addColorStop(0.988, '#000');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, size, size);
    this.poses[id] = canvas;
    return canvas;
  },

  // Een wazig, gekleurd silhouet van een pose (voor een gloed rond een Stand).
  glow(key, index, color) {
    const id = key + index + color;
    if (this.glows[id]) return this.glows[id];
    const base = this.pose(key, index);
    if (!base) return null;
    const size = 160, pad = 20;
    const canvas = document.createElement('canvas');
    canvas.width = size + pad * 2;
    canvas.height = size + pad * 2;
    const ctx = canvas.getContext('2d');
    if ('filter' in ctx) ctx.filter = 'blur(6px)';
    ctx.drawImage(base, pad, pad, size, size);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const result = { canvas, size, pad };
    this.glows[id] = result;
    return result;
  },

  // Een scherp silhouet in één kleur (voor een geheimzinnige schaduw-figuur).
  silhouette(key, index, color) {
    const id = 'sil' + key + index + color;
    if (this.glows[id]) return this.glows[id];
    const base = this.pose(key, index);
    if (!base) return null;
    const canvas = document.createElement('canvas');
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.glows[id] = canvas;
    return canvas;
  },

  // Tekent een pose. (cx, bottom) = midden-onder van het plaatje.
  draw(key, index, cx, bottom, height, options = {}) {
    const canvas = this.pose(key, index);
    if (!canvas) return false;
    const { alpha = 1, flip = false } = options;
    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, bottom);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(canvas, -height / 2, -height, height, height);
    ctx.restore();
    return true;
  },

  drawGlow(key, index, cx, bottom, height, color, alpha = 0.6) {
    const glow = this.glow(key, index, color);
    if (!glow) return;
    const ctx = drawingContext;
    const scale = height / glow.size;
    const full = glow.canvas.width * scale;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glow.canvas, cx - full / 2, bottom - height - glow.pad * scale, full, full);
    ctx.restore();
  },
};

// ------------------------------------------------------------
//  Getekende sprites
// ------------------------------------------------------------
const SPRITE_SCALE = 3; // we tekenen 3x zo groot, zodat ze scherp blijven

function makeSpriteCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * SPRITE_SCALE);
  canvas.height = Math.ceil(height * SPRITE_SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);
  canvas.logicalWidth = width;
  canvas.logicalHeight = height;
  return { canvas, ctx };
}

function radial(ctx, x, y, r0, x1, y1, r1, stops) {
  const gradient = ctx.createRadialGradient(x, y, r0, x1, y1, r1);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  return gradient;
}

function starPath(ctx, x, y, points, outer, inner, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

const Sprites = {
  build() {
    this.glowWhite = this.makeGlow('255,255,255');
    this.glowPink = this.makeGlow('255,95,168');
    this.glowGold = this.makeGlow('255,206,90');
    this.glowRed = this.makeGlow('255,64,87');
    this.glowCyan = this.makeGlow('94,231,255');
    this.glowPurple = this.makeGlow('150,100,255');
    this.glowGreen = this.makeGlow('89,227,140');
    this.orb = this.makeJewel(['#ffe6f3', '#ff86c4', '#d92f88', '#55093f'], 'rgba(255,95,168,0.5)');
    this.gold = this.makeJewel(['#fffbe2', '#ffe17a', '#e39f1d', '#6b4300'], 'rgba(255,206,90,0.6)', true);
    this.bomb = this.makeBomb();
    this.life = this.makeLadybug();
    this.arrow = this.makeArrow();
    this.wide = this.makeWide();
    this.disc = this.makeDisc();
    this.fist = this.makeFist('#b18cff', '#5b34a8', '#ffd25e');
    this.fistGold = this.makeFist('#ffe58a', '#b07b12', '#7cd36b');
    this.heart = this.makeHeart(true);
    this.heartEmpty = this.makeHeart(false);
    this.roller = this.makeRoadRoller();
    this.nail = this.makeNail();
    this.halftone = this.makeHalftone();
    this.spark = this.makeSpark();
    this.smoke = this.makeSmoke();
  },

  // Zachte grijze rookwolk (voor stof van de Road Roller).
  makeSmoke() {
    const { canvas, ctx } = makeSpriteCanvas(64, 64);
    for (const [x, y, r] of [[32, 34, 26], [22, 28, 16], [42, 26, 18], [30, 42, 18]]) {
      ctx.fillStyle = radial(ctx, x, y, 0, x, y, r, [[0, 'rgba(220, 205, 230, 0.55)'], [0.6, 'rgba(160, 140, 180, 0.25)'], [1, 'rgba(120, 100, 140, 0)']]);
      ctx.fillRect(0, 0, 64, 64);
    }
    return canvas;
  },

  // Zachte, ronde gloed (voor licht-effecten).
  makeGlow(rgb) {
    const { canvas, ctx } = makeSpriteCanvas(64, 64);
    ctx.fillStyle = radial(ctx, 32, 32, 0, 32, 32, 32, [
      [0, `rgba(${rgb},1)`], [0.25, `rgba(${rgb},0.55)`], [0.6, `rgba(${rgb},0.15)`], [1, `rgba(${rgb},0)`],
    ]);
    ctx.fillRect(0, 0, 64, 64);
    return canvas;
  },

  // Een glimmende edelsteen-orb.
  makeJewel(colors, glow, withStar = false) {
    const { canvas, ctx } = makeSpriteCanvas(60, 60);
    const c = 30, r = 17;
    ctx.fillStyle = radial(ctx, c, c, 0, c, c, 30, [[0, glow], [0.55, glow.replace(/[\d.]+\)$/, '0.18)')], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, 60, 60);
    ctx.beginPath();
    ctx.arc(c, c, r, 0, TAU);
    ctx.fillStyle = radial(ctx, c - 6, c - 7, 1, c, c, r, [[0, colors[0]], [0.28, colors[1]], [0.7, colors[2]], [1, colors[3]]]);
    ctx.fill();
    // facetten
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(c - r, c + 2); ctx.lineTo(c, c - 4); ctx.lineTo(c + r, c + 2); ctx.lineTo(c, c + r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255,240,250,0.85)';
    ctx.stroke();
    if (withStar) {
      starPath(ctx, c, c + 1, 5, 8, 3.6);
      ctx.fillStyle = 'rgba(255,250,220,0.95)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,70,0,0.8)';
      ctx.stroke();
    }
    // glimlicht
    ctx.save();
    ctx.translate(c - 6, c - 8);
    ctx.rotate(-0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 3, 0, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(c + 7, c + 8, 1.6, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    return canvas;
  },

  // Een bom met het doodshoofd van Killer Queen.
  makeBomb() {
    const { canvas, ctx } = makeSpriteCanvas(64, 64);
    const c = 32, r = 19;
    ctx.fillStyle = radial(ctx, c, c + 2, 0, c, c + 2, 32, [[0, 'rgba(255,64,87,0.45)'], [0.6, 'rgba(255,64,87,0.12)'], [1, 'rgba(255,64,87,0)']]);
    ctx.fillRect(0, 0, 64, 64);
    // lont-dop
    ctx.fillStyle = '#8f879e';
    ctx.strokeStyle = '#1a1022';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundRectPath(ctx, c - 6, c - r - 5, 12, 8, 2);
    ctx.fill();
    ctx.stroke();
    // lont
    ctx.beginPath();
    ctx.moveTo(c, c - r - 5);
    ctx.quadraticCurveTo(c + 3, c - r - 12, c + 9, c - r - 11);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#e2cfa0';
    ctx.stroke();
    // bol
    ctx.beginPath();
    ctx.arc(c, c + 2, r, 0, TAU);
    ctx.fillStyle = radial(ctx, c - 7, c - 5, 1, c, c + 2, r, [[0, '#8a6aa3'], [0.35, '#3f2756'], [1, '#0d0614']]);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#ff7aa8';
    ctx.stroke();
    // doodshoofd
    const sx = c, sy = c + 3;
    ctx.fillStyle = '#ff8fbd';
    ctx.beginPath();
    ctx.arc(sx, sy - 2, 8, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(sx + 6, sy + 5);
    ctx.lineTo(sx - 6, sy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a0b22';
    ctx.beginPath(); ctx.ellipse(sx - 3.4, sy - 2, 2.3, 2.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx + 3.4, sy - 2, 2.3, 2.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx, sy + 0.5); ctx.lineTo(sx - 1.2, sy + 2.6); ctx.lineTo(sx + 1.2, sy + 2.6); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = '#1a0b22';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(sx + i * 2.4, sy + 3.4); ctx.lineTo(sx + i * 2.4, sy + 5.2); ctx.stroke(); }
    // glimlicht
    ctx.beginPath();
    ctx.ellipse(c - 8, c - 6, 4.5, 2.4, -0.7, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    return canvas;
  },

  // Lieveheersbeestje van Gold Experience: geeft een extra leven.
  makeLadybug() {
    const { canvas, ctx } = makeSpriteCanvas(64, 64);
    const c = 32;
    ctx.fillStyle = radial(ctx, c, c, 0, c, c, 32, [[0, 'rgba(120,255,160,0.55)'], [0.6, 'rgba(255,210,94,0.15)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, 64, 64);
    // gouden broche-rand
    ctx.beginPath();
    ctx.arc(c, c + 2, 19, 0, TAU);
    ctx.fillStyle = radial(ctx, c - 6, c - 6, 1, c, c, 20, [[0, '#fff1b0'], [0.6, '#e2a92a'], [1, '#7a4f06']]);
    ctx.fill();
    // kop
    ctx.beginPath();
    ctx.arc(c, c - 9, 7.5, Math.PI, 0);
    ctx.fillStyle = '#16101c';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(c - 3, c - 12, 1.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(c + 3, c - 12, 1.6, 0, TAU); ctx.fill();
    // schild
    ctx.beginPath();
    ctx.ellipse(c, c + 3, 14, 13, 0, 0, TAU);
    ctx.fillStyle = radial(ctx, c - 5, c - 3, 1, c, c + 3, 15, [[0, '#ff8a8a'], [0.45, '#e21d2d'], [1, '#7a0610']]);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#16101c';
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c, c - 10); ctx.lineTo(c, c + 16); ctx.stroke();
    ctx.fillStyle = '#16101c';
    for (const [dx, dy, r] of [[-7, -2, 2.8], [7, -2, 2.8], [-8, 7, 2.4], [8, 7, 2.4], [-3.5, 12, 2], [3.5, 12, 2]]) {
      ctx.beginPath(); ctx.arc(c + dx, c + 3 + dy - 3, r, 0, TAU); ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(c - 6, c - 2, 3.5, 2, -0.6, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    return canvas;
  },

  // De Stand Arrow: geeft meteen een volle energiebalk.
  makeArrow() {
    const { canvas, ctx } = makeSpriteCanvas(64, 64);
    const c = 32;
    ctx.fillStyle = radial(ctx, c, c, 0, c, c, 32, [[0, 'rgba(255,240,170,0.6)'], [0.6, 'rgba(255,206,90,0.18)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, 64, 64);
    // schacht
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(c - 2.5, c - 26, 5, 14);
    // pijlpunt (wijst naar beneden)
    ctx.beginPath();
    ctx.moveTo(c, c + 24);
    ctx.lineTo(c - 15, c - 4);
    ctx.lineTo(c - 6, c - 1);
    ctx.lineTo(c - 7, c - 14);
    ctx.lineTo(c + 7, c - 14);
    ctx.lineTo(c + 6, c - 1);
    ctx.lineTo(c + 15, c - 4);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(c - 15, c - 14, c + 15, c + 24);
    gradient.addColorStop(0, '#fff6c8');
    gradient.addColorStop(0.45, '#f0bf3c');
    gradient.addColorStop(1, '#7a4c05');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#3d2402';
    ctx.stroke();
    // scarabee-versiering
    ctx.beginPath();
    ctx.ellipse(c, c - 4, 3.5, 5.5, 0, 0, TAU);
    ctx.fillStyle = '#8a3fd0';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c, c - 10); ctx.lineTo(c, c + 2); ctx.stroke();
    return canvas;
  },

  // Power-up die je catcher breder maakt.
  makeWide() {
    const { canvas, ctx } = makeSpriteCanvas(60, 60);
    const c = 30;
    ctx.fillStyle = radial(ctx, c, c, 0, c, c, 30, [[0, 'rgba(94,231,255,0.55)'], [0.6, 'rgba(94,231,255,0.15)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, 60, 60);
    ctx.beginPath();
    ctx.arc(c, c, 17, 0, TAU);
    ctx.fillStyle = radial(ctx, c - 5, c - 6, 1, c, c, 17, [[0, '#e6fffd'], [0.35, '#55e0d0'], [1, '#0a4a55']]);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(230,255,255,0.85)';
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c - 9, c); ctx.lineTo(c + 9, c); ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(c + side * 12, c);
      ctx.lineTo(c + side * 6, c - 5);
      ctx.lineTo(c + side * 6, c + 5);
      ctx.closePath();
      ctx.fill();
    }
    return canvas;
  },

  // Een DISC van Whitesnake (Pucci): blokkeert je Stand als je hem vangt.
  makeDisc() {
    const { canvas, ctx } = makeSpriteCanvas(60, 60);
    const c = 30, r = 18;
    ctx.fillStyle = radial(ctx, c, c, 0, c, c, 30, [[0, 'rgba(230,220,255,0.55)'], [0.6, 'rgba(160,120,255,0.15)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, 60, 60);
    ctx.beginPath();
    ctx.arc(c, c, r, 0, TAU);
    ctx.fillStyle = radial(ctx, c - 5, c - 5, 1, c, c, r, [[0, '#ffffff'], [0.5, '#c9c6dc'], [1, '#6b6884']]);
    ctx.fill();
    if (ctx.createConicGradient) {
      const conic = ctx.createConicGradient(0.4, c, c);
      ['#ff6b9a', '#ffd25e', '#7cf0a0', '#5ee7ff', '#9d7bff', '#ff6b9a'].forEach((color, i, list) => conic.addColorStop(i / (list.length - 1), color));
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = conic;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, 6, 0, TAU);
    ctx.fillStyle = '#d8d4ea';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, c, 2.6, 0, TAU);
    ctx.fillStyle = '#1a1226';
    ctx.fill();
    return canvas;
  },

  // Een vuist van Star Platinum (wijst naar rechts; we draaien hem naar het doel).
  makeFist(light, dark, accent) {
    const { canvas, ctx } = makeSpriteCanvas(80, 44);
    const cy = 22;
    // onderarm met snelheidsveeg
    const arm = ctx.createLinearGradient(0, 0, 50, 0);
    arm.addColorStop(0, 'rgba(0,0,0,0)');
    arm.addColorStop(0.5, withAlpha(dark, 0.7));
    arm.addColorStop(1, dark);
    ctx.fillStyle = arm;
    ctx.beginPath();
    roundRectPath(ctx, 2, cy - 8, 50, 16, 7);
    ctx.fill();
    // polsband
    ctx.fillStyle = accent;
    ctx.fillRect(42, cy - 9, 6, 18);
    // vuist
    ctx.beginPath();
    roundRectPath(ctx, 46, cy - 15, 30, 30, 10);
    const fist = ctx.createLinearGradient(46, cy - 15, 76, cy + 15);
    fist.addColorStop(0, light);
    fist.addColorStop(1, dark);
    ctx.fillStyle = fist;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a0b2e';
    ctx.stroke();
    // vingers
    ctx.lineWidth = 1.3;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(62, cy - 15 + i * 7.5);
      ctx.lineTo(76, cy - 15 + i * 7.5);
      ctx.stroke();
    }
    // duim
    ctx.beginPath();
    roundRectPath(ctx, 50, cy + 4, 15, 8, 4);
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.stroke();
    // knokkels
    ctx.fillStyle = accent;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(74, cy - 11 + i * 7.3, 2.1, 0, TAU);
      ctx.fill();
    }
    return canvas;
  },

  makeHeart(filled) {
    const { canvas, ctx } = makeSpriteCanvas(36, 34);
    ctx.beginPath();
    ctx.moveTo(18, 30);
    ctx.bezierCurveTo(4, 21, 1, 13, 4, 8);
    ctx.bezierCurveTo(7, 2, 15, 2, 18, 9);
    ctx.bezierCurveTo(21, 2, 29, 2, 32, 8);
    ctx.bezierCurveTo(35, 13, 32, 21, 18, 30);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = radial(ctx, 12, 10, 1, 18, 16, 18, [[0, '#ffb3c6'], [0.4, '#ff3d6e'], [1, '#8a0b2e']]);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#2a0614';
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(11, 10, 3.2, 2, -0.6, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(40, 18, 60, 0.6)';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(220, 180, 255, 0.45)';
      ctx.stroke();
    }
    return canvas;
  },

  // De beroemde Road Roller van DIO (vooraanzicht).
  makeRoadRoller() {
    const { canvas, ctx } = makeSpriteCanvas(420, 330);
    ctx.lineJoin = 'round';
    const ink = '#120a10';
    // uitlaat
    ctx.fillStyle = '#3a3440';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath(); roundRectPath(ctx, 322, 4, 18, 80, 4); ctx.fill(); ctx.stroke();
    // zijsteunen
    const yellow = ctx.createLinearGradient(0, 60, 0, 270);
    yellow.addColorStop(0, '#ffe96b');
    yellow.addColorStop(0.5, '#f2b705');
    yellow.addColorStop(1, '#a86f00');
    for (const x of [12, 368]) {
      ctx.beginPath(); roundRectPath(ctx, x, 150, 40, 120, 8);
      ctx.fillStyle = yellow; ctx.fill(); ctx.stroke();
    }
    // wals (grote rol)
    const drum = ctx.createLinearGradient(0, 205, 0, 322);
    drum.addColorStop(0, '#1b1820');
    drum.addColorStop(0.18, '#6d6979');
    drum.addColorStop(0.32, '#b9b5c6');
    drum.addColorStop(0.48, '#5b5766');
    drum.addColorStop(0.8, '#26222e');
    drum.addColorStop(1, '#0c0a10');
    ctx.beginPath(); roundRectPath(ctx, 28, 205, 364, 118, 22);
    ctx.fillStyle = drum; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let y = 222; y < 320; y += 14) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(380, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // carrosserie
    ctx.beginPath(); roundRectPath(ctx, 56, 74, 308, 142, 16);
    ctx.fillStyle = yellow; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
    // grille
    ctx.beginPath(); roundRectPath(ctx, 142, 118, 136, 74, 8);
    ctx.fillStyle = '#231a14'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#6b5a3a';
    ctx.lineWidth = 3;
    for (let y = 128; y < 188; y += 10) { ctx.beginPath(); ctx.moveTo(150, y); ctx.lineTo(270, y); ctx.stroke(); }
    // koplampen
    for (const x of [98, 322]) {
      ctx.beginPath(); ctx.arc(x, 142, 19, 0, TAU);
      ctx.fillStyle = radial(ctx, x - 5, 136, 1, x, 142, 19, [[0, '#ffffff'], [0.5, '#fff2a8'], [1, '#c58d10']]);
      ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke();
    }
    // naamplaat
    ctx.beginPath(); roundRectPath(ctx, 160, 196, 100, 16, 3);
    ctx.fillStyle = '#1c1410'; ctx.fill();
    ctx.fillStyle = '#ffd25e';
    ctx.font = `700 11px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ROAD ROLLER', 210, 204.5);
    // cabine
    ctx.beginPath(); roundRectPath(ctx, 116, 12, 188, 70, 10);
    ctx.fillStyle = yellow; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
    const glass = ctx.createLinearGradient(130, 22, 290, 74);
    glass.addColorStop(0, '#8fb8e0');
    glass.addColorStop(0.45, '#2b4766');
    glass.addColorStop(1, '#101c2c');
    ctx.beginPath(); roundRectPath(ctx, 132, 24, 156, 46, 6);
    ctx.fillStyle = glass; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(146, 28); ctx.lineTo(176, 28); ctx.lineTo(156, 66); ctx.lineTo(136, 66); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // manga-arcering
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(62 + i * 9, 210); ctx.lineTo(62 + i * 9 + 28, 180); ctx.stroke(); }
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(300 + i * 7, 210); ctx.lineTo(300 + i * 7 + 24, 182); ctx.stroke(); }
    ctx.globalAlpha = 1;
    return canvas;
  },

  // Nagel van Tusk.
  makeNail() {
    const { canvas, ctx } = makeSpriteCanvas(14, 40);
    ctx.fillStyle = radial(ctx, 7, 20, 0, 7, 20, 20, [[0, 'rgba(255,150,200,0.6)'], [1, 'rgba(255,150,200,0)']]);
    ctx.fillRect(0, 0, 14, 40);
    ctx.beginPath();
    ctx.moveTo(7, 1);
    ctx.lineTo(11, 12);
    ctx.lineTo(10, 38);
    ctx.lineTo(4, 38);
    ctx.lineTo(3, 12);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(3, 0, 11, 0);
    gradient.addColorStop(0, '#ffd1e6');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, '#e889b5');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#6a2346';
    ctx.stroke();
    return canvas;
  },

  // Tegel met stipjes voor het manga-"halftone"-effect.
  makeHalftone() {
    const canvas = document.createElement('canvas');
    canvas.width = 12;
    canvas.height = 12;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(3, 3, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 9, 2, 0, TAU); ctx.fill();
    return canvas;
  },

  // Een vierpuntige ster-fonkeling.
  makeSpark() {
    const { canvas, ctx } = makeSpriteCanvas(32, 32);
    ctx.fillStyle = radial(ctx, 16, 16, 0, 16, 16, 16, [[0, 'rgba(255,255,255,0.9)'], [0.3, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 32, 32);
    starPath(ctx, 16, 16, 4, 15, 2.2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    return canvas;
  },
};

// Tekent een sprite gecentreerd op (x, y) met een bepaalde grootte en draaiing.
function drawSprite(sprite, x, y, size, rotation = 0, alpha = 1) {
  if (!sprite) return;
  const ctx = drawingContext;
  const width = size;
  const height = size * (sprite.height / sprite.width);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
  ctx.restore();
}

// Tekent een gloed met optelmenging (lichteffect).
function drawGlowSprite(sprite, x, y, size, alpha = 1) {
  const ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}
