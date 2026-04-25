// tick.js

let lastTickTime = performance.now();
let lastRenderTime = performance.now();

const TICK_RATE = 50; // ms per tick (20 TPS)
const baseFOV = 90;
const sprintMultiplier = 1.1;

// Minecraft 1.12.2 World Time (0 - 24000)
window.worldTime = 23000; 

// --- CONFIGURATION ---
const WORLD_CONFIG = {
    sunsetStart: 10000,
    sunsetMid:   12000,
    sunsetEnd:   14000,
    sunriseStart: 22000,
    sunriseMid:   23000,
    sunriseEnd:   24000
};

// Colors
const DAY_TOP = new THREE.Color(0xb2ceff);
const DAY_BOTTOM = new THREE.Color(0x2d36b8);
const NIGHT_COLOR = new THREE.Color(0x000000);
const SUNSET_ORANGE = new THREE.Color(0xff7044);
const SUNSET_RED = new THREE.Color(0xff4422);

// Sun setup
const sunLoader = new THREE.TextureLoader();
const sunTex = sunLoader.load('assets/minecraft/textures/environment/sun.png');
sunTex.magFilter = THREE.NearestFilter;
sunTex.minFilter = THREE.NearestFilter;

const sunGeo = new THREE.PlaneGeometry(100, 100);
const sunMat = new THREE.MeshBasicMaterial({ 
    map: sunTex, 
    transparent: true, 
    blending: THREE.AdditiveBlending, 
    side: THREE.DoubleSide, 
    depthWrite: false, 
    depthTest: true 
});

window.sunMesh = new THREE.Mesh(sunGeo, sunMat);
window.sunMesh.renderOrder = 1;
window.scene.add(window.sunMesh);

// NPCs
window.npcs = [];
window.npcs.push(new EntityNPC());

function updateUI() {
    const dirElement = document.getElementById('dirfacing');
    const coordsElement = document.getElementById('coords');
    const speedElement = document.getElementById('speed');
    const player = window.playerEntity;
    if (!player) return;

    let yaw = player.yaw % (Math.PI * 2);
    if (yaw < 0) yaw += Math.PI * 2;

    const directions = ['South', 'East', 'North', 'West'];
    const index = Math.round(yaw / (Math.PI / 2)) % 4;

    let status = player.crouching ? " (Crouching)" : (player.sprinting ? " (Sprinting)" : "");
    dirElement.innerText = directions[index] + status;

    const p = player.position;
    coordsElement.innerText = `${p.x.toFixed(3)} / ${p.y.toFixed(3)} / ${p.z.toFixed(3)}`;
    
    const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2) * 20;
    speedElement.innerText = speed.toFixed(3);
}

// --------------------------------------------------
// 🔥 FIXED TIMESTEP LOOP (NO MORE DRIFT)
// --------------------------------------------------

let accumulator = 0;
const FIXED_DT = TICK_RATE;

function gameLoop() {
    const now = performance.now();
    let frameTime = now - lastTickTime;

    // prevent spiral of death
    if (frameTime > 100) frameTime = 100;

    lastTickTime = now;
    accumulator += frameTime;

    while (accumulator >= FIXED_DT) {

        // === GAME TICK ===
        if (window.playerEntity) {
            window.playerEntity.tick(window.world);
            window.npcs.forEach(npc => npc.tick(window.world));
        }

        // Advance time
        window.worldTime = (window.worldTime + 1) % 24000;

        if (window.hud && window.player) {
            hud.update(player);
        }

        accumulator -= FIXED_DT;
    }

    const partialTick = accumulator / FIXED_DT;

    render(partialTick);
    requestAnimationFrame(gameLoop);
}

// --------------------------------------------------
// 🎨 RENDER
// --------------------------------------------------

