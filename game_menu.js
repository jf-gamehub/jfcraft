class UIPair {
    constructor(btnLeft, btnRight, pairGap = 4) {
        if (pairGap % 2 !== 0) {
            console.log("Pairgaps can only be even");
            pairGap += 1;
        }
        this.btnLeft = btnLeft;
        this.btnRight = btnRight;
        this.pairGap = pairGap;
    }
}

class GameMenu {
    constructor() {
        this.visible = false;
        this.buttons = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        
        Object.assign(this.canvas.style, {
            position: "fixed",
            left: "0",
            top: "0",
            width: "100vw",
            height: "100vh",
            zIndex: "100000",
            display: "none",
            pointerEvents: "none",
            imageRendering: "pixelated"
        });
        document.body.appendChild(this.canvas);

        this.setupInput();
        this.createButtons();
        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());
        this.loop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupInput() {
        // We only listen for the error/cooldown here
        document.addEventListener("pointerlockerror", () => {
            console.warn("Pointer lock blocked by browser cooldown. Retrying in 3s...");
            setTimeout(() => {
                const game = document.getElementById("game");
                if (!this.visible && game && document.pointerLockElement !== game) {
                    game.requestPointerLock();
                }
            }, 3000);
        });

        // The logic for SHOWING the menu is now in inventory.js 
        // via the document pointerlockchange listener.

        this.canvas.addEventListener("mousedown", (e) => {
            if (!this.visible) return;
            const rect = this.canvas.getBoundingClientRect();
            const mouse = window.uiManager.mouse(e, rect);
            for (let item of this.buttons) {
                if (!item) continue;
                if (item instanceof UIPair) {
                    if (item.btnLeft.contains(mouse.x, mouse.y)) item.btnLeft.onClick();
                    if (item.btnRight.contains(mouse.x, mouse.y)) item.btnRight.onClick();
                } else if (item.contains(mouse.x, mouse.y)) {
                    item.onClick();
                }
            }
        });

        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouse = window.uiManager.mouse(e, rect);
            this.mouseX = mouse.x;
            this.mouseY = mouse.y;
        });
    }

    createButtons() {
        this.buttons = [
            new UIButton({ text: "Back to Game", width: 200, onClick: () => this.hide() }),
            new UIPair(
                new UIButton({ text: "Achievements", width: 98, disabled: true }),
                new UIButton({ text: "Statistics", width: 98 }),
                4
            ),
            null,
            new UIPair(
                new UIButton({ text: "Options...", width: 98, onClick: () => { this.deactivate(); window.optionsMenu.show(); } }),
                new UIButton({ text: "Invite", width: 98, disabled: true }),
                4
            ),
            new UIButton({ text: "Save and Quit to Title", width: 200, onClick: () => location.reload() })
        ];
    }

    show() {
        this.visible = true;
        this.canvas.style.display = "block";
        this.canvas.style.pointerEvents = "auto";
    }

    deactivate() {
        this.visible = false;
        this.canvas.style.display = "none";
        this.canvas.style.pointerEvents = "none";
    }

    hide() {
        this.deactivate();
        const game = document.getElementById("game");
        if (game) game.requestPointerLock();
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        if (!this.visible) return;
        
        const { ctx, canvas, buttons } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background Tint
        ctx.fillStyle = "rgba(0, 0, 0, 0.627)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = window.uiManager.centerX(canvas.width);
        const startY = window.uiManager.centerY(canvas.height) + 9;
        let currentRow = 0;

        buttons.forEach((item) => {
            if (item === null) { currentRow++; return; }
            const y = Math.floor(startY + (currentRow * 24));
            
            if (item instanceof UIPair) {
                const total = item.btnLeft.width + item.pairGap + item.btnRight.width;
                const startX = centerX - total / 2;
                item.btnLeft.x = Math.floor(startX);
                item.btnLeft.y = y;
                item.btnRight.x = Math.floor(startX + item.btnLeft.width + item.pairGap);
                item.btnRight.y = y;
                
                [item.btnLeft, item.btnRight].forEach(b => {
                    b.setHover(b.contains(this.mouseX, this.mouseY));
                    b.draw(ctx);
                });
            } else {
                item.x = Math.floor(centerX - item.width / 2);
                item.y = y;
                item.setHover(item.contains(this.mouseX, this.mouseY));
                item.draw(ctx);
            }
            currentRow++;
        });
    }
}

window.gameMenu = new GameMenu();
