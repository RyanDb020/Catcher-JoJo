// ============================================================
//  hud.js — alles wat je tijdens het spelen ziet: score, combo,
//  levens, Stand Energy, de golf en (op touchscreens) knoppen.
// ============================================================

const HUD = {
  scoreShown: 0,     // telt mooi op naar de echte score
  scorePulse: 0,
  lifePulse: 0,
  comboPulse: 0,
  energyShown: 0,
  denyPulse: 0,      // knipperen als je een aanval niet kunt betalen
  denyKind: null,
  touchButtons: [],  // knoppen voor touchscreens
  pauseButton: { x: -100, y: -100, r: 0 },

  reset() {
    this.scoreShown = 0;
    this.energyShown = 0;
    this.scorePulse = 0;
    this.lifePulse = 0;
    this.comboPulse = 0;
  },

  update(dt, game) {
    const difference = game.score - this.scoreShown;
    this.scoreShown += difference * Math.min(1, dt * 10) + Math.sign(difference) * Math.min(Math.abs(difference), dt * 40);
    if (Math.abs(game.score - this.scoreShown) < 0.5) this.scoreShown = game.score;
    this.energyShown = damp(this.energyShown, game.energy, 10, dt);
    this.scorePulse = Math.max(0, this.scorePulse - dt * 4);
    this.lifePulse = Math.max(0, this.lifePulse - dt * 2.5);
    this.comboPulse = Math.max(0, this.comboPulse - dt * 4);
    this.denyPulse = Math.max(0, this.denyPulse - dt * 3);
  },

  deny(kind) {
    this.denyPulse = 1;
    this.denyKind = kind;
  },

  draw(game, time) {
    const W = game.fieldW;
    const narrow = W < 760;
    const leftW = Math.min(250, W * 0.42);
    this.drawScorePanel(game, 12, 10, leftW);
    this.drawEnergyPanel(game, 12, 104, leftW, time);
    const rightW = Math.min(200, W * 0.34);
    this.drawLivesPanel(game, W - rightW - 12, 10, rightW, time);
    const centerY = narrow ? 186 : 22;
    if (game.boss && game.boss.state !== 'dead') this.drawBossBar(game, W, narrow ? 176 : 16, narrow);
    else this.drawWaveLabel(game, W / 2, centerY, narrow);
    this.drawStatusPills(game, W / 2, narrow ? 214 : 78);
    this.drawMultiplierBadge(game, time);
    if (Input.touchMode && game.state === 'playing') this.drawTouchButtons(game, W);
    if (Save.settings.showFps) {
      drawText(Math.round(frameRate()) + ' FPS', W - 12, FIELD.height - 10, { size: 11, align: 'right', color: 'rgba(255,255,255,0.6)' });
    }
  },

  drawScorePanel(game, x, y, w) {
    drawPanel(x, y, w, 86);
    drawText('SCORE', x + 14, y + 20, { size: 11, color: COLORS.violet, spacing: 2.5 });
    const pulse = 1 + this.scorePulse * 0.12;
    drawText(formatScore(this.scoreShown), x + 14, y + 54, {
      size: 34 * pulse, font: FONT_TITLE, weight: '400', color: COLORS.white, stroke: COLORS.ink, strokeWidth: 4, skew: -0.08,
    });
    drawText('BEST ' + formatScore(Math.max(Save.data.best, game.score)), x + 14, y + 74, { size: 11, color: 'rgba(240,225,255,0.6)', spacing: 1 });
    // combo rechts in het paneel
    const tier = comboTier(game.combo);
    if (game.combo > 0) {
      const size = 22 * (1 + this.comboPulse * 0.25);
      drawText(String(game.combo), x + w - 14, y + 46, {
        size, font: FONT_TITLE, weight: '400', align: 'right', color: tier.mult > 1 ? COLORS.gold : COLORS.white,
        stroke: COLORS.ink, strokeWidth: 4, skew: -0.1,
      });
      drawText('COMBO', x + w - 14, y + 20, { size: 11, align: 'right', color: COLORS.violet, spacing: 2.5 });
      // balkje tot de volgende vermenigvuldiger
      const next = COMBO_TIERS.find(item => item.at > game.combo);
      if (next) {
        const fill = (game.combo - tier.at) / (next.at - tier.at);
        const bw = 56;
        drawingContext.fillStyle = 'rgba(255,255,255,0.12)';
        drawingContext.fillRect(x + w - 14 - bw, y + 64, bw, 4);
        drawingContext.fillStyle = COLORS.gold;
        drawingContext.fillRect(x + w - 14 - bw, y + 64, bw * fill, 4);
      }
    }
  },

  drawEnergyPanel(game, x, y, w, time) {
    const ctx = drawingContext;
    drawPanel(x, y, w, 64);
    const locked = game.discLock > 0;
    drawText(locked ? 'STAND GEBLOKKEERD ' + game.discLock.toFixed(1) : 'STAND ENERGY', x + 14, y + 18, {
      size: 11, color: locked ? '#ff9db0' : COLORS.violet, spacing: 2,
    });
    const bars = ENERGY.bars;
    const gap = 5;
    const barX = x + 14, barY = y + 26, barW = w - 28, barH = 10;
    const segW = (barW - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      const sx = barX + i * (segW + gap);
      const fill = clamp((this.energyShown - i * ENERGY.perBar) / ENERGY.perBar, 0, 1);
      roundRectPath(ctx, sx, barY, segW, barH, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      if (fill > 0) {
        ctx.save();
        roundRectPath(ctx, sx, barY, segW, barH, 4);
        ctx.clip();
        const gradient = ctx.createLinearGradient(sx, 0, sx + segW, 0);
        if (fill >= 1) {
          gradient.addColorStop(0, '#ffe9a8');
          gradient.addColorStop(1, '#f0a92a');
        } else {
          gradient.addColorStop(0, '#6d3fd6');
          gradient.addColorStop(1, '#b48cff');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(sx, barY, segW * fill, barH);
        if (fill >= 1) {
          ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(time * 6 + i)})`;
          ctx.fillRect(sx, barY, segW, barH / 2);
        }
        ctx.restore();
      }
    }
    // de drie aanvallen met hun toets
    const chipY = y + 42, chipH = 16;
    const chipW = (barW - gap * 2) / 3;
    ABILITY_ORDER.forEach((kind, i) => {
      const ability = ABILITIES[kind];
      const ready = game.energy >= ability.cost && !locked && !Stands.active;
      const cx = barX + i * (chipW + gap);
      const denied = this.denyKind === kind ? this.denyPulse : 0;
      roundRectPath(ctx, cx, chipY, chipW, chipH, 5);
      ctx.fillStyle = ready ? `rgba(255, 210, 94, ${0.22 + 0.12 * Math.sin(time * 5)})` : denied > 0 ? `rgba(255, 64, 87, ${0.45 * denied})` : 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = ready ? COLORS.gold : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const label = chipW < 70 ? ability.short.split(' ')[0] : ability.short;
      drawText(`${i + 1} ${label}`, cx + chipW / 2, chipY + chipH / 2 + 0.5, {
        size: chipW < 64 ? 8.5 : 9.5, align: 'center', baseline: 'middle', color: ready ? '#ffffff' : 'rgba(255,255,255,0.4)', spacing: 0.5,
        maxWidth: chipW - 6,
      });
    });
  },

  drawLivesPanel(game, x, y, w, time) {
    drawPanel(x, y, w, 86);
    drawText('LEVENS', x + 14, y + 20, { size: 11, color: COLORS.violet, spacing: 2.5 });
    const heartSize = Math.min(26, (w - 28) / game.maxLives);
    for (let i = 0; i < game.maxLives; i++) {
      const filled = i < game.lives;
      const isLast = game.lives === 1 && i === 0;
      const beat = isLast ? 1 + 0.12 * Math.max(0, Math.sin(time * 8)) : 1;
      const shake = i === game.lives && this.lifePulse > 0 ? Math.sin(time * 60) * 3 * this.lifePulse : 0;
      drawSprite(filled ? Sprites.heart : Sprites.heartEmpty, x + 14 + heartSize / 2 + i * heartSize + shake, y + 42, heartSize * 0.92 * beat);
    }
    // je Stand-kaarten als kleine rondjes
    const owned = CARD_POOL.filter(card => game.perks[card.id] > 0);
    const iconSize = 20;
    owned.slice(0, Math.floor((w - 20) / (iconSize + 3))).forEach((card, i) => {
      this.drawPerkIcon(card, game.perks[card.id], x + 14 + iconSize / 2 + i * (iconSize + 3), y + 70, iconSize, game);
    });
  },

  drawPerkIcon(card, level, x, y, size, game) {
    const ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, TAU);
    ctx.fillStyle = card.dark;
    ctx.fill();
    ctx.clip();
    const art = Art.pose(card.art, card.pose);
    if (art) ctx.drawImage(art, x - size * 1.1, y - size * 0.62, size * 2.2, size * 2.2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, TAU);
    ctx.strokeStyle = card.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (level > 1) drawText(String(level), x + size / 2, y + size / 2, { size: 9, align: 'center', baseline: 'middle', color: '#fff', stroke: COLORS.ink, strokeWidth: 3 });
    // King Crimson laat zien hoeveel schilden je nog hebt
    if (card.id === 'crimson') {
      drawText(String(game.crimsonShields), x, y + 1, { size: 11, font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: '#fff', stroke: COLORS.ink, strokeWidth: 3 });
    }
  },

  drawWaveLabel(game, cx, y, narrow) {
    const waves = game.waves;
    const label = `UNIVERSUM ${game.universe}  ·  GOLF ${waves.wave}/${WAVES.perUniverse}`;
    drawText(label, cx, y + 12, { size: narrow ? 12 : 13, align: 'center', baseline: 'middle', color: '#f3eaff', stroke: COLORS.ink, strokeWidth: 3, spacing: 2 });
    const bw = narrow ? 150 : 200;
    const ctx = drawingContext;
    roundRectPath(ctx, cx - bw / 2, y + 26, bw, 5, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    roundRectPath(ctx, cx - bw / 2, y + 26, Math.max(5, bw * waves.progress), 5, 2.5);
    ctx.fillStyle = COLORS.violet;
    ctx.fill();
  },

  drawBossBar(game, W, y, narrow) {
    const boss = game.boss;
    const bw = narrow ? W - 40 : Math.min(420, W * 0.38);
    const x = W / 2 - bw / 2;
    const ctx = drawingContext;
    drawText('ENRICO PUCCI  ·  MADE IN HEAVEN', W / 2, y + 12, {
      size: 13, align: 'center', baseline: 'middle', color: '#ffffff', stroke: COLORS.ink, strokeWidth: 3, spacing: 2,
    });
    roundRectPath(ctx, x, y + 24, bw, 12, 6);
    ctx.fillStyle = 'rgba(10,4,20,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const shown = boss.displayHp / boss.maxHp;
    const real = boss.hp / boss.maxHp;
    ctx.save();
    roundRectPath(ctx, x, y + 24, bw, 12, 6);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x, y + 24, bw * shown, 12);
    const gradient = ctx.createLinearGradient(x, 0, x + bw, 0);
    gradient.addColorStop(0, '#fff2c0');
    gradient.addColorStop(1, boss.enraged ? '#ff5a6e' : '#c7b8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + 24, bw * real, 12);
    ctx.restore();
  },

  drawStatusPills(game, cx, y) {
    const pills = [];
    const stand = Stands.active;
    if (stand && stand.kind === 'stop' && stand.time >= stand.timeline.resume) pills.push(['TIJD STOP x2', COLORS.cyan]);
    if (Stands.overdrive > 0) pills.push([`OVERDRIVE x2  ${Stands.overdrive.toFixed(1)}`, COLORS.gold]);
    if (game.catcher.wideTime > 0) pills.push([`BREED  ${game.catcher.wideTime.toFixed(1)}`, '#5ee7ff']);
    if (game.boss && game.boss.accelTime > 0) pills.push(['TIJD VERSNELD!', '#ffffff']);
    if (!pills.length) return;
    let totalW = 0;
    const widths = pills.map(([text]) => measureText(text, 11) + 22);
    totalW = widths.reduce((sum, value) => sum + value, 0) + (pills.length - 1) * 8;
    let x = cx - totalW / 2;
    pills.forEach(([text, color], i) => {
      drawPanel(x, y, widths[i], 22, { radius: 11, fill: 'rgba(15,6,30,0.8)', edge: color });
      drawText(text, x + widths[i] / 2, y + 11.5, { size: 11, align: 'center', baseline: 'middle', color, spacing: 1 });
      x += widths[i] + 8;
    });
  },

  // Klein bordje boven de catcher met je huidige vermenigvuldiger.
  drawMultiplierBadge(game, time) {
    const mult = game.currentMultiplier();
    if (mult <= 1) return;
    const x = game.catcher.x, y = game.catcher.rimY - 34;
    drawText('x' + (Number.isInteger(mult) ? mult : mult.toFixed(1)), x, y, {
      size: 18 + this.comboPulse * 6, font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle',
      color: mult >= 4 ? '#ff9de0' : COLORS.gold, stroke: COLORS.ink, strokeWidth: 4, skew: -0.15, alpha: 0.85 + 0.15 * Math.sin(time * 6),
    });
  },

  drawTouchButtons(game, W) {
    this.touchButtons = [];
    const r = 30;
    ABILITY_ORDER.forEach((kind, i) => {
      const x = W - r - 14, y = 330 + i * (r * 2 + 14);
      const ready = game.energy >= ABILITIES[kind].cost && game.discLock <= 0 && !Stands.active;
      const ctx = drawingContext;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = ready ? 'rgba(255, 210, 94, 0.35)' : 'rgba(30, 14, 56, 0.6)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ready ? COLORS.gold : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      drawText(String(i + 1), x, y - 6, { size: 18, font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: '#fff' });
      drawText(ABILITIES[kind].short.split(' ')[0], x, y + 12, { size: 8, align: 'center', baseline: 'middle', color: '#fff' });
      this.touchButtons.push({ kind, x, y, r });
    });
  },

  // Raakt een vinger een van de knoppen? Geeft de soort aanval terug.
  touchAbilityAt(x, y) {
    for (const button of this.touchButtons) {
      if (distance(x, y, button.x, button.y) <= button.r + 8) return button.kind;
    }
    return null;
  },
};

// Bij welke combo-trap hoort deze combo?
function comboTier(combo) {
  let tier = COMBO_TIERS[0];
  for (const item of COMBO_TIERS) if (combo >= item.at) tier = item;
  return tier;
}
