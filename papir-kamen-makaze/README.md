# Papir, kamen, makaze

Mini-igra sa režimima 1v1 i protiv računara, uz opcione turnire do pet osvojenih rundi. Rezultat se prati dok ne pritisneš **Nova igra** ili **Novi turnir**.

## Pokretanje

Otvori `index.html` u pregledaču. Nisu potrebni dodatni paketi ni build korak.

## Struktura

- `index.html` — stranica igre.
- `assets/css/style.css` — izgled i prilagođavanje mobilnim ekranima.
- `assets/js/script.js` — režimi igre, potezi, izbor računara i rezultat.

U 1v1 režimu prvi igračev izbor ostaje sakriven dok drugi igrač ne odigra. Tada se oba poteza prikažu zajedno.

U turnirskim režimima prvi igrač koji osvoji pet rundi pobeđuje turnir; nerešena runda ne menja rezultat.
