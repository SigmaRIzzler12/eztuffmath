// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game Constants
const WORLD_SIZE = 3000;
const GRID_SIZE = 50;
const PLAYER_SIZE = 20;
const ZOMBIE_SIZE = 18;
const TREE_SIZE = 30;
const ROCK_SIZE = 35;
const WALL_SIZE = 50;
const BULLET_SIZE = 5;
const BULLET_SPEED = 10;
const INTERMISSION_TIME = 60;

// Game State
let gameState = {
    phase: 'intermission', // 'intermission' or 'wave'
    wave: 1,
    intermissionTimer: INTERMISSION_TIME,
    gameOver: false
};

// Player
let player = {
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    radius: PLAYER_SIZE,
    speed: 5,
    health: 100,
    maxHealth: 100,
    angle: 0,
    resources: { wood: 0, stone: 0, cash: 0 },
    inventory: { axe: true, pickaxe: false, betterGun: false },
    lastChopTime: 0,
    damage: 10,
    fireRate: 300
};

// Input
let keys = {};
let mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };
let buildMode = false;
let shopOpen = false;

// Camera
let camera = {
    x: player.x - canvas.width / 2,
    y: player.y - canvas.height / 2
};

// Game Objects
let zombies = [];
let trees = [];
let rocks = [];
let walls = [];
let bullets = [];

// Gun Image
let gunImg = new Image();
gunImg.src = 'gun.png';
let gunLoaded = false;
gunImg.onload = () => { gunLoaded = true; };
gunImg.onerror = () => { console.log('Gun image not found, using rectangle'); };

// Initialize
function init() {
    generateTrees();
    generateRocks();
    updateUI();
    
    // Event Listeners
    window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; handleKeyPress(e); });
    window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', () => { mouse.down = false; });
    document.getElementById('start-wave-btn').addEventListener('click', startWave);
    document.getElementById('close-shop-btn').addEventListener('click', toggleShop);
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
    
    // Shop buy buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => buyItem(e.target.dataset.item, parseInt(e.target.dataset.cost)));
    });
    
    gameLoop();
}

function generateTrees() {
    const centerX = WORLD_SIZE / 2;
    const centerY = WORLD_SIZE / 2;
    const innerRadius = 300;
    const outerRadius = 800;
    
    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        trees.push({
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            health: 10,
            maxHealth: 10,
            radius: TREE_SIZE
        });
    }
}

function generateRocks() {
    const centerX = WORLD_SIZE / 2;
    const centerY = WORLD_SIZE / 2;
    const innerRadius = 900;
    const outerRadius = 1300;
    
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = innerRadius + Math.random() * (outerRadius - innerRadius);
        rocks.push({
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            health: 15,
            maxHealth: 15,
            radius: ROCK_SIZE
        });
    }
}

function handleKeyPress(e) {
    if (gameState.gameOver) return;
    
    if (e.key.toLowerCase() === 'q' && gameState.phase === 'intermission') {
        buildMode = !buildMode;
        document.getElementById('build-mode-indicator').classList.toggle('hidden', !buildMode);
    }
    
    if (e.key.toLowerCase() === 'b' && gameState.phase === 'intermission') {
        toggleShop();
    }
}

function toggleShop() {
    if (gameState.phase !== 'intermission' || gameState.gameOver) return;
    shopOpen = !shopOpen;
    document.getElementById('order-station').classList.toggle('hidden', !shopOpen);
}

function handleMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
    
    // Update player angle
    const dx = mouse.worldX - player.x;
    const dy = mouse.worldY - player.y;
    player.angle = Math.atan2(dy, dx);
}

function handleMouseDown(e) {
    if (gameState.gameOver || shopOpen) return;
    mouse.down = true;
    
    if (buildMode && gameState.phase === 'intermission') {
        placeWall();
    } else {
        // Check for resource gathering
        if (!checkResourceGathering()) {
            // Fire weapon
            shoot();
        }
    }
}

