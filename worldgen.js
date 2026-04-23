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
        this.carveCavesInChunk(chunk);
        return chunk;
    }

    createChunkRandom(chunkX, chunkZ) {
        const baseRandom = new SeededRandom(this.seed);
        const a = baseRandom.nextLongOdd();
        const b = baseRandom.nextLongOdd();
        return new SeededRandom((BigInt(chunkX) * a + BigInt(chunkZ) * b) ^ this.seed);
    }

    carveCavesInChunk(chunk) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const sourceX = chunk.chunkX + dx;
                const sourceZ = chunk.chunkZ + dz;
                const rand = this.createChunkRandom(sourceX, sourceZ);
                this.generateCaveSystems(rand, sourceX, sourceZ, chunk);
            }
        }
    }

    generateCaveSystems(rand, chunkX, chunkZ, chunk) {
        const caveCount = rand.nextInt(rand.nextInt(15) + 1);
        for (let i = 0; i < caveCount; i++) {
            const startX = chunkX * 16 + rand.nextInt(16);
            const startY = rand.nextInt(rand.nextInt(120) + 8);
            const startZ = chunkZ * 16 + rand.nextInt(16);

            let branches = 1;
            if (rand.nextInt(4) === 0) {
                this.carveTunnel(rand, chunk, startX, startY, startZ, 1.0 + rand.nextDouble() * 6.0, 0, 0, 0, -1, 1.0);
                branches += rand.nextInt(4);
            }

            for (let j = 0; j < branches; j++) {
                const yaw = rand.nextFloat() * Math.PI * 2.0;
                const pitch = (rand.nextFloat() - 0.5) * 2.0 / 8.0;
                let radius = rand.nextFloat() * 2.0 + rand.nextFloat();
                if (rand.nextInt(10) === 0) {
                    radius *= rand.nextFloat() * rand.nextFloat() * 3.0 + 1.0;
                }
                this.carveTunnel(rand, chunk, startX, startY, startZ, radius * 2.0, yaw, pitch, 0, -1, 1.0);
            }
        }
    }

    carveTunnel(rand, chunk, x, y, z, radius, yaw, pitch, step, maxSteps, verticalScale) {
        if (maxSteps < 0) {
            maxSteps = Math.floor(8.0 + rand.nextDouble() * 32.0);
        }

        const branchAt = Math.floor(maxSteps / 2);
        let branched = false;

        for (; step < maxSteps; step++) {
            const progress = step / maxSteps;
            const width = 1.5 + Math.sin(Math.PI * progress) * radius;
            const heightRadius = width * verticalScale;
            this.carveEllipse(chunk, x, y, z, width, heightRadius, width);

            x += Math.cos(pitch) * Math.cos(yaw);
            y += Math.sin(pitch);
            z += Math.cos(pitch) * Math.sin(yaw);

            pitch *= 0.7;
            pitch += (rand.nextFloat() - rand.nextFloat()) * 0.05;
            yaw += (rand.nextFloat() - rand.nextFloat()) * 0.1;

            if (!branched && step === branchAt && radius > 1.0) {
                branched = true;
                this.carveTunnel(rand, chunk, x, y, z, radius * 0.75, yaw + Math.PI / 2, pitch * 0.5, step, maxSteps, verticalScale);
                this.carveTunnel(rand, chunk, x, y, z, radius * 0.75, yaw - Math.PI / 2, pitch * 0.5, step, maxSteps, verticalScale);
            }
        }
    }

    carveEllipse(chunk, centerX, centerY, centerZ, rx, ry, rz) {
        const minX = Math.floor(centerX - rx) - 1;
        const maxX = Math.floor(centerX + rx) + 1;
        const minY = Math.floor(centerY - ry) - 1;
        const maxY = Math.floor(centerY + ry) + 1;
        const minZ = Math.floor(centerZ - rz) - 1;
        const maxZ = Math.floor(centerZ + rz) + 1;

        const invRx = 1.0 / (rx * rx);
        const invRy = 1.0 / (ry * ry);
        const invRz = 1.0 / (rz * rz);

        for (let wx = minX; wx <= maxX; wx++) {
            for (let wy = minY; wy <= maxY; wy++) {
                if (wy < 0 || wy >= 256) continue;
                for (let wz = minZ; wz <= maxZ; wz++) {
                    const dx = wx + 0.5 - centerX;
                    const dy = wy + 0.5 - centerY;
                    const dz = wz + 0.5 - centerZ;
                    const distance = (dx * dx) * invRx + (dy * dy) * invRy + (dz * dz) * invRz;
                    if (distance < 1.0) {
                        chunk.setWorldBlock(wx, wy, wz, 0);
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

