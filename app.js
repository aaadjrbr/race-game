import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
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

document.getElementById('custom-emoji-btn-join').addEventListener('click', () => {
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

// Go Back Buttons
document.getElementById('go-back-btn-create').addEventListener('click', () => {
  document.getElementById('create-race-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
});

document.getElementById('go-back-btn-join').addEventListener('click', () => {
  document.getElementById('join-race-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
});

document.getElementById('go-back-btn-list').addEventListener('click', () => {
  document.getElementById('race-list-container').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
});

// Join a Race
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
    const playersAllowed = raceSnapshot.data().playersAllowed;

    // Check if the room is full
    if (playersJoined >= playersAllowed) {
      alert("The room is full!");
      return;
    }

    // Find available slot
    const availableSlots = [];
    for (let i = 1; i <= playersAllowed; i++) {
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

    // Update the race with the new player details
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
  const isReady = document.getElementById('ready-btn').innerText === 'Ready ✅';

  if (raceStarted && !isReady) {
    // Prevent player from unreadying after race has started
    alert("The race has already started! You cannot mark yourself as unready.");
    return;
  }

  await updateDoc(raceRef, {
    [`player${playerIndex}Ready`]: isReady,
  });

  document.getElementById('ready-btn').innerText = isReady ? 'Unready ❌' : 'Ready ✅'; // Toggle Ready/Unready
  document.getElementById('ready-message').innerHTML = isReady ? `Good luck ${nickname} 🙌` : '';

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
  onSnapshot(raceRef, (docSnapshot) => {
    if (!docSnapshot.exists()) {
      // If the race no longer exists, redirect the player to the main page
      alert("The race has been deleted. Redirecting to the main page.");
      document.getElementById('game-container').style.display = 'none';
      document.getElementById('main-screen').style.display = 'block';
      return;
    }

    const data = docSnapshot.data();
    updateProgressBars(data);
    updateScoreboard(data);
    checkIfAllPlayersReady(data);
    updatePlayerStatus(data); // Update the player readiness status
    checkForWinner(data);  // Check if a player has won the race
  });
}

// Function to update player readiness status
function updatePlayerStatus(raceData) {
  const playerStatusContainer = document.getElementById('player-status');
  playerStatusContainer.innerHTML = ''; // Clear the previous status

  for (let i = 1; i <= raceData.playersJoined; i++) {
    const playerName = raceData[`player${i}Nickname`] || `Player ${i}`;
    const playerReady = raceData[`player${i}Ready`] ? "Ready ✨🚀" : "Not Ready ⏰👀";

    const statusItem = document.createElement('div');
    statusItem.className = 'player-status-item';
    statusItem.innerHTML = `${playerName}: ${playerReady}`;

    playerStatusContainer.appendChild(statusItem);
  }
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
  // Check if raceData and playersJoined are defined
  if (!raceData || typeof raceData.playersJoined === 'undefined') {
    console.error("Race data or playersJoined is undefined.");
    return; // Exit the function if there's no valid data
  }

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
let usedQuestions = [];  // Array to store used questions

function showQuiz() {
  // If all questions have been used, reset the usedQuestions array
  if (usedQuestions.length === questions.length) {
    usedQuestions = [];  // Reset to allow the next round
  }

  // Filter the available questions that have not been used
  const availableQuestions = questions.filter(q => !usedQuestions.includes(q));

  // Select a random question from the available ones
  const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

  // Add the selected question to the usedQuestions array
  usedQuestions.push(randomQuestion);

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

// Check for Winner
function checkForWinner(raceData) {
  if (raceData.winner) {
    const winnerIndex = raceData.winner;
    const winnerName = raceData[`player${winnerIndex}Nickname`];
    const winnerEmoji = raceData[`player${winnerIndex}Emoji`];

    alert(`📢 ${winnerEmoji} ${winnerName} has won the race! 🏁🏆`);
    document.getElementById('tap-btn').style.display = 'none';  // Hide the tap button once there's a winner

    // Clear any existing end-game buttons to prevent duplication
    const existingEndGameContainer = document.getElementById('end-game-container');
    if (existingEndGameContainer) {
      existingEndGameContainer.remove();
    }

    // Create a new container for the end buttons
    const endGameContainer = document.createElement('div');
    endGameContainer.id = 'end-game-container';
    endGameContainer.className = 'end-game-options';

    // Restart Button
    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart Race';
    restartBtn.addEventListener('click', async () => {
      // Delete the room and reload the page
      await deleteRoom();
      location.reload();  // Reload the page to restart the race
    });

    // Go Back Button
    const goBackBtn = document.createElement('button');
    goBackBtn.innerText = 'Go Back to Home';
    goBackBtn.addEventListener('click', async () => {
      // Delete the room and redirect to the main screen
      await deleteRoom();
      document.getElementById('game-container').style.display = 'none';
      document.getElementById('main-screen').style.display = 'block';
    });

    endGameContainer.appendChild(restartBtn);
    endGameContainer.appendChild(goBackBtn);

    // Append the end buttons inside the game-container
    document.getElementById('game-container').appendChild(endGameContainer);
  }
}

// Delete the room from Firestore
async function deleteRoom() {
  const raceRef = doc(db, "races", selectedRaceName);
  await deleteDoc(raceRef);
}