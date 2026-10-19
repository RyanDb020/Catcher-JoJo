// ============================================================
//  config.js — alle instelbare getallen van de game op één plek.
//
//  Wil je de game makkelijker of moeilijker maken? Begin hier.
//  Alle afstanden zijn in "game-pixels": het speelveld is altijd
//  720 hoog, de breedte past zich aan het scherm aan.
// ============================================================

// ---------- Speelveld ----------
const FIELD = {
  height: 720,     // vaste hoogte van het speelveld
  minWidth: 480,   // smalste veld (telefoon staand)
  maxWidth: 1280,  // breedste veld (breedbeeld)
};

// ---------- Catcher (de bak die jij bestuurt) ----------
const CATCHER = {
  width: 136,          // breedte van de bak
  height: 42,          // hoogte van de bak
  rimFromBottom: 84,   // afstand van de rand van de bak tot de onderkant van het veld
  maxSpeed: 1080,      // topsnelheid (game-pixels per seconde)
  acceleration: 9500,  // hoe snel hij optrekt
  braking: 15000,      // hoe snel hij stopt als je loslaat
  perfectZone: 0.14,   // middenstuk (deel van de breedte) dat een PERFECT geeft
  wideBonus: 0.5,      // BREED-power-up maakt hem 50% breder
  wideTime: 10,        // seconden dat BREED duurt
};

// ---------- Levens ----------
const LIVES = {
  start: 3,
  max: 5,
  graceTime: 0.6, // na een verloren leven ben je heel even veilig
};

// ---------- Punten ----------
const POINTS = {
  orb: 10,          // roze orb
  perfect: 5,       // extra voor een vangst precies in het midden
  gold: 50,         // gouden orb
  bomb: 25,         // bom die door een Stand wordt vernietigd
  fullLife: 300,    // lieveheersbeestje terwijl je levens al vol zijn
  waveClear: 200,   // bonus per golf (x golfnummer)
  bossDefeat: 2500, // bonus voor het verslaan van de eindbaas (x universum)
};

// ---------- Combo's ----------
// Hoe langer je zonder missen vangt, hoe hoger je vermenigvuldiger.
const COMBO_TIERS = [
  { at: 0,   mult: 1, label: '' },
  { at: 10,  mult: 2, label: 'NICE!' },
  { at: 25,  mult: 3, label: 'GREAT!' },
  { at: 50,  mult: 4, label: 'YES YES YES!' },
  { at: 100, mult: 5, label: 'BIZARRE!!' },
];

// ---------- Stand Energy ----------
// De energiebalk bestaat uit 3 balken van 100.
const ENERGY = {
  perBar: 100,
  bars: 3,
  orb: 5,      // per roze orb
  perfect: 9,  // per PERFECT vangst
  gold: 14,    // per gouden orb
  arrow: 100,  // Stand Arrow geeft meteen een hele balk
  discLoss: 50 // een gestolen DISC kost je energie
};

// ---------- Stand-aanvallen ----------
const ABILITIES = {
  ora:    { cost: 100, keys: ['1', 'q', 'j'], name: 'ORA ORA',     short: 'ORA' },
  stop:   { cost: 200, keys: ['2', 'w', 'k'], name: 'ZA WARUDO',   short: 'ZA WARUDO' },
  roller: { cost: 300, keys: ['3', 'e', 'l'], name: 'ROAD ROLLER', short: 'ROAD ROLLER' },
};
const ABILITY_ORDER = ['ora', 'stop', 'roller'];

