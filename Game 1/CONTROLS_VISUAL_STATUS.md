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


## Recovery verification, 13 October 2026

The interrupted main-ref operation had succeeded: main was 8e28a3b9a5d79497c9d232c1c3466201a56e2dc6, including the art/game changes in 681025efadad51eb699e240c5189ed0e10091296. No art or gameplay changes were re-applied. The main tree contains ten WebP pose sheets and all seventeen uploaded pack MP3 files.

Follow-up fixes preserve a naturally ended audio position until its native event has been processed, bound illustrated actors to 82% viewport height inside the letterbox, and isolate The World/Pucci atlas poses from neighbouring artwork. New playback always starts at zero; intentional interruption and reset still stop sound. The Pucci margin mask preserves the main horse hooves. A regression assertion guards the naturally ended DIO position; all local npm suites pass.

Actual browser evidence: [baseline run 38393528187](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38393528187) passed Node, 3D smoke, Arcade cinematics/local audio, and missing-MP3/pause recovery. Its overall run failed in the subsequently added full-ending test; that full run is not labelled green. [Recovery run 38394652102](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38394652102) passed all enabled jobs after the audio-ending correction. Later enabled browser runs also passed, including [38396703048](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38396703048). Follow-ups deliberately skipped the unchanged 3D/Arcade baseline steps rather than claiming to rerun them.

The browser exercised seventeen real previews, five moves, power-up audio triggers, King Crimson, queued reset, remapping/reload, movement, six-second delayed DIO, pause/selection snapshot and natural full endings of selected/uploaded scenes. Custom 14.2-second fixtures reached their native duration before normal recovery; longer speech does not duplicate The Hand/Tusk rewards or extend C-Moon's four-second gravity. Detailed results and reviewed stage screenshots are in [qa/recovery-2026-10-13](qa/recovery-2026-10-13).

The visual comparison extracts Giorno at 55 seconds from the supplied video and the actual new browser at the same 2556x1396 resolution, equally scaled. Round, score, catcher position and pose progress differ; it is not an identical seeded replay.

Remaining limits: six-pose illustration animation rather than continuous skeletal animation/lip sync; subjective audio mix was not listened to on speakers/headphones. Collapse still uses stylized scene panels pulled toward a core, and rebirth uses light/rings before environment reconstruction. Those existing effects are functional and tested but are not a newly completed photoreal world-destruction/recreation scene. No new audio was downloaded in recovery. Existing Kenney CC0 files and retained licence texts are documented in ASSET_CREDITS.md; user-supplied recordings have no verified redistribution licence and none is asserted here.

Definitive source and native-ending evidence: [run 38397347518](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38397347518), source f39d924b2fa8b9b66291d9a2847f57e814ce09de, passed every enabled Node and browser job. Its Pucci screenshot was inspected with the final margin mask. The existing Pages deployment for this source succeeded (38397346448). This report, evidence and an extra natural-end regression assertion are saved in a documentation/test-only follow-up; production code is unchanged from the tested source.
