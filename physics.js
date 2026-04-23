window.Physics = {
    GRAVITY: 0.08,
    DRAG_AIR: 0.98,
    DRAG_GROUND: 0.91,
    PLAYER_WIDTH: 0.6,
    PLAYER_HEIGHT: 1.8,
    JUMP_FORCE: 0.42,

    apply: function(p) {
        let slipperiness = 0.6; 
        let friction = p.onGround ? (slipperiness * 0.91) : 0.91;
        
        // Base walk acceleration
        let accel = p.onGround ? (0.1 * Math.pow(0.6 / slipperiness, 3)) : 0.02;
        
        // SPEED MODIFIERS
        if (p.crouching) accel *= 0.30; // 30% of base
        else if (p.sprinting) accel *= 1.30;

        let inputX = (p.keys['KeyD'] ? 1 : 0) - (p.keys['KeyA'] ? 1 : 0);
        let inputZ = (p.keys['KeyS'] ? 1 : 0) - (p.keys['KeyW'] ? 1 : 0);
        const moveVec = new THREE.Vector3(inputX, 0, inputZ).normalize();
        // Move in the direction body is facing (only body yaw, not head)
        moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);

        // JUMPING (Cannot jump as high/effectively if crouching in some versions, but standard here)
        if (p.keys['Space'] && p.onGround) {
            p.velocity.y = this.JUMP_FORCE; 
            p.onGround = false;
            if (p.sprinting && !p.crouching) {
                const boostVec = new THREE.Vector3(inputX, 0, inputZ).normalize();
                boostVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
                p.velocity.x += boostVec.x * 0.2;
                p.velocity.z += boostVec.z * 0.2;
            }
        }

        p.velocity.x += moveVec.x * accel;
        p.velocity.z += moveVec.z * accel;

        // Y Movement
        p.position.y += p.velocity.y;
        this.resolve(p, 'y');

        // X Movement with EDGE SNAPPING
        let nextX = p.position.x + p.velocity.x;
        if (p.crouching && p.onGround && !this.isSafe(nextX, p.position.y, p.position.z, p)) {
            p.velocity.x = 0;
        } else {
            p.position.x = nextX;
            this.resolve(p, 'x');
        }

        // Z Movement with EDGE SNAPPING
        let nextZ = p.position.z + p.velocity.z;
        if (p.crouching && p.onGround && !this.isSafe(p.position.x, p.position.y, nextZ, p)) {
            p.velocity.z = 0;
        } else {
            p.position.z = nextZ;
            this.resolve(p, 'z');
        }

        p.velocity.x *= friction;
        p.velocity.z *= friction;
        p.velocity.y -= this.GRAVITY;
        p.velocity.y *= this.DRAG_AIR;
        if (p.velocity.y < -3.92) p.velocity.y = -3.92;
    },

    // Helper: Check if a block exists beneath the player's AABB
    isSafe: function(px, py, pz, p) {
        const hW = this.PLAYER_WIDTH / 2;
        const margin = 0.001;
        // Check 4 corners of the feet and the center
        const checkPoints = [
            {x: px - hW + margin, z: pz - hW + margin},
            {x: px + hW - margin, z: pz - hW + margin},
            {x: px - hW + margin, z: pz + hW - margin},
            {x: px + hW - margin, z: pz + hW - margin},
            {x: px, z: pz}
        ];
        
        for(let pt of checkPoints) {
            if (window.worldInstance.world.hasBlock(Math.floor(pt.x), Math.floor(py - 1), Math.floor(pt.z))) {
                return true; // There is floor somewhere under us
            }
        }
        return false;
    },

    resolve: function(p, axis) {
        const hW = this.PLAYER_WIDTH / 2;
        const margin = 0.001; 
        const minX = Math.floor(p.position.x - hW + margin);
        const maxX = Math.floor(p.position.x + hW - margin);
        const minY = Math.floor(p.position.y + margin);
        const maxY = Math.floor(p.position.y + this.PLAYER_HEIGHT - margin);
        const minZ = Math.floor(p.position.z - hW + margin);
        const maxZ = Math.floor(p.position.z + hW - margin);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (window.worldInstance.world.hasBlock(x, y, z)) {
                        if (axis === 'y') {
                            if (p.velocity.y > 0) {
                                p.position.y = y - this.PLAYER_HEIGHT - margin;
                                p.velocity.y = 0;
                            } else if (p.velocity.y < 0) {
                                p.position.y = y + 1;
                                p.velocity.y = 0;
                                p.onGround = true;
                            }
                        } else {
                            p.sprinting = false; 
                            if (axis === 'x') {
                                if (p.velocity.x > 0) p.position.x = x - hW - margin;
                                else if (p.velocity.x < 0) p.position.x = x + 1 + hW + margin;
                                p.velocity.x = 0;
                            } else if (axis === 'z') {
                                if (p.velocity.z > 0) p.position.z = z - hW - margin;
                                else if (p.velocity.z < 0) p.position.z = z + 1 + hW + margin;
                                p.velocity.z = 0;
                            }
                        }
                    }
                }
            }
        }
    }
};