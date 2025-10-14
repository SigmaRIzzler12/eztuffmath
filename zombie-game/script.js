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
// NEW: Array to track destroyed resources for respawning
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
    destroyedResources = []; // Reset graveyard
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

function setWeaponStats() { /* ... no changes ... */ }
function gameLoop() { /* ... no changes ... */ }
function updateGame() { /* ... no changes ... */ }
function handleCollisions() { /* ... no changes ... */ }
function drawGame() { /* ... no changes ... */ }
function drawPlayer() { /* ... no changes ... */ }
function updateUI() { /* ... no changes ... */ }
function handleKeyPress(e) { /* ... no changes ... */ }
function handleMouseDown() { /* ... no changes ... */ }
function shoot() { /* ... no changes ... */ }
function placeWall() { /* ... no changes ... */ }
function buyItem(item, cost) { /* ... no changes ... */ }

// --- Wave and Game State Logic ---
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
    // NEW: Check for respawns at the end of a wave
    checkRespawns();
    startIntermission();
}

// NEW: Respawn Logic
function checkRespawns() {
    const RESPAWN_WAVE_COUNT = 5;
    const BUILD_CHECK_RADIUS = 100;

    for (let i = destroyedResources.length - 1; i >= 0; i--) {
        const res = destroyedResources[i];
        
        if (gameState.wave >= res.destroyedAtWave + RESPAWN_WAVE_COUNT) {
            // Check for nearby walls
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
                destroyedResources.splice(i, 1); // Remove from graveyard
            }
        }
    }
}


function useAxe() {
    if (gameState.phase !== 'intermission') return;
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        if (Math.hypot(player.x - tree.x, player.y - tree.y) < GATHER_RANGE) {
            tree.health--;
            if (tree.health <= 0) {
                player.resources.wood += 20;
                // NEW: Add to graveyard instead of just deleting
                destroyedResources.push({ x: tree.x, y: tree.y, type: 'tree', destroyedAtWave: gameState.wave });
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
                 // NEW: Add to graveyard instead of just deleting
                destroyedResources.push({ x: rock.x, y: rock.y, type: 'rock', destroyedAtWave: gameState.wave });
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

// --- Event Listeners and Init ---
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; handleKeyPress(e); });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.worldX = mouse.x + camera.x; mouse.worldY = mouse.y + camera.y; player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.y); });
canvas.addEventListener('mousedown', handleMouseDown);
startWaveBtn.addEventListener('click', startWave);
playAgainBtn.addEventListener('click', init);
document.querySelectorAll('.buy-btn').forEach(btn => { btn.addEventListener('click', () => buyItem(btn.dataset.item, parseInt(btn.dataset.cost))); });
init();

