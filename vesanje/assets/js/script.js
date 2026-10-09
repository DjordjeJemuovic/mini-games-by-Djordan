// === Podešavanja i podaci o igračima ===
// Browser verzija vešanja. Podaci o igračima stižu iz glavnog menija kroz URL.
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
// === Stanje runde i rezultat ===
// Rezultat važi dok je ova stranica otvorena i prenosi se između novih rundi.
const score = { one: 0, two: 0 };

// === Upravljanje ekranima i prikazom ===
// Prikaži tačno jedan korak igre; sekcije su definisane u HTML-u.
/** Prikazuje jednu fazu igre i skriva ostale ekrane. */
function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => { screen.hidden = key !== name; });
}

/** Izgradi prikaz skrivene reči na osnovu do sada pogođenih slova. */
function displayWord() {
  // Sakrij neotkrivena slova, ali ostavi razmake i interpunkciju vidljivim.
  document.querySelector('#word-display').textContent = [...secret]
    .map(char => /[\p{L}\p{N}]/u.test(char) ? (guessed.has(char) ? char : '_') : char)
    .join(' ');
}

// === Crtanje figure ===
// Canvas iscrtava delove figure na osnovu broja pogrešnih slova.
/** Iscrta statična vešala i deo figure koji odgovara broju promašaja. */
function drawHangman() {
  // Vešala su stalna pozadina; svaki promašaj doda sledeći deo figure.
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

// === Pravila poteza i kraj runde ===
// Ove funkcije otkrivaju slova, broje greške i odlučuju pobednika.
/** Zaključa tastaturu, dodeli poen i prikaže ekran sa ishodom runde. */
function endRound(won) {
  // Zaključa tastaturu, dodeli pobedu i prikaže rezime runde.
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

/** Obradi slovo, promeni model i ekran, pa proveri uslov kraja runde. */
function chooseLetter(letter, button) {
  // Zabeleži izabrano slovo, ažuriraj crtež i proveri pobedu ili šest grešaka.
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

// === Pokretanje nove runde i događaji interfejsa ===
// Callback forme validira početne podatke i vodi igrače na ekran predaje uređaja.
form.addEventListener('submit', event => {
  // Sačuvaj zagonetku i tajnu reč, pa prvo prikaži ekran za predaju uređaja.
  event.preventDefault();
  clue = clueInput.value.trim();
  secret = secretInput.value.trim().toLocaleUpperCase('sr-Latn');
  if (!clue || !secret || !/[\p{L}\p{N}]/u.test(secret)) return;
  document.querySelector('#handoff-title').textContent = `Predaj ekran igraču ${playerTwo}`;
  showScreen('handoff');
});

// Callback za početak runde pravi tastaturu i priprema stanje igre za pogađanje.
document.querySelector('#start-game').addEventListener('click', () => {
  // Započni novu rundu i napravi dugme za svako podržano slovo.
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
    // Click callback predaje izabrano slovo logici poteza.
    button.addEventListener('click', () => chooseLetter(letter, button));
    keyboard.append(button);
  });
  displayWord();
  drawHangman();
  showScreen('game');
});

// Callback za novu rundu očisti polja, ali zadrži igrače i tekući skor.
document.querySelector('#new-round').addEventListener('click', () => {
  // Očisti polja za novu reč, ali zadrži imena igrača i trenutni rezultat.
  form.reset();
  showScreen('setup');
  clueInput.focus();
});
