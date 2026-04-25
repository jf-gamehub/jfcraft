class ControlPlayer {
    constructor(entity) {
        this.entity = entity;
        this.keys = {};

        this.leftClicking = false;
        this.rightClicking = false;

        this.camera = window.camera;

        this.initInput();
        this.sensitivity = 0.8; // 0 → 1 (like Minecraft)
    }

    initInput() {

        document.addEventListener('keydown', (e) => {
            if (window.gameMenu && window.gameMenu.inMenu) return;

            this.entity.keys[e.code] = true;

            if (e.code === 'KeyR') {
                const onlyW =
                    this.entity.keys['KeyW'] &&
                    !this.entity.keys['KeyA'] &&
                    !this.entity.keys['KeyS'] &&
                    !this.entity.keys['KeyD'];

                if (onlyW && !this.entity.keys['ShiftLeft']) {
                    this.entity.sprinting = true;
                }
            }

            if (e.code === 'KeyV') {
                if (this.entity.perspective === 'firstPerson') {
                    this.entity.perspective = 'thirdPersonBack';
                } else if (this.entity.perspective === 'thirdPersonBack') {
                    this.entity.perspective = 'thirdPersonFront';
                } else {
                    this.entity.perspective = 'firstPerson';
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.entity.keys[e.code] = false;
            if (e.code === 'KeyW') this.entity.sprinting = false;
        });

        document.addEventListener('mousedown', (e) => {
            if (window.gameMenu && window.gameMenu.inMenu) return;

            const isLocked = document.pointerLockElement === window.canvas;
            if (!isLocked) return;

            if (e.button === 0) {
                this.entity.leftClicking = true;

                if (this.entity.breakCooldown <= 0) {
                    this.entity.breakBlock();
                    this.entity.breakCooldown = 6;
                }
            }

            if (e.button === 2) {
                this.entity.rightClicking = true;

                if (this.entity.placeCooldown <= 0) {
                    this.entity.placeBlock();
                    this.entity.placeCooldown = 4;
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.entity.leftClicking = false;
            if (e.button === 2) this.entity.rightClicking = false;
        });

        document.addEventListener('mousemove', (e) => {
    const isLocked = document.pointerLockElement === window.canvas;
    const menuOpen = window.gameMenu && window.gameMenu.inMenu;

    if (isLocked && !menuOpen) {

        // === MC sensitivity curve ===
        const sens = this.sensitivity;
        const f = sens * 0.6 + 0.2;
        const multiplier = f * f * f * 8.0;

        const dx = e.movementX * multiplier * 0.002;
        const dy = e.movementY * multiplier * 0.002;

        const maxHeadYaw = 35 * Math.PI / 180;

        this.entity.headYaw -= dx;

        if (this.entity.headYaw > maxHeadYaw) {
            this.entity.yaw += this.entity.headYaw - maxHeadYaw;
            this.entity.headYaw = maxHeadYaw;
        } else if (this.entity.headYaw < -maxHeadYaw) {
            this.entity.yaw += this.entity.headYaw + maxHeadYaw;
            this.entity.headYaw = -maxHeadYaw;
        }

        this.entity.pitch -= dy;

        this.entity.pitch = Math.max(
            -Math.PI / 2 + 0.01,
            Math.min(Math.PI / 2 - 0.01, this.entity.pitch)
        );
    }
});

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('resize', () => {
            const a = window.innerWidth / window.innerHeight;

            window.uiCam.aspect = a;
            window.uiCam.updateProjectionMatrix();

            this.entity.handPivot.position.x = a - 0.45;
        });
    }

}

window.ControlPlayer = ControlPlayer;