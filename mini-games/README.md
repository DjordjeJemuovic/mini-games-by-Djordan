# Mini Games by Djordan

Glavni meni za mini-igre. Unesi imena i boje igrača, izaberi igru i ona će se otvoriti sa tim podacima.

## Pokretanje

Pokreni `Start-Mini-Games.bat` iz glavnog foldera da otvoriš desktop meni. Iz njega možeš pokrenuti browser igre ili samostalno Python vešanje. Za direktno otvaranje glavnog menija, otvori `index.html` u pregledaču.

## Igre

- `../iks-oks/` — iks-oks, sa izborom solo partije ili turnira.
- `../papir-kamen-makaze/` — 1v1 ili igra protiv računara, sa opcionalnim turnirom do pet osvojenih rundi.
- `../simple-sah/` — šah 1v1 ili protiv računara, sa tajmerom od 15 minuta.
- `../vesanje/` — igra vešanja za dva igrača; jedan zadaje zagonetku i reč, drugi pogađa slova.

Glavni meni prosleđuje imena i boje kroz URL parametre. U iks-oksu se nakon izbora režima igra odmah pokreće sa tim imenima i bojama; u papir-kamen-makazama se imena prikazuju u izabranom režimu. Svaka igra može da se pokrene i samostalno.

U igrama koristi **← Izbor igara** da se vratiš na listu igara bez ponovnog unosa imena i boja, ili **Početni ekran · unesi imena** da započneš sa drugim igračima.
