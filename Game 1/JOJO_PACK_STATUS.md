# JoJo audio pack integration

17 supplied clips are now bundled locally, with loudness normalization and source mapping in JOJO_AUDIO_PACK.json. All 17 are playable in Options; 17 have a gameplay trigger or selectable game audio role. Preview uses a separate audio instance and never rewinds the paused gameplay clip. Space cancels extra attacks without refunding energy.

| Clip | Actual use |
|---|---|
| The Hand | H, 35 energy: one forward erasure sweep, no free catch score |
| Tusk | J, 25 energy: one homing nail; catch score only at actual impact |
| C-Moon | C, 40 energy: reverses ball gravity for 4 seconds |
| MUDA | M, 55 energy: 5 second minimum attack, accelerates near finale |
| Giorno seven-page MUDA | N, 75 energy: >=14.2 second Gold Experience barrage; actual metadata can extend duration |
| King Crimson | Existing F time erasure activation |
| Killer Queen | Actual bomb detonation, suppressed when a cinematic voice owns the channel |
| WRYYY | Road Roller actual impact |
| Joestar Run | Last life warning, cooldown prevents voice stacking |
| YES YES | Every 20-catch combo milestone, suppressed during cinematic voices |
| Time Resume | Default time release; real clip duration controls release timing |
| Eyes of Heaven freeze | Freeze cue at activation climax |
| Teleport | Movement >75px during complete Time Stop; 3D perfect dodge |
| Star Platinum Time Stop | Selectable Arcade intro with Jotaro/Star Platinum visuals; default 3D Time Stop |
| Over Heaven | Selectable Arcade Time Stop audio variant; same existing The World visual |
| DIO longer intro | Selectable Arcade Time Stop voice variant, extends visual duration to metadata |
| Kira theme | Selectable soundtrack (saved preference); no second music loop |

Original Pucci, Rewind, ORA and music remain available. O shows all extra controls and an audition browser for all 17 clips. New moves do not overlap ORA, reset or Time Stop; pause holds clock and playing clips. R queues after a move; reset clears move, target claims, cooldowns and voices. Missing files never gate movement or scene completion.

Visual scope: new moves have actual gameplay effects plus stylized articulated Canvas characters/attack shapes. These small models are not detailed final anime character art. No broad claim that every animation in the masterprompt is finished.

Validation: all 17 derived MP3s decoded fully with FFmpeg; local npm gameplay, 212 renderer checks, 21 combat rule checks and audio lifecycle tests pass. Added meaningful assertions for erasure bounds, homing single hit, reverse gravity, zero-speed freeze, long Giorno clip and reset/activation guards. Browser verification and screenshots are produced by test_jojo_pack_browser.cjs through GitHub Actions; the run result must be checked before claiming browser success. No perceptual headphone/speaker mixing or voice identity confirmation performed.

## Verified browser outcome

Final run [38323988535](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38323988535), revision b7e66897ed8407dc76228f6e5a9397f2cce1c258: Node and JoJo pack browser jobs both succeeded. Real native playback was checked for all 17 previews; five moves completed; Star Platinum Time Stop returned to gameplay; Giorno remained active beyond nine seconds, paused with its audio and resumed. Auditioning Giorno during that pause did not rewind the gameplay clip. Queued Time Stop pickup after C-Moon and queued Rewind/reset completed. Actual event handlers also started Killer Queen, YES combo, Joestar last life, WRYYY roller impact and teleport audio. Those five triggers used controlled localhost fixtures to reach the relevant states; they were not a normal uninterrupted playthrough. No page exceptions. Exact result and playback paths: qa/jojo-pack-browser-results.json.

Earlier full run [38323064612](https://github.com/RyanDb020/Catcher-JoJo/actions/runs/38323064612): 3D smoke, no-WebGL fallback, all Arcade cinematic phases, protected 10-second session, all missing MP3s and 14.2-second private ORA pause/recovery passed. The overall run failed on an initial typo in the additional pack test; this was fixed and rerun. A later fixture needed explicit test energy and separation from random power-up spawns; these were test harness issues. A real shared-preview audio rewind issue was fixed in the game. The last targeted run rechecks all changed Arcade pack behavior; it does not repeat the unchanged 3D route.

Screenshots: qa/jojo-moves-overview.png, qa/jojo-pack-settings.png, qa/jojo-star-platinum-time-stop.png. The overview crops/resizes actual browser captures; it is not a video or generated gameplay. Small additional Stand visuals remain prototype-level. No claim of perceptual audio quality, original voice identity confirmation, public redistribution licence clearance or production-level character art.
