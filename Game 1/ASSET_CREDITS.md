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
