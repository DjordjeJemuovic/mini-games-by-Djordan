// === Povezivanje HTML elemenata ===
// Sačuvamo reference do forme, ekrana i dugmadi da bi ih događaji mogli menjati.
const playersForm = document.querySelector('#players-form');
const accountScreen = document.querySelector('#account-screen');
const accountForm = document.querySelector('#account-form');
const accountNameInput = document.querySelector('#account-name');
const accountPasswordInput = document.querySelector('#account-password');
const accountDisplayName = document.querySelector('#account-display-name');
const accountModeButtons = [...document.querySelectorAll('[data-account-mode]')];
const guestEntryButton = document.querySelector('#guest-entry');
const accountMenuButton = document.querySelector('#account-menu-button');
const logoutAccountButton = document.querySelector('#logout-account');
const playersScreen = document.querySelector('#players-screen');
const gamesScreen = document.querySelector('#games-screen');
const welcomeMessage = document.querySelector('#welcome-message');
const changePlayersButton = document.querySelector('#change-players');
const gameButtons = [...document.querySelectorAll('.game-card')];
const launchParams = new URLSearchParams(window.location.search);
const launcherMessage = document.querySelector('#launcher-message');

// === Profil igrača i povratak iz igre ===
// Ovo stanje deli forma sa izabranom igrom.
let players = null;
let accountName = 'Gost';
let accountMode = 'login';

// Nalozi su za sada samo vizuelni prototip: forma ne salje niti cuva lozinku.
function enterPlayerSetup(name) {
  accountName = name || 'Gost';
  accountDisplayName.textContent = accountName;
  accountScreen.hidden = true;
  gamesScreen.hidden = true;
  playersScreen.hidden = false;
}

// Izbor kartice menja tekst dugmeta i oznaku polja, bez prave autentifikacije.
accountModeButtons.forEach(button => {
  button.addEventListener('click', () => {
    accountMode = button.dataset.accountMode;
    accountModeButtons.forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    accountForm.querySelector('button[type="submit"]').textContent =
      accountMode === 'register' ? 'Napravi nalog' : 'Prijavi se';
    accountPasswordInput.autocomplete = accountMode === 'register' ? 'new-password' : 'current-password';
  });
});

// Prihvat forme prikazuje profil u interfejsu; autentifikacija jos nije povezana.
accountForm.addEventListener('submit', event => {
  event.preventDefault();
  enterPlayerSetup(accountNameInput.value.trim());
});

// Gost moze da udje direktno u podesavanje lokalne partije.
guestEntryButton.addEventListener('click', () => enterPlayerSetup('Gost'));

// Dugme profila vraca na vizuelni ekran naloga.
accountMenuButton.addEventListener('click', () => {
  gamesScreen.hidden = true;
  accountScreen.hidden = false;
});

// Pocetni ekran naloga je ponovo dostupan iz menija igara.
logoutAccountButton.addEventListener('click', () => {
  gamesScreen.hidden = true;
  accountScreen.hidden = false;
});

// Ako je meni otvoren iz igre, vrati sačuvana imena i boje umesto novog unosa.
const savedOne = launchParams.get('player1')?.trim();
const savedTwo = launchParams.get('player2')?.trim();
if (savedOne && savedTwo) {
  players = {
    one: savedOne,
    two: savedTwo,
    colorOne: launchParams.get('color1') || playersForm.elements.playerOneColor.value,
    colorTwo: launchParams.get('color2') || playersForm.elements.playerTwoColor.value
  };
  playersForm.elements.playerOne.value = players.one;
  playersForm.elements.playerTwo.value = players.two;
  playersForm.elements.playerOneColor.value = players.colorOne;
  playersForm.elements.playerTwoColor.value = players.colorTwo;
  welcomeMessage.textContent = `Spremni ste, ${players.one} i ${players.two}?`;
  accountScreen.hidden = true;
  playersScreen.hidden = true;
  gamesScreen.hidden = false;
}

// === Obrada forme igrača ===
// Sačuvaj podatke iz forme i prikaži izbor igara.
// Callback za slanje forme: pročita i sačuva profile igrača pa otvara izbor igara.
playersForm.addEventListener('submit', event => {
  event.preventDefault();
  players = {
    one: playersForm.elements.playerOne.value.trim(),
    two: playersForm.elements.playerTwo.value.trim(),
    colorOne: playersForm.elements.playerOneColor.value,
    colorTwo: playersForm.elements.playerTwoColor.value
  };
  welcomeMessage.textContent = `Spremni ste, ${players.one} i ${players.two}?`;
  accountScreen.hidden = true;
  playersScreen.hidden = true;
  gamesScreen.hidden = false;
});

// === Pokretanje odabrane igre ===
// Svaka kartica nosi putanju igre kroz data-game; imena i boje putuju kao URL parametri.
// Callback svake kartice: sastavi URL igre sa profilima igrača i navigira do nje.
gameButtons.forEach(button => {
  // Click callback prosleđuje podešavanja profila igri koju predstavlja kartica.
  button.addEventListener('click', () => {
    if (button.dataset.launchGame === 'bilijar') {
      if (window.location.protocol !== 'http:' || window.location.hostname !== '127.0.0.1') {
        launcherMessage.hidden = false;
        launcherMessage.textContent = 'Bilijar pokreni preko Start-Mini-Games.bat da bi se otvorio iz launchera.';
        return;
      }
      launcherMessage.hidden = true;
      fetch('/__launcher/launch/bilijar', {
        method: 'POST',
        headers: { 'X-Mini-Games-Launcher': '1' }
      })
        .then(response => {
          if (!response.ok) throw new Error('Pokretanje nije uspelo.');
          launcherMessage.hidden = false;
          launcherMessage.textContent = 'Bilijar se pokreće u svom prozoru. Zatvori igru da se vratiš u launcher.';
        })
        .catch(() => {
          launcherMessage.hidden = false;
          launcherMessage.textContent = 'Bilijar nije pokrenut. Proveri Python i Pygame instalaciju.';
        });
      return;
    }
    if (!players) return;
    const params = new URLSearchParams({
      player1: players.one,
      player2: players.two,
      color1: players.colorOne,
      color2: players.colorTwo
    });
    const gamePath = button.dataset.gamePath || `../${button.dataset.game}/index.html`;
    window.location.href = `${gamePath}?${params.toString()}`;
  });
});

// === Povratak na unos profila ===
// Omogući promenu igrača bez ponovnog učitavanja stranice.
// Callback dugmeta za izmenu profila: sakrije izbor igara i vrati formu.
changePlayersButton.addEventListener('click', () => {
  gamesScreen.hidden = true;
  playersScreen.hidden = false;
});
