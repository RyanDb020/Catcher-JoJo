// ============================================================
//  sketch.js — het startpunt voor p5.js.
//
//  p5.js roept setup() één keer aan en daarna draw() elk frame.
//  Alle echte logica staat in game.js; hier verbinden we alleen
//  p5.js (scherm, toetsenbord, muis) met de game.
// ============================================================

let sketchReady = false;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.setAttribute('aria-label', 'JoJo Catcher speelveld');
  // Standaard tekent p5 maximaal 60 keer per seconde. Met 240 volgen we
  // gewoon je beeldscherm (60, 144 of 165 Hz). Omdat alle beweging met
  // deltaTime werkt, is de game op elk scherm even snel.
  frameRate(240);

  Save.load();
  Quality.reset();
  applyPixelDensity();
  View.compute(windowWidth, windowHeight);
  Sprites.build();
  Art.load();
  Background.init();
  Background.resize(windowWidth, windowHeight);
  Sound.init();
  Settings.init();
  Game.init();
  setupPointer(canvas.elt);

  // Pauzeer automatisch als je naar een ander venster gaat.
  window.addEventListener('blur', () => Game.pause());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Game.pause();
  });
  sketchReady = true;
}

function draw() {
  // deltaTime = milliseconden sinds het vorige frame. We begrenzen het,
  // zodat een haperende computer de game niet ineens vooruit laat springen.
  const dt = Math.min(deltaTime / 1000, 1 / 20);
  // Op 'Auto' gaat de resolutie vanzelf omlaag als het hapert.
  if (Quality.monitor(deltaTime, Game.state === 'playing')) applyPixelDensity();
  drawingContext.imageSmoothingQuality = 'high';
  Game.update(dt);
  Game.render();
}

// Scherpte: tot echte 4K (Ultra), afhankelijk van de kwaliteit-instelling.
function applyPixelDensity() {
  const density = Quality.density(windowWidth, windowHeight);
  if (Math.abs(pixelDensity() - density) > 0.01) pixelDensity(density);
}

function windowResized() {
  if (!sketchReady) return;
  resizeCanvas(windowWidth, windowHeight);
  applyPixelDensity();
  View.compute(windowWidth, windowHeight);
  Background.resize(windowWidth, windowHeight);
  Game.resize();
}

function keyPressed(event) {
  if (!sketchReady) return true;
  // Toets ingedrukt houden telt maar één keer (anders vuur je 10 aanvallen af).
  if (event && event.repeat) return false;
  // In het instellingen-venster mogen de schuifjes de toetsen gebruiken.
  if (Settings.visible && keyCode !== ESCAPE) return true;
  Game.onKey(key, keyCode);
  return false; // voorkomt dat de pagina scrolt met pijltjes of spatie
}

// Alleen voor testen (?debug=1): de game stilzetten en precies een aantal
// seconden vooruitspoelen, zodat je elk moment van een animatie kunt bekijken.
if (DEBUG) {
  window.qaStep = (seconds, fps = 60) => {
    noLoop();
    const steps = Math.max(1, Math.round(seconds * fps));
    for (let i = 0; i < steps; i++) Game.update(1 / fps);
    Game.render();
  };
  window.qaResume = () => loop();
}

// Muis en touchscreen via "pointer events" (werkt voor allebei).
function setupPointer(element) {
  let movePointerId = null; // welke vinger de catcher bestuurt
  const local = event => {
    const rect = element.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };

  element.addEventListener('pointerdown', event => {
    const [sx, sy] = local(event);
    const isTouch = event.pointerType === 'touch';
    if (isTouch) Input.touchMode = true;
    const used = Game.onPointer(View.toFieldX(sx), View.toFieldY(sy), true, isTouch);
    if (!used) {
      movePointerId = event.pointerId;
      Input.pointerDown = true;
      Input.movePointer(sx, sy, isTouch);
    }
    // Zorg dat de toetsen werken, ook als de game in een iframe staat.
    window.focus();
    if (isTouch) event.preventDefault();
  });

  element.addEventListener('pointermove', event => {
    const [sx, sy] = local(event);
    const isTouch = event.pointerType === 'touch';
    if (isTouch && event.pointerId !== movePointerId) return;
    Input.movePointer(sx, sy, isTouch);
    Game.onPointer(Input.pointerX, Input.pointerY, false, isTouch);
  });

  const release = event => {
    if (event.pointerId === movePointerId) {
      movePointerId = null;
      Input.pointerDown = false;
    }
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
}
