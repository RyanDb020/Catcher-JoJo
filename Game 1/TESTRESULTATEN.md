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

## Live browser-QA van de gepubliceerde kandidaat

De GitHub Pages-game is na publicatie op 8 oktober 2026 geopend op ongeveer 1363 × 936. De branch `main` stond op commit `f0046d2`; `index.html` laadt `sketch.js?v=celestial-20261009-cinematic2`. De bijbehorende Pages-build (run `37854464897`) eindigde met `success`.

| Scenario | Resultaat | Opmerking |
|---|---|---|
| Startscherm en game starten | Geslaagd | Canvas, startkaart, achtergrond, catcher en HUD waren zichtbaar; Enter startte de game. |
| Rewind/Made in Heaven | Geslaagd | `R` toonde de terugspoelfase, versnelling, singulariteit en terugkeer naar een nieuw universum. Ik zag Universe 02 en daarna Universe 03. |
| Time Stop | Geslaagd | `T` toonde de nieuwe chronometerintro zonder grote HUD-panelen; in de speelbare fase verscheen de HUD terug met `TIME 55%`. |
| Road Roller | Lokaal geslaagd; live niet opnieuw bekeken | De landing-op-1.390-ms en nasleep zijn door de regressiesuite gecontroleerd; deze browserronde heeft de roller niet tot 100 stand energy opgeladen. |
| ORA en overige abilities | Eerder getest | De vorige live QA bevestigde ORA, King Crimson en de Game Over/TBC-layout. Deze wijzigingen zijn niet aangepast in deze pass. |
| Audio en performance | Niet bevestigd | Hoorbare timing, framerate en lange speelsessies zijn niet betrouwbaar gemeten. |

## Browserbeperking voor de kandidaat

De lokale runtime kan geen localhost-server starten. De meegeleverde Chromium-binary eindigde met een SIGSEGV voordat de lokale kandidaat geladen werd. Daarom is de browser-QA op de gepubliceerde GitHub Pages-kandidaat uitgevoerd.

## Bronstatus en publiceren

De code van `Game 1/src/sketch.js` is in commit `f0046d2` naar `main` gepusht en komt overeen met de gevalideerde kandidaat. Pages-build `37854464897` is geslaagd; de live game laadt de nieuwe cacheversie. De live browser bevestigde de start, Time Stop intro/55%-slowmotion en de Rewind → Made in Heaven overgang.

## Nog te controleren

1. Vul Stand Energy tot 100, start Time Stop en druk tijdens freeze/slow op `E`. Controleer dat de wals landt op het frame van de impact, de schokgolf zichtbaar blijft en de gameplay daarna hervat.
2. Controleer ORA, Game Over/TBC, instellingen, browserconsole en audio op jouw pc.
3. Meet framerate en hoorbare synchronisatie op een gewone desktopbrowser; de regressiesuite meet deze niet.
