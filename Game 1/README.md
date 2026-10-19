# JoJo Catcher — Stand Overdrive

Een arcade-vanggame in de stijl van **JoJo's Bizarre Adventure**, gemaakt met **JavaScript en p5.js**.

Je bestuurt een catcher onderaan het scherm en vangt de vallende orbs. Elke vangst geeft punten en Stand Energy. Als je zonder missen doorvangt, bouw je een combo op (tot x5 punten). Met je Stand Energy laat je **Star Platinum**, **The World** en **DIO** los. Na elke golf kies je een Stand-kaart. Elke vijfde golf vecht je tegen de eindbaas: **Enrico Pucci met Made in Heaven**. Versla hem en het universum begint opnieuw, alleen sneller.

## Spelen

1. Open de map `Game 1` in VS Code.
2. Rechtsklik op `index.html` → **Open with Live Server**.
3. Klik op **SPELEN** of druk op **ENTER**.

Zonder Live Server kan het ook. Start vanuit deze map de meegeleverde webserver (zonder cache, dus je ziet wijzigingen meteen) en open daarna http://localhost:8000:

```bash
python tools/serve.py
```

> Werkt het niet? Open de console (F12). De game heeft geen internet nodig: p5.js staat in `vendor/`.

## Besturing

| Toets | Actie |
|---|---|
| ← → of A D | Bewegen (de muis of je vinger werkt ook) |
| 1 of Q | **ORA ORA** (1 energiebalk) |
| 2 of W | **ZA WARUDO** (2 energiebalken) |
| 3 of E | **ROAD ROLLER DA!** (3 energiebalken) |
| P of ESC | Pauze |
| M | Geluid aan/uit |
| O | Instellingen |
| H | Uitleg ("Hoe speel je?") |
| ENTER | Snel opnieuw na Game Over |
| R | **MADE IN HEAVEN** — Pucci reset het universum (bij pauze of Game Over) |
| SPATIE | De Made in Heaven-scène overslaan |

Op een telefoon of tablet sleep je met je vinger. Rechts in beeld verschijnen dan knoppen voor de drie aanvallen.

## Wat valt er naar beneden?

| | Wat | Wat moet je doen? |
|---|---|---|
| 🔮 | **Roze orb** | Vangen. Mis je er één, dan verlies je een leven. |
| 🟡 | **Gouden orb** | 50 punten. Missen kost niets. |
| 💣 | **Bom van Killer Queen** | **Niet** vangen, dat kost een leven. |
| 🐞 | **Lieveheersbeestje** (Gold Experience) | +1 leven (maximaal 5). |
| 🏹 | **Stand Arrow** | Meteen een volle energiebalk. |
| ↔️ | **Breed** | Je catcher is 10 seconden breder. |
| 💿 | **DISC** (alleen bij de eindbaas) | Niet vangen: je Stand is dan 6 seconden geblokkeerd. |

Een **PERFECT** krijg je door precies in het midden van de catcher te vangen. Dat geeft extra punten en energie.

## Stand-aanvallen

- **ORA ORA** — Star Platinum verschijnt boven je catcher. Hij slaat elke orb op het scherm in je bak en ramt de bommen kapot.
- **ZA WARUDO** — De bekende kleuren-omkeer-bol, daarna staat de tijd stil en is alles grijs. Alleen jij kan bewegen. The World slaat de bommen kapot en die ontploffen zodra de tijd weer gaat lopen. Daarna volgt slow-motion met **dubbele punten**.
- **ROAD ROLLER DA!** — DIO laat de wals vallen. De schokgolf verzamelt alles op het scherm. Daarna krijg je 8 seconden **OVERDRIVE** (dubbele punten).

## Stand-kaarten

Na elke golf kies je 1 van 3 kaarten. Ze werken de rest van je potje en sommige kun je vaker kiezen:

