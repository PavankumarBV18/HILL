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

        // Define Collision Categories EARLY
        this.collisionCategories = {
            default: 1,
            ground: this.matter.world.nextCategory()
        };

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
        // Settings... (kept same)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                const isMuted = this.soundManager.toggleMute();
                settingsBtn.innerText = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
            };
        }

        this.themeMode = 'DARK';
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.onclick = () => this.toggleTheme();
        }
    }

    toggleTheme() {
        this.themeMode = this.themeMode === 'DARK' ? 'LIGHT' : 'DARK';
        const btn = document.getElementById('theme-btn');
        if (btn) btn.innerText = `THEME: ${this.themeMode}`;

        if (this.themeMode === 'LIGHT') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }

        if (this.bg) {
            this.bg.setMode(this.themeMode);
        }
    }

    loadProgress() {
        const data = localStorage.getItem('hillRacerData');
        if (data) {
            this.savedData = JSON.parse(data);
        } else {
            this.savedData = {
                coins: 0,
                upgrades: { engine: 0, tires: 0, fuel: 0 },
                unlockedVehicles: ['JEEP'],
                unlockedTerrains: ['GRASS']
            };
        }

        // Ensure defaults are unlocked
        if (!this.savedData.unlockedVehicles || this.savedData.unlockedVehicles.length === 0)
            this.savedData.unlockedVehicles = ['JEEP'];
        if (!this.savedData.unlockedTerrains || this.savedData.unlockedTerrains.length === 0)
            this.savedData.unlockedTerrains = ['GRASS'];

        this.coins = this.savedData.coins || 0;
    }

    getCosts() {
        return {
            vehicles: {
                'JEEP': 0, // Free
                'BIKE': 500, // Cheap first unlock
                'TRACTOR': 1000,
                'SPORT': 2000,
                'ATV': 2500,
                'RACEBIKE': 3000,
                'TRUCK': 5000,
                'BUS': 6000
            },
            terrains: {
                'GRASS': 0, // Free
                'DESERT': 500, // Cheap first unlock
                'FOREST': 1500,
                'MARS': 3000,
                'MOON': 5000
            }
        };
    }

    checkUnlock(category, type) {
        if (category === 'vehicle') return this.savedData.unlockedVehicles.includes(type);
        if (category === 'terrain') return this.savedData.unlockedTerrains.includes(type);
        return false;
    }

    unlockContent(category, type) {
        const costs = this.getCosts();
        let cost = 0;

        if (category === 'vehicle') cost = costs.vehicles[type];
        if (category === 'terrain') cost = costs.terrains[type];

        if (this.coins >= cost) {
            this.coins -= cost;
            if (category === 'vehicle') this.savedData.unlockedVehicles.push(type);
            if (category === 'terrain') this.savedData.unlockedTerrains.push(type);
            this.saveProgress();
            this.ui.updateMainMenuButtons(); // Update UI
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
                this.showFloatingText(itemBody.position.x, itemBody.position.y, "FUEL!", '#ff0000');
            } else if (type === 'coin') {
                // Collect Coin
                this.coins += 1; // Back to 1
                this.soundManager.playCoin();
                this.particles.emitCollection(itemBody.position.x, itemBody.position.y, 'coin');
                this.showFloatingText(itemBody.position.x, itemBody.position.y, "+1", '#ffff00');
                this.ui.updateHUD(this.distance / 100, this.coins, this.fuel);
                this.saveProgress();
            } else if (type === 'crate') {
                // Break crate
                this.coins += 100; // Big bonus
                this.soundManager.playCrash(); // Re-use crash or make new crunch sound
                // Particle explosion?
                // For now just destroy
                itemBody.gameObject.destroy();
                this.showFloatingText(itemBody.position.x, itemBody.position.y, "+100", '#ffa500');
                this.ui.updateHUD(this.distance / 100, this.coins, this.fuel);
            }

        }

        // Remove Item
        if (itemBody && itemBody.gameObject && itemBody.gameObject.active) {
            itemBody.gameObject.destroy();
        }
    }

    showFloatingText(x, y, message, color) {
        const text = this.add.text(x, y - 20, message, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: color,
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: y - 80,
            alpha: 0,
            duration: 800,
            ease: 'Power1',
            onComplete: () => text.destroy()
        });
    }

    triggerFlipBonus() {
        if (this.lastFlipTime && this.time.now - this.lastFlipTime < 1000) return;
        this.lastFlipTime = this.time.now;

        this.coins += 50;
        this.fuel = Math.min(100, this.fuel + 10);
        this.ui.updateHUD(this.distance / 100, this.coins, this.fuel);

        // Show Text
        const text = this.add.text(this.car.getX(), this.car.chassis.position.y - 100, 'FLIP!', {
            fontSize: '40px', color: '#ff00ff', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: text.y - 100,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    buyUpgrade(type) {
        const upgrades = {
            'engine': { cost: 500, max: 5 },
            'tires': { cost: 500, max: 5 },
            'fuel': { cost: 500, max: 5 }
        };
        const config = upgrades[type];
        if (!config) return false;
        const currentLevel = this.savedData.upgrades[type] || 0;
        if (currentLevel >= config.max) return false;
        if (this.coins >= config.cost) {
            this.coins -= config.cost;
            this.savedData.upgrades[type] = currentLevel + 1;
            this.saveProgress();
            this.ui.updateShopUI();
            return true;
        }
        return false;
    }

    startGame() {
        // Read Selections
        const carType = document.getElementById('car-select').value;
        const terrainType = document.getElementById('terrain-select').value;

        // Validation (Security)
        if (!this.checkUnlock('vehicle', carType)) {
            alert("Vehicle Locked! Buy it first."); // Fallback
            return;
        }
        if (!this.checkUnlock('terrain', terrainType)) {
            alert("Terrain Locked! Buy it first.");
            return;
        }

        this.gameState = 'PLAY';

        // Resume Audio Context
        if (this.soundManager.ctx.state === 'suspended') {
            this.soundManager.ctx.resume().catch(console.error);
        }
        this.soundManager.startEngine();

        // Reset Data
        this.score = 0;
        this.fuel = 100;
        this.distance = 0;

        // Reset/Recreate World
        if (this.car) this.car.destroy();
        if (this.terrain) this.terrain.reset();

        // Re-init Terrain with new type
        this.terrain = new TerrainManager(this, terrainType);
        this.terrain.init();

        // Gravity Settings
        if (terrainType === 'MOON') {
            this.matter.world.setGravity(0, 0.4);
        } else if (terrainType === 'MARS') {
            this.matter.world.setGravity(0, 0.6);
        } else {
            this.matter.world.setGravity(0, 1);
        }

        // Create Car
        this.car = new Car(this, 200, 300, carType);

        // APPLY UPGRADES
        const u = this.savedData.upgrades;
        // 1. Engine
        if (u.engine > 0) {
            this.car.currentWheelSpeed += u.engine * 0.005;
        }
        // 2. Tires
        if (u.tires > 0) {
            const extraFriction = u.tires * 0.2;
            this.car.rearWheel.friction = 0.9 + extraFriction;
            this.car.frontWheel.friction = 0.9 + extraFriction;
        }
        // 3. Fuel
        if (u.fuel > 0) {
            const extraFuel = u.fuel * 20;
            this.fuel = 100 + extraFuel;
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

    quitGame() {
        this.gameState = 'MENU';
        this.soundManager.stopEngine();
        this.scene.resume();

        // Cleanup if needed
        if (this.car) this.car.destroy();
        if (this.terrain) this.terrain.reset();

        this.ui.showMainMenu();

        // Reset camera
        this.cameras.main.stopFollow();
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1.0);
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

        // Flip Detection
        if (this.car && this.car.airSpin) {
            if (this.car.onGround && Math.abs(this.car.airSpin) > Math.PI * 1.5) {
                // Landed a flip
                this.triggerFlipBonus();
                this.car.airSpin = 0; // Reset
            } else if (this.car.onGround) {
                // Landed without flip
                this.car.airSpin = 0;
            }
        }
    } // End update

    gameOver(reason) {
        this.gameState = 'GAMEOVER';
        this.soundManager.stopEngine();
        this.soundManager.playCrash();
        this.ui.showGameOver(this.distance / 100, this.coins, reason);
    }
}



