## Illustrated Stand pose atlases

Ten original generated fan-art sprite sheets (six poses per sheet) were created with the built-in imagegen tool for this personal game. Subjects: Star Platinum, The World, Gold Experience, The Hand, Tusk, C-Moon, King Crimson, DIO, Jotaro and Pucci/Made in Heaven. Full prompt set and production metadata are in assets/stand-art/prompts.json and manifest.json. Production WebP files preserve transparency and were compressed from the generated PNGs using FFmpeg. No external anime frame, downloaded sprite or stock artwork was copied. These are not official JoJo assets and no franchise licence or CC0 grant is claimed. Supplied audio and existing CC0 recordings remain credited below.

## Uploaded JoJo audio pack (personal version)

All 17 recordings from the user-provided `all jojo mp3.zip` are local MP3 files in `assets/jojo/`. Source filenames, measured durations and candidate character names are in `JOJO_AUDIO_PACK.json`. Identification is based on filenames; voices have not been independently identified by listening. The user asked for personal use and integration. No licence grant or creator attribution was provided; these recordings are not claimed CC0 or cleared for redistribution. The original archive was preserved. Derived clips use FFmpeg loudness normalization (-19 LUFS, -2 dB true peak), 15 ms fade-in, stereo 44.1 kHz MP3; duration preserved. Existing Kenney effects remain separately credited below.

## Persoonlijke audio hersteld

Op verzoek zijn de oorspronkelijke JoJo-stemmen (Pucci, tijdversnelling, ORA en ZA WARUDO), achtergrondmuziek, Giorno-theme en game-overgeluid weer de standaard. De gebruiker heeft aangegeven dat dit voor persoonlijk gebruik is. De gebruiksrechten van deze oorspronkelijke clips zijn niet geverifieerd; er wordt geen vrije licentie geclaimd. De nieuwe CC0-scène-effecten en verbeterde audio-cleanup blijven behouden. De bestaande hosting is hierdoor niet technisch afgeschermd.

# Current release audio — cinematic rebuild, 13 October 2026

The public cinematic defaults use recorded foley from **Kenney**, **Impact Sounds 1.0** and **RPG Audio**. Their bundled CC0 declarations were read and preserved in assets/foley/LICENSE-Kenney-Impact.txt and LICENSE-Kenney-RPG.txt. Official source URLs: https://kenney.nl/assets/impact-sounds and https://kenney.nl/assets/rpg-audio. The licence grants personal, educational and commercial use and redistribution. No online audio URL is streamed in the game.

