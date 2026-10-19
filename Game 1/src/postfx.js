// ============================================================
//  postfx.js — beeldkwaliteit en "nabewerking" zoals in films.
//
//  Quality : tekent tot echte 4K-scherpte. Op 'Auto' houdt hij de
//            frame rate in de gaten en gaat hij vanzelf iets omlaag
//            als je computer het niet bijhoudt.
//  Camera  : kleine zoom-"kicks" bij grote momenten.
//  PostFX  : bloom (lichtgloed), vignet en anime-
//            "impact frames" (een flits van zwart-wit contrast bij
//            een harde klap, zoals in moderne anime).
// ============================================================

const QUALITY_PRESETS = {
  ultra: { pixels: 8.4e6, maxDensity: 3, bloom: 2 },  // tot 3840 x 2160
  high: { pixels: 4.2e6, maxDensity: 2, bloom: 1 },   // tot 2560 x 1440 (ongeveer)
  fast: { pixels: 1.6e6, maxDensity: 1, bloom: 0 },  // voor langzame laptops
};

const Quality = {
  level: 'ultra',
  scale: 1,          // extra verkleining bij 'Auto' (0.55 .. 1)
  frames: 0,
  frameTime: 0,
  checkTime: 0,
  changed: false,

  get preset() {
    return QUALITY_PRESETS[this.level];
  },

  get auto() {
    return Save.settings.quality === 'auto';
  },

  // Kies de stand uit de instellingen (bij 'Auto' beginnen we op Ultra).
  reset() {
    this.level = this.auto ? 'ultra' : (QUALITY_PRESETS[Save.settings.quality] ? Save.settings.quality : 'high');
    this.scale = 1;
    this.frames = 0;
    this.frameTime = 0;
    this.checkTime = 0;
  },

  // Hoe veel pixels per CSS-pixel we tekenen.
  density(windowW, windowH) {
    const preset = this.preset;
    const ideal = Math.min(window.devicePixelRatio || 1, preset.maxDensity);
    const limit = Math.sqrt(preset.pixels / Math.max(1, windowW * windowH));
    return Math.max(0.6, Math.min(ideal, limit) * this.scale);
  },

  get bloom() {
    return this.preset.bloom;
  },

  // Wordt elk frame aangeroepen met de echte frametijd (ms).
  // Geeft true terug als de resolutie aangepast moet worden.
  monitor(frameMs, playing) {
    if (!this.auto || !playing || frameMs > 120 || document.hidden) return false;
    this.frames++;
    this.frameTime += frameMs;
    this.checkTime += frameMs;
    if (this.checkTime < 2500) return false;
    const average = this.frameTime / this.frames;
    this.frames = 0;
    this.frameTime = 0;
    this.checkTime = 0;
    if (average <= 21) return false; // sneller dan ~48 fps: prima
    // te langzaam: eerst de resolutie omlaag, daarna een lagere stand
    if (this.scale > 0.7) this.scale -= 0.15;
    else if (this.level === 'ultra') { this.level = 'high'; this.scale = 1; }
    else if (this.level === 'high') { this.level = 'fast'; this.scale = 1; }
    else return false;
    return true;
  },
};

// ------------------------------------------------------------
//  Camera: kleine zoom bij grote momenten (alleen het speelveld)
// ------------------------------------------------------------
const Camera = {
  kickZoom: 0,
  focusX: FIELD.maxWidth / 2,
  focusY: FIELD.height / 2,

  kick(amount, x, y) {
    if (!Save.settings.shake) return;
    this.kickZoom = Math.min(0.14, this.kickZoom + amount);
    if (x !== undefined) {
      this.focusX = x;
      this.focusY = y;
    }
  },

  update(dt) {
    this.kickZoom = damp(this.kickZoom, 0, 6, dt);
  },

  get zoom() {
    return 1 + this.kickZoom;
  },
};

