// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- UI Elements ---
const feedbackMessageEl = document.getElementById('feedback-message');
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

// --- Game Constants ---
const WORLD_SIZE = 3000;
const GRID_SIZE = 50;
const PLAYER_SIZE = 20;
const GATHER_RANGE = 50; // How close player must be to gather
const ZOMBIE_SIZE = 18;
const TREE_SIZE = 30;
const ROCK_SIZE = 25;
const WALL_SIZE = 50;
const BULLET_SIZE = 5;
const BULLET_SPEED = 12;
const INTERMISSION_TIME = 60;

// --- Game State ---
let gameState = { phase: 'intermission', wave: 1, intermissionTimer: INTERMISSION_TIME, gameOver: false };
let player, zombies, trees, rocks, walls, bullets;
let keys = {}, mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let shopOpen = false;
let camera = { x: 0, y: 0 };
let lastShotTime = 0;
let intermissionInterval;

// --- Gun Image ---
let gunImg = new Image();
gunImg.src = 'gun.png';
let gunLoaded = false;
gunImg.onload = () => { gunLoaded = true; };

// --- Initialization ---
function init() {
    // Reset state
    gameState = { phase: 'intermission', wave: 1, intermissionTimer: INTERMISSION_TIME, gameOver: false };
    player = {
        x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: PLAYER_SIZE, speed: 4, health: 100, maxHealth: 100,
        angle: 0, resources: { wood: 0, stone: 0, cash: 100 }, inventory: { axe: true, pickaxe: false, betterGun: false },
        lastChopTime: 0, damage: 10, fireRate: 300
    };
    zombies = []; trees = []; rocks = []; walls = []; bullets = [];
    shopOpen = false;
    
    // Generate world
    generateTrees();
    generateRocks();

    // Reset UI
    gameOverScreen.classList.add('hidden');
    orderStation.classList.add('hidden');
    startWaveBtn.classList.remove('hidden');
    timerContainer.classList.remove('hidden');
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.disabled = false;
        const ownedEl = btn.nextElementSibling;
        if(ownedEl && ownedEl.classList.contains('owned')) {
            ownedEl.classList.add('hidden');
        }
    });

    updateUI();
    startIntermission();
    gameLoop();
}

function generateTrees() {
    const centerX = WORLD_SIZE / 2, centerY = WORLD_SIZE / 2;
    const innerRadius = 400, outerRadius = 800;
    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        trees.push({ x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance, health: 10, maxHealth: 10, radius: TREE_SIZE });
    }
}

function generateRocks() {
    const centerX = WORLD_SIZE / 2, centerY = WORLD_SIZE / 2;
    const innerRadius = 900, outerRadius = 1300;
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        rocks.push({ x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance, health: 15, maxHealth: 15, radius: ROCK_SIZE });
    }
}

// --- Game Loop and Updates ---
function gameLoop() {
    if (gameState.gameOver) return;
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function updateGame() {
    if (shopOpen) return;

    // Player movement
    let dx = 0, dy = 0;
    if (keys['w']) dy -= 1;
    if (keys['s']) dy += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        player.x += (dx / len) * player.speed;
        player.y += (dy / len) * player.speed;
        player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y));
    }

    // Update camera to follow player
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0 || b.x > WORLD_SIZE || b.y < 0 || b.y > WORLD_SIZE) {
            bullets.splice(i, 1);
        }
    }

    // Update zombies
    for (const z of zombies) {
        const z_dx = player.x - z.x;
        const z_dy = player.y - z.y;
        const dist = Math.hypot(z_dx, z_dy);
        if (dist > 0) {
            z.x += (z_dx / dist) * z.speed;
            z.y += (z_dy / dist) * z.speed;
        }
    }

    handleCollisions();

    if (gameState.phase === 'wave' && zombies.length === 0) {
        endWave();
    }
}

function handleCollisions() {
    // Bullets vs Zombies & Walls
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let hit = false;
        // vs Walls
        for (const wall of walls) {
            if (b.x > wall.x && b.x < wall.x + wall.width && b.y > wall.y && b.y < wall.y + wall.height) {
                bullets.splice(i, 1);
                hit = true;
                break;
            }
        }
        if (hit) continue;
        // vs Zombies
        for (let j = zombies.length - 1; j >= 0; j--) {
            const z = zombies[j];
            if (Math.hypot(b.x - z.x, b.y - z.y) < z.radius + b.radius) {
                z.health -= b.damage;
                bullets.splice(i, 1);
                if (z.health <= 0) {
                    player.resources.cash += 10;
                    zombies.splice(j, 1);
                    updateUI();
                }
                hit = true;
                break;
            }
        }
        if (hit) continue;
    }

    // Zombies vs Player
    for (const z of zombies) {
        if (Math.hypot(z.x - player.x, z.y - player.y) < z.radius + player.radius) {
            player.health -= z.damage;
            if (player.health <= 0) {
                player.health = 0;
                gameOver();
            }
            updateUI();
        }
    }
}

