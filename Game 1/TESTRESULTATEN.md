# Testresultaten — Celestial Edition, cinematic polish-pass

## Cinematic direction and browser QA — 9 October 2026

| Controle | Resultaat | Methode |
|---|---|---|
| Syntax | Geslaagd | `node --check src/sketch.js` en `node --check tests/live_qa.cjs` |
| Regressie | 35/35 geslaagd | `npm test`; Node VM, inclusief localhost-only levensbehoud en uitvoer van de nieuwe klok/roller-renderlagen |
| Reproduceerbare browserharnas | Toegevoegd; lokaal uitvoeren geblokkeerd in deze runtime | `npm install`, `npx playwright install chromium`, `npm run qa:browser`; browserdownload leverde hier een leeg/incompleet archief op en de sandbox weigerde localhost te binden |
| C3-basis livebeelden | Vastgelegd in browser tijdens deze ronde | ZA WARUDO-intro en titelclimax, Rewind en Made in Heaven-versnelling; de Road Roller-test werd door Game Over onderbroken |
| Nieuwe livebeelden | Nog niet geverifieerd | Wordt na publicatie opnieuw bekeken; zie de huidige ronde hieronder |
| FPS, frametimes, audio-events, 10-minutensessie | Niet gemeten | De meegeleverde Playwrightrunner registreert deze zodra Chromium beschikbaar is; er is geen hoorbare audiokwaliteit beoordeeld |

De browserrunner schrijft screenshots en `qa-<label>-results.json` in de projectmap (of de bestaande map in `QA_OUTPUT_DIR`). `--duration-ms=0` slaat alleen het lange speelsegment over; standaard is 600.000 ms.

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
| ORA en overige abilities | Eerder getest | De vorige live QA bevestigde ORA, King Crimson en de Game Over/TBC-layout. Deze