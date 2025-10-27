const player = document.getElementById('player');
const obstacle = document.getElementById('obstacle');
const scoreDisplay = document.getElementById('score');
const gameContainer = document.getElementById('game-container');

let score = 0;
let isJumping = false;
let gameSpeed = 3;
let gameInterval = null;
let jumpInterval = null;

const groundHeight = 10;
const playerSize = 20;
const obstacleSize = 20;
const jumpHeight = 100;

const PLAYER_X = 50; // Player's fixed left position

// --- Player Jump Logic (Floatier Physics) ---
function jump() {
    if (isJumping) return;
    
    isJumping = true;
    let currentBottom = groundHeight;
    
    // 1. SLOWER RISE
    let jumpVelocity = 10; 

    // Clear previous jump interval if it somehow remained
    clearInterval(jumpInterval);
    
    jumpInterval = setInterval(() => {
        if (jumpVelocity === 0 && currentBottom > groundHeight) {
            // 2. SLOWER FALL (GRAVITY)
            jumpVelocity = -5; 
        } else if (currentBottom >= jumpHeight) {
            jumpVelocity = -5; // Start falling
        }

        currentBottom += jumpVelocity;
        player.style.bottom = `${currentBottom}px`;

        // Stop interval when hitting the ground
        if (currentBottom <= groundHeight && jumpVelocity < 0) {
            clearInterval(jumpInterval);
            player.style.bottom = `${groundHeight}px`;
            isJumping = false;
            jumpInterval = null;
        }
    // 3. SLOWER INTERVAL
    }, 30); 
}


// Listen for Spacebar key press
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        jump();
    }
});

// --- Obstacle & Game Loop Logic ---
function startGame() {
    score = 0;
    gameSpeed = 3;
    scoreDisplay.textContent = `Score: ${score}`;
    
    // Reset player and obstacle position
    player.style.bottom = `${groundHeight}px`;
    obstacle.style.left = '600px'; // Off-screen right

    // Clear any existing intervals
    if (gameInterval !== null) {
        clearInterval(gameInterval);
    }
    if (jumpInterval !== null) {
        clearInterval(jumpInterval);
        jumpInterval = null;
        isJumping = false;
    }
    
    // Start the main game loop
    gameInterval = setInterval(gameLoop, 20);
}

function moveObstacle() {
    let obstacleX = parseInt(obstacle.style.left) || 0;
    
    // Move obstacle left by decreasing its 'left' position
    obstacleX -= gameSpeed;
    obstacle.style.left = `${obstacleX}px`;

    // Reset obstacle when it moves off-screen left
    if (obstacleX < -obstacleSize) {
        obstacle.style.left = `${gameContainer.clientWidth}px`; // Back to starting position
        score++;
        scoreDisplay.textContent = `Score: ${score}`;
        gameSpeed += 0.1; // Increase speed
    }
}

function checkCollision() {
    // 1. Get positions
    const playerY = parseInt(player.style.bottom);
    const obstacleX = parseInt(obstacle.style.left);
    
    // 2. Check for Horizontal Overlap
    const playerXRight = PLAYER_X + playerSize;
    const obstacleXRight = obstacleX + obstacleSize;
    
    const horizontalOverlap = (playerXRight > obstacleX) && (PLAYER_X < obstacleXRight);
    
    // 3. Check for Vertical Overlap (Collision occurs if player bottom is below obstacle top)
    const obstacleYTop = groundHeight + obstacleSize;
    const verticalOverlap = (playerY < obstacleYTop);

    // Collision detected!
    if (horizontalOverlap && verticalOverlap) {
        gameOver();
    }
}

// Use a flag for the restart loop issue
let gameRunning = true;

function gameOver() {
    if (!gameRunning) return; // Prevent multiple calls
    gameRunning = false;
    
    clearInterval(gameInterval);
    clearInterval(jumpInterval);
    gameInterval = null;
    
    // Fix: Use setTimeout to break the stack/infinite loop issue
    alert(`Game Over! Final Score: ${score}. Press OK to restart.`);
    
    setTimeout(() => {
        gameRunning = true;
        startGame();
    }, 100); // Wait a moment after the alert to restart
}

// Main game loop
function gameLoop() {
    if (!gameRunning) return;

    moveObstacle(); // Move the obstacle in the main loop
    checkCollision();
}

// Start the game when the page loads
startGame();