function placeWall() {
    const gridX = Math.floor(mouse.worldX / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.floor(mouse.worldY / GRID_SIZE) * GRID_SIZE;
    
    // Check if wall already exists
    const exists = walls.some(w => w.x === gridX && w.y === gridY);
    if (exists) return;
    
    // Check cost
    if (player.resources.stone >= 10) {
        player.resources.stone -= 10;
        walls.push({ x: gridX, y: gridY, width: WALL_SIZE, height: WALL_SIZE });
        updateUI();
    }
}

function checkResourceGathering() {
    const now = Date.now();
    if (now - player.lastChopTime < 2000) return false;
    
    // Check trees
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        const dist = Math.hypot(mouse.worldX - tree.x, mouse.worldY - tree.y);
        if (dist < tree.radius + 20) {
            if (player.inventory.axe) {
                tree.health--;
                player.lastChopTime = now;
                
                if (tree.health <= 0) {
                    player.resources.wood += 10;
                    trees.splice(i, 1);
                }
                updateUI();
                return true;
            }
        }
    }
    
    // Check rocks
    for (let i = rocks.length - 1; i >= 0; i--) {
        const rock = rocks[i];
        const dist = Math.hypot(mouse.worldX - rock.x, mouse.worldY - rock.y);
        if (dist < rock.radius + 20) {
            if (player.inventory.pickaxe) {
                rock.health--;
                player.lastChopTime = now;
                
                if (rock.health <= 0) {
                    player.resources.stone += 15;
                    rocks.splice(i, 1);
                }
                updateUI();
                return true;
            }
        }
    }
    
    return false;
}

let lastShotTime = 0;

function shoot() {
    const now = Date.now();
    if (now - lastShotTime < player.fireRate) return;
    
    lastShotTime = now;
    
    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(player.angle) * BULLET_SPEED,
        vy: Math.sin(player.angle) * BULLET_SPEED,
        radius: BULLET_SIZE,
        damage: player.damage
    });
}

function buyItem(item, cost) {
    if (player.resources.cash >= cost) {
        player.resources.cash -= cost;
        
        if (item === 'pickaxe') {
            player.inventory.pickaxe = true;
            document.querySelector('[data-item="pickaxe"]').disabled = true;
            document.querySelector('[data-item="pickaxe"]').nextElementSibling.classList.remove('hidden');
        } else if (item === 'better-gun') {
            player.inventory.betterGun = true;
            player.damage = 20;
            player.fireRate = 150;
            document.querySelector('[data-item="better-gun"]').disabled = true;
            document.querySelector('[data-item="better-gun"]').nextElementSibling.classList.remove('hidden');
        }
        
        updateUI();
    }
}

function startWave() {
    if (gameState.phase !== 'intermission') return;
    
    gameState.phase = 'wave';
    buildMode = false;
    document.getElementById('build-mode-indicator').classList.add('hidden');
    document.getElementById('start-wave-btn').classList.add('hidden');
    document.getElementById('timer-container').classList.add('hidden');
    
    spawnZombies();
}

function spawnZombies() {
    const count = 5 + gameState.wave * 3;
    
    for (let i = 0; i < count; i++) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: x = Math.random() * WORLD_SIZE; y = 0; break;
            case 1: x = WORLD_SIZE; y = Math.random() * WORLD_SIZE; break;
            case 2: x = Math.random() * WORLD_SIZE; y = WORLD_SIZE; break;
            case 3: x = 0; y = Math.random() * WORLD_SIZE; break;
        }
        
        zombies.push({
            x, y,
            radius: ZOMBIE_SIZE,
            speed: 1.5 + gameState.wave * 0.1,
            health: 30 + gameState.wave * 5,
            maxHealth: 30 + gameState.wave * 5,
            damage: 5
        });
    }
}

