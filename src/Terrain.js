import Phaser from 'phaser';

export default class TerrainManager {
    constructor(scene, type = 'GRASS') {
        this.scene = scene;
        this.type = type;
        this.chunks = [];
        this.chunkWidth = 2000;
        this.nextChunkIndex = 0;
        this.catGround = this.scene.collisionCategories.ground;

        // Define Properties based on type
        this.properties = this.getProperties(type);
    }

    getProperties(type) {
        switch (type) {
            case 'DESERT':
                return {
                    fill: 0xE67E22, stroke: 0xD35400, friction: 0.7,
                    bg: '#F6DDCC',
                    noiseScale: { h: 400, f: 0.002 } // Massive dunes
                };

            case 'MOON':
                return {
                    fill: 0xBDC3C7, stroke: 0x7F8C8D, friction: 0.6,
                    bg: '#2C3E50',
                    noiseScale: { h: 180, f: 0.01 } // Deep craters and peaks
                };
            case 'MARS':
                return {
                    fill: 0xC0392B, stroke: 0x922B21, friction: 0.8,
                    bg: '#FADBD8',
                    noiseScale: { h: 250, f: 0.004 } // Rocky red planet
                };
            case 'FOREST':
                return {
                    fill: 0x229954, stroke: 0x145A32, friction: 0.85,
                    bg: '#D5F5E3',
                    noiseScale: { h: 350, f: 0.003 } // Bumpy forest
                };
            case 'GRASS':
            default:
                return {
                    fill: 0x4CAF50, stroke: 0x388E3C, friction: 0.9,
                    bg: '#87CEEB',
                    noiseScale: { h: 300, f: 0.003 } // High Hills
                };
        }
    }

    init() {
        // Set background theme
        if (this.scene.bg) {
            this.scene.bg.setTheme(this.type);
        } else {
            this.scene.cameras.main.setBackgroundColor(this.properties.bg);
        }

        this.createChunk(0);
        this.createChunk(1);
        this.createChunk(2); // Pre-load more
    }

    update(playerX) {
        const currentChunk = Math.floor(playerX / this.chunkWidth);
        // Generate ahead
        if (currentChunk + 2 >= this.nextChunkIndex) {
            this.createChunk(this.nextChunkIndex);
            // Keep more history behind
            if (this.chunks.length > 5) {
                const old = this.chunks.shift();
                this.removeChunk(old);
            }
        }
    }

