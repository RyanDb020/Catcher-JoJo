# Patch notes — JoJo Catcher: Celestial Edition

## Cinematic direction and browser QA — 9 October 2026

- ZA WARUDO now frames its clock below the title, reveals a moving escapement ring and jewel markers, and separates the freeze headline from the face. The frozen clock has a full tick ring and three independently moving sub-dials plus a seconds hand.
- Made in Heaven rewind now draws a restrained prior-pose echo for the catcher and falling objects, with connecting trails. The existing reverse history and reset timing are unchanged.
- Road Roller now animates the hydraulic rams and rotating drum independently from its painted vehicle. Landing adds a brief compressed contact plate before the existing fracture and shockwave layers.
- Added `tests/live_qa.cjs` and a pinned Playwright dependency. The local runner records console/page errors, failed requests, HTTP errors, local audio responses and play events, RAF-derived FPS/frame-time percentiles, and screenshots for each cinematic phase. Its default sustained-play segment is ten minutes.
- Life-loss suppression and a read-only QA state snapshot require both the runner-injected `window.__JOJO_QA_AUTOMATION__` flag and a localhost origin. No public URL, settings or gameplay control can enable them.
- Controls, energy costs, gameplay timings, collisions, scoring, life rules outside localhost automation, and special-attack outcomes are unchanged.

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
- De Road Roller-nasleep is verlengd tot 2,35 seconden en de Game Over-planner wacht nu lang genoeg op die laatste effecten.
- De ORA-rush bestaat uit twaalf variërende vuistslagen met wisselende aanvluchten, nagloeiende vuistbeelden en een finale inslag.
- Cinematische geluiden en de banner-cue starten op hun bijbehorende animatiemoment.
- Made in Heaven gebruikt in de rewindfase nu dezelfde metalen bal- en catcher-assets als tijdens het gewone spel, met extra uurwerk- en chronometerlagen.
- De energie-vulcheat is uitgeschakeld in normale sessies en werkt alleen met de expliciete `?test=1`-query.
- Het oude testcommando wijst nu naar één actuele regressiesuite, zodat de timingchecks niet uit elkaar lopen.

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
- Canvasdensity is afhankelijk van de geselecteerde kwalit