# JoJo Catcher video QA — 3D Combat 1.1

## Baseline reviewed

Input: `20261012-1931-12.2789377.mp4` (19.7 s), supplied with the task. At approximately the same third-person angle, the recording shows a block-built purple Stand/player and near-black enemy crowding together, a dark empty circular grid arena, repeated identical columns and floating cuboids. Central MISS / ENEMY HIT notices obscure the action.

## Changes in this revision

- Rebuilt the player, Star Platinum and Chrono Shade as layered articulated meshes: lathed torsos, separated shoulder/elbow/wrist and hip/knee/ankle sections, face/eye details, clothing panels, crest/horns and different palettes/silhouettes. The Stand is kept offset beside Jotaro. Added gait, attack, dodge, hit, enemy telegraph/recovery and death poses.
- Replaced the empty arena with a paved clock plaza, inlaid clock dial, clock tower, broken arch, varied façades, grounded rubble, four distinct lanterns and three interactable time anchors. The camera ray checks the enclosing architecture and lanterns.
- Added enemy classes across waves, guard-breaking heavy attacks, telegraphed attacks, perfect-dodge Chrono Echo, anchor time waves and boss phases. Tightened temporary combat labels and added anchor count/objective feedback.
- Added original local Ogg/Opus cues plus volume and mute controls. Added the same anchor/audio/gameplay cues to the no-WebGL Canvas2D fallback.

## Verification status

- `npm test`: passed (15 setup/gameplay tests, 19 regression tests, 30 polish tests, 35 cinematic tests, 156 cinematic viewport/keyframe checks, and 16 3D rule/source/asset checks).
- `node --check` is run on the gameplay modules before publishing.
- `npm run qa:3d` cannot run directly in this managed workspace because its local HTTP server is blocked (`EPERM`) and there is no local Playwright browser. The same test was run successfully in GitHub Actions instead.
- GitHub Actions: Arcade/3D Node regression suite and the GitHub Pages build/deploy both succeeded for the game revision.
- GitHub Actions WebGL browser test: passed on commit `8606f67a6c510808f7d4dde5683de7efefc3ba59` (run [38304375474](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38304375474)). Playwright Chromium 151 used SwiftShader; the QA hook reported `renderer: webgl`, 263 draw calls and 85,490 triangles. WASD movement changed the player position, the enemy entered chase, and no page errors were recorded. The run captured 3D and Canvas2D screenshots in [the QA artifact](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38304375474/artifacts/11772045747).
- Live Chrome at 1363×936: Arcade start/game HUD appeared and progressed. The connected browser has WebGL disabled, so its 3D Combat tab used Canvas2D. I tested start, health/energy/HUD updates, a landed hit, enemy damage, Time Stop’s timer/cost and the mute toggle. This confirms the fallback works in that browser.
- Live audio playback and speakers could not be listened to through this browser, so the audio tracks are integrated but not acoustically verified. The browser console is not exposed through this connected browser, so no clean-console claim is made.
- The source video remains the before reference. The post-change screenshot was inspected live but could not be exported from the connected browser into a repository image. The 375×667 small viewport is covered by the existing responsive/cinematic test suite, not a live mobile browser run.

The WebGL render path and a short movement/enemy-chase smoke test now pass in software-rendered Chromium. The screenshot artifact still needs a close visual review; the full mission, attack/dodge/counter loop, reset, cinematics, small live viewport and audible speaker output were not covered by this smoke test. Hardware performance on the user’s RTX 4080 was not measured.

The published HTML briefly served a stale module with the former URL. Combat imports now carry build `1.4.0` cache keys so the current renderer, fallback and audio files load as a unit. The Canvas2D backup now draws distinct segmented Jotaro, Star Platinum and Chrono Shade silhouettes plus a clock face, broken arch, district facade and lantern. Its fallback camera frames these landmarks and keeps fighter sprites large enough to read on standard desktop sizes.
