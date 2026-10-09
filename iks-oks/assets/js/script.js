const cells = [...document.querySelectorAll('.cell')];
const status = document.querySelector('#status');
const restart = document.querySelector('#restart');
const playAgain = document.querySelector('#play-again');
const showRecordsButton = document.querySelector('#show-records');
const backToSetupButton = document.querySelector('#back-to-setup');
const backToModesButton = document.querySelector('#back-to-modes');
const modeScreen = document.querySelector('#mode-screen');
const hubLink = document.querySelector('#hub-link');
const soloModeButton = document.querySelector('#solo-mode');
const tournamentModeButton = document.querySelector('#tournament-mode');
const terrainInputs = [...document.querySelectorAll('input[name="terrainColor"]')];
const recordsList = document.querySelector('#records-list');
const exportRecordsButton = document.querySelector('#export-records');
const importRecordsInput = document.querySelector('#import-records');
const playerForm = document.querySelector('#player-form');
const playerXInput = document.querySelector('#player-x');
const playerOInput = document.querySelector('#player-o');
const congratulations = document.querySelector('#congratulations');
const tournamentStatus = document.querySelector('#tournament-status');
const boardElement = document.querySelector('.board');
const setupScreen = document.querySelector('#setup-screen');
const gameScreen = document.querySelector('#game-screen');
const winnerScreen = document.querySelector('#winner-screen');
const recordsScreen = document.querySelector('#records-screen');
const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const RECORDS_KEY = 'iks-oks-records-v1';
const launchParams = new URLSearchParams(window.location.search);
if (launchParams.toString()) hubLink.href = `../mini-games/index.html?${launchParams.toString()}`;
let board = Array(9).fill('');
let turn = 'X';
let finished = false;
let started = false;
let playerNames = { X: '', O: '' };
let playerColors = { X: '#7dd3fc', O: '#fb7185' };
let tournamentMode = false;
let tournamentWins = { X: 0, O: 0 };
const launchedFromHub = launchParams.has('player1') && launchParams.has('player2');

function restoreHubPlayers() {
  playerXInput.value = launchParams.get('player1') || '';
  playerOInput.value = launchParams.get('player2') || '';
  if (launchParams.has('color1')) playerForm.elements.colorX.value = launchParams.get('color1');
  if (launchParams.has('color2')) playerForm.elements.colorO.value = launchParams.get('color2');
}

restoreHubPlayers();
let terrainColor = '#14213d';

function setTerrainColor(color) {
  terrainColor = color;
  boardElement.style.setProperty('--terrain-color', terrainColor);
}

function readLocalRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    return Array.isArray(records) ? records.filter(record =>
      record && typeof record.winner === 'string' && typeof record.loser === 'string' &&
      Number.isInteger(record.wins) && record.wins > 0
    ) : [];
  } catch {
    return [];
  }
}

function saveLocalRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Continue playing when browser storage is unavailable.
  }
}

function recordWin(winner, loser) {
  const records = readLocalRecords();
  const normalize = name => name.trim().toLocaleLowerCase();
  const existing = records.find(record =>
    normalize(record.winner) === normalize(winner) && normalize(record.loser) === normalize(loser)
  );
  if (existing) existing.wins += 1;
  else records.push({ winner, loser, wins: 1 });
  saveLocalRecords(records);
}

function renderRecords() {
  const records = readLocalRecords();
  records.sort((a, b) => b.wins - a.wins || a.winner.localeCompare(b.winner));
  recordsList.replaceChildren();
  if (records.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-records';
    emptyMessage.textContent = 'Još nema zabeleženih pobeda.';
    recordsList.append(emptyMessage);
    return;
  }
  const list = document.createElement('ol');
  records.forEach(record => {
    const item = document.createElement('li');
    item.innerHTML = '<span class="record-matchup"></span><strong class="record-count"></strong>';
    item.querySelector('.record-matchup').textContent = `${record.winner} je pobedio/la ${record.loser}`;
    item.querySelector('.record-count').textContent = `${record.wins} ${record.wins === 1 ? 'put' : 'puta'}`;
    list.append(item);
  });
  recordsList.append(list);
}

function updateBoardEnabled() {
  boardElement.setAttribute('aria-disabled', String(!started || finished));
  cells.forEach((cell, index) => { cell.disabled = !started || finished || Boolean(board[index]); });
}

function updateTournamentStatus() {
  tournamentStatus.hidden = !tournamentMode;
  if (!tournamentMode) return;
  tournamentStatus.textContent = `${playerNames.X}: ${tournamentWins.X}/5 pobeda · ${playerNames.O}: ${tournamentWins.O}/5 pobeda`;
}

function beginGame() {
  playerNames = {
    X: playerXInput.value.trim() || 'Igrač X',
    O: playerOInput.value.trim() || 'Igrač O'
  };
  playerColors = {
    X: playerForm.elements.colorX.value,
    O: playerForm.elements.colorO.value
  };
  tournamentWins = { X: 0, O: 0 };
  started = true;
  setupScreen.hidden = true;
  modeScreen.hidden = true;
  gameScreen.hidden = false;
  winnerScreen.hidden = true;
  status.textContent = `Na potezu je: ${playerNames[turn]} (X)`;
  updateTournamentStatus();
  updateBoardEnabled();
}

