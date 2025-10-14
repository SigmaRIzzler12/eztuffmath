// --- Basic Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 800;

// --- World and Camera ---
const world = { width: 3000, height: 3000 };
const camera = { x: 0, y: 0 };

// --- UI Elements ---
const healthBar = document.getElementById('health-bar');
const waveDisplay = document.getElementById('wave-display');
const waveTimerDisplay = document.getElementById('wave-timer');
const woodCountDisplay = document.getElementById('wood-count');
const stoneCountDisplay = document.getElementById('stone-count');
const cashCountDisplay = document.getElementById('cash-count');
const startWaveBtn = document.getElementById('start-wave-btn');
const buildModeIndicator = document.getElementById('build-mode-indicator');
const shopPrompt = document.getElementById('shop-prompt');
const shopMenu = document.getElementById('shop-menu');
const shopItemsContainer = document.getElementById('shop-items');
const closeShopBtn = document.getElementById('close-shop-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const finalWaveCount = document.getElementById('final-wave-count');
const restartBtn = document.getElementById('restart-btn');

// --- Image Loading ---
const gunImage = new Image(); gunImage.src = 'gun.png';
let imageLoaded = false;
gunImage.onload = () => { imageLoaded = true; };

// --- Game State ---
let gameState = 'intermission';
let player, gun;
let bullets = [], zombies = [], walls = [], trees = [], rocks = [];
let keys = {}, mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let wave = 1, cash = 100, wood = 0, stone = 0;
let isGameOver = false, isShopOpen = false, buildMode = false;
let toolCooldown = 0, intermissionTimer = 60;
let countdownInterval;

// --- Shop Definition ---
const shopDefinition = {
    pickaxe: { name: 'Pickaxe', cost: 100, type: 'tool' },
    shotgun: { name: 'Shotgun', cost: 250, type: 'weapon' },
};

// --- Game Classes ---
class Player { /* ... no changes ... */ }
class Gun { /* ... no changes ... */ }
class Bullet { /* ... no changes ... */ }
class Zombie { /* ... no changes ... */ }
class Wall {
    constructor(x, y, size) { this.x = x; this.y = y; this.size = size; }
    draw() { ctx.fillStyle = '#A9A9A9'; ctx.fillRect(this.x, this.y, this.size, this.size); }
}
class Tree { /* ... no changes ... */ }
class Rock {
    constructor(x, y) { this.x = x; this.y = y; this.radius = 20; this.health = 15; }
    draw() { ctx.fillStyle = '#808080'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
}

// --- Game Logic ---
function startGame() {
    isGameOver = false; isShopOpen = false; buildMode = false;
    gameState = 'intermission';
    wave = 1; cash = 100; wood = 0; stone = 0;
    player = new Player(world.width / 2, world.height / 2, 15, 'cyan', 4);
    player.health = 100;
    player.tools = { axe: true, pickaxe: false };
    gun = new Gun(player);
    bullets = []; zombies = []; walls = []; trees = []; rocks = [];
    gameOverScreen.style.display = 'none';
    shopMenu.style.display = 'none';
    updateUI();
    generateWorld();
    startIntermission();
    gameLoop();
}

function generateWorld() {
    const baseCenter = { x: world.width / 2, y: world.height / 2 };
    // Trees
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const x = baseCenter.x + Math.cos(angle) * (600 + Math.random() * 200);
        const y = baseCenter.y + Math.sin(angle) * (600 + Math.random() * 200);
        trees.push(new Tree(x, y));
    }
    // Rocks
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const x = baseCenter.x + Math.cos(angle) * (1000 + Math.random() * 300);
        const y = baseCenter.y + Math.sin(angle) * (1000 + Math.random() * 300);
        rocks.push(new Rock(x, y));
    }
}

function startIntermission() {
    gameState = 'intermission';
    shopPrompt.style.display = 'block';
    startWaveBtn.style.display = 'block';
    intermissionTimer = 60;
    updateWaveTimer();
    countdownInterval = setInterval(() => {
        intermissionTimer--;
        updateWaveTimer();
        if (intermissionTimer <= 0) startNextWave();
    }, 1000);
}

