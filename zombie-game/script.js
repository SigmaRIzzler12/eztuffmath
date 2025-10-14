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

// --- NEW: Image Loading (Gun Only) ---
const gunImage = new Image();
gunImage.src = 'gun.png';

let imageLoaded = false;
gunImage.onload = () => {
    imageLoaded = true;
};

// --- Game State ---
let player;
let gun;
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
        this.color = color; // Color is back
        this.speed = speed;
        this.health = 100;
    }

    draw() {
        // Reverted to drawing a circle
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

// NEW: Gun Class
class Gun {
    constructor(player) {
        this.player = player;
        this.angle = 0;
        this.width = 60;
        this.height = 30;
    }
    
    update() {
        this.angle = Math.atan2(mouse.y - this.player.y, mouse.x - this.player.x);
    }

    draw() {
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.angle);
        ctx.drawImage(gunImage, 0, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, radius, color, velocity) { this.x = x; this.y = y; this.radius = radius; this.color = color; this.velocity = velocity; }
    draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; }
}

class Zombie {
    constructor(x, y, radius, color, speed) { this.x = x; this.y = y; this.radius = radius; this.color = color; this.speed = speed; }
    draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
    update() { const angle = Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; }
}

// --- Game Logic ---
function startGame() {
    isGameOver = false;
    wave = 1;
    // Player is now back to its original size and has a color
    player = new Player(canvas.width / 2, canvas.height / 2, 15, 'cyan', 3);
    gun = new Gun(player);
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
        if (Math.random() < 0.5) { x = Math.random() < 0.5 ? 0 - 20 : canvas.width + 20; y = Math.random() * canvas.height; }
        else { x = Math.random() * canvas.width; y = Math.random() < 0.5 ? 0 - 20 : canvas.height + 20; }
        zombies.push(new Zombie(x, y, 12, 'red', 1 + wave * 0.1));
    }
}

function updateUI() {
    healthBar.style.width = player.health + '%';
    healthBar.style.backgroundColor = player.health > 50 ? '#2ecc71' : player.health > 25 ? '#f1c40f' : '#e74c3c';
    waveDisplay.innerText = `WAVE: ${wave}`;
}

function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = zombies.length - 1; j >= 0; j--) {
            const dist = Math.hypot(bullets[i].x - zombies[j].x, bullets[i].y - zombies[j].y);
            if (dist - zombies[j].radius - bullets[i].radius < 1) { zombies.splice(j, 1); bullets.splice(i, 1); break; }
        }
    }
    for (let i = zombies.length - 1; i >= 0; i--) {
        const dist = Math.hypot(player.x - zombies[i].x, player.y - zombies[i].y);
        if (dist - zombies[i].radius - player.radius < 1) { player.health -= 10; zombies.splice(i, 1); updateUI(); if (player.health <= 0) { gameOver(); } }
    }
}

function gameOver() { isGameOver = true; finalWaveCount.innerText = wave; gameOverScreen.style.display = 'flex'; }

// --- Animation Loop ---
function gameLoop() {
    if (isGameOver) return;
    if (!imageLoaded) { ctx.fillStyle = 'white'; ctx.font = '30px Courier New'; ctx.fillText('Loading Assets...', canvas.width / 2 - 150, canvas.height / 2); requestAnimationFrame(gameLoop); return; }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.update();
    player.draw();
    gun.update();
    gun.draw();

    bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) { bullets.splice(index, 1); }
    });

    zombies.forEach(zombie => { zombie.update(); zombie.draw(); });
    checkCollisions();

    if (zombies.length === 0) { wave++; updateUI(); spawnZombies(); }
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
window.addEventListener('mousemove', (e) => { const rect = canvas.getBoundingClientRect(); mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; });
window.addEventListener('click', () => {
    if (isGameOver || !imageLoaded) return;
    const barrelOffset = 30;
    const bulletX = player.x + Math.cos(gun.angle) * barrelOffset;
    const bulletY = player.y + Math.sin(gun.angle) * barrelOffset;
    const velocity = { x: Math.cos(gun.angle) * 8, y: Math.sin(gun.angle) * 8 };
    bullets.push(new Bullet(bulletX, bulletY, 5, 'yellow', velocity));
});

restartBtn.addEventListener('click', startGame);

// --- Start the game ---
startGame();
