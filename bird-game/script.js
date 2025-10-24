import * as THREE from 'three';
// Note: We don't need the GLTFLoader for this base example,
// but you would add it back here if you load a model.

// --- Basic Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

const camera = new THREE.PerspectiveCamera(
    75, // Field of View
    window.innerWidth / window.innerHeight, // Aspect Ratio
    0.1, // Near clip
    1000 // Far clip
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// --- Objects ---
// Baseplate (the ground)
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228B22, // Forest green
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- Player (Bird) Setup ---
// We create an empty Object3D to act as the player controller.
// This object will move and rotate (yaw) left/right.
const bird = new THREE.Object3D();
bird.position.y = 2; // Start 2 units above the ground
scene.add(bird);

// --- Camera Setup ---
// We make the camera a child of the 'bird' (player) object.
// It will be positioned at "eye level" inside the player.
// The camera itself will handle (pitch) up/down rotation.
camera.position.set(0, 0.5, 0); // Position camera at "eye level"
bird.add(camera); // Attach camera to the player object

// --- Controls ---

// 1. Keyboard Controls
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false
};

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') {
        keys.space = true;
    } else if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') {
        keys.space = false;
    } else if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
});

// 2. Mouse Controls (NEW)

const mouseSensitivity = 0.002;
const maxPitch = Math.PI / 2 - 0.1; // 90 degrees, minus a small buffer
const minPitch = -maxPitch;

// This function runs when the mouse is moved
function handleMouseMove(e) {
    // Rotate the player (bird) left/right (Yaw)
    // We rotate the PARENT object (bird) around its Y-axis.
    bird.rotation.y -= e.movementX * mouseSensitivity;

    // Rotate the camera up/down (Pitch)
    // We rotate the CHILD object (camera) around its X-axis.
    camera.rotation.x -= e.movementY * mouseSensitivity;

    // Clamp the pitch rotation to prevent flipping upside down
    camera.rotation.x = Math.max(minPitch, Math.min(maxPitch, camera.rotation.x));
}

// Add event listeners for Pointer Lock
document.body.addEventListener('click', () => {
    // Lock the pointer when the user clicks on the game
    document.body.requestPointerLock();
});

// Listen for the pointer lock status
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        // Pointer is locked, add the mousemove listener
        document.addEventListener('mousemove', handleMouseMove);
    } else {
        // Pointer is unlocked, remove the listener
        document.removeEventListener('mousemove', handleMouseMove);
    }
});


// --- Game Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time since last frame
    const moveSpeed = 5 * delta; // units per second

    // --- Update Bird Movement ---

    // Forward/Backward (local Z axis)
    // This now moves in the direction the camera is facing
    if (keys.w) {
        bird.translateZ(moveSpeed);
    }
    if (keys.s) {
        bird.translateZ(-moveSpeed);
    }

    // Strafe Left/Right (local X axis) (CHANGED)
    // 'A' and 'D' no longer turn, they strafe.
    if (keys.a) {
        bird.translateX(-moveSpeed);
    }
    if (keys.d) {
        bird.translateX(moveSpeed);
    }

    // Fly Up/Down (world Y axis) (UNCHANGED)
    if (keys.space) {
        bird.position.y += moveSpeed;
    }
    if (keys.shift) {
        // Prevent flying through the ground
        if (bird.position.y > 0.7) { // 0.5 (camera) + 0.2 (buffer)
            bird.position.y -= moveSpeed;
        }
    }

    // Render the scene from the camera's perspective
    renderer.render(scene, camera);
}

// --- Handle Window Resizing ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});

// Start the game loop!
animate();
