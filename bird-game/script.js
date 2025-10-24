import * as THREE from 'three';

// --- Basic Scene Setup ---
// Scene: Holds all objects, lights, and cameras
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera: What the user sees
const camera = new THREE.PerspectiveCamera(
    75, // Field of View
    window.innerWidth / window.innerHeight, // Aspect Ratio
    0.1, // Near clip
    1000 // Far clip
);

// Renderer: Draws the scene onto the <canvas>
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; // Enable shadows
document.body.appendChild(renderer.domElement); // Add canvas to the page

// --- Lighting ---
// Ambient light: Shines on everything equally
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Directional light: Acts like the sun
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = true;
// Configure shadow properties
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
ground.rotation.x = -Math.PI / 2; // Rotate it to be flat
ground.receiveShadow = true; // Allow shadows to be cast on it
scene.add(ground);

// Bird (Player) - Using a simple cone as a placeholder
const birdGeometry = new THREE.ConeGeometry(0.2, 0.5, 8); // radius, height, segments
const birdMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
const bird = new THREE.Mesh(birdGeometry, birdMaterial);
bird.castShadow = true;
bird.position.y = 2; // Start 2 units above the ground
// Rotate the cone to point "forward" (along its local Z-axis)
bird.rotation.x = Math.PI / 2;
scene.add(bird);

// --- Camera Setup ---
// We will make the camera a child of the bird, so it follows automatically.
// Position the camera behind and slightly above the bird.
const cameraOffset = new THREE.Vector3(0, 1.5, -3);
camera.position.copy(cameraOffset);
camera.lookAt(bird.position); // Look at the bird's center
bird.add(camera); // Attach camera to bird

// --- Controls ---
// Keep track of which keys are pressed
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false
};

// Event Listeners for keyboard input
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

// --- Game Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time since last frame (for smooth movement)
    const moveSpeed = 5 * delta; // units per second
    const turnSpeed = 2 * delta; // radians per second

    // --- Update Bird Movement ---
    // Forward/Backward (local Z axis)
    if (keys.w) {
        bird.translateZ(moveSpeed);
    }
    if (keys.s) {
        bird.translateZ(-moveSpeed);
    }

    // Turn Left/Right (local Y axis)
    if (keys.a) {
        bird.rotateY(turnSpeed);
    }
    if (keys.d) {
        bird.rotateY(-turnSpeed);
    }

    // Fly Up/Down (world Y axis)
    if (keys.space) {
        bird.position.y += moveSpeed;
    }
    if (keys.shift) {
        // Prevent flying through the ground
        if (bird.position.y > 0.5) {
            bird.position.y -= moveSpeed;
        }
    }

    // Render the scene
    renderer.render(scene, camera);
}

// --- Handle Window Resizing ---
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});

// Start the game loop!
animate();
