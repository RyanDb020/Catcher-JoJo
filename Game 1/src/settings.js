// ============================================================
//  settings.js — het instellingen-venster (HTML in index.html).
//  Schuifjes en vinkjes zijn in gewone HTML veel makkelijker dan
//  in de canvas. Alles wordt meteen opgeslagen.
// ============================================================

const Settings = {
  panel: null,
  visible: false,

  init() {
    this.panel = document.getElementById('settings');
    if (!this.panel) return;
    this.sync();
    for (const input of this.panel.querySelectorAll('[data-setting]')) {
      const name = input.dataset.setting;
      input.addEventListener('input', () => {
        const newValue = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
        Save.setSetting(name, newValue);
        this.apply(name);
      });
    }
    document.getElementById('settings-close').addEventListener('click', () => this.close());
    document.getElementById('settings-reset').addEventListener('click', () => {
      if (!window.confirm('Weet je zeker dat je je record en statistieken wilt wissen?')) return;
      Save.data.best = 0;
      Save.data.bestCombo = 0;
      Save.data.bestWave = 0;
      Save.data.runs = 0;
      Save.write();
    });
    // klikken naast het venster sluit het
    this.panel.addEventListener('pointerdown', event => {
      if (event.target === this.panel) this.close();
    });
  },

  // Wat er meteen moet gebeuren als een instelling verandert.
  apply(name) {
    if (['master', 'music', 'voice', 'sfx', 'muted'].includes(name)) Sound.applyVolumes();
    if (name === 'soundtrack' && Sound.musicWanted) Sound.playMusic(Save.settings.soundtrack);
    if (name === 'sfx') Sound.play('catch', { volume: 0.8 });
    if (name === 'voice') Sound.play('vYes', { bus: 'voice', duration: 0.8, fadeOut: 0.2, minGap: 0.6 });
  },

  // Zet de schuifjes en vinkjes op de opgeslagen waarden.
  sync() {
    for (const input of this.panel.querySelectorAll('[data-setting]')) {
      const value = Save.settings[input.dataset.setting];
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = value;
    }
  },

  open() {
    if (!this.panel) return;
    this.sync();
    this.visible = true;
    this.panel.hidden = false;
    const first = this.panel.querySelector('input, select, button');
    if (first) first.focus();
  },

  close() {
    if (!this.panel) return;
    this.visible = false;
    this.panel.hidden = true;
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
  },
};
