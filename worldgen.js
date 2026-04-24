class SeededRandom {
    constructor(seed = 0n) {
        this.setSeed(seed);
    }

    setSeed(seed) {
        if (typeof seed === 'number') {
            seed = BigInt(seed);
        }
        this.seed = (BigInt(seed) ^ 0x5deece66dn) & ((1n << 48n) - 1n);
    }

    next(bits) {
        this.seed = (this.seed * 25214903917n + 11n) & ((1n << 48n) - 1n);
        return Number(this.seed >> (48n - BigInt(bits)));
    }

    nextInt(bound) {
        if (bound <= 0) return 0;
        const boundBig = BigInt(bound);
        if ((bound & (bound - 1)) === 0) {
            return Number((boundBig * BigInt(this.next(31))) >> 31n);
        }

        let bits, value;
        do {
            bits = BigInt(this.next(31));
            value = bits % boundBig;
        } while (bits - value + boundBig - 1n < 0n);
        return Number(value);
    }

    nextLong() {
        return (BigInt(this.next(32)) << 32n) | BigInt(this.next(32));
    }

    nextLongOdd() {
        const value = this.nextLong();
        return value % 2n === 0n ? value + 1n : value;
    }

    nextFloat() {
        return this.next(24) / 16777216;
    }

    nextDouble() {
        const high = BigInt(this.next(26));
        const low = BigInt(this.next(27));
        return Number((high << 27n) + low) / 9007199254740992;
    }
}

// ============================================================
// Chunk
// ============================================================
class Chunk {
    constructor(chunkX, chunkZ) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.width = 16;
        this.height = 256;
        this.depth = 16;
        this.blocks = new Uint8Array(this.width * this.height * this.depth);
    }

    // Convert local x, y, z to array index
    index(x, y, z) {
        return (y * 16 + z) * 16 + x;
    }

    setBlock(x, y, z, id) {
        this.blocks[this.index(x, y, z)] = id;
    }

    setWorldBlock(wx, y, wz, id) {
        const lx = wx - this.chunkX * 16;
        const lz = wz - this.chunkZ * 16;
        if (lx < 0 || lx >= 16 || lz < 0 || lz >= 16 || y < 0 || y >= 256) return;
        this.setBlock(lx, y, lz, id);
    }

    getBlock(x, y, z) {
        return this.blocks[this.index(x, y, z)];
    }

    generateData() {
        const height = 99; // Flat world surface height
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                for (let y = 0; y <= height; y++) {
                    let block = window.BlockRegistry.SOLID.STONE;
                    if (y === height) {
                        block = window.BlockRegistry.SOLID.GRASS;
                    } else if (y > height - 5) {
                        block = window.BlockRegistry.SOLID.DIRT;
                    } else if (y === 0) {
                        block = window.BlockRegistry.SOLID.BEDROCK;
                    }
                    this.setBlock(x, y, z, block.blockID);
                }
            }
        }
    }
}

// ==============================
// 1.18-STYLE CAVE DENSITY FIELD
// ==============================

function hash3(x, y, z) {
    return Math.sin(x * 374761393 + y * 668265263 + z * 1442695041) * 43758.5453 % 1;
}

function noise3(x, y, z) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);

    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;

    function n(x, y, z) {
        return hash3(x, y, z);
    }

    const n000 = n(xi, yi, zi);
    const n100 = n(xi + 1, yi, zi);
    const n010 = n(xi, yi + 1, zi);
    const n110 = n(xi + 1, yi + 1, zi);

    const n001 = n(xi, yi, zi + 1);
    const n101 = n(xi + 1, yi, zi + 1);
    const n011 = n(xi, yi + 1, zi + 1);
    const n111 = n(xi + 1, yi + 1, zi + 1);

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);

    const x00 = n000 + (n100 - n000) * u;
    const x10 = n010 + (n110 - n010) * u;
    const x01 = n001 + (n101 - n001) * u;
    const x11 = n011 + (n111 - n011) * u;

    const y0 = x00 + (x10 - x00) * v;
    const y1 = x01 + (x11 - x01) * v;

    return y0 + (y1 - y0) * w;
}

// ============================================================
// Chunk Generator
// ============================================================
class ChunkGenerator {
    constructor(seed) {
        this.seed = BigInt(seed);
    }

    generateChunk(chunkX, chunkZ) {
        const chunk = new Chunk(chunkX, chunkZ);
        chunk.generateData();
        this.generateCaves(chunk);
        return chunk;
    }

    createChunkRandom(chunkX, chunkZ) {
        const baseRandom = new SeededRandom(this.seed);
        const a = baseRandom.nextLongOdd();
        const b = baseRandom.nextLongOdd();
        return new SeededRandom((BigInt(chunkX) * a + BigInt(chunkZ) * b) ^ this.seed);
    }

    generateCaves(chunk) {
    const scale = 0.015;
    const caveThreshold = 0.55;

    for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
            for (let y = 0; y < 256; y++) {

                const wx = chunk.chunkX * 16 + x;
                const wz = chunk.chunkZ * 16 + z;

                // 1. terrain bias (keeps surface solid)
                let heightBias = (y - 64) * 0.08;

                // 2. main cave noise (big blobs)
                let caves = noise3(wx * scale, y * scale, wz * scale);

                // 3. spaghetti tunnels (thin noise)
                let spaghetti = Math.abs(noise3(wx * 0.03, y * 0.03, wz * 0.03));

                // 4. ravines (long cuts)
                let ravine = noise3(wx * 0.002, 0, wz * 0.002);
                let ravineShape = Math.max(0, 1 - Math.abs(y - 64) * 0.02);

                let density =
                    heightBias +
                    caves * 1.2 +
                    (1 - spaghetti) * 0.8 +
                    ravine * ravineShape * 2.0;

                // carve condition (THIS replaces all carving)
                if (density < caveThreshold) {
                    chunk.setWorldBlock(wx, y, wz, 0);
                }
            }
        }
    }
}
}

// ============================================================
// World (Manages the grid of 16x256x16 chunks)
// ============================================================
class World {
    constructor(seed) {
        this.seed = seed;
        this.generator = new ChunkGenerator(seed);
        this.chunks = new Map();
    }

    key(x, z) {
        return x + "," + z;
    }

    getChunk(x, z) {
        const k = this.key(x, z);
        if (!this.chunks.has(k)) {
            const chunk = this.generator.generateChunk(x, z);
            this.chunks.set(k, chunk);
        }
        return this.chunks.get(k);
    }

    getBlock(wx, wy, wz) {
        if (wy < 0 || wy >= 256) return 0;
        const cx = Math.floor(wx / 16);
        const cz = Math.floor(wz / 16);
        const chunk = this.chunks.get(this.key(cx, cz));
        if (!chunk) return 0;
        const lx = ((wx % 16) + 16) % 16;
        const lz = ((wz % 16) + 16) % 16;
        return chunk.getBlock(lx, wy, lz);
    }

    hasBlock(wx, wy, wz) {
        return this.getBlock(wx, wy, wz) !== 0;
    }

    setBlock(wx, wy, wz, id) {
        if (wy < 0 || wy >= 256) return;
        const cx = Math.floor(wx / 16);
        const cz = Math.floor(wz / 16);
        const k = this.key(cx, cz);
        if (id === 0 && !this.chunks.has(k)) return;
        const chunk = this.getChunk(cx, cz);
        const lx = ((wx % 16) + 16) % 16;
        const lz = ((wz % 16) + 16) % 16;
        chunk.setBlock(lx, wy, lz, id);
    }
}

// ============================================================
// Startup Logic
// ============================================================