    createChunk(index) {
        this.nextChunkIndex = index + 1;

        const chunkWidth = this.chunkWidth;
        const startX = index * chunkWidth;
        const steps = 40;
        const stepWidth = chunkWidth / steps;

        // 1. Generate Surface Points
        const surfacePoints = [];
        for (let i = 0; i <= steps; i++) {
            const x = startX + i * stepWidth;
            let y = 600;

            if (index > 0 || i > 10) {
                // Difficulty Scaling
                const difficulty = Math.min(3.0, 1.0 + (index * 0.1));
                const p = this.properties.noiseScale;

                // Unique generation per type
                if (this.type === 'MOON') {
                    // Jagged, craters
                    const n1 = Math.sin(x * p.f) * (p.h * difficulty);
                    const n2 = Math.cos(x * 0.05) * 20; // Crater rims
                    y = 600 + n1 + n2;
                } else if (this.type === 'DESERT') {
                    // Steeper dunes with ripples
                    const n1 = Math.sin(x * p.f) * (p.h * difficulty);
                    const n2 = Math.sin(x * 0.02) * (15 * difficulty); // Sand ripples
                    y = 600 + n1 + n2;
                } else if (this.type === 'MARS') {
                    // Jagged, uneven
                    const n1 = Math.sin(x * p.f) * (p.h * difficulty);
                    const n2 = Math.abs(Math.sin(x * 0.03)) * (40 * difficulty); // Sharp ridges
                    const n3 = Math.sin(x * 0.01) * 10;
                    y = 600 + n1 - n2 + n3;
                } else if (this.type === 'FOREST') {
                    // Rolling with small bumps
                    const n1 = Math.sin(x * p.f) * (p.h * difficulty);
                    const n2 = Math.sin(x * 0.015) * (20 * difficulty);
                    const n3 = Math.cos(x * 0.005) * (50 * difficulty);
                    y = 550 + n1 + n2 + n3;
                } else {
                    // Grass hills (Standard)
                    const n1 = Math.sin(x * p.f) * (p.h * difficulty);
                    const n2 = Math.sin(x * 0.01) * (p.h * 0.3 * difficulty);
                    const n3 = Math.sin(x * 0.05) * (5 * difficulty);
                    const n4 = Math.sin(x * 0.001) * (50 * difficulty);
                    y = 600 + n1 + n2 + n3 + n4;
                }
            }
            surfacePoints.push({ x, y });
        }

        // 2. Physics Bodies (Slices)
        const segmentBodies = [];
        const bottomY = 2000;
        const Matter = Phaser.Physics.Matter.Matter;

        for (let i = 0; i < surfacePoints.length - 1; i++) {
            const p1 = surfacePoints[i];
            const p2 = surfacePoints[i + 1];

            const verifySlice = [
                { x: p1.x, y: p1.y },
                { x: p2.x, y: p2.y },
                { x: p2.x, y: bottomY },
                { x: p1.x, y: bottomY }
            ];

            const centre = Matter.Vertices.centre(verifySlice);

            const sliceBody = this.scene.matter.add.fromVertices(centre.x, centre.y, verifySlice, {
                isStatic: true,
                friction: this.properties.friction,
                frictionStatic: 10,
                label: 'ground_slice',
                collisionFilter: { category: this.catGround }
            }, false);

            if (sliceBody) {
                Matter.Body.setPosition(sliceBody, centre);
                segmentBodies.push(sliceBody);
            }
        }

        // 3. Visuals
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(this.properties.fill, 1);
        graphics.lineStyle(4, this.properties.stroke, 1);

        graphics.beginPath();
        graphics.moveTo(surfacePoints[0].x, surfacePoints[0].y);
        for (let i = 1; i < surfacePoints.length; i++) {
            graphics.lineTo(surfacePoints[i].x, surfacePoints[i].y);
        }
        graphics.lineTo(startX + chunkWidth, bottomY);
        graphics.lineTo(startX, bottomY);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();

        // 4. Add Physics
        segmentBodies.forEach(b => {
            this.scene.matter.world.add(b);
            this.scene.matter.body.setStatic(b, true);
        });

        this.chunks.push({
            index: index,
            bodies: segmentBodies,
            visual: graphics,
            items: []
        });

        this.spawnItems(surfacePoints, index);
    }

    spawnItems(points, chunkIndex) {
        if (chunkIndex === 0) return;

        points.forEach((p, i) => {
            // 1. Coins and Fuel (Standard)
            // Increased frequency significantly
            if (i % 3 === 0 && Math.random() < 0.7) {
                const type = Math.random() > 0.9 ? 'fuel' : 'coin'; // 90% coins
                const color = type === 'fuel' ? 0xff0000 : 0xffd700;

                const item = this.scene.add.circle(p.x, p.y - 40, 15, color);

                this.scene.matter.add.gameObject(item, {
                    shape: { type: 'circle', radius: 20 },
                    isSensor: true,
                    isStatic: true,
                    label: type
                });

                if (item.body) {
                    item.body.label = type;
                }

                this.chunks[this.chunks.length - 1].items.push(item);
            }

            // 2. Obstacles (Desert/Mars Only)
            if ((this.type === 'DESERT' || this.type === 'MARS') && i % 7 === 0 && Math.random() < 0.3) {
                this.createStone(p.x, p.y);
            }

            // 3. Trees (Forest Only)
            if (this.type === 'FOREST' && i % 4 === 0 && Math.random() < 0.4) {
                this.createTree(p.x, p.y);
            }

            // 4. Breakables (All Terrains - rare)
            if (i % 10 === 0 && Math.random() < 0.2) {
                this.createCrate(p.x, p.y);
            }
        });
    }

