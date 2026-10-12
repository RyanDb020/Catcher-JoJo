# Cinematic rebuild — 13 October 2026

Continues the current normal Catcher game, not a separate demo. A baseline was reviewed from the two uploaded gameplay recordings and prior 1365×900 browser screenshots.

## Changes

- Pucci: a separate priest silhouette and prayer/entry composition. Made in Heaven now has a long muzzle, ears, plated mane, four articulated equine legs, hocks, hooves, tail and sternum clock. The Stand manifests beside Pucci in a chapel-like scene rather than a generic upright figure.
- Rewind: a central clock with three meshing gears and separately rotating hands moves backwards with increasing speed. Three recorded-data memory panes remain visible. They are reconstructions of recorded ball/catcher/score state, not captured framebuffer/video playback.
- Acceleration: daylight cycles, moving skyline and lengthening star trails establish a changing environment. Collapse lasts 3.6 seconds with an accretion core and orbiting recorded-game panes. The final screen-wide flash was removed. Rebirth lasts 4.6 seconds, progressing from a seed to stars/nebula, environment and the actual reset playfield.
- Time Stop: DIO and The World share the activation scene; the Stand locks its pose before the freeze. The paused playfield stays visible with a compact remaining-time display. Release uses expanding rim fragments and rings while movement returns under the existing game rules.
- ORA: six compositions with torso twist, connected shoulder/elbow/forearm motion, alternating arm silhouettes, a large articulated finishing fist and recovery. Finisher damage still uses the existing gameplay resolver.
- Audio: twelve new local mixes built entirely from Kenney CC0 recordings. Their exact sources and reproducible mix script are in ASSET_CREDITS.md and tools/build_cinematic_foley.py. No supplied anime clip is automatically published; private file selectors are preserved, including Time Stop.
- Fixed the fixed-duration ORA cutoff for longer local clips, retained audio-clock progress, added synchronized pause/resume, reset/skip cleanup, silent missing-recording fallback and ambient-music shutdown at Game Over.

## Verification in progress

Local tests pass, including missing-voice bounded recovery, longer-clip timing, reset cleanup and cinematic draws at four sizes. Actual Chromium screenshots and lifecycle/audio fault results will be added after the GitHub Actions run.

## Uploaded audio review

All 17 MP3s were decoded and measured; UPLOADED_AUDIO_REVIEW.json contains duration and peak measurements. Names provide candidate associations, not a confirmed listening identification. No licence granting public redistribution was supplied. Existing uncertain anime/music clips were removed from the current release tree and replaced with recorded CC0 cues; old repository history is not rewritten. Perceptual speaker/headphone quality has not been verified in this environment.
