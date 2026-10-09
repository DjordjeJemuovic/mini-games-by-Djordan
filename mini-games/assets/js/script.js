const playersForm = document.querySelector('#players-form');
const playersScreen = document.querySelector('#players-screen');
const gamesScreen = document.querySelector('#games-screen');
const welcomeMessage = document.querySelector('#welcome-message');
const changePlayersButton = document.querySelector('#change-players');
const gameButtons = [...document.querySelectorAll('.game-card')];
const launchParams = new URLSearchParams(window.location.search);

let players = null;

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
  playersScreen.hidden = true;
  gamesScreen.hidden = false;
}

playersForm.addEventListener('submit', event => {
  event.preventDefault();
  players = {
    one: playersForm.elements.playerOne.value.trim(),
    two: playersForm.elements.playerTwo.value.trim(),
    colorOne: playersForm.elements.playerOneColor.value,
    colorTwo: playersForm.elements.playerTwoColor.value
  };
  welcomeMessage.textContent = `Spremni ste, ${players.one} i ${players.two}?`;
  playersScreen.hidden = true;
  gamesScreen.hidden = false;
});

gameButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (!players) return;
    const params = new URLSearchParams({
      player1: players.one,
      player2: players.two,
      color1: players.colorOne,
      color2: players.colorTwo
    });
    window.location.href = `../${button.dataset.game}/index.html?${params.toString()}`;
  });
});

changePlayersButton.addEventListener('click', () => {
  gamesScreen.hidden = true;
  playersScreen.hidden = false;
});
