// ============================================================
//  screens.js — titelscherm, uitleg, pauzemenu en Game Over.
//  Alle schermen tekenen in speelveld-coördinaten.
// ============================================================

// ------------------------------------------------------------
//  Titelscherm
// ------------------------------------------------------------
const TitleScreen = {
  time: 0,
  buttons: [],
  selected: 0,

  open() {
    this.time = 0;
    this.selected = 0;
    this.buttons = [
      new Button('SPELEN', () => Game.startRun(), { primary: true, hint: 'ENTER' }),
      new Button('HOE SPEEL JE?', () => HelpScreen.open(), { hint: 'H' }),
      new Button('INSTELLINGEN', () => Settings.open(), { hint: 'O' }),
      new Button('3D COMBAT MODE', () => { window.location.href = 'combat.html'; }, { hint: 'BETA' }),
    ];
  },

  onKey(key, code) {
    if (code === ENTER || key === ' ') this.buttons[this.selected].action();
    else if (code === UP_ARROW || key === 'w' || key === 'W') this.move(-1);
    else if (code === DOWN_ARROW || key === 's' || key === 'S') this.move(1);
    else if (key === 'h' || key === 'H') HelpScreen.open();
  },

  move(direction) {
    this.selected = (this.selected + direction + this.buttons.length) % this.buttons.length;
    Sound.play('catch', { volume: 0.35, rate: 0.8 });
  },

  onPointer(x, y, clicked) {
    this.buttons.forEach((button, i) => {
      if (button.contains(x, y)) {
        this.selected = i;
        if (clicked) button.action();
      }
    });
  },

  update(dt) {
    this.time += dt;
    this.buttons.forEach((button, i) => {
      button.selected = i === this.selected;
      button.update(dt, Input.pointerX, Input.pointerY);
    });
    // dreigende ゴゴゴ op de achtergrond
    FX.menacing(View.w, dt * 3);
  },

  draw(W) {
    const H = FIELD.height;
    const t = this.time;
    const narrow = W < 820;

    // Jotaro met Star Platinum achter zich
    const heroX = narrow ? W * 0.5 : W * 0.27;
    const heroAlpha = (narrow ? 0.32 : 1) * Math.min(1, t / 0.6);
    const float = Math.sin(t * 1.4) * 6;
    Art.drawGlow('star', 0, heroX + 30, H - 60 + float, 560, 'rgb(140, 90, 255)', 0.55 * heroAlpha);
    Art.draw('star', 0, heroX + 30, H - 60 + float, 560, { alpha: 0.55 * heroAlpha });
    Art.draw('jotaro', 0, heroX - 10, H + 10, 470, { alpha: heroAlpha });

    // logo
    const logoX = narrow ? W / 2 : W * 0.68;
    const appear = easeOutBack(clamp(t / 0.6, 0, 1));
    const logoSize = Math.min(narrow ? W * 0.15 : 96, 96);
    drawText("JOJO'S BIZARRE", logoX, 104, {
      size: Math.round(logoSize * 0.26), align: 'center', baseline: 'middle', color: COLORS.violet, spacing: 6, alpha: appear,
      stroke: COLORS.ink, strokeWidth: 3,
    });
    drawJoJoTitle('CATCHER', logoX, 104 + logoSize * 0.72, logoSize * mix(1.6, 1, appear), { alpha: Math.min(1, t * 3) });
    drawJoJoTitle('STAND OVERDRIVE', logoX, 104 + logoSize * 1.42, logoSize * 0.34, { color: '#ffffff', shadow: 'rgba(255, 95, 168, 0.85)', alpha: Math.min(1, t * 2) });

    // knoppen
    const bw = Math.min(330, W * 0.78), bh = 50;
    const startY = 104 + logoSize * 1.42 + 52;
    this.buttons.forEach((button, i) => {
      const slide = easeOutCubic(clamp((t - 0.25 - i * 0.07) / 0.4, 0, 1));
      button.place(logoX - bw / 2 + (1 - slide) * 60, startY + i * (bh + 12), bw, bh);
      button.draw(slide);
    });

    // records
    const recordY = startY + this.buttons.length * (bh + 12) + 26;
    const best = Save.data.best;
    if (best > 0) {
      drawText(`RECORD ${formatScore(best)}   ·   LANGSTE COMBO ${Save.data.bestCombo}`, logoX, recordY, {
        size: 13, align: 'center', baseline: 'middle', color: COLORS.gold, spacing: 1.5, alpha: Math.min(1, t * 2),
      });
    } else {
      drawText('Vang de orbs · bouw combo\'s · laat je Stand los', logoX, recordY, {
        size: 14, align: 'center', baseline: 'middle', color: '#e9dcff', alpha: Math.min(1, t * 2),
      });
    }
    if (Art.progress < 1) {
      drawText(`Plaatjes laden... ${Math.round(Art.progress * 100)}%`, logoX, recordY + 24, { size: 11, align: 'center', color: 'rgba(255,255,255,0.5)' });
    }
    drawText(Input.touchMode ? 'Tik op SPELEN' : 'ENTER = spelen   ·   ↑ ↓ = kiezen   ·   O = instellingen', W / 2, H - 18, {
      size: 12, align: 'center', baseline: 'middle', color: 'rgba(240,225,255,0.6)',
    });
  },
};