// ------------------------------------------------------------
//  Nabewerking
// ------------------------------------------------------------
const PostFX = {
  layers: null,
  vignetteCanvas: null,
  impactTime: 0,
  impactX: 0.5,
  impactY: 0.5,
  supported: null,

  // Kan deze browser canvas-filters (blur, contrast)? Zo niet: geen bloom.
  get filtersSupported() {
    if (this.supported === null) {
      const test = document.createElement('canvas').getContext('2d');
      this.supported = Boolean(test) && 'filter' in test;
    }
    return this.supported;
  },

  layer(name, w, h) {
    if (!this.layers) this.layers = {};
    let canvas = this.layers[name];
    if (!canvas) {
      canvas = document.createElement('canvas');
      this.layers[name] = canvas;
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return canvas;
  },

  update(dt) {
    this.impactTime = Math.max(0, this.impactTime - dt);
  },

  // Anime impact frame (x, y = plek op het scherm, als deel van 0..1).
  impact(duration = 0.07, x = 0.5, y = 0.5) {
    if (!Save.settings.flashes) return;
    this.impactTime = Math.max(this.impactTime, duration);
    this.impactX = x;
    this.impactY = y;
  },

  // BLOOM: de heldere delen van het beeld gaan zacht gloeien.
  // 1. verklein het beeld 4x en houd alleen het licht over (donker wordt zwart)
  // 2. verklein nog een keer en maak het wazig (een grote, zachte gloed)
  // 3. tel beide op bij het beeld
  bloom() {
    const level = Quality.bloom;
    if (!level || !this.filtersSupported) return;
    const main = drawingContext.canvas;
    const ctx = drawingContext;
    const w1 = Math.max(1, Math.round(main.width / 4)), h1 = Math.max(1, Math.round(main.height / 4));
    const bright = this.layer('bloomBright', w1, h1);
    const b = bright.getContext('2d');
    b.globalCompositeOperation = 'copy';
    b.filter = 'brightness(0.55) contrast(2.8) saturate(1.4) blur(1.5px)';
    b.drawImage(main, 0, 0, w1, h1);
    b.filter = 'none';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = level >= 2 ? 0.5 : 0.6;
    ctx.drawImage(bright, 0, 0, main.width, main.height);
    if (level >= 2) {
      const w2 = Math.max(1, Math.round(w1 / 3)), h2 = Math.max(1, Math.round(h1 / 3));
      const wide = this.layer('bloomWide', w2, h2);
      const c = wide.getContext('2d');
      c.globalCompositeOperation = 'copy';
      c.filter = 'blur(2px)';
      c.drawImage(bright, 0, 0, w2, h2);
      c.filter = 'none';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(wide, 0, 0, main.width, main.height);
    }
    ctx.restore();
  },

  // Impact frame: harde zwart-wit flits met snelheidslijnen.
  drawImpact() {
    if (this.impactTime <= 0 || !this.filtersSupported) return;
    const main = drawingContext.canvas;
    const copy = this.layer('impact', main.width, main.height);
    const c = copy.getContext('2d');
    c.globalCompositeOperation = 'copy';
    c.filter = 'grayscale(1) contrast(7) brightness(1.15)';
    c.drawImage(main, 0, 0);
    c.filter = 'none';
    const ctx = drawingContext;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(copy, 0, 0);
    // om het andere frame omgekeerd (wit wordt zwart)
    const inverted = Math.floor(this.impactTime * 60) % 2 === 0;
    if (inverted) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, main.width, main.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    drawRadialLines(ctx, this.impactX * main.width, this.impactY * main.height, Math.min(main.width, main.height) * 0.18,
      Math.hypot(main.width, main.height), 90, inverted ? '#000000' : '#ffffff', inverted ? 0.75 : 0.5, Math.floor(this.impactTime * 120));
    ctx.restore();
  },

  // Donkere randen: trekt je blik naar het midden (zoals een filmcamera).
  drawVignette(W, H) {
    if (!this.vignetteCanvas || this.vignetteCanvas.width !== Math.round(W / 2) || this.vignetteCanvas.height !== Math.round(H / 2)) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, Math.round(W / 2));
      canvas.height = Math.max(2, Math.round(H / 2));
      const c = canvas.getContext('2d');
      const gradient = c.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.38,
        canvas.width / 2, canvas.height / 2, Math.hypot(canvas.width, canvas.height) * 0.55);
      gradient.addColorStop(0, 'rgba(4, 0, 12, 0)');
      gradient.addColorStop(1, 'rgba(4, 0, 12, 0.55)');
      c.fillStyle = gradient;
      c.fillRect(0, 0, canvas.width, canvas.height);
      this.vignetteCanvas = canvas;
    }
    drawingContext.drawImage(this.vignetteCanvas, 0, 0, W, H);
  },
};

// Manga-snelheidslijnen die naar een punt wijzen.
// inner = waar de lijnen ophouden, outer = hoe ver ze reiken.
function drawRadialLines(ctx, cx, cy, inner, outer, count, color, alpha, seedFrame = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const seed = Math.sin((i + seedFrame * 0.37) * 91.3) * 0.5 + 0.5;
    const angle = (i / count) * TAU + seed * 0.08;
    const spread = 0.004 + seed * 0.012;
    const start = inner * (1 + seed * 0.8);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * start, cy + Math.sin(angle) * start);
    ctx.lineTo(cx + Math.cos(angle - spread) * outer, cy + Math.sin(angle - spread) * outer);
    ctx.lineTo(cx + Math.cos(angle + spread) * outer, cy + Math.sin(angle + spread) * outer);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
