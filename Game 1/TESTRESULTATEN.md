# Testresultaten — Celestial Edition

## Uitgevoerde controles

| Controle | Resultaat | Methode |
|---|---|---|
| JavaScript-syntax | Geslaagd | `node --check src/sketch.js` |
| Oorspronkelijke tests | 18/18 geslaagd | p5-functies gesimuleerd in Node VM; inclusief fatale ORA-overgang en eindkaart-layout |
| Uitgebreide regressietests | 26/26 geslaagd | Arena, catch bij framevertraging, reset, audiofallback, eindanimatie en lange run |
| Celestial-tests | 29 totaal geslaagd | Plus Time Stop-snelheid, ballen tijdens slowmotion en renderdensity op 4K |
| Renderassets | Visueel nagekeken | De catcher, 3 baltypes, klok, vuist, roller en achtergrond zijn naar een lokale canvas-preview gerenderd |
| ZIP-structuur/CRC | Geslaagd: 31 bestanden, CRC foutloos | `python zipfile.testzip()` op eindbestand |

De tests zijn logicatests met nagebootste p5- en Canvas-functies; ze bootsen geen echte gameplay-FPS, browsercompositie of audio na.

## Browserbeperking

Chromium kon niet starten in deze runtime. De lokale webserver werd door de sandbox geweigerd en de browseromgeving blokkeerde het openen van lokale bestanden. Daardoor zijn de volledige gameplayweergave, canvasdensity via p5.js, geluidssynchronisatie en 60 FPS niet met een echte browsersessie geverifieerd. De lokale p5.js-bestanden zijn wel toegevoegd, de assettekeningen zijn afzonderlijk naar een canvas-preview gerenderd en de aangepaste aanval/Game Over-levenscyclus is in de Node-simulatie getest.

## Test zelf met Live Server

1. Open `index.html` via Live Server en controleer de browserconsole.
2. Druk op Enter; test links/rechts, normale vangsten, goud, bom, score en levens.
3. Druk op T en laat de volledige ZA WARUDO-intro lopen. Verwacht ongeveer 0,5 seconde freeze, daarna actieve vangst op 55% snelheid. De centrale klok hoort dan weg te zijn.
4. Test de 40%, 65% en 75%-instellingen via O en controleer dat de snelheid na afloop geleidelijk normaal wordt.
5. Vul Stand Energy met G en test Q en E. Gebruik R voor Made in Heaven; Space slaat de lopende animatie over.
6. Test Performance, Balanced, Ultra en Cinematic, plus een 4K-venster. Controleer console en framerate.

## Nog niet bevestigd

- Framerate en frametimes op jouw pc.
- Volledige visuele compositie en HUD-overlap in de browser.
- Timing van optionele, door de speler gekozen stemclips.