// ------------------------------------------------------------
//  Uitleg ("Hoe speel je?")
// ------------------------------------------------------------
const HelpScreen = {
  visible: false,
  time: 0,

  open() {
    this.visible = true;
    this.time = 0;
    Sound.play('catch', { volume: 0.4 });
  },

  close() {
    this.visible = false;
  },

  update(dt) {
    if (this.visible) this.time += dt;
  },

  draw(W) {
    if (!this.visible) return;
    const H = FIELD.height;
    const ctx = drawingContext;
    const fade = Math.min(1, this.time / 0.2);
    ctx.save();
    ctx.fillStyle = `rgba(6, 2, 16, ${0.86 * fade})`;
    ctx.fillRect(-2000, -2000, W + 4000, H + 4000);
    ctx.restore();
    const pw = Math.min(860, W - 30);
    const twoColumns = pw > 640;
    const ph = twoColumns ? 480 : 680;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    drawPanel(px, py, pw, ph, { alpha: fade, fill: 'rgba(24, 12, 46, 0.96)' });
    drawJoJoTitle('HOE SPEEL JE?', W / 2, py + 44, 40, { alpha: fade });

    const colW = twoColumns ? (pw - 60) / 2 : pw - 40;
    const leftX = px + 24, rightX = twoColumns ? px + 36 + colW : px + 24;
    let y = py + 92;
    const rows = [
      [Sprites.orb, 'Roze orb', 'Vangen! Missen kost een leven.'],
      [Sprites.gold, 'Gouden orb', '50 punten. Missen mag.'],
      [Sprites.bomb, 'Bom (Killer Queen)', 'NIET vangen! Kost een leven.'],
      [Sprites.life, 'Lieveheersbeestje', '+1 leven (max 5).'],
      [Sprites.arrow, 'Stand Arrow', 'Meteen een hele energiebalk.'],
      [Sprites.wide, 'Breed', 'Je catcher wordt 10 sec breder.'],
    ];
    for (const [sprite, name, text] of rows) {
      drawSprite(sprite, leftX + 18, y, 42, 0, fade);
      drawText(name, leftX + 46, y - 6, { size: 15, color: '#ffffff', alpha: fade });
      drawText(text, leftX + 46, y + 13, { size: 13, weight: '500', color: '#d9c8f0', alpha: fade, maxWidth: colW - 50 });
      y += 52;
    }
    let ry = twoColumns ? py + 92 : y + 10;
    const sections = [
      ['BESTURING', [
        '← → of A D  —  bewegen (of muis / vinger)',
        '1 · 2 · 3  (of Q W E)  —  Stand-aanvallen',
        'P of ESC  —  pauze      ·      M  —  geluid aan/uit',
        'R (pauze / Game Over)  —  MADE IN HEAVEN-reset',
      ]],
      ['STAND-AANVALLEN', [
        '1  ORA ORA — 1 balk: alles in je catcher',
        '2  ZA WARUDO — 2 balken: tijd stil + x2',
        '3  ROAD ROLLER — 3 balken: alles weg + x2',
      ]],
      ['TIPS', [
        'Vang in het midden voor een PERFECT.',
        'Niet missen = combo = tot x5 punten.',
        'Na elke golf kies je een Stand-kaart.',
        'Golf 5: versla Pucci voor een nieuw universum!',
      ]],
    ];
    const bottom = py + ph - 44; // niet over de onderrand van het paneel heen
    for (const [title, lines] of sections) {
      if (ry + 20 + lines.length * 20 > bottom) break;
      drawText(title, rightX, ry, { size: 13, color: COLORS.gold, spacing: 2, alpha: fade });
      ry += 20;
      for (const line of lines) {
        drawText(line, rightX, ry, { size: 13.5, weight: '500', color: '#efe4ff', alpha: fade, maxWidth: colW });
        ry += 20;
      }
      ry += 12;
    }
    this.drawCloseHint(W, py + ph, fade);
  },

  drawCloseHint(W, bottom, fade) {
    drawText(Input.touchMode ? 'Tik om terug te gaan' : 'ESC, ENTER of klik om terug te gaan', W / 2, bottom - 22, {
      size: 13, align: 'center', baseline: 'middle', color: 'rgba(240,225,255,0.65)', alpha: fade,
    });
  },
};

