// ===================================
// MULTIPLAYER ZOMBIE SURVIVAL GAME
// ===================================
// This game uses WebRTC for P2P connections with a WebSocket signaling server
// The Host runs all game logic and synchronizes state to clients

// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- UI Elements ---
const mainMenu = document.getElementById('main-menu');
const stagingArea = document.getElementById('staging-area');
const gameContainer = document.getElementById('game-container');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const refreshRoomsBtn = document.getElementById('refresh-rooms-btn');
const roomList = document.getElementById('room-list');
const joinRoomModal = document.getElementById('join-room-modal');
const roomCodeInput = document.getElementById('room-code-input');
const confirmJoinBtn = document.getElementById('confirm-join-btn');
const cancelJoinBtn = document.getElementById('cancel-join-btn');
const joinError = document.getElementById('join-error');
const roomCodeDisplay = document.getElementById('room-code');
const startGameBtn = document.getElementById('start-game-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const stagingStatus = document.getElementById('staging-status');
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
const closeShopBtn = document.getElementById('close-shop-btn');
const gameOverScreen = document.getElementById('game-over');
const finalWaveEl = document.getElementById('final-wave');
const returnLobbyBtn = document.getElementById('return-lobby-btn');

// --- Audio Setup ---
const sounds = {
    gunshot: new Audio('audio/gunshot.mp3'),
    intermission: new Audio('audio/intermission.mp3'),
    waveOngoing: new Audio('audio/waveongoing.mp3'),
    beep: new Audio('audio/beep.mp3'),
    lobby: new Audio('audio/lobby.mp3')
};
sounds.waveOngoing.loop = true;
sounds.gunshot.volume = 0.4;
sounds.beep.volume = 0.7;

// --- Image Loading ---
const images = {
    gun: new Image(), gun1: new Image(), gun2: new Image(),
    axe: new Image(), pickaxe: new Image(), rock: new Image(), tree: new Image()
};
images.gun.src = 'images/gun.png';
images.gun1.src = 'images/gun1.png';
images.gun2.src = 'images/gun2.png';
images.axe.src = 'images/axe.png';
images.pickaxe.src = 'images/pickaxe.png';
images.rock.src = 'images/rock.png';
images.tree.src = 'images/tree.png';

let imagesLoaded = 0;
const totalImages = Object.keys(images).length;
for (const key in images) {
    images[key].onload = () => { imagesLoaded++; };
}

// --- Game Constants ---
const WORLD_SIZE = 3000;
const PLAYER_SIZE = 20;
const GATHER_RANGE = 60;
const ZOMBIE_SIZE = 18;
const TREE_SIZE = 30;
const ROCK_SIZE = 25;
const WALL_SIZE = 50;
const GRID_SIZE = 50;
const BULLET_SIZE = 5;
const BULLET_SPEED = 12;
const INTERMISSION_TIME = 60;
const PLAYER_COLORS = ['#4287f5', '#a142f5', '#f54242', '#f5a742']; // Blue, Purple, Red, Orange

// --- Networking State ---
let ws = null;
let peerConnections = new Map(); // Map of peerId -> RTCPeerConnection
let dataChannels = new Map(); // Map of peerId -> RTCDataChannel
let networkState = {
    connected: false,
    isHost: false,
    roomCode: null,
    myId: null,
    mySlot: 0, // 0=host/blue, 1=purple, 2=red, 3=orange
    players: new Map() // Map of peerId -> {slot, connected}
};

// --- Game State ---
let gameState, localPlayer, players, zombies, trees, rocks, walls, bullets;
let destroyedResources = [];
let keys = {}, mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let shopOpen = false;
let camera = { x: 0, y: 0 };
let lastActionTime = 0;
let intermissionInterval;
let gameRunning = false;
let lastSyncTime = 0;
const SYNC_INTERVAL = 50; // Sync every 50ms

// --- Initialization ---
function init() {
    console.log('Initializing game...');
    
    // Reset game state
    gameState = {
        phase: 'intermission',
        wave: 1,
        intermissionTimer: INTERMISSION_TIME,
        gameOver: false
    };
    
    // Initialize players map
    players = new Map();
    
    // Create local player
    const spawn = getPlayerSpawnPosition(networkState.mySlot);
    localPlayer = {
        id: networkState.myId,
        slot: networkState.mySlot,
        x: spawn.x,
        y: spawn.y,
        radius: PLAYER_SIZE,
        speed: 4,
        health: 100,
        maxHealth: 100,
        angle: 0,
        resources: { wood: 0, stone: 0, cash: 0 },
        inventory: { axe: true, pickaxe: false, pistol: true, rifle: false, shotgun: false },
        equipped: 'pistol',
        damage: 10,
        fireRate: 400
    };
    players.set(localPlayer.id, localPlayer);
    
    // Initialize other players
    networkState.players.forEach((playerInfo, peerId) => {
        if (peerId !== networkState.myId) {
            const spawn = getPlayerSpawnPosition(playerInfo.slot);
            players.set(peerId, {
                id: peerId,
                slot: playerInfo.slot,
                x: spawn.x,
                y: spawn.y,
                radius: PLAYER_SIZE,
                speed: 4,
                health: 100,
                maxHealth: 100,
                angle: 0,
                resources: { wood: 0, stone: 0, cash: 0 },
                inventory: { axe: true, pickaxe: false, pistol: true, rifle: false, shotgun: false },
                equipped: 'pistol',
                damage: 10,
                fireRate: 400
            });
        }
    });
    
    setWeaponStats();
    zombies = [];
    trees = [];
    rocks = [];
    walls = [];
    bullets = [];
    destroyedResources = [];
    shopOpen = false;
    
    generateTrees();
    generateRocks();
    
    gameOverScreen.classList.add('hidden');
    orderStation.classList.add('hidden');
    
    if (networkState.isHost) {
        startWaveBtn.classList.remove('hidden');
        timerContainer.classList.remove('hidden');
        document.body.classList.add('is-host');
    } else {
        startWaveBtn.classList.add('hidden');
        timerContainer.classList.remove('hidden');
        document.body.classList.remove('is-host');
    }
    
    updateUI();
    
    if (networkState.isHost) {
        startIntermission();
    }
    
    gameRunning = true;
    
    if (imagesLoaded === totalImages) {
        gameLoop();
    } else {
        const loadCheck = setInterval(() => {
            if (imagesLoaded === totalImages) {
                clearInterval(loadCheck);
                gameLoop();
            }
        }, 100);
    }
}

function getPlayerSpawnPosition(slot) {
    const centerX = WORLD_SIZE / 2;
    const centerY = WORLD_SIZE / 2;
    const offset = 100;
    
    const positions = [
        { x: centerX, y: centerY }, // Blue (host) - center
        { x: centerX + offset, y: centerY }, // Purple - right
        { x: centerX, y: centerY + offset }, // Red - bottom
        { x: centerX - offset, y: centerY } // Orange - left
    ];
    
    return positions[slot] || positions[0];
}

// --- WebSocket Connection ---
function connectToServer() {
    statusText.textContent = 'Connecting to server...';
    statusIndicator.className = 'status-disconnected';
    
    // Auto-detect local vs production
    const WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'ws://localhost:3000'  // Local development
        : 'wss://rps-matchmaker-sigmarizzler12.onrender.com';  // Production
    
    console.log('Connecting to:', WS_URL);
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        console.log('Connected to signaling server');
        statusText.textContent = 'Connected';
        statusIndicator.className = 'status-connected';
        networkState.connected = true;
        
        createRoomBtn.disabled = false;
        joinRoomBtn.disabled = false;
        refreshRoomsBtn.disabled = false;
        
        requestRoomList();
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        statusText.textContent = 'Disconnected';
        statusIndicator.className = 'status-disconnected';
        networkState.connected = false;
        
        createRoomBtn.disabled = true;
        joinRoomBtn.disabled = true;
        refreshRoomsBtn.disabled = true;
        
        // Attempt reconnection after 3 seconds
        setTimeout(connectToServer, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function handleServerMessage(data) {
    console.log('Server message:', data.type);
    
    switch (data.type) {
        case 'connected':
            networkState.myId = data.clientId;
            console.log('My ID:', networkState.myId);
            break;
        
        case 'room-created':
            handleRoomCreated(data);
            break;
        
        case 'room-joined':
            handleRoomJoined(data);
            break;
        
        case 'player-joined':
            handlePlayerJoined(data);
            break;
        
        case 'player-left':
            handlePlayerLeft(data);
            break;
        
        case 'room-list':
            updateRoomList(data.rooms);
            break;
        
        case 'host-disconnected':
            handleHostDisconnected();
            break;
        
        case 'webrtc-offer':
            handleWebRTCOffer(data);
            break;
        
        case 'webrtc-answer':
            handleWebRTCAnswer(data);
            break;
        
        case 'webrtc-ice-candidate':
            handleICECandidate(data);
            break;
        
        case 'error':
            showError(data.message);
            break;
    }
}

function handleRoomCreated(data) {
    networkState.isHost = true;
    networkState.roomCode = data.roomCode;
    networkState.mySlot = 0; // Host is always slot 0 (blue)
    networkState.players.set(networkState.myId, { slot: 0, connected: true });
    
    roomCodeDisplay.textContent = data.roomCode;
    mainMenu.classList.add('hidden');
    stagingArea.classList.remove('hidden');
    document.body.classList.add('is-host');
    
    updatePlayerSlots();
    startGameBtn.disabled = false;
}

function handleRoomJoined(data) {
    networkState.isHost = false;
    networkState.roomCode = data.roomCode;
    networkState.mySlot = data.playerSlot;
    networkState.players.set(networkState.myId, { slot: data.playerSlot, connected: true });
    
    // Add host
    networkState.players.set(data.hostId, { slot: 0, connected: true });
    
    // Add other clients
    data.clientIds.forEach((clientId, index) => {
        networkState.players.set(clientId, { slot: index + 1, connected: true });
    });
    
    roomCodeDisplay.textContent = data.roomCode;
    mainMenu.classList.add('hidden');
    stagingArea.classList.remove('hidden');
    joinRoomModal.classList.add('hidden');
    
    updatePlayerSlots();
    
    // Initiate WebRTC connection to host
    createPeerConnection(data.hostId, true);
}

function handlePlayerJoined(data) {
    console.log('Player joined:', data.clientId);
    
    const slot = networkState.players.size;
    networkState.players.set(data.clientId, { slot, connected: true });
    
    updatePlayerSlots();
    
    // Host creates peer connection to new client
    if (networkState.isHost) {
        createPeerConnection(data.clientId, true);
    }
}

function handlePlayerLeft(data) {
    console.log('Player left:', data.clientId);
    
    networkState.players.delete(data.clientId);
    peerConnections.delete(data.clientId);
    dataChannels.delete(data.clientId);
    
    // Remove player from game if running
    if (gameRunning) {
        players.delete(data.clientId);
    }
    
    updatePlayerSlots();
}

function handleHostDisconnected() {
    showFeedback('Host disconnected! Returning to lobby...');
    returnToLobby();
}

// --- WebRTC P2P Connection ---
function createPeerConnection(peerId, initiator) {
    console.log(`Creating peer connection to ${peerId}, initiator: ${initiator}`);
    
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };
    
    const pc = new RTCPeerConnection(config);
    peerConnections.set(peerId, pc);
    
    // Create data channel
    let dataChannel;
    if (initiator) {
        dataChannel = pc.createDataChannel('game-data');
        setupDataChannel(dataChannel, peerId);
    } else {
        pc.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupDataChannel(dataChannel, peerId);
        };
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendToServer({
                type: 'webrtc-ice-candidate',
                targetId: peerId,
                candidate: event.candidate
            });
        }
    };
    
    // Connection state change
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerId}:`, pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            peerConnections.delete(peerId);
            dataChannels.delete(peerId);
        }
    };
    
    // Create offer if initiator
    if (initiator) {
        pc.createOffer().then((offer) => {
            return pc.setLocalDescription(offer);
        }).then(() => {
            sendToServer({
                type: 'webrtc-offer',
                targetId: peerId,
                offer: pc.localDescription
            });
        }).catch((error) => {
            console.error('Error creating offer:', error);
        });
    }
    
    return pc;
}

function setupDataChannel(channel, peerId) {
    dataChannels.set(peerId, channel);
    
    channel.onopen = () => {
        console.log(`Data channel opened with ${peerId}`);
        
        // If game is already running and we're host, send initial state
        if (networkState.isHost && gameRunning) {
            sendGameState(peerId);
        }
    };
    
    channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handlePeerMessage(peerId, data);
    };
    
    channel.onclose = () => {
        console.log(`Data channel closed with ${peerId}`);
    };
}

function handleWebRTCOffer(data) {
    const pc = createPeerConnection(data.senderId, false);
    
    pc.setRemoteDescription(new RTCSessionDescription(data.offer)).then(() => {
        return pc.createAnswer();
    }).then((answer) => {
        return pc.setLocalDescription(answer);
    }).then(() => {
        sendToServer({
            type: 'webrtc-answer',
            targetId: data.senderId,
            answer: pc.localDescription
        });
    }).catch((error) => {
        console.error('Error handling offer:', error);
    });
}

function handleWebRTCAnswer(data) {
    const pc = peerConnections.get(data.senderId);
    if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch((error) => {
            console.error('Error setting remote description:', error);
        });
    }
}

function handleICECandidate(data) {
    const pc = peerConnections.get(data.senderId || data.targetId);
    if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((error) => {
            console.error('Error adding ICE candidate:', error);
        });
    }
}

// --- Peer-to-Peer Messaging ---
function sendToPeer(peerId, data) {
    const channel = dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
        channel.send(JSON.stringify(data));
    }
}

function broadcastToPeers(data) {
    dataChannels.forEach((channel, peerId) => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify(data));
        }
    });
}

function handlePeerMessage(peerId, data) {
    switch (data.type) {
        case 'game-state':
            handleGameStateUpdate(data);
            break;
        
        case 'player-update':
            handlePlayerUpdate(peerId, data);
            break;
        
        case 'shoot':
            handleRemoteShoot(peerId, data);
            break;
        
        case 'place-wall':
            handleRemotePlaceWall(data);
            break;
        
        case 'gather':
            handleRemoteGather(data);
            break;
        
        case 'buy-item':
            handleRemoteBuyItem(peerId, data);
            break;
        
        case 'start-game':
            handleStartGame();
            break;
        
        case 'start-wave':
            handleStartWaveCommand();
            break;
    }
}

// --- Game State Synchronization ---
function sendGameState(targetPeerId = null) {
    if (!networkState.isHost) return;
    
    const state = {
        type: 'game-state',
        gameState: {
            phase: gameState.phase,
            wave: gameState.wave,
            intermissionTimer: gameState.intermissionTimer
        },
        players: Array.from(players.values()).map(p => ({
            id: p.id,
            slot: p.slot,
            x: p.x,
            y: p.y,
            angle: p.angle,
            health: p.health,
            equipped: p.equipped,
            resources: p.resources,
            inventory: p.inventory
        })),
        zombies: zombies.map(z => ({
            id: z.id,
            x: z.x,
            y: z.y,
            health: z.health,
            radius: z.radius
        })),
        trees: trees.map(t => ({
            x: t.x,
            y: t.y,
            health: t.health,
            maxHealth: t.maxHealth
        })),
        rocks: rocks.map(r => ({
            x: r.x,
            y: r.y,
            health: r.health,
            maxHealth: r.maxHealth
        })),
        walls: walls.map(w => ({
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height
        })),
        bullets: bullets.map(b => ({
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            damage: b.damage
        }))
    };
    
    if (targetPeerId) {
        sendToPeer(targetPeerId, state);
    } else {
        broadcastToPeers(state);
    }
}

function handleGameStateUpdate(data) {
    // Client receives full game state from host
    gameState = data.gameState;
    
    // Update players
    data.players.forEach(pData => {
        let player = players.get(pData.id);
        if (!player) {
            player = { ...pData, radius: PLAYER_SIZE, speed: 4, maxHealth: 100, damage: 10, fireRate: 400 };
            players.set(pData.id, player);
        } else {
            // Update player data (don't overwrite local player's position directly)
            if (pData.id !== localPlayer.id) {
                player.x = pData.x;
                player.y = pData.y;
                player.angle = pData.angle;
            }
            player.health = pData.health;
            player.equipped = pData.equipped;
            player.resources = pData.resources;
            player.inventory = pData.inventory;
        }
    });
    
    // Update zombies
    zombies = data.zombies.map(z => ({
        ...z,
        radius: ZOMBIE_SIZE,
        speed: 2,
        maxHealth: 30,
        damage: 0.3
    }));
    
    // Update resources
    trees = data.trees.map(t => ({ ...t, radius: TREE_SIZE }));
    rocks = data.rocks.map(r => ({ ...r, radius: ROCK_SIZE }));
    walls = data.walls;
    bullets = data.bullets.map(b => ({ ...b, radius: BULLET_SIZE }));
    
    updateUI();
}

function handlePlayerUpdate(peerId, data) {
    // Update specific player's position and angle
    const player = players.get(peerId);
    if (player) {
        player.x = data.x;
        player.y = data.y;
        player.angle = data.angle;
        player.equipped = data.equipped;
    }
}

function sendPlayerUpdate() {
    // Send local player's state to all peers
    const data = {
        type: 'player-update',
        x: localPlayer.x,
        y: localPlayer.y,
        angle: localPlayer.angle,
        equipped: localPlayer.equipped
    };
    
    if (networkState.isHost) {
        broadcastToPeers(data);
    } else {
        // Send to host only
        const hostId = Array.from(networkState.players.entries()).find(([id, info]) => info.slot === 0)?.[0];
        if (hostId) {
            sendToPeer(hostId, data);
        }
    }
}

// --- Game Logic ---
function setWeaponStats() {
    switch (localPlayer.equipped) {
        case 'rifle':
            localPlayer.damage = 8;
            localPlayer.fireRate = 100;
            break;
        case 'shotgun':
            localPlayer.damage = 12;
            localPlayer.fireRate = 800;
            break;
        case 'pistol':
        default:
            localPlayer.damage = 10;
            localPlayer.fireRate = 400;
            break;
    }
}

function gameLoop() {
    if (gameState.gameOver || !gameRunning) return;
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function updateGame() {
    if (shopOpen) return;
    
    // Update local player movement
    let dx = 0, dy = 0;
    if (keys['w']) dy -= 1;
    if (keys['s']) dy += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;
    
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        localPlayer.x += (dx / len) * localPlayer.speed;
        localPlayer.y += (dy / len) * localPlayer.speed;
        localPlayer.x = Math.max(localPlayer.radius, Math.min(WORLD_SIZE - localPlayer.radius, localPlayer.x));
        localPlayer.y = Math.max(localPlayer.radius, Math.min(WORLD_SIZE - localPlayer.radius, localPlayer.y));
        
        // Send position update periodically
        const now = Date.now();
        if (now - lastSyncTime > SYNC_INTERVAL) {
            sendPlayerUpdate();
            lastSyncTime = now;
        }
    }
    
    // Update camera to follow local player
    camera.x = localPlayer.x - canvas.width / 2;
    camera.y = localPlayer.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));
    
    // Host handles game logic
    if (networkState.isHost) {
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
            // Find nearest player
            let nearestPlayer = null;
            let nearestDist = Infinity;
            
            players.forEach(p => {
                const dist = Math.hypot(p.x - z.x, p.y - z.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestPlayer = p;
                }
            });
            
            if (nearestPlayer) {
                const z_dx = nearestPlayer.x - z.x;
                const z_dy = nearestPlayer.y - z.y;
                const dist = Math.hypot(z_dx, z_dy);
                if (dist > 0) {
                    z.x += (z_dx / dist) * z.speed;
                    z.y += (z_dy / dist) * z.speed;
                }
            }
        }
        
        handleCollisions();
        
        if (gameState.phase === 'wave' && zombies.length === 0) {
            endWave();
        }
        
        // Sync game state periodically
        const now = Date.now();
        if (now - lastSyncTime > SYNC_INTERVAL) {
            sendGameState();
            lastSyncTime = now;
        }
    }
}

function handleCollisions() {
    if (!networkState.isHost) return;
    
    // Bullet-wall collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let hit = false;
        
        for (const wall of walls) {
            if (b.x > wall.x && b.x < wall.x + wall.width && 
                b.y > wall.y && b.y < wall.y + wall.height) {
                bullets.splice(i, 1);
                hit = true;
                break;
            }
        }
        if (hit) continue;
        
        // Bullet-zombie collisions
        for (let j = zombies.length - 1; j >= 0; j--) {
            const z = zombies[j];
            if (Math.hypot(b.x - z.x, b.y - z.y) < z.radius + b.radius) {
                z.health -= b.damage;
                bullets.splice(i, 1);
                
                if (z.health <= 0) {
                    // Give cash to all players
                    players.forEach(p => {
                        p.resources.cash += 10;
                    });
                    zombies.splice(j, 1);
                }
                hit = true;
                break;
            }
        }
        if (hit) continue;
    }
    
    // Zombie-player collisions
    for (const z of zombies) {
        players.forEach(p => {
            if (Math.hypot(z.x - p.x, z.y - p.y) < z.radius + p.radius) {
                p.health -= z.damage;
                if (p.health <= 0) {
                    p.health = 0;
                    // Check if all players are dead
                    const allDead = Array.from(players.values()).every(player => player.health <= 0);
                    if (allDead) {
                        gameOver();
                    }
                }
            }
        });
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Draw background
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    // Draw resources
    trees.forEach(drawResource);
    rocks.forEach(drawResource);
    walls.forEach(drawWall);
    
    // Draw zombies
    zombies.forEach(drawZombie);
    
    // Draw bullets
    bullets.forEach(drawBullet);
    
    // Draw all players
    players.forEach(drawPlayer);
    
    ctx.restore();
}

function drawPlayer(player) {
    const color = PLAYER_COLORS[player.slot] || '#00ffff';
    
    // Draw player circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw equipped item
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
    
    // Draw health bar if damaged
    if (player.health < player.maxHealth) {
        drawHealthBar(player, color);
    }
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
    ctx.fillRect(entity.x - barWidth / 2, entity.y - yOffset, 
                 barWidth * (entity.health / entity.maxHealth), barHeight);
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

// --- Wave Management ---
function startIntermission() {
    gameState.phase = "intermission";
    gameState.intermissionTimer = INTERMISSION_TIME;
    
    sounds.waveOngoing.pause();
    sounds.intermission.currentTime = 0;
    sounds.intermission.play();
    
    timerContainer.classList.remove("hidden");
    if (networkState.isHost) {
        startWaveBtn.classList.remove("hidden");
    }
    
    intermissionInterval = setInterval(() => {
        gameState.intermissionTimer--;
        updateUI();
        
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
    if (!networkState.isHost) return;
    
    clearInterval(intermissionInterval);
    gameState.phase = "wave";
    
    sounds.intermission.pause();
    sounds.waveOngoing.currentTime = 0;
    sounds.waveOngoing.play();
    
    startWaveBtn.classList.add("hidden");
    timerContainer.classList.add("hidden");
    
    spawnZombies();
    
    // Notify clients
    broadcastToPeers({ type: 'start-wave' });
}

function handleStartWaveCommand() {
    // Client receives start wave command
    if (gameState.phase !== "intermission") return;
    
    clearInterval(intermissionInterval);
    gameState.phase = "wave";
    
    sounds.intermission.pause();
    sounds.waveOngoing.currentTime = 0;
    sounds.waveOngoing.play();
    
    startWaveBtn.classList.add("hidden");
    timerContainer.classList.add("hidden");
}

function spawnZombies() {
    if (!networkState.isHost) return;
    
    const count = 5 + gameState.wave * 3;
    const centerX = WORLD_SIZE / 2;
    const centerY = WORLD_SIZE / 2;
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 800 + Math.random() * 400;
        
        zombies.push({
            id: Math.random().toString(36).substr(2, 9),
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            health: 30 + gameState.wave * 5,
            maxHealth: 30 + gameState.wave * 5,
            radius: ZOMBIE_SIZE,
            speed: 1 + gameState.wave * 0.1,
            damage: 0.3
        });
    }
}

function endWave() {
    if (!networkState.isHost) return;
    
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
                if (Math.hypot(res.x - (wall.x + WALL_SIZE / 2), 
                              res.y - (wall.y + WALL_SIZE / 2)) < BUILD_CHECK_RADIUS) {
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

// --- Player Actions ---
function handleMouseDown() {
    if (gameState.gameOver || shopOpen) return;
    
    const now = Date.now();
    const isGun = ['pistol', 'rifle', 'shotgun'].includes(localPlayer.equipped);
    
    if (isGun) {
        if (now - lastActionTime >= localPlayer.fireRate) {
            lastActionTime = now;
            shoot();
        }
    } else {
        if (now - lastActionTime >= 500) {
            lastActionTime = now;
            if (localPlayer.equipped === 'axe') useAxe();
            if (localPlayer.equipped === 'pickaxe') usePickaxe();
        }
    }
}

function shoot() {
    sounds.gunshot.currentTime = 0;
    sounds.gunshot.play();
    
    const fireLocation = {
        x: localPlayer.x + Math.cos(localPlayer.angle) * 20,
        y: localPlayer.y + Math.sin(localPlayer.angle) * 20
    };
    
    const newBullets = [];
    
    if (localPlayer.equipped === 'shotgun') {
        const spread = 0.25;
        for (let i = -1; i <= 1; i++) {
            const angle = localPlayer.angle + (i * spread);
            newBullets.push({
                x: fireLocation.x,
                y: fireLocation.y,
                vx: Math.cos(angle) * BULLET_SPEED,
                vy: Math.sin(angle) * BULLET_SPEED,
                radius: BULLET_SIZE,
                damage: localPlayer.damage
            });
        }
    } else {
        newBullets.push({
            x: fireLocation.x,
            y: fireLocation.y,
            vx: Math.cos(localPlayer.angle) * BULLET_SPEED,
            vy: Math.sin(localPlayer.angle) * BULLET_SPEED,
            radius: BULLET_SIZE,
            damage: localPlayer.damage
        });
    }
    
    // Add bullets locally
    bullets.push(...newBullets);
    
    // Notify peers
    const data = {
        type: 'shoot',
        bullets: newBullets
    };
    
    if (networkState.isHost) {
        broadcastToPeers(data);
    } else {
        const hostId = Array.from(networkState.players.entries()).find(([id, info]) => info.slot === 0)?.[0];
        if (hostId) sendToPeer(hostId, data);
    }
}

function handleRemoteShoot(peerId, data) {
    // Add remote player's bullets
    bullets.push(...data.bullets);
}

function placeWall() {
    if (localPlayer.resources.stone < 10) {
        showFeedback("Not enough stone!");
        return;
    }
    
    const gridX = Math.floor(mouse.worldX / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.floor(mouse.worldY / GRID_SIZE) * GRID_SIZE;
    
    if (walls.some(w => w.x === gridX && w.y === gridY)) return;
    
    localPlayer.resources.stone -= 10;
    const newWall = { x: gridX, y: gridY, width: WALL_SIZE, height: WALL_SIZE };
    walls.push(newWall);
    
    showFeedback("Wall Placed!");
    updateUI();
    
    // Notify peers
    const data = {
        type: 'place-wall',
        wall: newWall
    };
    
    if (networkState.isHost) {
        broadcastToPeers(data);
    } else {
        const hostId = Array.from(networkState.players.entries()).find(([id, info]) => info.slot === 0)?.[0];
        if (hostId) sendToPeer(hostId, data);
    }
}

function handleRemotePlaceWall(data) {
    walls.push(data.wall);
    
    // Update the player's stone count
    const player = players.get(data.playerId);
    if (player) {
        player.resources.stone -= 10;
    }
}

function useAxe() {
    if (gameState.phase !== 'intermission') return;
    
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        if (Math.hypot(localPlayer.x - tree.x, localPlayer.y - tree.y) < GATHER_RANGE) {
            // Notify host/peers
            const data = {
                type: 'gather',
                resourceType: 'tree',
                index: i,
                playerId: localPlayer.id
            };
            
            if (networkState.isHost) {
                processGather(data);
                broadcastToPeers(data);
            } else {
                const hostId = Array.from(networkState.players.entries()).find(([id, info]) => info.slot === 0)?.[0];
                if (hostId) sendToPeer(hostId, data);
            }
            return;
        }
    }
}

function usePickaxe() {
    if (gameState.phase !== 'intermission') return;
    
    for (let i = rocks.length - 1; i >= 0; i--) {
        const rock = rocks[i];
        if (Math.hypot(localPlayer.x - rock.x, localPlayer.y - rock.y) < GATHER_RANGE) {
            // Notify host/peers
            const data = {
                type: 'gather',
                resourceType: 'rock',
                index: i,
                playerId: localPlayer.id
            };
            
            if (networkState.isHost) {
                processGather(data);
                broadcastToPeers(data);
            } else {
                const hostId = Array.from(networkState.players.entries()).find(([id, info]) => info.slot === 0)?.[0];
                if (hostId) sendToPeer(hostId, data);
            }
            return;
        }
    }
}

function processGather(data) {
    if (!networkState.isHost) return;
    
    if (data.resourceType === 'tree' && data.index < trees.length) {
        const tree = trees[data.index];
        tree.health--;
        
        if (tree.health <= 0) {
            const player = players.get(data.playerId);
            if (player) {
                player.resources.wood += 20;
            }
            destroyedResources.push({
                x: tree.x,
                y: tree.y,
                type: 'tree',
                destroyedAtWave: gameState.wave
            });
            trees.splice(data.index, 1);
        }
    } else if (data.resourceType === 'rock' && data.index < rocks.length) {
        const rock = rocks[data.index];
        rock.health--;
        
        if (rock.health <= 0) {
            const player = players.get(data.playerId);
            if (player) {
                player.resources.stone += 10;
            }
            destroyedResources.push({
                x: rock.x,
                y: rock.y,
                type: 'rock',
                destroyedAtWave: gameState.wave
            });
            rocks.splice(data.index, 1);
        }
    }
}

function handleRemoteGather(data) {
    if (networkState.isHost) {
        processGather(data);
    }
}

// --- Shop ---
function toggleShop() {
    if (gameState.phase !== 'intermission' && !shopOpen) return;
    if (gameState.gameOver) return;
    
    shopOpen = !shopOpen;
    orderStation.classList.toggle("hidden", !shopOpen);
}

function buyItem(item, cost) {
    if (localPlayer.resources.cash < cost) return;
    
    localPlayer.resources.cash -= cost;
    
    if (item === 'pickaxe') {
        localPlayer.inventory.pickaxe = true;
    } else {
        localPlayer.inventory[item] = true;
        localPlayer.equipped = item;
        setWeaponStats();
    }
    
    const btn = document.querySelector(`.buy-btn[data-item="${item}"]`);
    btn.disabled = true;
    btn.nextElementSibling.classList.remove('hidden');
    
    updateUI();
    
    // Notify peers
    broadcastToPeers({
        type: 'buy-item',
        playerId: localPlayer.id,
        item,
        cost
    });
}

function handleRemoteBuyItem(peerId, data) {
    const player = players.get(data.playerId);
    if (player) {
        player.resources.cash -= data.cost;
        player.inventory[data.item] = true;
        if (data.item !== 'pickaxe') {
            player.equipped = data.item;
        }
    }
}

// --- UI Updates ---
function updateUI() {
    const healthPercent = (localPlayer.health / localPlayer.maxHealth) * 100;
    healthBar.style.setProperty('--health-width', healthPercent + '%');
    healthText.textContent = `${Math.ceil(localPlayer.health)}/${localPlayer.maxHealth}`;
    
    woodCountEl.textContent = localPlayer.resources.wood;
    stoneCountEl.textContent = localPlayer.resources.stone;
    cashCountEl.textContent = localPlayer.resources.cash;
    
    waveNumberEl.textContent = gameState.wave;
    timerEl.textContent = gameState.intermissionTimer;
    
    const equippedKey = localPlayer.equipped;
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

function updatePlayerSlots() {
    const slots = document.querySelectorAll('.player-slot');
    
    slots.forEach((slot, index) => {
        const playerInSlot = Array.from(networkState.players.entries())
            .find(([id, info]) => info.slot === index);
        
        if (playerInSlot) {
            slot.classList.add('filled');
        } else {
            slot.classList.remove('filled');
        }
    });
    
    stagingStatus.textContent = `${networkState.players.size}/4 players ready`;
}

function updateRoomList(rooms) {
    roomList.innerHTML = '';
    
    if (rooms.length === 0) {
        roomList.innerHTML = '<p class="no-rooms">No rooms available</p>';
        return;
    }
    
    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.innerHTML = `
            <span class="room-info">Room ${room.roomCode}</span>
            <span class="room-players">${room.playerCount}/${room.maxPlayers} Players</span>
        `;
        roomItem.addEventListener('click', () => {
            joinRoomByCode(room.roomCode);
        });
        roomList.appendChild(roomItem);
    });
}

// --- Game Over ---
function gameOver() {
    gameState.gameOver = true;
    clearInterval(intermissionInterval);
    
    finalWaveEl.textContent = gameState.wave;
    gameOverScreen.classList.remove("hidden");
    
    sounds.waveOngoing.pause();
    sounds.intermission.pause();
    
    gameRunning = false;
}

// --- Resource Generation ---
function generateRocks() {
    const cX = WORLD_SIZE / 2;
    const cY = WORLD_SIZE / 2;
    const iR = 900;
    const oR = 1300;
    
    for (let i = 0; i < 40; i++) {
        const a = Math.random() * 2 * Math.PI;
        const d = iR + Math.random() * (oR - iR);
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
    const cX = WORLD_SIZE / 2;
    const cY = WORLD_SIZE / 2;
    const iR = 400;
    const oR = 800;
    
    for (let i = 0; i < 60; i++) {
        const a = Math.random() * 2 * Math.PI;
        const d = iR + Math.random() * (oR - iR);
        trees.push({
            x: cX + Math.cos(a) * d,
            y: cY + Math.sin(a) * d,
            health: 10,
            maxHealth: 10,
            radius: TREE_SIZE
        });
    }
}

// --- Menu Functions ---
function requestRoomList() {
    sendToServer({ type: 'list-rooms' });
}

function createRoom() {
    sendToServer({ type: 'create-room' });
}

function joinRoomByCode(code) {
    sendToServer({
        type: 'join-room',
        roomCode: code.toUpperCase()
    });
}

function leaveRoom() {
    sendToServer({ type: 'leave-room' });
    returnToLobby();
}

function returnToLobby() {
    // Stop game
    gameRunning = false;
    gameState.gameOver = true;
    clearInterval(intermissionInterval);
    
    // Stop all sounds
    Object.values(sounds).forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
    });
    
    // Close all peer connections
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    dataChannels.clear();
    
    // Reset network state
    networkState.isHost = false;
    networkState.roomCode = null;
    networkState.mySlot = 0;
    networkState.players.clear();
    
    // Show main menu
    gameContainer.classList.add('hidden');
    stagingArea.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    document.body.classList.remove('is-host');
    
    // Request updated room list
    requestRoomList();
}

function handleStartGame() {
    console.log('Starting game...');
    
    // Hide staging area, show game
    stagingArea.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Initialize game
    init();
    
    // If host, notify clients
    if (networkState.isHost) {
        broadcastToPeers({ type: 'start-game' });
    }
}

function showError(message) {
    joinError.textContent = message;
    joinError.classList.remove('hidden');
    setTimeout(() => {
        joinError.classList.add('hidden');
    }, 3000);
}

function sendToServer(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// --- Input Handlers ---
function handleKeyPress(e) {
    if (gameState.gameOver || shopOpen) {
        if (e.key.toLowerCase() === 'b' && shopOpen) {
            toggleShop();
        }
        return;
    }
    
    const key = e.key.toLowerCase();
    
    // Weapon switching
    if (key === '1') {
        const guns = ['pistol', 'rifle', 'shotgun'];
        const ownedGuns = guns.filter(g => localPlayer.inventory[g]);
        const currentIndex = ownedGuns.indexOf(localPlayer.equipped);
        
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % ownedGuns.length;
            localPlayer.equipped = ownedGuns[nextIndex];
        } else {
            localPlayer.equipped = ownedGuns[0];
        }
        
        setWeaponStats();
        updateUI();
        sendPlayerUpdate();
    }
    
    if (key === '2' && localPlayer.inventory.axe) {
        localPlayer.equipped = 'axe';
        updateUI();
        sendPlayerUpdate();
    }
    
    if (key === '3' && localPlayer.inventory.pickaxe) {
        localPlayer.equipped = 'pickaxe';
        updateUI();
        sendPlayerUpdate();
    }
    
    // Shop
    if (key === 'b' && gameState.phase === 'intermission') {
        toggleShop();
    }
    
    // Build wall
    if (key === 'q' && gameState.phase === 'intermission') {
        placeWall();
    }
}

// --- Event Listeners ---
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
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
    localPlayer.angle = Math.atan2(mouse.worldY - localPlayer.y, mouse.worldX - localPlayer.x);
});

canvas.addEventListener('mousedown', handleMouseDown);

// Menu button listeners
createRoomBtn.addEventListener('click', createRoom);

joinRoomBtn.addEventListener('click', () => {
    joinRoomModal.classList.remove('hidden');
    roomCodeInput.value = '';
    roomCodeInput.focus();
});

confirmJoinBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (code.length === 4) {
        joinRoomByCode(code);
    } else {
        showError('Please enter a 4-character room code');
    }
});

cancelJoinBtn.addEventListener('click', () => {
    joinRoomModal.classList.add('hidden');
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        confirmJoinBtn.click();
    }
});

refreshRoomsBtn.addEventListener('click', requestRoomList);

startGameBtn.addEventListener('click', () => {
    if (networkState.isHost && networkState.players.size > 0) {
        handleStartGame();
    }
});

leaveRoomBtn.addEventListener('click', leaveRoom);

startWaveBtn.addEventListener('click', () => {
    if (networkState.isHost) {
        startWave();
    }
});

closeShopBtn.addEventListener('click', toggleShop);

returnLobbyBtn.addEventListener('click', returnToLobby);

document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        buyItem(btn.dataset.item, parseInt(btn.dataset.cost));
    });
});

// --- Initialize Connection ---
console.log('Connecting to server...');
connectToServer();