    createCrate(x, y) {
        const size = 40;
        const crate = this.scene.add.graphics({ x, y });
        crate.fillStyle(0x8D6E63);
        crate.fillRect(-size / 2, -size / 2, size, size);
        crate.lineStyle(2, 0x5D4037);
        crate.strokeRect(-size / 2, -size / 2, size, size);

        // Cross
        crate.lineStyle(2, 0x3E2723);
        crate.beginPath();
        crate.moveTo(-size / 2, -size / 2); crate.lineTo(size / 2, size / 2);
        crate.moveTo(size / 2, -size / 2); crate.lineTo(-size / 2, size / 2);
        crate.strokePath();

        const bodyY = y - size / 2;

        this.scene.matter.add.gameObject(crate, {
            shape: { type: 'rectangle', width: size, height: size },
            isStatic: false,
            density: 0.01,
            friction: 0.5,
            label: 'crate'
        });

        crate.setPosition(x, bodyY);
        this.chunks[this.chunks.length - 1].items.push(crate);
    }

    createStone(x, y) {
        // Visual
        const radius = Phaser.Math.Between(15, 25);
        const stone = this.scene.add.graphics({ x, y });
        stone.fillStyle(0x7f8c8d);
        stone.fillCircle(0, 0, radius);
        stone.lineStyle(2, 0x2c3e50);
        stone.strokeCircle(0, 0, radius);

        // Physics
        // Positioning it slightly embedded in ground
        const bodyY = y - radius * 0.5;

        this.scene.matter.add.gameObject(stone, {
            shape: { type: 'circle', radius: radius },
            isStatic: false, // Can be moved? Or static? Static is harder as it stops you.
            // Let's make them heavy movable objects for dynamic fun, or static bumps.
            // Static is "harder" because you crash or have to climb. Movable might be pushed.
            // Let's try Static for now to act as rough terrain features.
            isStatic: true,
            label: 'obstacle',
            friction: 1.0
        });

        // Fix position after physics creation
        stone.setPosition(x, bodyY);

        this.chunks[this.chunks.length - 1].items.push(stone);
    }

    createTree(x, y) {
        // Visual Only (Background decoration mostly, or soft physical object?)
        // Let's make it background visual attached to chunk
        // To interact, we'd need physics. Let's start with visual.

        // Random Tree Type
        const pine = Math.random() > 0.3;
        const trunkH = 40 + Math.random() * 40;
        const trunkW = 10 + Math.random() * 10;

        const tree = this.scene.add.graphics({ x, y });

        // Trunk
        tree.fillStyle(0x795548);
        tree.fillRect(-trunkW / 2, -trunkH, trunkW, trunkH);

        // Leaves
        tree.fillStyle(0x2ECC71);
        if (pine) {
            // Triangles for Pine
            tree.beginPath();
            tree.moveTo(0, -trunkH - 60);
            tree.lineTo(25, -trunkH + 10);
            tree.lineTo(-25, -trunkH + 10);
            tree.closePath();
            tree.fillPath();

            tree.beginPath();
            tree.moveTo(0, -trunkH - 30);
            tree.lineTo(30, -trunkH - 10);
            tree.lineTo(-30, -trunkH - 10);
            tree.closePath();
            tree.fillPath();
        } else {
            // Round tree
            tree.fillCircle(0, -trunkH, 30);
            tree.fillCircle(-15, -trunkH + 10, 20);
            tree.fillCircle(15, -trunkH + 10, 20);
        }

        // Physics
        // Make dynamic so they can be pushed over (not blocking)
        const bodyY = y - trunkH / 2;

        this.scene.matter.add.gameObject(tree, {
            shape: { type: 'rectangle', width: trunkW, height: trunkH },
            isStatic: false, // Changed from true to false
            density: 0.002, // Light enough to push
            friction: 0.5,
            label: 'tree_trunk'
        });

        // Fix visual position center matches physics center
        tree.setPosition(x, bodyY);

        this.chunks[this.chunks.length - 1].items.push(tree);
    }

    removeChunk(chunk) {
        if (chunk.bodies) {
            chunk.bodies.forEach(b => this.scene.matter.world.remove(b));
        }
        if (chunk.visual) chunk.visual.destroy();
        if (chunk.items) {
            chunk.items.forEach(item => {
                if (item.destroy) item.destroy();
                if (item.body) this.scene.matter.world.remove(item.body);
            });
        }
    }

    reset() {
        this.chunks.forEach(c => this.removeChunk(c));
        this.chunks = [];
        this.nextChunkIndex = 0;
        // Do not init here, let the game control initialization
    }
}
