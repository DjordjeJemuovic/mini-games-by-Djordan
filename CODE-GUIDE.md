# Vodič kroz JavaScript i Python kod

Ovaj vodič opisuje šta radi svaki `.js` i `.py` fajl, kako teče igra i gde da počneš kada želiš nešto da izmeniš. U samim fajlovima nalaze se dodatni komentari iznad glavnih celina i funkcija.

## Glavni meni

### `mini-games/assets/js/script.js`

Upravlja početnim ekranom i izborom browser igara.

1. Učita polja za imena i boje igrača.
2. Ako URL već sadrži `player1`, `player2`, `color1` i `color2`, popuni podatke i preskoči unos.
3. Kada se izabere kartica igre, napravi URL parametre i otvori odgovarajući `../ime-igre/index.html`.
4. Dugme za promenu igrača vraća na početnu formu.

## Browser igre

### `iks-oks/assets/js/script.js`

`board` je niz od devet polja. `turn` čuva čiji je potez (`X` ili `O`), a `wins` sadrži sve tri-u-nizu kombinacije. Funkcija `play()` zabeleži potez, proveri pobedu ili nerešeno, pa promeni igrača.

`tournamentWins` čuva pobede u tekućem turniru; obična pobeda u partiji povećava rezultat, a pet pobeda završava turnir. Rekordi se čitaju i pišu u `localStorage` pod ključem `iks-oks-records-v1`. To su podaci lokalnog pregledača, nisu automatski upisani u `iks-oks/data/records.json`. Dugmad za izvoz i uvoz omogućavaju da se rekordni podaci ručno sačuvaju kao JSON fajl ili prenesu nazad u pregledač.

Izmena vizuelne boje terena ide kroz CSS promenljivu `--terrain-color`. Boje X/O koriste se posebno za znake igrača.

### `papir-kamen-makaze/assets/js/script.js`

`moves` sadrži tri moguća poteza. `determineWinner()` primenjuje pravila i vraća nerešeno, pobedu igrača 1 ili pobedu igrača 2. U 1v1 se prvi potez čuva u `pendingPlayerOneMove`, ali se ne prikazuje dok igrač 2 ne odigra, da bi izbor ostao skriven.

U režimu računara potez bira `Math.random()`. Turnirski režim koristi iste runde; pobeđuje onaj ko prvi skupi pet pobeda. `startGame()` postavlja imena, boje, režim i rezultat; `resetGame()` čisti rezultat unutar tog režima.

### `simple-sah/assets/js/script.js`

Tabla je 8×8 niz nizova. Polje sadrži `null` ili figuru oblika `{ color, type, moved }`. Boja je `w` ili `b`; tip je `K` kralj, `Q` dama, `R` top, `B` lovac, `N` skakač ili `P` pešak.

Tok provere poteza:

1. `pseudoMoves()` generiše poteze koji liče na legalne za izabranu figuru, uključujući rokadu i en passant.
2. `applyMove()` primenjuje potez na tablu; radi i sa posebnim potezima i promocijom pešaka u damu.
3. `legalMoves()` simulira potez na kopiji table i odbaci ga ako bi sopstveni kralj ostao u šahu.
4. `allLegalMoves()` proverava sve figure boje. Koristi se za prepoznavanje šah-mata i pata.

`renderBoard()` povezuje stanje table sa 64 dugmeta na ekranu. `finishMove()` zabeleži uzimanje, promeni redosled poteza i po potrebi pokrene računar. Računar koristi jednostavno bodovanje u `chooseComputerMove()` — nije duboka šahovska pretraga.

Tajmer počinje na 15 minuta. Po isteku se saberu materijalne vrednosti preostalih figura: pešak 1, skakač/lovac 3, top 5 i dama 9. Ako su vrednosti jednake, partija se završava nerešeno.

### `vesanje/assets/js/script.js`

Browser verzija igre vešanja. Imena i boje dolaze iz URL parametara glavnog menija. Prvi igrač unosi zagonetku i skrivenu reč, a ekran za predaju sprečava da drugi igrač slučajno vidi reč.

`guessed` je skup već izabranih slova, a `mistakes` broj promašaja. `displayWord()` sakriva neotkrivena slova, `drawHangman()` iscrtava figuru deo po deo, a `chooseLetter()` proverava pobedu ili šest grešaka. Rezultat živi samo dok je stranica otvorena.

## Python desktop igre

### `vesanje/main.py`

Ovaj fajl je samostalna Tkinter verzija vešanja. Klasa `HangmanGame` grupiše stanje igre (`word`, `guessed`, `misses`, rezultat) i operacije za prikaz ekrana i obradu poteza.

Tok ekrana je:

1. `show_setup()` prikaže unos imena, zagonetke i reči.
2. `start_handoff()` proveri unose i pripremi skrivene znakove.
3. `show_handoff()` zatraži predaju uređaja drugom igraču.
4. `start_round()` napravi tablu, slova i crtež.
5. `guess()` obradi izabrano slovo; `draw_hangman()` iscrta naredni deo figure.
6. `finish_round()` zaključa tastaturu i ažurira rezultat.

`main()` je ulazna tačka: napravi Tkinter prozor, instancu `HangmanGame` i pokrene event loop koji čeka klikove igrača.

Python i browser verzije vešanja su dve zasebne realizacije. Njihov rezultat i tekuća reč se ne dele.

### `tetris/main.py`

`TetrisGame` čuva mrežu od 10×20 polja, ime igrača, izabrani početni nivo, aktivnu figuru, sledeću figuru, skor i nivo. ` _start_from_setup()` proverava ime i otvara ekran igre. Svaka figura je skup koordinata ćelija. `_fits()` proverava granice i sudare, `_move()` obrađuje pomeranje, a `_rotate()` računa novu orijentaciju bez promene table ako rotacija ne može da stane.

Tkinter `after()` poziva `_tick()` periodično da pomera figuru nadole. Držanje razmaknice smanjuje čekanje između padova. Kad figura više ne može da se pomeri, `_lock_piece()` je upisuje u tablu, a `_clear_full_rows()` uklanja popunjene redove i dodeljuje bodove. Svakih 1000 poena nivo raste i figure padaju brže; igrač pobeđuje na 5000 poena. `_win_game()` prikazuje čestitku sa imenom igrača, a `_end_game()` prikazuje rezultat ako se tabla napuni pre dostizanja cilja. Taster R ponavlja partiju sa istim imenom i početnim nivoom.

## Kako čitati JavaScript funkciju

Na vrhu većine browser skripti `document.querySelector(...)` pronalazi elemente iz HTML-a. Promenljive zatim čuvaju stanje, funkcije obrađuju pravila, a `addEventListener(...)` povezuje klikove i slanje formi sa tim funkcijama.

Za novu funkciju obično treba izmeniti tri sloja: HTML za elemente, CSS za izgled i JavaScript/Python za ponašanje.
