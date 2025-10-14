// This is your personal Render server URL, correctly formatted.
const RENDER_SERVER_URL = "wss://rps-matchmaker-sigmarizzler12.onrender.com";

// --- UI Elements ---
const connectionUi = document.getElementById('connection-ui');
const gameContainer = document.getElementById('game-container');
const statusText = document.getElementById('status-text');
const findMatchBtn = document.getElementById('find-match-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomCodeInput = document.getElementById('room-code-input');
const scoreDisplay = document.getElementById('score-display');
const gameStatusDisplay = document.getElementById('game-status-display');
const rockBtn = document.getElementById('rock-btn');
const paperBtn = document.getElementById('paper-btn');
const scissorsBtn = document.getElementById('scissors-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const rematchBtn = document.getElementById('rematch-btn');
const leaveMatchBtn = document.getElementById('leave-match-btn');
const choiceBtns = [rockBtn, paperBtn, scissorsBtn];
const timerDisplay = document.getElementById('timer-display');
const maintenanceScreen = document.getElementById('maintenance-screen');
const backgroundMusic = document.getElementById('bg-music'); // New music element

// --- Graphics Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// --- Game State & Multiplayer State ---
let myChoice = null, opponentChoice = null, myScore = 0, opponentScore = 0;
let peer, myPeerId, p2pConnection, matchmakingSocket;
let roundTimer, countdownInterval;
let myVoteForRematch = false; // New state for rematch voting
let opponentVoteForRematch = false; // New state for rematch voting

// --- Initialization and Connection (No Changes) ---
function initialize() { peer = new Peer(); peer.on('open', (id) => { myPeerId = id; connectToMatchmaker(); }); peer.on('connection', (conn) => { setupP2PConnection(conn); }); }
function connectToMatchmaker() {
    statusText.innerText = 'Connecting to server...';
    matchmakingSocket = new WebSocket(RENDER_SERVER_URL);
    matchmakingSocket.onopen = () => { statusText.innerText = 'Connected to server.'; };
    matchmakingSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'maintenance') { showMaintenanceScreen(true); return; }
        if (data.type === 'global-message') { statusText.innerText = `ANNOUNCEMENT: ${data.message}`; return; }
        if (data.type === 'waiting-for-match') { statusText.innerText = 'Searching for an opponent...'; } 
        else if (data.type === 'room-created') { statusText.innerText = `Room created! Code: ${data.roomCode}`; roomCodeInput.value = data.roomCode; } 
        else if (data.type === 'match-found' || data.type === 'join-success') { statusText.innerText = `Match found! Connecting...`; const conn = peer.connect(data.opponentId); setupP2PConnection(conn); } 
        else if (data.type === 'error') { statusText.innerText = `Error: ${data.message}`; }
    };
    matchmakingSocket.onclose = () => { statusText.innerText = 'Disconnected. Please refresh.'; };
}
function showMaintenanceScreen(isMaintenance) { if (isMaintenance) { maintenanceScreen.style.display = 'block'; connectionUi.style.display = 'none'; gameContainer.style.display = 'none'; } else { maintenanceScreen.style.display = 'none'; connectionUi.style.display = 'block'; } }

// --- P2P Connection Logic ---
function setupP2PConnection(conn) {
    p2pConnection = conn;
    p2pConnection.on('open', () => {
        connectionUi.style.display = 'none';
        gameContainer.style.display = 'block';
        if (matchmakingSocket) matchmakingSocket.close();
        
        // Start background music
        backgroundMusic.play().catch(e => console.log("Autoplay was prevented. User must interact first."));
        
        startNewMatch();
        gameLoop();
    });
    p2pConnection.on('data', (data) => {
        if (data.type === 'choice') { opponentChoice = data.value; resolveRound(); } 
        else if (data.type === 'playAgain') { resetRound(); }
        else if (data.type === 'request-rematch') { // Handle rematch request from opponent
            opponentVoteForRematch = true;
            rematchBtn.innerText = "Opponent wants a rematch!";
            checkForRematch(); // Check if we can start
        }
    });
    p2pConnection.on('close', () => { resetToConnectionScreen("Opponent has left the match."); });
}

function resetToConnectionScreen(message) {
    if (p2pConnection) { p2pConnection.close(); p2pConnection = null; }
    
    // Stop and reset music
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;

    gameContainer.style.display = 'none';
    connectionUi.style.display = 'block';
    statusText.innerText = message || "Ready to play.";
    connectToMatchmaker();
}

// --- Button Clicks ---
findMatchBtn.onclick = () => { matchmakingSocket.send(JSON.stringify({ type: 'find-match', peerId: myPeerId })); statusText.innerText = 'Looking for a match...'; };
createRoomBtn.onclick = () => { matchmakingSocket.send(JSON.stringify({ type: 'create-room', peerId: myPeerId })); };
joinRoomBtn.onclick = () => { const roomCode = roomCodeInput.value.toUpperCase(); if (roomCode) matchmakingSocket.send(JSON.stringify({ type: 'join-room', roomCode: roomCode })); };
leaveMatchBtn.onclick = () => { resetToConnectionScreen("You left the match."); };
rockBtn.onclick = () => makeChoice('rock');
paperBtn.onclick = () => makeChoice('paper');
scissorsBtn.onclick = () => makeChoice('scissors');
playAgainBtn.onclick = () => { resetRound(); p2pConnection.send({ type: 'playAgain' }); };
rematchBtn.onclick = () => {
    myVoteForRematch = true;
    p2pConnection.send({ type: 'request-rematch' });
    rematchBtn.innerText = "Waiting for Opponent...";
    rematchBtn.disabled = true;
    checkForRematch();
};

