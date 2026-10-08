# Kritische kwaliteitsanalyse — Celestial Edition

## Live nulmeting

De gepubliceerde GitHub Pages-game is interactief getest op ongeveer 1363 × 936. Het startscherm, de catcherbesturing en de achtergrond laden. Rewind loopt zichtbaar door terugspoelen, tijdversnelling, singulariteit en wedergeboorte. De eerdere live QA bevestigde ook 55%-Time Stop, ORA, de Road Roller-afdaling, King Crimson en een Game Over-kaart zonder TBC-overlap.

| Categorie | Live nulmeting | Concrete observatie |
|---|---:|---|
| Visuele kwaliteit | 7/10 | De metalen catcher, ballen, achtergrond en roller zijn duidelijk uitgewerkt. De special effects werden soms druk. |
| Animatiekwaliteit | 6/10 | De hoofdacties waren herkenbaar. De Road Roller-impact en Made in Heaven-tussenfases waren niet allemaal betrouwbaar frame voor frame gecontroleerd. |
| Geluidsynchronisatie | 5/10 | Er zijn gekoppelde stem- en effectcues; hoorbare synchronisatie is niet objectief bevestigd. |
| Gameplay/besturing | 6/10 | Enter, links/rechts, reset en special abilities werken; een langere balanssessie ontbreekt. |
| HUD | 8/10 | Buiten cinematics is de score-/levensweergave duidelijk. Tijdens de Time Stop-intro lagen de standaard HUD-panelen over de cinematic-balken. |
| Performance | Niet gemeten | De game reageerde in korte tests; FPS/frametimes zijn niet uitgelezen. |
| Stabiliteit | 7/10 | Korte runs en resets werkten; lange sessies en alle audio-assets zijn niet volledig live gecontroleerd. |
| Algemene polish | 6/10 | De presentatie is sterk, maar timing en compositie van de special attacks konden strakker. |

## Uitgevoerde polish-pass — 9 oktober 2026

- **ZA WARUDO:** Een draaiende, getekende mechanische chronometer is toegevoegd aan de aanloop. De standaard HUD verdwijnt tijdens de intro en freeze en keert terug wanneer slow motion speelbaar wordt. Ringen en snelheidsstrepen zijn rustiger gemaakt.
- **Made in Heaven:** De paarse overlay is lichter en de tijdstrepen bewegen nu in de terugwaartse richting. De bestaande teruggespeelde snapshots, versnelling, singulariteit en wedergeboorte blijven behouden.
- **Road Roller:** De inslag is verschoven van 1.200 ms naar 1.390 ms, het frame waarop de zichtbare afdaling eindigt. De inslag blijft één keer afgaan en de schokgolf blijft na het voertuig in beeld.
- **Regressies:** Er zijn checks toegevoegd voor het verbergen van HUD-panelen, de richting van de rewindstrepen en de landing/cleanup-timing.

## Bron en release

De huidige `main`-versie van `Game 1/src/sketch.js` is opgehaald via de gekoppelde repository en vergeleken met de lokale bron vóór deze pass. De live pagina laadde `sketch.js?v=celestial-20261009`; de nieuwe kandidaat gebruikt een nieuwe queryversie om oude browsercache te omzeilen. Na de commit wordt de Pages-build en live kandidaat opnieuw gecontroleerd.

## Grenzen van de verificatie

De JavaScript-syntaxcheck en 33 Node-simulatie/regressiechecks slagen. De simulatie gebruikt nagebootste p5-/Canvas-functies en bewijst geen visuele kwaliteit of FPS. Een lokale Chromium-run is niet gelukt: de localhost-server werd door de runtime geweigerd en de meegeleverde Chromium-binary crashte met SIGSEGV. De aangepaste kandidaat wordt daarom via GitHub Pages visueel gecontroleerd nadat de build klaar is. Hoorbare synchronisatie en prestaties blijven afhankelijk van een langere test op de eigen pc.

De graphics zijn zelfgetekende 2D-canvasillustraties; dit zijn geen 3D-modellen of native 4K-textures.
