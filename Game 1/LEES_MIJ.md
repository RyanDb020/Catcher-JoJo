# JoJo Catcher — Celestial Edition

Een nieuwe visuele versie van je p5.js Catcher-game. De bestaande besturing, score, combo's, geluiden, krachten en universumreset zijn behouden. De Time Stop heeft nu een speelbare fase op 55% balsnelheid.

## Spelen

1. Pak de hele ZIP uit.
2. Open de map in VS Code.
3. Rechtsklik op `index.html` en kies **Open with Live Server**. Je kunt de bestanden ook via een lokale webserver openen.
4. Druk op **Enter** om te starten.

De p5.js-bibliotheken zitten lokaal in `vendor/`. Er is daardoor geen internet nodig om de gamebibliotheken te laden. De lokale mp3-bestanden blijven in `assets/`.

## Besturing

| Toets | Actie |
|---|---|
| Enter | Start |
| ← / → | Beweeg de catcher |
| Q | ORA ORA Stand Rush |
| E | Road Roller (tijdens Time Stop) |
| F | King Crimson |
| R | Made in Heaven Universe Reset |
| Space | Sla de lopende Time Stop-intro of Universe Reset over |
| O | Open instellingen |
| Esc | Sluit instellingen |
| T | Test de ZA WARUDO Time Stop |
| G | Vul Stand Energy (debug) |

De G-testtoets werkt alleen met `?test=1` aan het einde van de URL. In normaal spel is deze debugtoets uitgeschakeld. Zie `GITHUB_PAGES_PUBLICEREN.md` voor het vervangen van de bestanden in de bestaande map `Game 1`.

Time Stop speelt de bestaande intro en stem af, bevriest de wereld daarna kort en laat de ballen vervolgens op 55% snelheid vallen. De catchersbediening blijft normaal reageren. In het instellingenmenu kies je 40%, 55%, 65% of 75%.

Na een Game Over lopen reeds gestarte ORA- en Road Roller-effecten eerst af. De eindkaart verschijnt daarna met de **TO BE CONTINUED**-banner onder de score en resetinstructies.

## Grafische instellingen

- **Performance:** lagere canvasresolutie en kleinere gecachete assets.
- **Balanced:** evenwicht tussen scherpte en GPU-gebruik.
- **Ultra:** hoge resolutie en gedetailleerde vectorassets.
- **Cinematic:** hoogste assetresolutie; canvasdensity blijft begrensd om geheugengebruik te beperken.

Op 4K wordt de interne canvasschaal automatisch beperkt tot circa 16,6 miljoen renderpixels. De fysieke monitorresolutie zelf is afhankelijk van browser, displaydensity en GPU.

## Inhoud

- `src/sketch.js`: game en gecachete vectorassets.
- `vendor/`: lokale p5.js en p5.sound, met licenties in `THIRD_PARTY_NOTICES.md`.
- `assets/`: muziek, originele ZA WARUDO-stem en geluidseffecten.
- `tests/`: regressietests.
- `PATCH_NOTES.md`, `KWALITEITSANALYSE.md`, `TESTRESULTATEN.md`, `COMMITS.md`: wijzigingsoverzicht, beoordeling en controles.
- `GITHUB_PAGES_PUBLICEREN.md`: stappen om de lokale ZIP onder de bestaande Pages-map `Game 1` klaar te zetten.

De tekeneningen van catcher, ballen, uurwerk, vuisten en Road Roller worden lokaal als canvas-assets opgebouwd en daarna hergebruikt. Ze laden geen externe afbeeldingen.
