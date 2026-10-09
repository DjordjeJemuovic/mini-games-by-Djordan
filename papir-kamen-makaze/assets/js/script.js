// === Pravila poteza i prikaz simbola ===
// Mogući potezi i njihov prikaz na ekranu.
const moves = ['kamen', 'papir', 'makaze'];
const moveDetails = {
  kamen: { label: 'Kamen', icon: '✊' },
  papir: { label: 'Papir', icon: '✋' },
  makaze: { label: 'Makaze', icon: '✌️' }
};

// === HTML reference i podaci iz glavnog menija ===
const modeScreen = document.querySelector('#mode-screen');
const hubLink = document.querySelector('#hub-link');
const gameScreen = document.querySelector('#game-screen');
const modeButtons = [...document.querySelectorAll('.mode-button')];
const gameTitle = document.querySelector('#game-title');
const gameInstructions = document.querySelector('#game-instructions');
const resultElement = document.querySelector('#result');
const playerOneLabel = document.querySelector('#player-one-label');
const playerTwoLabel = document.querySelector('#player-two-label');
const playerOneScoreElement = document.querySelector('#player-one-score');
const playerTwoScoreElement = document.querySelector('#player-two-score');
const choiceOneLabel = document.querySelector('#choice-one-label');
const choiceTwoLabel = document.querySelector('#choice-two-label');
const choiceOneIcon = document.querySelector('#choice-one-icon');
const choiceTwoIcon = document.querySelector('#choice-two-icon');
const choiceOneName = document.querySelector('#choice-one-name');
const choiceTwoName = document.querySelector('#choice-two-name');
const moveButtons = [...document.querySelectorAll('.move-button')];
const newGameButton = document.querySelector('#new-game');
const changeModeButton = document.querySelector('#change-mode');
const launchParams = new URLSearchParams(window.location.search);
const launchPlayers = {
  one: launchParams.get('player1')?.trim(),
  two: launchParams.get('player2')?.trim(),
  colorOne: launchParams.get('color1'),
  colorTwo: launchParams.get('color2')
};
// Link za povratak u meni zadržava imena i boje koje je korisnik uneo.
if (launchParams.toString()) hubLink.href = `../mini-games/index.html?${launchParams.toString()}`;

// === Stanje meča ===
// Čuva režim, rezultate i potez igrača 1 dok igrač 2 ne izabere svoj.
let gameMode = '';
let tournamentMode = false;
let playerOneScore = 0;
let playerTwoScore = 0;
let pendingPlayerOneMove = '';

// === Prikaz izabranih poteza ===
// Pomoćne funkcije skrivaju i otkrivaju izbore radi fer igre 1v1.
/** Upisuje ikonicu i naziv poteza u prikaz odgovarajućeg igrača. */
function showChoice(player, move) {
  // Prikaži simbol i naziv poteza za jednog od igrača.
  const details = moveDetails[move];
  const icon = player === 1 ? choiceOneIcon : choiceTwoIcon;
  const name = player === 1 ? choiceOneName : choiceTwoName;
  icon.textContent = details.icon;
  name.textContent = details.label;
}

/** Sakriva poteze oba igrača dok se ne završi izbor u 1v1. */
function hidePendingChoices() {
  // U 1v1 ne otkrivaj prvi potez dok drugi igrač ne izabere svoj.
  choiceOneIcon.textContent = '🔒';
  choiceOneName.textContent = 'Izbor sačuvan';
  choiceTwoIcon.textContent = '❔';
  choiceTwoName.textContent = 'Čeka izbor';
}

/** Otkrije oba poteza pozivom showChoice za svakog igrača. */
function showChoices(one, two) {
  showChoice(1, one);
  showChoice(2, two);
}

