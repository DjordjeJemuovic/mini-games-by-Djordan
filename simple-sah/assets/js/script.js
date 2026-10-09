const boardElement = document.querySelector('#board');
const statusElement = document.querySelector('#status');
const timerElement = document.querySelector('#timer');
const newGameButton = document.querySelector('#new-game');
const whitePlayerCard = document.querySelector('#white-player');
const blackPlayerCard = document.querySelector('#black-player');
const whitePlayerName = document.querySelector('#white-player-name');
const blackPlayerName = document.querySelector('#black-player-name');
const whiteCapturesElement = document.querySelector('#white-captures');
const blackCapturesElement = document.querySelector('#black-captures');
const hubLink = document.querySelector('#hub-link');
const modeScreen = document.querySelector('#mode-screen');
const gameScreen = document.querySelector('#game-screen');
const twoPlayerModeButton = document.querySelector('#two-player-mode');
const computerModeButton = document.querySelector('#computer-mode');
const changeModeButton = document.querySelector('#change-mode');
const gameInstructions = document.querySelector('#game-instructions');
const launchParams = new URLSearchParams(window.location.search);
const pieceSymbols = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
};
const pieceNames = { K: 'kralj', Q: 'dama', R: 'top', B: 'lovac', N: 'skakač', P: 'pešak' };
const files = 'abcdefgh';

if (launchParams.toString()) hubLink.href = `../mini-games/index.html?${launchParams.toString()}`;

const hubWhiteName = launchParams.get('player1')?.trim();
const hubBlackName = launchParams.get('player2')?.trim();
whitePlayerName.textContent = hubWhiteName || 'Igrač 1';
blackPlayerName.textContent = hubBlackName || 'Igrač 2';
const validColor = color => /^#[\da-f]{6}$/i.test(color || '') ? color : '';
whitePlayerCard.style.setProperty('--player-accent', validColor(launchParams.get('color1')) || '#7dd3fc');
blackPlayerCard.style.setProperty('--player-accent', validColor(launchParams.get('color2')) || '#fb7185');

let board = [];
let turn = 'w';
let selectedSquare = null;
let selectedMoves = [];
let lastMove = null;
let gameOver = false;
let capturedPieces = { w: [], b: [] };
let gameMode = 'pvp';
let aiThinking = false;
let gameSerial = 0;
let timeRemaining = 15 * 60;
let timerInterval = null;
const squareElements = [];

function createInitialBoard() {
  const position = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let column = 0; column < 8; column += 1) {
    position[0][column] = { color: 'b', type: backRank[column], moved: false };
    position[1][column] = { color: 'b', type: 'P', moved: false };
    position[6][column] = { color: 'w', type: 'P', moved: false };
    position[7][column] = { color: 'w', type: backRank[column], moved: false };
  }
  return position;
}

function inBounds(row, column) {
  return row >= 0 && row < 8 && column >= 0 && column < 8;
}

function cloneBoard(position) {
  return position.map(row => row.map(piece => piece ? { ...piece } : null));
}

function isSquareAttacked(position, targetRow, targetColumn, byColor) {
  const pawnDirection = byColor === 'w' ? -1 : 1;
  const pawnSourceRow = targetRow - pawnDirection;
  for (const deltaColumn of [-1, 1]) {
    const sourceColumn = targetColumn + deltaColumn;
    if (inBounds(pawnSourceRow, sourceColumn)) {
      const piece = position[pawnSourceRow][sourceColumn];
      if (piece?.color === byColor && piece.type === 'P') return true;
    }
  }

  const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightOffsets) {
    const row = targetRow + dr;
    const column = targetColumn + dc;
    if (inBounds(row, column)) {
      const piece = position[row][column];
      if (piece?.color === byColor && piece.type === 'N') return true;
    }
  }

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const row = targetRow + dr;
      const column = targetColumn + dc;
      if (inBounds(row, column)) {
        const piece = position[row][column];
        if (piece?.color === byColor && piece.type === 'K') return true;
      }
    }
  }

  const directions = [
    [-1,0,'RQ'], [1,0,'RQ'], [0,-1,'RQ'], [0,1,'RQ'],
    [-1,-1,'BQ'], [-1,1,'BQ'], [1,-1,'BQ'], [1,1,'BQ']
  ];
  for (const [dr, dc, attackers] of directions) {
    let row = targetRow + dr;
    let column = targetColumn + dc;
    while (inBounds(row, column)) {
      const piece = position[row][column];
      if (piece) {
        if (piece.color === byColor && attackers.includes(piece.type)) return true;
        break;
      }
      row += dr;
      column += dc;
    }
  }
  return false;
}

