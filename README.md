# Hill Racer 2D

A browser-based 2D physics driving game inspired by Hill Climb Racing, built with Phaser 3 and Matter.js.

![Hill Racer Banner](https://via.placeholder.com/800x400?text=Hill+Racer+2D)

## Features

- **Physics-Based Driving**: Realistic suspension, gravity, and vehicle dynamics using Matter.js.
- **Infinite Procedural Terrain**: Hills and valleys are generated endlessly as you drive.
- **Fuel System**: Manage your fuel consumption and pick up gas cans to keep going.
- **Score & Coins**: Collect coins and drive as far as possible to set high scores.
- **Responsive UI**: Fully playable on Desktop (Keyboard) and Mobile (Touch Controls).
- **Modern Tech Stack**: Built with Vite + Phaser 3 + Vanilla JS.

## Controls

### Desktop
- **Right Arrow / D**: Gas (Accelerate)
- **Left Arrow / A**: Brake / Reverse
- **Esc**: Pause Game

### Mobile
- **Gas Button**: Press and hold right pedal.
- **Brake Button**: Press and hold left pedal.

## Installation

1. **Prerequisites**: Ensure you have Node.js installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Development Server**:
   ```bash
   npm run dev
   ```
4. **Play**: Open your browser at `http://localhost:5173` (or the URL shown in terminal).

## Deployment

To build for production:

```bash
npm run build
```

This will create a `dist` folder containing the compiled assets. You can host this folder on any static site hosting service like Netlify, Vercel, or GitHub Pages.

## Project Structure

- `src/main.js`: Game entry point and configuration.
- `src/Game.js`: Main game scene (logic loop).
- `src/Car.js`: Vehicle physics and control logic.
- `src/Terrain.js`: Procedural terrain generation.
- `src/UI.js`: DOM-based UI management (HUD, Menus).
- `src/style.css`: Styling for the UI overlay.

## Tech Stack

- **Vite**: Fast development server and bundler.
- **Phaser 3**: Graphic and Game framework.
- **Matter.js**: 2D Physics engine (integrated in Phaser).
