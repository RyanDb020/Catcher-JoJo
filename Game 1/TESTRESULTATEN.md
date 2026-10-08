# Testresultaten — Celestial Edition

## Uitgevoerde controles

| Controle | Resultaat | Methode |
|---|---|---|
| JavaScript-syntax | Geslaagd | `node --check src/sketch.js` |
| Oorspronkelijke tests | 19/19 geslaagd | p5-functies gesimuleerd in Node VM; inclusief fatale ORA-overgang, debugcheat en eindkaart-layout |
| Uitgebreide regressietests | 28/28 geslaagd | Arena, catch bij framevertraging, reset, audiofallback, lokale assets, Road Roller-nasleep en lange run |
| Celestial-tests | 31 totaal geslaagd | Plus Time Stop-snelheid, ballen tijdens slowmotion en renderdensity op 4K |
| Renderassets | Visueel nagekeken | De catcher, 3 baltypes, klok, vuist, roller en achtergrond zijn naar een lokale canvas-preview gerenderd |
| ZIP-structuur/CRC | Geslaagd: 32 bestanden, CRC foutloos | `python zipfile.testzip()` op eindbestand |

De tests zijn logicatests met nagebootste p5- en Canvas-functies. Ze controleren ook dat alle lokale audiobestanden en scripts in de ZIP aanwezig zijn, maar testen geen echte browserdownload, gameplay-FPS, compositie of hoorbare audio.

## Live browser-QA

| Scenario | Resultaat | Bewijs/beperking |
|---|---|---|
| Pagina, canvas en startscherm | Geslaagd | Live GitHub Pages in Chrome; Enter startte de game. |
| Catcherbesturing | Geslaagd | Links verplaatste de catcher zichtbaar. |
| ORA ORA | Geslaagd | Q startte de rush; vuisten, trails en impactbeelden waren zichtbaar. |
| Time Stop | Geslaagd | T en Space bereikten de freeze; de HUD toonde daarna 55% slow motion. |
| Road Roller | Gedeeltelijk geslaagd | E startte de aanval en de gedetailleerde wals daalde zichtbaar in beeld. De volledige impact-nasleep is in deze sessie niet betrouwbaar als frame vastgelegd; de duur en cleanup zijn lokaal getest. |
| King Crimson | Geslaagd | F toonde de rode tint, ringeffecten en onkwetsbaarheidsstatus. |
| Made in Heaven | Gedeeltelijk geslaagd | R startte de rewind en bracht het spel naar een nieuw universum. Niet elk tussenframe is afzonderlijk live vastgelegd. |
| Instellingen | Geslaagd | O opende het paneel; Time Stop wijzigde naar 75% en is teruggezet naar 55%. |
| Game Over/TBC | Geslaagd | Live eindkaart toonde score, resettekst en banner zonder overlap. |
| Browserconsole | Geen gamefout gevonden | De enige zichtbare foutmelding kwam van een browserextensie; echte asset-downloadstatus is niet volledig uitgelezen. |

De huidige GitHub Pages-versie is tijdens de live test ongewijzigd. De G-testcheat was daar nog beschikbaar. De nieuwe ZIP schakelt G uit in normale sessies; die wijziging wordt pas actief nadat de ZIP handmatig of met toestemming naar GitHub Pages is gepubliceerd.

## Browserbeperking

De live browser was beschikbaar, maar GitHub-repository ophalen was in deze runtime uitgeschakeld. De complete bronvergelijking, exacte asset-downloadstatus, hoorbare audiosynchronisatie en 60-FPS-doel zijn daarom niet geverifieerd. De lokale p5.js-bestanden zijn toegevoegd, de assettekeningen zijn afzonderlijk naar een canvas-preview gerenderd en de aangepaste aanval/Game Over-levenscyclus is in de Node-simulatie getest.

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
