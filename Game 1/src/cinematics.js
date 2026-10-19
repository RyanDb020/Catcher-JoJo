// ============================================================
//  cinematics.js — korte filmische momenten.
//
//  CutIn          : de JoJo-"cut-in": een schuine balk schuift over
//                   het scherm met de Stand en een grote schreeuw.
//                   Duurt minder dan een seconde, dus geen gewacht.
//  (De grote Made in Heaven-reset staat in heaven.js.)
//  drawToBeContinued: de beroemde pijl bij Game Over.
// ============================================================

const CutIn = {
  current: null,

  // options: art, pose, title, subtitle, color1, color2, textColor, duration
  start(options) {
    this.current = { duration: 0.85, textColor: COLORS.gold, ...options, t: 0 };
  },

  get active() {
    return this.current !== null;
  },

  update(dt) {
    if (!this.current) return;
    this.current.t += dt;
    if (this.current.t >= this.current.duration) this.current = null;
  },

  draw(W, H) {
    const c = this.current;
    if (!c) return;
    const ctx = drawingContext;
    const t = c.t, d = c.duration;
    const pIn = easeOutCubic(t / 0.16);
    const pOut = easeInCubic((t - (d - 0.16)) / 0.16);
    const visible = Math.min(pIn, 1 - pOut);
    const portrait = W < H * 0.95;

    ctx.save();
    ctx.fillStyle = `rgba(5, 2, 12, ${0.55 * visible})`;
    ctx.fillRect(0, 0, W, H);

    const bandH = portrait ? Math.min(H * 0.34, W * 0.75) : Math.min(H * 0.48, W * 0.36);
    const cy = H * 0.5;
    const tilt = Math.min(W * 0.045, 60);
    const shift = (1 - pIn) * -W * 1.15 + pOut * W * 1.15;
    ctx.translate(shift, 0);

    // de schuine balk
    ctx.beginPath();
    ctx.moveTo(-30, cy - bandH / 2 + tilt);
    ctx.lineTo(W + 30, cy - bandH / 2 - tilt);
    ctx.lineTo(W + 30, cy + bandH / 2 - tilt);
    ctx.lineTo(-30, cy + bandH / 2 + tilt);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, cy - bandH / 2, W, cy + bandH / 2);
    fill.addColorStop(0, c.color1);
    fill.addColorStop(1, c.color2);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.save();
    ctx.clip();
    // manga-stipjes
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = ctx.createPattern(Sprites.halftone, 'repeat');
    ctx.fillRect(-30, cy - bandH, W + 60, bandH * 2);
    ctx.globalAlpha = 1;
    // snelheidslijnen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      const seed = (i * 7919) % 1000 / 1000;
      const y = cy - bandH / 2 - tilt + ((i * 0.618) % 1) * (bandH + tilt * 2);
      const length = 60 + seed * 260;
      const x = (W + 400) - ((seed * 3000 + t * 2600) % (W + 600));
      ctx.lineWidth = 1 + seed * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
      ctx.stroke();
    }
    // het personage
    const art = Art.pose(c.art, c.pose);
    if (art) {
      const size = bandH * (portrait ? 1.25 : 1.5) * (1 + t * 0.07);
      const ax = portrait ? W * 0.5 : W * 0.7 + (1 - pIn) * 140;
      const top = cy - bandH / 2 - tilt * 0.7 - size * 0.04;
      ctx.save();
      if (c.flip) {
        ctx.translate(ax, 0);
        ctx.scale(-1, 1);
        ctx.translate(-ax, 0);
      }
      ctx.drawImage(art, ax - size / 2, top, size, size);
      ctx.restore();
    }
    ctx.restore();

    // randen van de balk
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0a0410';
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();

    // tekst: klapt binnen met een "boing"
    const slam = easeOutBack(clamp((t - 0.08) / 0.22, 0, 1));
    const textAlpha = clamp((t - 0.06) / 0.08, 0, 1);
    const titleSize = portrait ? Math.min(bandH * 0.22, W * 0.11) : Math.min(bandH * 0.26, W * 0.07);
    const tx = portrait ? W * 0.5 : W * 0.3;
    const ty = portrait ? cy + bandH * 0.3 : cy + titleSize * 0.15;
    if (c.subtitle) {
      drawText(c.subtitle, tx, ty - titleSize * 0.85, {
        size: Math.round(titleSize * 0.3), align: 'center', baseline: 'middle', color: '#ffffff',
        stroke: COLORS.ink, strokeWidth: 4, spacing: 3, skew: -0.18, alpha: textAlpha,
      });
    }
    drawJoJoTitle(c.title, tx, ty, titleSize * mix(1.7, 1, slam), {
      color: c.textColor, alpha: textAlpha, maxWidth: portrait ? W * 0.92 : W * 0.5,
    });
    ctx.restore();
  },
};

// De beroemde "TO BE CONTINUED"-pijl (wijst naar links).
function drawToBeContinued(x, y, w, alpha) {
  const ctx = drawingContext;
  const h = w * 0.16;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(h * 0.9, 0);
  ctx.lineTo(h * 0.9, h * 0.18);
  ctx.lineTo(w, h * 0.18);
  ctx.lineTo(w, h * 0.82);
  ctx.lineTo(h * 0.9, h * 0.82);
  ctx.lineTo(h * 0.9, h);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, 0, 0, h);
  fill.addColorStop(0, '#e9d9a4');
  fill.addColorStop(0.5, '#c2a462');
  fill.addColorStop(1, '#8a6c32');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.07);
  ctx.strokeStyle = '#2a1d0c';
  ctx.stroke();
  ctx.restore();
  drawText('TO BE CONTINUED', x + h * 0.9 + (w - h * 0.9) / 2, y + h / 2 + 1, {
    size: h * 0.42, font: "'Arial Black', Impact, sans-serif", weight: '900', align: 'center', baseline: 'middle',
    color: '#3a2a10', skew: -0.22, alpha, spacing: 1,
  });
}
