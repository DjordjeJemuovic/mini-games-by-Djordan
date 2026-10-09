# Bilijar

Bilijar za dva igraca ili jednog igraca protiv racunara, napravljen u Python-u sa Pygame-om.

## Pokretanje

Pokreni `Start-Bilijar.bat` ili `main.py`. Potreban je Python 3 sa Pygame-om.

## Pravila i funkcije

- Kugle 1–7 su pune, 9–15 su sarene, a kugla 8 je crna. Trougao koristi numerisani raspored osmice, sa punom i sarenom kuglom u zadnjim uglovima.
- Prva legalno ubacena puna ili sarena kugla dodeljuje grupe igracima. Posle dodele sme da se cilja samo sopstvena grupa; osmica postaje dozvoljena meta nakon ciscenja grupe.
- Prvi kontakt belom kuglom sa pogresnom grupom, promasaj svih kugli ili ubacivanje bele kugle racuna se kao faul.
- Kartice iznad stola prikazuju imena, potez, grupu i ikonice ubacenih kugli.
- Za pobedu treba legalno ubaciti sve kugle svoje grupe, a zatim kuglu 8. Prevremeno ubacivanje osmice daje pobedu protivniku.
- Pri nisanjenju se simulira putanja prve pogodjene kugle prema uglu i snazi udarca, sa sudarima, trenjem i odbijanjem od mantinele. Oznaka pokazuje gde se kugla zaustavlja ili u koji dzep ulazi.
- Sudari kugli koriste jednakomasevni impuls i koeficijent elasticnosti; trenje na filcu postepeno usporava kugle. Sudar sa mantinelom odbija kuglu i gubi deo brzine.
- Bocni spin malo zakrivljuje putanju i menja odbijanje od mantinele; udarac iznad ili ispod centra menja nastavak kretanja bele kugle posle kontakta. Fizika je pojednostavljena 2D aproksimacija, ne potpuni profesionalni model bilijara.

## Kontrole

- Unesi oba imena za 1v1 ili izaberi igru protiv racunara.
- Klikni belu kuglu, povuci misa unazad da izaberes smer i jacinu, pa pusti za udarac.
- Merač snage prikazuje jačinu dok povlačiš štap: kraće povlačenje daje slabiji udarac, a povlačenje od 180 piksela dostiže maksimalnu snagu. Pun udarac je pojačan, a poslednji deo merača povećava jačinu brže za snažniji zamah.
- Klik blize levoj/desnoj ivici bele kugle dodaje bocni spin; klik iznad/ispod centra dodaje gornji ili donji udarac. Klik na centar daje prav udarac.
- **Nova partija** resetuje raspored kugli; **Izbor rezima** vraca na pocetni ekran.
- Escape zatvara igru.
- Dugme **Izlaz** zatvara igru mišem.

