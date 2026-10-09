// Osnovne dimenzije i bodovne vrednosti Tetris table.
const columns = 10;
const rows = 20;
const cellSize = 30;
const targetScore = 5000;
const linePoints = [0, 100, 300, 500, 800];
const levelDelays = [650, 520, 410, 310, 220];
const shapes = {
  I: [[1, 0], [1, 1], [1, 2], [1, 3]],
  O: [[0, 1], [0, 2], [1, 1], [1, 2]],
  T: [[0, 1], [1, 0], [1, 1], [1, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]]
};
const colors = {
  I: '#38bdf8', O: '#facc15', T: '#c084fc', S: '#4ade80',
  Z: '#fb7185', J: '#60a5fa', L: '#fb923c'
};
const boardCanvas = document.querySelector('#board');
const boardContext = boardCanvas.getContext('2d');
const previewCanvas = document.querySelector('#preview');
const previewContext = previewCanvas.getContext('2d');
const query = new URLSearchParams(window.location.search);
let playerName = query.get('player1')?.trim() || 'Gost';
let startingLevel = 1;
let gameStarted = false;
const setupForm = document.querySelector('#setup-form');
const playerInput = document.querySelector('#tetris-player');
const gameContent = document.querySelector('#game-content');
const resultActions = document.querySelector('#result-actions');
const playAgainButton = document.querySelector('#play-again');
const gamesMenuLink = document.querySelector('#games-menu-link');
const playerLabel = document.querySelector('#player-name');
const backLink = document.querySelector('.back-link');
const scoreLabel = document.querySelector('#score');
const linesLabel = document.querySelector('#lines');
const levelLabel = document.querySelector('#level');
const targetLabel = document.querySelector('#target');
const statusLabel = document.querySelector('#status');
const returnParams = new URLSearchParams(query);
playerLabel.textContent = `Igrač: ${playerName}`;
backLink.href = `../../mini-games/index.html${returnParams.size ? `?${returnParams}` : ''}`;
gamesMenuLink.href = backLink.href;

// Stanje partije: zaključana polja, figura koja pada, rezultat i nivo.
let board;
let activePiece;
let nextShape;
let score;
let clearedLines;
let level;
let gameOver;
let softDrop;
let tickTimer;

// Napravi novu tablu i izaberi nasumičnu figuru.
function resetGame() {
  window.clearTimeout(tickTimer);
  board = Array.from({ length: rows }, () => Array(columns).fill(null));
  score = 0;
  clearedLines = 0;
  level = startingLevel;
  gameOver = false;
  softDrop = false;
  nextShape = randomKind();
  statusLabel.textContent = '';
  statusLabel.style.color = '#4ade80';
  updateStats();
  spawnPiece();
  drawBoard();
  scheduleTick();
}

// Izaberi nasumičan tip tetromina.
function randomKind() {
  const kinds = Object.keys(shapes);
  return kinds[Math.floor(Math.random() * kinds.length)];
}

// Pojavi sledeću figuru na vrhu table i osveži pregled.
function spawnPiece() {
  const kind = nextShape;
  nextShape = randomKind();
  activePiece = { kind, cells: shapes[kind].map(cell => [...cell]), row: 0, column: 3 };
  drawPreview();
  if (!fits(activePiece.row, activePiece.column, activePiece.cells)) endGame();
}

// Proveri granice table i sudar sa već postavljenim poljima.
function fits(row, column, cells) {
  return cells.every(([cellRow, cellColumn]) => {
    const boardRow = row + cellRow;
    const boardColumn = column + cellColumn;
    return boardColumn >= 0 && boardColumn < columns && boardRow < rows &&
      (boardRow < 0 || !board[boardRow][boardColumn]);
  });
}

// Pomeri aktivnu figuru ako joj put nije blokiran.
function move(rowDelta, columnDelta) {
  if (gameOver || !activePiece) return false;
  const nextRow = activePiece.row + rowDelta;
  const nextColumn = activePiece.column + columnDelta;
  if (!fits(nextRow, nextColumn, activePiece.cells)) return false;
  activePiece.row = nextRow;
  activePiece.column = nextColumn;
  drawBoard();
  return true;
}

// Rotiraj figuru za 90 stepeni kada nova orijentacija staje.
function rotate() {
  if (gameOver || !activePiece) return;
  const turned = activePiece.cells.map(([row, column]) => [column, 3 - row]);
  const minRow = Math.min(...turned.map(([row]) => row));
  const minColumn = Math.min(...turned.map(([, column]) => column));
  const normalized = turned.map(([row, column]) => [row - minRow, column - minColumn]);
  if (fits(activePiece.row, activePiece.column, normalized)) {
    activePiece.cells = normalized;
    drawBoard();
  }
}

// Zaključaj figuru, ukloni pune redove, dodeli skor i proveri pobedu.
function lockPiece() {
  for (const [cellRow, cellColumn] of activePiece.cells) {
    const row = activePiece.row + cellRow;
    const column = activePiece.column + cellColumn;
    if (row < 0) return endGame();
    board[row][column] = colors[activePiece.kind];
  }

  const remaining = board.filter(row => !row.every(Boolean));
  const justCleared = rows - remaining.length;
  if (justCleared) {
    board = [...Array.from({ length: justCleared }, () => Array(columns).fill(null)), ...remaining];
    score += linePoints[justCleared] * level;
    clearedLines += justCleared;
    level = Math.max(startingLevel, Math.min(5, Math.floor(score / 1000) + 1));
    updateStats();
  }

  if (score >= targetScore) return winGame();
  spawnPiece();
  drawBoard();
}