function updateGame() {
    if (gameState.gameOver || shopOpen) return;
    
    // Update intermission timer
    if (gameState.phase === 'intermission') {
        gameState.intermissionTimer -= 1/60;
        if (gameState.intermissionTimer <= 0) {
            startWave();
        }
        updateTimerUI();
    }
    
    // Player movement
    let dx = 0, dy = 0;
    if (keys['w']) dy -= 1;
    if (keys['s']) dy += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;
    
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len; dy /= len;
        player.x += dx * player.speed;
        player.y += dy * player.speed;
        
        // Keep player in bounds
        player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y));
    }
    
    // Update camera
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        
        // Remove if out of bounds
        if (b.x < 0 || b.x > WORLD_SIZE || b.y < 0 || b.y > WORLD_SIZE) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check wall collision
        let hitWall = false;
        for (const wall of walls) {
            if (b.x > wall.x && b.x < wall.x + wall.width &&
                b.y > wall.y && b.y < wall.y + wall.height) {
                hitWall = true;
                break;
            }
        }
        if (hitWall) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check zombie collision
        for (let j = zombies.length - 1; j >= 0; j--) {
            const z = zombies[j];
            const dist = Math.hypot(b.x - z.x, b.y - z.y);
            if (dist < z.radius + b.radius) {
                z.health -= b.damage;
                bullets.splice(i, 1);
                
                if (z.health <= 0) {
                    player.resources.cash += 5;
                    zombies.splice(j, 1);
                    updateUI();
                }
                break;
            }
        }
    }
    
    // Update zombies
    for (const z of zombies) {
        const dx = player.x - z.x;
        const dy = player.y - z.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
            let moveX = (dx / dist) * z.speed;
            let moveY = (dy / dist) * z.speed;
            
            // Wall collision for zombies
            let canMove = true;
            for (const wall of walls) {
                if (z.x + moveX + z.radius > wall.x && z.x + moveX - z.radius < wall.x + wall.width &&
                    z.y + moveY + z.radius > wall.y && z.y + moveY - z.radius < wall.y + wall.height) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove) {
                z.x += moveX;
                z.y += moveY;
            }
        }
        
        // Check player collision
        const playerDist = Math.hypot(z.x - player.x, z.y - player.y);
        if (playerDist < z.radius + player.radius) {
            player.health -= z.damage * 0.1;
            updateUI();
            
            if (player.health <= 0) {
                gameOver();
            }
        }
    }
    
    // Check wave completion
    if (gameState.phase === 'wave' && zombies.length === 0) {
        endWave();
    }
}

function endWave() {
    gameState.phase = 'intermission';
    gameState.wave++;
    gameState.intermissionTimer = INTERMISSION_TIME;
    
    document.getElementById('start-wave-btn').classList.remove('hidden');
    document.getElementById('timer-container').classList.remove('hidden');
    updateUI();
}

function gameOver() {
    gameState.gameOver = true;
    document.getElementById('final-wave').textContent = gameState.wave;
    document.getElementById('game-over').classList.remove('hidden');
}

