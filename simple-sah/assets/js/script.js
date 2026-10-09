// === HTML elementi i podešavanja profila ===
// Pronalazimo tablu, igrače, poruke i dugmad koja se menjaju tokom meča.
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

// === Model podataka za šahovsku partiju ===
// Tabla je 8x8 niz; figura je { color, type, moved } ili null.
// 'w' označava bele figure, 'b' crne; red 0 je vrh table, red 7 dno.
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

/** Gradi početnu 8×8 poziciju kao novi model table. */
// === Pravila šaha i legalni potezi ===
// Ovaj blok gradi poziciju, prepoznaje napade i izračunava dozvoljene poteze.
function createInitialBoard() {
  // Napravi početni raspored i zabeleži da se nijedna figura još nije pomerila.
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

/** Vraća da li su red i kolona validne koordinate table. */
function inBounds(row, column) {
  // Proveri da li koordinate ostaju unutar osam redova i kolona.
  return row >= 0 && row < 8 && column >= 0 && column < 8;
}

/** Pravi kopiju table i objekata figura za simulaciju poteza. */
function cloneBoard(position) {
  // Kopiraj figure da simulacija poteza ne menja pravu tablu.
  return position.map(row => row.map(piece => piece ? { ...piece } : null));
}

/** Proverava da li figura boje byColor napada zadato polje. */
function isSquareAttacked(position, targetRow, targetColumn, byColor) {
  // Proveri da li data boja napada polje pešakom, skakačem, kraljem ili linijskom figurom.
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

/** Pronalazi koordinate kralja određene boje ili vraća null. */
function findKing(position, color) {
  // Pronađi koordinate kralja date boje; legalnost poteza zavisi od njegove bezbednosti.
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = position[row][column];
      if (piece?.color === color && piece.type === 'K') return { row, column };
    }
  }
  return null;
}

/** Određuje da li je kralj boje color trenutno napadnut. */
function isInCheck(position, color) {
  // Kralj je u šahu ako suprotna boja napada njegovo polje.
  const king = findKing(position, color);
  return king ? isSquareAttacked(position, king.row, king.column, color === 'w' ? 'b' : 'w') : true;
}

