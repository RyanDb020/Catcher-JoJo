// ============================================================
//  cards.js — Stand-kaarten: na elke golf kies je 1 van 3 kaarten.
//
//  Elke kaart geeft je een blijvende kracht voor de rest van het
//  potje. Sommige kaarten kun je vaker kiezen (hogere level).
//  Zo is elk potje een beetje anders.
// ============================================================

const CARD_POOL = [
  {
    id: 'experience', name: 'GOLD EXPERIENCE', user: 'Giorno Giovanna', art: 'experience', pose: 0,
    color: '#f2c230', dark: '#5e3d00', maxLevel: 2, voice: 'vGiorno', voiceTime: 2.2,
    text: () => '+1 maximum leven en je krijgt meteen een leven terug.',
  },
  {
    id: 'hand', name: 'THE HAND', user: 'Okuyasu Nijimura', art: 'hand', pose: 0,
    color: '#4a6ae8', dark: '#101c55', maxLevel: 3, voice: 'vHand', voiceTime: 1.75,
    text: level => `Elke ${[9, 7, 5][level]} seconden wist The Hand de bom die het dichtst bij je is.`,
  },
  {
    id: 'tusk', name: 'TUSK', user: 'Johnny Joestar', art: 'tusk', pose: 0,
    color: '#ef7fae', dark: '#5a1235', maxLevel: 2, voice: 'vTusk', voiceTime: 1.9,
    text: level => level === 0
      ? 'Een PERFECT vangst schiet een nagel naar de dichtstbijzijnde bom (of baas).'
      : 'Nu schiet ook 1 op de 3 gewone vangsten een nagel.',
  },
  {
    id: 'cmoon', name: 'C-MOON', user: 'Enrico Pucci', art: 'cmoon', pose: 1,
    color: '#62c255', dark: '#123d12', maxLevel: 3, voice: 'vCmoon', voiceTime: 2.4,
    text: level => `Zwaartekracht: orbs binnen ${[110, 160, 210][level]} pixels worden naar je catcher getrokken.`,
  },
  {
    id: 'crimson', name: 'KING CRIMSON', user: 'Diavolo', art: 'crimson', pose: 0,
    color: '#e0334c', dark: '#4d0612', maxLevel: 2, voice: 'vCrimson', voiceTime: 2.2,
    text: level => `Epitaph: ${level + 1} keer per golf wordt een fout (misser of bom) uit de tijd gewist.`,
  },
  {
    id: 'star', name: 'STAR PLATINUM', user: 'Jotaro Kujo', art: 'star', pose: 0,
    color: '#8b5cf6', dark: '#24105c', maxLevel: 3, voice: 'vOra', voiceTime: 1.3,
    text: () => 'Precisie: je catcher wordt 12% breder en de PERFECT-zone 40% groter.',
  },
  {
    id: 'world', name: 'THE WORLD', user: 'DIO', art: 'world', pose: 1,
    color: '#e8b923', dark: '#5a3a05', maxLevel: 2, voice: 'vZaWarudo', voiceTime: 1.5,
    text: () => 'ZA WARUDO duurt langer: +0,5 sec stilstand en +2,5 sec slow-motion.',
  },
  {
    id: 'heaven', name: 'MADE IN HEAVEN', user: 'Enrico Pucci', art: 'heaven', pose: 2,
    color: '#dcd8ff', dark: '#2c2560', maxLevel: 2, voice: 'vAccelerate', voiceTime: 2,
    text: () => 'Versnelling: +30% punten, maar alles valt 10% sneller. Durf jij?',
  },
  {
    id: 'jotaro', name: 'YARE YARE DAZE', user: 'Jotaro Kujo', art: 'jotaro', pose: 0,
    color: '#7a63d6', dark: '#1b1240', maxLevel: 2, voice: 'vStarStop', voiceTime: 1.4,
    text: () => 'Je Stand Energy laadt 30% sneller op.',
  },
  {
    id: 'dio', name: 'VAMPIER', user: 'DIO', art: 'dio', pose: 1,
    color: '#f0c419', dark: '#4d2a00', maxLevel: 2, voice: 'vWryyy', voiceTime: 1.6,
    text: level => `Elke ${[40, 25][level]} combo krijg je een leven terug. WRYYY!`,
  },
];

// Alle kaart-levels beginnen op 0.
function freshPerks() {
  const perks = {};
  for (const card of CARD_POOL) perks[card.id] = 0;
  return perks;
}

