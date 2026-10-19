// ============================================================
//  utils.js — kleine wiskunde- en hulpfuncties.
//  Deze functies gebruiken geen p5.js, zodat ze ook in de
//  automatische tests (Node) werken.
// ============================================================

const TAU = Math.PI * 2;

// Houdt een waarde tussen een minimum en maximum.
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

// Vloeiend tussen a en b bewegen (t = 0 → a, t = 1 → b).
function mix(a, b, t) {
  return a + (b - a) * t;
}

// Beweegt "current" met maximaal "step" richting "target".
function approach(current, target, step) {
  if (current < target) return Math.min(current + step, target);
  return Math.max(current - step, target);
}

// Frame-onafhankelijk naar een doel toe schuiven (hoe hoger "speed", hoe sneller).
function damp(current, target, speed, dt) {
  return mix(current, target, 1 - Math.exp(-speed * dt));
}

// Easing-functies: maken animaties natuurlijker dan een rechte lijn.
function easeOutCubic(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t) { t = clamp(t, 0, 1); return t * t * t; }
function easeInOutSine(t) { t = clamp(t, 0, 1); return -(Math.cos(Math.PI * t) - 1) / 2; }
function easeOutBack(t) {
  t = clamp(t, 0, 1);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Geeft aan hoe ver "value" tussen a en b ligt (0..1).
function progress(value, a, b) {
  return clamp((value - a) / (b - a), 0, 1);
}

// ---------- Willekeurige getallen ----------
// We gebruiken een eigen generator, zodat tests altijd dezelfde
// "willekeurige" uitkomst krijgen als ze dezelfde seed gebruiken.
let randomSource = Math.random;

function setRandomSeed(seed) {
  // mulberry32: klein en snel algoritme voor pseudo-willekeurige getallen
  let a = seed >>> 0;
  randomSource = function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rand() { return randomSource(); }
function randRange(min, max) { return min + (max - min) * randomSource(); }
function randInt(min, max) { return Math.floor(randRange(min, max + 1)); }
function chance(probability) { return randomSource() < probability; }
function pick(list) { return list[Math.floor(randomSource() * list.length)]; }

// Schudt een lijst (Fisher-Yates) en geeft een nieuwe lijst terug.
function shuffled(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randomSource() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Formatteert een score met spaties: 12345 → "12 345".
function formatScore(value) {
  return Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