/** Generiše kandidate poteza figure pre provere da li ugrožavaju njenog kralja. */
function pseudoMoves(position, row, column) {
  // Generiši poteze po pravilima figure; bez završne provere sopstvenog šaha.
  const piece = position[row][column];
  if (!piece) return [];
  const moves = [];
  // Dodaje dozvoljeno odredište i javlja da li linijska figura može dalje.
  const addIfAvailable = (targetRow, targetColumn) => {
    if (!inBounds(targetRow, targetColumn)) return false;
    const target = position[targetRow][targetColumn];
    if (target?.color === piece.color || target?.type === 'K') return false;
    moves.push({ row: targetRow, column: targetColumn });
    return !target;
  };

  if (piece.type === 'P') {
    // Pešak ide napred, uzima ukoso, može prvi put da pređe dva polja i uzima en passant.
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
    // Kralj ide jedno polje; rokada proverava da li su put i kraljevska polja bezbedni.
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

  // Prati zadate pravce dok ne naiđe na ivicu table ili zauzeto polje.
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

/** Menja model table za običan potez, rokadu, en passant ili promociju pešaka. */
function applyMove(position, from, move) {
  // Primeni običan ili poseban potez na prosleđenoj tabli; pešak automatski postaje dama.
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

/** Filtrira pseudo-poteze tako da kralj figure koja igra ne ostane u šahu. */
function legalMoves(position, row, column) {
  // Odbaci svaki mogući potez koji bi ostavio sopstvenog kralja u šahu.
  const piece = position[row][column];
  if (!piece) return [];
  return pseudoMoves(position, row, column).filter(move => {
    const nextPosition = cloneBoard(position);
    applyMove(nextPosition, { row, column }, move);
    return !isInCheck(nextPosition, piece.color);
  });
}

/** Sakuplja sve legalne poteze boje radi završetka partije i poteza računara. */
function allLegalMoves(position, color) {
  // Prikupi legalne poteze svih figura boje; koristi se za šah-mat/pat i AI.
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

/** Bira potez računara heurističkim bodovanjem uzimanja, promocije i šaha. */
// === Izbor poteza računara ===
// AI rangira legalne poteze jednostavnim heuristikama i bira najbolje ocenjen.
function chooseComputerMove() {
  // Jednostavan AI: daje prednost uzimanju figura, promociji i davanju šaha.
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

/** Vraća ime igrača vezano za boju figure. */
// === Tajmer, poruke poteza i uslovi završetka ===
// Ove funkcije upravljaju satom, šahom/matom i materijalnim poređenjem.
function playerName(color) {
  // Poveži boju figure sa imenom koje se prikazuje oko table.
  return color === 'w' ? whitePlayerName.textContent : blackPlayerName.textContent;
}

/** Formatira ceo broj sekundi kao tekst MM:SS. */
function formatTime(seconds) {
  // Pretvori sekunde u prikaz MM:SS.
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

/** Osvežava tekst tajmera i oznaku upozorenja za poslednji minut. */
function updateTimerDisplay() {
  timerElement.textContent = formatTime(timeRemaining);
  timerElement.classList.toggle('low-time', timeRemaining <= 60);
}

/** Zaustavlja aktivni interval tajmera ako postoji. */
function stopTimer() {
  // Zaustavi interval kako ne bi ostao aktivan posle meča ili promene režima.
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

/** Sabira materijalnu vrednost živih figura izabrane boje. */
function remainingMaterial(color) {
  // Izračunaj materijalnu vrednost figura, kojom se odlučuje pobednik na vremenu.
  const values = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  return board.flat().reduce((total, piece) => total + (piece?.color === color ? values[piece.type] : 0), 0);
}

/** Završava partiju istekom vremena i poredi materijal igrača. */
function finishOnTime() {
  // Zaustavi meč na 15 minuta i uporedi vrednosti preostalih figura.
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

/** Pokreće partiju sa tajmerom od 15 minuta i proverava svaku sekundu. */
function startTimer() {
  // Pokreni odbrojavanje od 15 minuta i završi partiju kada stigne do nule.
  stopTimer();
  timeRemaining = 15 * 60;
  updateTimerDisplay();
  // Interval callback smanjuje vreme i završava partiju na nuli.
  timerInterval = window.setInterval(() => {
    timeRemaining -= 1;
    updateTimerDisplay();
    if (timeRemaining <= 0) finishOnTime();
  }, 1000);
}

/** Osvežava aktivnog igrača i poruku o potezu, šahu, matu ili patu. */
function updateTurnStatus() {
  // Obeleži igrača na potezu i prepoznaj šah-mat ili pat.
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

/** Pretvara koordinate niza u šahovsku notaciju, na primer e4. */
function coordinateLabel(row, column) {
  return `${files[column]}${8 - row}`;
}

/** Preslikava model table u DOM i ažurira oznake za polja i figure. */
// === Prikaz modela table i pojedenih figura ===
// Ovde se stanje JavaScript table pretvara u simbole i klase na HTML poljima.
function renderBoard() {
  // Preslikaj model table u dugmad i primeni oznake poteza/šaha za prikaz.
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

/** Prikazuje uzete figure kod igrača koji ih je osvojio. */
function renderCapturedPieces() {
  // Prikaži sitne simbole pojedenih figura iznad igrača koji ih je uzeo.
  // Povezuje listu uzetih figura jedne boje sa odgovarajućim HTML elementom.
  const renderFor = (color, element) => {
    element.textContent = capturedPieces[color].map(piece => pieceSymbols[piece.color][piece.type]).join(' ');
    element.setAttribute('aria-label', `Pojedene figure: ${capturedPieces[color].length}`);
  };
  renderFor('w', whiteCapturesElement);
  renderFor('b', blackCapturesElement);
}

/** Primeni potez na pravoj tabli, promeni stranu na potezu i odgovori AI-jem. */
// === Obrada poteza i klikova ===
// Ovaj blok primenjuje poteze, menja stranu na potezu i obrađuje interakciju.
function finishMove(from, move) {
  // Ažuriraj uzimanje, specijalan potez, red na potezu i prikaz; po potrebi pozovi AI.
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
    // Odloži AI potez kratko radi prikaza poruke, uz zaštitu od zastarele partije.
    window.setTimeout(() => {
      if (currentGame !== gameSerial || gameOver) return;
      const computerMove = chooseComputerMove();
      aiThinking = false;
      if (computerMove) finishMove(computerMove.from, computerMove.move);
    }, 450);
  }
}

/** Obradi izbor polja: bira figuru ili odigrava izabrani legalni potez. */
function handleSquareClick(row, column) {
  // Prvi klik bira svoju figuru; sledeći klik bira legalno odredišno polje.
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

/** Kreira 64 klikabilna dugmeta table i sačuva ih po koordinatama. */
// === Kreiranje elemenata i pokretanje partije ===
// Tablu pravimo jednom; nova partija ponovo koristi ista polja.
function createBoardElements() {
  // Jednom napravi 64 klikabilna polja i poveži svako sa koordinatama table.
  for (let row = 0; row < 8; row += 1) {
    const rowElements = [];
    for (let column = 0; column < 8; column += 1) {
      const square = document.createElement('button');
      square.type = 'button';
      square.className = `square ${(row + column) % 2 === 0 ? 'light-square' : 'dark-square'}`;
      square.setAttribute('role', 'gridcell');
      // Click callback veže svako dugme za njegove red/kolona koordinate.
      square.addEventListener('click', () => handleSquareClick(row, column));
      boardElement.append(square);
      rowElements.push(square);
    }
    squareElements.push(rowElements);
  }
}

/** Očisti tajmer i promenljive partije pa iscrta novu početnu poziciju. */
function newGame() {
  // Resetuj sat i sve stanje partije, pa iscrtaj novu početnu poziciju.
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

// Callback pokreće novu poziciju i resetuje tajmer.
newGameButton.addEventListener('click', () => {
  newGame();
  startTimer();
});
// Callback-i izbora režima pokreću igru za dva čoveka ili protiv računara.
twoPlayerModeButton.addEventListener('click', () => startGame('pvp'));
computerModeButton.addEventListener('click', () => startGame('computer'));
// Callback za promenu režima zaustavlja tajmer i odbacuje zakašnjeli AI potez.
changeModeButton.addEventListener('click', () => {
  stopTimer();
  gameSerial += 1;
  aiThinking = false;
  gameScreen.hidden = true;
  modeScreen.hidden = false;
});

// Izabrani režim određuje protivnika, imena i uputstvo pre početka partije.
/** Postavlja imena, boje i poruku prema režimu, pa započinje novu partiju. */
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
