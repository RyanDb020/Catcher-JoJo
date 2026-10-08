# Patch notes — JoJo Catcher: Celestial Edition

## Speelbare Time Stop

- De speelbare slowmotion is verhoogd van 10% naar **55%** van de normale balsnelheid.
- De bestaande ZA WARUDO-intro en stemclip blijven behouden.
- Na de intro staat alles **0,5 seconde** volledig stil. Daarna bewegen ballen weer op de ingestelde snelheid.
- Slowmotion duurt de bestaande power-upduur. Ballen kunnen nog steeds worden gevangen; score, combo's, collisions en Stand Energy blijven actief.
- De centrale klok en grote tekst verdwijnen tijdens speelbare slowmotion. De resterende duur en snelheid staan als compacte statusbadge in de HUD.
- Na afloop loopt de snelheid over 850 ms vloeiend terug naar normaal.
- Via **O → Time Stop snelheid** kan de speler 40%, 55%, 65% of 75% instellen; 55% is de standaard.

## Animaties en einde van een run

- Game Over bevriest de gameplay, maar laat al gestarte ORA-vuisten, hun inslagbeelden, Road Roller en Time Stop-uitloop netjes afronden.
- ORA geeft geen punten meer nadat de speler is uitgeschakeld. De eindkaart wacht op de langste nog lopende animatie en actieve stemclip.
- De eindkaart en de vertraagd binnenkomende **TO BE CONTINUED**-banner gebruiken een responsieve indeling met vrije ruimte ertussen.
- Road Roller houdt de inslag apart vast nadat de walsanimatie eindigt; grondbreuken, schokgolven, stof en metaalscherven lopen daarna kort uit.
- De ORA-rush bestaat uit twaalf variërende vuistslagen met wisselende aanvluchten, nagloeiende vuistbeelden en een finale inslag.
- Cinematische geluiden en de banner-cue starten op hun bijbehorende animatiemoment.

## Nieuwe detailrijke tekeningen

- De catcher is opnieuw opgebouwd als gelaagd metalen apparaat met pantserpanelen, naden, schroeven, slijtage, reactorlens en bewegend licht.
- De rechthoekige collision-hitbox is hetzelfde gebleven; de decoratieve beweging verplaatst hem niet.
- Normale, gouden en gevaarlijke ballen hebben elk een eigen materiaal, reflecties en interne patronen.
- ORA ORA gebruikt een herkenbare getekende vuist en onderarm met losse knokkelplaten, een manchet en meerdere bewegingsbeelden.
- De Road Roller heeft een cabine, glas, motorpanelen, bouten, uitlaat, hydraulische armen en metalen wals met reflectie.
- ZA WARUDO en Made in Heaven gebruiken een gecachete wijzerplaat met Romeinse cijfers, gravures, tandwielen, ringen en meerdere bewegende wijzers.

## Nieuwe achtergrond en beeldkwaliteit

- De achtergrond is een gecachete kosmische scène met sterren, nevels, een planeet met ringen en verre silhouetten.
- Made in Heaven krijgt extra planetaire uurwerken in elliptische banen tijdens versnelling en instorting.
- Vier grafische standen zijn beschikbaar in het instellingenmenu.
- p5.js en p5.sound zijn lokaal meegeleverd. De game hoeft de p5.js-CDN niet te bereiken.
- Canvasdensity is afhankelijk van de geselecteerde kwaliteit en wordt begrensd op basis van het aantal renderpixels.

## Behouden gameplay

Score, levens, combo's, power-ups, lokale mp3's, Stand Energy, aanvallen, controls, highscore, collisionlogica en universe reset zijn behouden. De originele regressietests en de eerder toegevoegde ultrawide-, framevertraging- en resetchecks zijn blijven staan.

## Bekende testbeperking

De game is op JavaScript-syntax, gameplaylogica en objectrender-assets gecontroleerd. Chromium kon in deze omgeving niet starten door beperkingen van de runtime. Daardoor zijn de complete gameplaycanvas, audio-afstemming en 60-FPS-doel niet als browserresultaat geverifieerd. Zie `TESTRESULTATEN.md`.
