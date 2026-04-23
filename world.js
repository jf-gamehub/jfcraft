window.scene = new THREE.Scene();
window.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
window.camera.rotation.order = 'YXZ';
window.scene.add(window.camera);

window.canvas = document.getElementById('game');
window.renderer = new THREE.WebGLRenderer({ canvas: window.canvas, antialias: false });
window.renderer.setSize(window.innerWidth, window.innerHeight);
window.renderer.autoClear = false;
window.scene.background = new THREE.Color(0x78A7FF);

// =========================
// SKY SHADER
// =========================
const skyVertexShader = `
    varying vec3 vWorldPosition;
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const skyFragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float cameraY;
    varying vec3 vWorldPosition;
    void main() {
        float h = normalize(vWorldPosition).y;
        float altitude = clamp((cameraY - 1.0) / 109.0, 0.0, 1.0);
        vec3 dynamicBottom = mix(bottomColor, topColor, altitude);
        float bias = altitude * 1.5;
        float transition = smoothstep(-0.01 - bias, 0.01 - bias, h);
        vec3 finalColor = mix(dynamicBottom, topColor, transition);
        float voidFactor = clamp(cameraY / 1.0, 0.0, 1.0);
        gl_FragColor = vec4(finalColor * voidFactor, 1.0);
    }
`;

const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
window.skyMat = new THREE.ShaderMaterial({
    uniforms: {
        topColor: { value: new THREE.Color(0xb2ceff) },
        bottomColor: { value: new THREE.Color(0x2d36b8) },
        cameraY: { value: 64.0 },
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide
});
window.skyMesh = new THREE.Mesh(skyGeo, window.skyMat);
window.scene.add(window.skyMesh);
window.skyMesh.renderOrder = 2;

// =========================
// GAME WORLD & CHUNKING
// =========================
function parseSeed(value) {
    if (value === undefined || value === null || value === "") {
        return Math.floor(Math.random() * 4294967296) - 2147483648;
    }
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
        return Math.floor(asNumber) | 0;
    }

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return hash;
}

class GameWorld {
    constructor() {
        window.worldInstance = this;
        this.renderDistance = 1; // 3x3 chunks
        this.createSeedControls();
        this.initializeWorld(parseSeed(''));
    }

    createSeedControls() {
        this.seedInput = document.getElementById('worldSeedInput');
        const seedButton = document.getElementById('worldSeedButton');
        if (!this.seedInput || !seedButton) return;

        seedButton.addEventListener('click', () => {
            this.initializeWorld(parseSeed(this.seedInput.value));
        });

        this.seedInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.initializeWorld(parseSeed(this.seedInput.value));
            }
        });
    }

    initializeWorld(seed) {
        this.seed = seed;
        this.world = new World(this.seed);
        if (this.seedInput) {
            this.seedInput.value = String(this.seed);
        }
        this.clearWorldChunks();
        this.initSpawn();
    }

    clearWorldChunks() {
        const toRemove = [];
        window.scene.children.forEach(child => {
            if (child.userData && Number.isInteger(child.userData.cx) && Number.isInteger(child.userData.cz)) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(child => {
            window.scene.remove(child);
            child.traverse(node => {
                if (node.geometry) node.geometry.dispose();
            });
        });
    }

    initSpawn() {
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                this.world.getChunk(x, z);
            }
        }
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                this.refreshChunk(x, z);
            }
        }
    }

    refreshChunk(cx, cz) {
        const oldChunk = window.scene.children.find(c => 
            c.userData && c.userData.cx === cx && c.userData.cz === cz
        );
        if (oldChunk) {
            window.scene.remove(oldChunk);
            oldChunk.children.forEach(c => { if(c.geometry) c.geometry.dispose(); });
        }
        // Ensure the chunk data exists before building its mesh.
        this.world.getChunk(cx, cz);
        const mesh = Block.generateChunkMesh(cx, cz);
        window.scene.add(mesh);
    }
}

window.worldInstance = new GameWorld();

// =========================
// SELECTION BOX
// =========================
const geo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
window.selectionBox = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
window.selectionBox.raycast = () => {};
window.selectionBox.visible = false;
window.scene.add(window.selectionBox);

// =========================
// INTERACTIONS
// =========================
window.addEventListener('resize', () => {
    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    window.renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("click", () => {
    const canvas = document.getElementById("game");
    if (document.pointerLockElement === canvas) return;
    canvas.requestPointerLock();
}, { once: true });

window.updateMeshArea = function(bx, bz) {
    const cx = Math.floor(bx / 16);
    const cz = Math.floor(bz / 16);
    const lx = ((bx % 16) + 16) % 16;
    const lz = ((bz % 16) + 16) % 16;
    const chunksToUpdate = new Set();
    chunksToUpdate.add(`${cx},${cz}`);
    if (lx === 0) {
        chunksToUpdate.add(`${cx-1},${cz}`);
        if (lz === 0) chunksToUpdate.add(`${cx-1},${cz-1}`);
        if (lz === 15) chunksToUpdate.add(`${cx-1},${cz+1}`);
    }
    if (lx === 15) {
        chunksToUpdate.add(`${cx+1},${cz}`);
        if (lz === 0) chunksToUpdate.add(`${cx+1},${cz-1}`);
        if (lz === 15) chunksToUpdate.add(`${cx+1},${cz+1}`);
    }
    if (lz === 0) chunksToUpdate.add(`${cx},${cz-1}`);
    if (lz === 15) chunksToUpdate.add(`${cx},${cz+1}`);
    for (const key of chunksToUpdate) {
        const [x, z] = key.split(',').map(Number);
        window.worldInstance.refreshChunk(x, z);
    }
};

window.breakBlock = function(bx, by, bz, playSound = true) {
    if (!window.worldInstance.world.hasBlock(bx, by, bz)) return;
    window.worldInstance.world.setBlock(bx, by, bz, 0);
    if (playSound) console.log("Block broke");
    window.updateMeshArea(bx, bz);
};

window.placeBlock = function(bx, by, bz, blockID = 3, playSound = true) {
    window.worldInstance.world.setBlock(bx, by, bz, blockID);
    if (playSound) console.log("Block placed");
    window.updateMeshArea(bx, bz);
};
