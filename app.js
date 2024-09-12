import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { questions } from './questions.js';  // Import the quiz questions

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2XkR_xL3hH7H4ksprXLtn9DnjyQNLG4E",
  authDomain: "random-stuff-adj.firebaseapp.com",
  projectId: "random-stuff-adj",
  storageBucket: "random-stuff-adj.appspot.com",
  messagingSenderId: "1005124695694",
  appId: "1:1005124695694:web:c5dac2910efe64ad783bdf",
  measurementId: "G-WRB7HS4W6F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let playerTaps = 0;
let nickname = '';
let selectedRaceName = '';
let passcode = '';
let playerIndex = 0;
let maxPlayers = 5;
let selectedEmoji = '🚗'; // Default emoji
let raceStarted = false;
let countdownTimer = 5;
let readyCount = 0;

// Main screen buttons
document.getElementById('create-race-btn').addEventListener('click', () => {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('create-race-screen').style.display = 'block';
});

document.getElementById('find-race-btn').addEventListener('click', showAvailableRaces);

// Create a Race
document.getElementById('create-btn').addEventListener('click', async () => {
  nickname = document.getElementById('nickname').value;
  const raceName = document.getElementById('race-name').value;
  const playersAllowed = document.getElementById('players-allowed').value || maxPlayers;
  passcode = document.getElementById('passcode').value;

  if (!nickname || !raceName || !passcode) {
    alert("All fields are required!");
    return;
  }

  const raceRef = doc(db, "races", raceName);
  selectedRaceName = raceName;

  await setDoc(raceRef, {
    passcode,
    playersAllowed,
    playersJoined: 1,
    player1Nickname: nickname,
    player1Progress: 0,
    player1Ready: false,
    player1Emoji: selectedEmoji,
    createdAt: Date.now(),
  });

  playerIndex = 1;
  document.getElementById('create-race-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';

  listenForUpdates(raceName);
});

// Confirm Emoji Selection or Input Custom Emoji
document.querySelectorAll('.emoji-btn').forEach(button => {
  button.addEventListener('click', () => {
    const emoji = button.getAttribute('data-emoji');
    if (confirm(`Are you sure you want to select ${emoji}?`)) {
      selectedEmoji = emoji;
    }
  });
});

document.getElementById('custom-emoji-btn').addEventListener('click', () => {
  const customEmoji = prompt("Enter your custom emoji:");
  if (customEmoji) {
    selectedEmoji = customEmoji;
  }
});

// Show Available Races
async function showAvailableRaces() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('race-list-container').style.display = 'block';

  const racesSnapshot = await getDocs(collection(db, "races"));
  const raceList = document.getElementById('race-list');
  raceList.innerHTML = '';

  racesSnapshot.forEach((doc) => {
    const raceItem = document.createElement('div');
    raceItem.classList.add('race-item');
    const raceData = doc.data();

    raceItem.innerHTML = `
      <h4>${doc.id}</h4>
      <p>${raceData.playersJoined} player(s) | Max: ${raceData.playersAllowed}</p>
    `;

    raceItem.addEventListener('click', () => {
      selectedRaceName = doc.id;
      document.getElementById('race-list-container').style.display = 'none';
      showJoinRaceScreen();
    });

    raceList.appendChild(raceItem);
  });
}

// Show the join race screen
function showJoinRaceScreen() {
  document.getElementById('join-race-screen').style.display = 'block';
  document.getElementById('main-screen').style.display = 'none';
}

