const Block = {
    loader: new THREE.TextureLoader(),
    textures: {},

    init: function() {
        this.loader.setCrossOrigin('anonymous');
        const allPaths = [];
        for (const typeKey in window.BlockRegistry) {
            const type = window.BlockRegistry[typeKey];
            for (const blockKey in type) {
                const block = type[blockKey];
                if (block.textures) allPaths.push(...block.textures);
                if (block.overlays) allPaths.push(...block.overlays.filter(p => p !== null));
            }
        }
        allPaths.forEach(path => {
            if (!path || this.textures[path]) return;
            this.textures[path] = this.loader.load(path);
            this.textures[path].magFilter = THREE.NearestFilter;
        });
    },

    getChunkCoords: function(x, z) {
        return { cx: Math.floor(x / 16), cz: Math.floor(z / 16) };
    },

    NEIGHBORS: [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
    ],

    getAO: function(x, y, z, s1Off, s2Off, cOff) {
        const s1 = this.hasBlockAt(x + s1Off[0], y + s1Off[1], z + s1Off[2]) ? 1 : 0;
        const s2 = this.hasBlockAt(x + s2Off[0], y + s2Off[1], z + s2Off[2]) ? 1 : 0;
        const c = this.hasBlockAt(x + cOff[0], y + cOff[1], z + cOff[2]) ? 1 : 0;
        if (s1 && s2) return 0;
        return 3 - (s1 + s2 + c);
    },

    hasBlockAt: function(x, y, z) {
        return this.getBlockId(x, y, z) !== 0;
    },

    getBlockId: function(x, y, z) {
        return window.worldInstance?.world?.getBlock(x, y, z) ?? 0;
    },

    getFaceAO: function(faceIdx, x, y, z) {
        const res = [];
        const check = (s1, s2, c) => this.getAO(x, y, z, s1, s2, c);
        if (faceIdx === 0) { // Right (+X)
            res.push(check([1,-1,0],[1,0,1],[1,-1,1]), check([1,-1,0],[1,0,-1],[1,-1,-1]), check([1,1,0],[1,0,1],[1,1,1]), check([1,1,0],[1,0,-1],[1,1,-1]));
        } else if (faceIdx === 1) { // Left (-X)
            res.push(check([-1,-1,0],[-1,0,-1],[-1,-1,-1]), check([-1,-1,0],[-1,0,1],[-1,-1,1]), check([-1,1,0],[-1,0,-1],[-1,1,-1]), check([-1,1,0],[-1,0,1],[-1,1,1]));
        } else if (faceIdx === 2) { // Top (+Y)
            res.push(check([-1,1,0],[0,1,1],[-1,1,1]), check([1,1,0],[0,1,1],[1,1,1]), check([-1,1,0],[0,1,-1],[-1,1,-1]), check([1,1,0],[0,1,-1],[1,1,-1]));
        } else if (faceIdx === 3) { // Bottom (-Y)
            res.push(check([-1,-1,0],[0,-1,-1],[-1,-1,-1]), check([1,-1,0],[0,-1,-1],[1,-1,-1]), check([-1,-1,0],[0,-1,1],[-1,-1,1]), check([1,-1,0],[0,-1,1],[1,-1,1]));
        } else if (faceIdx === 4) { // Front (+Z)
            res.push(check([-1,0,1],[0,-1,1],[-1,-1,1]), check([1,0,1],[0,-1,1],[1,-1,1]), check([-1,0,1],[0,1,1],[-1,1,1]), check([1,0,1],[0,1,1],[1,1,1]));
        } else if (faceIdx === 5) { // Back (-Z)
            res.push(check([1,0,-1],[0,-1,-1],[1,-1,-1]), check([-1,0,-1],[0,-1,-1],[-1,-1,-1]), check([1,0,-1],[0,1,-1],[1,1,-1]), check([-1,0,-1],[0,1,-1],[-1,1,-1]));
        }
        return res;
    },

    shouldTintFace: function(def, faceIdx) {
        if (!def.tint) return false;
        if (def.tint === "all") return true;
        const map = { 0: "right", 1: "left", 2: "top", 3: "bottom", 4: "front", 5: "back" };
        return !!def.tint[map[faceIdx]];
    },

    createCombinedMaterial: function(basePath, overlayPath) {
        const hasOverlay = overlayPath !== "none";
        return new THREE.ShaderMaterial({
            uniforms: {
                uBase: { value: this.textures[basePath] },
                uOverlay: { value: hasOverlay ? this.textures[overlayPath] : null },
                uHasOverlay: { value: hasOverlay }
            },
            vertexColors: true,
            transparent: true,
            alphaTest: 0.1,
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vColor;
                varying vec3 vTint;
                attribute vec3 tint;
                void main() {
                    vUv = uv;
                    vColor = color;
                    vTint = tint;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uBase;
                uniform sampler2D uOverlay;
                uniform bool uHasOverlay;
                varying vec2 vUv;
                varying vec3 vColor;
                varying vec3 vTint;
                void main() {
                    vec4 baseTex = texture2D(uBase, vUv);
                    vec4 finalColor = baseTex;
                    if (uHasOverlay) {
                        vec4 overTex = texture2D(uOverlay, vUv);
                        vec3 tintedOverlay = overTex.rgb * vTint;
                        finalColor.rgb = mix(finalColor.rgb, tintedOverlay, overTex.a);
                        finalColor.a = max(finalColor.a, overTex.a);
                    } else if (vTint != vec3(1.0)) {
                        finalColor.rgb *= vTint;
                    }
                    gl_FragColor = vec4(finalColor.rgb * vColor, finalColor.a);
                    if (gl_FragColor.a < 0.1) discard;
                }
            `
        });
    },

    generateChunkMesh: function(cx, cz) {
        const world = window.worldInstance.world;
        const chunkGroup = new THREE.Group();
        chunkGroup.userData = { cx, cz };
        chunkGroup.name = `chunk_${cx}_${cz}`;
        
        const buckets = {};
        const biomeColor = new THREE.Color(Biomes.TYPES.PLAINS.color);
        const brightness = [0.6, 0.6, 1.0, 0.5, 0.8, 0.8];

        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                for (let y = 0; y < 256; y++) {
                    const wx = cx * 16 + x;
                    const wz = cz * 16 + z;
                    const id = world.getBlock(wx, y, wz);
                    if (id === 0) continue;

                    const def = window.BlockById[id];
                    this.NEIGHBORS.forEach((off, i) => {
                        const nx = wx + off[0];
                        const ny = y + off[1];
                        const nz = wz + off[2];
                        
                        if (world.hasBlock(nx, ny, nz)) return;

                        const tex = def.textures[i];
                        const ovl = (def.overlays && def.overlays[i]) ? def.overlays[i] : "none";
                        const bucketKey = `${tex}|${ovl}`;

                        if (!buckets[bucketKey]) {
                            buckets[bucketKey] = { pos: [], col: [], tint: [], uv: [], idx: [], vCount: 0, tex, ovl };
                        }
                        this.addFaceToArrays(i, wx, y, wz, buckets[bucketKey], def, biomeColor, brightness[i]);
                    });
                }
            }
        }

        for (const key in buckets) {
            const b = buckets[key];
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
            geo.setAttribute('tint', new THREE.Float32BufferAttribute(b.tint, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
            geo.setIndex(b.idx);
            chunkGroup.add(new THREE.Mesh(geo, this.createCombinedMaterial(b.tex, b.ovl)));
        }
        return chunkGroup;
    },

    addFaceToArrays: function(faceIdx, x, y, z, bucket, def, biomeColor, brightnessVal) {
        const p = 0.5, n = -0.5;
        const faces = [
            [p,n,p, p,n,n, p,p,p, p,p,n], [n,n,n, n,n,p, n,p,n, n,p,p],
            [n,p,p, p,p,p, n,p,n, p,p,n], [n,n,n, p,n,n, n,n,p, p,n,p],
            [n,n,p, p,n,p, n,p,p, p,p,p], [p,n,n, n,n,n, p,p,n, n,p,n]
        ];

        const base = bucket.vCount;
        faces[faceIdx].forEach((v, i) => {
            bucket.pos.push(v + (i % 3 === 0 ? x + 0.5 : i % 3 === 1 ? y + 0.5 : z + 0.5));
        });

        const aoLevels = this.getFaceAO(faceIdx, x, y, z);
        const aoCurve = [0.4, 0.6, 0.8, 1.0];

        for (let i = 0; i < 4; i++) {
            const aoMult = brightnessVal * aoCurve[aoLevels[i]];
            bucket.col.push(aoMult, aoMult, aoMult);
            if (bucket.ovl !== "none" || this.shouldTintFace(def, faceIdx)) {
                bucket.tint.push(biomeColor.r, biomeColor.g, biomeColor.b);
            } else {
                bucket.tint.push(1, 1, 1);
            }
        }

        bucket.uv.push(0,0, 1,0, 0,1, 1,1);
        if (aoLevels[0] + aoLevels[3] < aoLevels[1] + aoLevels[2]) {
            bucket.idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
        } else {
            bucket.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
        }
        bucket.vCount += 4;
    }
};

Block.init();
window.Block = Block;