// --- Minified Helper Functions (No changes here, just pasting them for completeness) ---
function generateRocks(){const cX=WORLD_SIZE/2,cY=WORLD_SIZE/2,iR=900,oR=1300;for(let i=0;i<40;i++){const a=Math.random()*2*Math.PI,d=iR+Math.random()*(oR-iR);rocks.push({x:cX+Math.cos(a)*d,y:cY+Math.sin(a)*d,health:15,maxHealth:15,radius:ROCK_SIZE})}}
function generateTrees(){const cX=WORLD_SIZE/2,cY=WORLD_SIZE/2,iR=400,oR=800;for(let i=0;i<60;i++){const a=Math.random()*2*Math.PI,d=iR+Math.random()*(oR-iR);trees.push({x:cX+Math.cos(a)*d,y:cY+Math.sin(a)*d,health:10,maxHealth:10,radius:TREE_SIZE})}}
function handleCollisions(){for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];let t=!1;for(const o of walls)if(b.x>o.x&&b.x<o.x+o.width&&b.y>o.y&&b.y<o.y+o.height){bullets.splice(i,1),t=!0;break}if(t)continue;for(let o=zombies.length-1;o>=0;o--){const l=zombies[o];if(Math.hypot(b.x-l.x,b.y-l.y)<l.radius+b.radius){l.health-=b.damage,bullets.splice(i,1),l.health<=0&&(player.resources.cash+=10,zombies.splice(o,1),updateUI()),t=!0;break}}if(t)continue}for(const t of zombies)if(Math.hypot(t.x-player.x,t.y-player.y)<t.radius+player.radius){player.health-=t.damage,player.health<=0&&(player.health=0,gameOver()),updateUI()}}
function drawZombie(t){ctx.fillStyle="#2d5c2d",ctx.beginPath(),ctx.arc(t.x,t.y,t.radius,0,2*Math.PI),ctx.fill(),drawHealthBar(t,"#ff4444")}
function drawWall(t){ctx.fillStyle="#8B4513",ctx.strokeStyle="#654321",ctx.lineWidth=2,ctx.fillRect(t.x,t.y,t.width,t.height),ctx.strokeRect(t.x,t.y,t.width,t.height)}
function drawBullet(t){ctx.fillStyle="#ffff00",ctx.beginPath(),ctx.arc(t.x,t.y,t.radius,0,2*Math.PI),ctx.fill()}
function drawResource(t){if(t.radius===TREE_SIZE){const o=images.tree;o&&o.complete?ctx.drawImage(o,t.x-45,t.y-60,90,90):(ctx.fillStyle="#2d5016",ctx.beginPath(),ctx.arc(t.x,t.y,t.radius,0,2*Math.PI),ctx.fill())}else{const o=images.rock;o&&o.complete?ctx.drawImage(o,t.x-31.25,t.y-31.25,62.5,62.5):(ctx.fillStyle="#666",ctx.beginPath(),ctx.arc(t.x,t.y,t.radius,0,2*Math.PI),ctx.fill())}t.health<t.maxHealth&&drawHealthBar(t,t.radius===TREE_SIZE?"#4CAF50":"#999")}
function drawHealthBar(t,o){const l=2*t.radius,e=5,s=t.radius+10;ctx.fillStyle="#333",ctx.fillRect(t.x-l/2,t.y-s,l,e),ctx.fillStyle=o,ctx.fillRect(t.x-l/2,t.y-s,l*(t.health/t.maxHealth),e)}
function spawnZombies(){const t=5+3*gameState.wave;for(let o=0;o<t;o++){const l=Math.floor(4*Math.random());let e,s;switch(l){case 0:e=Math.random()*WORLD_SIZE,s=-ZOMBIE_SIZE;break;case 1:e=WORLD_SIZE+ZOMBIE_SIZE,s=Math.random()*WORLD_SIZE;break;case 2:e=Math.random()*WORLD_SIZE,s=WORLD_SIZE+ZOMBIE_SIZE;break;case 3:e=-ZOMBIE_SIZE,s=Math.random()*WORLD_SIZE}zombies.push({x:e,y:s,radius:ZOMBIE_SIZE,speed:1.5+.1*gameState.wave,health:30+5*gameState.wave,maxHealth:30+5*gameState.wave,damage:5})}}
function gameOver(){gameState.gameOver=!0,clearInterval(intermissionInterval),finalWaveEl.textContent=gameState.wave,gameOverScreen.classList.remove("hidden")}
function showFeedback(t){feedbackMessageEl.textContent=t,feedbackMessageEl.classList.remove("hidden"),setTimeout(()=>{feedbackMessageEl.classList.add("hidden")},2e3)}
function placeWall(){if(player.resources.stone<10)return void showFeedback("Not enough stone!");const t=Math.floor(mouse.worldX/GRID_SIZE)*GRID_SIZE,o=Math.floor(mouse.worldY/GRID_SIZE)*GRID_SIZE;if(!walls.some(l=>l.x===t&&l.y===o)){player.resources.stone-=10,walls.push({x:t,y:o,width:WALL_SIZE,height:WALL_SIZE}),showFeedback("Wall Placed!"),updateUI()}}
function toggleShop(){"intermission"===gameState.phase&&!shopOpen||!gameState.gameOver&&(shopOpen=!shopOpen,orderStation.classList.toggle("hidden",!shopOpen))}
