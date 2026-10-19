// ============================================================
//  input.js — toetsenbord, muis en touchscreen.
//
//  Je kunt de catcher besturen met ←/→, A/D, de muis of je vinger.
//  Zodra je weer een pijltjestoets gebruikt, neemt het toetsenbord
//  het over van de muis (en andersom).
// ============================================================

const Input = {
  pointerX: 0,          // muis/vinger in speelveld-coördinaten
  pointerY: 0,
  pointerActive: false, // bestuurt de muis/vinger de catcher?
  pointerDown: false,
  touchMode: false,     // wordt er een touchscreen gebruikt?
  lastScreenX: -1,
  lastScreenY: -1,

  // -1 = links, 0 = stil, 1 = rechts (toetsenbord)
  direction() {
    let dir = 0;
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) dir -= 1;  // 65 = A
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) dir += 1; // 68 = D
    if (dir !== 0) this.pointerActive = false;
    return dir;
  },

  // Wordt aangeroepen als de muis beweegt of een vinger schuift.
  movePointer(screenX, screenY, isTouch) {
    // Pas reageren als de muis echt een stukje beweegt (geen trilling).
    const moved = Math.abs(screenX - this.lastScreenX) + Math.abs(screenY - this.lastScreenY);
    this.lastScreenX = screenX;
    this.lastScreenY = screenY;
    this.pointerX = View.toFieldX(screenX);
    this.pointerY = View.toFieldY(screenY);
    if (isTouch) {
      this.touchMode = true;
      this.pointerActive = true;
    } else if (moved > 2) {
      this.pointerActive = true;
    }
  },
};
