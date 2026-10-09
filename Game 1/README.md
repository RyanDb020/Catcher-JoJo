# Catcher Game

## Beschrijving

Catcher Game is een game gemaakt met JavaScript en p5.js.

De speler bestuurt een catcher onderaan het scherm en moet vallende rode ballen opvangen. Voor elke gevangen bal krijg je een punt. Als je een bal mist, verlies je een leven. Je begint met 3 levens.

De game heeft ook een startscherm met spelregels, een bewegende sterrenachtergrond en een Game Over-geluid.

## Controls

- `←` Beweeg naar links
- `→` Beweeg naar rechts
- `ENTER` Start het spel
- `R` Start het spel opnieuw

## Hoe start je de game?

1. Open het project in Visual Studio Code.
2. Open `index.html`.
3. Start de pagina met Live Server.
4. Druk op `ENTER` om het spel te starten.

## Credits

- Gemaakt met p5.js
- p5.sound gebruikt voor het Game Over-geluid
- Game Over-geluid:(https://www.myinstants.com/en/instant/jixaw-metal-pipe-falling-sound-28270/)
- ChatGPT gebruikt voor uitleg, debugging en hulp bij het structureren van code en documentatie

## Peer-review checklist

- [x] De demo werkt zonder console-errors.
- [x] De besturing werkt zoals bedoeld.
- [x] Variabelen, loops, functies, arrays en if-statements zijn aanwezig en werken.
- [x] De code is leesbaar en bevat geen onnodige duplicatie.
- [x] De game heeft geen onnodig zware berekeningen in `draw()`.
- [x] De README is compleet en externe assets zijn vermeld.

# User Stories – Catcher

- [x] **Als speler wil ik een speelveld zien zodat ik weet waar het spel zich afspeelt.**
  - Het speelveld is zichtbaar wanneer het spel start.
  - Het speelveld vult het browservenster.

- [x] **Als speler wil ik eerst de spelregels en besturing zien zodat ik weet hoe ik het spel moet spelen.**
  - Voor de start verschijnt een vak met uitleg over de besturing.
  - In het vak staat dat ik met de pijltjestoetsen beweeg, met R reset en met ENTER start.

- [x] **Als speler wil ik het spel met ENTER kunnen starten zodat ik eerst de uitleg kan lezen.**
  - Het spel begint pas nadat ik op ENTER druk.
  - Voor het starten bewegen de ballen nog niet.

- [x] **Als speler wil ik een catcher onderaan het speelveld zien zodat ik weet welk object ik bestuur.**
  - De catcher staat onderaan het speelveld.
  - De catcher is duidelijk zichtbaar.

- [x] **Als speler wil ik de catcher naar links kunnen bewegen zodat ik vallende ballen kan opvangen.**
  - De catcher beweegt naar links wanneer ik de linkerpijltjestoets indruk.
  - De catcher stopt met bewegen wanneer ik de toets loslaat.

- [x] **Als speler wil ik de catcher naar rechts kunnen bewegen zodat ik vallende ballen kan opvangen.**
  - De catcher beweegt naar rechts wanneer ik de rechterpijltjestoets indruk.
  - De catcher stopt met bewegen wanneer ik de toets loslaat.

- [x] **Als speler wil ik dat de catcher binnen het speelveld blijft zodat ik hem niet buiten beeld kan bewegen.**
  - De catcher kan niet voorbij de linkerrand van het speelveld.
  - De catcher kan niet voorbij de rechterrand van het speelveld.

- [x] **Als speler wil ik rode ballen zien zodat ik weet welke objecten ik moet vangen.**
  - De ballen zijn rood.
  - De ballen hebben een witte rand zodat ze duidelijk zichtbaar zijn.

- [x] **Als speler wil ik dat de rode ballen naar beneden vallen zodat ik ze met de catcher kan proberen te vangen.**
  - De ballen bewegen automatisch naar beneden.
  - De ballen blijven bewegen totdat ze gevangen of gemist zijn.

- [x] **Als speler wil ik meerdere ballen tijdens het spel krijgen zodat ik steeds iets nieuws moet proberen te vangen.**
  - Er zijn meerdere ballen tegelijk actief.
  - Nieuwe ballen verschijnen op verschillende plekken boven het speelveld.

- [x] **Als speler wil ik punten krijgen wanneer ik een bal vang zodat mijn score omhooggaat.**
  - De score wordt hoger wanneer een bal wordt gevangen.
  - Een gemiste bal geeft geen punten.

- [x] **Als speler wil ik mijn score linksboven in het speelveld kunnen zien zodat ik weet hoeveel punten ik heb.**
  - De score is zichtbaar tijdens het spelen.
  - De score wordt direct aangepast wanneer ik een bal vang.

- [x] **Als speler wil ik levens verliezen wanneer ik een bal mis zodat fouten gevolgen hebben.**
  - Bij een gemiste bal gaat er één leven af.
  - Bij een gevangen bal gaat er geen leven af.

- [x] **Als speler wil ik mijn aantal levens linksboven in het speelveld kunnen zien zodat ik weet hoeveel kansen ik nog heb.**
  - Het aantal levens is zichtbaar tijdens het spelen.
  - Het aantal levens wordt aangepast wanneer ik een bal mis.

- [x] **Als speler wil ik met drie levens beginnen zodat ik meerdere kansen heb om ballen te missen.**
  - Het spel begint met 3 levens.
  - Het aantal levens staat bij de start op `3/3`.

- [x] **Als speler wil ik dat een gevangen bal verdwijnt zodat duidelijk is dat ik hem heb gevangen.**
  - Een bal verdwijnt zodra hij de catcher raakt.
  - Na het vangen verschijnt de bal opnieuw boven het speelveld.

- [x] **Als speler wil ik dat een gemiste bal verdwijnt zodat het speelveld verder kan met nieuwe ballen.**
  - Een bal verdwijnt wanneer hij onderaan het speelveld komt.
  - Na het missen verschijnt de bal opnieuw boven het speelveld.

- [x] **Als speler wil ik een bewegende sterrenachtergrond zien zodat het spel een ruimte-thema heeft.**
  - Er zijn sterren zichtbaar op de achtergrond.
  - De sterren bewegen tijdens het spel en verschijnen opnieuw bovenaan.

- [x] **Als speler wil ik dat het spel stopt wanneer mijn levens op zijn zodat ik weet dat het spel voorbij is.**
  - Het spel stopt wanneer het aantal levens 0 is.
  - Er vallen geen nieuwe ballen meer wanneer het spel voorbij is.

- [x] **Als speler wil ik een Game Over melding zien zodat duidelijk is dat het spel afgelopen is.**
  - De tekst `Game Over` verschijnt wanneer mijn levens op zijn.
  - De melding is duidelijk zichtbaar op het scherm.

- [x] **Als speler wil ik een geluid horen wanneer het spel voorbij is zodat Game Over duidelijker wordt.**
  - Het Game Over geluid speelt af wanneer mijn levens 0 zijn.
  - Het geluid wordt maar één keer afgespeeld per Game Over.

- [x] **Als speler wil ik het spel met R opnieuw kunnen starten zodat ik nog een keer kan spelen.**
  - De score wordt teruggezet naar 0.
  - De levens worden teruggezet naar 3.
  - De ballen worden opnieuw boven het speelveld geplaatst.

## Cinematic rebuild — 9 oktober 2026

De game gebruikt voor Game 1 de volgende lokale bestanden in `assets/`:

- `giorno-theme.mp3` — achtergrondmuziek, looping na ENTER
- `made-in-heaven.mp3` — Made in Heaven-intro, ±6,008 s
- `time-accelerate.mp3` — begint na het einde van de intro, ±8,882 s
- `ora-ora.mp3` — ORA-reveal, barrage en finisher, ±8,359 s

De vier bestanden zitten in het meegeleverde `JoJo_Cinematic_Audio_Assets.zip`-pakket. Pak de inhoud uit zodat de bestanden in `Game 1/assets/` staan; de JS-code en de bestanden moeten in **dezelfde** Game 1-map staan. Dit pakket is vanwege publicatierechten niet automatisch naar GitHub geüpload.

**Belangrijk:** De bronopnames zijn niet automatisch vrij te herpubliceren. Gebruik GitHub Pages met deze audio alleen als je daarvoor de nodige toestemming of rechten hebt. De game heeft getimede fallbacks als de audio ontbreekt, maar de bedoelde auditieve ervaring vereist de lokale MP3's.

De echte Rewind begint op het `ended`-event van Made in Heaven; de volgende fase op het `ended`-event van Time Accelerate. Tussenfasen worden getekend vanuit gameplayhistorie (circa 9 seconden bij 60 Hz). ORA duurt zolang als het bijbehorende MP3-fragment plus afloopfase; de gameplay stopt tijdens universe reset. 

Nog vereist voor volledige acceptatie: nieuwe regressietests voor de gewijzigde timing, een echte browser-run, audioluistertest en beoordeling van opname-/publicatierechten.