// ------------------------------------------------------------
//  Pauzemenu
// ------------------------------------------------------------
const PauseMenu = {
  buttons: [],
  selected: 0,
  time: 0,

  open() {
    this.time = 0;
    this.selected = 0;
    this.buttons = [
      new Button('DOORGAAN', () => Game.resume(), { primary: true, hint: 'ESC' }),
      new Button('OPNIEUW', () => Game.startRun()),
      new Button('MADE IN HEAVEN', () => Game.heavenRestart(), { hint: 'R' }),
      new Button('INSTELLINGEN', () => Settings.open(), { hint: 'O' }),
      new Button('HOE SPEEL JE?', () => HelpScreen.open(), { hint: 'H' }),
      new Button('HOOFDMENU', () => Game.toTitle(), { hint: 'Q' }),
    ];
  },

  onKey(key, code) {
    if (code === ENTER || key === ' ') this.buttons[this.selected].action();
    else if (code === UP_ARROW || key === 'w' || key === 'W') this.move(-1);
    else if (code === DOWN_ARROW || key === 's' || key === 'S') this.move(1);
    else if (key === 'r' || key === 'R') Game.heavenRestart();
    else if (key === 'q' || key === 'Q') Game.toTitle();
    else if (key === 'h' || key === 'H') HelpScreen.open();
  },

  move(direction) {
    this.selected = (this.selected + direction + this.buttons.length) % this.buttons.length;
    Sound.play('catch', { volume: 0.35, rate: 0.8 });
  },

  onPointer(x, y, clicked) {
    this.buttons.forEach((button, i) => {
      if (button.contains(x, y)) {
        this.selected = i;
        if (clicked) button.action();
      }
    });
  },

  update(dt) {
    this.time += dt;
    this.buttons.forEach((button, i) => {
      button.selected = i === this.selected;
      button.update(dt, Input.pointerX, Input.pointerY);
    });
  },

  draw(W) {
    const H = FIELD.height;
    const ctx = drawingContext;
    const fade = Math.min(1, this.time / 0.15);
    ctx.save();
    ctx.fillStyle = `rgba(6, 2, 16, ${0.7 * fade})`;
    ctx.fillRect(-2000, -2000, W + 4000, H + 4000);
    ctx.restore();
    drawJoJoTitle('PAUZE', W / 2, 130, 64, { alpha: fade });
    const bw = Math.min(320, W * 0.8), bh = 46;
    this.buttons.forEach((button, i) => {
      button.place(W / 2 - bw / 2, 190 + i * (bh + 11), bw, bh);
      button.draw(fade);
    });
  },
};