// --- Drawing ---
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    trees.forEach(drawResource);
    rocks.forEach(drawResource);
    walls.forEach(drawWall);
    zombies.forEach(drawZombie);
    bullets.forEach(drawBullet);
    drawPlayer();

    ctx.restore();
}

function drawPlayer() {
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (gunLoaded) {
        const gunWidth = player.inventory.betterGun ? 40 : 30;
        const gunHeight = player.inventory.betterGun ? 20 : 15;
        ctx.drawImage(gunImg, 10, -gunHeight / 2, gunWidth, gunHeight);
    } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(10, -5, 25, 10);
    }
    ctx.restore();
}

function drawZombie(z) {
    ctx.fillStyle = '#2d5c2d';
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    ctx.fill();
    drawHealthBar(z, '#ff4444');
}

function drawWall(wall) {
    ctx.fillStyle = '#8B4513';
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
}

function drawBullet(b) {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawResource(res) {
    ctx.fillStyle = res.radius === TREE_SIZE ? '#2d5016' : '#666';
    ctx.beginPath();
    ctx.arc(res.x, res.y, res.radius, 0, Math.PI * 2);
    ctx.fill();
    if (res.health < res.maxHealth) {
        drawHealthBar(res, res.radius === TREE_SIZE ? '#4CAF50' : '#999');
    }
}

function drawHealthBar(entity, color) {
    const barWidth = entity.radius * 2;
    const barHeight = 5;
    const yOffset = entity.radius + 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(entity.x - barWidth / 2, entity.y - yOffset, barWidth, barHeight);
    ctx.fillStyle = color;
    ctx.fillRect(entity.x - barWidth / 2, entity.y - yOffset, barWidth * (entity.health / entity.maxHealth), barHeight);
}

// --- Wave and Game State Logic ---
function startIntermission() {
    gameState.phase = 'intermission';
    gameState.intermissionTimer = INTERMISSION_TIME;
    timerContainer.classList.remove('hidden');
    startWaveBtn.classList.remove('hidden');
    
    intermissionInterval = setInterval(() => {
        gameState.intermissionTimer--;
        updateUI();
        if (gameState.intermissionTimer <= 0) {
            startWave();
        }
    }, 1000);
}

function startWave() {
    if (gameState.phase !== 'intermission') return;
    clearInterval(intermissionInterval);
    gameState.phase = 'wave';
    startWaveBtn.classList.add('hidden');
    timerContainer.classList.add('hidden');
    spawnZombies();
}

function endWave() {
    gameState.wave++;
    updateUI();
    startIntermission();
}

function spawnZombies() {
    const count = 5 + gameState.wave * 3;
    for (let i = 0; i < count; i++) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        switch (side) {
            case 0: x = Math.random() * WORLD_SIZE; y = -ZOMBIE_SIZE; break;
            case 1: x = WORLD_SIZE + ZOMBIE_SIZE; y = Math.random() * WORLD_SIZE; break;
            case 2: x = Math.random() * WORLD_SIZE; y = WORLD_SIZE + ZOMBIE_SIZE; break;
            case 3: x = -ZOMBIE_SIZE; y = Math.random() * WORLD_SIZE; break;
        }
        zombies.push({
            x, y, radius: ZOMBIE_SIZE, speed: 1.5 + gameState.wave * 0.1,
            health: 30 + gameState.wave * 5, maxHealth: 30 + gameState.wave * 5, damage: 5
        });
    }
}

function gameOver() {
    gameState.gameOver = true;
    clearInterval(intermissionInterval);
    finalWaveEl.textContent = gameState.wave;
    gameOverScreen.classList.remove('hidden');
}

// --- UI and Input Handlers ---
function updateUI() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthBar.style.setProperty('--health-width', healthPercent + '%');
    healthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
    
    woodCountEl.textContent = player.resources.wood;
    stoneCountEl.textContent = player.resources.stone;
    cashCountEl.textContent = player.resources.cash;

    waveNumberEl.textContent = gameState.wave;
    timerEl.textContent = gameState.intermissionTimer;
}

