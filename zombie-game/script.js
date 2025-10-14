// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- UI Elements ---
const feedbackMessageEl = document.getElementById('feedback-message');
const equippedItemImgEl = document.getElementById('equipped-item-img');
const equippedItemNameEl = document.getElementById('equipped-item-name');
const healthBar = document.getElementById('health-bar');
const healthText = document.getElementById('health-text');
const woodCountEl = document.getElementById('wood-count');
const stoneCountEl = document.getElementById('stone-count');
const cashCountEl = document.getElementById('cash-count');
const waveNumberEl = document.getElementById('wave-number');
const timerEl = document.getElementById('timer');
const timerContainer = document.getElementById('timer-container');
const startWaveBtn = document.getElementById('start-wave-btn');
const orderStation = document.getElementById('order-station');
const gameOverScreen = document.getElementById('game-over');
const finalWaveEl = document.getElementById('final-wave');
const playAgainBtn = document.getElementById('play-again-btn');

// --- NEW: Audio Setup ---
const sounds = {
    gunshot: new Audio('audio/gunshot.mp3'),
    intermission: new Audio('audio/intermission.mp3'),
    waveOngoing: new Audio('audio/waveongoing.mp3'),
    beep: new Audio('audio/beep.mp3'),
    lobby: new Audio('audio/lobby.mp3') // For future use
};
// Settings for sounds
sounds.waveOngoing.loop = true;
sounds.gunshot.volume = 0.4;
sounds.beep.volume = 0.7;


// --- Game Constants & State ---
const WORLD_SIZE = 3000; const PLAYER_SIZE = 20; const GATHER_RANGE = 60; const ZOMBIE_SIZE = 18; const TREE_SIZE = 30; const ROCK_SIZE = 25; const WALL_SIZE = 50; const GRID_SIZE = 50; const BULLET_SIZE = 5; const BULLET_SPEED = 12; const INTERMISSION_TIME = 60;
let gameState, player, zombies, trees, rocks, walls, bullets;
let destroyedResources = [];
let keys = {}, mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let shopOpen = false; let camera = { x: 0, y: 0 }; let lastActionTime = 0; let intermissionInterval;

// --- Image Loading ---
const images = { gun: new Image(), gun1: new Image(), gun2: new Image(), axe: new Image(), pickaxe: new Image(), rock: new Image(), tree: new Image() };
images.gun.src = 'gun.png'; images.gun1.src = 'gun1.png'; images.gun2.src = 'gun2.png'; images.axe.src = 'axe.png'; images.pickaxe.src = 'pickaxe.png'; images.rock.src = 'rock.png'; images.tree.src = 'tree.png';
let imagesLoaded = 0; const totalImages = Object.keys(images).length;
for (const key in images) { images[key].onload = () => { imagesLoaded++; }; }

// --- Initialization ---
function init() {
    // Stop all sounds on reset
    Object.values(sounds).forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
    });

    gameState = { phase: 'intermission', wave: 1, intermissionTimer: INTERMISSION_TIME, gameOver: false };
    player = {
        x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: PLAYER_SIZE, speed: 4, health: 100, maxHealth: 100, angle: 0,
        resources: { wood: 0, stone: 0, cash: 0 },
        inventory: { axe: true, pickaxe: false, pistol: true, rifle: false, shotgun: false },
        equipped: 'pistol',
    };
    setWeaponStats();
    zombies = []; trees = []; rocks = []; walls = []; bullets = [];
    destroyedResources = [];
    shopOpen = false;
    generateTrees();
    generateRocks();
    gameOverScreen.classList.add('hidden');
    orderStation.classList.add('hidden');
    startWaveBtn.classList.remove('hidden');
    timerContainer.classList.remove('hidden');
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.disabled = false;
        const ownedEl = btn.nextElementSibling;
        if (ownedEl && ownedEl.classList.contains('owned')) { ownedEl.classList.add('hidden'); }
    });
    updateUI();
    startIntermission();
    if (imagesLoaded === totalImages) { gameLoop(); }
    else { const loadCheck = setInterval(() => { if (imagesLoaded === totalImages) { clearInterval(loadCheck); gameLoop(); } }, 100); }
}

