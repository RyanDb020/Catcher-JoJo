// ============================================================
//  ui.js — hulpfuncties om tekst, panelen en knoppen te tekenen.
//
//  We tekenen tekst direct op de canvas (drawingContext), zodat we
//  JoJo-achtige letters kunnen maken: schuin, met dikke rand.
// ============================================================

const FONT_TITLE = "Impact, 'Haettenschweiler', 'Arial Narrow Bold', 'Arial Black', sans-serif";
const FONT_UI = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const FONT_JP = "'Yu Gothic', 'Meiryo', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif";

// Kleurenpalet van de game (paars, goud en roze zoals in JoJo).
const COLORS = {
  gold: '#ffd25e',
  goldDark: '#b5781b',
  pink: '#ff5fa8',
  purple: '#8b5cf6',
  violet: '#c79bff',
  cyan: '#5ee7ff',
  red: '#ff4057',
  green: '#59e38c',
  white: '#fff7ea',
  ink: '#140a24',
  panel: 'rgba(21, 11, 40, 0.78)',
  panelEdge: 'rgba(214, 170, 255, 0.35)',
};

// Tekent tekst met allerlei opties.
//   size, font, color, align ('left'|'center'|'right'), baseline,
//   stroke (randkleur), strokeWidth, shadow (schaduwkleur), skew (schuinte),
//   alpha, weight, spacing (letterafstand in px)
function drawText(str, x, y, options = {}) {
  const {
    size = 16, font = FONT_UI, color = COLORS.white, align = 'left', baseline = 'alphabetic',
    stroke = null, strokeWidth = 0, shadow = null, shadowOffset = 3, skew = 0, alpha = 1,
    weight = '700', spacing = 0, maxWidth = 0,
  } = options;
  if (alpha <= 0.003) return;
  const ctx = drawingContext;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (skew) ctx.transform(1, 0, skew, 1, 0, 0);
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
  ctx.lineJoin = 'round';
  const width = maxWidth > 0 ? maxWidth : undefined;
  if (shadow) {
    ctx.fillStyle = shadow;
    if (stroke && strokeWidth) {
      ctx.strokeStyle = shadow;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(str, shadowOffset, shadowOffset, width);
    }
    ctx.fillText(str, shadowOffset, shadowOffset, width);
  }
  if (stroke && strokeWidth) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(str, 0, 0, width);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 0, width);
  ctx.restore();
}

// De typische JoJo-titel: schuin, dikke zwarte rand en een gekleurde schaduw.
function drawJoJoTitle(str, x, y, size, options = {}) {
  drawText(str, x, y, {
    size,
    font: FONT_TITLE,
    weight: '400',
    align: 'center',
    baseline: 'middle',
    color: options.color || COLORS.gold,
    stroke: options.stroke || COLORS.ink,
    strokeWidth: Math.max(3, size * 0.16),
    shadow: options.shadow || 'rgba(120, 40, 200, 0.85)',
    shadowOffset: Math.max(2, size * 0.07),
    skew: options.skew === undefined ? -0.18 : options.skew,
    alpha: options.alpha === undefined ? 1 : options.alpha,
    spacing: options.spacing || 0,
    maxWidth: options.maxWidth || 0,
  });
}

// Meet hoe breed een tekst wordt.
function measureText(str, size, font = FONT_UI, weight = '700') {
  const ctx = drawingContext;
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx.measureText(str).width;
  ctx.restore();
  return width;
}

// Breekt een tekst op in regels die binnen maxWidth passen.
function wrapText(str, size, maxWidth, font = FONT_UI, weight = '600') {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (measureText(test, size, font, weight) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Een afgeronde rechthoek als pad (om te vullen of te omlijnen).
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Een half-doorzichtig paneel met een dunne rand.
function drawPanel(x, y, w, h, options = {}) {
  const { radius = 14, fill = COLORS.panel, edge = COLORS.panelEdge, alpha = 1, glow = null } = options;
  const ctx = drawingContext;
  ctx.save();
  ctx.globalAlpha *= alpha;
  roundRectPath(ctx, x, y, w, h, radius);
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 24;
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// Een klikbare knop in de canvas (voor menu's).
class Button {
  constructor(label, action, options = {}) {
    this.label = label;
    this.action = action;     // functie die wordt uitgevoerd bij een klik
    this.hint = options.hint || '';
    this.primary = options.primary || false;
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
    this.hover = 0;           // 0..1, voor een zachte hover-animatie
    this.selected = false;
  }

  place(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
  }

  contains(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  update(dt, pointerX, pointerY) {
    const active = this.selected || this.contains(pointerX, pointerY);
    this.hover = damp(this.hover, active ? 1 : 0, 14, dt);
  }

  draw(alpha = 1) {
    const ctx = drawingContext;
    const lift = this.hover * 3;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(this.x, this.y - lift);
    // schuine knop, net als JoJo-titelkaarten
    ctx.beginPath();
    const slant = this.h * 0.28;
    ctx.moveTo(slant, 0);
    ctx.lineTo(this.w, 0);
    ctx.lineTo(this.w - slant, this.h);
    ctx.lineTo(0, this.h);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, this.w, this.h);
    if (this.primary) {
      gradient.addColorStop(0, mixColor('#ffd25e', '#fff2b8', this.hover));
      gradient.addColorStop(1, '#e09a2c');
    } else {
      gradient.addColorStop(0, `rgba(${Math.round(60 + 50 * this.hover)}, 30, ${Math.round(110 + 60 * this.hover)}, 0.92)`);
      gradient.addColorStop(1, 'rgba(25, 12, 48, 0.92)');
    }
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.primary ? '#3a1a06' : `rgba(220, 180, 255, ${0.35 + 0.5 * this.hover})`;
    ctx.stroke();
    ctx.restore();

    drawText(this.label, this.x + this.w / 2, this.y + this.h / 2 + 1 - lift, {
      size: Math.round(this.h * 0.42), font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle',
      color: this.primary ? COLORS.ink : COLORS.white, spacing: 1.5, alpha,
    });
    if (this.hint && this.w >= 220) {
      drawText(this.hint, this.x + this.w - this.h * 0.45, this.y + this.h / 2 + 1 - lift, {
        size: Math.round(this.h * 0.26), align: 'right', baseline: 'middle',
        color: this.primary ? 'rgba(40,20,5,0.7)' : 'rgba(230,210,255,0.55)', alpha,
      });
    }
  }
}

// Mengt twee hex-kleuren (t = 0 → a, t = 1 → b).
function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(mix((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(mix((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(mix(pa & 255, pb & 255, t));
  return `rgb(${r}, ${g}, ${bl})`;
}

// Zet een hex-kleur om naar rgba met doorzichtigheid.
function withAlpha(hex, alpha) {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255}, ${(p >> 8) & 255}, ${p & 255}, ${alpha})`;
}
