import Phaser from 'phaser';

export default class Car {
    constructor(scene, x, y, type = 'JEEP') {
        this.scene = scene;
        this.startX = x;
        this.startY = y;
        this.chassis = null;
        this.wheels = [];
        this.constraints = [];
        this.isGas = false;
        this.isBrake = false;
        this.touchHandlers = [];
        this.currentWheelSpeed = 0.05;

        this.init(x, y, type);
    }

    init(x, y, type) {
        const carGroup = this.scene.matter.world.nextGroup(true);
        const Bodies = Phaser.Physics.Matter.Matter.Bodies;

        let chassisBody, wheelSpeed, damping, stiffness, density, friction;
        let visual;
        let chassisWidth, chassisHeight;
        let chassisAnchorY, suspensionLength;
        let rearRadius, frontRadius;

        // Default configs
        wheelSpeed = 0.05;
        damping = 0.8;
        friction = 1.0;
        rearRadius = 16;
        frontRadius = 16;

        if (type === 'SPORT') {
            visual = this.createSportVisual(x, y);
            chassisWidth = 110; chassisHeight = 20;
            chassisAnchorY = 5; suspensionLength = 5;
            rearRadius = 14; frontRadius = 14;
            wheelSpeed = 0.10; stiffness = 0.8; density = 0.08;
            this.axleXOffset = 35;

        } else if (type === 'TRUCK') {
            visual = this.createTruckVisual(x, y);
            chassisWidth = 110; chassisHeight = 30;
            chassisAnchorY = 15; suspensionLength = 5;
            rearRadius = 22; frontRadius = 22;
            wheelSpeed = 0.04; density = 0.1; stiffness = 0.5;
            this.axleXOffset = 45;

        } else if (type === 'BIKE') {
            visual = this.createBikeVisual(x, y);
            chassisWidth = 80; chassisHeight = 20;
            chassisAnchorY = 10; suspensionLength = 5;
            rearRadius = 16; frontRadius = 16;
            wheelSpeed = 0.08; density = 0.06; stiffness = 0.5;
            this.axleXOffset = 30;

        } else if (type === 'TRACTOR') {
            visual = this.createTractorVisual(x, y);
            chassisWidth = 80; chassisHeight = 40;
            chassisAnchorY = 20; suspensionLength = 5;
            rearRadius = 28; frontRadius = 14; // Big rear, small front
            wheelSpeed = 0.04; density = 0.12; stiffness = 0.4;
            friction = 1.2; // High traction
            this.axleXOffset = 25;

        } else if (type === 'RACEBIKE') {
            visual = this.createRaceBikeVisual(x, y);
            chassisWidth = 90; chassisHeight = 20;
            chassisAnchorY = 5; suspensionLength = 5;
            rearRadius = 15; frontRadius = 15;
            wheelSpeed = 0.11; density = 0.05; stiffness = 0.8;
            this.axleXOffset = 35;

        } else if (type === 'BUS') {
            visual = this.createBusVisual(x, y);
            chassisWidth = 160; chassisHeight = 40;
            chassisAnchorY = 20; suspensionLength = 5;
            rearRadius = 20; frontRadius = 20;
            wheelSpeed = 0.04; density = 0.1; stiffness = 0.5;
            this.axleXOffset = 60;

        } else if (type === 'ATV') {
            visual = this.createATVVisual(x, y);
            chassisWidth = 70; chassisHeight = 25;
            chassisAnchorY = 5; suspensionLength = 10; // High Travel
            rearRadius = 16; frontRadius = 16;
            wheelSpeed = 0.07; density = 0.06; stiffness = 0.4;
            this.axleXOffset = 28;

        } else {
            // JEEP (Default)
            visual = this.createJeepVisual(x, y);
            chassisWidth = 100; chassisHeight = 20;
            chassisAnchorY = 10; suspensionLength = 5;
            rearRadius = 16; frontRadius = 16;
            wheelSpeed = 0.06; stiffness = 0.6; density = 0.04;
            this.axleXOffset = 38;
        }

        // 1. Create Simplified Physics Body
        chassisBody = Bodies.rectangle(x, y, chassisWidth, chassisHeight, {
            label: 'chassis', density: density, friction: friction
        });

        chassisBody.collisionFilter.group = carGroup;
        this.chassis = this.scene.matter.add.gameObject(visual, chassisBody).body;
        this.currentWheelSpeed = wheelSpeed;
        this.chassisAnchorY = chassisAnchorY;

        // 2. Wheels
        // Rear
        const rY = y + chassisAnchorY + suspensionLength;
        const rVisual = this.createWheelVisual(rearRadius, type);
        rVisual.setPosition(x - this.axleXOffset, rY);
        this.rearWheel = this.scene.matter.add.gameObject(rVisual, {
            collisionFilter: { group: carGroup, mask: 0xFFFFFFFF },
            friction: 1.0, density: density * 3, label: 'wheel',
            shape: { type: 'circle', radius: rearRadius }
        }).body;

        // Front
        const fY = y + chassisAnchorY + suspensionLength;
        const fVisual = this.createWheelVisual(frontRadius, type);
        fVisual.setPosition(x + this.axleXOffset, fY);
        this.frontWheel = this.scene.matter.add.gameObject(fVisual, {
            collisionFilter: { group: carGroup, mask: 0xFFFFFFFF },
            friction: 1.0, density: density * 3, label: 'wheel',
            shape: { type: 'circle', radius: frontRadius }
        }).body;

        // 3. Axles
        this.rearAxle = this.scene.matter.add.constraint(this.chassis, this.rearWheel, suspensionLength, stiffness, {
            pointA: { x: -this.axleXOffset, y: chassisAnchorY }, pointB: { x: 0, y: 0 }, damping: damping
        });

        this.frontAxle = this.scene.matter.add.constraint(this.chassis, this.frontWheel, suspensionLength, stiffness, {
            pointA: { x: this.axleXOffset, y: chassisAnchorY }, pointB: { x: 0, y: 0 }, damping: damping
        });

        this.shockGraphics = this.scene.add.graphics();
        this.wheels = [this.rearWheel, this.frontWheel];

        this.nitroFuel = 100; this.maxNitro = 100; this.isNitro = false;
        this.carType = type;

        this.setupControls();
    }