// Join a Race
document.getElementById('join-btn').addEventListener('click', async () => {
  nickname = document.getElementById('join-nickname').value;
  passcode = document.getElementById('join-passcode').value;
  
  if (!nickname || !passcode) {
    alert("Both nickname and passcode are required!");
    return;
  }

  const raceRef = doc(db, "races", selectedRaceName);
  const raceSnapshot = await getDoc(raceRef);

  if (raceSnapshot.exists() && raceSnapshot.data().passcode === passcode) {
    const playersJoined = raceSnapshot.data().playersJoined;
    const availableSlots = [];

    for (let i = 1; i <= raceSnapshot.data().playersAllowed; i++) {
      if (!raceSnapshot.data()[`player${i}Nickname`]) {
        availableSlots.push(i);
      }
    }

    playerIndex = availableSlots[0];  // Auto-select first available slot
    const updateData = {};
    updateData[`player${playerIndex}Nickname`] = nickname;
    updateData[`player${playerIndex}Progress`] = 0;
    updateData[`player${playerIndex}Ready`] = false;
    updateData[`player${playerIndex}Emoji`] = selectedEmoji;
    updateData[`playersJoined`] = playersJoined + 1;

    await updateDoc(raceRef, updateData);

    document.getElementById('join-race-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    listenForUpdates(selectedRaceName);
  } else {
    alert("Invalid passcode.");
  }
});

// Ready Button Click Handler
document.getElementById('ready-btn').addEventListener('click', async () => {
  const raceRef = doc(db, "races", selectedRaceName);
  const isReady = document.getElementById('ready-btn').innerText === 'Ready';
  
  await updateDoc(raceRef, {
    [`player${playerIndex}Ready`]: isReady,
  });

  document.getElementById('ready-btn').innerText = isReady ? 'Unready' : 'Ready'; // Toggle Ready/Unready
  document.getElementById('ready-message').innerHTML = isReady ? `${nickname} is ready... waiting for other players!` : '';

  // Immediately reflect ready status for all players
  listenForUpdates(selectedRaceName);
});

// Countdown Function
function startCountdown() {
  document.getElementById('countdown').style.display = 'block';
  const interval = setInterval(() => {
    countdownTimer--;
    document.getElementById('countdown-timer').innerText = countdownTimer;
    if (countdownTimer === 0) {
      clearInterval(interval);
      document.getElementById('countdown').style.display = 'none';
      document.getElementById('tap-btn').style.display = 'block'; // Show tap button after countdown
      raceStarted = true;
    }
  }, 1000);
}

// Listen for Race Updates
function listenForUpdates(raceName) {
  const raceRef = doc(db, "races", raceName);
  onSnapshot(raceRef, (doc) => {
    const data = doc.data();
    updateProgressBars(data);
    updateScoreboard(data);
    checkIfAllPlayersReady(data);
  });
}

// Check if All Players are Ready
function checkIfAllPlayersReady(raceData) {
  readyCount = 0;
  for (let i = 1; i <= raceData.playersJoined; i++) {
    if (raceData[`player${i}Ready`] === true) {
      readyCount++;
    }
  }
  if (readyCount === raceData.playersJoined && raceData.playersJoined > 1 && !raceStarted) {
    startCountdown();
  }
}

// Update Progress Bars
function updateProgressBars(raceData) {
  const playerContainer = document.getElementById('player-container');
  playerContainer.innerHTML = '';  // Clear previous progress bars

  for (let i = 1; i <= raceData.playersJoined; i++) {
    const playerProgress = raceData[`player${i}Progress`] || 0;
    const playerEmoji = raceData[`player${i}Emoji`] || '🚗';

    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'progress-wrapper';

    const progressFill = document.createElement('div');
    progressFill.className = `progress-fill player${i}`;
    setTimeout(() => { // Add a timeout to ensure the transition plays
      progressFill.style.width = `${playerProgress}%`;
    }, 10); // Ensure the transition plays properly

    const emoji = document.createElement('div');
    emoji.id = `emoji${i}`;
    emoji.className = 'emoji';
    emoji.innerText = playerEmoji;
    emoji.style.left = `${playerProgress}%`;

    progressWrapper.appendChild(progressFill);
    progressWrapper.appendChild(emoji);
    playerContainer.appendChild(progressWrapper);
  }
}

// Tap Button for Taps and Quiz
document.getElementById('tap-btn').addEventListener('click', () => {
  playerTaps++;
  if (playerTaps >= 10) {
    showQuiz();
    playerTaps = 0; // Reset taps after showing quiz
  }
});

// Show Quiz
function showQuiz() {
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  document.getElementById('quiz-question').innerText = randomQuestion.question;

  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = '';

  randomQuestion.options.forEach(option => {
    const button = document.createElement('button');
    button.innerText = option;
    button.addEventListener('click', () => {
      checkAnswer(option, randomQuestion.answer);
    });
    optionsContainer.appendChild(button);
  });

  document.getElementById('quiz-container').style.display = 'block'; // Show quiz
  document.getElementById('tap-btn').style.display = 'none'; // Hide tap button during quiz
}

// Check Answer
function checkAnswer(selectedAnswer, correctAnswer) {
  if (selectedAnswer === correctAnswer) {
    updatePlayerProgress(10);  // Correct answer, move forward 10%
  } else {
    updatePlayerProgress(0);  // Incorrect answer, do not move backward if already at 0%
  }

  document.getElementById('quiz-container').style.display = 'none'; // Hide quiz after answering
  document.getElementById('tap-btn').style.display = 'block'; // Show tap button again
}

// Update Player Progress in Firestore
async function updatePlayerProgress(amount) {
  const raceRef = doc(db, "races", selectedRaceName);
  const raceSnapshot = await getDoc(raceRef);

  let currentProgress = raceSnapshot.data()[`player${playerIndex}Progress`] || 0;
  let newProgress = Math.max(0, currentProgress + amount);  // Ensure progress does not go below 0

  const update = {};
  update[`player${playerIndex}Progress`] = newProgress;

  if (newProgress === 100) {
    update.winner = playerIndex;  // Declare winner
  }

  await updateDoc(raceRef, update);
}

// Update the Scoreboard
function updateScoreboard(raceData) {
  const scoreList = document.getElementById('score-list');
  scoreList.innerHTML = '';  // Clear previous scores

  for (let i = 1; i <= raceData.playersJoined; i++) {
    const playerScore = document.createElement('li');
    playerScore.innerHTML = `${raceData[`player${i}Emoji`]} ${raceData[`player${i}Nickname`]}: ${raceData[`player${i}Progress`]}%`;
    scoreList.appendChild(playerScore);
  }
}