function startNextTournamentGame() {
  board = Array(9).fill('');
  turn = 'X';
  finished = false;
  started = true;
  cells.forEach(cell => { cell.textContent = ''; cell.style.color = ''; });
  status.textContent = `Na potezu je: ${playerNames.X} (X)`;
  setupScreen.hidden = true;
  winnerScreen.hidden = true;
  gameScreen.hidden = false;
  updateTournamentStatus();
  updateBoardEnabled();
}

playerForm.addEventListener('submit', event => {
  event.preventDefault();
  beginGame();
});

function play(index) {
  if (!started || finished || board[index]) return;
  board[index] = turn;
  cells[index].textContent = turn;
  cells[index].style.color = playerColors[turn];
  cells[index].disabled = true;
  const won = wins.some(line => line.every(i => board[i] === turn));
  if (won) {
    finished = true;
    const loser = turn === 'X' ? 'O' : 'X';
    recordWin(playerNames[turn], playerNames[loser]);
    status.textContent = `Pobedio/la je ${playerNames[turn]}!`;
    if (tournamentMode) {
      tournamentWins[turn] += 1;
      const tournamentWon = tournamentWins[turn] === 5;
      congratulations.textContent = tournamentWon
        ? `Čestitamo, ${playerNames[turn]}! Osvojio/la si turnir sa 5 pobeda! 🏆`
        : `Čestitamo, ${playerNames[turn]}! Rezultat: ${tournamentWins[turn]}/5 pobeda.`;
      playAgain.textContent = tournamentWon ? 'Završi turnir' : 'Sledeća partija';
    } else {
      congratulations.textContent = `Čestitamo, ${playerNames[turn]}! 🎉`;
      playAgain.textContent = 'Igraj ponovo';
    }
    updateTournamentStatus();
    gameScreen.hidden = true;
    winnerScreen.hidden = false;
  } else if (board.every(Boolean)) {
    status.textContent = 'Nerešeno!';
    finished = true;
  } else {
    turn = turn === 'X' ? 'O' : 'X';
    status.textContent = `Na potezu je: ${playerNames[turn]} (${turn})`;
  }
  updateBoardEnabled();
}

function reset() {
  board = Array(9).fill('');
  turn = 'X';
  finished = false;
  started = false;
  playerNames = { X: '', O: '' };
  playerColors = { X: '#7dd3fc', O: '#fb7185' };
  tournamentMode = false;
  tournamentWins = { X: 0, O: 0 };
  playerForm.reset();
  restoreHubPlayers();
  modeScreen.hidden = false;
  setupScreen.hidden = true;
  gameScreen.hidden = true;
  winnerScreen.hidden = true;
  recordsScreen.hidden = true;
  cells.forEach(cell => { cell.textContent = ''; cell.style.color = ''; });
  tournamentStatus.hidden = true;
  updateBoardEnabled();
}

cells.forEach((cell, index) => cell.addEventListener('click', () => play(index)));
restart.addEventListener('click', () => {
  if (tournamentMode) startNextTournamentGame();
  else reset();
});
playAgain.addEventListener('click', () => {
  if (tournamentMode && tournamentWins.X < 5 && tournamentWins.O < 5) startNextTournamentGame();
  else reset();
});
showRecordsButton.addEventListener('click', () => {
  modeScreen.hidden = true;
  recordsScreen.hidden = false;
  renderRecords();
});
backToSetupButton.addEventListener('click', () => {
  recordsScreen.hidden = true;
  modeScreen.hidden = false;
});
soloModeButton.addEventListener('click', () => {
  tournamentMode = false;
  if (launchedFromHub) {
    restoreHubPlayers();
    beginGame();
  } else {
    modeScreen.hidden = true;
    setupScreen.hidden = false;
  }
});
tournamentModeButton.addEventListener('click', () => {
  tournamentMode = true;
  tournamentWins = { X: 0, O: 0 };
  if (launchedFromHub) {
    restoreHubPlayers();
    beginGame();
  } else {
    modeScreen.hidden = true;
    setupScreen.hidden = false;
  }
});
backToModesButton.addEventListener('click', () => {
  setupScreen.hidden = true;
  modeScreen.hidden = false;
});
terrainInputs.forEach(input => {
  input.addEventListener('change', () => setTerrainColor(input.value));
});
setTerrainColor(terrainColor);
updateBoardEnabled();

exportRecordsButton.addEventListener('click', () => {
  const file = new Blob([`${JSON.stringify(readLocalRecords(), null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'records.json';
  link.click();
  URL.revokeObjectURL(url);
});

importRecordsInput.addEventListener('change', async () => {
  const file = importRecordsInput.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error('Invalid records file.');
    const records = readLocalRecords();
    imported.forEach(record => {
      if (!record || typeof record.winner !== 'string' || typeof record.loser !== 'string' ||
          !Number.isInteger(record.wins) || record.wins < 1) return;
      const normalize = name => name.trim().toLocaleLowerCase();
      const existing = records.find(entry =>
        normalize(entry.winner) === normalize(record.winner) && normalize(entry.loser) === normalize(record.loser)
      );
      if (existing) existing.wins = Math.max(existing.wins, record.wins);
      else records.push({ winner: record.winner.trim(), loser: record.loser.trim(), wins: record.wins });
    });
    saveLocalRecords(records);
    renderRecords();
  } catch {
    recordsList.textContent = 'JSON fajl nije ispravan.';
  }
  importRecordsInput.value = '';
});