function findKing(position, color) {
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = position[row][column];
      if (piece?.color === color && piece.type === 'K') return { row, column };
    }
  }
  return null;
}

function isInCheck(position, color) {
  const king = findKing(position, color);
  return king ? isSquareAttacked(position, king.row, king.column, color === 'w' ? 'b' : 'w') : true;
}

function pseudoMoves(position, row, column) {
  const piece = position[row][column];
  if (!piece) return [];
  const moves = [];
  const addIfAvailable = (targetRow, targetColumn) => {
    if (!inBounds(targetRow, targetColumn)) return false;
    const target = position[targetRow][targetColumn];
    if (target?.color === piece.color || target?.type === 'K') return false;
    moves.push({ row: targetRow, column: targetColumn });
    return !target;
  };

  if (piece.type === 'P') {
    const direction = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const nextRow = row + direction;
    if (inBounds(nextRow, column) && !position[nextRow][column]) {
      moves.push({ row: nextRow, column });
      const twoStepsRow = row + direction * 2;
      if (row === startRow && !position[twoStepsRow][column]) moves.push({ row: twoStepsRow, column });
    }
    for (const deltaColumn of [-1, 1]) {
      const targetColumn = column + deltaColumn;
      if (!inBounds(nextRow, targetColumn)) continue;
      const target = position[nextRow][targetColumn];
      if (target && target.color !== piece.color && target.type !== 'K') {
        moves.push({ row: nextRow, column: targetColumn });
      } else if (
        lastMove?.piece.type === 'P' &&
        Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
        lastMove.to.row === row && lastMove.to.column === targetColumn
      ) {
        moves.push({ row: nextRow, column: targetColumn, enPassant: true });
      }
    }
  }

  if (piece.type === 'N') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      addIfAvailable(row + dr, column + dc);
    }
  }

  if (piece.type === 'K') {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr !== 0 || dc !== 0) addIfAvailable(row + dr, column + dc);
      }
    }
    if (!piece.moved && !isInCheck(position, piece.color)) {
      const homeRow = piece.color === 'w' ? 7 : 0;
      for (const side of ['king', 'queen']) {
        const rookColumn = side === 'king' ? 7 : 0;
        const rook = position[homeRow][rookColumn];
        if (row !== homeRow || column !== 4 || !rook || rook.type !== 'R' || rook.color !== piece.color || rook.moved) continue;
        const pathColumns = side === 'king' ? [5, 6] : [3, 2, 1];
        if (pathColumns.some(pathColumn => position[homeRow][pathColumn])) continue;
        const kingPath = side === 'king' ? [5, 6] : [3, 2];
        const enemyColor = piece.color === 'w' ? 'b' : 'w';
        const crossesAttack = kingPath.some(pathColumn => {
          const transitPosition = cloneBoard(position);
          transitPosition[homeRow][column] = null;
          transitPosition[homeRow][pathColumn] = { ...piece };
          return isSquareAttacked(transitPosition, homeRow, pathColumn, enemyColor);
        });
        if (crossesAttack) continue;
        moves.push({ row: homeRow, column: side === 'king' ? 6 : 2, castle: side });
      }
    }
  }

  const slide = (directions) => {
    for (const [dr, dc] of directions) {
      let targetRow = row + dr;
      let targetColumn = column + dc;
      while (addIfAvailable(targetRow, targetColumn)) {
        targetRow += dr;
        targetColumn += dc;
      }
    }
  };
  if (piece.type === 'B' || piece.type === 'Q') slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  if (piece.type === 'R' || piece.type === 'Q') slide([[-1,0],[1,0],[0,-1],[0,1]]);
  return moves;
}

function applyMove(position, from, move) {
  const piece = position[from.row][from.column];
  position[from.row][from.column] = null;
  if (move.enPassant) position[from.row][move.column] = null;
  if (move.castle) {
    const rookColumn = move.castle === 'king' ? 7 : 0;
    const rookTargetColumn = move.castle === 'king' ? 5 : 3;
    const rook = position[from.row][rookColumn];
    position[from.row][rookColumn] = null;
    position[from.row][rookTargetColumn] = { ...rook, moved: true };
  }
  const promoted = piece.type === 'P' && (move.row === 0 || move.row === 7);
  position[move.row][move.column] = { ...piece, type: promoted ? 'Q' : piece.type, moved: true };
}

function legalMoves(position, row, column) {
  const piece = position[row][column];
  if (!piece) return [];
  return pseudoMoves(position, row, column).filter(move => {
    const nextPosition = cloneBoard(position);
    applyMove(nextPosition, { row, column }, move);
    return !isInCheck(nextPosition, piece.color);
  });
}

