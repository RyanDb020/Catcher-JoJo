# JoJo Catcher video QA — 3D Combat 1.1

## Baseline reviewed

Input: `20261012-1931-12.2789377.mp4` (19.7 s), supplied with the task. At approximately the same third-person angle, the recording shows a block-built purple Stand/player and near-black enemy crowding together, a dark empty circular grid arena, repeated identical columns and floating cuboids. Central MISS / ENEMY HIT notices obscure the action.

## Changes in this revision

- Rebuilt the player, Star Platinum and Chrono Shade as layered articulated meshes: lathed torsos, separated shoulder/elbow/wrist and hip/knee/ankle sections, face/eye details, clothing panels, crest/horns and different palettes/silhouettes. The Stand is kept offset beside Jotaro. Added gait, attack, dodge, hit, enemy telegraph/recovery and death poses.
- Replaced the empty arena with a paved clock plaza, inlaid clock dial, clock tower, broken arch, varied façades, grounded rubble, four distinct lanterns and three interactable time anchors. The camera ray checks the enclosing architecture and lanterns.
- Added enemy classes across waves, guard-breaking heavy attacks, telegraphed attacks, perfect-dodge Chrono Echo, anchor time waves and boss phases. Tightened temporary combat labels and added anchor count/objective feedback.
- Added original local Ogg/Opus cues plus volume and mute controls. Added the same anchor/audio/gameplay cues to the no-WebGL Canvas2D fallback.

## Verification status

- `npm test`: passed (15 setup/gameplay tests, 19 regression tests, 30 polish tests, 35 cinematic tests, 156 cinematic viewport/keyframe checks, and 15 3D rule/source/asset checks).
- `node --check` is run on the gameplay modules before publishing.
- `npm run qa:3d`: not runnable in this managed workspace; Node's HTTP server fails to listen on `127.0.0.1` with `EPERM`. Therefore a local Playwright gameplay run, in-game audio listening check, and local screenshot capture are not claimed.
- The connected Chrome test browser disables WebGL. It can verify the Canvas2D fallback after the GitHub Pages update but cannot certify the 3D renderer.
- The uploaded baseline video is the before reference; a post-change browser screenshot and live Pages check will be recorded after the commit is deployed.

This is a visible code-level rebuild, but final 3D rendering, exact attack timing, audio quality on speakers, and the entire mission from start through boss defeat still require a browser with WebGL and working audio.

The published HTML briefly served a stale module with the former URL. Combat imports now carry build `1.4.0` cache keys so the current renderer, fallback and audio files load as a unit. The Canvas2D backup now draws distinct segmented Jotaro, Star Platinum and Chrono Shade silhouettes plus a clock face, broken arch, district facade and lantern. Its fallback camera frames these landmarks and keeps fighter sprites large enough to read on standard desktop sizes.
