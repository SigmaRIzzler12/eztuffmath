// --- Basic Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200; // Wider screen
canvas.height = 800;

// --- World and Camera ---
const world = {
    width: 3000,
    height: 3000,
};
const camera = {
    x: 0,
    y: 0,
};

// --- UI Elements ---
const healthBar = document.getElementById('health-bar');
const waveDisplay = document.getElementById('wave-display');
const waveTimerDisplay = document.getElementById('wave-timer');
const woodCountDisplay = document.getElementById('wood-count');
const stoneCountDisplay = document.getElementById('stone-count');
const cashCountDisplay = document.getElementById('cash-count');
const startWaveBtn = document.getElementById('start-wave-btn');
const buildModeIndicator = document.getElementById('build-mode-indicator');
const gameOverScreen = document.getElementById('game-over-screen');
const finalWaveCount = document.getElementById('final-wave-count');
const restartBtn = document.getElementById('restart-btn');

// --- Image Loading ---
const gunImage = new Image();
gunImage.src = 'gun.png';
let imageLoaded = false;
gunImage.onload = () => { imageLoaded = true; };

// --- Game State ---
let gameState = 'intermission'; // 'intermission', 'wave_in_progress'
let player, gun;
let bullets = [], zombies = [], walls = [], trees = [];
let keys = {}, mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let wave = 1, cash = 0, wood = 0, stone = 0;
let isGameOver = false;
let buildMode = false;
let activeTool = 'axe'; // 'axe', 'pickaxe', 'gun'
let toolCooldown = 0;
let intermissionTimer = 60;
let countdownInterval;

// --- Game Classes ---
class Player {
    constructor(x, y, radius, color, speed) {
        this.x = x; this.y = y; this.radius = radius; this.color = color; this.speed = speed; this.health = 100;
    }
    draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
    update() {
        if (keys['w'] && this.y - this.radius > 0) this.y -= this.speed;
        if (keys['s'] && this.y + this.radius < world.height) this.y += this.speed;
        if (keys['a'] && this.x - this.radius > 0) this.x -= this.speed;
        if (keys['d'] && this.x + this.radius < world.width) this.x += this.speed;
    }
}

class Gun {
    constructor(player) {
        this.player = player; this.angle = 0; this.width = 60; this.height = 30;
    }
    update() { this.angle = Math.atan2(mouse.worldY - this.player.y, mouse.worldX - this.player.x); }
    draw() {
        ctx.save(); ctx.translate(this.player.x, this.player.y); ctx.rotate(this.angle);
        ctx.drawImage(gunImage, 0, -this.height / 2, this.width, this.height); ctx.restore();
    }
}

class Bullet {
    constructor(x, y, radius, color, velocity) { this.x = x; this.y = y; this.radius = radius; this.color = color; this.velocity = velocity; }
    draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; }
}

class Zombie {
    constructor(x, y, radius, color, speed) {
        this.x = x; this.y = y; this.radius = radius; this.color = color; this.speed = speed;
    }
    draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed;
    }
}

class Wall {
    constructor(x, y, width, height) { this.x = x; this.y = y; this.width = width; this.height = height; }
    draw() { ctx.fillStyle = '#8B4513'; ctx.fillRect(this.x, this.y, this.width, this.height); }
}

class Tree {
    constructor(x, y) { this.x = x; this.y = y; this.radius = 25; this.health = 10; }
    draw() { ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
}

// --- Game Logic ---
function startGame() {
    isGameOver = false;
    gameState = 'intermission';
    wave = 1; cash = 0; wood = 50; stone = 0;
    player = new Player(world.width / 2, world.height / 2, 15, 'cyan', 4);
    gun = new Gun(player);
    bullets = []; zombies = []; walls = []; trees = [];
    gameOverScreen.style.display = 'none';
    buildMode = false;
    updateUI();
    generateWorld();
    startIntermission();
    gameLoop();
}

function generateWorld() {
    // Spawn trees in a circle around the base
    const baseCenterX = world.width / 2;
    const baseCenterY = world.height / 2;
    const treeRingRadius = 600;
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const x = baseCenterX + Math.cos(angle) * (treeRingRadius + Math.random() * 200);
        const y = baseCenterY + Math.sin(angle) * (treeRingRadius + Math.random() * 200);
        trees.push(new Tree(x, y));
    }
}

function startIntermission() {
    gameState = 'intermission';
    startWaveBtn.style.display = 'block';
    intermissionTimer = 60;
    waveTimerDisplay.innerText = `NEXT WAVE: ${intermissionTimer}`;
    countdownInterval = setInterval(() => {
        intermissionTimer--;
        waveTimerDisplay.innerText = `NEXT WAVE: ${intermissionTimer}`;
        if (intermissionTimer <= 0) {
            startNextWave();
        }
    }, 1000);
}

function startNextWave() {
    clearInterval(countdownInterval);
    waveTimerDisplay.innerText = '';
    gameState = 'wave_in_progress';
    startWaveBtn.style.display = 'none';
    spawnZombies();
}