    createWheelVisual(radius, type) {
        const g = this.scene.add.graphics();

        if (type === 'TRUCK' || type === 'TRACTOR' || type === 'ATV') {
            // Heavy Tread, knobby
            g.fillStyle(0x111111, 1); g.fillCircle(0, 0, radius);
            g.lineStyle(3, 0x333333); g.strokeCircle(0, 0, radius);
            // Knobs
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const ox = Math.cos(a) * radius;
                const oy = Math.sin(a) * radius;
                g.fillStyle(0x000000, 1);
                g.fillCircle(ox, oy, 4);
            }
            // Rim
            g.fillStyle(0x555555, 1); g.fillCircle(0, 0, radius * 0.5);
            g.fillStyle(0x222222, 1); g.fillCircle(0, 0, radius * 0.1);

        } else if (type === 'SPORT' || type === 'RACEBIKE') {
            // Low profile, large rim
            g.fillStyle(0x1a1a1a, 1); g.fillCircle(0, 0, radius); // Tire
            g.fillStyle(0xCCCCCC, 1); g.fillCircle(0, 0, radius * 0.75); // Rim
            g.fillStyle(0x1a1a1a, 1); g.fillCircle(0, 0, radius * 0.1); // Hub
            // Spokes
            g.lineStyle(2, 0x1a1a1a);
            g.beginPath();
            g.moveTo(0, -radius * 0.75); g.lineTo(0, radius * 0.75);
            g.moveTo(-radius * 0.75, 0); g.lineTo(radius * 0.75, 0);
            g.strokePath();

        } else {
            // Standard (Jeep/Bike)
            g.fillStyle(0x1a1a1a, 1);
            g.fillCircle(0, 0, radius);
            g.lineStyle(2, 0x444444);
            g.strokeCircle(0, 0, radius);
            // Detail Tread
            g.lineStyle(1, 0x222222);
            g.beginPath();
            g.arc(0, 0, radius - 2, 0, Math.PI * 2);
            g.strokePath();

            // Rim
            g.fillStyle(0xAAAAAA, 1);
            g.fillCircle(0, 0, radius * 0.65);
            g.lineStyle(2, 0x555555);
            g.strokeCircle(0, 0, radius * 0.65);

            // Inner Dark
            g.fillStyle(0x222222, 1);
            g.fillCircle(0, 0, radius * 0.2);

            // Spokes (Cross)
            g.lineStyle(3, 0x555555);
            g.beginPath();
            g.moveTo(0, -radius * 0.65); g.lineTo(0, radius * 0.65);
            g.moveTo(-radius * 0.65, 0); g.lineTo(radius * 0.65, 0);
            g.strokePath();

            // Bolts
            g.fillStyle(0xEEEEEE);
            g.fillCircle(0, -radius * 0.4, 1.5);
            g.fillCircle(0, radius * 0.4, 1.5);
            g.fillCircle(-radius * 0.4, 0, 1.5);
            g.fillCircle(radius * 0.4, 0, 1.5);
        }
        return g;
    }

    createJeepVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });

        // Body Color: Military Green
        const bodyColor = 0x556B2F;
        const detailColor = 0x2E8B57;
        const rollbarColor = 0x111111;

        // Main Body Shape (Side Profile)
        g.fillStyle(bodyColor, 1);
        g.lineStyle(2, 0x333333);
        g.beginPath();
        // Start bottom rear
        g.moveTo(-45, 10);
        g.lineTo(-45, -15); // Rear up
        g.lineTo(-10, -15); // Bed top
        g.lineTo(-10, -35); // Rollbar rear support
        g.lineTo(10, -35);  // Rollbar top
        g.lineTo(25, -15);  // Windshield down
        g.lineTo(50, -10);  // Hood front
        g.lineTo(50, 10);   // Bumper down
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Rollbar Thick
        g.lineStyle(4, rollbarColor);
        g.beginPath();
        g.moveTo(-10, -15); g.lineTo(-10, -35); g.lineTo(10, -35); g.lineTo(25, -15);
        g.strokePath();

        // Door detail
        g.lineStyle(2, 0x334433);
        g.strokeRect(-15, -15, 30, 20);

        // Spare Tire on Back
        g.fillStyle(0x111111);
        g.fillCircle(-48, -5, 12);
        g.lineStyle(2, 0x555555);
        g.strokeCircle(-48, -5, 12);
        // Spare Inner
        g.fillStyle(0x333333);
        g.fillCircle(-48, -5, 5);

        // Headlight
        g.fillStyle(0xFFFF00, 1);
        g.fillCircle(48, -5, 4);

        // Driver
        // Head
        g.fillStyle(0xFFCCAA); // Skin
        g.fillCircle(-10, -45, 12); // Head
        // Hat
        g.fillStyle(0xCC0000); // Red Cap
        g.beginPath();
        g.arc(-10, -45, 12, Math.PI, 0); // Top half
        g.lineTo(5, -45); // Brim
        g.closePath();
        g.fillPath();
        // Body
        g.fillStyle(0x336699); // Blue Shirt
        g.fillRoundedRect(-25, -33, 30, 20, 5);
        // Arms (holding steering wheel)
        g.lineStyle(4, 0xFFCCAA);
        g.beginPath();
        g.moveTo(-10, -25);
        g.lineTo(15, -25);
        g.strokePath();

        return g;
    }

    createSportVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });
        const bodyColor = 0xF1C40F; // Vibrant Yellow
        const accentColor = 0x222222; // Carbon fiber

        // Main Body - Aerodynamic Wedge
        g.fillStyle(bodyColor, 1);
        g.lineStyle(2, 0xD4AC0D);
        g.beginPath();
        g.moveTo(-50, 10);
        g.lineTo(55, 10);   // Bottom
        g.lineTo(60, 5);    // Front lip
        g.lineTo(55, -5);   // Nose top
        g.lineTo(20, -15);  // Hood to windshield base
        g.lineTo(0, -25);   // Roof peak (low)
        g.lineTo(-30, -25); // Roof back
        g.lineTo(-50, -10); // Rear slope
        g.lineTo(-55, 0);   // Rear bumper
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Cockpit / Window (Dark tint)
        g.fillStyle(0x111111, 0.8);
        g.beginPath();
        g.moveTo(15, -15);
        g.lineTo(-25, -22); // Roof line
        g.lineTo(-40, -10); // Rear window
        g.lineTo(15, -10);  // Bottom window line
        g.closePath();
        g.fillPath();

        // Racing Stripe
        g.fillStyle(accentColor, 1);
        g.fillRect(-50, 0, 100, 4);

        // Spoiler
        g.fillStyle(accentColor, 1);
        g.beginPath();
        g.moveTo(-50, -10);
        g.lineTo(-60, -20); // Wing tip back
        g.lineTo(-45, -20); // Wing tip front
        g.lineTo(-40, -10); // Base
        g.closePath();
        g.fillPath();

        return g;
    }

    createTruckVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });
        const bodyColor = 0x4A235A; // Deep Purple
        const frameColor = 0x222222;

        // Visual Chassis Frame (Lifted)
        g.fillStyle(frameColor, 1);
        g.fillRect(-60, 0, 110, 15); // Heavy frame rail

        // Cab
        g.fillStyle(bodyColor, 1);
        g.lineStyle(2, 0x222222);
        g.beginPath();
        g.moveTo(-10, 0);
        g.lineTo(-10, -40); // Back of cab
        g.lineTo(20, -40);  // Roof
        g.lineTo(40, -20);  // Windshield
        g.lineTo(45, -10);  // Hood
        g.lineTo(45, 0);    // Grill top
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Bed
        g.fillStyle(bodyColor, 1);
        g.fillRect(-60, -20, 50, 20); // Bed side

        // Window
        g.fillStyle(0x87CEEB, 0.6);
        g.fillRect(5, -35, 25, 15);

        // Exhaust Stack
        g.fillStyle(0x95A5A6);
        g.fillRect(-5, -55, 6, 30); // Vertical pipe
        g.fillStyle(0x333333);
        g.fillCircle(-2, -55, 3); // Hole top

        return g;
    }

    createBikeVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });
        const paintColor = 0x77B5FE; // Light Blue / Pastel Blue
        const seatColor = 0xC68E17; // Light Brown Leather
        const rubberColor = 0x222222; // Black rubber pads/tires
        const chromeColor = 0xDDDDDD; // Silver/Chrome components
        const frameColor = 0x1A1A1A; // Dark Frame

        // 1. Frame (Loop Tail)
        g.lineStyle(4, frameColor);
        g.beginPath();
        g.moveTo(-25, 5);  // Rear axle
        g.lineTo(0, -15);  // Seat loop
        g.lineTo(25, -15); // Tank base
        g.lineTo(30, 0);   // Downtube
        g.lineTo(0, 10);   // Cradle
        g.closePath();
        g.strokePath();

        // 2. Fenders (Mudguards)
        g.lineStyle(3, paintColor);
        // Rear Fender
        g.beginPath();
        g.arc(-25, 10, 16, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(320));
        g.strokePath();
        // Front Fender
        g.beginPath();
        g.arc(30, 20, 16, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(300));
        g.strokePath();

        // 3. Suspension
        // Rear Shocks
        g.lineStyle(2, chromeColor);
        g.beginPath();
        g.moveTo(-25, 10);
        g.lineTo(-5, -15);
        g.strokePath();
        // Front Forks (Black Gaiters)
        g.lineStyle(4, 0x111111);
        g.beginPath();
        g.moveTo(25, -20); // Triple tree
        g.lineTo(30, 20);  // Axle
        g.strokePath();

        // 4. Engine (Standard Classic Twin/Single look)
        g.fillStyle(chromeColor);
        g.fillRoundedRect(0, -5, 18, 18, 3); // Main Block
        g.fillStyle(0x555555);
        g.fillCircle(10, 5, 5); // Clutch cover

        // 5. Exhaust (Straight Pipe)
        g.lineStyle(4, chromeColor);
        g.beginPath();
        g.moveTo(10, 5);
        g.lineTo(15, 15); // Header down
        g.lineTo(-35, 15); // Pipe back
        g.strokePath();

        // 6. Side Panel
        g.fillStyle(paintColor);
        g.fillRoundedRect(-5, -12, 12, 10, 2);
        g.lineStyle(1, 0xFFFFFF); // Detail line
        g.strokeRoundedRect(-5, -12, 12, 10, 2);

        // 7. Fuel Tank (Iconic Teardrop)
        g.fillStyle(paintColor);
        g.beginPath();
        g.moveTo(5, -15);   // Bottom front
        g.lineTo(15, -32);  // High front arch
        g.lineTo(35, -22);  // Slope back
        g.lineTo(30, -15);  // Seat junction
        g.closePath();
        g.fillPath();

        // Tank Detail: Gold Pinstripe
        g.lineStyle(1, 0xD4AF37); // Gold
        g.beginPath();
        g.moveTo(10, -20);
        g.lineTo(16, -28);
        g.lineTo(32, -22);
        g.lineTo(28, -18);
        g.strokePath();

        // Gas Cap
        g.fillStyle(chromeColor);
        g.fillCircle(20, -28, 2);

        // Knee Pad (Rubber)
        g.fillStyle(rubberColor);
        g.fillEllipse(20, -20, 8, 4);

        // Badge
        g.fillStyle(0xD4AF37); // Gold Badge
        g.fillCircle(18, -24, 2);

        // 8. Seat (Flat Brat Style)
        g.fillStyle(seatColor);
        g.fillRoundedRect(-20, -18, 35, 6, 2); // Long flat seat
        // Seat stitching illusion
        g.lineStyle(1, 0x8D6E63);
        g.beginPath();
        g.moveTo(-15, -18); g.lineTo(-15, -12);
        g.moveTo(-5, -18); g.lineTo(-5, -12);
        g.moveTo(5, -18); g.lineTo(5, -12);
        g.strokePath();

        // 9. Headlight & Instruments
        g.fillStyle(chromeColor);
        g.fillCircle(32, -22, 5); // Headlight bucket
        g.fillStyle(0xFFFFCC); // Yellowish tint
        g.fillCircle(34, -22, 3); // Lens
        // Meter
        g.fillStyle(0x111111);
        g.fillRect(28, -32, 6, 8); // Speedo

        // 10. Handlebars & Mirrors
        g.lineStyle(2, chromeColor);
        g.beginPath();
        g.moveTo(28, -20);
        g.lineTo(24, -35); // Bars
        g.lineTo(18, -38); // Grip
        g.strokePath();
        // Round Mirror
        g.lineStyle(1, chromeColor);
        g.strokeCircle(24, -42, 3);
        g.lineStyle(1, chromeColor);
        g.beginPath();
        g.moveTo(24, -39); g.lineTo(24, -35); // Stem
        g.strokePath();

        // 11. Rider (Casual)
        // Leg
        g.lineStyle(4, 0x3E2723); // Dark pants
        g.beginPath();
        g.moveTo(-5, -18); // Hip (further back on flat seat)
        g.lineTo(5, -5);   // Knee
        g.lineTo(5, 10);   // Foot
        g.strokePath();
        // Torso
        g.fillStyle(0x333333); // Dark jacket
        g.fillRoundedRect(-10, -45, 14, 28, 3);
        // Arm
        g.lineStyle(3, 0x333333);
        g.beginPath();
        g.moveTo(-3, -40); // Shoulder
        g.lineTo(8, -35);  // Elbow
        g.lineTo(18, -38); // Hand
        g.strokePath();
        // Helmet (Open Face with Goggles)
        g.fillStyle(0xEEEEEE); // White helmet
        g.fillCircle(-3, -50, 8);
        g.fillStyle(0x111111); // Goggles
        g.fillRect(0, -53, 6, 5);

        return g;
    }

    createTractorVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });
        const green = 0x27AE60;

        // Engine Block
        g.fillStyle(green);
        g.fillRoundedRect(-50, -10, 50, 30, 2);

        // Cab
        g.fillStyle(green);
        g.fillRect(-10, -50, 40, 70);

        // Roof
        g.fillStyle(0xFFFFFF);
        g.fillRect(-15, -55, 50, 5);

        // Window
        g.fillStyle(0x87CEEB, 0.7);
        g.fillRect(-5, -45, 30, 25);

        // Chimney (Exhaust)
        g.fillStyle(0x2C3E50);
        g.fillRect(-40, -40, 5, 30);
        g.fillCircle(-37.5, -40, 4); // Flap

        // Grill
        g.fillStyle(0xECF0F1);
        g.fillRect(-52, -5, 4, 20);

        return g;
    }

    createRaceBikeVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });
        const color = 0xE74C3C; // Red
        const dark = 0x2C3E50;

        // Fairing
        g.fillStyle(color);
        g.beginPath();
        g.moveTo(30, -5);
        g.lineTo(15, -25);
        g.lineTo(-10, -20); // Tank
        g.lineTo(-20, -10); // Seat
        g.lineTo(-35, -25); // Tail
        g.lineTo(-25, 5);
        g.lineTo(25, 10);
        g.closePath();
        g.fillPath();

        // Windshield
        g.fillStyle(0x3498DB, 0.6);
        g.beginPath();
        g.moveTo(15, -25);
        g.lineTo(5, -30);
        g.lineTo(10, -20);
        g.closePath();
        g.fillPath();

        // Rider (Leaning forward)
        g.fillStyle(dark);
        g.fillCircle(0, -35, 8); // Head
        g.fillStyle(dark);
        g.fillRoundedRect(-15, -30, 20, 10, 5); // Body

        return g;
    }



    createBusVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });
        const yellow = 0xF1C40F;

        // Main Body
        g.fillStyle(yellow);
        g.fillRoundedRect(-75, -40, 150, 45, 5); // Huge body

        // Windows
        g.fillStyle(0x34495E);
        for (let i = 0; i < 5; i++) {
            g.fillRect(-70 + (i * 28), -35, 24, 15);
        }

        // Stripe
        g.fillStyle(0x000000);
        g.fillRect(-75, -15, 150, 4);

        // Roof Details
        g.fillStyle(0xBDC3C7);
        g.fillRect(-50, -44, 30, 4);
        g.fillRect(20, -44, 30, 4);

        return g;
    }

    createATVVisual(x, y) {
        const g = this.scene.add.graphics({ x, y });
        const color = 0x8E44AD; // Purple

        // Body
        g.fillStyle(color);
        g.beginPath();
        g.moveTo(-20, 5);
        g.lineTo(-25, -15); // Seat back
        g.lineTo(0, -15);   // Seat
        g.lineTo(10, -20);  // Tank
        g.lineTo(25, -10);  // Front
        g.lineTo(20, 5);
        g.closePath();
        g.fillPath();

        // Handlebars
        g.lineStyle(3, 0xBDC3C7);
        g.beginPath();
        g.moveTo(10, -20);
        g.lineTo(8, -28);
        g.lineTo(18, -30);
        g.strokePath();

        // Rider
        g.fillStyle(0xD35400); // Orange Suit
        g.fillCircle(-5, -35, 9); // Head
        g.fillRect(-15, -30, 20, 15); // Body

        return g;
    }

    setupControls() {
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        const btnGas = document.getElementById('gas-btn');
        const btnBrake = document.getElementById('brake-btn');
        const btnNitro = document.getElementById('nitro-btn');

        const addTouch = (elem, type, handler) => {
            if (!elem) return;
            const h = (e) => {
                if (e.cancelable && e.type !== 'mousedown') e.preventDefault();
                handler(e);
            };
            elem.addEventListener(type, h, { passive: false });
            this.touchHandlers.push({ elem, type, handler: h });
        };

        if (btnGas) {
            ['mousedown', 'touchstart'].forEach(evt => addTouch(btnGas, evt, () => this.isGas = true));
            ['mouseup', 'touchend', 'mouseleave'].forEach(evt => addTouch(btnGas, evt, () => this.isGas = false));
        }
        if (btnBrake) {
            ['mousedown', 'touchstart'].forEach(evt => addTouch(btnBrake, evt, () => this.isBrake = true));
            ['mouseup', 'touchend', 'mouseleave'].forEach(evt => addTouch(btnBrake, evt, () => this.isBrake = false));
        }
        if (btnNitro) {
            ['mousedown', 'touchstart'].forEach(evt => addTouch(btnNitro, evt, () => this.isNitro = true));
            ['mouseup', 'touchend', 'mouseleave'].forEach(evt => addTouch(btnNitro, evt, () => this.isNitro = false));
        }

        this.keys = this.scene.input.keyboard.addKeys({
            up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
            w: 'W', a: 'A', s: 'S', d: 'D',
            shift: 'SHIFT'
        });
    }

    getExhaustPoint() {
        // Local coordinates relative to chassis center
        switch (this.carType) {
            case 'SPORT': return { x: -55, y: 0 };
            case 'TRUCK': return { x: -5, y: -55 }; // Stack
            case 'BIKE': return { x: -25, y: 5 };
            case 'TRACTOR': return { x: -37, y: -45 }; // Chimney
            case 'RACEBIKE': return { x: -35, y: -5 };

            case 'BUS': return { x: -75, y: 0 };
            case 'ATV': return { x: -25, y: 0 };
            case 'JEEP': default: return { x: -45, y: 10 };
        }
    }

    update() {
        if (!this.chassis || !this.rearWheel || !this.frontWheel) return;

        // Inputs
        const gas = this.isGas || this.cursors.right.isDown || this.keys.d.isDown;
        const brake = this.isBrake || this.cursors.left.isDown || this.keys.a.isDown;
        const nitro = (this.isNitro || this.keys.shift.isDown) && this.nitroFuel > 0;

        let currentSpeed = this.currentWheelSpeed;

        // NITRO LOGIC
        if (nitro) {
            currentSpeed *= 2.5; // Boost speed limit
            this.nitroFuel = Math.max(0, this.nitroFuel - 0.25); // Moderate Drain

            // Boost Force on chassis
            const force = 0.002 * this.chassis.mass;
            const angle = this.chassis.angle;
            this.scene.matter.body.applyForce(this.chassis, this.chassis.position, {
                x: Math.cos(angle) * force,
                y: Math.sin(angle) * force
            });
        }
        // No auto-regen allowed! (Replenished by distance)

        const maxSpeed = 0.6; // Angular velocity limit

        if (gas || nitro) {
            if (this.rearWheel.angularVelocity < maxSpeed + (nitro ? 0.4 : 0)) {
                this.scene.matter.body.setAngularVelocity(this.rearWheel, this.rearWheel.angularVelocity + currentSpeed);
                this.scene.matter.body.setAngularVelocity(this.frontWheel, this.frontWheel.angularVelocity + currentSpeed);
            }
        } else if (brake) {
            if (this.rearWheel.angularVelocity > -maxSpeed) {
                this.scene.matter.body.setAngularVelocity(this.rearWheel, this.rearWheel.angularVelocity - currentSpeed);
                this.scene.matter.body.setAngularVelocity(this.frontWheel, this.frontWheel.angularVelocity - currentSpeed);
            }
        }

        // AIR CONTROL & FLIPS
        // Check if grounded using raycast from wheels
        let grounded = false;
        const rayLength = 10; // How far down to check for ground
        const wheelRadius = 15; // Approximate wheel radius

        const Matter = Phaser.Physics.Matter.Matter;
        const allBodies = this.scene.matter.world.getAllBodies();

        // Raycast from rear wheel
        const rearStart = this.rearWheel.position;
        const rearEnd = { x: rearStart.x, y: rearStart.y + wheelRadius + rayLength };
        const rearHits = Matter.Query.ray(allBodies, rearStart, rearEnd);
        const rearGrounded = rearHits.some(hit =>
            hit.body !== this.rearWheel && hit.body !== this.chassis && hit.body.label === 'ground_slice'
        );

        // Raycast from front wheel
        const frontStart = this.frontWheel.position;
        const frontEnd = { x: frontStart.x, y: frontStart.y + wheelRadius + rayLength };
        const frontHits = Matter.Query.ray(allBodies, frontStart, frontEnd);
        const frontGrounded = frontHits.some(hit =>
            hit.body !== this.frontWheel && hit.body !== this.chassis && hit.body.label === 'ground_slice'
        );

        if (rearGrounded || frontGrounded) {
            grounded = true;
        }
        this.onGround = grounded;

        const airTorque = 0.005; // Gentle rotation

        // We need to know if we are in air to award flips.
        // Let's use a "flip tracker" based on rotation accumulation.

        if (!this.lastAngle) this.lastAngle = this.chassis.angle;
        if (this.airSpin === undefined) this.airSpin = 0;

        const da = this.chassis.angle - this.lastAngle;
        // Handle wrap around PI/-PI? Matter angles are continuous usually or clamped?
        // Matter body angle is continuous radians.

        if (!this.onGround && Math.abs(da) > 0.01) { // Only accumulate spin if in air and actually rotating
            this.airSpin += da;
        } else if (this.onGround) {
            this.airSpin = 0; // Reset spin on ground
        }

        this.lastAngle = this.chassis.angle;

        // Manual Air Rotate (only if not grounded)
        if (!this.onGround) {
            if (this.cursors.left.isDown || this.keys.a.isDown) {
                this.scene.matter.body.setAngularVelocity(this.chassis, this.chassis.angularVelocity - airTorque);
            }
            if (this.cursors.right.isDown || this.keys.d.isDown) {
                this.scene.matter.body.setAngularVelocity(this.chassis, this.chassis.angularVelocity + airTorque);
            }
        }

        // FLIP REWARD LOGIC IS HANDLED IN GAME.JS COLLISION OR UPDATE?
        // Let's just expose total rotation.

        // PARTICLES
        if (this.scene.particles) {
            const p = this.scene.particles;

            // 1. Exhaust
            const exLocal = this.getExhaustPoint();
            const angle = this.chassis.angle;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const exWorldX = this.chassis.position.x + (exLocal.x * cos - exLocal.y * sin);
            const exWorldY = this.chassis.position.y + (exLocal.x * sin + exLocal.y * cos);

            if (nitro) {
                // Flame (rapid emission)
                p.emitExhaust(exWorldX, exWorldY);
                p.emitExhaust(exWorldX, exWorldY);
            } else if (gas) {
                // Smoke
                if (Math.random() < 0.3) p.emitExhaust(exWorldX, exWorldY);
            }

            // 2. Dust (Simple ground check: if wheel angular velocity is high)
            if (Math.abs(this.rearWheel.angularVelocity) > 0.1) {
                // Emit at bottom of wheel
                if (Math.random() < 0.2) p.emitDust(this.rearWheel.position.x, this.rearWheel.position.y + 15);
            }
        }
    }

    destroy() {
        this.touchHandlers.forEach(h => { if (h.elem) h.elem.removeEventListener(h.type, h.handler); });
        if (this.shockGraphics) this.shockGraphics.destroy();
        if (this.chassis && this.chassis.gameObject) this.chassis.gameObject.destroy();
        if (this.rearWheel && this.rearWheel.gameObject) this.rearWheel.gameObject.destroy();
        if (this.frontWheel && this.frontWheel.gameObject) this.frontWheel.gameObject.destroy();
        this.scene.matter.world.remove(this.rearAxle);
        this.scene.matter.world.remove(this.frontAxle);
    }

    getX() { return this.chassis ? this.chassis.position.x : 0; }
    getY() { return this.chassis ? this.chassis.position.y : 0; }
    getSpeed() { return this.chassis ? Math.abs(this.chassis.velocity.x) : 0; }
}