// Tijdlijnen van de aanvallen (in seconden).
const ORA_TIMING = {
  cutIn: 0.8,          // cut-in met Star Platinum
  rush: 2.3,           // zo lang slaat Star Platinum alles kapot
  punchInterval: 0.06, // tijd tussen twee vuisten
  fistFlight: 0.11,    // vliegtijd van een vuist
  worldSpeed: 0.45,    // de wereld gaat langzamer tijdens de rush
};
const STOP_TIMING = {
  cutIn: 0.9,      // cut-in met The World
  expand: 0.6,     // de omgekeerde kleurenbol groeit over het scherm
  frozen: 2.9,     // de tijd staat stil (jij kan wel bewegen)
  thaw: 0.7,       // de tijd komt langzaam terug
  slow: 5.0,       // daarna slow-motion
  slowSpeed: 0.4,  // snelheid tijdens slow-motion
  recover: 0.8,    // terug naar normale snelheid
};
const ROLLER_TIMING = {
  cutIn: 0.9,      // cut-in met DIO
  fall: 0.5,       // de wals valt naar beneden
  shockwave: 0.75, // de schokgolf raast over het veld
  linger: 1.0,     // de wals blijft even liggen
  overdrive: 8,    // daarna dubbele punten
};

// ---------- Vallende objecten ----------
// radius = straal, speedMult = sneller of langzamer dan normaal
const OBJECT_TYPES = {
  orb:   { radius: 17, speedMult: 1.0,  good: true,  missHurts: true },
  gold:  { radius: 18, speedMult: 1.22, good: true,  missHurts: false },
  bomb:  { radius: 19, speedMult: 0.95, good: false, missHurts: false },
  life:  { radius: 19, speedMult: 0.8,  good: true,  missHurts: false, pickup: true },
  arrow: { radius: 19, speedMult: 0.85, good: true,  missHurts: false, pickup: true },
  wide:  { radius: 18, speedMult: 0.85, good: true,  missHurts: false, pickup: true },
  disc:  { radius: 18, speedMult: 1.05, good: false, missHurts: false },
};

// ---------- Golven ----------
// Elk universum heeft 5 golven. Golf 5 is de eindbaas.
const WAVES = {
  perUniverse: 5,
  baseSpeed: 205,       // valsnelheid in de eerste golf
  speedPerLevel: 0.07,  // +7% per golf
  maxSpeed: 500,
  baseRate: 1.1,        // orbs per seconde in de eerste golf (op een breed veld)
  ratePerLevel: 0.16,
  maxRate: 3.3,
  baseDuration: 26,     // seconden dat een golf duurt
  durationPerWave: 2,
  introTime: 1.6,       // tijd voor de golf-titel voordat er iets valt
  universeBoost: 0.12,  // elk nieuw universum is 12% pittiger
};

// Uitleg die verschijnt als er iets nieuws in de game komt.
const WAVE_HINTS = {
  1: 'Vang de roze orbs. Mis je er één, dan verlies je een leven!',
  2: 'Gouden orbs zijn 50 punten waard. Missen mag.',
  3: 'Killer Queen heeft bommen aangeraakt. Vang ze NIET!',
  4: 'Sommige orbs slingeren heen en weer. Blijf scherp.',
  5: 'Enrico Pucci en Made in Heaven naderen...',
};

// ---------- Eindbaas: Enrico Pucci ----------
const BOSS = {
  baseHp: 120,
  hpPerUniverse: 50,
  attackGap: [3.4, 4.8],  // seconden tussen aanvallen (min, max)
  enragedAt: 0.35,        // onder 35% leven wordt hij woedend
  accelTime: 4,           // zo lang duurt TIME ACCELERATES
  accelSpeed: 1.65,       // zo veel sneller valt alles dan
  discLockTime: 6,        // zo lang zijn je Stands geblokkeerd na een DISC
  damage: { orb: 2, perfect: 3, gold: 6, ora: 1.4, oraFinal: 6, stop: 14, roller: 40, nail: 4 },
};

// ---------- Standaard instellingen ----------
const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.5,
  voice: 0.9,
  sfx: 0.8,
  muted: false,           // M zet al het geluid aan/uit
  shake: true,
  flashes: true,
  particles: true,
  showFps: false,
  timeStopVoice: 'dio',   // 'dio' of 'jotaro'
  soundtrack: 'giorno',   // 'giorno', 'kira' of 'classic'
};

// Debug-modus: open de game met ?debug=1 voor testtoetsen.
const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search);