// --- Game Logic ---
function checkForRematch() {
    if (myVoteForRematch && opponentVoteForRematch) {
        startNewMatch();
    }
}

function makeChoice(choice) {
    if (myChoice) return;
    myChoice = choice;
    p2pConnection.send({ type: 'choice', value: choice });
    gameStatusDisplay.innerText = `You chose ${choice === 'timeout' ? 'nothing' : choice}. Waiting...`;
    choiceBtns.forEach(btn => btn.classList.add('disabled'));
    clearInterval(countdownInterval);
    timerDisplay.style.display = 'none';
    resolveRound();
}

function resolveRound() {
    if (!myChoice || !opponentChoice) return;
    let resultText;
    if (myChoice === 'timeout' && opponentChoice === 'timeout') { resultText = "Both ran out of time. It's a Tie!"; } 
    else if (myChoice === 'timeout') { resultText = "You ran out of time. You Lose!"; opponentScore++; } 
    else if (opponentChoice === 'timeout') { resultText = "Opponent ran out of time. You Win!"; myScore++; } 
    else if (myChoice === opponentChoice) { resultText = "It's a Tie!"; } 
    else if ((myChoice === 'rock' && opponentChoice === 'scissors') || (myChoice === 'paper' && opponentChoice === 'rock') || (myChoice === 'scissors' && opponentChoice === 'paper')) {
        resultText = "You Win!"; myScore++;
    } else {
        resultText = "You Lose!"; opponentScore++;
    }
    const myChoiceText = myChoice === 'timeout' ? 'nothing' : myChoice;
    const opponentChoiceText = opponentChoice === 'timeout' ? 'nothing' : opponentChoice;
    gameStatusDisplay.innerText = `You chose ${myChoiceText}, opponent chose ${opponentChoiceText}. ${resultText}`;
    updateScoreDisplay();
    if (myScore >= 2 || opponentScore >= 2) { endMatch(); } 
    else { playAgainBtn.style.display = 'block'; }
}

function endMatch() {
    const winnerText = myScore >= 2 ? "You won the match!" : "You lost the match!";
    gameStatusDisplay.innerText = `Game Over! ${winnerText}`;
    playAgainBtn.style.display = 'none';
    rematchBtn.style.display = 'block';
    choiceBtns.forEach(btn => btn.classList.add('disabled'));
}

function startNewMatch() {
    myScore = 0;
    opponentScore = 0;
    myVoteForRematch = false; // Reset vote
    opponentVoteForRematch = false; // Reset vote
    rematchBtn.innerText = "Rematch"; // Reset button text
    rematchBtn.disabled = false;
    updateScoreDisplay();
    rematchBtn.style.display = 'none';
    resetRound();
}

function resetRound() {
    myChoice = null;
    opponentChoice = null;
    gameStatusDisplay.innerText = "Choose your weapon!";
    choiceBtns.forEach(btn => btn.classList.remove('disabled'));
    playAgainBtn.style.display = 'none';
    clearInterval(countdownInterval);
    timerDisplay.style.display = 'block';
    roundTimer = 5;
    timerDisplay.innerText = roundTimer;
    countdownInterval = setInterval(() => {
        roundTimer--;
        timerDisplay.innerText = roundTimer;
        if (roundTimer <= 0) {
            clearInterval(countdownInterval);
            if (!myChoice) { makeChoice('timeout'); }
        }
    }, 1000);
}

function updateScoreDisplay() { scoreDisplay.innerText = `You: ${myScore} - Opponent: ${opponentScore}`; }

// --- Graphics and Game Loop (No Changes) ---
function draw() {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#1c2a4b'); skyGradient.addColorStop(0.7, '#894b63'); skyGradient.addColorStop(1, '#f18763');
    ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for (let i = 0; i < 100; i++) { const x = Math.random() * canvas.width; const y = 200 + Math.random() * 100; const r = Math.random() * 15 + 5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.moveTo(50, 550); ctx.lineTo(750, 550); ctx.lineTo(canvas.width, 450); ctx.lineTo(0, 450); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 450); ctx.lineTo(canvas.width, 450); ctx.moveTo(25, 400); ctx.lineTo(775, 400); ctx.stroke();
    const playerX = canvas.width * 0.25;
    const opponentX = canvas.width * 0.75;
    const playerY = 400;
    let opponentChoiceToShow = null;
    if (myChoice && opponentChoice) { opponentChoiceToShow = opponentChoice; }
    drawPlayerBall(playerX, playerY, 60, '#3498db', myChoice);
    drawPlayerBall(opponentX, playerY, 60, '#e74c3c', opponentChoiceToShow);
}
function drawPlayerBall(x, y, radius, color, choice) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.fillRect(x - 45, y - 20, 90, 25);
    ctx.fillStyle = '#bc002d'; ctx.beginPath(); ctx.arc(x, y - 8, 10, 0, Math.PI * 2); ctx.fill();
    if (choice) { const choicesMap = { rock: '✊', paper: '✋', scissors: '✌️', timeout: '⏳' }; ctx.font = '80px Arial'; ctx.textAlign = 'center'; ctx.fillText(choicesMap[choice], x, y - 100); }
}
function gameLoop() { draw(); if (p2pConnection) { requestAnimationFrame(gameLoop); } }

// --- Start Everything ---
initialize();
