window.BlockRegistry = {
    AIR: {
        "air": {
            blockID: 0,
            opacity: 15,
            interactable: false,
            textures: [null, null, null, null, null, null],
            overlays: [null, null, null, null, null, null],
            tint: null
        }
    },

    SOLID: {
        "stone": {
            blockID: 1,
            opacity: 15,
            interactable: false,
            tint: null,
            textures: Array(6).fill(
                'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/stone.png'
            ),
            overlays: Array(6).fill(null)
        },

        "grass_block": {
            blockID: 2,
            opacity: 15,
            interactable: false,
            tint: { top: true },
            textures: [
                'assets/minecraft/textures/block/grass_block_side.png',
                'assets/minecraft/textures/block/grass_block_side.png',
                'assets/minecraft/textures/block/grass_block_top.png',
                'assets/minecraft/textures/block/dirt.png',
                'assets/minecraft/textures/block/grass_block_side.png',
                'assets/minecraft/textures/block/grass_block_side.png'
            ],
            overlays: [
                'assets/minecraft/textures/block/grass_block_side_overlay.png',
                'assets/minecraft/textures/block/grass_block_side_overlay.png',
                null,
                null,
                'assets/minecraft/textures/block/grass_block_side_overlay.png',
                'assets/minecraft/textures/block/grass_block_side_overlay.png'
            ]
        },

        "dirt": {
            blockID: 3,
            opacity: 15,
            interactable: false,
            tint: null,
            textures: Array(6).fill(
                'assets/minecraft/textures/block/dirt.png'
            ),
            overlays: Array(6).fill(null)
        },

        "cobblestone": {
            blockID: 4,
            opacity: 15,
            interactable: false,
            tint: null,
            textures: Array(6).fill(
                'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/cobblestone.png'
            ),
            overlays: Array(6).fill(null)
        },

        "oak_planks": {
            blockID: 5,
            opacity: 15,
            interactable: false,
            tint: null,
            textures: Array(6).fill(
                'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/oak_planks.png'
            ),
            overlays: Array(6).fill(null)
        },

        "bedrock": {
            blockID: 7,
            opacity: 15,
            interactable: false,
            tint: null,
            textures: Array(6).fill(
                'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/block/bedrock.png'
            ),
            overlays: Array(6).fill(null)
        },

        "crafting_table": {
            blockID: 58,
            opacity: 15,
            interactable: true,
            tint: null,
            textures: [
                'assets/minecraft/textures/block/crafting_table_front.png',
                'assets/minecraft/textures/block/crafting_table_side.png',
                'assets/minecraft/textures/block/crafting_table_top.png',
                'assets/minecraft/textures/block/oak_planks.png',
                'assets/minecraft/textures/block/crafting_table_side.png',
                'assets/minecraft/textures/block/crafting_table_side.png'
            ],
            overlays: Array(6).fill(null)
        }
    }
};

window.BlockById = {};

for (const typeKey in window.BlockRegistry) {
    const type = window.BlockRegistry[typeKey];

    for (const blockKey in type) {
        const block = type[blockKey];
        window.BlockById[block.blockID] = block;
    }
}