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

De polish-pass is gepusht in commit `f0046d2` (`Game 1/src/sketch.js` en bijbehorende tests/docs). GitHub Pages-build `37854464897` is geslaagd. De gepubliceerde pagina laadt `sketch.js?v=celestial-20261009-cinematic2`. Live gecontroleerd: start, chronometerintro zonder standaard HUD, terugkeer van de HUD in 55%-slowmotion en Rewind naar Made in Heaven/Universe 02.

## Grenzen van de verificatie

De JavaScript-syntaxcheck en 33 Node-simulatie/regressiechecks slagen. De simulatie gebruikt nagebootste p5-/Canvas-functies en bewijst geen FPS of hoorbare synchronisatie. Lokale Chromium-QA lukte niet: de localhost-server werd door de runtime geweigerd en de meegeleverde Chromium-binary crashte met SIGSEGV. De gepubliceerde kandidaat is wel live visueel gecontroleerd voor Time Stop en Rewind. De nieuwe Road Roller-landingtiming is lokaal getest, maar de volledige Road Roller-sequentie is na deze push niet opnieuw live afgespeeld. Hoorbare synchronisatie, FPS en langere speelsessies blijven nog te meten.

De graphics zijn zelfgetekende 2D-canvasillustraties; dit zijn geen 3D-modellen of native 4K-textures.
