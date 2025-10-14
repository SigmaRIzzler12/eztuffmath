// --- Basic Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1000;
canvas.height = 700;

// --- UI Elements ---
const healthBar = document.getElementById('health-bar');
const waveDisplay = document.getElementById('wave-display');
const gameOverScreen = document.getElementById('game-over-screen');
const finalWaveCount = document.getElementById('final-wave-count');
const restartBtn = document.getElementById('restart-btn');

// --- Game State ---
let player;
let bullets = [];
let zombies = [];
let keys = {};
let mouse = { x: 0, y: 0 };
let wave = 1;
let isGameOver = false;

// --- Game Classes ---
class Player {
    constructor(x, y, radius, color, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.health = 100;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        if (keys['w'] && this.y - this.radius > 0) this.y -= this.speed;
        if (keys['s'] && this.y + this.radius < canvas.height) this.y += this.speed;
        if (keys['a'] && this.x - this.radius > 0) this.x -= this.speed;
        if (keys['d'] && this.x + this.radius < canvas.width) this.x += this.speed;
    }
}

class Bullet {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

class Zombie {
    constructor(x, y, radius, color, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }
}

// --- Game Logic ---
function startGame() {
    isGameOver = false;
    wave = 1;
    player = new Player(canvas.width / 2, canvas.height / 2, 15, 'cyan', 3);
    player.health = 100;
    bullets = [];
    zombies = [];
    gameOverScreen.style.display = 'none';
    spawnZombies();
    updateUI();
    gameLoop();
}

function spawnZombies() {
    const zombieCount = wave * 2;
    for (let i = 0; i < zombieCount; i++) {
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - 20 : canvas.width + 20;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - 20 : canvas.height + 20;
        }
        zombies.push(new Zombie(x, y, 12, 'red', 1 + wave * 0.1));
    }
}

function updateUI() {
    healthBar.style.width = player.health + '%';
    healthBar.style.backgroundColor = player.health > 50 ? '#2ecc71' : player.health > 25 ? '#f1c40f' : '#e74c3c';
    waveDisplay.innerText = `WAVE: ${wave}`;
}

function checkCollisions() {
    // Bullets and Zombies
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = zombies.length - 1; j >= 0; j--) {
            const dist = Math.hypot(bullets[i].x - zombies[j].x, bullets[i].y - zombies[j].y);
            if (dist - zombies[j].radius - bullets[i].radius < 1) {
                zombies.splice(j, 1);
                bullets.splice(i, 1);
                break;
            }
        }
    }

    // Player and Zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
        const dist = Math.hypot(player.x - zombies[i].x, player.y - zombies[i].y);
        if (dist - zombies[i].radius - player.radius < 1) {
            player.health -= 10;
            zombies.splice(i, 1);
            updateUI();
            if (player.health <= 0) {
                gameOver();
            }
        }
    }
}

function gameOver() {
    isGameOver = true;
    finalWaveCount.innerText = wave;
    gameOverScreen.style.display = 'flex';
}

// --- Animation Loop ---
function gameLoop() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update();
    player.draw();

    bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        if (bullet.x + bullet.radius < 0 || bullet.x - bullet.radius > canvas.width ||
            bullet.y + bullet.radius < 0 || bullet.y - bullet.radius > canvas.height) {
            bullets.splice(index, 1);
        }
    });

    zombies.forEach(zombie => {
        zombie.update();
        zombie.draw();
    });

    checkCollisions();

    if (zombies.length === 0) {
        wave++;
        updateUI();
        spawnZombies();
    }

    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
window.addEventListener('click', () => {
    if (isGameOver) return;
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const velocity = {
        x: Math.cos(angle) * 8,
        y: Math.sin(angle) * 8
    };
    bullets.push(new Bullet(player.x, player.y, 5, 'yellow', velocity));
});

restartBtn.addEventListener('click', startGame);

// --- Start the game ---
startGame();
