// ============================================================
//  audio.js — alle geluiden, stemmen en muziek.
//
//  We gebruiken de Web Audio API: daarmee kunnen we geluiden
//  tegelijk afspelen, de toonhoogte veranderen (hogere "ding"
//  bij een hoge combo) en de muziek zachter zetten als er een
//  stem klinkt. Open je de game als los bestand (file://), dan
//  valt hij terug op gewone <audio>-elementen.
// ============================================================

// Korte effecten en stemmen (worden vooraf geladen).
const SOUND_FILES = {
  // --- effecten ---
  catch: 'assets/sfx-catch.mp3',
  perfect: 'assets/sfx-perfect.mp3',
  miss: 'assets/sfx-miss.mp3',
  punch: 'assets/sfx-punch.mp3',
  impact: 'assets/sfx-impact.mp3',
  power: 'assets/sfx-power.mp3',
  roller: 'assets/sfx-roller.mp3',
  rebirth: 'assets/sfx-rebirth.mp3',
  coins: 'assets/foley/handleCoins.ogg',
  punch1: 'assets/foley/impactPunch_medium_000.ogg',
  punch2: 'assets/foley/impactPunch_medium_001.ogg',
  punch3: 'assets/foley/impactPunch_medium_002.ogg',
  heavy: 'assets/foley/impactSoft_heavy_000.ogg',
  bell: 'assets/foley/impactBell_heavy_000.ogg',
  glass: 'assets/foley/impactGlass_light_000.ogg',
  metal: 'assets/foley/impactMetal_medium_000.ogg',
  slice: 'assets/foley/knifeSlice.ogg',
  whoosh: 'assets/foley/cloth2.ogg',
  latch: 'assets/foley/metalLatch.ogg',
  freeze: 'assets/cinematic/time-freeze.mp3',
  resumeFx: 'assets/cinematic/time-resume.mp3',
  accel: 'assets/cinematic/acceleration.mp3',
  collapse: 'assets/cinematic/collapse.mp3',
  genesis: 'assets/cinematic/genesis.mp3',
  defeat: 'assets/cinematic/defeat.mp3',
  pipe: 'assets/jixaw-metal-pipe-falling-sound.mp3',
  teleport: 'assets/jojo/teleport.mp3',
  freezeFx: 'assets/jojo/freezefx.mp3',
  // --- stemmen ---
  vZaWarudo: 'assets/za-warudo-toki-wo-tomare_WJVdsYt.mp3',
  vStarStop: 'assets/jojo/starstop.mp3',
  vResume: 'assets/jojo/resume.mp3',
  vOra: 'assets/ora-ora.mp3',
  vWryyy: 'assets/jojo/wryyy.mp3',
  vHeaven: 'assets/made-in-heaven.mp3',
  vAccelerate: 'assets/time-accelerate.mp3',
  vYes: 'assets/jojo/yes.mp3',
  vRun: 'assets/jojo/run.mp3',
  vKira: 'assets/jojo/kira.mp3',
  vCrimson: 'assets/jojo/crimson.mp3',
  vHand: 'assets/jojo/hand.mp3',
  vTusk: 'assets/jojo/tusk.mp3',
  vCmoon: 'assets/jojo/cmoon.mp3',
  vMuda: 'assets/jojo/muda.mp3',
  vGiorno: 'assets/jojo/giorno.mp3',
  vOverHeaven: 'assets/jojo/overheaven.mp3',
};

// Muziek wordt gestreamd (niet vooraf geladen), want die bestanden zijn groot.
const MUSIC_FILES = {
  giorno: 'assets/giorno-theme.mp3',
  kira: 'assets/jojo/kiratheme.mp3',
  classic: 'assets/background-music.mp3',
};