// Ažuriraj prikaz skora, nivoa i sledećeg praga.
function updateStats() {
  scoreLabel.textContent = `${score} / ${targetScore}`;
  linesLabel.textContent = String(clearedLines);
  levelLabel.textContent = `${level} / 5`;
  targetLabel.textContent = level < 5 ? `Sledeći nivo: ${level * 1000}` : `Cilj za pobedu: ${targetScore}`;
}

// Zakaži sledeće automatsko spuštanje prema izabranom nivou.
function scheduleTick() {
  if (gameOver) return;
  tickTimer = window.setTimeout(() => {
    if (!move(1, 0)) lockPiece();
    if (!gameOver) scheduleTick();
  }, softDrop ? 45 : levelDelays[level - 1]);
}

// Oboj jedno polje na canvasu.
function drawCell(context, column, row, color, size = cellSize) {
  context.fillStyle = color;
  context.fillRect(column * size + 1, row * size + 1, size - 2, size - 2);
  context.strokeStyle = '#10131d';
  context.lineWidth = 2;
  context.strokeRect(column * size + 1, row * size + 1, size - 2, size - 2);
}

// Iscrtaj tablu, mrežu, postavljene figure i figuru u padu.
function drawBoard() {
  boardContext.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  board.forEach((row, rowIndex) => row.forEach((color, column) => {
    if (color) drawCell(boardContext, column, rowIndex, color);
  }));
  boardContext.strokeStyle = '#30394f';
  boardContext.lineWidth = 1;
  for (let row = 0; row <= rows; row++) {
    boardContext.beginPath(); boardContext.moveTo(0, row * cellSize); boardContext.lineTo(columns * cellSize, row * cellSize); boardContext.stroke();
  }
  for (let column = 0; column <= columns; column++) {
    boardContext.beginPath(); boardContext.moveTo(column * cellSize, 0); boardContext.lineTo(column * cellSize, rows * cellSize); boardContext.stroke();
  }
  if (activePiece) activePiece.cells.forEach(([row, column]) => drawCell(
    boardContext, activePiece.column + column, activePiece.row + row, colors[activePiece.kind]
  ));
}

// Prikaži sledeću figuru u malom canvas pregledu.
function drawPreview() {
  previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  const cells = shapes[nextShape];
  const minRow = Math.min(...cells.map(([row]) => row));
  const minColumn = Math.min(...cells.map(([, column]) => column));
  cells.forEach(([row, column]) => {
    previewContext.fillStyle = colors[nextShape];
    previewContext.fillRect((column - minColumn) * 24 + 28, (row - minRow) * 24 + 12, 22, 22);
  });
}

// Zaustavi tajmer i prikaži čestitku za osvojenih 5000 poena.
function winGame() {
  gameOver = true;
  window.clearTimeout(tickTimer);
  statusLabel.style.color = '#4ade80';
  statusLabel.textContent = `Čestitamo, ${playerName}! Pobeda sa ${score} poena! Pritisni R za novu igru.`;
  drawBoard();
}

// Zaustavi igru kada se više ne može pojaviti nova figura.
function endGame() {
  gameOver = true;
  window.clearTimeout(tickTimer);
  statusLabel.style.color = '#fb7185';
  statusLabel.textContent = `Kraj igre, ${playerName}. Skor: ${score}. Pritisni R za novu igru.`;
  drawBoard();
}

// Tastatura upravlja pomeranjem, ubrzanjem i ponovnim pokretanjem.
document.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
  if (event.key === 'ArrowLeft') move(0, -1);
  else if (event.key === 'ArrowRight') move(0, 1);
  else if (event.key.toLowerCase() === 'r' && gameStarted) resetGame();
  else if (event.key === ' ' && gameStarted && !softDrop && !gameOver) {
    softDrop = true;
    window.clearTimeout(tickTimer);
    scheduleTick();
  }
});

// Pusti ubrzani pad čim se razmaknica otpusti.
document.addEventListener('keyup', event => {
  if (event.key === ' ' && softDrop) {
    softDrop = false;
    window.clearTimeout(tickTimer);
    scheduleTick();
  }
});

// Klik na tablu rotira figuru; klik na strelice koristi i dodirne kontrole.
boardCanvas.addEventListener('click', rotate);
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.action === 'left') move(0, -1);
    if (button.dataset.action === 'right') move(0, 1);
    if (button.dataset.action === 'rotate') rotate();
    if (button.dataset.action === 'drop') move(1, 0);
  });
});

// Pokreni novu partiju zadržavajući isto ime i izabrani nivo.
playAgainButton.addEventListener('click', resetGame);

// Zapocni partiju tek nakon potvrde imena i izabranog pocetnog nivoa.
playerInput.value = playerName;
setupForm.addEventListener('submit', event => {
  event.preventDefault();
  playerName = playerInput.value.trim() || 'Gost';
  startingLevel = Number(setupForm.elements.startLevel.value) || 1;
  playerLabel.textContent = `Igrač: ${playerName}`;
  setupForm.hidden = true;
  gameContent.hidden = false;
  gameStarted = true;
  resetGame();
});
