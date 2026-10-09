const params = new URLSearchParams(window.location.search);
const playerOne = params.get('player1')?.trim() || 'Igrač 1';
const playerTwo = params.get('player2')?.trim() || 'Igrač 2';
const colorOne = params.get('color1') || '#7dd3fc';
const colorTwo = params.get('color2') || '#fb7185';
const maxMistakes = 6;
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZČĆŠŽĐ'];

const screens = {
  setup: document.querySelector('#setup-screen'),
  handoff: document.querySelector('#handoff-screen'),
  game: document.querySelector('#game-screen'),
  result: document.querySelector('#result-screen')
};
const form = document.querySelector('#setup-form');
const clueInput = document.querySelector('#clue');
const secretInput = document.querySelector('#secret-word');
const canvas = document.querySelector('#hangman');
const context = canvas.getContext('2d');
let secret = '';
let clue = '';
let guessed = new Set();
let mistakes = 0;
const score = { one: 0, two: 0 };

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => { screen.hidden = key !== name; });
}

function displayWord() {
  document.querySelector('#word-display').textContent = [...secret]
    .map(char => /[\p{L}\p{N}]/u.test(char) ? (guessed.has(char) ? char : '_') : char)
    .join(' ');
}

function drawHangman() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.strokeStyle = '#aeb8d0';
  context.beginPath();
  context.moveTo(35, 250); context.lineTo(190, 250);
  context.moveTo(75, 250); context.lineTo(75, 35); context.lineTo(185, 35); context.lineTo(185, 65);
  context.stroke();
  context.strokeStyle = '#fb7185';
  context.lineWidth = 4;
  const parts = [
    () => { context.beginPath(); context.arc(185, 85, 20, 0, Math.PI * 2); context.stroke(); },
    () => { context.beginPath(); context.moveTo(185, 105); context.lineTo(185, 165); context.stroke(); },
    () => { context.beginPath(); context.moveTo(185, 118); context.lineTo(155, 145); context.stroke(); },
    () => { context.beginPath(); context.moveTo(185, 118); context.lineTo(215, 145); context.stroke(); },
    () => { context.beginPath(); context.moveTo(185, 165); context.lineTo(158, 205); context.stroke(); },
    () => { context.beginPath(); context.moveTo(185, 165); context.lineTo(212, 205); context.stroke(); }
  ];
  parts.slice(0, mistakes).forEach(draw => draw());
}

function endRound(won) {
  document.querySelectorAll('#keyboard button').forEach(button => { button.disabled = true; });
  if (won) {
    score.two += 1;
    document.querySelector('#result-title').textContent = `Čestitamo, ${playerTwo}!`;
    document.querySelector('#result-message').textContent = `Pogodio/la si reč: ${secret}`;
  } else {
    score.one += 1;
    document.querySelector('#result-title').textContent = `Pobeda za ${playerOne}!`;
    document.querySelector('#result-message').textContent = `Iscrpljeno je svih šest pokušaja. Reč je bila: ${secret}`;
  }
  document.querySelector('#result-score').textContent = `Rezultat: ${playerOne} ${score.one} : ${score.two} ${playerTwo}`;
  showScreen('result');
}

function chooseLetter(letter, button) {
  if (guessed.has(letter) || mistakes >= maxMistakes) return;
  guessed.add(letter);
  button.disabled = true;
  const status = document.querySelector('#game-status');
  if (secret.includes(letter)) {
    status.textContent = `Slovo ${letter} je u reči!`;
    status.dataset.state = 'good';
  } else {
    mistakes += 1;
    status.textContent = `Slovo ${letter} nije u reči.`;
    status.dataset.state = 'bad';
  }
  document.querySelector('#mistakes-display').textContent = `Greške: ${mistakes} / ${maxMistakes}`;
  displayWord();
  drawHangman();
  const remainingLetters = [...secret].filter(char => /[\p{L}\p{N}]/u.test(char) && !guessed.has(char));
  if (!remainingLetters.length) endRound(true);
  else if (mistakes >= maxMistakes) endRound(false);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  clue = clueInput.value.trim();
  secret = secretInput.value.trim().toLocaleUpperCase('sr-Latn');
  if (!clue || !secret || !/[\p{L}\p{N}]/u.test(secret)) return;
  document.querySelector('#handoff-title').textContent = `Predaj ekran igraču ${playerTwo}`;
  showScreen('handoff');
});

document.querySelector('#start-game').addEventListener('click', () => {
  guessed = new Set();
  mistakes = 0;
  document.querySelector('#players-line').textContent = `${playerOne} zadaje · ${playerTwo} pogađa`;
  document.querySelector('#players-line').style.color = colorOne;
  document.querySelector('#clue-display').textContent = clue;
  document.querySelector('#clue-display').style.color = colorTwo;
  document.querySelector('#mistakes-display').textContent = `Greške: 0 / ${maxMistakes}`;
  document.querySelector('#game-status').textContent = 'Izaberi slovo.';
  document.querySelector('#game-status').dataset.state = '';
  const keyboard = document.querySelector('#keyboard');
  keyboard.replaceChildren();
  alphabet.forEach(letter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = letter;
    button.setAttribute('aria-label', `Slovo ${letter}`);
    button.addEventListener('click', () => chooseLetter(letter, button));
    keyboard.append(button);
  });
  displayWord();
  drawHangman();
  showScreen('game');
});

document.querySelector('#new-round').addEventListener('click', () => {
  form.reset();
  showScreen('setup');
  clueInput.focus();
});