function render(partialTick) {
    const player = window.playerEntity;
    if (!player || !window.renderer) return;

    const now = performance.now();
    const dt = (now - lastRenderTime) / 1000;
    lastRenderTime = now;

    // Player + NPC interpolation
    player.renderUpdate(partialTick);
    window.npcs.forEach(npc => npc.renderUpdate(partialTick));

    // Sky follows camera
    if (window.skyMesh && window.skyMat) {
        window.skyMesh.position.copy(window.camera.position);
        window.skyMat.uniforms.cameraY.value = window.camera.position.y;
    }

    // Sky color logic
    const vT = window.worldTime;
    let topTarget = new THREE.Color();
    let botTarget = new THREE.Color();

    if (vT < WORLD_CONFIG.sunsetStart) {
        topTarget.copy(DAY_TOP);
        botTarget.copy(DAY_BOTTOM);
    } else if (vT < WORLD_CONFIG.sunsetMid) {
        let a = (vT - WORLD_CONFIG.sunsetStart) / (WORLD_CONFIG.sunsetMid - WORLD_CONFIG.sunsetStart);
        topTarget.copy(DAY_TOP).lerp(SUNSET_ORANGE, a);
        botTarget.copy(DAY_BOTTOM).lerp(NIGHT_COLOR, a);
    } else if (vT < WORLD_CONFIG.sunsetEnd) {
        let a = (vT - WORLD_CONFIG.sunsetMid) / (WORLD_CONFIG.sunsetEnd - WORLD_CONFIG.sunsetMid);
        topTarget.copy(SUNSET_ORANGE).lerp(NIGHT_COLOR, a);
        botTarget.copy(NIGHT_COLOR);
    } else if (vT < WORLD_CONFIG.sunriseStart) {
        topTarget.copy(NIGHT_COLOR);
        botTarget.copy(NIGHT_COLOR);
    } else if (vT < WORLD_CONFIG.sunriseMid) {
        let a = (vT - WORLD_CONFIG.sunriseStart) / (WORLD_CONFIG.sunriseMid - WORLD_CONFIG.sunriseStart);
        topTarget.copy(NIGHT_COLOR).lerp(SUNSET_RED, a);
        botTarget.copy(NIGHT_COLOR);
    } else {
        let a = (vT - WORLD_CONFIG.sunriseMid) / (WORLD_CONFIG.sunriseEnd - WORLD_CONFIG.sunriseMid);
        topTarget.copy(SUNSET_RED).lerp(DAY_TOP, a);
        botTarget.copy(NIGHT_COLOR).lerp(DAY_BOTTOM, a);
    }

    if (window.skyMat) {
        window.skyMat.uniforms.topColor.value.copy(topTarget);
        window.skyMat.uniforms.bottomColor.value.copy(botTarget);
    }

    // Sun positioning
    if (window.sunMesh && window.camera) {
        let sunAngle = (window.worldTime / 12000) * Math.PI;
        const distance = 150;
        const pitchOffset = 0.1;

        window.sunMesh.position.set(
            window.camera.position.x - Math.cos(sunAngle) * distance,
            window.camera.position.y + (Math.sin(sunAngle) + pitchOffset) * distance,
            window.camera.position.z
        );

        window.sunMesh.lookAt(window.camera.position);
    }

    // FOV smoothing (sprinting)
    const targetFOV = player.sprinting ? (baseFOV * sprintMultiplier) : baseFOV;
    window.camera.fov = THREE.MathUtils.lerp(
        window.camera.fov,
        targetFOV,
        1 - Math.exp(-10 * dt)
    );
    window.camera.updateProjectionMatrix();

    if (window.hud) window.hud.render();

    // Render pipeline
    window.renderer.clear();
    window.renderer.render(window.scene, window.camera);
    window.renderer.clearDepth();

    if (window.uiScene && window.uiCam) {
        window.renderer.render(window.uiScene, window.uiCam);
    }

    updateUI();
}

// --------------------------------------------------
// 🚀 START
// --------------------------------------------------

window.playerEntity = new EntityPlayer();
window.playerController = new ControlPlayer(window.playerEntity);

gameLoop();