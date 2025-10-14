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
function setWeaponStats() {
    switch(player.equipped) {
        case 'rifle': player.damage = 8; player.fireRate = 100; break;
        case 'shotgun': player.damage = 12; player.fireRate = 800; break;
        case 'pistol': default: player.damage = 10; player.fireRate = 400; break;
    }
}

function gameLoop() { if (gameState.gameOver) return; updateGame(); drawGame(); requestAnimationFrame(gameLoop); }

function updateGame() {
    if (shopOpen) return;
    let dx = 0, dy = 0; if (keys['w']) dy -= 1; if (keys['s']) dy += 1; if (keys['a']) dx -= 1; if (keys['d']) dx += 1;
    if (dx !== 0 || dy !== 0) { const len = Math.sqrt(dx * dx + dy * dy); player.x += (dx / len) * player.speed; player.y += (dy / len) * player.speed; player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x)); player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y)); }
    camera.x = player.x - canvas.width / 2; camera.y = player.y - canvas.height / 2; camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x)); camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));
    for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.x += b.vx; b.y += b.vy; if (b.x < 0 || b.x > WORLD_SIZE || b.y < 0 || b.y > WORLD_SIZE) { bullets.splice(i, 1); } }
    for (const z of zombies) { const z_dx = player.x - z.x; const z_dy = player.y - z.y; const dist = Math.hypot(z_dx, z_dy); if (dist > 0) { z.x += (z_dx / dist) * z.speed; z.y += (z_dy / dist) * z.speed; } }
    handleCollisions();
    if (gameState.phase === 'wave' && zombies.length === 0) { endWave(); }
}

function handleCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let hit = false;
        for (const wall of walls) {
            if (b.x > wall.x && b.x < wall.x + wall.width && b.y > wall.y && b.y < wall.y + wall.height) {
                bullets.splice(i, 1);
                hit = true;
                break;
            }
        }
        if (hit) continue;
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
    let itemKey = player.equipped;
    let imgToDraw;
    if (itemKey === 'pistol') imgToDraw = images.gun;
    if (itemKey === 'rifle') imgToDraw = images.gun1;
    if (itemKey === 'shotgun') imgToDraw = images.gun2;
    if (itemKey === 'axe') imgToDraw = images.axe;
    if (itemKey === 'pickaxe') imgToDraw = images.pickaxe;
    if (imgToDraw && imgToDraw.complete) {
        const isGun = ['pistol', 'rifle', 'shotgun'].includes(itemKey);
        const itemWidth = isGun ? 40 : 40;
        const itemHeight = isGun ? 20 : 40;
        ctx.drawImage(imgToDraw, 10, -itemHeight / 2, itemWidth, itemHeight);
    }
    ctx.restore();
}

