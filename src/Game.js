import Phaser from 'phaser';
import Car from './Car';
import TerrainManager from './Terrain';
import UIManager from './UI';
import SoundManager from './SoundManager';
import BackgroundManager from './BackgroundManager';
import ParticleManager from './ParticleManager';

export default class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        // Load assets if any (images for car, terrain texture, coins)
        // For now using shapes
    }

    create() {
        this.gameState = 'MENU';
        this.score = 0;

        // Load saved progress
        this.loadProgress();
        this.coins = this.savedData.coins || 0;

        this.fuel = 100;
        this.distance = 0;

        // Init Managers
        this.bg = new BackgroundManager(this); // Background first
        this.particles = new ParticleManager(this); // Particles shared
        this.particles.dust.setDepth(5); // On top of terrain
        this.particles.exhaust.setDepth(6);
        this.particles.sparklesCoin.setDepth(10); // Top
        this.particles.sparklesFuel.setDepth(10);

        this.terrain = new TerrainManager(this);
        this.ui = new UIManager(this);
        this.soundManager = new SoundManager(this);

        // Update initial UI with saved coins
        this.ui.updateShopUI();

        // Initial Camera Setup
        // Background color handled by BackgroundManager (sky)
        // this.cameras.main.setBackgroundColor('#87CEEB'); 

        // Show Main Menu
        this.ui.showMainMenu();

        // Collision Events
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                this.checkCollision(bodyA, bodyB);
            });
        });

        // Key Controls... (kept same)
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.gameState === 'PLAY') this.pauseGame();
            else if (this.gameState === 'PAUSE') this.resumeGame();
        });

        // Settings... (kept same)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                const isMuted = this.soundManager.toggleMute();
                settingsBtn.innerText = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
            };
        }
    }

    loadProgress() {
        const data = localStorage.getItem('hillRacerData');
        if (data) {
            this.savedData = JSON.parse(data);
        } else {
            this.savedData = { coins: 0, upgrades: { engine: 0, tires: 0, fuel: 0 } };
        }
    }

    buyUpgrade(type) {
        // Upgrade configs
        const upgrades = {
            'engine': { cost: 500, max: 5 },
            'tires': { cost: 500, max: 5 },
            'fuel': { cost: 500, max: 5 }
        };

        const config = upgrades[type];
        if (!config) return false;

        const currentLevel = this.savedData.upgrades[type] || 0;

        // Already maxed?
        if (currentLevel >= config.max) return false;

        // Can afford?
        if (this.coins >= config.cost) {
            this.coins -= config.cost;
            this.savedData.upgrades[type] = currentLevel + 1;
            this.saveProgress();
            this.ui.updateShopUI(); // Reflect changes
            return true;
        }

        return false;
    }

    saveProgress() {
        this.savedData.coins = this.coins;
        // Upgrade levels are already in savedData.upgrades
        localStorage.setItem('hillRacerData', JSON.stringify(this.savedData));
    }

    checkCollision(bodyA, bodyB) {
        // Helper to get label (handle compound bodies and parts)
        const getLabel = (body) => {
            if (body.label && body.label !== 'Body' && body.label !== 'Circle Body') return body.label;
            if (body.parent && body.parent.label) return body.parent.label;
            return '';
        };

        const labelA = getLabel(bodyA);
        const labelB = getLabel(bodyB);

        // Helper to check if label represents a car part
        const isCar = (l) => l === 'chassis' || l === 'wheel';
        const isItem = (l) => l === 'fuel' || l === 'coin';

        // Check if car hit Item
        let itemBody = null;

        if (isItem(labelA)) {
            itemBody = bodyA;
        } else if (isItem(labelB)) {
            itemBody = bodyB;
        }

        if (itemBody && itemBody.gameObject && itemBody.gameObject.active) {
            const type = getLabel(itemBody);

            // Collect
            if (type === 'fuel') {
                this.fuel = Math.min(100, this.fuel + 40);
                this.soundManager.playFuel();
                this.particles.emitCollection(itemBody.position.x, itemBody.position.y, 'fuel');
            } else if (type === 'coin') {
                this.coins = (this.coins || 0) + 1;
                console.log('Coin collected! Total:', this.coins);
                this.soundManager.playCoin();
                this.particles.emitCollection(itemBody.position.x, itemBody.position.y, 'coin');
                this.ui.updateHUD(this.distance / 100, this.coins, this.fuel);
                this.saveProgress();
            }

            // Remove Item
            itemBody.gameObject.destroy();
        }
    }

    startGame() {
        this.gameState = 'PLAY';

        // Re-init BG if needed (if scene was restarted, but here we just reset vars)
        // this.bg.layers... 

        // Read Selections
        const carType = document.getElementById('car-select').value;
        const terrainType = document.getElementById('terrain-select').value;

        // Resume Audio Context
        if (this.soundManager.ctx.state === 'suspended') {
            this.soundManager.ctx.resume().catch(console.error);
        }
        this.soundManager.startEngine();

        // Reset Data
        this.score = 0;
        console.log('Starting Run. Current Coins:', this.coins);

        this.fuel = 100;
        this.distance = 0;

        // Reset/Recreate World
        if (this.car) this.car.destroy();
        if (this.terrain) this.terrain.reset(); // Clear old chunks

        // Re-init Terrain with new type
        this.terrain = new TerrainManager(this, terrainType);
        this.terrain.init();

        // Gravity Settings
        if (terrainType === 'MOON') {
            this.matter.world.setGravity(0, 0.4); // Low gravity
        } else {
            this.matter.world.setGravity(0, 1); // Normal gravity
        }

        // Create Car
        this.car = new Car(this, 200, 300, carType);

        // APPLY UPGRADES
        const u = this.savedData.upgrades;

        // 1. Engine (Increase acceleration/speed)
        if (u.engine > 0) {
            this.car.currentWheelSpeed += u.engine * 0.005; // Base is 0.05
        }

        // 2. Tires (Increase friction)
        if (u.tires > 0) {
            const extraFriction = u.tires * 0.2;
            this.car.rearWheel.friction = 0.9 + extraFriction;
            this.car.frontWheel.friction = 0.9 + extraFriction;
        }

        // 3. Fuel (Start with more fuel)
        if (u.fuel > 0) {
            const extraFuel = u.fuel * 20;
            this.fuel = 100 + extraFuel;
            // Also increase tank visual capacity if needed, but for now just overfill
        }

        // Camera Follow
        if (this.car.chassis) {
            this.cameras.main.startFollow(this.car.chassis.gameObject || this.car.chassis, true, 0.1, 0.1);
        }
        this.cameras.main.setZoom(1.0);

        this.ui.showGameUI();
    }

    pauseGame() {
        if (this.gameState !== 'PLAY') return;
        this.gameState = 'PAUSE';
        this.scene.pause();
        this.soundManager.stopEngine();
        this.ui.showPauseMenu();
    }

    resumeGame() {
        this.gameState = 'PLAY';
        this.scene.resume();
        this.soundManager.startEngine();
        this.ui.hidePauseMenu();
    }

    restartGame() {
        this.gameState = 'PLAY';
        this.scene.resume(); // Ensure running
        this.startGame();
    }

    update(time, delta) {
        if (this.gameState !== 'PLAY') return;

        // Update components
        this.car.update();
        this.terrain.update(this.car.getX());

        // Background Parallax
        this.bg.update(this.cameras.main.scrollX);

        // Engine Sound
        const speed = this.car.getSpeed ? this.car.getSpeed() :
            (this.car.chassis ? Math.abs(this.car.chassis.velocity.x) : 0);

        this.soundManager.updateEngine(speed);

        const carX = this.car.getX();

        // Update Distance
        if (carX > this.distance) {
            this.distance = carX;
        }

        // Fuel Logic
        // Decrease fuel based on throttle usage + constant drain
        const fuelDrain = (this.car.isGas ? 0.08 : 0.01) * (delta / 16);
        this.fuel -= fuelDrain;

        if (this.fuel <= 0) {
            this.gameOver('Out of Fuel!');
        }

        // Check if car flipped
        // Simple angle check (if chassis is upside down > 120deg)
        const angle = Math.abs(this.car.chassis.angle);
        if (angle > 2.5) { // ~143 degrees
            this.gameOver('Driver Neck Broken!');
        }

        // Update UI
        this.ui.updateHUD(this.distance / 100, this.coins, this.fuel);
    }



    gameOver(reason) {
        this.gameState = 'GAMEOVER';
        this.soundManager.stopEngine();
        this.soundManager.playCrash();
        this.ui.showGameOver(this.distance / 100, this.coins, reason);
    }
}
