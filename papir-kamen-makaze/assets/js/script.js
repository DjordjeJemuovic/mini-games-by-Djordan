const moves = ['kamen', 'papir', 'makaze'];
const moveDetails = {
  kamen: { label: 'Kamen', icon: '✊' },
  papir: { label: 'Papir', icon: '✋' },
  makaze: { label: 'Makaze', icon: '✌️' }
};

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
if (launchParams.toString()) hubLink.href = `../mini-games/index.html?${launchParams.toString()}`;

let gameMode = '';
let tournamentMode = false;
let playerOneScore = 0;
let playerTwoScore = 0;
let pendingPlayerOneMove = '';

function showChoice(player, move) {
  const details = moveDetails[move];
  const icon = player === 1 ? choiceOneIcon : choiceTwoIcon;
  const name = player === 1 ? choiceOneName : choiceTwoName;
  icon.textContent = details.icon;
  name.textContent = details.label;
}

function hidePendingChoices() {
  choiceOneIcon.textContent = '🔒';
  choiceOneName.textContent = 'Izbor sačuvan';
  choiceTwoIcon.textContent = '❔';
  choiceTwoName.textContent = 'Čeka izbor';
}

function showChoices(one, two) {
  showChoice(1, one);
  showChoice(2, two);
}

function determineWinner(one, two) {
  if (one === two) return 0;
  if (
    (one === 'kamen' && two === 'makaze') ||
    (one === 'papir' && two === 'kamen') ||
    (one === 'makaze' && two === 'papir')
  ) return 1;
  return 2;
}

function completeRound(one, two) {
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

function play(move) {
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

function startGame(mode) {
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

function resetGame() {
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

modeButtons.forEach(button => {
  button.addEventListener('click', () => startGame(button.dataset.mode));
});

moveButtons.forEach(button => {
  button.addEventListener('click', () => play(button.dataset.move));
});

newGameButton.addEventListener('click', resetGame);
changeModeButton.addEventListener('click', () => {
  gameMode = '';
  tournamentMode = false;
  moveButtons.forEach(button => { button.disabled = false; });
  gameScreen.hidden = true;
  modeScreen.hidden = false;
});
