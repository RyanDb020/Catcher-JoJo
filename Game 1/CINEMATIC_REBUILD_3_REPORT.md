# JoJo Catcher — Cinematic Rebuild 3.0 (2026-10-09)

## Source video review

- `20261009-1107-12.9957069.mp4` (8.17 seconds) shows the prior rewind / collapse / rebirth outro: mostly dark backdrop, moving rings, a small center singularity and a NEW UNIVERSE headline with no visible world rebuilding.
- `20261009-1059-45.8655789(1).mp4` (66.43 seconds) shows extended gameplay, previous Time Stop, Road Roller and previous Pucci/Made in Heaven reveal. The earlier Stand silhouette is flat and the cinematic takes up too much screen space in some attacks.
- New user-supplied Pucci MP3 duration: **8.664 s** (ffprobe); Time Resume MP3 duration: **1.802 s**.

## Implementation

### Collapse and Rebirth
- New `src/cosmic-director.js`: separate multi-depth destruction and genesis systems.
- Collapse: sky panels fragment, clips show remembered ball/catcher gameplay, converging shards and linework, a layered accretion disk and final light contraction.
- Rebirth: first light, galaxy expansion, volumetric nebula gradients, parallax stars, ringed planet, curved horizon and gradual fade-in of the real reset game state.
- The existing reset mechanics are retained. Gameplay stays paused throughout the cinematic. The renderer uses frame-independent normalized phase times and bounded deterministic scene content.

### Made in Heaven
- Five shot compositions during an **8.664 s minimum opening**; animation director renders Pucci and an articulated Made in Heaven figure.
- Exact user MP3 can be loaded privately in Settings; it is **not** added to this public repository without confirmed distribution rights.
- Time Accelerate begins only after the introductory phase/voice completes. Rewind plays stored gameplay history backwards with interpolation and echo poses; duration approximately 8.882 seconds.
- After rewind: acceleration, singularity and rebirth.

### ORA ORA
- Smaller and higher Star Platinum/Jotaro composition.
- Reduced global dimming, smaller punch echoes and barrage effects.
- Removed bottom cinematic letterbox that covered the catcher during gameplay. Final impact remains larger.
- Existing audio clock and gameplay attack outcomes retained.

### Time Stop
- Articulated golden The World renderer retained and composition adjusted for release.
- 55% playable slowmotion remains the default.
- Resume sequence uses a 1.95 s phase, compatible with the user-provided 1.802 s clip through private local selection.
- A fallback cue is used when local Time Resume audio is not selected.
- The resume stage no longer covers the catcher with a bottom letterbox.

## Files changed

- `src/cosmic-director.js` — new original visual renderer.
- `src/character-director.js` — new poses/shots and gameplay-safe sizes.
- `src/sketch.js` — audio-gated phases, actual reset-state world reveal and resume timing.
- `index.html` — correct script loading order and private file picker.
- `tests/test_polish.cjs` — updated reset duration expectations.
- `tests/test_cinematic_directors.cjs` — 156 keyframe checks at 4 viewports.
- `package.json` — both Node test suites configured for `npm test`.

## Testing performed

- JavaScript syntax checked programmatically before the relevant GitHub updates.
- **8/8 simulated gameplay/cinematic state tests passed**: setup, intro gate, rewind transition, collapse drawing, rebirth drawing, reset to 3 lives, Time Stop freeze, slow-to-resume-to-idle.
- The original mock-Canvas rendering tests of keyframed scenes also executed without throwing.
- The newly committed Node keyframe suite has **not been executed in a local checkout**; its existence is not proof of a completed test run.
- A real complete Playwright/browser run, side-by-side new screenshots and verification of updated GitHub Pages deployment **were not possible in the connected environment**. Visual quality, frame rates and true audio latency must still be checked in an actual browser.

## Publishing and licensing

The newly supplied MP3 recordings contain recognizable third-party performance material. **They have not been committed** to public GitHub. Use the file pickers in Settings to play them locally in a browser, or publish only after obtaining the necessary rights. Existing audio files already in the repository were not removed or newly introduced by this rebuild.

## Follow-up acceptance tests for the owner

Run `npm install` then `npm test` in `Game 1`, and `npm run qa:browser` after installing Playwright Chromium on a local machine. Inspect each five-stage Universe Reset in a real browser, particularly scene richness and audio sync. Press `R` during gameplay and Game Over, `Q` for ORA, and `T` for Time Stop; test skip/return using Space and confirm that audio is stopped or resumed correctly.
