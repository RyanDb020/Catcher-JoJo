// ============================================================
//  storage.js — bewaart highscores en instellingen in de browser
//  (localStorage). Als opslaan niet mag (bijv. privévenster),
//  werkt de game gewoon door zonder te bewaren.
// ============================================================

const SAVE_KEY = 'jojo-catcher-save-v2';

const Save = {
  data: {
    best: 0,         // hoogste score
    bestWave: 0,     // verste golf (universum * 5 + golf)
    bestCombo: 0,    // langste combo
    runs: 0,         // aantal gespeelde potjes
    settings: { ...DEFAULT_SETTINGS },
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      this.data = {
        ...this.data,
        ...stored,
        settings: { ...DEFAULT_SETTINGS, ...(stored.settings || {}) },
      };
    } catch (error) {
      // Kapotte of geblokkeerde opslag: we gebruiken de standaardwaarden.
    }
  },

  write() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (error) {
      // Opslaan lukt niet (privévenster); niet erg.
    }
  },

  get settings() {
    return this.data.settings;
  },

  setSetting(name, value) {
    this.data.settings[name] = value;
    this.write();
  },

  // Slaat de resultaten van een potje op. Geeft terug of het een nieuw record is.
  recordRun(score, waveIndex, combo) {
    const isRecord = score > this.data.best;
    this.data.best = Math.max(this.data.best, score);
    this.data.bestWave = Math.max(this.data.bestWave, waveIndex);
    this.data.bestCombo = Math.max(this.data.bestCombo, combo);
    this.data.runs += 1;
    this.write();
    return isRecord;
  },
};