function allLegalMoves(position, color) {
  const availableMoves = [];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (position[row][column]?.color === color) {
        availableMoves.push(...legalMoves(position, row, column));
      }
    }
  }
  return availableMoves;
}

function chooseComputerMove() {
  const candidates = [];
  const pieceValues = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (board[row][column]?.color !== 'b') continue;
      for (const move of legalMoves(board, row, column)) {
        const captured = move.enPassant ? board[row][move.column] : board[move.row][move.column];
        const nextPosition = cloneBoard(board);
        const movingPiece = nextPosition[row][column];
        applyMove(nextPosition, { row, column }, move);
        let score = Math.random() * 0.4;
        if (captured) score += pieceValues[captured.type] * 10;
        if (movingPiece.type === 'P' && move.row === 7) score += 10;
        if (isInCheck(nextPosition, 'w')) {
          score += allLegalMoves(nextPosition, 'w').length === 0 ? 100 : 4;
        }
        candidates.push({ from: { row, column }, move, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function playerName(color) {
  return color === 'w' ? whitePlayerName.textContent : blackPlayerName.textContent;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  timerElement.textContent = formatTime(timeRemaining);
  timerElement.classList.toggle('low-time', timeRemaining <= 60);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function remainingMaterial(color) {
  const values = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  return board.flat().reduce((total, piece) => total + (piece?.color === color ? values[piece.type] : 0), 0);
}

function finishOnTime() {
  stopTimer();
  gameOver = true;
  aiThinking = false;
  gameSerial += 1;
  selectedSquare = null;
  selectedMoves = [];
  timeRemaining = 0;
  updateTimerDisplay();
  const whiteMaterial = remainingMaterial('w');
  const blackMaterial = remainingMaterial('b');
  whitePlayerCard.classList.remove('active');
  blackPlayerCard.classList.remove('active');
  if (whiteMaterial === blackMaterial) {
    statusElement.textContent = `Vreme je isteklo! Materijal je izjednačen (${whiteMaterial}:${blackMaterial}); partija je nerešena.`;
  } else {
    const winner = whiteMaterial > blackMaterial ? 'w' : 'b';
    statusElement.textContent = `Vreme je isteklo! ${playerName(winner)} pobeđuje sa više figura (${whiteMaterial}:${blackMaterial}).`;
  }
  renderBoard();
}

function startTimer() {
  stopTimer();
  timeRemaining = 15 * 60;
  updateTimerDisplay();
  timerInterval = window.setInterval(() => {
    timeRemaining -= 1;
    updateTimerDisplay();
    if (timeRemaining <= 0) finishOnTime();
  }, 1000);
}

function updateTurnStatus() {
  const checked = isInCheck(board, turn);
  const movesAvailable = allLegalMoves(board, turn).length > 0;
  whitePlayerCard.classList.toggle('active', turn === 'w' && !gameOver);
  blackPlayerCard.classList.toggle('active', turn === 'b' && !gameOver);

  if (!movesAvailable) {
    gameOver = true;
    stopTimer();
    whitePlayerCard.classList.remove('active');
    blackPlayerCard.classList.remove('active');
    statusElement.textContent = checked
      ? `Šah-mat! ${playerName(turn === 'w' ? 'b' : 'w')} pobeđuje.`
      : 'Pat! Partija je nerešena.';
  } else if (checked) {
    statusElement.textContent = `Šah! Na potezu je ${playerName(turn)}.`;
  } else {
    statusElement.textContent = `Na potezu je ${playerName(turn)}.`;
  }
}

function coordinateLabel(row, column) {
  return `${files[column]}${8 - row}`;
}

function renderBoard() {
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const square = squareElements[row][column];
      const piece = board[row][column];
      square.classList.toggle('selected', selectedSquare?.row === row && selectedSquare?.column === column);
      square.classList.toggle('last-move', Boolean(lastMove && (
        (lastMove.from.row === row && lastMove.from.column === column) ||
        (lastMove.to.row === row && lastMove.to.column === column)
      )));
      square.classList.toggle('in-check', Boolean(piece?.type === 'K' && piece.color === turn && isInCheck(board, turn)));
      square.classList.toggle('possible-move', selectedMoves.some(move => move.row === row && move.column === column && !board[row][column]));
      square.classList.toggle('possible-capture', selectedMoves.some(move => move.row === row && move.column === column && board[row][column]));
      square.disabled = gameOver || aiThinking;
      square.setAttribute('aria-label', piece
        ? `${coordinateLabel(row, column)}, ${piece.color === 'w' ? 'beli' : 'crni'} ${pieceNames[piece.type]}`
        : `${coordinateLabel(row, column)}, prazno polje`);
      square.replaceChildren();
      if (piece) {
        const symbol = document.createElement('span');
        symbol.className = `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`;
        symbol.textContent = pieceSymbols[piece.color][piece.type];
        symbol.setAttribute('aria-hidden', 'true');
        square.append(symbol);
      }
    }
  }
}

function renderCapturedPieces() {
  const renderFor = (color, element) => {
    element.textContent = capturedPieces[color].map(piece => pieceSymbols[piece.color][piece.type]).join(' ');
    element.setAttribute('aria-label', `Pojedene figure: ${capturedPieces[color].length}`);
  };
  renderFor('w', whiteCapturesElement);
  renderFor('b', blackCapturesElement);
}

function finishMove(from, move) {
  const movedPiece = board[from.row][from.column];
  const capturedPiece = move.enPassant ? board[from.row][move.column] : board[move.row][move.column];
  if (capturedPiece) capturedPieces[movedPiece.color].push({ ...capturedPiece });
  applyMove(board, from, move);
  lastMove = {
    from,
    to: { row: move.row, column: move.column },
    piece: { ...movedPiece }
  };
  turn = turn === 'w' ? 'b' : 'w';
  selectedSquare = null;
  selectedMoves = [];
  updateTurnStatus();
  renderBoard();
  renderCapturedPieces();
  if (gameMode === 'computer' && turn === 'b' && !gameOver) {
    aiThinking = true;
    statusElement.textContent = 'Računar razmišlja…';
    renderBoard();
    const currentGame = gameSerial;
    window.setTimeout(() => {
      if (currentGame !== gameSerial || gameOver) return;
      const computerMove = chooseComputerMove();
      aiThinking = false;
      if (computerMove) finishMove(computerMove.from, computerMove.move);
    }, 450);
  }
}

function handleSquareClick(row, column) {
  if (gameOver || aiThinking || (gameMode === 'computer' && turn === 'b')) return;
  const clickedMove = selectedMoves.find(move => move.row === row && move.column === column);
  if (selectedSquare && clickedMove) {
    finishMove(selectedSquare, clickedMove);
    return;
  }

  const piece = board[row][column];
  if (piece?.color === turn) {
    selectedSquare = { row, column };
    selectedMoves = legalMoves(board, row, column);
  } else {
    selectedSquare = null;
    selectedMoves = [];
  }
  renderBoard();
}

function createBoardElements() {
  for (let row = 0; row < 8; row += 1) {
    const rowElements = [];
    for (let column = 0; column < 8; column += 1) {
      const square = document.createElement('button');
      square.type = 'button';
      square.className = `square ${(row + column) % 2 === 0 ? 'light-square' : 'dark-square'}`;
      square.setAttribute('role', 'gridcell');
      square.addEventListener('click', () => handleSquareClick(row, column));
      boardElement.append(square);
      rowElements.push(square);
    }
    squareElements.push(rowElements);
  }
}

function newGame() {
  stopTimer();
  gameSerial += 1;
  board = createInitialBoard();
  turn = 'w';
  selectedSquare = null;
  selectedMoves = [];
  lastMove = null;
  gameOver = false;
  aiThinking = false;
  timeRemaining = 15 * 60;
  updateTimerDisplay();
  capturedPieces = { w: [], b: [] };
  updateTurnStatus();
  renderBoard();
  renderCapturedPieces();
}

newGameButton.addEventListener('click', () => {
  newGame();
  startTimer();
});
twoPlayerModeButton.addEventListener('click', () => startGame('pvp'));
computerModeButton.addEventListener('click', () => startGame('computer'));
changeModeButton.addEventListener('click', () => {
  stopTimer();
  gameSerial += 1;
  aiThinking = false;
  gameScreen.hidden = true;
  modeScreen.hidden = false;
});

function startGame(mode) {
  gameMode = mode;
  whitePlayerName.textContent = hubWhiteName || 'Igrač 1';
  blackPlayerName.textContent = mode === 'computer' ? 'Računar' : hubBlackName || 'Igrač 2';
  blackPlayerCard.style.setProperty('--player-accent', mode === 'computer' ? '#fb7185' : validColor(launchParams.get('color2')) || '#fb7185');
  gameInstructions.textContent = mode === 'computer'
    ? 'Igraj belima protiv računara koji igra crnima.'
    : 'Igrajte jedan protiv drugog na istom uređaju.';
  modeScreen.hidden = true;
  gameScreen.hidden = false;
  newGame();
  startTimer();
}

createBoardElements();
newGame();