All twelve assets/cinematic/*.mp3 files are original arrangements of those recordings, built with tools/build_cinematic_foley.py. Processing: time resampling/pitch change, reversal, equal-power stereo staging, layered percussion, short multi-tap recorded reverb, peak limiting and start/end fades. No oscillator, anime voice or third-party song is added.

| Local file | Recorded sources | Event / score timing |
|---|---|---|
| reveal.mp3 | impactBell_heavy_000, cloth2, impactMetal_medium_000, knifeSlice | Pucci prayer, Stand manifestation and distortion; 8.664 s |
| rewind.mp3 | metalLatch, cloth2, impactBell_heavy_000, impactMetal_medium_000 | Reversed resonance and progressively quicker mechanical ticks; 8.8816 s |
| ora-track.mp3 | impactPunch_medium_000..002, knifeSlice, cloth2, impactBell_heavy_000, impactSoft_heavy_000, impactMetal_medium_000 | Six-phase ORA: initial reveal, strikes at 1.1 s, barrage at 3.1 s, overdrive at 5.85 s, finisher at 7.4 s, recovery |
| time-activate.mp3 | cloth2, impactBell_heavy_000, impactMetal_medium_000, impactSoft_heavy_000 | Reverse inhale, manifestation, low impact at 3.65 s; 4.5 s |
| time-freeze.mp3 | impactMetal_medium_000, impactBell_heavy_000 | Lock cue; 0.8 s |
| time-resume.mp3 | cloth2, impactMetal_medium_000, impactBell_heavy_000 | Release / returning motion; 1.95 s |
| acceleration.mp3 | metalLatch, knifeSlice | Time acceleration; 2 s |
| collapse.mp3 | impactMetal_medium_000, cloth2, impactSoft_heavy_000 | Inward layers and closing impact; 3.6 s |
| genesis.mp3 | impactBell_heavy_000, cloth2 | Seed, expansion, atmosphere; 4.6 s |
| finisher.mp3 | impactSoft_heavy_000, impactMetal_medium_000, impactBell_heavy_000 | Landed ORA finishing hit; 1.3 s |
| defeat.mp3 | impactMetal_medium_000, impactSoft_heavy_000 | Game Over metal/weight cue; 1.4 s |
| district-bed.mp3 | cloth2, impactBell_heavy_000 | Restrained recorded atmospheric loop; 12 s |

sfx-rewind.mp3 now contains acceleration.mp3; sfx-roller.mp3 contains finisher.mp3. Remaining core catch/punch effects retain the recorded CC0 sources below. The 14.2-second tests/fixtures/long-ora.mp3 is the licensed ORA track with a padded silent tail, solely for browser duration/pause tests; it is not a production cue.

The seven uncertain anime/music/metal-pipe files previously shipped in assets were removed from the current release tree. Private file inputs remain available. UPLOADED_AUDIO_REVIEW.json records the 17 newly supplied clips' decoded durations and peaks; no redistribution grant accompanied them. None was copied into the public game. Candidate character associations are based on filenames, not confirmed listening. Historical Git commits are not rewritten.

Technical decoding, peak measurement and browser playback/timing checks are distinct from a perceptual listening review. Speaker/headphone balance has not been established here.

---

## Historical foley checkpoint — 12 October 2026 (superseded for cinematic defaults)

# Asset credits — Foley polish, 12 October 2026

All files below were downloaded from the author's official asset packs. The included license text is preserved in `assets/foley/LICENSE-Kenney-Impact.txt` and `LICENSE-Kenney-RPG.txt`. Kenney distributes both packs under Creative Commons Zero (CC0 1.0), permitting use, modification and redistribution. No audio is streamed from an external website.

| Pack / author / official source | Original filenames in `assets/foley/` | Gameplay events |
| --- | --- | --- |
| Impact Sounds / Kenney / https://kenney.nl/assets/impact-sounds | `footstep_concrete_000..002.ogg` | Three alternating concrete footstep recordings |
| Impact Sounds / Kenney | `impactPunch_medium_000..002.ogg` | Light hit variants and enemy damage |
| Impact Sounds / Kenney | `impactSoft_heavy_000.ogg` | Heavy hit and enemy damage |
| Impact Sounds / Kenney | `impactMetal_medium_000.ogg` | Blocked strike / guard |
| Impact Sounds / Kenney | `impactGlass_light_000.ogg`, `impactBell_heavy_000.ogg` | Source recordings for Arcade catch and perfect catch |
| RPG Audio / Kenney / https://kenney.nl/assets/rpg-audio | `cloth1.ogg`, `cloth2.ogg` | Dodge movement / cloth variants |
| RPG Audio / Kenney | `knifeSlice.ogg`, `knifeSlice2.ogg` | Attack swing before impact; alternates each accepted event |
| RPG Audio / Kenney | `metalLatch.ogg` | Enemy preparation cue |
| RPG Audio / Kenney | `handleCoins.ogg` | Arcade power-up source |

The following existing Arcade files now contain converted recordings from those packs, using FFmpeg / libmp3lame rather than synthesized oscillators:

| Local file | Original source | Edit |
| --- | --- | --- |
| `assets/sfx-catch.mp3` | `impactGlass_light_000.ogg` | 0.4 s excerpt, gain 0.7, short fade |
| `assets/sfx-perfect.mp3` | `impactBell_heavy_000.ogg` | 1.4 s excerpt, gain 0.3, fade |
| `assets/sfx-punch.mp3` | `impactPunch_medium_000.ogg` | MP3 conversion |
| `assets/sfx-impact.mp3` | `impactSoft_heavy_000.ogg` | MP3 conversion |
| `assets/sfx-miss.mp3` | `cloth2.ogg` | Gain 1.2, MP3 conversion |
| `assets/sfx-power.mp3` | `handleCoins.ogg` | MP3 conversion |

Existing generated ambience, music, summon, Chrono Echo and time cues remain documented in `AUDIO_CREDITS.md`. They are not recordings and have not been replaced in this pass. Existing user-supplied JoJo voices/music were retained; their redistribution rights are not established by this document. This pass adds no anime rips or MyInstants files.

Technical decoding/playback checks do not establish perceived sound quality. A listening review remains required for the complete mix and cinematic synchronization.

## Recorded time-resume cue

`assets/combat-audio/time-resume.ogg` and `assets/sfx-rebirth.mp3` now contain a mix of Kenney's `impactBell_heavy_000.ogg` (gain 0.45), `impactMetal_medium_000.ogg` (gain 0.65) and reversed `cloth2.ogg` (gain 0.25). All source clips are CC0 from the packs credited above. FFmpeg combines them without oscillator synthesis, limits the peak to 0.8 and fades the final 0.4 seconds. The stereo 48 kHz source is encoded as Opus/Ogg and MP3. This is used for arena Time Resume / anchor release / victory and the Arcade resume/rebirth event. It adds no anime voice.

## Referenced source not imported

The supplied MyInstants JoJo search page and its terms were inspected. The individual Time Stop, ORA and Made in Heaven pages returned HTTP 403, and no per-recording redistribution permission was established. No new MyInstants clip was downloaded or published. The licensed Kenney recordings above were used for new effects.
