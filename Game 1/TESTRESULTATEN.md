# Testresultaten — Celestial Edition, cinematic polish-pass

## Uitgevoerde controles

| Controle | Resultaat | Methode |
|---|---|---|
| JavaScript-syntax | Geslaagd | `node --check src/sketch.js` |
| Regressiesuite | 33/33 geslaagd | Node VM met nagebootste p5/Canvas API; bevat gameplay, reset, power-ups, audiofallback, effectenlimieten en responsieve Game Over-layout |
| Time Stop/HUD | Geslaagd | Controle dat de grote HUD-panelen tijdens intro/freeze verborgen zijn en terugkomen bij speelbare slow motion |
| Rewindrichting | Geslaagd | Controle dat de nieuwe tijdstrepen terugwaarts bewegen |
| Road Roller | Geslaagd | Controle dat de inslag pas bij de zichtbare landing (1.390 ms) start, één keer afgaat en langer blijft dan de wals |
| Alle lokale scripts en audio | Geslaagd | Bestaan van p5.js, p5.sound en alle gebruikte audiobestanden gecontroleerd |
| ZIP-structuur en CRC | Geslaagd | Controle met Python `zipfile.testzip()` op de eind-ZIP |

De VM-tests controleren spelregels en timing met nagebootste tekenfuncties. Ze meten geen echte browser-FPS en bewijzen geen hoorbare audiosynchronisatie.

## Live browser-QA van de gepubliceerde nulmeting

De opgegeven GitHub Pages-game is op 9 oktober 2026 geopend op ongeveer 1363 × 936. De geladen script-URL bevatte `sketch.js?v=celestial-20261009`, dezelfde hoofdbranchbasis waarop deze kandidaat is gemaakt.

| Scenario | Resultaat | Opmerking |
|---|---|---|
| Startscherm en game starten | Geslaagd | Canvas, startkaart, achtergrond, catcher en HUD waren zichtbaar; Enter startte de game. |
| Rewind/Made in Heaven | Geslaagd | `R` toonde de terugspoelfase, versnelling, singulariteit en terugkeer naar een nieuw universum. Ik zag Universe 02 en daarna Universe 03. |
| Time Stop | Gedeeltelijk | `T` startte de intro. Eerdere live QA bevestigde de 55%-slowmotion en speelbare catcher; de nieuwe HUD- en klokwijzigingen zitten alleen in de kandidaat en moeten na publicatie opnieuw visueel worden bekeken. |
| Road Roller | Gedeeltelijk | Eerdere live QA bevestigde de afdaling; de aangepaste landingtiming en nasleep zijn in deze ronde met de lokale regressie getest. |
| ORA en overige abilities | Eerder getest | De vorige live QA bevestigde ORA, King Crimson en de Game Over/TBC-layout. Deze wijzigingen zijn niet aangepast in deze pass. |
| Audio en performance | Niet bevestigd | Hoorbare timing, framerate en lange speelsessies zijn niet betrouwbaar gemeten. |

## Browserbeperking voor de kandidaat

De lokale runtime kan geen localhost-server starten. De meegeleverde Chromium-binary eindigde met een SIGSEGV voordat de lokale kandidaat geladen werd. Daarom heb ik de nieuwe code niet in een echte lokale browser afgespeeld. De live pagina is alleen gebruikt om de gepubliceerde nulmeting te spelen; die bevat de oude HUD-/Rewind-/Road Roller-instellingen.

## Bronstatus en publiceren

De code van `Game 1/src/sketch.js` op `main` is opgehaald en vergeleken met de Celestial-bron vóór deze polish-pass. De lokale kandidaat bevat daarbovenop de wijzigingen uit `PATCH_NOTES.md`. De live pagina gebruikt nog de eerdere cacheversie. De geüpdatete ZIP bevat een nieuwe cacheversie van `sketch.js`; de repository-publicatie en Pages-build worden apart gecontroleerd.

## Zelf controleren na publicatie

1. Open de Pages-link en druk op `Ctrl+F5`.
2. Start de game en druk op `T`. Controleer dat de chronometer zichtbaar wordt, de score-/energievakken de cinematic-balken niet bedekken en de HUD terugkomt in 55%-slowmotion.
3. Druk op `R`. Controleer dat de bal- en catcherbeelden tijdens Rewind leesbaar blijven en de streaks naar boven teruglopen.
4. Vul Stand Energy tot 100, start Time Stop en druk tijdens freeze/slow op `E`. Controleer dat de wals landt op het frame van de impact, de schokgolf zichtbaar blijft en de gameplay daarna hervat.
5. Controleer ORA, Game Over/TBC, instellingen, browserconsole en audio op jouw pc.