// Kiest 3 willekeurige kaarten die je nog kunt verbeteren.
function offerCards(perks, count = 3) {
  const available = CARD_POOL.filter(card => perks[card.id] < card.maxLevel);
  return shuffled(available).slice(0, count);
}

// ------------------------------------------------------------
//  Het scherm waarop je een kaart kiest
// ------------------------------------------------------------
const CardScreen = {
  cards: [],
  selected: 1,
  time: 0,
  picked: -1,
  pickTime: 0,
  onPick: null,
  title: '',
  subtitle: '',
  rects: [],

  open(cards, title, subtitle, onPick) {
    this.cards = cards;
    this.selected = Math.min(1, cards.length - 1);
    this.time = 0;
    this.picked = -1;
    this.pickTime = 0;
    this.onPick = onPick;
    this.title = title;
    this.subtitle = subtitle;
    Sound.play('bell', { volume: 0.5, rate: 1.2 });
  },

  choose(index) {
    if (this.picked >= 0 || index < 0 || index >= this.cards.length || this.time < 0.45) return;
    this.picked = index;
    this.pickTime = 0;
    const card = this.cards[index];
    Sound.play('power', { volume: 0.8 });
    if (card.voice) Sound.playVoice(card.voice, { duration: card.voiceTime, fadeOut: 0.35 });
    FX.flash('255,255,255', 0.25, 4);
  },

  onKey(key, code) {
    if (this.picked >= 0) return;
    if (key === '1' || key === '2' || key === '3') this.choose(Number(key) - 1);
    else if (code === LEFT_ARROW || key === 'a' || key === 'A') this.move(-1);
    else if (code === RIGHT_ARROW || key === 'd' || key === 'D') this.move(1);
    else if (code === ENTER || key === ' ') this.choose(this.selected);
  },

  move(direction) {
    this.selected = clamp(this.selected + direction, 0, this.cards.length - 1);
    Sound.play('catch', { volume: 0.4, rate: 0.8 });
  },

  onPointer(x, y, clicked) {
    if (this.picked >= 0) return;
    this.rects.forEach((rect, i) => {
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        if (this.selected !== i) this.selected = i;
        if (clicked) this.choose(i);
      }
    });
  },

  update(dt) {
    this.time += dt;
    if (this.picked >= 0) {
      this.pickTime += dt;
      if (this.pickTime >= 1.0 && this.onPick) {
        const callback = this.onPick;
        this.onPick = null;
        callback(this.cards[this.picked]);
      }
    }
  },

  draw(fieldW, perks) {
    const ctx = drawingContext;
    const H = FIELD.height;
    const fade = Math.min(1, this.time / 0.3) * (this.picked >= 0 ? 1 - progress(this.pickTime, 0.7, 1) : 1);
    ctx.save();
    ctx.fillStyle = `rgba(6, 2, 16, ${0.72 * fade})`;
    ctx.fillRect(-2000, -2000, fieldW + 4000, H + 4000);
    ctx.restore();

    drawJoJoTitle(this.title, fieldW / 2, 74, Math.min(54, fieldW * 0.085), { alpha: fade });
    drawText(this.subtitle, fieldW / 2, 118, { size: 17, align: 'center', baseline: 'middle', color: '#e9dcff', alpha: fade });

    const gap = 18;
    const cardW = Math.min(250, (fieldW - gap * 4) / 3);
    // smalle kaarten (telefoon) worden wat hoger, zodat de uitleg past
    const cardH = Math.min(410, Math.max(cardW * 1.62, cardW * 0.92 + 175));
    const totalW = cardW * this.cards.length + gap * (this.cards.length - 1);
    const startX = (fieldW - totalW) / 2;
    const baseY = 150;
    this.rects = [];

    this.cards.forEach((card, i) => {
      const appear = easeOutBack(clamp((this.time - 0.08 * i) / 0.4, 0, 1));
      let x = startX + i * (cardW + gap);
      let y = baseY + (1 - appear) * 300;
      let scale = 1;
      let alpha = Math.min(1, appear) * fade;
      const isSelected = i === this.selected && this.picked < 0;
      if (isSelected) y -= 10 + Math.sin(this.time * 4) * 2;
      if (this.picked >= 0) {
        if (i === this.picked) {
          scale = 1 + easeOutCubic(Math.min(1, this.pickTime / 0.3)) * 0.12;
        } else {
          y += easeInCubic(Math.min(1, this.pickTime / 0.5)) * 400;
          alpha *= 1 - Math.min(1, this.pickTime / 0.4);
        }
      }
      this.rects.push({ x, y, w: cardW, h: cardH });
      this.drawCard(card, perks[card.id], x, y, cardW, cardH, scale, alpha, isSelected || i === this.picked, i);
    });

    if (this.picked < 0) {
      const hint = Input.touchMode ? 'Tik op een kaart' : 'Kies met 1 · 2 · 3  of  ← → en ENTER';
      drawText(hint, fieldW / 2, baseY + cardH + 40, { size: 15, align: 'center', baseline: 'middle', color: 'rgba(240,225,255,0.75)', alpha: fade });
    }
  },

  drawCard(card, level, x, y, w, h, scale, alpha, highlight, index) {
    if (alpha <= 0.01) return;
    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);

    // kaart-achtergrond
    roundRectPath(ctx, 0, 0, w, h, 16);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, card.color);
    bg.addColorStop(0.55, card.dark);
    bg.addColorStop(1, '#0b0616');
    ctx.fillStyle = bg;
    if (highlight) {
      ctx.shadowColor = card.color;
      ctx.shadowBlur = 30;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    roundRectPath(ctx, 0, 0, w, h, 16);
    ctx.clip();
    ctx.globalAlpha *= 0.25;
    ctx.fillStyle = ctx.createPattern(Sprites.halftone, 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha /= 0.25;
    // het personage
    const art = Art.pose(card.art, card.pose);
    if (art) {
      const size = w * 1.05;
      ctx.drawImage(art, (w - size) / 2, 22, size, size);
    }
    // onderkant donker voor de tekst
    const nameY = Math.min(h * 0.62, w * 0.92 + 26);
    const shade = ctx.createLinearGradient(0, nameY - 70, 0, h);
    shade.addColorStop(0, 'rgba(8,3,18,0)');
    shade.addColorStop(0.3, 'rgba(8,3,18,0.85)');
    shade.addColorStop(1, 'rgba(8,3,18,0.97)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, nameY - 70, w, h - nameY + 70);
    ctx.restore();

    roundRectPath(ctx, 0, 0, w, h, 16);
    ctx.lineWidth = highlight ? 3.5 : 2;
    ctx.strokeStyle = highlight ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.stroke();

    // toets-nummer
    ctx.beginPath();
    ctx.arc(24, 24, 15, 0, TAU);
    ctx.fillStyle = 'rgba(10,4,20,0.85)';
    ctx.fill();
    ctx.strokeStyle = card.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(String(index + 1), 24, 25, { size: 16, font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: '#ffffff' });

    // level-sterren
    for (let i = 0; i < card.maxLevel; i++) {
      starPath(ctx, w - 20 - i * 18, 24, 5, 7, 3);
      ctx.fillStyle = i < level ? COLORS.gold : (i === level ? '#ffffff' : 'rgba(255,255,255,0.18)');
      ctx.fill();
    }
    if (level > 0) {
      drawText('LEVEL ' + (level + 1), w - 14, 46, { size: 11, align: 'right', baseline: 'middle', color: COLORS.gold, stroke: COLORS.ink, strokeWidth: 3 });
    }

    // naam en uitleg
    const nameSize = Math.min(26, w * 0.115);
    drawText(card.name, w / 2, nameY, {
      size: nameSize, font: FONT_TITLE, weight: '400', align: 'center', baseline: 'middle', color: '#ffffff',
      stroke: COLORS.ink, strokeWidth: 5, skew: -0.12, maxWidth: w - 20,
    });
    drawText(card.user.toUpperCase(), w / 2, nameY + nameSize * 0.85, {
      size: 10, align: 'center', baseline: 'middle', color: card.color, spacing: 2, maxWidth: w - 14,
    });
    const textSize = Math.max(12, Math.min(14, w * 0.058));
    const lineHeight = textSize * 1.3;
    const lines = wrapText(card.text(level), textSize, w - 22);
    lines.forEach((line, i) => {
      drawText(line, w / 2, nameY + nameSize * 0.85 + 24 + i * lineHeight, {
        size: textSize, weight: '600', align: 'center', baseline: 'middle', color: '#f3eaff',
      });
    });
    ctx.restore();
  },
};