// === Pravila i obračun runde ===
// Ovaj deo odlučuje ko pobeđuje i ažurira rezultat/turnir.
/** Poredi dva poteza i vraća 0 za nerešeno, 1 ili 2 za pobednika. */
function determineWinner(one, two) {
  // Vrati 0 za nerešeno, 1 ako pobeđuje prvi igrač, 2 ako drugi.
  if (one === two) return 0;
  if (
    (one === 'kamen' && two === 'makaze') ||
    (one === 'papir' && two === 'kamen') ||
    (one === 'makaze' && two === 'papir')
  ) return 1;
  return 2;
}

/** Prikaže poteze, uveća rezultat i proveri da li je turnir završen. */
function completeRound(one, two) {
  // Otkrij oba poteza, ažuriraj rezultat i proveri uslov za kraj turnira.
  showChoices(one, two);
  const winner = determineWinner(one, two);
  if (winner === 0) {
    resultElement.textContent = 'Nerešeno!';
    resultElement.dataset.outcome = 'draw';
  } else if (winner === 1) {
    playerOneScore += 1;
    resultElement.dataset.outcome = 'win';
  } else {
    playerTwoScore += 1;
    resultElement.dataset.outcome = 'loss';
  }
  playerOneScoreElement.textContent = playerOneScore;
  playerTwoScoreElement.textContent = playerTwoScore;

  const tournamentWinner = tournamentMode && (playerOneScore === 5 || playerTwoScore === 5);
  if (tournamentWinner) {
    const winnerName = playerOneScore === 5 ? playerOneLabel.textContent : playerTwoLabel.textContent;
    resultElement.textContent = `${winnerName} osvaja turnir! 🏆`;
    newGameButton.textContent = 'Novi turnir';
    moveButtons.forEach(button => { button.disabled = true; });
  } else if (winner === 1) {
    resultElement.textContent = `${playerOneLabel.textContent} dobija rundu!`;
  } else if (winner === 2) {
    resultElement.textContent = `${playerTwoLabel.textContent} dobija rundu!`;
  }
}

// === Tok igre i resetovanje ===
// Izabrani režim određuje da li potez stiže od drugog igrača ili računara.
/** Obradi potez korisnika i po potrebi sačeka potez drugog igrača. */
function play(move) {
  // Protiv računara odigraj rundu odmah; u 1v1 prvo sačuvaj skriveni potez igrača 1.
  if (gameMode === 'computer') {
    const computerMove = moves[Math.floor(Math.random() * moves.length)];
    completeRound(move, computerMove);
    return;
  }

  if (!pendingPlayerOneMove) {
    pendingPlayerOneMove = move;
    hidePendingChoices();
    resultElement.textContent = `${playerTwoLabel.textContent}, izaberi svoj potez.`;
    resultElement.removeAttribute('data-outcome');
    return;
  }

  completeRound(pendingPlayerOneMove, move);
  pendingPlayerOneMove = '';
}

