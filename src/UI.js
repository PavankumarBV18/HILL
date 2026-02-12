export default class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.distanceText = document.getElementById('distance');
        this.coinsText = document.getElementById('coins');
        this.fuelBar = document.getElementById('fuel-bar-fill');

        this.menuMain = document.getElementById('main-menu');
        this.menuPause = document.getElementById('pause-menu');
        this.menuGameOver = document.getElementById('game-over-screen');
        this.menuShop = document.getElementById('shop-menu'); // NEW
        this.hud = document.getElementById('hud');
        this.mobileControls = document.getElementById('mobile-controls');

        // Buttons
        this.btnStart = document.getElementById('start-btn');
        this.btnPause = document.getElementById('pause-btn');
        this.btnResume = document.getElementById('resume-btn');
        this.btnRestart = document.getElementById('restart-btn');
        this.btnRestartGame = document.getElementById('restart-game-btn');

        // Shop Buttons
        this.btnShop = document.getElementById('shop-open-btn');
        this.btnCloseShop = document.getElementById('shop-close-btn');

        this.bindEvents();
    }

    bindEvents() {
        this.btnStart.onclick = () => this.scene.startGame();
        this.btnPause.onclick = () => this.scene.pauseGame();
        this.btnResume.onclick = () => this.scene.resumeGame();
        this.btnRestart.onclick = () => this.scene.restartGame();
        this.btnRestartGame.onclick = () => this.scene.restartGame();

        // New Back Buttons
        const btnBackHome = document.getElementById('back-home-btn');
        if (btnBackHome) btnBackHome.onclick = () => this.scene.quitGame();

        const btnBackHomeOver = document.getElementById('back-home-over-btn');
        if (btnBackHomeOver) btnBackHomeOver.onclick = () => this.scene.quitGame();

        // Shop Upgrades
        if (this.btnShop) this.btnShop.onclick = () => this.showShop();
        if (this.btnCloseShop) this.btnCloseShop.onclick = () => this.hideShop();

        const bindUpgrade = (id, type) => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = () => this.scene.buyUpgrade(type);
        };
        bindUpgrade('buy-engine', 'engine');
        bindUpgrade('buy-tires', 'tires');
        bindUpgrade('buy-fuel', 'fuel');
    }

    showMainMenu() {
        this.menuMain.classList.remove('hidden');
        this.hud.classList.add('hidden');
        this.menuPause.classList.add('hidden');
        this.menuGameOver.classList.add('hidden');
        this.menuShop.classList.add('hidden');
        this.mobileControls.classList.add('hidden');
    }

    showGameUI() {
        this.menuMain.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.menuPause.classList.add('hidden');
        this.menuGameOver.classList.add('hidden');

        // Show mobile controls if on mobile (simple check)
        if (window.innerWidth < 768) {
            this.mobileControls.classList.remove('hidden');
        }
    }

    showPauseMenu() {
        this.menuPause.classList.remove('hidden');
    }

    hidePauseMenu() {
        this.menuPause.classList.add('hidden');
    }

    showShop() {
        this.menuMain.classList.add('hidden');
        this.menuShop.classList.remove('hidden');
        this.updateShopUI();
    }

    hideShop() {
        this.menuShop.classList.add('hidden');
        this.menuMain.classList.remove('hidden');
    }

    updateShopUI() {
        document.getElementById('shop-coins').innerText = this.scene.coins;

        const updateBtn = (id, type) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const level = this.scene.savedData.upgrades[type] || 0;
            const max = 5;
            const cost = 500;

            if (level >= max) {
                btn.innerText = 'MAX';
                btn.disabled = true;
                btn.style.background = 'grey';
            } else {
                btn.innerText = `Lvl ${level + 1} (${cost})`;
                if (this.scene.coins < cost) {
                    btn.style.opacity = '0.5';
                    // btn.disabled = true; // Optional: disable if can't afford
                } else {
                    btn.style.opacity = '1';
                }
            }
        };

        updateBtn('buy-engine', 'engine');
        updateBtn('buy-tires', 'tires');
        updateBtn('buy-fuel', 'fuel');
    }

    showGameOver(distance, coins, reason) {
        this.menuGameOver.classList.remove('hidden');
        document.getElementById('final-distance').innerText = Math.floor(distance);
        document.getElementById('final-coins').innerText = coins;
        document.getElementById('game-over-reason').innerText = reason;
        this.hud.classList.add('hidden');
        this.mobileControls.classList.add('hidden');
    }

    updateHUD(distance, coins, fuel) {
        this.distanceText.innerText = Math.floor(distance);
        this.coinsText.innerText = coins;
        this.fuelBar.style.width = `${Math.max(0, Math.min(100, fuel))}%`;

        // Colorize fuel bar
        if (fuel < 20) this.fuelBar.style.background = 'red';
        else if (fuel < 50) this.fuelBar.style.background = 'orange';
        else this.fuelBar.style.background = 'linear-gradient(90deg, red, orange, green)';
    }
}
