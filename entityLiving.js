class EntityLiving extends Entity {
    constructor() {
        super();
        this.position = new THREE.Vector3();
        this.prevPosition = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
    }

    findSafeLocation() {
        let tx = Math.floor(Math.random() * 16);
        let tz = Math.floor(Math.random() * 16);
        let ty = 100;
        let found = false;

        for (let y = 255; y >= 0; y--) {
            if (window.worldInstance.world.hasBlock(tx, y, tz) && !window.worldInstance.world.hasBlock(tx, y + 1, tz) && !window.worldInstance.world.hasBlock(tx, y + 2, tz)) {
                ty = y + 1;
                found = true;
                break;
            }
        }
        this.position.set(tx + 0.5, ty, tz + 0.5);
        this.prevPosition.copy(this.position);
        this.velocity.set(0, 0, 0);
    }

    // Both call the same logic
    spawn() { this.findSafeLocation(); }
    respawn() { this.findSafeLocation(); }

    tick(world) {
        window.Physics.apply(this);
    }
}