// --- Game Logic ---
function setWeaponStats() { /* ... no changes ... */ }
function gameLoop() { /* ... no changes ... */ }
function updateGame() { /* ... no changes ... */ }
function handleCollisions() { /* ... no changes ... */ }
function drawGame() { /* ... no changes ... */ }
function drawPlayer() { /* ... no changes ... */ }
function drawResource(res) { /* ... no changes ... */ }
function drawHealthBar(entity, color) { /* ... no changes ... */ }

// --- Wave and Game State Logic ---
function startIntermission() {
    gameState.phase = "intermission";
    gameState.intermissionTimer = INTERMISSION_TIME;
    
    // Stop wave music, play intermission music
    sounds.waveOngoing.pause();
    sounds.intermission.currentTime = 0;
    sounds.intermission.play();

    timerContainer.classList.remove("hidden");
    startWaveBtn.classList.remove("hidden");
    intermissionInterval = setInterval(() => {
        gameState.intermissionTimer--;
        updateUI();

        // Countdown beeps
        if (gameState.intermissionTimer > 0 && gameState.intermissionTimer <= 5) {
            sounds.beep.currentTime = 0;
            sounds.beep.play();
        }

        if (gameState.intermissionTimer <= 0) {
            startWave();
        }
    }, 1000);
}

function startWave() {
    if (gameState.phase !== "intermission") return;
    clearInterval(intermissionInterval);
    gameState.phase = "wave";

    // Stop intermission music, play wave music
    sounds.intermission.pause();
    sounds.waveOngoing.currentTime = 0;
    sounds.waveOngoing.play();

    startWaveBtn.classList.add("hidden");
    timerContainer.classList.add("hidden");
    spawnZombies();
}

function endWave() {
    gameState.wave++;
    updateUI();
    checkRespawns();
    startIntermission(); // This will handle stopping wave music and starting intermission music
}

function checkRespawns() { /* ... no changes ... */ }
function updateUI() { /* ... no changes ... */ }
function showFeedback(message) { /* ... no changes ... */ }
function handleKeyPress(e) { /* ... no changes ... */ }
function handleMouseDown() { /* ... no changes ... */ }

function shoot() {
    // Play gunshot sound
    sounds.gunshot.currentTime = 0; // Rewind to start to allow rapid firing
    sounds.gunshot.play();

    const fireLocation = { x: player.x + Math.cos(player.angle) * 20, y: player.y + Math.sin(player.angle) * 20 };
    if (player.equipped === 'shotgun') {
        const spread = 0.25;
        for (let i = -1; i <= 1; i++) {
            const angle = player.angle + (i * spread);
            bullets.push({ x: fireLocation.x, y: fireLocation.y, vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED, radius: BULLET_SIZE, damage: player.damage });
        }
    } else { bullets.push({ x: fireLocation.x, y: fireLocation.y, vx: Math.cos(player.angle) * BULLET_SPEED, vy: Math.sin(player.angle) * BULLET_SPEED, radius: BULLET_SIZE, damage: player.damage }); }
}

function placeWall() { /* ... no changes ... */ }
function useAxe() { /* ... no changes ... */ }
function usePickaxe() { /* ... no changes ... */ }
function toggleShop() { /* ... no changes ... */ }
function buyItem(item, cost) { /* ... no changes ... */ }
function gameOver() {
    gameState.gameOver = true;
    clearInterval(intermissionInterval);
    finalWaveEl.textContent = gameState.wave;
    gameOverScreen.classList.remove("hidden");
    
    // Stop all music on game over
    sounds.waveOngoing.pause();
    sounds.intermission.pause();
}

function generateRocks() { /* ... no changes ... */ }
function generateTrees() { /* ... no changes ... */ }
function drawZombie(z) { /* ... no changes ... */ }
function drawWall(wall) { /* ... no changes ... */ }
function drawBullet(b) { /* ... no changes ... */ }

// --- Event Listeners and Init ---
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; handleKeyPress(e); });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
    player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.y);
});
canvas.addEventListener('mousedown', handleMouseDown);
startWaveBtn.addEventListener('click', startWave);
playAgainBtn.addEventListener('click', init);
document.querySelectorAll('.buy-btn').forEach(btn => { btn.addEventListener('click', () => buyItem(btn.dataset.item, parseInt(btn.dataset.cost))); });

init();

// --- Minified Helper Functions (Removed to avoid confusion) ---
