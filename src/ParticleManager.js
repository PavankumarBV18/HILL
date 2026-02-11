import Phaser from 'phaser';

export default class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.init();
    }

    init() {
        // Since we don't have 'shapes' atlas, we need to generate textures FIRST
        this.createParticleTextures();

        // 1. Dust (Tires)
        this.dust = this.scene.add.particles(0, 0, 'particle_circle', {
            lifespan: 600,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: 0x8B4513, // Brown dirt
            speed: { min: 20, max: 50 },
            gravityY: 100,
            emitting: false
        });

        // 2. Exhaust (Smoke)
        this.exhaust = this.scene.add.particles(0, 0, 'particle_circle', {
            lifespan: 1000,
            scale: { start: 0.3, end: 1 },
            alpha: { start: 0.8, end: 0 },
            tint: 0x555555, // Grey smoke
            speedX: { min: -50, max: -20 }, // Shoot backward
            speedY: { min: -20, max: 20 },
            gravityY: -50, // Rise slightly
            emitting: false
        });

        // 3a. Collection (Coins - Yellow)
        this.sparklesCoin = this.scene.add.particles(0, 0, 'particle_circle', {
            lifespan: 800,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xFFFF00, 0xFFA500], // Yellow/Orange
            speed: 100,
            rotate: { min: 0, max: 360 },
            emitting: false
        });

        // 3b. Collection (Fuel - Red)
        this.sparklesFuel = this.scene.add.particles(0, 0, 'particle_circle', {
            lifespan: 800,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xFF0000, 0xFF4444], // Red
            speed: 100,
            rotate: { min: 0, max: 360 },
            emitting: false
        });
    }

    createParticleTextures() {
        // Create simple textures on the fly
        if (!this.scene.textures.exists('particle_circle')) {
            const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xFFFFFF);
            g.fillCircle(8, 8, 8);
            g.generateTexture('particle_circle', 16, 16);
        }
    }

    emitDust(x, y) {
        this.dust.emitParticleAt(x, y, 1);
    }

    emitExhaust(x, y, vx, vy) {
        // Adjust emission based on velocity
        this.exhaust.startFollow({ x, y }); // Or just emit at point
        this.exhaust.emitParticleAt(x, y, 1);
    }

    emitCollection(x, y, type) {
        if (type === 'fuel') {
            this.sparklesFuel.explode(15, x, y);
        } else {
            this.sparklesCoin.explode(15, x, y);
        }
    }
}