function startNextWave() {
    if (isShopOpen) toggleShop();
    clearInterval(countdownInterval);
    waveTimerDisplay.innerText = '';
    shopPrompt.style.display = 'none';
    gameState = 'wave_in_progress';
    startWaveBtn.style.display = 'none';
    spawnZombies();
}

function spawnZombies() { /* ... no changes ... */ }

function updateUI() {
    healthBar.style.width = player.health + '%';
    healthBar.style.backgroundColor = player.health > 50 ? '#2ecc71' : player.health > 25 ? '#f1c40f' : '#e74c3c';
    waveDisplay.innerText = `WAVE: ${wave}`;
    woodCountDisplay.innerText = wood;
    stoneCountDisplay.innerText = stone;
    cashCountDisplay.innerText = cash;
    buildModeIndicator.style.display = buildMode ? 'block' : 'none';
}

function updateWaveTimer() { waveTimerDisplay.innerText = `NEXT WAVE: ${intermissionTimer}`; }

function toggleShop() {
    isShopOpen = !isShopOpen;
    shopMenu.style.display = isShopOpen ? 'flex' : 'none';
    if (isShopOpen) populateShop();
}

function populateShop() {
    shopItemsContainer.innerHTML = '';
    for (const key in shopDefinition) {
        const item = shopDefinition[key];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        
        let owned = false;
        if (item.type === 'tool' && player.tools[key]) owned = true;
        // Future weapon check would go here

        itemDiv.innerHTML = `
            <span>${item.name} (${owned ? 'Owned' : '$'+item.cost})</span>
            <button id="buy-${key}">${owned ? 'Equip' : 'Buy'}</button>
        `;
        shopItemsContainer.appendChild(itemDiv);

        const buyButton = document.getElementById(`buy-${key}`);
        if (owned) {
            // Equip logic can be added later
            buyButton.disabled = true;
        } else {
            buyButton.disabled = cash < item.cost;
            buyButton.onclick = () => buyItem(key);
        }
    }
}

function buyItem(key) {
    const item = shopDefinition[key];
    if (cash >= item.cost) {
        cash -= item.cost;
        if (item.type === 'tool') player.tools[key] = true;
        updateUI();
        populateShop(); // Refresh shop to update button states
    }
}

function checkCollisions() {
    // Bullet-Zombie
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = zombies.length - 1; j >= 0; j--) {
            if (Math.hypot(bullets[i].x - zombies[j].x, bullets[i].y - zombies[j].y) < zombies[j].radius) {
                zombies.splice(j, 1); bullets.splice(i, 1); cash += 10; updateUI(); break;
            }
        }
    }
    // Player-Zombie
    for (let i = zombies.length - 1; i >= 0; i--) {
        if (Math.hypot(player.x - zombies[i].x, player.y - zombies[i].y) < player.radius + zombies[i].radius) {
            player.health -= 10; zombies.splice(i, 1); updateUI(); if (player.health <= 0) gameOver();
        }
    }
}

function gameOver() {
    isGameOver = true; clearInterval(countdownInterval); finalWaveCount.innerText = wave;
    gameOverScreen.style.display = 'flex';
}

