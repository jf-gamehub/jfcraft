window.ItemRegistry = {
    // 1. Standard flat-texture items
    ITEMS: {
        "stick": {
            itemID: 280,
            name: "Stick",
            texture: "assets/minecraft/textures/item/stick.png",
            isBlock: false
        }
    },

    // 2. Items that represent placeable blocks
    BLOCK_ITEMS: {}
};

// Auto-fill BLOCK_ITEMS using your existing BlockRegistry
for (const category in window.BlockRegistry) {
    for (const key in window.BlockRegistry[category]) {
        const block = window.BlockRegistry[category][key];
        if (block.blockID === 0) continue; // Skip air

        window.ItemRegistry.BLOCK_ITEMS[key] = {
            itemID: block.blockID, // Using BlockID as ItemID for blocks (like MC)
            name: key.replace(/_/g, ' '),
            // Use the top texture as the icon for the inventory
            texture: block.textures, 
            isBlock: true,
            blockData: block
        };
    }
}

// 3. Helper for quick lookup by ID
window.ItemById = {};

// Register flat items
for (const key in window.ItemRegistry.ITEMS) {
    const item = window.ItemRegistry.ITEMS[key];
    window.ItemById[item.itemID] = item;
}

// Register block items
for (const key in window.ItemRegistry.BLOCK_ITEMS) {
    const item = window.ItemRegistry.BLOCK_ITEMS[key];
    window.ItemById[item.itemID] = item;
}
