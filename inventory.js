class Inventory {
    constructor() {
        this.slots = new Array(10).fill(null);
        this.selectedSlot = 1;
        this.inInventory = false;
        this.unlockReason = null; // "inventory" or "menu"

        this.containerImage = new Image();
        this.containerImage.src = "assets/minecraft/textures/gui/sprites/hud/container/inventory.png";
        this.isLoaded = false;
        this.containerImage.onload = () => { this.isLoaded = true; };

        this.setupPointerLockListener();
    }

    // --- ADDED THESE BACK ---
    getItem(index) {
        return this.slots[index];
    }

    setItem(index, item) {
        if (index >= 1 && index <= 9) {
            this.slots[index] = item;
        }
    }

    setupPointerLockListener() {
        document.addEventListener("pointerlockchange", () => {
            const isLocked = document.pointerLockElement !== null;
            if (!isLocked) {
                if (this.unlockReason === "inventory") {
                    this.inInventory = true;
                } else if (!this.unlockReason && window.gameMenu) {
                    window.gameMenu.show();
                }
            } else {
                this.inInventory = false;
                this.unlockReason = null;
            }
        });
    }

    toggle() {
        if (this.inInventory) {
            const game = document.getElementById('game');
            if (game) game.requestPointerLock();
        } else {
            this.unlockReason = "inventory";
            document.exitPointerLock();
        }
    }

    nextSlot() {
        if (this.inInventory) return;
        this.selectedSlot++;
        if (this.selectedSlot > 9) this.selectedSlot = 1;
    }

    prevSlot() {
        if (this.inInventory) return;
        this.selectedSlot--;
        if (this.selectedSlot < 1) this.selectedSlot = 9;
    }

    setSelected(index) {
        if (this.inInventory) return;
        if (index >= 1 && index <= 9) this.selectedSlot = index;
    }
}

window.inventory = new Inventory();

// Safety check for loading items
if (window.ItemRegistry && window.ItemRegistry.BLOCK_ITEMS) {
    window.inventory.setItem(2, window.ItemRegistry.BLOCK_ITEMS["crafting_table"]);
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') window.inventory.toggle();
    if (e.key >= '1' && e.key <= '9') window.inventory.setSelected(parseInt(e.key));
});

window.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) window.inventory.nextSlot();
    else window.inventory.prevSlot();
});