const Sound = {
  ctx: null,          // de AudioContext
  master: null,       // hoofdvolume
  buses: {},          // aparte volumes voor muziek, stemmen en effecten
  duckNode: null,     // maakt de muziek zachter als er een stem klinkt
  buffers: {},        // geladen geluiden (Web Audio)
  elements: {},       // geladen geluiden (fallback met <audio>)
  useWebAudio: false,
  unlocked: false,    // pas na de eerste klik/toets mag er geluid
  lastPlayed: {},     // voorkomt dat hetzelfde geluid 10x tegelijk speelt
  voice: null,        // de stem die nu speelt
  music: null,        // <audio> met de muziek
  musicNode: null,
  musicName: null,
  musicWanted: false,
  musicRate: 1,       // toonhoogte/snelheid van de muziek (slow-motion!)
  musicLevel: 1,      // extra demping (bijv. tijdens Time Stop)
  duckLevel: 1,

  init() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.useWebAudio = Boolean(AudioCtx) && location.protocol !== 'file:';
    if (this.useWebAudio) {
      try {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        for (const bus of ['music', 'voice', 'sfx']) {
          const gain = this.ctx.createGain();
          gain.connect(this.master);
          this.buses[bus] = gain;
        }
        this.duckNode = this.ctx.createGain();
        this.duckNode.connect(this.buses.music);
      } catch (error) {
        this.useWebAudio = false;
      }
    }
    this.applyVolumes();
    this.loadAll();

    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
  },

  // Laadt alle effecten en stemmen op de achtergrond.
  async loadAll() {
    const names = Object.keys(SOUND_FILES);
    if (!this.useWebAudio) {
      for (const name of names) {
        const element = new Audio(SOUND_FILES[name]);
        element.preload = 'auto';
        this.elements[name] = element;
      }
      return;
    }
    const queue = names.slice();
    const loadNext = async () => {
      while (queue.length > 0) {
        const name = queue.shift();
        try {
          const response = await fetch(SOUND_FILES[name]);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const data = await response.arrayBuffer();
          this.buffers[name] = await this.ctx.decodeAudioData(data);
        } catch (error) {
          console.warn('Geluid kon niet geladen worden:', name, error.message || error);
        }
      }
    };
    // Vier tegelijk laden gaat sneller dan één voor één.
    await Promise.all([loadNext(), loadNext(), loadNext(), loadNext()]);
  },

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.musicWanted && this.music) this.music.play().catch(() => {});
  },

  onVisibilityChange() {
    if (document.hidden) {
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
      if (this.music) this.music.pause();
    } else if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      if (this.musicWanted && this.music) this.music.play().catch(() => {});
    }
  },

  // Speelt een geluid af. Opties: volume, rate (toonhoogte), offset (startpunt),
  // duration (maximale lengte), fadeOut (zacht laten eindigen), bus.
  play(name, options = {}) {
    const { volume = 1, rate = 1, offset = 0, duration = 0, fadeOut = 0, bus = 'sfx', minGap = 0.03 } = options;
    if (!this.unlocked) return null;
    const now = performance.now() / 1000;
    if (now - (this.lastPlayed[name] || 0) < minGap) return null;
    this.lastPlayed[name] = now;
    if (this.useWebAudio) return this.playBuffer(name, volume, rate, offset, duration, fadeOut, bus);
    return this.playElement(name, volume, rate, offset, duration, bus);
  },

  playBuffer(name, volume, rate, offset, duration, fadeOut, bus) {
    const buffer = this.buffers[name];
    if (!buffer) return null;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.buses[bus] || this.buses.sfx);

    const start = this.ctx.currentTime;
    const length = duration > 0 ? Math.min(duration, buffer.duration - offset) : buffer.duration - offset;
    const end = start + length / rate;
    if (fadeOut > 0) {
      gain.gain.setValueAtTime(volume, Math.max(start, end - fadeOut));
      gain.gain.linearRampToValueAtTime(0.0001, end);
    }
    source.start(start, offset, length + 0.02);

    const callbacks = [];
    source.onended = () => callbacks.forEach(callback => callback());
    return {
      name,
      stop: (fade = 0.08) => {
        const t = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0.0001, t + fade);
        try { source.stop(t + fade + 0.02); } catch (error) { /* al gestopt */ }
      },
      onEnd: callback => callbacks.push(callback),
    };
  },

  // Fallback zonder Web Audio: een kopie van het <audio>-element afspelen.
  playElement(name, volume, rate, offset, duration, bus) {
    const base = this.elements[name];
    if (!base) return null;
    const element = base.cloneNode();
    const settings = Save.settings;
    const busVolume = bus === 'voice' ? settings.voice : bus === 'music' ? settings.music : settings.sfx;
    element.volume = settings.muted ? 0 : clamp(volume * busVolume * settings.master, 0, 1);
    element.playbackRate = rate;
    element.preservesPitch = false;
    element.currentTime = offset;
    element.play().catch(() => {});
    const callbacks = [];
    let timer = null;
    const finish = () => { clearTimeout(timer); callbacks.forEach(callback => callback()); };
    element.addEventListener('ended', finish, { once: true });
    if (duration > 0) timer = setTimeout(() => { element.pause(); finish(); }, (duration / rate) * 1000);
    return {
      name,
      stop: () => { element.pause(); finish(); },
      onEnd: callback => callbacks.push(callback),
    };
  },

  // Stemmen: er klinkt er altijd maar één tegelijk en de muziek gaat zachter.
  playVoice(name, options = {}) {
    this.stopVoice(0.1);
    const handle = this.play(name, { ...options, bus: 'voice', minGap: 0 });
    if (!handle) return null;
    this.voice = handle;
    this.duckLevel = 0.3;
    this.applyVolumes();
    handle.onEnd(() => {
      if (this.voice === handle) {
        this.voice = null;
        this.duckLevel = 1;
        this.applyVolumes();
      }
    });
    return handle;
  },

  stopVoice(fade = 0.12) {
    if (this.voice) {
      this.voice.stop(fade);
      this.voice = null;
    }
    this.duckLevel = 1;
    this.applyVolumes();
  },

  isVoicePlaying() {
    return this.voice !== null;
  },

  playMusic(name) {
    if (!MUSIC_FILES[name]) name = 'giorno';
    this.musicWanted = true;
    if (this.musicName === name && this.music) {
      if (this.unlocked && this.music.paused) this.music.play().catch(() => {});
      return;
    }
    this.stopMusic();
    const element = new Audio(MUSIC_FILES[name]);
    element.loop = true;
    element.preload = 'auto';
    element.preservesPitch = false;
    this.music = element;
    this.musicName = name;
    this.musicNode = null;
    if (this.useWebAudio) {
      try {
        this.musicNode = this.ctx.createMediaElementSource(element);
        this.musicNode.connect(this.duckNode);
      } catch (error) {
        this.musicNode = null;
      }
    }
    this.applyVolumes();
    if (this.unlocked) element.play().catch(() => {});
  },

  stopMusic() {
    this.musicWanted = false;
    if (this.music) {
      this.music.pause();
      if (this.musicNode) this.musicNode.disconnect();
    }
    this.music = null;
    this.musicNode = null;
    this.musicName = null;
  },

  // Wordt elk frame aangeroepen: laat de muziek vloeiend vertragen of versnellen.
  update(dt, targetRate, targetLevel) {
    this.musicRate = damp(this.musicRate, targetRate, 6, dt);
    const level = damp(this.musicLevel, targetLevel, 8, dt);
    const levelChanged = Math.abs(level - this.musicLevel) > 0.002;
    this.musicLevel = level;
    if (this.music) {
      const rate = clamp(this.musicRate, 0.5, 2);
      if (Math.abs(this.music.playbackRate - rate) > 0.01) this.music.playbackRate = rate;
    }
    if (levelChanged) this.applyVolumes();
  },

  // Zet alle volumes volgens de instellingen.
  applyVolumes() {
    const settings = Save.settings;
    const master = settings.muted ? 0 : settings.master;
    const musicVolume = settings.music * 0.55 * this.musicLevel;
    if (this.useWebAudio && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(master, t, 0.03);
      this.buses.music.gain.setTargetAtTime(musicVolume, t, 0.05);
      this.buses.voice.gain.setTargetAtTime(settings.voice, t, 0.03);
      this.buses.sfx.gain.setTargetAtTime(settings.sfx * 0.8, t, 0.03);
      this.duckNode.gain.setTargetAtTime(this.duckLevel, t, 0.12);
    }
    if (this.music && !this.musicNode) {
      this.music.volume = clamp(master * musicVolume * this.duckLevel, 0, 1);
    }
  },
};
