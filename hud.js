class HUD {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        Object.assign(this.canvas.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            pointerEvents: 'none', zIndex: '10'
        });
        document.body.appendChild(this.canvas);

        this.image = new Image();
        this.image.src = "assets/minecraft/textures/gui/sprites/hud/hotbar.png";
        this.isLoaded = false;
        this.image.onload = () => { this.isLoaded = true; };

        this.hotbarSource = { x: 0, y: 0, w: 182, h: 22 };
        this.selectorSource = { x: 0, y: 22, w: 24, h: 24 };

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
    }

    render() {
        if (!this.isLoaded) return;
        const ctx = this.ctx;
        const manager = window.uiManager;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // --- 1. DARK OVERLAY FOR MENUS ---
        // If the Game Menu is open or Inventory is open, darken the background
        if ((window.gameMenu && window.gameMenu.visible) || (window.inventory && window.inventory.inInventory)) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0, 0, w, h);
        }

        // --- 2. HOTBAR RENDER ---
        const hbW = this.hotbarSource.w;
        const hbH = this.hotbarSource.h;
        const screenX = manager.toScreen(manager.centerX(w) - (hbW / 2));
        const screenY = h - manager.toScreen(hbH);

        ctx.drawImage(this.image, 0, 0, hbW, hbH, screenX, screenY, manager.toScreen(hbW), manager.toScreen(hbH));

        // Draw Hotbar Items
        for (let i = 1; i <= 9; i++) {
            const item = window.inventory.getItem(i);
            if (!item) continue;
            const slotX = screenX + manager.toScreen((i - 1) * 20 + 3);
            const slotY = screenY + manager.toScreen(3);
            this.drawItemIcon(ctx, item, slotX, slotY, manager.toScreen(16));
        }

        // Draw Selector
        const currentSlot = window.inventory.selectedSlot;
        const slotOffset = ((currentSlot - 1) * 20) - 1; 
        ctx.drawImage(this.image, 0, 22, 24, 24, screenX + manager.toScreen(slotOffset), screenY - manager.toScreen(1), manager.toScreen(24), manager.toScreen(24));

        // --- 3. FULL INVENTORY (E MENU) ---
        if (window.inventory && window.inventory.inInventory && window.inventory.isLoaded) {
            const invW = 176;
            const invH = 166;
            const invX = manager.toScreen(manager.centerX(w) - (invW / 2));
            const invY = (h / 2) - (manager.toScreen(invH) / 2);

            // Draw the container background
            ctx.drawImage(window.inventory.containerImage, 0, 0, invW, invH, invX, invY, manager.toScreen(invW), manager.toScreen(invH));

            // Mirror hotbar items inside the container bottom row
            for (let i = 1; i <= 9; i++) {
                const item = window.inventory.getItem(i);
                if (!item) continue;
                const menuSlotX = invX + manager.toScreen(8 + (i - 1) * 18);
                const menuSlotY = invY + manager.toScreen(142);
                this.drawItemIcon(ctx, item, menuSlotX, menuSlotY, manager.toScreen(16));
            }
        }
    }

    drawItemIcon(ctx, item, x, y, size) {
        if (!item.isBlock) {
            this._drawFace(ctx, item.texture, (img) => {
                ctx.drawImage(img, x, y, size, size);
            });
            return;
        }

        const textures = item.texture;
        const w = size * 0.55;
        const h = size * 0.55;
        const skew = 0.5;

        // Top Face
        this._drawFace(ctx, textures[2], (img) => {
            ctx.save();
            ctx.translate(x + size / 2, y + h * 0.4);
            ctx.transform(1, skew, -1, skew, 0, 0);
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
        });

        // Left Face
        this._drawFace(ctx, textures[0], (img) => {
            ctx.save();
            ctx.translate(x + size * 0.28, y + h * 1.1);
            ctx.transform(1, skew, 0, 1, 0, 0);
            ctx.filter = 'brightness(0.8)';
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
        });

        // Right Face
        this._drawFace(ctx, textures[4], (img) => {
            ctx.save();
            ctx.translate(x + size * 0.72, y + h * 1.1);
            ctx.transform(1, -skew, 0, 1, 0, 0);
            ctx.filter = 'brightness(0.6)';
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
        });
    }

    _drawFace(ctx, src, drawFn) {
        if (!src) return;
        if (!this.iconCache) this.iconCache = {};
        if (!this.iconCache[src]) {
            const img = new Image();
            img.src = src;
            img.onload = () => { this.iconCache[src] = img; };
            return;
        }
        drawFn(this.iconCache[src]);
    }
}

window.hud = new HUD();