function spawnZombies() {
    const zombieCount = wave * 3 + 5;
    for (let i = 0; i < zombieCount; i++) {
        let x, y;
        const spawnEdge = Math.floor(Math.random() * 4);
        switch (spawnEdge) {
            case 0: x = 0 - 20; y = Math.random() * world.height; break; // Left
            case 1: x = world.width + 20; y = Math.random() * world.height; break; // Right
            case 2: x = Math.random() * world.width; y = 0 - 20; break; // Top
            case 3: x = Math.random() * world.width; y = world.height + 20; break; // Bottom
        }
        zombies.push(new Zombie(x, y, 12, 'red', 1 + wave * 0.15));
    }
}

function updateUI() {
    healthBar.style.width = player.health + '%';
    healthBar.style.backgroundColor = player.health > 50 ? '#2ecc71' : player.health > 25 ? '#f1c40f' : '#e74c3c';
    waveDisplay.innerText = `WAVE: ${wave}`;
    woodCountDisplay.innerText = wood;
    stoneCountDisplay.innerText = stone;
    cashCountDisplay.innerText = cash;
    buildModeIndicator.style.display = buildMode ? 'block' : 'none';
}

function checkCollisions() {
    // Bullets and Zombies
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = zombies.length - 1; j >= 0; j--) {
            if (Math.hypot(bullets[i].x - zombies[j].x, bullets[i].y - zombies[j].y) < zombies[j].radius) {
                zombies.splice(j, 1);
                bullets.splice(i, 1);
                cash += 10;
                updateUI();
                break;
            }
        }
    }
    // Player and Zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
        if (Math.hypot(player.x - zombies[i].x, player.y - zombies[i].y) < player.radius + zombies[i].radius) {
            player.health -= 10;
            zombies.splice(i, 1);
            updateUI();
            if (player.health <= 0) gameOver();
        }
    }
}

function gameOver() {
    isGameOver = true;
    clearInterval(countdownInterval);
    finalWaveCount.innerText = wave;
    gameOverScreen.style.display = 'flex';
}

// --- Animation Loop ---
function gameLoop() {
    if (isGameOver) return;
    if (!imageLoaded) { /* Loading screen */ requestAnimationFrame(gameLoop); return; }

    // Update camera to follow player
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    // Tick down cooldowns
    if (toolCooldown > 0) toolCooldown -= 16; // Approx 1 frame at 60fps

    // Clear canvas and apply camera
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // --- DRAW WORLD OBJECTS ---
    trees.forEach(t => t.draw());
    walls.forEach(w => w.draw());
    bullets.forEach(b => b.draw());
    zombies.forEach(z => z.draw());
    player.draw();
    gun.draw();
    
    // --- UPDATE LOGIC ---
    player.update();
    gun.update();
    bullets.forEach(b => b.update());
    
    if (gameState === 'wave_in_progress') {
        zombies.forEach(z => z.update());
        checkCollisions();
        if (zombies.length === 0) {
            wave++;
            updateUI();
            startIntermission();
        }
    }
    
    // --- RESTORE CANVAS ---
    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'q') { // Toggle build mode
        buildMode = !buildMode;
        updateUI();
    }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
});
window.addEventListener('click', () => {
    if (isGameOver) return;

    if (buildMode) {
        if (wood >= 10) {
            // Snap build position to a grid
            const gridSize = 50;
            const wallX = Math.floor(mouse.worldX / gridSize) * gridSize;
            const wallY = Math.floor(mouse.worldY / gridSize) * gridSize;
            walls.push(new Wall(wallX, wallY, gridSize, gridSize));
            wood -= 10;
            updateUI();
        }
    } else { // Not in build mode
        // Check if clicking on a tree
        let clickedOnTree = false;
        for (let i = trees.length - 1; i >= 0; i--) {
            const tree = trees[i];
            if (Math.hypot(mouse.worldX - tree.x, mouse.worldY - tree.y) < tree.radius && toolCooldown <= 0) {
                tree.health--;
                toolCooldown = 2000; // 2 second cooldown
                if (tree.health <= 0) {
                    wood += 25;
                    trees.splice(i, 1);
                    updateUI();
                }
                clickedOnTree = true;
                break;
            }
        }

        // If not interacting with anything, shoot
        if (!clickedOnTree) {
            const barrelOffset = 30;
            const bulletX = player.x + Math.cos(gun.angle) * barrelOffset;
            const bulletY = player.y + Math.sin(gun.angle) * barrelOffset;
            const velocity = { x: Math.cos(gun.angle) * 10, y: Math.sin(gun.angle) * 10 };
            bullets.push(new Bullet(bulletX, bulletY, 5, 'yellow', velocity));
        }
    }
});

restartBtn.addEventListener('click', startGame);
startWaveBtn.addEventListener('click', startNextWave);

// --- Start the game ---
startGame();