function resetGame() {
    // Reset game state
    gameState = { phase: 'intermission', wave: 1, intermissionTimer: INTERMISSION_TIME, gameOver: false };
    player = {
        x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: PLAYER_SIZE, speed: 5,
        health: 100, maxHealth: 100, angle: 0,
        resources: { wood: 0, stone: 0, cash: 0 },
        inventory: { axe: true, pickaxe: false, betterGun: false },
        lastChopTime: 0, damage: 10, fireRate: 300
    };
    
    zombies = [];
    bullets = [];
    trees = [];
    rocks = [];
    walls = [];
    buildMode = false;
    shopOpen = false;
    
    generateTrees();
    generateRocks();
    
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('start-wave-btn').classList.remove('hidden');
    document.getElementById('timer-container').classList.remove('hidden');
    document.getElementById('build-mode-indicator').classList.add('hidden');
    document.getElementById('order-station').classList.add('hidden');
    
    // Reset shop
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.disabled = false;
        btn.nextElementSibling.classList.add('hidden');
    });
    
    updateUI();
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw world background
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(-camera.x, -camera.y, WORLD_SIZE, WORLD_SIZE);
    
    // Draw grid in build mode
    if (buildMode) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
        const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;
        
        for (let x = startX; x < camera.x + canvas.width; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x - camera.x, 0);
            ctx.lineTo(x - camera.x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = startY; y < camera.y + canvas.height; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y - camera.y);
            ctx.lineTo(canvas.width, y - camera.y);
            ctx.stroke();
        }
    }
    
    // Draw trees
    ctx.fillStyle = '#2d5016';
    for (const tree of trees) {
        const screenX = tree.x - camera.x;
        const screenY = tree.y - camera.y;
        
        if (screenX > -50 && screenX < canvas.width + 50 && screenY > -50 && screenY < canvas.height + 50) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, tree.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar
            if (tree.health < tree.maxHealth) {
                const barWidth = tree.radius * 2;
                const barHeight = 5;
                ctx.fillStyle = '#333';
                ctx.fillRect(screenX - barWidth/2, screenY - tree.radius - 10, barWidth, barHeight);
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(screenX - barWidth/2, screenY - tree.radius - 10, barWidth * (tree.health / tree.maxHealth), barHeight);
            }
        }
    }
    
    // Draw rocks
    ctx.fillStyle = '#666';
    for (const rock of rocks) {
        const screenX = rock.x - camera.x;
        const screenY = rock.y - camera.y;
        
        if (screenX > -50 && screenX < canvas.width + 50 && screenY > -50 && screenY < canvas.height + 50) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, rock.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar
            if (rock.health < rock.maxHealth) {
                const barWidth = rock.radius * 2;
                const barHeight = 5;
                ctx.fillStyle = '#333';
                ctx.fillRect(screenX - barWidth/2, screenY - rock.radius - 10, barWidth, barHeight);
                ctx.fillStyle = '#999';
                ctx.fillRect(screenX - barWidth/2, screenY - rock.radius - 10, barWidth * (rock.health / rock.maxHealth), barHeight);
            }
        }
    }
    
    // Draw walls
    ctx.fillStyle = '#8B4513';
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for (const wall of walls) {
        const screenX = wall.x - camera.x;
        const screenY = wall.y - camera.y;
        
        if (screenX > -WALL_SIZE && screenX < canvas.width + WALL_SIZE && 
            screenY > -WALL_SIZE && screenY < canvas.height + WALL_SIZE) {
            ctx.fillRect(screenX, screenY, wall.width, wall.height);
            ctx.strokeRect(screenX, screenY, wall.width, wall.height);
        }
    }
    
    // Draw zombies
    for (const z of zombies) {
        const screenX = z.x - camera.x;
        const screenY = z.y - camera.y;
        
        if (screenX > -50 && screenX < canvas.width + 50 && screenY > -50 && screenY < canvas.height + 50) {
            // Body
            ctx.fillStyle = '#2d5c2d';
            ctx.beginPath();
            ctx.arc(screenX, screenY, z.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(screenX - 5, screenY - 3, 3, 0, Math.PI * 2);
            ctx.arc(screenX + 5, screenY - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar
            const barWidth = z.radius * 2;
            const barHeight = 5;
            ctx.fillStyle = '#333';
            ctx.fillRect(screenX - barWidth/2, screenY - z.radius - 10, barWidth, barHeight);
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(screenX - barWidth/2, screenY - z.radius - 10, barWidth * (z.health / z.maxHealth), barHeight);
        }
    }
    
    // Draw bullets
    ctx.fillStyle = '#ffff00';
    for (const b of bullets) {
        const screenX = b.x - camera.x;
        const screenY = b.y - camera.y;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw player
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw gun
    ctx.save();
    ctx.translate(playerScreenX, playerScreenY);
    ctx.rotate(player.angle);
    
    if (gunLoaded) {
        const gunWidth = 30;
        const gunHeight = 15;
        ctx.drawImage(gunImg, 0, -gunHeight/2, gunWidth, gunHeight);
    } else {
        // Fallback rectangle gun
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -5, 25, 10);
    }
    
    ctx.restore();
}

function updateUI() {
    // Health
    const healthBar = document.getElementById('health-bar');
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthBar.style.setProperty('--health-width', healthPercent + '%');
    healthBar.style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
    
    // Resources
    document.getElementById('wood-count').textContent = player.resources.wood;
    document.getElementById('stone-count').textContent = player.resources.stone;
    document.getElementById('cash-count').textContent = player.resources.cash;
    
    // Wave
    document.getElementById('wave-number').textContent = gameState.wave;
}

function updateTimerUI() {
    const timer = Math.max(0, Math.ceil(gameState.intermissionTimer));
    document.getElementById('timer').textContent = timer;
}

function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Start the game
init();
