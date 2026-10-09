# Iks-Oks

Jednostavna igra iks-oksa za dva igrača, uz opcioni turnir 1v1. Ne zahteva instalaciju paketa ni build korak.

## Pokretanje

Otvori `index.html` u pregledaču.

## Struktura

- `index.html` — početna HTML stranica i ekrani igre.
- `assets/css/style.css` — stilovi.
- `assets/js/script.js` — pravila igre, rekordi i uvoz/izvoz.
- `data/records.json` — početni JSON fajl za razmenu ili rezervnu kopiju rekorda.

Rekordi tokom igranja čuvaju se u `localStorage` pregledača. Za prenos između pregledača koristi **Preuzmi JSON** i **Uvezi JSON** na ekranu rekorda.

Na prvom ekranu izaberi **Solo partija** za jednu partiju ili **Turnir od 5** za niz partija. Tu možeš da izabereš i jednu od deset tamnih boja table. U turnirskom režimu pobede se sabiraju kroz partije; prvi igrač koji dođe do pet pobeda osvaja turnir. Nerešene partije ne menjaju skor.

Kada se igra otvori iz `mini-games` menija, imena i boje su već podešeni, pa se nakon izbora režima igra odmah pokreće.