/** Pokreće novi solo/računarski ili 1v1 meč i inicijalizuje ekran. */
function startGame(mode) {
  // Iz teksta data-mode izvuci tip meča i da li je uključen turnir do 5 pobeda.
  tournamentMode = mode.endsWith('-tournament');
  gameMode = mode.startsWith('pvp') ? 'pvp' : 'computer';
  playerOneScore = 0;
  playerTwoScore = 0;
  pendingPlayerOneMove = '';
  playerOneScoreElement.textContent = '0';
  playerTwoScoreElement.textContent = '0';
  moveButtons.forEach(button => { button.disabled = false; });
  newGameButton.textContent = tournamentMode ? 'Novi turnir' : 'Nova igra';
  resultElement.removeAttribute('data-outcome');
  choiceOneIcon.textContent = '❔';
  choiceTwoIcon.textContent = '❔';
  choiceOneName.textContent = 'Čeka izbor';
  choiceTwoName.textContent = 'Čeka izbor';

  if (gameMode === 'pvp') {
    gameTitle.textContent = tournamentMode ? '1v1 turnir do 5' : '1v1';
    gameInstructions.textContent = tournamentMode
      ? 'Prvi igrač sa 5 osvojenih rundi pobeđuje. Igrač 1 počinje svaku rundu.'
      : 'Igrač 1 počinje svaku rundu. Izbori se otkrivaju kada oboje odigraju.';
    playerOneLabel.textContent = launchPlayers.one || 'Igrač 1';
    playerTwoLabel.textContent = launchPlayers.two || 'Igrač 2';
    choiceOneLabel.textContent = playerOneLabel.textContent;
    choiceTwoLabel.textContent = playerTwoLabel.textContent;
  } else {
    gameTitle.textContent = tournamentMode ? 'Turnir protiv računara' : 'Protiv računara';
    gameInstructions.textContent = tournamentMode
      ? 'Prvi do 5 osvojenih rundi osvaja turnir.'
      : 'Izaberi potez, pa pogledaj šta je izabrao računar.';
    playerOneLabel.textContent = launchPlayers.one || 'Ti';
    playerTwoLabel.textContent = 'Računar';
    choiceOneLabel.textContent = playerOneLabel.textContent;
    choiceTwoLabel.textContent = 'Računar';
  }

  resultElement.textContent = gameMode === 'pvp' ? `${playerOneLabel.textContent}, izaberi svoj potez.` : 'Izaberi svoj potez.';

  const validColor = color => /^#[\da-f]{6}$/i.test(color || '') ? color : '';
  playerOneLabel.style.color = validColor(launchPlayers.colorOne);
  choiceOneLabel.style.color = validColor(launchPlayers.colorOne);
  playerTwoLabel.style.color = gameMode === 'pvp' ? validColor(launchPlayers.colorTwo) : '';
  choiceTwoLabel.style.color = gameMode === 'pvp' ? validColor(launchPlayers.colorTwo) : '';

  modeScreen.hidden = true;
  gameScreen.hidden = false;
}

/** Resetuje rezultat i prikaz poteza za novu partiju istog režima. */
function resetGame() {
  // Resetuj rezultat i poteze, ali zadrži izabrani režim i imena igrača.
  playerOneScore = 0;
  playerTwoScore = 0;
  pendingPlayerOneMove = '';
  playerOneScoreElement.textContent = '0';
  playerTwoScoreElement.textContent = '0';
  resultElement.textContent = gameMode === 'pvp' ? `${playerOneLabel.textContent}, izaberi svoj potez.` : 'Izaberi svoj potez.';
  resultElement.removeAttribute('data-outcome');
  choiceOneIcon.textContent = '❔';
  choiceTwoIcon.textContent = '❔';
  choiceOneName.textContent = 'Čeka izbor';
  choiceTwoName.textContent = 'Čeka izbor';
  moveButtons.forEach(button => { button.disabled = false; });
  newGameButton.textContent = tournamentMode ? 'Novi turnir' : 'Nova igra';
}

// === Povezivanje dugmadi sa logikom igre ===
// Callback dugmeta režima prenosi njegov data-mode vrednost u startGame.
modeButtons.forEach(button => {
  // Svako dugme režima pokreće igru sa odgovarajućim data-mode vrednostima.
  // Click callback prenosi režim dugmeta u zajedničku funkciju startGame().
  button.addEventListener('click', () => startGame(button.dataset.mode));
});

// Callback poteza prosleđuje izabrani kamen, papir ili makaze u play().
moveButtons.forEach(button => {
  button.addEventListener('click', () => play(button.dataset.move));
});

// Dugme nove igre resetuje skor, a dugme promene režima vraća prethodni ekran.
// Click callback resetuje trenutni meč.
newGameButton.addEventListener('click', resetGame);
// Click callback napušta meč i vraća ekran za izbor režima.
changeModeButton.addEventListener('click', () => {
  gameMode = '';
  tournamentMode = false;
  moveButtons.forEach(button => { button.disabled = false; });
  gameScreen.hidden = true;
  modeScreen.hidden = false;
});
