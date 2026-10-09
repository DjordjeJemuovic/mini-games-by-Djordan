# Tetris

Tetris desktop igra za jednog igraca, napravljena pomocu Python-a i Tkinter-a. Pre pocetka igrac unosi ime i bira jedan od pet pocetnih nivoa.

## Pokretanje

Iz desktop pokretaca izaberi **Tetris** ili pokreni `Start-Tetris.bat`. Potreban je Python 3 sa Tkinter podrskom.

## Nivoi i pobeda

- Igra pocinje na nivou koji igrac izabere.
- Svakih 1000 poena nivo se povecava, a figure padaju brze.
- Bodovi za uklonjene redove mnoze se trenutnim nivoom.
- Cilj je da igrac dostigne 5000 poena. Ekran zatim prikazuje cestitku sa njegovim imenom.

## Kontrole

- Klik misa na tablu: rotira figuru koja pada.
- Strelice levo/desno: pomeraju figuru.
- Drzi Space: ubrzava padanje.
- R: zapocinje novu igru za istog igraca i na istom pocetnom nivou.
