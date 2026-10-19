// ============================================================
//  stands.js — de drie Stand-aanvallen.
//
//  1  ORA ORA      (1 balk)  Star Platinum slaat alles op het scherm
//                            in je catcher en ramt bommen kapot.
//  2  ZA WARUDO    (2 balken) De tijd staat stil. Jij kan bewegen,
//                            The World slaat de bommen kapot. Daarna
//                            slow-motion met dubbele punten.
//  3  ROAD ROLLER  (3 balken) DIO laat een wals vallen: een schokgolf
//                            verzamelt alles. Daarna 8 sec dubbele punten.
//
//  Elke aanval is een kleine tijdlijn: we houden bij hoeveel tijd er
//  verstreken is (active.time) en kijken in welke fase we zitten.
// ============================================================

const Stands = {
  active: null,      // de aanval die nu bezig is
  fists: [],         // vliegende vuisten (ORA)
  overdrive: 0,      // seconden dubbele punten na de Road Roller
  cracks: [],        // barsten in de lucht na de Road Roller-inslag
  crackLife: 0,

  reset() {
    this.active = null;
    this.fists = [];
    this.overdrive = 0;
    this.cracks = [];
    this.crackLife = 0;
  },

  // Mag deze aanval nu?
  canActivate(kind, game) {
    return game.state === 'playing' && !this.active && !CutIn.active && game.discLock <= 0
      && game.energy >= ABILITIES[kind].cost && !game.gameOverPending;
  },

  activate(kind, game) {
    if (!this.canActivate(kind, game)) {
      if (game.state === 'playing' && !this.active) game.denyAbility(kind);
      return false;
    }
    game.energy -= ABILITIES[kind].cost;
    game.stats.abilities++;
    if (kind === 'ora') this.startOra(game);
    if (kind === 'stop') this.startStop(game);
    if (kind === 'roller') this.startRoller(game);
    return true;
  },

  // ---------- tijd ----------
  // Hoe snel loopt de wereld door de aanval? (0 = stil, 1 = normaal)
  timeScale() {
    const a = this.active;
    if (!a) return 1;
    if (a.kind === 'ora') {
      if (a.time < ORA_TIMING.cutIn) return 0;
      const end = ORA_TIMING.cutIn + ORA_TIMING.rush;
      if (a.time < end) return ORA_TIMING.worldSpeed;
      return mix(ORA_TIMING.worldSpeed, 1, progress(a.time, end, end + 0.5));
    }
    if (a.kind === 'stop') {
      const T = a.timeline;
      if (a.time < T.resume) return 0;
      if (a.time < T.slow) return mix(0, STOP_TIMING.slowSpeed, progress(a.time, T.resume, T.slow));
      if (a.time < T.recover) return STOP_TIMING.slowSpeed;
      return mix(STOP_TIMING.slowSpeed, 1, progress(a.time, T.recover, T.end));
    }
    if (a.kind === 'roller') {
      const T = a.timeline;
      if (a.time < T.impact) return 0;
      if (a.time < T.impact + ROLLER_TIMING.shockwave) return 0.2;
      return mix(0.2, 1, progress(a.time, T.impact + ROLLER_TIMING.shockwave, T.shatter));
    }
    return 1;
  },

  // Hoe grijs de wereld is (Time Stop).
  desaturation() {
    const a = this.active;
    if (!a || a.kind !== 'stop') return 0;
    const T = a.timeline;
    if (a.time < T.expand) return 0;
    if (a.time < T.frozen) return progress(a.time, T.expand, T.frozen);
    if (a.time < T.resume) return 1;
    if (a.time < T.slow) return mix(1, 0.2, progress(a.time, T.resume, T.slow));
    if (a.time < T.recover) return 0.2;
    return mix(0.2, 0, progress(a.time, T.recover, T.end));
  },

  // De omgekeerde-kleurenbol van ZA WARUDO: straal 0..1 (deel van het scherm).
  inversion() {
    const a = this.active;
    if (!a || a.kind !== 'stop') return 0;
    const T = a.timeline;
    if (a.time < T.expand || a.time > T.frozen + 0.12) return 0;
    return easeOutCubic(progress(a.time, T.expand, T.frozen));
  },

  // Tijdens een cut-in staat ook de catcher even stil.
  catcherFrozen() {
    return CutIn.active;
  },

  // Krijg je nu dubbele punten?
  scoreBonus() {
    let bonus = 1;
    if (this.overdrive > 0) bonus *= 2;
    const a = this.active;
    if (a && a.kind === 'stop' && a.time >= a.timeline.resume) bonus *= 2;
    return bonus;
  },

  // Muziek: langzamer en lager tijdens Time Stop
  musicRate() {
    const a = this.active;
    if (a && a.kind === 'stop') {
      const T = a.timeline;
      if (a.time >= T.expand && a.time < T.recover) return 0.72;
    }
    return 1;
  },

  musicLevel() {
    const a = this.active;
    if (!a) return 1;
    if (a.kind === 'stop' && a.time >= a.timeline.expand && a.time < a.timeline.resume) return 0.18;
    return 1;
  },

  // ---------- ORA ORA ----------
  startOra(game) {
    this.active = { kind: 'ora', time: 0, nextPunch: ORA_TIMING.cutIn, punches: 0, finalDone: false };
    CutIn.start({
      art: 'star', pose: 5, title: 'ORA ORA ORA!', subtitle: 'STAR PLATINUM',
      color1: '#6a3fd0', color2: '#24105c', textColor: '#ffe27a', duration: ORA_TIMING.cutIn,
    });
    Sound.playVoice('vOra', { duration: ORA_TIMING.cutIn + ORA_TIMING.rush + 0.4, fadeOut: 0.5 });
    Sound.play('whoosh', { volume: 0.7 });
    FX.flash('180,120,255', 0.3, 4);
  },

  oraOrigin(game, side) {
    return { x: game.catcher.x + side * 34, y: game.catcher.rimY - 170 };
  },

  updateOra(dt, game) {
    const a = this.active;
    const rushEnd = ORA_TIMING.cutIn + ORA_TIMING.rush;
    if (a.time >= ORA_TIMING.cutIn && a.time < rushEnd) {
      while (a.time >= a.nextPunch && a.nextPunch < rushEnd) {
        this.launchFist(game, a.punches);
        a.punches++;
        a.nextPunch += ORA_TIMING.punchInterval;
      }
    }
    // laatste, extra harde klap
    if (!a.finalDone && a.time >= rushEnd) {
      a.finalDone = true;
      const origin = this.oraOrigin(game, 1);
      const target = game.boss && game.boss.alive ? { x: game.boss.x, y: game.boss.y + 70 } : { x: origin.x + 40, y: origin.y - 180 };
      this.fists.push({ sx: origin.x, sy: origin.y, tx: target.x, ty: target.y, t: 0, target: game.boss && game.boss.alive ? 'boss' : null, big: true });
      Sound.play('heavy', { volume: 1 });
      FX.shake(0.45);
      FX.text(origin.x, origin.y - 60, 'ORAAA!', { size: 46, color: COLORS.gold, life: 1 });
      game.impactAt(target.x, target.y, 0.08, 0.06);
    }
    if (a.time >= rushEnd + 0.55 && this.fists.length === 0) this.active = null;
  },

  // Zoekt het volgende doelwit: wat het laagst hangt is het dringendst.
  launchFist(game, index) {
    const side = index % 2 === 0 ? -1 : 1;
    const origin = this.oraOrigin(game, side);
    if (game.boss && game.boss.alive && index % 4 === 3) {
      this.fists.push({ sx: origin.x, sy: origin.y, tx: game.boss.x + randRange(-50, 50), ty: game.boss.y + randRange(40, 120), t: 0, target: 'boss' });
      return;
    }
    let best = null;
    for (const object of game.objects) {
      if (object.state !== 'fall' || object.targeted || object.y < 10 || object.passed) continue;
      if (object.type === 'disc') continue;
      if (!best || object.y > best.y) best = object;
    }
    if (best) {
      best.targeted = true;
      this.fists.push({ sx: origin.x, sy: origin.y, tx: best.x, ty: best.y, t: 0, target: best });
    } else {
      // niets te slaan: lucht-stoten rond Star Platinum
      const angle = -Math.PI / 2 + randRange(-1, 1);
      this.fists.push({ sx: origin.x, sy: origin.y, tx: origin.x + Math.cos(angle) * 150, ty: origin.y + Math.sin(angle) * 150, t: 0, target: null });
    }
  },

  updateFists(dt, game) {
    for (let i = this.fists.length - 1; i >= 0; i--) {
      const fist = this.fists[i];
      fist.t += dt / (fist.big ? 0.16 : ORA_TIMING.fistFlight);
      // het doel beweegt nog een beetje: vuist volgt mee
      if (fist.target && fist.target !== 'boss' && fist.target.state === 'fall') {
        fist.tx = fist.target.x;
        fist.ty = fist.target.y;
      }
      if (fist.t < 1) continue;
      this.fists.splice(i, 1);
      this.fistHit(fist, game);
    }
  },

  fistHit(fist, game) {
    const sounds = ['punch1', 'punch2', 'punch3'];
    Sound.play(pick(sounds), { volume: 0.55, rate: randRange(0.9, 1.15), minGap: 0.02 });
    FX.burst(fist.tx, fist.ty, { count: fist.big ? 26 : 8, colors: ['#ffffff', '#c79bff', '#ffd25e'], speed: [120, 380], size: [2, 4], life: [0.15, 0.4], shape: 'spark', real: true });
    FX.ring(fist.tx, fist.ty, { color: '230,200,255', from: 6, to: fist.big ? 120 : 34, life: 0.25, width: fist.big ? 6 : 3, real: true });
    if (rand() < 0.35 || fist.big) {
      FX.text(fist.tx + randRange(-20, 20), fist.ty - 10, 'ORA', { size: fist.big ? 40 : 20, color: '#e9d4ff', life: 0.45, rise: 30 });
    }
    if (fist.target === 'boss') {
      if (game.boss && game.boss.alive) game.boss.damage(fist.big ? BOSS.damage.oraFinal : BOSS.damage.ora, game);
      return;
    }
    const object = fist.target;
    if (!object || object.state !== 'fall') return;
    if (object.type === 'bomb') game.destroyBomb(object, 'ORA');
    else object.startHoming(0.32);
  },

  drawOra(game, time) {
    const a = this.active;
    if (!a || a.kind !== 'ora' || a.time < ORA_TIMING.cutIn - 0.05) return;
    const end = ORA_TIMING.cutIn + ORA_TIMING.rush + 0.55;
    const fadeIn = progress(a.time, ORA_TIMING.cutIn - 0.05, ORA_TIMING.cutIn + 0.12);
    const fadeOut = 1 - progress(a.time, end - 0.3, end);
    const alpha = fadeIn * fadeOut;
    const x = game.catcher.x;
    const bottom = game.catcher.rimY + 40 + Math.sin(time * 6) * 4;
    // manga-snelheidslijnen rond Star Platinum
    drawRadialLines(drawingContext, x, bottom - 200, 150, 1500, 60, '#e6d4ff', 0.18 * alpha, Math.floor(time * 24));
    const pose = a.time > ORA_TIMING.cutIn + ORA_TIMING.rush ? 5 : (Math.floor(a.time * 14) % 2 === 0 ? 4 : 3);
    Art.drawGlow('star', pose, x, bottom, 330, 'rgb(150, 100, 255)', 0.7 * alpha);
    Art.draw('star', pose, x, bottom, 330, { alpha: 0.88 * alpha });
    // wazige storm van vuisten rond Star Platinum
    if (a.time < ORA_TIMING.cutIn + ORA_TIMING.rush) {
      for (let i = 0; i < 7; i++) {
        const angle = -Math.PI / 2 + Math.sin(time * 37 + i * 2.1) * 1.1;
        const distanceOut = 60 + ((time * 900 + i * 47) % 70);
        const origin = this.oraOrigin(game, i % 2 === 0 ? -1 : 1);
        drawSprite(Sprites.fist, origin.x + Math.cos(angle) * distanceOut, origin.y + Math.sin(angle) * distanceOut, 70, angle, 0.45 * alpha);
      }
    }
  },

  drawFists() {
    for (const fist of this.fists) {
      const t = easeOutCubic(fist.t);
      const x = mix(fist.sx, fist.tx, t), y = mix(fist.sy, fist.ty, t);
      const angle = Math.atan2(fist.ty - fist.sy, fist.tx - fist.sx);
      drawSprite(Sprites.fist, x, y, fist.big ? 150 : 82, angle, 1);
    }
  },

  // ---------- ZA WARUDO ----------
  startStop(game) {
    const jotaro = Save.settings.timeStopVoice === 'jotaro';
    const frozen = STOP_TIMING.frozen + game.perks.world * 0.5;
    const slow = STOP_TIMING.slow + game.perks.world * 2.5;
    const T = {};
    T.expand = STOP_TIMING.cutIn;
    T.frozen = T.expand + STOP_TIMING.expand;
    T.resume = T.frozen + frozen;
    T.slow = T.resume + STOP_TIMING.thaw;
    T.recover = T.slow + slow;
    T.end = T.recover + STOP_TIMING.recover;
    this.active = { kind: 'stop', time: 0, timeline: T, jotaro, visits: [], visitsPlanned: false, resumed: false, expanded: false };
    CutIn.start(jotaro
      ? { art: 'star', pose: 0, title: 'ZA WARUDO!', subtitle: 'STAR PLATINUM: THE WORLD', color1: '#3d58c8', color2: '#150c40', textColor: '#9fe8ff', duration: STOP_TIMING.cutIn }
      : { art: 'world', pose: 0, title: 'ZA WARUDO!', subtitle: 'THE WORLD · TOKI WO TOMARE', color1: '#e2a91c', color2: '#5a2f05', textColor: '#ffffff', duration: STOP_TIMING.cutIn });
    Sound.playVoice(jotaro ? 'vStarStop' : 'vZaWarudo');
  },

  updateStop(dt, game) {
    const a = this.active;
    const T = a.timeline;
    if (!a.expanded && a.time >= T.expand) {
      a.expanded = true;
      Sound.play('freeze', { volume: 1 });
      Sound.play('freezeFx', { volume: 0.8 });
      FX.shake(0.35);
      Camera.kick(0.06, game.catcher.x, game.catcher.rimY);
    }
    // plan welke bommen The World gaat slaan
    if (!a.visitsPlanned && a.time >= T.frozen) {
      a.visitsPlanned = true;
      const targets = game.objects.filter(o => o.state === 'fall' && (o.type === 'bomb' || o.type === 'disc') && o.y > -20);
      if (game.boss && game.boss.alive) targets.push('boss');
      const freezeWindow = T.resume - T.frozen - 0.25;
      const slot = targets.length ? Math.min(0.3, freezeWindow / targets.length) : 0;
      a.visits = targets.map((target, i) => ({ target, at: T.frozen + 0.15 + i * slot, hit: false }));
      a.visitSlot = slot;
    }
    for (const visit of a.visits) {
      if (!visit.hit && a.time >= visit.at + a.visitSlot * 0.5) {
        visit.hit = true;
        Sound.play('teleport', { volume: 0.6, minGap: 0.01 });
        Sound.play(pick(['punch1', 'punch2', 'punch3']), { volume: 0.5, minGap: 0.01 });
        const pos = this.visitPosition(visit, game);
        FX.text(pos.x, pos.y - 40, 'MUDA!', { size: 24, color: '#ffe27a', life: 0.7, rise: 20 });
        if (visit.target === 'boss') visit.bossHit = true;
        else visit.target.cracked = true;
      }
    }
    // de tijd gaat weer lopen: alle geraakte bommen ontploffen tegelijk
    if (!a.resumed && a.time >= T.resume) {
      a.resumed = true;
      Sound.playVoice('vResume');
      Sound.play('resumeFx', { volume: 0.8 });
      for (const object of game.objects) {
        if (object.cracked && object.state === 'fall') game.destroyBomb(object, 'MUDA');
      }
      if (a.visits.some(v => v.bossHit) && game.boss && game.boss.alive) game.boss.damage(BOSS.damage.stop, game);
      FX.flash('255,240,200', 0.35, 3);
      FX.shake(0.3);
      game.announce('TIJD STOP BONUS: x2', COLORS.cyan);
    }
    if (a.time >= T.end) this.active = null;
  },

  visitPosition(visit, game) {
    if (visit.target === 'boss') return game.boss ? { x: game.boss.x, y: game.boss.y + 80 } : { x: 0, y: 0 };
    return { x: visit.target.x, y: visit.target.y };
  },

  drawStopStand(game, time) {
    const a = this.active;
    if (!a || a.kind !== 'stop') return;
    const T = a.timeline;
    if (a.time < T.expand || a.time > T.resume + 0.6) return;
    const art = a.jotaro ? 'star' : 'world';
    const color = a.jotaro ? 'rgb(120, 160, 255)' : 'rgb(255, 200, 80)';
    const fade = progress(a.time, T.expand, T.expand + 0.25) * (1 - progress(a.time, T.resume, T.resume + 0.6));
    // welke bom wordt nu geslagen?
    let current = null;
    for (const visit of a.visits) {
      if (a.time >= visit.at && a.time < visit.at + a.visitSlot) current = visit;
    }
    if (current) {
      const pos = this.visitPosition(current, game);
      const flip = pos.x > game.fieldW / 2;
      const x = pos.x + (flip ? 70 : -70);
      Art.drawGlow(art, 2, x, pos.y + 90, 200, color, 0.6 * fade);
      Art.draw(art, 2, x, pos.y + 90, 200, { alpha: 0.95 * fade, flip });
    } else {
      const x = game.catcher.x + (game.catcher.x > game.fieldW / 2 ? -110 : 110);
      const bottom = game.catcher.rimY + 30 + Math.sin(time * 2) * 3;
      Art.drawGlow(art, 0, x, bottom, 300, color, 0.55 * fade);
      Art.draw(art, 0, x, bottom, 300, { alpha: 0.9 * fade });
    }
  },

  // ---------- ROAD ROLLER ----------
  startRoller(game) {
    const T = {};
    T.fall = ROLLER_TIMING.cutIn;
    T.impact = T.fall + ROLLER_TIMING.fall;
    T.shatter = T.impact + ROLLER_TIMING.shockwave + ROLLER_TIMING.linger;
    T.end = T.shatter + 0.45;
    this.active = {
      kind: 'roller', time: 0, timeline: T, impacted: false, shattered: false, whooshed: false,
      x: game.fieldW / 2, y: FIELD.height * 0.48, shock: 0, collected: new Set(),
    };
    CutIn.start({
      art: 'dio', pose: 4, title: 'ROAD ROLLER DA!', subtitle: 'DIO · WRYYYYY',
      color1: '#f2c419', color2: '#7a2a06', textColor: '#ffffff', duration: ROLLER_TIMING.cutIn,
    });
    Sound.playVoice('vWryyy');
  },

  updateRoller(dt, game) {
    const a = this.active;
    const T = a.timeline;
    if (!a.whooshed && a.time >= T.fall) {
      a.whooshed = true;
      Sound.play('whoosh', { volume: 1, rate: 0.6 });
    }
    if (!a.impacted && a.time >= T.impact) {
      a.impacted = true;
      Sound.play('roller', { volume: 1 });
      Sound.play('heavy', { volume: 1, rate: 0.7 });
      Sound.play('metal', { volume: 0.8, rate: 0.8 });
      FX.hitStop(0.12);
      FX.shake(1);
      FX.flash('255,250,220', 0.75, 3);
      game.impactAt(a.x, a.y, 0.12, 0.1);
      FX.ring(a.x, a.y, { color: '255,230,150', from: 40, to: 600, life: 0.6, width: 10, real: true });
      FX.ring(a.x, a.y, { color: '255,255,255', from: 20, to: 420, life: 0.45, width: 5, real: true });
      FX.burst(a.x, a.y + 60, { count: 40, colors: ['#ffe14d', '#b5781b', '#8d8a99', '#ffffff'], speed: [200, 700], size: [3, 7], life: [0.5, 1.2], gravity: 900, shape: 'shard', real: true, glow: false });
      FX.burst(a.x, a.y + 120, { count: 26, colors: ['#ffffff'], speed: [120, 420], angle: 0, spread: TAU, size: [8, 14], life: [0.8, 1.6], drag: 3, shape: 'smoke', real: true, glow: false });
      FX.text(a.x - Math.min(330, game.fieldW * 0.33), a.y - 40, 'ドドドドド', { size: 50, font: FONT_JP, weight: '900', color: '#ffe27a', life: 1.4, rise: 30, skew: -0.25 });
      this.cracks = [];
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * TAU + randRange(-0.2, 0.2);
        const points = [{ x: a.x, y: a.y + 40 }];
        let px = a.x, py = a.y + 40;
        for (let j = 0; j < 5; j++) {
          px += Math.cos(angle + randRange(-0.4, 0.4)) * randRange(40, 90);
          py += Math.sin(angle + randRange(-0.4, 0.4)) * randRange(30, 70);
          points.push({ x: px, y: py });
        }
        this.cracks.push(points);
      }
      this.crackLife = 1.6;
      if (game.boss && game.boss.alive) game.boss.damage(BOSS.damage.roller, game);
    }
    // schokgolf: alles wat hij raakt wordt verzameld of vernietigd
    if (a.impacted && a.time < T.impact + ROLLER_TIMING.shockwave + 0.1) {
      const p = progress(a.time, T.impact, T.impact + ROLLER_TIMING.shockwave);
      a.shock = easeOutCubic(p) * Math.hypot(game.fieldW, FIELD.height);
      for (const object of game.objects) {
        if (object.state !== 'fall' || a.collected.has(object)) continue;
        if (distance(object.x, object.y, a.x, a.y) > a.shock) continue;
        a.collected.add(object);
        if (object.type === 'bomb' || object.type === 'disc') game.destroyBomb(object, 'WRYYY');
        else object.startHoming(0.35 + distance(object.x, object.y, game.catcher.x, game.catcher.rimY) * 0.0004);
      }
    }
    if (!a.shattered && a.time >= T.shatter) {
      a.shattered = true;
      Sound.play('impact', { volume: 0.8 });
      FX.burst(a.x, a.y, { count: 46, colors: ['#ffe14d', '#f2b705', '#3d3a47', '#b9b5c6'], speed: [150, 520], size: [3, 8], life: [0.6, 1.3], gravity: 700, shape: 'shard', real: true, glow: false });
    }
    if (a.time >= T.end) {
      this.active = null;
      this.overdrive = ROLLER_TIMING.overdrive;
      game.announce('OVERDRIVE: x2 PUNTEN!', COLORS.gold);
    }
  },

  drawRoller(game, time) {
    const a = this.active;
    if (!a || a.kind !== 'roller' || a.time < a.timeline.fall) return;
    const T = a.timeline;
    const ctx = drawingContext;
    // schaduw/doelwit op de landingsplek
    if (!a.impacted) {
      const p = progress(a.time, T.fall, T.impact);
      ctx.save();
      ctx.globalAlpha = 0.25 + p * 0.5;
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 140, 60 + p * 130, 14 + p * 24, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    // de schokgolf
    if (a.impacted && a.shock > 0 && a.time < T.impact + ROLLER_TIMING.shockwave + 0.1) {
      const fade = 1 - progress(a.time, T.impact, T.impact + ROLLER_TIMING.shockwave + 0.1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 230, 150, ${0.7 * fade})`;
      ctx.lineWidth = 18 * fade + 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.shock, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const fall = easeInCubic(progress(a.time, T.fall, T.impact));
    const y = mix(-320, a.y, fall);
    const shatterFade = 1 - progress(a.time, T.shatter, T.shatter + 0.12);
    if (shatterFade <= 0) return;
    const squash = a.impacted ? Math.max(0, 0.12 - (a.time - T.impact) * 0.4) : 0;
    const width = Math.min(380, game.fieldW * 0.6);
    const height = width * (Sprites.roller.height / Sprites.roller.width);
    const shakeX = a.impacted && a.time < T.shatter ? Math.sin(time * 70) * 2 : 0;
    ctx.save();
    ctx.globalAlpha = shatterFade;
    ctx.translate(a.x + shakeX, y);
    ctx.scale(1 + squash, 1 - squash);
    // DIO staat bovenop de wals
    Art.drawGlow('dio', 4, 0, -height / 2 + 22, width * 0.45, 'rgb(255, 220, 90)', 0.5);
    Art.draw('dio', 4, 0, -height / 2 + 22, width * 0.45);
    ctx.drawImage(Sprites.roller, -width / 2, -height / 2, width, height);
    ctx.restore();
  },

  drawCracks() {
    if (!this.cracks.length) return;
    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.crackLife);
    ctx.strokeStyle = '#fff2c6';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    for (const crack of this.cracks) {
      ctx.beginPath();
      crack.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.stroke();
    }
    ctx.restore();
  },

  // ---------- algemeen ----------
  update(dt, game) {
    if (!this.active) this.overdrive = this.overdrive > dt ? this.overdrive - dt : 0;
    if (this.cracks.length) {
      this.crackLife -= dt;
      if (this.crackLife <= 0) this.cracks = [];
    }
    this.updateFists(dt, game);
    const a = this.active;
    if (!a) return;
    a.time += dt;
    if (a.kind === 'ora') this.updateOra(dt, game);
    else if (a.kind === 'stop') this.updateStop(dt, game);
    else if (a.kind === 'roller') this.updateRoller(dt, game);
  },

  // Achter de catcher: de Stands zelf.
  drawBehind(game, time) {
    this.drawOra(game, time);
    this.drawStopStand(game, time);
  },

  // Voor de catcher: vuisten, wals en barsten.
  drawFront(game, time) {
    this.drawCracks();
    this.drawRoller(game, time);
    this.drawFists();
  },
};
