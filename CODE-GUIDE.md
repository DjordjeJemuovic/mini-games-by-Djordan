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

Tri Python desktop igre koriste Pygame 2.6: `vesanje/main.py`, `tetris/main.py` i `bilijar/main.py`. Pokreni svaku preko njenog `Start-*.bat` fajla; pokretac proverava da li Pygame moze da se uveze u izabranom Python interpreter-u.

### `vesanje/main.py`

Klasa `HangmanGame` vodi unos imena, zagonetke i skrivene reci, predaju ekrana, pogadjanje slova i rezultat kroz runde. Pygame petlja crta odgovarajuci ekran i obradjuje tastaturu i klikove. Svaka promasena rec dodaje deo vesala; pogodjena rec donosi poen igracu koji pogadja.

### `tetris/main.py`

Klasa `TetrisGame` cuva mrezu 10x20, padajucu figuru, skor i nivoe. `fits()` proverava sudare, `move()` i `rotate()` upravljaju figurom, a `lock_piece()` zakljuca je i uklanja popunjene redove. Pygame crta tablu i odredjuje padanje kroz casovnik glavne petlje. Nivo raste na svakih 1000 poena, a cilj je 5000.

### `bilijar/main.py` i `bilijar/pygame_game.py`

`main.py` je ulazna tacka, a `BilliardsGame` implementacija. Igrac bira 1v1 ili protiv racunara; kugle 1-7 su pune, 9-15 sarene, a 8 je crna. `draw_aim_guide()` prikazuje put bele kugle, ciljane kugle i rupe. `physics_step()` pomera kugle i primenjuje trenje, `collide_balls()` obracunava sudare, `resolve_shot()` dodeljuje grupe i poteze, a `computer_shot()` bira udarac racunara.

Browser igre u `iks-oks`, `papir-kamen-makaze`, `simple-sah` i browser verzijama `vesanje` i `tetris/web` ostaju JavaScript igre.## Kako citati JavaScript funkciju

Browser igre u `mini-games`, `iks-oks`, `papir-kamen-makaze`, `simple-sah`, `vesanje/assets/js` i `tetris/web` koriste JavaScript koji menja HTML prikaz. Python desktop igre koriste Pygame petlju za crtanje, tastaturu, mis i animaciju.
