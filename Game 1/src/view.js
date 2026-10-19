// ============================================================
//  view.js — rekent uit hoe groot het speelveld op jouw scherm is.
//
//  Het speelveld is altijd 720 hoog. De breedte hangt af van je
//  scherm (480 t/m 1280). Daarna schalen we alles zo groot mogelijk
//  en zetten we het veld in het midden van het venster.
// ============================================================

const View = {
  w: 1280,      // breedte van het speelveld in game-pixels
  h: FIELD.height,
  scale: 1,     // hoeveel schermpixels één game-pixel is
  offX: 0,      // waar het veld begint op het scherm
  offY: 0,
  winW: 1280,   // grootte van het browservenster
  winH: 720,

  compute(windowW, windowH) {
    this.winW = windowW;
    this.winH = windowH;
    const aspect = windowW / Math.max(1, windowH);
    this.w = Math.round(clamp(FIELD.height * aspect, FIELD.minWidth, FIELD.maxWidth));
    this.scale = Math.min(windowW / this.w, windowH / this.h);
    this.offX = (windowW - this.w * this.scale) / 2;
    this.offY = (windowH - this.h * this.scale) / 2;
  },

  // Schermcoördinaat → speelveld-coördinaat
  toFieldX(screenX) { return (screenX - this.offX) / this.scale; },
  toFieldY(screenY) { return (screenY - this.offY) / this.scale; },

  // Speelveld-coördinaat → schermcoördinaat
  toScreenX(fieldX) { return this.offX + fieldX * this.scale; },
  toScreenY(fieldY) { return this.offY + fieldY * this.scale; },

  // Alles wat hierna getekend wordt, staat in speelveld-coördinaten.
  // Met useCamera zoomt het beeld een beetje mee bij grote momenten.
  begin(shakeX = 0, shakeY = 0, useCamera = false) {
    const ctx = drawingContext;
    ctx.save();
    ctx.translate(this.offX + shakeX * this.scale, this.offY + shakeY * this.scale);
    ctx.scale(this.scale, this.scale);
    if (useCamera && Camera.zoom !== 1) {
      ctx.translate(Camera.focusX, Camera.focusY);
      ctx.scale(Camera.zoom, Camera.zoom);
      ctx.translate(-Camera.focusX, -Camera.focusY);
    }
  },

  end() {
    drawingContext.restore();
  },
};
