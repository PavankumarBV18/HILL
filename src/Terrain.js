import Phaser from 'phaser';

export default class TerrainManager {
    constructor(scene, type = 'GRASS') {
        this.scene = scene;
        this.type = type;
        this.chunks = [];
        this.chunkWidth = 2000;
        this.nextChunkIndex = 0;
        this.catGround = this.scene.matter.world.nextCategory();

        // Define Properties based on type
        this.properties = this.getProperties(type);
    }

    getProperties(type) {
        switch (type) {
            case 'DESERT':
                return {
                    fill: 0xE67E22, stroke: 0xD35400, friction: 0.8,
                    bg: '#F6DDCC',
                    noiseScale: { h: 120, f: 0.002 } // Long dunes
                };
            case 'MOON':
                return {
                    fill: 0xBDC3C7, stroke: 0x7F8C8D, friction: 0.6,
                    bg: '#2C3E50',
                    noiseScale: { h: 50, f: 0.01 } // Jagged but smaller gravity feeling
                };
            case 'GRASS':
            default:
                return {
                    fill: 0x4CAF50, stroke: 0x388E3C, friction: 0.9,
                    bg: '#87CEEB',
                    noiseScale: { h: 100, f: 0.003 } // Standard hills
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
                    // Smooth rolling dunes
                    const n1 = Math.sin(x * p.f) * (p.h * difficulty);
                    y = 600 + n1;
                } else {
                    // Grass hills (Standard)
                    const n1 = Math.sin(x * p.f) * (100 * difficulty);
                    const n2 = Math.sin(x * 0.01) * (30 * difficulty);
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
            if (i % 5 === 0 && Math.random() < 0.5) {
                const type = Math.random() > 0.7 ? 'fuel' : 'coin';
                const color = type === 'fuel' ? 0xff0000 : 0xffd700;

                const item = this.scene.add.circle(p.x, p.y - 40, 15, color);

                this.scene.matter.add.gameObject(item, {
                    shape: { type: 'circle', radius: 20 }, // Slightly larger hit area
                    isSensor: true,
                    isStatic: true,
                    label: type
                });

                // Explicitly ensure label is set on the body itself
                if (item.body) {
                    item.body.label = type;
                }

                this.chunks[this.chunks.length - 1].items.push(item);
            }
        });
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