function showFeedback(message) {
    feedbackMessageEl.textContent = message;
    feedbackMessageEl.classList.remove('hidden');
    setTimeout(() => {
        feedbackMessageEl.classList.add('hidden');
    }, 2000); // Message disappears after 2 seconds
}

function handleKeyPress(e) {
    if (gameState.gameOver || shopOpen) return;
    const key = e.key.toLowerCase();

    if (key === 'b' && gameState.phase === 'intermission') {
        toggleShop();
    }
    // BUILD with Q
    if (key === 'q' && gameState.phase === 'intermission') {
        placeWall();
    }
    // GATHER with F
    if (key === 'f' && gameState.phase === 'intermission') {
        gatherResource();
    }
}

function handleMouseDown() {
    if (gameState.gameOver || shopOpen) return;
    shoot();
}

function shoot() {
    const now = Date.now();
    if (now - lastShotTime < player.fireRate) return;
    lastShotTime = now;
    
    bullets.push({
        x: player.x + Math.cos(player.angle) * 20,
        y: player.y + Math.sin(player.angle) * 20,
        vx: Math.cos(player.angle) * BULLET_SPEED,
        vy: Math.sin(player.angle) * BULLET_SPEED,
        radius: BULLET_SIZE,
        damage: player.damage
    });
}

function placeWall() {
    if (player.resources.stone < 10) {
        showFeedback("Not enough stone!");
        return;
    }
    const gridX = Math.floor(mouse.worldX / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.floor(mouse.worldY / GRID_SIZE) * GRID_SIZE;
    if (walls.some(w => w.x === gridX && w.y === gridY)) return;
    
    player.resources.stone -= 10;
    walls.push({ x: gridX, y: gridY, width: WALL_SIZE, height: WALL_SIZE });
    showFeedback("Wall Placed!");
    updateUI();
}

function gatherResource() {
    const now = Date.now();
    if (now - player.lastChopTime < 2000) return; // 2-second cooldown

    // Check for nearby trees
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        if (player.inventory.axe && Math.hypot(player.x - tree.x, player.y - tree.y) < GATHER_RANGE) {
            tree.health--;
            player.lastChopTime = now;
            if (tree.health <= 0) {
                player.resources.wood += 20;
                trees.splice(i, 1);
                showFeedback("+20 Wood");
            } else {
                showFeedback("Chop!");
            }
            updateUI();
            return; // Only gather from one resource at a time
        }
    }
    // Check for nearby rocks
    for (let i = rocks.length - 1; i >= 0; i--) {
        const rock = rocks[i];
        if (player.inventory.pickaxe && Math.hypot(player.x - rock.x, player.y - rock.y) < GATHER_RANGE) {
            rock.health--;
            player.lastChopTime = now;
            if (rock.health <= 0) {
                player.resources.stone += 15;
                rocks.splice(i, 1);
                showFeedback("+15 Stone");
            } else {
                showFeedback("Mine!");
            }
            updateUI();
            return; 
        } else if (!player.inventory.pickaxe && Math.hypot(player.x - rock.x, player.y - rock.y) < GATHER_RANGE) {
            showFeedback("You need a pickaxe!");
            return;
        }
    }
}

// --- Shop Logic ---
function toggleShop() {
    if (gameState.phase !== 'intermission' || gameState.gameOver) return;
    shopOpen = !shopOpen;
    orderStation.classList.toggle('hidden', !shopOpen);
}

function buyItem(item, cost) {
    if (player.resources.cash < cost) return;
    player.resources.cash -= cost;
    
    if (item === 'pickaxe') {
        player.inventory.pickaxe = true;
    } else if (item === 'better-gun') {
        player.inventory.betterGun = true;
        player.damage = 25;
        player.fireRate = 150;
    }
    
    const btn = document.querySelector(`.buy-btn[data-item="${item}"]`);
    btn.disabled = true;
    const ownedEl = btn.nextElementSibling;
    if(ownedEl && ownedEl.classList.contains('owned')) {
        ownedEl.classList.remove('hidden');
    }
    
    updateUI();
}

// --- Event Listeners ---
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; handleKeyPress(e); });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
    player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
});
canvas.addEventListener('mousedown', handleMouseDown);
startWaveBtn.addEventListener('click', startWave);
playAgainBtn.addEventListener('click', init);
document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => buyItem(btn.dataset.item, parseInt(btn.dataset.cost)));
});

// --- Start Game ---
init();