function drawResource(res) {
    if (res.radius === TREE_SIZE) {
        const treeImg = images.tree;
        if (treeImg && treeImg.complete) {
            const size = res.radius * 3;
            ctx.drawImage(treeImg, res.x - size / 2, res.y - size / 1.5, size, size);
        } else {
            ctx.fillStyle = '#2d5016';
            ctx.beginPath();
            ctx.arc(res.x, res.y, res.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        const rockImg = images.rock;
        if (rockImg && rockImg.complete) {
            const size = res.radius * 2.5;
            ctx.drawImage(rockImg, res.x - size / 2, res.y - size / 2, size, size);
        } else {
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(res.x, res.y, res.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    if (res.health < res.maxHealth) {
        drawHealthBar(res, res.radius === TREE_SIZE ? '#4CAF50' : '#999');
    }
}

function drawHealthBar(entity, color) {
    const barWidth = 2 * entity.radius;
    const barHeight = 5;
    const yOffset = entity.radius + 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(entity.x - barWidth / 2, entity.y - yOffset, barWidth, barHeight);
    ctx.fillStyle = color;
    ctx.fillRect(entity.x - barWidth / 2, entity.y - yOffset, barWidth * (entity.health / entity.maxHealth), barHeight);
}

function startIntermission() {
    gameState.phase = "intermission";
    gameState.intermissionTimer = INTERMISSION_TIME;
    timerContainer.classList.remove("hidden");
    startWaveBtn.classList.remove("hidden");
    intermissionInterval = setInterval(() => {
        gameState.intermissionTimer--;
        updateUI();
        if (gameState.intermissionTimer <= 0) {
            startWave();
        }
    }, 1000);
}

function startWave() {
    if (gameState.phase !== "intermission") return;
    clearInterval(intermissionInterval);
    gameState.phase = "wave";
    startWaveBtn.classList.add("hidden");
    timerContainer.classList.add("hidden");
    spawnZombies();
}

function endWave() {
    gameState.wave++;
    updateUI();
    checkRespawns();
    startIntermission();
}

function checkRespawns() {
    const RESPAWN_WAVE_COUNT = 5;
    const BUILD_CHECK_RADIUS = 100;
    for (let i = destroyedResources.length - 1; i >= 0; i--) {
        const res = destroyedResources[i];
        if (gameState.wave >= res.destroyedAtWave + RESPAWN_WAVE_COUNT) {
            let canRespawn = true;
            for (const wall of walls) {
                if (Math.hypot(res.x - (wall.x + WALL_SIZE / 2), res.y - (wall.y + WALL_SIZE / 2)) < BUILD_CHECK_RADIUS) {
                    canRespawn = false;
                    break;
                }
            }
            if (canRespawn) {
                if (res.type === 'tree') {
                    trees.push({ x: res.x, y: res.y, health: 10, maxHealth: 10, radius: TREE_SIZE });
                } else if (res.type === 'rock') {
                    rocks.push({ x: res.x, y: res.y, health: 15, maxHealth: 15, radius: ROCK_SIZE });
                }
                destroyedResources.splice(i, 1);
            }
        }
    }
}

function updateUI() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthBar.style.setProperty('--health-width', healthPercent + '%');
    healthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
    woodCountEl.textContent = player.resources.wood;
    stoneCountEl.textContent = player.resources.stone;
    cashCountEl.textContent = player.resources.cash;
    waveNumberEl.textContent = gameState.wave;
    timerEl.textContent = gameState.intermissionTimer;
    const equippedKey = player.equipped;
    let displayName = 'Pistol';
    let imgKey = 'gun';
    let slot = 1;
    if (equippedKey === 'rifle') { displayName = 'Rifle'; imgKey = 'gun1'; }
    if (equippedKey === 'shotgun') { displayName = 'Shotgun'; imgKey = 'gun2'; }
    if (equippedKey === 'axe') { displayName = 'Axe'; imgKey = 'axe'; slot = 2; }
    if (equippedKey === 'pickaxe') { displayName = 'Pickaxe'; imgKey = 'pickaxe'; slot = 3; }
    equippedItemImgEl.src = images[imgKey]?.src || '';
    equippedItemNameEl.textContent = `[${slot}] ${displayName}`;
}

function showFeedback(message) {
    feedbackMessageEl.textContent = message;
    feedbackMessageEl.classList.remove('hidden');
    setTimeout(() => {
        feedbackMessageEl.classList.add('hidden');
    }, 2000);
}

function handleKeyPress(e) {
    if (gameState.gameOver || shopOpen) {
        if (e.key.toLowerCase() === 'b' && shopOpen) {
            toggleShop();
        }
        return;
    }
    const key = e.key.toLowerCase();
    if (key === '1') {
        const guns = ['pistol', 'rifle', 'shotgun'];
        const ownedGuns = guns.filter(g => player.inventory[g]);
        const currentIndex = ownedGuns.indexOf(player.equipped);
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % ownedGuns.length;
            player.equipped = ownedGuns[nextIndex];
        } else {
            player.equipped = ownedGuns[0];
        }
        setWeaponStats();
        updateUI();
    }
    if (key === '2' && player.inventory.axe) {
        player.equipped = 'axe';
        updateUI();
    }
    if (key === '3' && player.inventory.pickaxe) {
        player.equipped = 'pickaxe';
        updateUI();
    }
    if (key === 'b' && gameState.phase === 'intermission') {
        toggleShop();
    }
    if (key === 'q' && gameState.phase === 'intermission') {
        placeWall();
    }
}

function handleMouseDown() {
    if (gameState.gameOver || shopOpen) return;
    const now = Date.now();
    const isGun = ['pistol', 'rifle', 'shotgun'].includes(player.equipped);
    if (isGun) {
        if (now - lastActionTime >= player.fireRate) {
            lastActionTime = now;
            shoot();
        }
    } else {
        if (now - lastActionTime >= 500) {
            lastActionTime = now;
            if (player.equipped === 'axe') useAxe();
            if (player.equipped === 'pickaxe') usePickaxe();
        }
    }
}

function shoot() {
    const fireLocation = {
        x: player.x + Math.cos(player.angle) * 20,
        y: player.y + Math.sin(player.angle) * 20
    };
    if (player.equipped === 'shotgun') {
        const spread = 0.25;
        for (let i = -1; i <= 1; i++) {
            const angle = player.angle + (i * spread);
            bullets.push({
                x: fireLocation.x,
                y: fireLocation.y,
                vx: Math.cos(angle) * BULLET_SPEED,
                vy: Math.sin(angle) * BULLET_SPEED,
                radius: BULLET_SIZE,
                damage: player.damage
            });
        }
    } else {
        bullets.push({
            x: fireLocation.x,
            y: fireLocation.y,
            vx: Math.cos(player.angle) * BULLET_SPEED,
            vy: Math.sin(player.angle) * BULLET_SPEED,
            radius: BULLET_SIZE,
            damage: player.damage
        });
    }
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
    walls.push({
        x: gridX,
        y: gridY,
        width: WALL_SIZE,
        height: WALL_SIZE
    });
    showFeedback("Wall Placed!");
    updateUI();
}

function useAxe() {
    if (gameState.phase !== 'intermission') return;
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        if (Math.hypot(player.x - tree.x, player.y - tree.y) < GATHER_RANGE) {
            tree.health--;
            if (tree.health <= 0) {
                player.resources.wood += 20;
                destroyedResources.push({
                    x: tree.x,
                    y: tree.y,
                    type: 'tree',
                    destroyedAtWave: gameState.wave
                });
                trees.splice(i, 1);
                showFeedback("+20 Wood");
            } else {
                showFeedback("Chop!");
            }
            updateUI();
            return;
        }
    }
}

function usePickaxe() {
    if (gameState.phase !== 'intermission') return;
    for (let i = rocks.length - 1; i >= 0; i--) {
        const rock = rocks[i];
        if (Math.hypot(player.x - rock.x, player.y - rock.y) < GATHER_RANGE) {
            rock.health--;
            if (rock.health <= 0) {
                player.resources.stone += 10;
                destroyedResources.push({
                    x: rock.x,
                    y: rock.y,
                    type: 'rock',
                    destroyedAtWave: gameState.wave
                });
                rocks.splice(i, 1);
                showFeedback("+10 Stone");
            } else {
                showFeedback("Mine!");
            }
            updateUI();
            return;
        }
    }
}

function toggleShop() {
    if (gameState.phase !== 'intermission' && !shopOpen) return;
    if (gameState.gameOver) return;
    shopOpen = !shopOpen;
    orderStation.classList.toggle("hidden", !shopOpen);
}

function buyItem(item, cost) {
    if (player.resources.cash < cost) return;
    player.resources.cash -= cost;
    if (item === 'pickaxe') {
        player.inventory.pickaxe = true;
    } else {
        player.inventory[item] = true;
        player.equipped = item;
        setWeaponStats();
    }
    const btn = document.querySelector(`.buy-btn[data-item="${item}"]`);
    btn.disabled = true;
    btn.nextElementSibling.classList.remove('hidden');
    updateUI();
}

function gameOver() {
    gameState.gameOver = true;
    clearInterval(intermissionInterval);
    finalWaveEl.textContent = gameState.wave;
    gameOverScreen.classList.remove("hidden");
}

function generateRocks() {
    const cX = WORLD_SIZE / 2,
        cY = WORLD_SIZE / 2,
        iR = 900,
        oR = 1300;
    for (let i = 0; i < 40; i++) {
        const a = Math.random() * 2 * Math.PI,
            d = iR + Math.random() * (oR - iR);
        rocks.push({
            x: cX + Math.cos(a) * d,
            y: cY + Math.sin(a) * d,
            health: 15,
            maxHealth: 15,
            radius: ROCK_SIZE
        });
    }
}

function generateTrees() {
    const cX = WORLD_SIZE / 2,
        cY = WORLD_SIZE / 2,
        iR = 400,
        oR = 800;
    for (let i = 0; i < 60; i++) {
        const a = Math.random() * 2 * Math.PI,
            d = iR + Math.random() * (oR - iR);
        trees.push({
            x: cX + Math.cos(a) * d,
            y: cY + Math.sin(a) * d,
            health: 10,
            maxHealth: 10,
            radius: TREE_SIZE
        });
    }
}

function drawZombie(z) {
    ctx.fillStyle = "#2d5c2d";
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, 2 * Math.PI);
    ctx.fill();
    drawHealthBar(z, "#ff4444");
}

function drawWall(wall) {
    ctx.fillStyle = "#8B4513";
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
}

function drawBullet(b) {
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
    ctx.fill();
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    handleKeyPress(e);
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
    player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.y);
});
canvas.addEventListener('mousedown', handleMouseDown);
startWaveBtn.addEventListener('click', startWave);
playAgainBtn.addEventListener('click', init);
document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => buyItem(btn.dataset.item, parseInt(btn.dataset.cost)));
});

init();