// --- Animation Loop ---
function gameLoop() {
    if (isGameOver) return;
    if (!imageLoaded) { requestAnimationFrame(gameLoop); return; }

    camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2;
    if (toolCooldown > 0) toolCooldown -= 16; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(-camera.x, -camera.y);

    // Draw world
    trees.forEach(t => t.draw()); rocks.forEach(r => r.draw()); walls.forEach(w => w.draw());
    bullets.forEach(b => b.draw()); zombies.forEach(z => z.draw());
    player.draw(); gun.draw();
    
    // Update logic
    if (!isShopOpen) {
        player.update();
        gun.update();
        bullets.forEach(b => b.update());
        if (gameState === 'wave_in_progress') { zombies.forEach(z => z.update()); checkCollisions(); if (zombies.length === 0) { wave++; updateUI(); startIntermission(); } }
    }
    
    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key.toLowerCase() === 'q' && gameState === 'intermission' && !isShopOpen) { buildMode = !buildMode; updateUI(); }
    if (e.key.toLowerCase() === 'b' && gameState === 'intermission') toggleShop();
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect(); mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    mouse.worldX = mouse.x + camera.x; mouse.worldY = mouse.y + camera.y;
});
window.addEventListener('click', () => {
    if (isGameOver || isShopOpen) return;

    if (buildMode) {
        if (stone >= 10) {
            const gridSize = 50; const wallX = Math.floor(mouse.worldX / gridSize) * gridSize; const wallY = Math.floor(mouse.worldY / gridSize) * gridSize;
            walls.push(new Wall(wallX, wallY, gridSize)); stone -= 10; updateUI();
        }
    } else {
        let interacted = false;
        if (toolCooldown <= 0) {
            // Chop trees
            if (player.tools.axe) {
                for (let i = trees.length - 1; i >= 0; i--) {
                    const tree = trees[i];
                    if (Math.hypot(mouse.worldX - tree.x, mouse.worldY - tree.y) < tree.radius) {
                        tree.health--; toolCooldown = 2000;
                        if (tree.health <= 0) { wood += 25; trees.splice(i, 1); updateUI(); }
                        interacted = true; break;
                    }
                }
            }
            // Mine rocks
            if (!interacted && player.tools.pickaxe) {
                for (let i = rocks.length - 1; i >= 0; i--) {
                    const rock = rocks[i];
                    if (Math.hypot(mouse.worldX - rock.x, mouse.worldY - rock.y) < rock.radius) {
                        rock.health--; toolCooldown = 2000;
                        if (rock.health <= 0) { stone += 20; rocks.splice(i, 1); updateUI(); }
                        interacted = true; break;
                    }
                }
            }
        }
        // Shoot gun
        if (!interacted) {
            const barrelOffset = 30; const bulletX = player.x + Math.cos(gun.angle) * barrelOffset; const bulletY = player.y + Math.sin(gun.angle) * barrelOffset;
            const velocity = { x: Math.cos(gun.angle) * 10, y: Math.sin(gun.angle) * 10 };
            bullets.push(new Bullet(bulletX, bulletY, 5, 'yellow', velocity));
        }
    }
});

restartBtn.addEventListener('click', startGame);
startWaveBtn.addEventListener('click', startNextWave);
closeShopBtn.addEventListener('click', toggleShop);

// --- Dummy class definitions for unchanged classes ---
class Player { constructor(x, y, radius, color, speed) { this.x = x; this.y = y; this.radius = radius; this.color = color; this.speed = speed; this.health = 100; } draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); } update() { if (keys['w'] && this.y - this.radius > 0) this.y -= this.speed; if (keys['s'] && this.y + this.radius < world.height) this.y += this.speed; if (keys['a'] && this.x - this.radius > 0) this.x -= this.speed; if (keys['d'] && this.x + this.radius < world.width) this.x += this.speed; } }
class Gun { constructor(player) { this.player = player; this.angle = 0; this.width = 60; this.height = 30; } update() { this.angle = Math.atan2(mouse.worldY - this.player.y, mouse.worldX - this.player.x); } draw() { ctx.save(); ctx.translate(this.player.x, this.player.y); ctx.rotate(this.angle); ctx.drawImage(gunImage, 0, -this.height / 2, this.width, this.height); ctx.restore(); } }
class Bullet { constructor(x, y, radius, color, velocity) { this.x = x; this.y = y; this.radius = radius; this.color = color; this.velocity = velocity; } draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); } update() { this.x += this.velocity.x; this.y += this.velocity.y; } }
class Zombie { constructor(x, y, radius, color, speed) { this.x = x; this.y = y; this.radius = radius; this.color = color; this.speed = speed; } draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); } update() { const angle = Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } }
class Tree { constructor(x, y) { this.x = x; this.y = y; this.radius = 25; this.health = 10; } draw() { ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); } }

// --- Start the game ---
startGame();