Gold Experience (extra leven) · The Hand (wist bommen) · Tusk (nagels schieten) · C-Moon (magneet) · King Crimson (fout uitwissen) · Star Platinum (bredere catcher) · The World (langere tijdstop) · Made in Heaven (meer punten, sneller) · Yare Yare Daze (sneller opladen) · Vampier (levens terug bij combo's).

## Golven en de eindbaas

| Golf | Nieuw |
|---|---|
| 1 | Roze orbs — leer bewegen |
| 2 | Gouden orbs en power-ups |
| 3 | Bommen van Killer Queen |
| 4 | Slingerende orbs en patronen (trap, goudregen) |
| 5 | **Eindbaas: Enrico Pucci** |

Elke gevangen orb schiet een ster naar Pucci en je Stand-aanvallen doen extra schade. Pucci gooit gouden orbs, Whitesnake-discs en **versnelt de tijd**. Als je hem verslaat begint een nieuw universum: alles valt sneller, je krijgt een leven terug en je Stand-kaarten blijven. Vanaf golf 6 komen er ook bommenmuren met één opening.

## MADE IN HEAVEN — de universum-reset

Na het verslaan van Pucci, of als je bij pauze of Game Over op **R** drukt, speelt een filmscène van ongeveer 22 seconden. Met **spatie** sla je hem over.

1. **The Final Prayer** — Pucci staat als silhouet te bidden en spreekt de 14 woorden uit (*Spiral staircase… Rhinoceros beetle… Secret emperor*).
2. **Manifestation** — Made in Heaven onthult zich: flits, schokgolven, veren, draaiende klokken en bliksem. *TIME HAS NO LIMIT.*
3. **Rewind** — **jouw eigen laatste 9 seconden gameplay** spoelen terug, met een VHS-effect: kleuren die uit elkaar trekken, glitch-strepen en een tijdcode die terugtelt.
4. **Time Accelerates** — zon en maan razen rond, dag en nacht flitsen voorbij en Pucci staat stil terwijl alles langs hem raast.
5. **Singularity** — het hele scherm wordt in een draaikolk naar één punt gezogen.
6. **Rebirth** — een oerknal, en het nieuwe universum begint.

De game neemt tijdens het spelen steeds "foto's" van het speelveld op (`Game.recordHistory` in `game.js`). Die worden in deel 3 achterstevoren afgespeeld.

De game is **eerlijk**: de golf-regisseur (`src/waves.js`) rekent uit waar je catcher kan komen. Hij laat nooit twee roze orbs vallen die je onmogelijk allebei kunt vangen.

## Hoe de code in elkaar zit

Alle code staat in `src/`. Elk bestand heeft één taak en bovenaan staat uitleg in het Nederlands.

| Bestand | Wat doet het? |
|---|---|
| `config.js` | **Alle instelbare getallen** (snelheid, punten, levens, golven). Begin hier als je iets wilt aanpassen. |
| `sketch.js` | Het startpunt voor p5.js: `setup()`, `draw()`, toetsenbord en muis |
| `game.js` | Het hart van de game: score, levens, combo, vangen/missen, golven, game over |
| `catcher.js` | De catcher (beweging met optrekken/afremmen, squash, nabeelden) |
| `objects.js` | Alles wat valt (`Faller`-class) |
| `waves.js` | De golf-regisseur: wat valt er wanneer en waar (eerlijk!) |
| `stands.js` | ORA ORA, ZA WARUDO en ROAD ROLLER |
| `cards.js` | Stand-kaarten en het kaart-kies-scherm |
| `boss.js` | De eindbaas Pucci |
| `cinematics.js` | Cut-ins en de TO BE CONTINUED-pijl |
| `heaven.js` | De MADE IN HEAVEN-filmscène (universum-reset) |
| `hud.js` | Score, levens, energiebalk, combo |
| `screens.js` | Titelscherm, uitleg, pauzemenu, Game Over |
| `effects.js` | Deeltjes, zwevende tekst, schermschudden, flitsen, hit-stop |
| `background.js` | Sterren, nevel, planeet, klok en vloer |
| `assets.js` | Stand-plaatjes laden en sprites tekenen (orbs, bom, vuist, Road Roller) |
| `audio.js` | Geluid, stemmen en muziek (Web Audio) |
| `ui.js`, `view.js`, `input.js`, `utils.js`, `storage.js`, `settings.js` | Hulpcode: tekst en knoppen, schermschaal, besturing, wiskunde, opslaan, instellingen |

Belangrijk om te weten:

- **Tijd-gebaseerd**: alle beweging gebruikt `deltaTime`. De game is daardoor op een 60 Hz- en een 165 Hz-scherm even snel.
- **Vaste speelveldhoogte**: het veld is altijd 720 "game-pixels" hoog en schaalt mee met je scherm. Dat werkt van telefoon tot ultrawide.
- **Snel tekenen**: sprites worden één keer getekend en daarna steeds gekopieerd. Zware dingen gebeuren niet in `draw()`.

## Tests

```bash
npm test
```

Dit draait `tests/test_game.cjs` (23 tests voor de spelregels: vangen, missen, combo's, golven, de eerlijkheid van de regisseur, alle Stand-aanvallen, de eindbaas, de Made in Heaven-reset, game over en opslaan) en `tests/test_3d.cjs` (de 3D-modus). Je hebt alleen Node.js nodig. De tests draaien ook automatisch op GitHub bij elke push.

Voor testen in de browser kun je `?debug=1` achter de URL zetten. Dan werken de testtoetsen: **G** = volle energie, **N** = volgende golf, **B** = naar de eindbaas, **L** = extra leven.

## 3D Combat Mode (experimenteel)

Via **3D COMBAT MODE** in het hoofdmenu (`combat.html`) speel je een losse 3D-arena-missie met Three.js. Deze modus heeft internet nodig voor Three.js en staat los van de arcade-game.

## User stories

- [x] Als speler wil ik een speelveld zien, zodat ik weet waar het spel zich afspeelt. *(Het veld vult het venster en schaalt mee.)*
- [x] Als speler wil ik eerst de spelregels en besturing zien, zodat ik weet hoe ik moet spelen. *(Titelscherm + "Hoe speel je?" + uitleg tijdens de eerste golf.)*
- [x] Als speler wil ik het spel met ENTER starten, zodat ik eerst de uitleg kan lezen. *(Er valt niets voordat je start.)*
- [x] Als speler wil ik een catcher onderaan zien die ik met ← en → bestuur. *(Hij stopt als je loslaat.)*
- [x] Als speler wil ik dat de catcher binnen het speelveld blijft.
- [x] Als speler wil ik vallende orbs zien die ik moet vangen. *(Ze hebben een lichte rand en gloed, zodat je ze goed ziet.)*
- [x] Als speler wil ik meerdere orbs tegelijk, op verschillende plekken.
- [x] Als speler wil ik punten krijgen als ik een orb vang en mijn score linksboven zien.
- [x] Als speler wil ik levens verliezen als ik een orb mis en mijn levens zien. *(Je begint met 3 levens.)*
- [x] Als speler wil ik dat een gevangen of gemiste orb verdwijnt.
- [x] Als speler wil ik een bewegende sterrenachtergrond, zodat het spel een ruimte-thema heeft.
- [x] Als speler wil ik dat het spel stopt als mijn levens op zijn, met een duidelijke Game Over-melding en een geluid. *(TO BE CONTINUED + metal pipe, één keer per Game Over.)*
- [x] Als speler wil ik opnieuw kunnen starten. *(ENTER = snel opnieuw, R = Made in Heaven-reset. Score en levens worden teruggezet.)*
- [x] Als speler wil ik combo's, power-ups, Stand-aanvallen, Stand-kaarten en een eindbaas, zodat het spel steeds spannender wordt.
- [x] Als speler wil ik dat mijn record bewaard blijft. *(In de browser, via localStorage.)*
- [x] Als speler wil ik geluid, schermschudden en flitsen kunnen instellen. *(Instellingen, toets O.)*

## Peer-review checklist

- [x] De demo werkt zonder console-errors.
- [x] De besturing werkt zoals bedoeld (toetsenbord, muis en touch).
- [x] Variabelen, loops, functies, arrays, if-statements en classes zijn aanwezig en werken.
- [x] De code is leesbaar, opgesplitst in bestanden en heeft duidelijke comments.
- [x] Geen onnodig zware berekeningen in `draw()` (sprites en achtergrond worden vooraf getekend).
- [x] De README is compleet en externe assets zijn vermeld.

## Credits

- Gemaakt met [p5.js](https://p5js.org) (LGPL, zie `THIRD_PARTY_NOTICES.md`).
- Stand-illustraties in `assets/stand-art/`: gegenereerde fan-art, geen officiële JoJo-art (zie `ASSET_CREDITS.md`).
- Geluidseffecten: [Kenney](https://kenney.nl) Impact Sounds en RPG Audio (CC0), plus daarvan afgeleide mixen in `assets/cinematic/`.
- JoJo-stemmen en -muziek (`assets/jojo/`, `za-warudo…mp3`, `ora-ora.mp3`, `made-in-heaven.mp3`, `giorno-theme.mp3`): zelf aangeleverd, alleen voor persoonlijk/schoolgebruik. Zie `JOJO_AUDIO_PACK.json`.
- Game Over-geluid: [metal pipe falling sound](https://www.myinstants.com/en/instant/jixaw-metal-pipe-falling-sound-28270/).
- JoJo's Bizarre Adventure is van Hirohiko Araki / Shueisha. Dit is een niet-commercieel fanproject voor school.
- AI (ChatGPT, Codex en Claude) gebruikt bij het schrijven en structureren van code en documentatie.
