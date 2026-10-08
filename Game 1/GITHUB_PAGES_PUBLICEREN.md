# Bijgewerkte game naar GitHub Pages publiceren

De huidige live pagina staat onder `/Game%201/`. De GitHub-repository kon tijdens deze sessie niet worden opgehaald, dus controleer eerst zelf of jouw Pages-source de map `Game 1` uit de hoofdbranch gebruikt.

1. Maak lokaal een kopie van je repository voordat je bestanden vervangt.
2. Pak `Catcher_JoJo_Celestial_Edition.zip` uit.
3. Kopieer de **inhoud** van de uitgepakte map `Catcher_JoJo_Celestial_Edition` naar de bestaande repositorymap `Game 1`. Houd `index.html`, `src/`, `assets/` en `vendor/` op hetzelfde relatieve niveau. Maak geen extra maplaag.
4. Controleer dat deze paden bestaan met dezelfde hoofdletters:
   - `Game 1/index.html`
   - `Game 1/src/sketch.js`
   - `Game 1/vendor/p5.min.js`
   - `Game 1/vendor/p5.sound.min.js`
   - `Game 1/assets/`
5. Open `Game 1/index.html` met Live Server en voer eerst de controles uit `TESTRESULTATEN.md` uit.
6. Bekijk in GitHub Desktop de gewijzigde bestanden en commit ze met bijvoorbeeld `fix: finish attack animations and game over flow`.
7. Push pas nadat je de wijzigingen zelf hebt gecontroleerd. GitHub Pages hoort daarna automatisch opnieuw te publiceren.
8. Open de Pages-link opnieuw en force-refresh met `Ctrl+F5`. Controleer de startpagina, ORA, Road Roller, Time Stop, Game Over en de browserconsole.

De `G`-testtoets werkt in deze ZIP alleen als je tijdens testen `?test=1` achter de URL zet. Gebruik die query niet voor de normale publieke link. Voor de normale gepubliceerde URL zonder query blijft de cheat uitgeschakeld.

Ik heb de repository niet aangepast of gepusht. Deze stappen zijn instructies voor publicatie; de huidige Pages-link blijft ongewijzigd totdat jij de ZIP in GitHub zet.
