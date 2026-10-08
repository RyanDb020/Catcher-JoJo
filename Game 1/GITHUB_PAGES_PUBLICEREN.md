# GitHub Pages-publicatie — JoJo Catcher

Deze release hoort in de bestaande map `Game 1` van `RyanDb020/Catcher-JoJo`. De game laadt p5.js lokaal; houd de mappenstructuur intact.

## Bestanden

- `Game 1/index.html`
- `Game 1/src/sketch.js`
- `Game 1/assets/`
- `Game 1/vendor/`
- `Game 1/tests/`

De `index.html` gebruikt een nieuwe versieparameter voor `sketch.js`, zodat browsers de aangepaste code niet uit een oude cache laden.

## Zelf publiceren of opnieuw publiceren

1. Maak zo nodig een kopie van je repository.
2. Pak de ZIP uit en kopieer de inhoud van `Catcher_JoJo_Celestial_Edition` naar de bestaande map `Game 1`. Maak geen extra maplaag.
3. Controleer de bestanden en voer de syntax- en regressiechecks uit `TESTRESULTATEN.md` uit.
4. Commit de wijzigingen, bijvoorbeeld met `feat: polish time stop rewind and road roller cinematics`.
5. Push naar `main` en wacht tot de GitHub Pages-workflow klaar is.
6. Open de Pages-link met `Ctrl+F5`. Controleer Time Stop, Rewind, Road Roller, ORA, Game Over/TBC en de browserconsole.

Voor testen kan `?test=1` worden toegevoegd om de G-debugtoets te activeren. Laat die parameter weg bij normaal spelen.