// ------------------------------------------------------------
//  Game Over: eerst "TO BE CONTINUED", dan je resultaten
// ------------------------------------------------------------
const GameOverScreen = {
  time: 0,
  results: null,
  buttons: [],
  selected: 0,

  open(results) {
    this.time = 0;
    this.results = results;
    this.selected = 0;
    this.buttons = [
      new Button('OPNIEUW', () => Game.startRun(), { primary: true, hint: 'ENTER' }),
      new Button('MADE IN HEAVEN', () => Game.heavenRestart(), { hint: 'R' }),
      new Button('HOOFDMENU', () => Game.toTitle(), { hint: 'ESC' }),
    ];
  },

  get ready() {
    return this.time > 1.6;
  },

  onKey(key, code) {
    if (!this.ready) {
      if (this.time > 0.4 && (code === ENTER || key === ' ')) this.time = 1.6;
      return;
    }
    if (code === ENTER || key === ' ') this.buttons[this.selected].action();
    else if (key === 'r' || key === 'R') Game.heavenRestart();
    else if (code === ESCAPE || key === 'q' || key === 'Q') Game.toTitle();
    else if (code === LEFT_ARROW || code === UP_ARROW || code === RIGHT_ARROW || code === DOWN_ARROW) {
      const step = code === LEFT_ARROW || code === UP_ARROW ? -1 : 1;
      this.selected = (this.selected + step + this.buttons.length) % this.buttons.length;
      Sound.play('catch', { volume: 0.35, rate: 0.8 });
    }
  },

  onPointer(x, y, clicked) {
    if (!this.ready) return;
    this.buttons.forEach((button, i) => {
      if (button.contains(x, y)) {
        this.selected = i;
        if (clicked) button.action();
      }
    });
  },

  update(dt) {
    this.time += dt;
    this.buttons.forEach((button, i) => {
      button.selected = i === this.selected;
      button.update(dt, Input.pointerX, Input.pointerY);
    });
  },

  // De sepia-kleur van een oude foto over het hele scherm.
  drawSepia(amount) {
    if (amount <= 0) return;
    const ctx = drawingContext;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = amount * 0.85;
    ctx.fillStyle = '#a5773a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  },

  draw(W) {
    const H = FIELD.height;
    const t = this.time;
    const r = this.results;
    // de pijl schuift binnen van links
    const arrowIn = easeOutCubic(clamp((t - 0.25) / 0.45, 0, 1));
    const arrowW = Math.min(420, W * 0.7);
    drawToBeContinued(16 - (1 - arrowIn) * (arrowW + 40), H - 30 - arrowW * 0.16, arrowW, 1);

    if (t < 1.2) return;
    const fade = easeOutCubic(clamp((t - 1.2) / 0.4, 0, 1));
    const pw = Math.min(460, W - 30), ph = 420;
    const px = (W - pw) / 2, py = 70;
    drawPanel(px, py + (1 - fade) * 30, pw, ph, { alpha: fade, fill: 'rgba(24, 12, 46, 0.95)', glow: 'rgba(120, 60, 220, 0.5)' });
    const top = py + (1 - fade) * 30;
    drawJoJoTitle(r.record ? 'NIEUW RECORD!' : 'GAME OVER', W / 2, top + 50, r.record ? 46 : 52, {
      alpha: fade, color: r.record ? COLORS.gold : '#ffffff', shadow: r.record ? 'rgba(255, 95, 168, 0.9)' : undefined,
    });
    drawText(formatScore(r.score), W / 2, top + 116, {
      size: 54, font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: COLORS.gold, stroke: COLORS.ink, strokeWidth: 6, alpha: fade, skew: -0.08,
    });
    drawText('BEST ' + formatScore(Save.data.best), W / 2, top + 152, { size: 13, align: 'center', baseline: 'middle', color: 'rgba(240,225,255,0.7)', alpha: fade, spacing: 2 });
    const stats = [
      ['UNIVERSUM', `${r.universe} · golf ${r.wave}`],
      ['GEVANGEN', String(r.caught)],
      ['LANGSTE COMBO', String(r.maxCombo)],
      ['PERFECT', String(r.perfects)],
    ];
    stats.forEach(([label, value], i) => {
      const sx = px + 30 + (i % 2) * (pw - 60) / 2;
      const sy = top + 188 + Math.floor(i / 2) * 44;
      drawText(label, sx, sy, { size: 11, color: COLORS.violet, spacing: 2, alpha: fade });
      drawText(value, sx, sy + 20, { size: 19, font: FONT_TITLE, weight: '400', color: '#ffffff', alpha: fade });
    });
    // bovenaan OPNIEUW over de hele breedte, daaronder MADE IN HEAVEN en HOOFDMENU
    const fullW = pw - 60, halfW = (fullW - 12) / 2, bh = 44;
    this.buttons[0].place(px + 30, top + ph - 116, fullW, bh);
    this.buttons[1].place(px + 30, top + ph - 62, halfW, bh);
    this.buttons[2].place(px + 30 + halfW + 12, top + ph - 62, halfW, bh);
    this.buttons.forEach(button => button.draw(fade));
  },
};
