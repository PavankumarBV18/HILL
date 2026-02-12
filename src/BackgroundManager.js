import Phaser from 'phaser';

export default class BackgroundManager {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.width = this.scene.scale.width;
        this.height = this.scene.scale.height;
        this.mode = 'DARK'; // Default
        this.currentType = 'GRASS';

        this.init();
    }

    init() {
        // Clear old if any
        this.layers = [];

        // 1. Sky Gradient (Static)
        const sky = this.scene.add.graphics();
        // Default Sky
        sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xFFFFFF, 0xFFFFFF, 1);
        sky.fillRect(0, 0, this.width, this.height);
        sky.setScrollFactor(0);
        this.layers.push({ obj: sky, speed: 0, type: 'sky' });

        // 2. Clouds (Slow)
        const clouds = this.scene.add.container();
        this.createClouds(clouds);
        clouds.setScrollFactor(0); // We will move manually for parallax
        this.layers.push({ obj: clouds, speed: 0.1, offsetX: 0 });

        // 3. Mountains (Medium)
        const mountains = this.scene.add.graphics();
        this.createMountains(mountains, 0x5D6D7E);
        mountains.setScrollFactor(0);
        this.layers.push({ obj: mountains, speed: 0.2, offsetX: 0, type: 'mountains' });

        // 4. Hills (Fast - closer)
        const hills = this.scene.add.graphics();
        this.createHills(hills, 0x2ECC71);
        hills.setScrollFactor(0);
        this.layers.push({ obj: hills, speed: 0.5, offsetX: 0, type: 'hills' });
    }

    setMode(mode) {
        this.mode = mode;
        this.setTheme(this.currentType);
    }

    setTheme(type) {
        this.currentType = type;
        // Find layers
        const sky = this.layers.find(l => l.type === 'sky').obj;
        const mountains = this.layers.find(l => l.type === 'mountains').obj;
        const hills = this.layers.find(l => l.type === 'hills').obj;

        sky.clear();
        mountains.clear();
        hills.clear();

        const isLight = (this.mode === 'LIGHT');

        if (type === 'MOON') {
            // MOON: Dark Mode = Space / Light Mode = Grey Day
            if (isLight) {
                sky.fillGradientStyle(0xD0D3D4, 0xD0D3D4, 0xECF0F1, 0xECF0F1, 1);
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0x95A5A6); // Lighter Grey
                this.createHills(hills, 0xBDC3C7); // Silver
            } else {
                sky.fillGradientStyle(0x000000, 0x000000, 0x2C3E50, 0x2C3E50, 1);
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0x7F8C8D); // Grey
                this.createHills(hills, 0x95A5A6); // Light Grey
            }
        } else if (type === 'DESERT') {
            // DESERT: Dark Mode = Sunset / Light Mode = Bright Sun
            if (isLight) {
                sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xFFFACD, 0xFFFACD, 1); // Blue to pale yellow
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0xE59866); // Sandy Brown
                this.createHills(hills, 0xF0B27A); // Light Sand
            } else {
                sky.fillGradientStyle(0xF39C12, 0xF39C12, 0xF1C40F, 0xF1C40F, 1); // Intense Orange
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0xD35400); // Dark Orange
                this.createHills(hills, 0xE67E22); // Orange
            }

        } else if (type === 'MARS') {
            // MARS: Red Planet
            if (isLight) {
                sky.fillGradientStyle(0xFADBD8, 0xFADBD8, 0xE74C3C, 0xE74C3C, 1);
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0xA93226); // Dark Red
                this.createHills(hills, 0xC0392B); // Red
            } else {
                sky.fillGradientStyle(0x641E16, 0x641E16, 0x943126, 0x943126, 1);
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0x512E5F); // Purple/Red
                this.createHills(hills, 0x7B241C); // Dark Red
            }
        } else if (type === 'FOREST') {
            // FOREST: Lush Green / Dark Woods
            if (isLight) {
                sky.fillGradientStyle(0xD5F5E3, 0xD5F5E3, 0x58D68D, 0x58D68D, 1);
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0x196F3D); // Forest Green
                this.createHills(hills, 0x27AE60); // Green
            } else {
                sky.fillGradientStyle(0x0E6251, 0x0E6251, 0x117864, 0x117864, 1);
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0x145A32); // Dark Green
                this.createHills(hills, 0x1E8449); // Darker Green
            }
        } else {
            // GRASS (Default): Dark Mode = Night / Light Mode = Day
            if (isLight) {
                sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xFFFFFF, 0xFFFFFF, 1); // Blue Day
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0x5D6D7E); // Grey Blue
                this.createHills(hills, 0x2ECC71); // Green
            } else {
                sky.fillGradientStyle(0x1a1a2e, 0x16213e, 0x0f3460, 0x0f3460, 1); // Deep Blue Night
                sky.fillRect(0, 0, this.width, this.height);
                this.createMountains(mountains, 0x2C3E50); // Dark Blue Grey
                this.createHills(hills, 0x196F3D); // Dark Green
            }
        }
    }

    createClouds(container) {
        container.removeAll(true);
        const g = this.scene.add.graphics();
        g.fillStyle(0xFFFFFF, 0.8);

        for (let i = 0; i < 8; i++) {
            const x = Math.random() * this.width * 2; // Spread wider
            const y = Math.random() * (this.height * 0.4);
            const w = 100 + Math.random() * 150;
            const h = 40 + Math.random() * 40;

            g.fillEllipse(x, y, w, h);
        }
        container.add(g);
    }

    createMountains(g, color) {
        g.fillStyle(color, 1); // Blue-ish Grey

        let x = 0;
        g.beginPath();
        g.moveTo(0, this.height);

        while (x < this.width * 3) { // 3 screens wide
            const w = 200 + Math.random() * 300;
            const h = 150 + Math.random() * 250;
            g.lineTo(x + w / 2, this.height - h); // Peak
            g.lineTo(x + w, this.height); // Base
            x += w;
        }
        g.lineTo(x, this.height);
        g.lineTo(0, this.height);
        g.closePath();
        g.fillPath();
    }

    createHills(g, color) {
        g.fillStyle(color, 0.8); // Green semi-transparent

        let x = 0;
        g.beginPath();
        g.moveTo(0, this.height);

        while (x < this.width * 3) {
            const w = 100 + Math.random() * 200;
            const h = 50 + Math.random() * 80;

            // Simple line to peak then back down
            g.lineTo(x + w / 2, this.height - h);
            g.lineTo(x + w, this.height);
            x += w;
        }
        g.lineTo(x, this.height);
        g.lineTo(0, this.height);
        g.closePath();
        g.fillPath();
    }

    update(camX) {
        this.layers.forEach(layer => {
            if (layer.speed > 0) {
                // Parallax shift
                const camDist = camX * layer.speed;
                // Modulo to loop texture/graphics? 
                // Since we drew canvas primitives, hard looping is tricky without texture tiling.
                // Simple shift for now:
                layer.obj.x = -(camDist % this.width);

                // For seamless looping of primitives, we essentially need double the width
                // and snap back. Our draw logic drew 2-3x width, so:
                if (layer.obj.x < -this.width) {
                    // This simple logic might pop, but for this prototype it adds depth
                    // Better: use tileSprite if we had images.
                    // For primitives: 
                    const offset = (camX * layer.speed) % this.width;
                    layer.obj.x = -offset;
                }
            }
        });
    }
}
