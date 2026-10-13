# Visual, controls and full-audio update

This update continues the existing Game 1 from saved revision 8d6a205. The supplied 69-second 2556x1396 gameplay video was inspected at regular frame samples. Its main weak points were the identical tiny silhouettes for different Stands, floating purple forearms on gold MUDA attacks, and simultaneous messages at the same position.

## Implemented

- Ten original transparent illustrated pose atlases, six cells each: Star Platinum, The World, Gold Experience, The Hand, Tusk, C-Moon, King Crimson, DIO, Jotaro, and the paired Pucci/Made in Heaven scene. Each has distinct silhouette, costume, face and poses. No external anime screenshots were used. Pose changes follow reveal/wind-up/barrage/finisher/recovery; sprites have bounded texture reuse.
- New King Crimson character presentation and time fragments reconstructed from actual recent ball data; protection duration remains the existing value while the longer audio can continue into recovery.
- DIO/The World and Jotaro/Star Platinum scenes use illustrated characters, actual audio progress, extra camera framing for long dialogue, mechanically slowing clocks, three counter-rotating gears and cracked glass.
- Pucci and the equine Made in Heaven have six paired poses, including alternating horse strides. Existing data rewind, collapse, rebirth and once-only universe reset are preserved.
- MUDA/Giorno use separate art and matching fist projectiles. Extra attacks have a timed final punch and short world hit freeze; longer selected audio receives longer pose/recovery sequences.
- Primary messages are prioritized; score messages are bounded to two lanes. Wave headings are suppressed over attack titles. Stand Energy has nine illustrated ability indicators and current key labels.
- Cached drifting nebula layers, three star distances and rare-ball light trails. Stars and orb rotation stop with physics. Particle objects are pooled and damping uses delta time.

## Controls (Arcade)

A/D or left/right arrows move. Default actions are grouped on 1–9; O opens settings, R starts Made in Heaven reset, and Space intentionally interrupts/skips scenes. Under Settings > Besturing you can rebind each action. Duplicate keys swap rather than create conflicts; preferences persist and a restore button is provided. Reserved movement/menu/reset keys are excluded. Holding a key no longer repeatedly extends a power.

| Key | Action |
|---|---|
| 1 | Time Stop |
| 2 | ORA |
| 3 | Road Roller |
| 4 | King Crimson |
| 5 | The Hand |
| 6 | Tusk |
| 7 | C-Moon |
| 8 | The World MUDA |
| 9 | Giorno MUDA |

3D Combat Mode retains its existing independent controls.

## Full audio

The selected Time Stop clip is captured at activation. Changing the setting during pause changes the next activation, not the active voice/character. Metadata can extend a running scene. Healthy playing audio is allowed to finish naturally, including clips longer than a minute; scenes do not use the old fixed timeout to cut a playing voice. A buffering source has an eight-second grace period, and a source stalled after playback has a four-second fallback. Failed/missing audio does not strand a scene.

ORA, Pucci reveal, reverse clocks, all five extra moves, King Crimson's visual recovery, Time Resume and custom Road Roller all respect actual clip length. Extra per-Stand upload slots and a restore-original-audio button are available. A long C-Moon clip adds recovery beyond the existing four-second gravity effect. The Hand remains one erasure and Tusk one nail; extending speech does not duplicate rewards. Road Roller holds the slow-time countdown so Time Resume cannot cut its selected voice. Explicit Space interruption/reset can stop audio by design.

## Assets and limitations

Production artwork: assets/stand-art/*.webp, source prompt set: assets/stand-art/prompts.json, dimensions/pose counts: assets/stand-art/manifest.json. Generated with the built-in imagegen tool, then format-compressed to WebP with alpha; approximately 3.9 MB total. Original generation PNGs are retained in the session's generated output. The supplied MP3 archive remains unchanged and the existing recorded effects/music/voice settings are preserved; no new external sounds or licence assumptions were added.

The sprite animation uses six illustrated poses with real-time pose cycling, root movement, camera easing and afterimages. It is not continuously interpolated skeletal animation or word-accurate lip sync. Tusk and other generated designs are illustrated fan-art interpretations; this is not an official anime asset pack. Audio was decoded and its playback/timing tested, but not judged on speakers/headphones. CPU/browser verification is not a benchmark of the user's GPU.

## Verification

Local npm suites pass: gameplay/controls/audio cleanup, 212 cinematic renderer calls at four viewport sizes, 21 combat rule checks, native audio-manager lifecycle, and 240 responsive atlas frame crops. New meaningful checks cover remap swapping/persistence, held-key suppression, long DIO snapshot, late metadata, long Hand/C-Moon recovery, clips beyond sixty seconds, stalled-audio fallback and particle object reuse.

Browser tests are added for actual complete native clip endings: DIO, Over Heaven, Star Platinum, ORA, custom Road Roller, Pucci, reverse clocks, six extra character clips including King Crimson, and delayed DIO loading. They also exercise remapping/reload, pause and selection changes, movement, return to gameplay/reset and a matching-resolution Giorno screenshot. Results must be read before reporting browser success.
